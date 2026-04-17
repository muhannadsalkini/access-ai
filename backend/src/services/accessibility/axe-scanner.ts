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
// DNS Rebinding Guard
// ---------------------------------------------------------------------------
// validateUrl() performs a one-time DNS check at scan submission time.
// An attacker can perform a DNS rebinding attack by switching the DNS record
// to a private IP AFTER validation but BEFORE Playwright actually fetches the
// page.  This guard re-resolves every hostname at the time of the real HTTP
// request, catching any DNS switch mid-flight.
//
// Results are cached per hostname for the duration of one scan session
// (10 s) to avoid hammering DNS on every sub-resource request while still
// catching rebinding attacks that happen after the initial check.
// ---------------------------------------------------------------------------

interface DnsCacheEntry { ips: string[]; ts: number }

async function resolveHostname(hostname: string): Promise<string[]> {
  const ips: string[] = [];
  try { ips.push(...(await resolve4(hostname))); } catch { /* no A record */ }
  try { ips.push(...(await resolve6(hostname))); } catch { /* no AAAA record */ }
  return ips;
}

/**
 * Install a Playwright route interceptor that re-validates DNS for every
 * outgoing request.  Any request whose hostname now resolves to a private IP
 * is aborted, preventing DNS rebinding exploitation.
 */
async function installDnsRebindingGuard(page: Page): Promise<void> {
  const cache = new Map<string, DnsCacheEntry>();
  const CACHE_TTL_MS = 10_000; // 10 s — short enough to catch real rebinding

  await page.route("**/*", async (route) => {
    try {
      const requestUrl = route.request().url();
      // Only HTTP(S) requests are relevant
      if (!requestUrl.startsWith("http")) {
        await route.continue();
        return;
      }

      const hostname = new URL(requestUrl).hostname;

      // If the URL uses a bare IP, validate it directly
      if (net.isIP(hostname)) {
        if (isPrivateIP(hostname)) {
          logger.warn(`[SSRF Guard] Blocked bare private IP in request: ${hostname}`);
          await route.abort("blockedbyclient");
          return;
        }
        await route.continue();
        return;
      }

      // Re-resolve the hostname at request time
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
    });
    page = await context.newPage();

    // Set a reasonable timeout
    page.setDefaultTimeout(45000);

    // Install DNS-rebinding guard BEFORE the first navigation.
    // This intercepts every HTTP request made by the page and re-resolves the
    // hostname at request time, so an attacker cannot exploit the window
    // between validateUrl() and the actual browser fetch.
    await installDnsRebindingGuard(page);

    logger.info(`Navigating to ${url}...`);
    // Use domcontentloaded first (fast), then wait for extra load time
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Give JS-heavy pages a bit more time to render
    await page.waitForTimeout(3000);

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
    page.setDefaultTimeout(30000);

    logger.info("Injecting HTML code into blank page for axe scan...");
    // Use setContent to inject raw HTML directly (no network request needed)
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15000 });

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
