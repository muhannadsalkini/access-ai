const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// ---------------------------------------------------------------------------
// Retry config — handles backend cold-start on Render free tier
// 4 retries with delays: 15s, 15s, 15s, 15s → max ~60s total wait time
// ---------------------------------------------------------------------------

const DEFAULT_RETRY_DELAYS_MS = [15_000, 15_000, 15_000, 15_000];

function isTransientStatus(status: number): boolean {
  return [502, 503, 504].includes(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
  /**
   * Number of additional retry attempts on 502/503/504 or network errors.
   * Defaults to 4 (up to ~60s total with DEFAULT_RETRY_DELAYS_MS).
   */
  retries?: number;
  /**
   * Delay in ms between each retry attempt.
   * Defaults to [15000, 15000, 15000, 15000].
   */
  retryDelays?: number[];
  /**
   * Called before each retry so the UI can show a "waking up" indicator.
   * @param attempt - current retry number (1-based)
   * @param maxRetries - total retries configured
   */
  onRetry?: (attempt: number, maxRetries: number) => void;
}

export async function api<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    token,
    retries = 4,
    retryDelays = DEFAULT_RETRY_DELAYS_MS,
    onRetry,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const maxAttempts = retries + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Transient server error — retry if attempts remain
      if (!response.ok && isTransientStatus(response.status) && attempt < maxAttempts) {
        const delayMs = retryDelays[attempt - 1] ?? 15_000;
        onRetry?.(attempt, retries);
        await sleep(delayMs);
        continue;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: "An unexpected error occurred",
        }));
        throw new Error(
          error.error || `Request failed with status ${response.status}`
        );
      }

      return response.json();
    } catch (err: any) {
      // Network-level failure (server not up yet) — retry if attempts remain
      const isNetworkError =
        err instanceof TypeError && err.message.toLowerCase().includes("fetch");

      if (isNetworkError && attempt < maxAttempts) {
        const delayMs = retryDelays[attempt - 1] ?? 15_000;
        onRetry?.(attempt, retries);
        await sleep(delayMs);
        continue;
      }

      throw err;
    }
  }

  // Should never reach here, but TypeScript needs a return
  throw new Error("Request failed after all retries");
}
