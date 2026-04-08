-- ============================================
-- Add scan_type column to scans table
-- ============================================
-- Distinguishes between single URL scans and sitemap scans

ALTER TABLE public.scans
ADD COLUMN IF NOT EXISTS scan_type TEXT NOT NULL DEFAULT 'url'
CHECK (scan_type IN ('url', 'sitemap'));
