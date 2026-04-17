/**
 * scan_url tool — Scan a website URL for accessibility issues.
 */

import type { ApiClient, ScanResponse } from "../api-client.js";

export const SCAN_URL_TOOL = {
  name: "scan_url",
  description:
    "Scan a website URL for WCAG accessibility issues using axe-core and get AI-powered analysis with severity classifications, descriptions, fix recommendations, and an overall accessibility score. Also supports sitemap URLs to scan multiple pages at once. This may take 30-120 seconds depending on the website.",
  inputSchema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description:
          "The website URL to scan for accessibility issues (e.g. https://example.com). Can also be a sitemap URL (e.g. https://example.com/sitemap.xml) to scan multiple pages.",
      },
    },
    required: ["url"],
  },
};

export async function handleScanUrl(
  apiClient: ApiClient,
  args: { url: string }
): Promise<string> {
  const { url } = args;

  if (!url) {
    return "Error: URL is required. Please provide a website URL to scan.";
  }

  try {
    const isGuest = apiClient.isGuestMode();
    const result: ScanResponse = await apiClient.createScan(url);
    return formatScanResult(result, isGuest);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error scanning ${url}: ${message}`;
  }
}

function formatScanResult(result: ScanResponse, isGuest: boolean): string {
  const { scan, issues, report } = result;

  let output = `# Accessibility Scan Results\n\n`;
  output += `**URL:** ${scan.url}\n`;
  output += `**Score:** ${scan.accessibility_score}/100\n`;
  output += `**Status:** ${scan.status}\n`;
  output += `**Scan Type:** ${scan.scan_type}\n`;
  output += `**Date:** ${scan.scan_date}\n`;
  output += `**Scan ID:** ${scan.id}\n\n`;

  if (report) {
    output += `## Summary\n\n${report.summary}\n\n`;
    output += `## Priority Recommendations\n\n${report.priority_recommendations}\n\n`;
  }

  if (issues.length > 0) {
    output += `## Issues Found (${issues.length})\n\n`;

    // Group by severity
    const bySeverity: Record<string, typeof issues> = {};
    for (const issue of issues) {
      const sev = issue.severity || "unknown";
      if (!bySeverity[sev]) bySeverity[sev] = [];
      bySeverity[sev].push(issue);
    }

    const severityOrder = ["critical", "serious", "moderate", "minor"];
    for (const severity of severityOrder) {
      const group = bySeverity[severity];
      if (!group || group.length === 0) continue;

      output += `### ${severity.toUpperCase()} (${group.length})\n\n`;
      for (const issue of group) {
        output += `- **${issue.issue_type}**\n`;
        output += `  - Description: ${issue.description}\n`;
        output += `  - Recommendation: ${issue.recommendation}\n`;
        if (issue.wcag_reference) {
          output += `  - WCAG Reference: ${issue.wcag_reference}\n`;
        }
        output += `\n`;
      }
    }
  } else {
    output += `## No issues found! 🎉\n\nThe website appears to have no detectable WCAG accessibility violations.\n`;
  }

  if (isGuest) {
    output += `\n---\n> ⚠️ **Guest mode** — results were not saved to history.\n> Add an \`ACCESSAI_API_KEY\` to enable history, reports, and AI chat.\n> Get a free key at: https://access-ai.solutions → Settings → API Keys`;
  } else {
    output += `\n---\n*Use the \`chat_about_scan\` tool with scan ID \`${scan.id}\` to ask follow-up questions about these results.*`;
  }

  return output;
}
