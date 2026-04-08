-- ============================================
-- Chat Messages Table
-- ============================================
-- Stores conversation history between users and the AI agent per scan

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast scan lookups
CREATE INDEX idx_chat_messages_scan_id ON public.chat_messages(scan_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(scan_id, created_at ASC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view chat messages for their own scans
CREATE POLICY "Users can view chat messages for their scans"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = chat_messages.scan_id
      AND scans.user_id = auth.uid()
    )
  );

-- Service role can insert chat messages
CREATE POLICY "Service role can insert chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.chat_messages TO service_role;
GRANT SELECT ON public.chat_messages TO authenticated;
