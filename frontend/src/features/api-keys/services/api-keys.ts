import { api } from "@/shared/lib/api";
import { getAccessToken } from "@/features/auth/services/auth";
import type { ApiResponse } from "@/shared/types";

export interface ApiKeyPublic {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  key_prefix: string;
  created_at: string;
}

export async function getApiKeys(): Promise<ApiKeyPublic[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await api<ApiResponse<ApiKeyPublic[]>>("/api/api-keys", {
    token,
  });

  return response.data;
}

export async function createApiKey(
  name: string = "Default"
): Promise<CreateApiKeyResponse> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await api<ApiResponse<CreateApiKeyResponse>>(
    "/api/api-keys",
    {
      method: "POST",
      body: { name },
      token,
    }
  );

  return response.data;
}

export async function deleteApiKey(keyId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  await api(`/api/api-keys/${keyId}`, {
    method: "DELETE",
    token,
  });
}
