import { api } from "@/shared/lib/api";
import { createClient } from "@/shared/lib/supabase/client";
import type { ChatMessage } from "@/shared/types";

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

async function getToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || "";
}

export async function getChatMessages(
  scanId: string
): Promise<ChatMessage[]> {
  const token = await getToken();
  const response = await api<ApiSuccess<ChatMessage[]>>(
    `/api/scans/${scanId}/chat`,
    { token }
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function clearChatMessages(
  scanId: string
): Promise<void> {
  const token = await getToken();
  await api(`/api/scans/${scanId}/chat`, {
    method: "DELETE",
    token,
  });
}

interface SendMessageData {
  message: ChatMessage;
  response: ChatMessage;
}

export async function sendChatMessage(
  scanId: string,
  message: string
): Promise<SendMessageData> {
  const token = await getToken();
  const response = await api<ApiSuccess<SendMessageData>>(`/api/scans/${scanId}/chat`, {
    method: "POST",
    body: { message },
    token,
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Retry helper for streaming requests — handles backend cold-start
// ---------------------------------------------------------------------------

const STREAM_RETRY_DELAYS_MS = [15_000, 15_000, 15_000, 15_000];

function isTransientStreamStatus(status: number): boolean {
  return [502, 503, 504].includes(status);
}

async function fetchStreamWithRetry(
  url: string,
  init: RequestInit,
  onRetry?: (attempt: number, maxRetries: number) => void
): Promise<Response> {
  const maxAttempts = STREAM_RETRY_DELAYS_MS.length + 1;
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init);

      if (isTransientStreamStatus(response.status) && attempt < maxAttempts) {
        const delayMs = STREAM_RETRY_DELAYS_MS[attempt - 1] ?? 15_000;
        onRetry?.(attempt, STREAM_RETRY_DELAYS_MS.length);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;
      const isNetworkError =
        err instanceof TypeError && err.message.toLowerCase().includes("fetch");

      if (isNetworkError && attempt < maxAttempts) {
        const delayMs = STREAM_RETRY_DELAYS_MS[attempt - 1] ?? 15_000;
        onRetry?.(attempt, STREAM_RETRY_DELAYS_MS.length);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw err;
    }
  }

  throw lastError ?? new Error("Stream request failed after all retries");
}

/**
 * Stream a chat message response via SSE.
 * Calls onUserMessage when the saved user message arrives,
 * onChunk for each text chunk, and onDone when complete.
 * Calls onRetry when retrying due to server cold-start (502/503/504).
 */
export async function streamChatMessage(
  scanId: string,
  message: string,
  callbacks: {
    onUserMessage: (msg: ChatMessage) => void;
    onChunk: (text: string) => void;
    onDone: (savedMsg: ChatMessage | null) => void;
    onError: (error: string) => void;
    onRetry?: (attempt: number, maxRetries: number) => void;
  }
): Promise<void> {
  const token = await getToken();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const response = await fetchStreamWithRetry(
    `${baseUrl}/api/scans/${scanId}/chat/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    },
    callbacks.onRetry
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));

            if (parsed.userMessage) {
              callbacks.onUserMessage(parsed.userMessage as ChatMessage);
            } else if (parsed.text) {
              callbacks.onChunk(parsed.text);
            } else if (parsed.done) {
              // Agent done, full_text available but we built it from chunks
            } else if (parsed.saved) {
              callbacks.onDone(parsed.saved as ChatMessage);
            } else if (parsed.error) {
              callbacks.onError(parsed.error);
            }
          } catch {
            // Ignore parse errors on partial data
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
