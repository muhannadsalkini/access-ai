import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../../services/supabase/client";
import { validateUrl } from "../../services/accessibility/url-validator";
import { runAxeScan, runAxeScanOnCode, AxeViolation } from "../../services/accessibility/axe-scanner";
import { isSitemapUrl, parseSitemap } from "../../services/accessibility/sitemap-parser";
import { callAgent } from "../../services/agent/agent-client";
import { AppError } from "../../middleware/error-handler";
import { logger } from "../../utils/logger";
import {
  ScanRecord,
  IssueRecord,
  ReportRecord,
  ScanResponse,
} from "./scan.types";

/**
 * Guest scan — runs the full scan pipeline but does NOT save anything to the
 * database.  Used when no API key is provided (keyless/guest mode).
 */
export async function createGuestScan(url: string): Promise<ScanResponse> {
  const validatedUrl = await validateUrl(url);
  const scanType = isSitemapUrl(validatedUrl) ? "sitemap" : "url";
  const scanId = uuidv4();

  let allViolations: AxeViolation[] = [];

  if (scanType === "sitemap") {
    logger.info(`[guest] Sitemap scan for ${validatedUrl}`);
    const pageUrls = await parseSitemap(validatedUrl);
    for (const pageUrl of pageUrls) {
      try {
        const pageScan = await runAxeScan(pageUrl);
        allViolations = allViolations.concat(
          pageScan.violations.map((v) => ({
            ...v,
            description: `[${pageUrl}] ${v.description}`,
          }))
        );
      } catch {
        logger.warn(`[guest] Failed to scan page ${pageUrl}. Skipping.`);
      }
    }
  } else {
    logger.info(`[guest] URL scan for ${validatedUrl}`);
    const scanResult = await runAxeScan(validatedUrl);
    allViolations = scanResult.violations;
  }

  logger.info(`[guest] ${allViolations.length} violations — calling agent`);
  const agentResponse = await callAgent({
    url: validatedUrl,
    scanId,
    violations: allViolations,
  });

  const issues: IssueRecord[] = agentResponse.issues.map((issue) => ({
    id: uuidv4(),
    scan_id: scanId,
    issue_type: issue.issueType,
    severity: issue.severity,
    description: issue.description,
    recommendation: issue.recommendation,
    wcag_reference: issue.wcagReference,
  }));

  const report: ReportRecord = {
    id: uuidv4(),
    scan_id: scanId,
    summary: agentResponse.summary,
    priority_recommendations: agentResponse.priorityRecommendations,
  };

  return {
    scan: {
      id: scanId,
      user_id: "guest",
      url: validatedUrl,
      scan_date: new Date().toISOString(),
      accessibility_score: agentResponse.accessibilityScore,
      status: "completed",
      scan_type: scanType,
    },
    issues,
    report,
  };
}

/**
 * Guest code scan — same as createGuestScan but for raw HTML.
 */
export async function createGuestCodeScan(
  html: string,
  title?: string
): Promise<ScanResponse> {
  if (!html || html.trim().length === 0) {
    throw new AppError("HTML code is required.", 400);
  }
  if (html.length > 500_000) {
    throw new AppError("HTML code too large (max 500KB).", 400);
  }

  const label = title ? `code://${title}` : "code://inline";
  const scanId = uuidv4();

  logger.info(`[guest] Code scan, html length: ${html.length} chars`);
  const scanResult = await runAxeScanOnCode(html);
  const allViolations = scanResult.violations;

  logger.info(`[guest] ${allViolations.length} violations — calling agent`);
  const agentResponse = await callAgent({
    url: label,
    scanId,
    violations: allViolations,
  });

  const issues: IssueRecord[] = agentResponse.issues.map((issue) => ({
    id: uuidv4(),
    scan_id: scanId,
    issue_type: issue.issueType,
    severity: issue.severity,
    description: issue.description,
    recommendation: issue.recommendation,
    wcag_reference: issue.wcagReference,
  }));

  const report: ReportRecord = {
    id: uuidv4(),
    scan_id: scanId,
    summary: agentResponse.summary,
    priority_recommendations: agentResponse.priorityRecommendations,
  };

  return {
    scan: {
      id: scanId,
      user_id: "guest",
      url: label,
      scan_date: new Date().toISOString(),
      accessibility_score: agentResponse.accessibilityScore,
      status: "completed",
      scan_type: "code",
    },
    issues,
    report,
  };
}

export async function createScan(
  userId: string,
  url: string
): Promise<ScanResponse> {
  // 1. Validate and sanitize URL
  const validatedUrl = await validateUrl(url);

  // 2. Detect if URL is a sitemap
  const scanType = isSitemapUrl(validatedUrl) ? "sitemap" : "url";

  // 3. Create scan record in database
  const scanId = uuidv4();
  const scanRecord: ScanRecord = {
    id: scanId,
    user_id: userId,
    url: validatedUrl,
    scan_date: new Date().toISOString(),
    accessibility_score: 0,
    status: "scanning",
    scan_type: scanType,
  };

  const { error: insertError } = await supabaseAdmin
    .from("scans")
    .insert(scanRecord);

  if (insertError) {
    logger.error("Failed to create scan record:", insertError);
    throw new AppError("Failed to create scan. Please try again.", 500);
  }

  try {
    let allViolations: AxeViolation[] = [];

    if (scanType === "sitemap") {
      // --- SITEMAP SCAN ---
      logger.info(`Sitemap scan detected for ${validatedUrl} (scan: ${scanId})`);
      await updateScanStatus(scanId, "scanning");

      // Parse sitemap to get page URLs
      const pageUrls = await parseSitemap(validatedUrl);
      logger.info(`Scanning ${pageUrls.length} pages from sitemap...`);

      // Scan each page and collect all violations
      for (let i = 0; i < pageUrls.length; i++) {
        const pageUrl = pageUrls[i];
        logger.info(`Scanning page ${i + 1}/${pageUrls.length}: ${pageUrl}`);
        try {
          const pageScan = await runAxeScan(pageUrl);
          // Tag each violation with the source page URL for context
          const taggedViolations = pageScan.violations.map((v) => ({
            ...v,
            description: `[${pageUrl}] ${v.description}`,
          }));
          allViolations = allViolations.concat(taggedViolations);
        } catch (pageError) {
          logger.warn(`Failed to scan page ${pageUrl}: ${pageError}. Skipping.`);
          // Continue scanning other pages even if one fails
        }
      }

      logger.info(
        `Collected ${allViolations.length} total violations from ${pageUrls.length} pages`
      );
    } else {
      // --- SINGLE URL SCAN ---
      logger.info(`Starting axe scan for ${validatedUrl} (scan: ${scanId})`);
      await updateScanStatus(scanId, "scanning");
      const scanResult = await runAxeScan(validatedUrl);
      allViolations = scanResult.violations;
    }

    // 4. Send all violations to AI agent for analysis
    logger.info(
      `Found ${allViolations.length} violations. Sending to AI agent...`
    );
    await updateScanStatus(scanId, "analyzing");
    const agentResponse = await callAgent({
      url: validatedUrl,
      scanId,
      violations: allViolations,
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

export async function createCodeScan(
  userId: string,
  html: string,
  title?: string
): Promise<ScanResponse> {
  if (!html || html.trim().length === 0) {
    throw new AppError("HTML code is required.", 400);
  }

  if (html.length > 500_000) {
    throw new AppError("HTML code too large (max 500KB).", 400);
  }

  // Use a descriptive label as the "url" field for code scans
  const label = title ? `code://${title}` : "code://inline";

  const scanId = uuidv4();
  const scanRecord: ScanRecord = {
    id: scanId,
    user_id: userId,
    url: label,
    scan_date: new Date().toISOString(),
    accessibility_score: 0,
    status: "scanning",
    scan_type: "code",
  };

  const { error: insertError } = await supabaseAdmin
    .from("scans")
    .insert(scanRecord);

  if (insertError) {
    logger.error("Failed to create code scan record:", insertError);
    throw new AppError("Failed to create scan. Please try again.", 500);
  }

  try {
    logger.info(`Starting code scan (scan: ${scanId}), html length: ${html.length} chars`);
    await updateScanStatus(scanId, "scanning");

    const scanResult = await runAxeScanOnCode(html);
    const allViolations = scanResult.violations;

    logger.info(`Found ${allViolations.length} violations. Sending to AI agent...`);
    await updateScanStatus(scanId, "analyzing");

    const agentResponse = await callAgent({
      url: label,
      scanId,
      violations: allViolations,
    });

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

    await supabaseAdmin
      .from("scans")
      .update({ accessibility_score: agentResponse.accessibilityScore, status: "completed" })
      .eq("id", scanId);

    return {
      scan: { ...scanRecord, accessibility_score: agentResponse.accessibilityScore, status: "completed" },
      issues,
      report,
    };
  } catch (error) {
    await updateScanStatus(scanId, "failed");
    logger.error(`Code scan ${scanId} failed:`, error);
    throw new AppError("Code scan failed. Please check the HTML and try again.", 500);
  }
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
