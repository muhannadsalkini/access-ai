import { getAccessToken } from "./supabase";
import type { ApiResponse, ScanResult } from "@/types";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

interface FetchOptions {
  method?: string;
  body?: unknown;
}

async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const { method = "GET", body } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

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
}

// ── Public API helpers ──────────────────────────────────────────────────────

export async function createScan(url: string): Promise<ScanResult> {
  const response = await apiFetch<ApiResponse<ScanResult>>("/api/scans", {
    method: "POST",
    body: { url },
  });
  return response.data;
}

export async function fetchScan(scanId: string): Promise<ScanResult> {
  const response = await apiFetch<ApiResponse<ScanResult>>(
    `/api/scans/${scanId}`
  );
  return response.data;
}
