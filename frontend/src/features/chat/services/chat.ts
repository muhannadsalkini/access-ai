import { api } from "@/shared/lib/api";
import { createClient } from "@/shared/lib/supabase/client";
import type { ChatMessage } from "@/shared/types";

interface GetMessagesResponse {
  messages: ChatMessage[];
}

interface SendMessageResponse {
  message: ChatMessage;
  response: ChatMessage;
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
  const data = await api<GetMessagesResponse>(
    `/api/scans/${scanId}/chat`,
    { token }
  );
  return data.messages;
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

export async function sendChatMessage(
  scanId: string,
  message: string
): Promise<SendMessageResponse> {
  const token = await getToken();
  return api<SendMessageResponse>(`/api/scans/${scanId}/chat`, {
    method: "POST",
    body: { message },
    token,
  });
}

/**
 * Stream a chat message response via SSE.
 * Calls onUserMessage when the saved user message arrives,
 * onChunk for each text chunk, and onDone when complete.
 */
export async function streamChatMessage(
  scanId: string,
  message: string,
  callbacks: {
    onUserMessage: (msg: ChatMessage) => void;
    onChunk: (text: string) => void;
    onDone: (savedMsg: ChatMessage | null) => void;
    onError: (error: string) => void;
  }
): Promise<void> {
  const token = await getToken();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const response = await fetch(`${baseUrl}/api/scans/${scanId}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

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
