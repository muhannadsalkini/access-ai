import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../../services/supabase/client";
import { validateUrl } from "../../services/accessibility/url-validator";
import { runAxeScan } from "../../services/accessibility/axe-scanner";
import { callAgent } from "../../services/agent/agent-client";
import { AppError } from "../../middleware/error-handler";
import { logger } from "../../utils/logger";
import {
  ScanRecord,
  IssueRecord,
  ReportRecord,
  ScanResponse,
} from "./scan.types";

export async function createScan(
  userId: string,
  url: string
): Promise<ScanResponse> {
  // 1. Validate and sanitize URL
  const validatedUrl = await validateUrl(url);

  // 2. Create scan record in database
  const scanId = uuidv4();
  const scanRecord: ScanRecord = {
    id: scanId,
    user_id: userId,
    url: validatedUrl,
    scan_date: new Date().toISOString(),
    accessibility_score: 0,
    status: "scanning",
  };

  const { error: insertError } = await supabaseAdmin
    .from("scans")
    .insert(scanRecord);

  if (insertError) {
    logger.error("Failed to create scan record:", insertError);
    throw new AppError("Failed to create scan. Please try again.", 500);
  }

  try {
    // 3. Run axe-core accessibility scan
    logger.info(`Starting axe scan for ${validatedUrl} (scan: ${scanId})`);
    await updateScanStatus(scanId, "scanning");
    const scanResult = await runAxeScan(validatedUrl);

    // 4. Send violations to AI agent for analysis
    logger.info(
      `Found ${scanResult.violationCount} violations. Sending to AI agent...`
    );
    await updateScanStatus(scanId, "analyzing");
    const agentResponse = await callAgent({
      url: validatedUrl,
      scanId,
      violations: scanResult.violations,
    });

    // 5. Store issues in database
    const issues: IssueRecord[] = agentResponse.issues.map((issue) => ({
      id: uuidv4(),
      scan_id: scanId,
      issue_type: issue.issueType,
      severity: issue.severity,
      description: issue.description,
      recommendation: issue.recommendation,
      wcag_reference: issue.wcagReference,
    }));

    if (issues.length > 0) {
      const { error: issuesError } = await supabaseAdmin
        .from("issues")
        .insert(issues);

      if (issuesError) {
        logger.error("Failed to store issues:", issuesError);
      }
    }

    // 6. Store report in database
    const report: ReportRecord = {
      id: uuidv4(),
      scan_id: scanId,
      summary: agentResponse.summary,
      priority_recommendations: agentResponse.priorityRecommendations,
    };

    const { error: reportError } = await supabaseAdmin
      .from("reports")
      .insert(report);

    if (reportError) {
      logger.error("Failed to store report:", reportError);
    }

    // 7. Update scan with score and mark as completed
    await supabaseAdmin
      .from("scans")
      .update({
        accessibility_score: agentResponse.accessibilityScore,
        status: "completed",
      })
      .eq("id", scanId);

    return {
      scan: {
        ...scanRecord,
        accessibility_score: agentResponse.accessibilityScore,
        status: "completed",
      },
      issues,
      report,
    };
  } catch (error) {
    // Mark scan as failed
    await updateScanStatus(scanId, "failed");
    logger.error(`Scan ${scanId} failed:`, error);
    throw new AppError(
      "Scan failed. The website may be unreachable or took too long to respond.",
      500
    );
  }
}

export async function getScansByUser(userId: string): Promise<ScanRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .order("scan_date", { ascending: false });

  if (error) {
    logger.error("Failed to fetch scans:", error);
    throw new AppError("Failed to fetch scan history.", 500);
  }

  return data || [];
}

export async function getScanById(
  scanId: string,
  userId: string
): Promise<ScanResponse> {
  // Fetch scan
  const { data: scan, error: scanError } = await supabaseAdmin
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .eq("user_id", userId)
    .single();

  if (scanError || !scan) {
    throw new AppError("Scan not found.", 404);
  }

  // Fetch issues
  const { data: issues } = await supabaseAdmin
    .from("issues")
    .select("*")
    .eq("scan_id", scanId)
    .order("severity", { ascending: true });

  // Fetch report
  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("*")
    .eq("scan_id", scanId)
    .single();

  return {
    scan,
    issues: issues || [],
    report: report || null,
  };
}

async function updateScanStatus(
  scanId: string,
  status: ScanRecord["status"]
): Promise<void> {
  await supabaseAdmin
    .from("scans")
    .update({ status })
    .eq("id", scanId);
}
