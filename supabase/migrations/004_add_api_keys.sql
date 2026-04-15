-- ============================================
-- API Keys Table
-- ============================================
-- Allows users to generate API keys for MCP server and SDK integrations.
-- Keys are stored as SHA-256 hashes for security — the raw key is only shown once.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,           -- First 8 chars of the key (e.g. "ak_live_a") for identification
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by key hash (used on every API request)
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);

-- Index for fast user queries
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own API keys
CREATE POLICY "Users can view their own API keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything (used by backend for key verification)
CREATE POLICY "Service role full access on api_keys"
  ON public.api_keys FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON public.api_keys TO service_role;
GRANT SELECT, INSERT, DELETE ON public.api_keys TO authenticated;
