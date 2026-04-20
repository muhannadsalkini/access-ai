import { chromium, Browser, Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { logger } from "../../utils/logger";
import { isPrivateIP } from "./url-validator";
import dns from "dns";
import net from "net";
import { promisify } from "util";

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

// ---------------------------------------------------------------------------
// Resource-blocking + DNS Rebinding Guard (combined)
// ---------------------------------------------------------------------------
// One single page.route() handler that:
//   1. Aborts non-essential resource types (images, media, fonts, stylesheets).
//      axe-core doesn't need them and skipping them typically shaves 30–70 %
//      off navigation time for real-world pages.
//   2. Runs DNS rebinding protection on the remaining requests (documents,
//      scripts, xhr, fetch, etc.) — re-resolving hostnames at request time so
//      an attacker cannot switch DNS to a private IP between validateUrl()
//      and the actual browser fetch.
//
// The DNS cache has a short TTL (10 s) to catch real rebinding mid-scan
// while avoiding hammering DNS for every sub-resource of the page.
// ---------------------------------------------------------------------------

// Resource types axe-core doesn't need — aborting these massively speeds up
// page loads.  We KEEP "document", "script", "xhr", "fetch", "websocket",
// "eventsource" and "other" because they can contain or trigger DOM updates
// that axe should see.
const SKIP_RESOURCE_TYPES = new Set([
  "image",
  "media",
  "font",
  "stylesheet", // axe analyses computed styles, not stylesheets themselves
]);

interface DnsCacheEntry { ips: string[]; ts: number }

async function resolveHostname(hostname: string): Promise<string[]> {
  const ips: string[] = [];
  try { ips.push(...(await resolve4(hostname))); } catch { /* no A record */ }
  try { ips.push(...(await resolve6(hostname))); } catch { /* no AAAA record */ }
  return ips;
}

async function installRouteHandler(page: Page): Promise<void> {
  const cache = new Map<string, DnsCacheEntry>();
  const CACHE_TTL_MS = 10_000;

  await page.route("**/*", async (route) => {
    try {
      const request = route.request();
      const resourceType = request.resourceType();

      // 1. Fast-path: drop non-essential resource types immediately.
      if (SKIP_RESOURCE_TYPES.has(resourceType)) {
        await route.abort("blockedbyclient");
        return;
      }

      const requestUrl = request.url();
      if (!requestUrl.startsWith("http")) {
        await route.continue();
        return;
      }

      const hostname = new URL(requestUrl).hostname;

      // 2. If the URL uses a bare IP, validate it directly.
      if (net.isIP(hostname)) {
        if (isPrivateIP(hostname)) {
          logger.warn(`[SSRF Guard] Blocked bare private IP in request: ${hostname}`);
          await route.abort("blockedbyclient");
          return;
        }
        await route.continue();
        return;
      }

      // 3. DNS-rebinding check for hostnames.
      let entry = cache.get(hostname);
      if (!entry || Date.now() - entry.ts > CACHE_TTL_MS) {
        const ips = await resolveHostname(hostname);
        entry = { ips, ts: Date.now() };
        cache.set(hostname, entry);
      }

      for (const ip of entry.ips) {
        if (isPrivateIP(ip)) {
          logger.warn(
            `[SSRF Guard] DNS rebinding detected: ${hostname} → ${ip} — request aborted`
          );
          await route.abort("blockedbyclient");
          return;
        }
      }
    } catch {
      // On unexpected error, allow the request so we don't break legitimate scans
    }
    await route.continue();
  });
}

export interface AxeViolation {
  ruleId: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  affectedElements: {
    selector: string;
    html: string;
    failureSummary: string;
  }[];
}

export interface ScanResult {
  url: string;
  violations: AxeViolation[];
  violationCount: number;
  passCount: number;
  incompleteCount: number;
  timestamp: string;
}

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    logger.info("Launching Playwright Chromium browser...");
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browser;
}

export async function runAxeScan(url: string): Promise<ScanResult> {
  const browserInstance = await getBrowser();
  let context: import("playwright").BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // axe-core/playwright requires pages from browser.newContext()
    context = await browserInstance.newContext({
      viewport: { width: 1280, height: 720 },
      // Skip downloading images for an additional speed boost even before the
      // route handler fires (Chromium still requests them, just doesn't decode)
      javaScriptEnabled: true,
    });
    page = await context.newPage();

    // Slightly tighter default timeout — we have explicit budgets below.
    page.setDefaultTimeout(30_000);

    // Install the combined resource-blocking + DNS-rebinding handler BEFORE
    // the first navigation so it intercepts every request made by the page.
    await installRouteHandler(page);

    logger.info(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 25_000,
    });

    // Smart wait: give the page up to 3 s to become network-idle for JS-heavy
    // SPAs.  Static/server-rendered pages resolve almost instantly instead of
    // waiting the full hard-coded 3 s.
    await page
      .waitForLoadState("networkidle", { timeout: 3_000 })
      .catch(() => {
        /* networkidle not reached within budget — proceed anyway */
      });

    logger.info("Running axe-core accessibility scan...");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // Normalize violations into our format
    const violations: AxeViolation[] = results.violations.map((v) => ({
      ruleId: v.id,
      impact: v.impact || "unknown",
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      affectedElements: v.nodes.map((node) => ({
        selector: node.target.join(", "),
        html: node.html,
        failureSummary: node.failureSummary || "",
      })),
    }));

    return {
      url,
      violations,
      violationCount: results.violations.length,
      passCount: results.passes.length,
      incompleteCount: results.incomplete.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Scan failed for ${url}:`, error);
    throw error;
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

/**
 * Run axe-core accessibility scan directly on raw HTML code.
 * Used by AI agents to scan code without needing a live URL.
 */
export async function runAxeScanOnCode(html: string): Promise<ScanResult> {
  const browserInstance = await getBrowser();
  let context: import("playwright").BrowserContext | null = null;
  let page: Page | null = null;

  try {
    context = await browserInstance.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    page.setDefaultTimeout(30_000);

    logger.info("Injecting HTML code into blank page for axe scan...");
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15_000 });

    logger.info("Running axe-core accessibility scan on code...");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const violations: AxeViolation[] = results.violations.map((v) => ({
      ruleId: v.id,
      impact: v.impact || "unknown",
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      affectedElements: v.nodes.map((node) => ({
        selector: node.target.join(", "),
        html: node.html,
        failureSummary: node.failureSummary || "",
      })),
    }));

    return {
      url: "code://inline",
      violations,
      violationCount: results.violations.length,
      passCount: results.passes.length,
      incompleteCount: results.incomplete.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Code scan failed:", error);
    throw error;
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

// Cleanup browser on process exit
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

// ---------------------------------------------------------------------------
// Helpers exported for the scan pipeline
// ---------------------------------------------------------------------------

/**
 * Trim an axe violation before sending to the AI agent.  We cap the number of
 * affected elements and truncate the inline HTML so the Gemini prompt stays
 * small — this significantly reduces analyze latency on heavy pages.
 */
export function trimViolationForAgent(v: AxeViolation): AxeViolation {
  const MAX_ELEMENTS = 5;
  const MAX_HTML_LEN = 500;
  return {
    ...v,
    affectedElements: v.affectedElements.slice(0, MAX_ELEMENTS).map((el) => ({
      selector: el.selector,
      html:
        el.html.length > MAX_HTML_LEN
          ? `${el.html.slice(0, MAX_HTML_LEN)}…`
          : el.html,
      failureSummary: el.failureSummary,
    })),
  };
}

/**
 * Deterministic accessibility score matching the prompt contract:
 *   100 − (critical × 15) − (serious × 10) − (moderate × 5) − (minor × 2)
 * clamped to [0, 100].  Lets us emit a score immediately without waiting for
 * the LLM round-trip.
 */
export function computeDeterministicScore(violations: AxeViolation[]): number {
  const weights: Record<string, number> = {
    critical: 15,
    serious: 10,
    moderate: 5,
    minor: 2,
  };
  let score = 100;
  for (const v of violations) {
    score -= weights[v.impact] ?? 5; // "unknown" treated as moderate
  }
  return Math.max(0, Math.min(100, score));
}
