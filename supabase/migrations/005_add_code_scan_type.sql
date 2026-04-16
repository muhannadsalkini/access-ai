-- ============================================
-- Add 'code' scan type for direct HTML code scanning
-- ============================================
-- Allows AI agents to scan raw HTML code directly without needing a URL

-- Drop existing constraint and add new one that includes 'code'
ALTER TABLE public.scans
DROP CONSTRAINT IF EXISTS scans_scan_type_check;

ALTER TABLE public.scans
ADD CONSTRAINT scans_scan_type_check
CHECK (scan_type IN ('url', 'sitemap', 'code'));
