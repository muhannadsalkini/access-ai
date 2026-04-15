/**
 * Resource: accessai://scans/latest
 *
 * Provides the most recent scan's full report as context.
 */

import type { ApiClient } from "../api-client.js";

export const LATEST_SCAN_RESOURCE = {
  uri: "accessai://scans/latest",
  name: "Latest Accessibility Scan",
  description:
    "The most recent accessibility scan report with all issues, recommendations, and score.",
  mimeType: "text/markdown",
};

export async function handleLatestScanResource(
  apiClient: ApiClient
): Promise<string> {
  try {
    const scans = await apiClient.getScans();

    if (scans.length === 0) {
      return "No scans found. Use the `scan_url` tool to run your first accessibility scan!";
    }

    // Get the most recent scan
    const latestScan = scans[0];

    // Fetch full details
    const result = await apiClient.getScanById(latestScan.id);
    const { scan, issues, report } = result;

    let output = `# Latest Accessibility Scan Report\n\n`;
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
      output += `## Issues (${issues.length})\n\n`;

      for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        output += `${i + 1}. **[${issue.severity.toUpperCase()}] ${issue.issue_type}**\n`;
        output += `   - ${issue.description}\n`;
        output += `   - Fix: ${issue.recommendation}\n`;
        if (issue.wcag_reference) {
          output += `   - WCAG: ${issue.wcag_reference}\n`;
        }
        output += `\n`;
      }
    }

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching latest scan: ${message}`;
  }
}
