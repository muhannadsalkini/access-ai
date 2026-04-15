export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyPublic {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface CreateApiKeyRequest {
  name?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // The full API key — shown only once
  key_prefix: string;
  created_at: string;
}
