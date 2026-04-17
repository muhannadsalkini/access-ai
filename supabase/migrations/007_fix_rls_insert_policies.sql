-- The original INSERT policies on issues, reports, and chat_messages used
-- WITH CHECK (true) without a role restriction, meaning ANY authenticated user
-- could directly call the Supabase REST API and insert rows for scans they do
-- not own.  Although GRANT permissions previously limited this to service_role
-- in practice, the RLS policies themselves provided no ownership guarantee.
--
-- This migration tightens each INSERT policy to:
--   1. Restrict the policy role to service_role only (backend writes).
--   2. Add an ownership-scoped fallback policy for any future authenticated
--      use-cases (e.g. future client-side inserts must match the scan owner).

-- ---------------------------------------------------------------------------
-- ISSUES TABLE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role can insert issues" ON public.issues;

-- Backend (service_role bypasses RLS, but explicit policy documents intent)
CREATE POLICY "Service role can insert issues"
  ON public.issues FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Prevent authenticated clients from inserting issues for scans they don't own
-- (defensive: authenticated role has no INSERT GRANT on issues, but this
--  ensures RLS blocks it even if a future GRANT is added by mistake)
CREATE POLICY "Users can insert issues for their own scans"
  ON public.issues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = issues.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- REPORTS TABLE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role can insert reports" ON public.reports;

CREATE POLICY "Service role can insert reports"
  ON public.reports FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can insert reports for their own scans"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = reports.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- CHAT MESSAGES TABLE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Service role can insert chat messages" ON public.chat_messages;

CREATE POLICY "Service role can insert chat messages"
  ON public.chat_messages FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Users can insert chat messages for their own scans"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = chat_messages.scan_id
        AND scans.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Also add DELETE policies so that authenticated users can only delete
-- chat messages for their own scans (for the clearMessages endpoint future use)
-- Currently the backend uses service_role so RLS is bypassed, but this
-- documents and enforces intent for direct API calls.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can delete chat messages for their own scans" ON public.chat_messages;

CREATE POLICY "Users can delete chat messages for their own scans"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = chat_messages.scan_id
        AND scans.user_id = auth.uid()
    )
  );
