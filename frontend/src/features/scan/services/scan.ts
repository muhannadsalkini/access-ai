import { getAccessToken } from "@/features/auth/services/auth";
import type { Issue, Scan } from "@/shared/types";

// ---------------------------------------------------------------------------
// Streaming scan — SSE-based progressive results
// ---------------------------------------------------------------------------

export type ScanStreamEvent =
  | { type: "status"; status: Scan["status"] }
  | { type: "scan"; scan: Scan }
  | {
      type: "progress";
      message: string;
      pagesScanned?: number;
      pagesTotal?: number;
    }
  | { type: "violations_found"; count: number; score: number }
  | { type: "summary"; summary: string; priority_recommendations: string }
  | { type: "issue"; issue: Issue }
  | { type: "done"; scan: Scan }
  | { type: "error"; message: string };

interface ScanStreamCallbacks {
  onEvent: (evt: ScanStreamEvent) => void;
}

/**
 * POST /api/scans/stream and dispatch each SSE event to `onEvent`.
 * No retry logic — assumes a stable, always-on server.
 */
export async function streamScan(
  url: string,
  callbacks: ScanStreamCallbacks
): Promise<void> {
  const token = await getAccessToken();
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}/api/scans/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Scan stream failed (${response.status})`);
  }

  if (!response.body) {
    throw new Error("No response body for scan stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on SSE event boundaries (blank line).
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        // Parse the multi-line SSE event.
        let dataLine = "";
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith(":")) continue; // comment / heartbeat
          if (line.startsWith("data: ")) {
            dataLine += line.slice(6);
          }
        }
        if (!dataLine) continue;

        try {
          const parsed = JSON.parse(dataLine) as ScanStreamEvent;
          callbacks.onEvent(parsed);
        } catch {
          // ignore malformed frame
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
