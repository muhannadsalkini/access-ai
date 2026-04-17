import { api } from "@/shared/lib/api";
import { getAccessToken } from "@/features/auth/services/auth";
import type { ApiResponse, Scan, ScanResult } from "@/shared/types";

export async function getScanHistory(): Promise<Scan[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await api<ApiResponse<Scan[]>>("/api/scans", {
    token,
  });

  return response.data;
}

export async function getScanDetail(scanId: string): Promise<ScanResult> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await api<ApiResponse<ScanResult>>(`/api/scans/${scanId}`, {
    token,
  });

  const data = response.data;

  // Defensive: ensure issues is always an array and report is always defined or null.
  // Prevents crashes if the backend returns a partial/unexpected response shape.
  return {
    ...data,
    issues: Array.isArray(data.issues) ? data.issues : [],
    report: data.report ?? null,
    scan: data.scan,
  };
}
