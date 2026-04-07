import { supabaseAdmin } from "../../services/supabase/client";
import { AppError } from "../../middleware/error-handler";
import { logger } from "../../utils/logger";
import { ReportWithIssues } from "./report.types";

export async function getReportByScanId(
  scanId: string,
  userId: string
): Promise<ReportWithIssues> {
  // Verify the scan belongs to the user
  const { data: scan, error: scanError } = await supabaseAdmin
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .eq("user_id", userId)
    .single();

  if (scanError || !scan) {
    throw new AppError("Scan not found.", 404);
  }

  // Fetch report
  const { data: report, error: reportError } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("scan_id", scanId)
    .single();

  if (reportError || !report) {
    throw new AppError("Report not found for this scan.", 404);
  }

  // Fetch issues
  const { data: issues, error: issuesError } = await supabaseAdmin
    .from("issues")
    .select("*")
    .eq("scan_id", scanId)
    .order("severity", { ascending: true });

  if (issuesError) {
    logger.error("Failed to fetch issues:", issuesError);
  }

  return {
    ...report,
    scan: {
      id: scan.id,
      url: scan.url,
      scan_date: scan.scan_date,
      accessibility_score: scan.accessibility_score,
    },
    issues: issues || [],
  };
}
