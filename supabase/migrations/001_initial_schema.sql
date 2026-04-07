-- ============================================
-- AccessAI Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SCANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  scan_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessibility_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scanning', 'analyzing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_scan_date ON public.scans(scan_date DESC);

-- ============================================
-- ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
  description TEXT NOT NULL,
  recommendation TEXT,
  wcag_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast scan lookups
CREATE INDEX idx_issues_scan_id ON public.issues(scan_id);

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL UNIQUE REFERENCES public.scans(id) ON DELETE CASCADE,
  summary TEXT,
  priority_recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast scan lookups
CREATE INDEX idx_reports_scan_id ON public.reports(scan_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Scans: Users can only see their own scans
CREATE POLICY "Users can view their own scans"
  ON public.scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans"
  ON public.scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans"
  ON public.scans FOR UPDATE
  USING (auth.uid() = user_id);

-- Issues: Users can see issues for their own scans
CREATE POLICY "Users can view issues for their scans"
  ON public.issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = issues.scan_id
      AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert issues"
  ON public.issues FOR INSERT
  WITH CHECK (true);

-- Reports: Users can see reports for their own scans
CREATE POLICY "Users can view reports for their scans"
  ON public.reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scans
      WHERE scans.id = reports.scan_id
      AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert reports"
  ON public.reports FOR INSERT
  WITH CHECK (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant service_role full access (used by backend)
GRANT ALL ON public.scans TO service_role;
GRANT ALL ON public.issues TO service_role;
GRANT ALL ON public.reports TO service_role;

-- Grant authenticated users select access (RLS handles filtering)
GRANT SELECT ON public.scans TO authenticated;
GRANT SELECT ON public.issues TO authenticated;
GRANT SELECT ON public.reports TO authenticated;
GRANT INSERT ON public.scans TO authenticated;
GRANT UPDATE ON public.scans TO authenticated;
