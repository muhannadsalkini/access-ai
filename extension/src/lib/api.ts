import { getAccessToken } from "./supabase";
import type { ApiResponse, ScanResult } from "@/types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

// Retry config — handles backend cold-start
const RETRY_DELAYS_MS = [15_000, 15_000, 15_000, 15_000];

function isTransientStatus(status: number): boolean {
  return [502, 503, 504].includes(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  onRetry?: (attempt: number) => void;
}

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const { method = "GET", body, onRetry } = options;
  const maxAttempts = RETRY_DELAYS_MS.length + 1;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (
        !response.ok &&
        isTransientStatus(response.status) &&
        attempt < maxAttempts
      ) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? 15_000;
        onRetry?.(attempt);
        await sleep(delayMs);
        continue;
      }

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "An unexpected error occurred" }));
        throw new Error(
          (error as { error?: string }).error ??
            `Request failed with status ${response.status}`
        );
      }

      return response.json() as Promise<T>;
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError &&
        err.message.toLowerCase().includes("fetch");

      if (isNetworkError && attempt < maxAttempts) {
        const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? 15_000;
        onRetry?.(attempt);
        await sleep(delayMs);
        continue;
      }

      throw err;
    }
  }

  throw new Error("Request failed after all retries");
}

// ── Public API helpers ──────────────────────────────────────────────────────

export async function createScan(
  url: string,
  onRetry?: (attempt: number) => void
): Promise<ScanResult> {
  const response = await apiFetch<ApiResponse<ScanResult>>("/api/scans", {
    method: "POST",
    body: { url },
    onRetry,
  });
  return response.data;
}

export async function fetchScan(scanId: string): Promise<ScanResult> {
  const response = await apiFetch<ApiResponse<ScanResult>>(
    `/api/scans/${scanId}`
  );
  return response.data;
}
