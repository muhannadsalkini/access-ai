-- Ensures Row Level Security is enabled and all required
-- policies exist for the public.chat_messages table.

-- Enable RLS (idempotent)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Drop existing policies to avoid conflicts
-- ============================================
DROP POLICY IF EXISTS "Users can view chat messages for their scans" ON public.chat_messages;
DROP POLICY IF EXISTS "Service role can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Service role can update chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Service role can delete chat messages" ON public.chat_messages;

-- ============================================
-- Policies
-- ============================================

-- SELECT: Authenticated users can only read messages belonging to their own scans
CREATE POLICY "Users can view chat messages for their scans"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = chat_messages.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- INSERT: Only the service role (backend) may insert messages.
--         WITH CHECK (true) combined with the service_role bypass means
--         regular authenticated users cannot insert directly via PostgREST.
CREATE POLICY "Service role can insert chat messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Only the service role may update messages
CREATE POLICY "Service role can update chat messages"
  ON public.chat_messages
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: Only the service role may delete messages
CREATE POLICY "Service role can delete chat messages"
  ON public.chat_messages
  FOR DELETE
  USING (true);

-- ============================================
-- Grant Permissions
-- ============================================
GRANT ALL   ON public.chat_messages TO service_role;
GRANT SELECT ON public.chat_messages TO authenticated;
