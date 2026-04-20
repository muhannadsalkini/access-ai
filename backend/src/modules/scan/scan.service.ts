import { v4 as uuidv4 } from "uuid";
import { supabaseAdmin } from "../../services/supabase/client";
import { validateUrl } from "../../services/accessibility/url-validator";
import {
  runAxeScan,
  runAxeScanOnCode,
  AxeViolation,
  trimViolationForAgent,
  computeDeterministicScore,
} from "../../services/accessibility/axe-scanner";
import { isSitemapUrl, parseSitemap } from "../../services/accessibility/sitemap-parser";
import { callAgent, callAgentAnalyzeStream } from "../../services/agent/agent-client";
import { AppError } from "../../middleware/error-handler";
import { logger } from "../../utils/logger";
import {
  ScanRecord,
  IssueRecord,
  ReportRecord,
  ScanResponse,
} from "./scan.types";

// Maximum number of sitemap pages scanned in parallel.  The host machine only
// has one shared Chromium so pushing this much higher than 3 gives diminishing
// returns and can OOM small Render instances.
const SITEMAP_PARALLELISM = 3;

/**
 * Run a batch of page scans in parallel, collecting violations as we go.
 * Failed pages are logged and skipped — they must not abort the whole scan.
 */
async function scanPagesInParallel(
  pageUrls: string[],
  concurrency: number = SITEMAP_PARALLELISM
): Promise<AxeViolation[]> {
  const results: AxeViolation[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < pageUrls.length) {
      const idx = cursor++;
      const pageUrl = pageUrls[idx];
      logger.info(`Scanning page ${idx + 1}/${pageUrls.length}: ${pageUrl}`);
      try {
        const pageScan = await runAxeScan(pageUrl);
        for (const v of pageScan.violations) {
          results.push({ ...v, description: `[${pageUrl}] ${v.description}` });
        }
      } catch (err) {
        logger.warn(`Failed to scan page ${pageUrl}: ${err}. Skipping.`);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, pageUrls.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

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
    allViolations = await scanPagesInParallel(pageUrls);
  } else {
    logger.info(`[guest] URL scan for ${validatedUrl}`);
    const scanResult = await runAxeScan(validatedUrl);
    allViolations = scanResult.violations;
  }

  logger.info(`[guest] ${allViolations.length} violations — calling agent`);
  const agentResponse = await callAgent({
    url: validatedUrl,
    scanId,
    violations: allViolations.map(trimViolationForAgent),
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
    violations: allViolations.map(trimViolationForAgent),
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
      // --- SITEMAP SCAN (parallelised) ---
      logger.info(`Sitemap scan detected for ${validatedUrl} (scan: ${scanId})`);
      const pageUrls = await parseSitemap(validatedUrl);
      logger.info(
        `Scanning ${pageUrls.length} pages from sitemap (parallelism=${SITEMAP_PARALLELISM})...`
      );
      allViolations = await scanPagesInParallel(pageUrls);
      logger.info(
        `Collected ${allViolations.length} total violations from ${pageUrls.length} pages`
      );
    } else {
      // --- SINGLE URL SCAN ---
      logger.info(`Starting axe scan for ${validatedUrl} (scan: ${scanId})`);
      const scanResult = await runAxeScan(validatedUrl);
      allViolations = scanResult.violations;
    }

    // 4. Send all violations to AI agent for analysis (trimmed payload).
    logger.info(
      `Found ${allViolations.length} violations. Sending to AI agent...`
    );
    await updateScanStatus(scanId, "analyzing");
    const agentResponse = await callAgent({
      url: validatedUrl,
      scanId,
      violations: allViolations.map(trimViolationForAgent),
    });

    // 5. Store issues + report + status update in PARALLEL.
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

    const dbWrites: PromiseLike<unknown>[] = [
      supabaseAdmin.from("reports").insert(report),
      supabaseAdmin
        .from("scans")
        .update({
          accessibility_score: agentResponse.accessibilityScore,
          status: "completed",
        })
        .eq("id", scanId),
    ];
    if (issues.length > 0) {
      dbWrites.push(supabaseAdmin.from("issues").insert(issues));
    }
    const dbResults = await Promise.all(dbWrites);
    for (const res of dbResults as { error?: unknown }[]) {
      if (res?.error) logger.error("DB write error:", res.error);
    }

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

// ---------------------------------------------------------------------------
// Streaming scan pipeline
// ---------------------------------------------------------------------------
// Yields progress events consumable by a Server-Sent Events handler.  Each
// yielded value is a plain object describing one step of the pipeline; the
// controller is responsible for turning these into `data: …\n\n` SSE frames.
//
// Event shape:
//   { type: "status",   status: "scanning" | "analyzing" | "completed" | "failed" }
//   { type: "scan",     scan: ScanRecord }
//   { type: "progress", message: string, pagesScanned?: number, pagesTotal?: number }
//   { type: "violations_found", count: number, score: number }
//   { type: "summary",  summary: string, priority_recommendations: string }
//   { type: "issue",    issue: IssueRecord }
//   { type: "done",     scan: ScanRecord }
//   { type: "error",    message: string }
// ---------------------------------------------------------------------------

export type ScanStreamEvent =
  | { type: "status"; status: ScanRecord["status"] }
  | { type: "scan"; scan: ScanRecord }
  | {
      type: "progress";
      message: string;
      pagesScanned?: number;
      pagesTotal?: number;
    }
  | { type: "violations_found"; count: number; score: number }
  | { type: "summary"; summary: string; priority_recommendations: string }
  | { type: "issue"; issue: IssueRecord }
  | { type: "done"; scan: ScanRecord }
  | { type: "error"; message: string };

export async function* createScanStream(
  userId: string | null,
  url: string
): AsyncGenerator<ScanStreamEvent, void, void> {
  const isGuest = !userId;
  const validatedUrl = await validateUrl(url);
  const scanType = isSitemapUrl(validatedUrl) ? "sitemap" : "url";
  const scanId = uuidv4();

  const scanRecord: ScanRecord = {
    id: scanId,
    user_id: userId ?? "guest",
    url: validatedUrl,
    scan_date: new Date().toISOString(),
    accessibility_score: 0,
    status: "scanning",
    scan_type: scanType,
  };

  if (!isGuest) {
    const { error: insertError } = await supabaseAdmin
      .from("scans")
      .insert(scanRecord);
    if (insertError) {
      logger.error("Failed to create scan record:", insertError);
      yield { type: "error", message: "Failed to create scan. Please try again." };
      return;
    }
  }

  yield { type: "status", status: "scanning" };
  yield { type: "scan", scan: scanRecord };

  try {
    let allViolations: AxeViolation[] = [];

    if (scanType === "sitemap") {
      const pageUrls = await parseSitemap(validatedUrl);
      yield {
        type: "progress",
        message: `Scanning ${pageUrls.length} pages from sitemap…`,
        pagesScanned: 0,
        pagesTotal: pageUrls.length,
      };
      allViolations = await scanPagesInParallel(pageUrls);
      yield {
        type: "progress",
        message: `Finished scanning ${pageUrls.length} pages.`,
        pagesScanned: pageUrls.length,
        pagesTotal: pageUrls.length,
      };
    } else {
      yield { type: "progress", message: `Running axe-core on ${validatedUrl}…` };
      const scanResult = await runAxeScan(validatedUrl);
      allViolations = scanResult.violations;
    }

    // Deterministic score right now — no LLM round-trip needed.
    const deterministicScore = computeDeterministicScore(allViolations);
    yield {
      type: "violations_found",
      count: allViolations.length,
      score: deterministicScore,
    };

    // If no violations, we can short-circuit (no need to call the LLM).
    if (allViolations.length === 0) {
      const report: ReportRecord = {
        id: uuidv4(),
        scan_id: scanId,
        summary:
          "No automated accessibility violations were detected by axe-core. " +
          "Manual review is still recommended for aspects automation can't catch.",
        priority_recommendations: "",
      };
      yield {
        type: "summary",
        summary: report.summary,
        priority_recommendations: report.priority_recommendations,
      };

      if (!isGuest) {
        const dbResults = await Promise.all([
          supabaseAdmin.from("reports").insert(report),
          supabaseAdmin
            .from("scans")
            .update({ accessibility_score: 100, status: "completed" })
            .eq("id", scanId),
        ]);
        for (const res of dbResults as { error?: unknown }[]) {
          if (res?.error) logger.error("DB write error:", res.error);
        }
      }

      const finalScan: ScanRecord = {
        ...scanRecord,
        accessibility_score: 100,
        status: "completed",
      };
      yield { type: "status", status: "completed" };
      yield { type: "done", scan: finalScan };
      return;
    }

    // --- Streaming analyze ---
    yield { type: "status", status: "analyzing" };
    if (!isGuest) await updateScanStatus(scanId, "analyzing");

    const trimmed = allViolations.map(trimViolationForAgent);

    const issueRecords: IssueRecord[] = [];
    let summaryText = "";
    let priorityText = "";

    for await (const record of callAgentAnalyzeStream({
      url: validatedUrl,
      scanId,
      violations: trimmed,
    })) {
      if (record.type === "error") {
        throw new Error(record.message);
      }
      if (record.type === "summary") {
        summaryText = record.summary ?? "";
        priorityText = record.priority_recommendations ?? "";
        yield {
          type: "summary",
          summary: summaryText,
          priority_recommendations: priorityText,
        };
        continue;
      }
      if (record.type === "issue") {
        const issue: IssueRecord = {
          id: uuidv4(),
          scan_id: scanId,
          issue_type: record.issue_type ?? "Unknown",
          severity: record.severity ?? "moderate",
          description: record.description ?? "",
          recommendation: record.recommendation ?? "",
          wcag_reference: record.wcag_reference ?? "",
        };
        issueRecords.push(issue);
        yield { type: "issue", issue };
      }
    }

    // Persist everything in parallel once the stream has drained.
    if (!isGuest) {
      const report: ReportRecord = {
        id: uuidv4(),
        scan_id: scanId,
        summary: summaryText,
        priority_recommendations: priorityText,
      };
      const writes: PromiseLike<unknown>[] = [
        supabaseAdmin.from("reports").insert(report),
        supabaseAdmin
          .from("scans")
          .update({
            accessibility_score: deterministicScore,
            status: "completed",
          })
          .eq("id", scanId),
      ];
      if (issueRecords.length > 0) {
        writes.push(supabaseAdmin.from("issues").insert(issueRecords));
      }

      const dbResults = await Promise.all(writes);
      for (const res of dbResults as { error?: unknown }[]) {
        if (res?.error) logger.error("DB write error:", res.error);
      }
    }

    const finalScan: ScanRecord = {
      ...scanRecord,
      accessibility_score: deterministicScore,
      status: "completed",
    };
    yield { type: "status", status: "completed" };
    yield { type: "done", scan: finalScan };
  } catch (error: any) {
    if (!isGuest) {
      await updateScanStatus(scanId, "failed").catch(() => {});
    }
    logger.error(`Scan ${scanId} failed:`, error);
    yield {
      type: "error",
      message:
        error?.message ??
        "Scan failed. The website may be unreachable or took too long to respond.",
    };
    yield { type: "status", status: "failed" };
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
  // Fetch scan, issues, and report in PARALLEL rather than sequentially.
  const [scanRes, issuesRes, reportRes] = await Promise.all([
    supabaseAdmin
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .eq("user_id", userId)
      .single(),
    supabaseAdmin
      .from("issues")
      .select("*")
      .eq("scan_id", scanId)
      .order("severity", { ascending: true }),
    supabaseAdmin
      .from("reports")
      .select("*")
      .eq("scan_id", scanId)
      .single(),
  ]);

  if (scanRes.error || !scanRes.data) {
    throw new AppError("Scan not found.", 404);
  }

  return {
    scan: scanRes.data,
    issues: issuesRes.data || [],
    report: reportRes.data || null,
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

    const scanResult = await runAxeScanOnCode(html);
    const allViolations = scanResult.violations;

    logger.info(`Found ${allViolations.length} violations. Sending to AI agent...`);
    await updateScanStatus(scanId, "analyzing");

    const agentResponse = await callAgent({
      url: label,
      scanId,
      violations: allViolations.map(trimViolationForAgent),
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

    const writes: PromiseLike<unknown>[] = [
      supabaseAdmin.from("reports").insert(report),
      supabaseAdmin
        .from("scans")
        .update({
          accessibility_score: agentResponse.accessibilityScore,
          status: "completed",
        })
        .eq("id", scanId),
    ];
    if (issues.length > 0) {
      writes.push(supabaseAdmin.from("issues").insert(issues));
    }
    const dbResults = await Promise.all(writes);

    for (const res of dbResults as { error?: unknown }[]) {
      if (res?.error) logger.error("DB write error:", res.error);
    }

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

export interface FixCodeResult {
  scanId: string;
  score: number;
  issueCount: number;
  fixedHtml: string;
  saved: boolean;
}

export async function fixCode(
  html: string,
  userId?: string,
  title?: string
): Promise<FixCodeResult> {
  if (!html || html.trim().length === 0) {
    throw new AppError("HTML code is required.", 400);
  }
  if (html.length > 500_000) {
    throw new AppError("HTML code too large (max 500KB).", 400);
  }

  const label = title ? `code://${title}` : "code://inline";
  const scanId = uuidv4();

  logger.info(`[fix] Code scan, html length: ${html.length} chars`);
  const scanResult = await runAxeScanOnCode(html);
  const violations = scanResult.violations;

  logger.info(`[fix] ${violations.length} violations — calling agent analyze`);
  const agentResponse = await callAgent({
    url: label,
    scanId,
    violations: violations.map(trimViolationForAgent),
  });

  const issueCount = agentResponse.issues.length;
  const score = agentResponse.accessibilityScore;

  // Build fix prompt — include original HTML in context for the agent
  let fixedHtml = html;
  if (issueCount > 0) {
    const issueList = agentResponse.issues
      .map((i, n) => `${n + 1}. [${i.severity}] ${i.issueType}: ${i.description}`)
      .join("\n");

    const { callAgentChat } = await import("../../services/agent/agent-client.js");
    const fixResponse = await callAgentChat({
      url: label,
      score,
      summary: agentResponse.summary,
      issuesText:
        `Original HTML:\n\`\`\`html\n${html}\n\`\`\`\n\nIssues to fix:\n${issueList}`,
      message:
        `Please return the complete fixed version of the HTML above with ALL ${issueCount} accessibility issues resolved. ` +
        `Return ONLY the corrected HTML code — no explanations, no markdown code fences, just the raw fixed HTML.`,
      conversationHistory: [],
    });
    fixedHtml = fixResponse.response;
  }

  // Save to DB if user is authenticated — fire writes in parallel.
  let saved = false;
  if (userId) {
    try {
      const scanRecord: ScanRecord = {
        id: scanId,
        user_id: userId,
        url: label,
        scan_date: new Date().toISOString(),
        accessibility_score: score,
        status: "completed",
        scan_type: "code",
      };

      // scans row must exist before issues/reports rows (FK)
      await supabaseAdmin.from("scans").insert(scanRecord);

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

      const writes: PromiseLike<unknown>[] = [
        supabaseAdmin.from("reports").insert(report),
      ];
      if (issues.length > 0) {
        writes.push(supabaseAdmin.from("issues").insert(issues));
      }
      await Promise.all(writes);


      saved = true;
    } catch (err) {
      logger.warn("[fix] Failed to save scan to DB:", err);
    }
  }

  return { scanId, score, issueCount, fixedHtml, saved };
}

export async function deleteScan(
  scanId: string,
  userId: string
): Promise<void> {
  // Verify ownership before deleting
  const { data: scan, error: fetchError } = await supabaseAdmin
    .from("scans")
    .select("id")
    .eq("id", scanId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !scan) {
    throw new AppError("Scan not found.", 404);
  }

  // Delete related records in parallel.
  await Promise.all([
    supabaseAdmin.from("issues").delete().eq("scan_id", scanId),
    supabaseAdmin.from("reports").delete().eq("scan_id", scanId),
    supabaseAdmin
      .from("chat_messages")
      .delete()
      .eq("scan_id", scanId)
      .then(() => undefined, () => undefined),
  ]);

  // Delete the scan itself
  const { error } = await supabaseAdmin
    .from("scans")
    .delete()
    .eq("id", scanId)
    .eq("user_id", userId);

  if (error) {
    logger.error("Failed to delete scan:", error);
    throw new AppError("Failed to delete scan.", 500);
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
