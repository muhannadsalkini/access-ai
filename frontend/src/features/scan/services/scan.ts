import { api } from "@/shared/lib/api";
import { getAccessToken } from "@/features/auth/services/auth";
import type { ApiResponse, ScanResult } from "@/shared/types";

export async function createScan(
  url: string,
  onRetry?: (attempt: number, maxRetries: number) => void
): Promise<ScanResult> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await api<ApiResponse<ScanResult>>("/api/scans", {
    method: "POST",
    body: { url },
    token,
    onRetry,
  });

  return response.data;
}
