import { chromium, Browser, Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { logger } from "../../utils/logger";

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
  let page: Page | null = null;

  try {
    page = await browserInstance.newPage();

    // Set a reasonable timeout and viewport
    page.setDefaultTimeout(20000);
    await page.setViewportSize({ width: 1280, height: 720 });

    logger.info(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 20000,
    });

    // Wait a bit for any late-loading JS
    await page.waitForTimeout(1000);

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
    if (page) {
      await page.close().catch(() => {});
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
