/**
 * get_scan_report tool — Get the full detailed report for a specific scan.
 */

import type { ApiClient, ScanResponse } from "../api-client.js";

export const GET_SCAN_REPORT_TOOL = {
  name: "get_scan_report",
  description:
    "Get the full detailed accessibility report for a specific scan, including all issues with their severity, descriptions, fix recommendations, and WCAG references. Use `get_scan_history` first to find a scan ID.",
  inputSchema: {
    type: "object" as const,
    properties: {
      scan_id: {
        type: "string",
        description: "The UUID of the scan to get the report for.",
      },
    },
    required: ["scan_id"],
  },
};

export async function handleGetScanReport(
  apiClient: ApiClient,
  args: { scan_id: string }
): Promise<string> {
  const { scan_id } = args;

  if (!scan_id) {
    return "Error: scan_id is required. Use `get_scan_history` to find a scan ID.";
  }

  try {
    const result: ScanResponse = await apiClient.getScanById(scan_id);

    return formatReport(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching report for scan ${scan_id}: ${message}`;
  }
}

function formatReport(result: ScanResponse): string {
  const { scan, issues, report } = result;

  let output = `# Accessibility Report\n\n`;
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
    output += `## All Issues (${issues.length})\n\n`;

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
      for (let i = 0; i < group.length; i++) {
        const issue = group[i];
        output += `**${i + 1}. ${issue.issue_type}**\n\n`;
        output += `- **Severity:** ${issue.severity}\n`;
        output += `- **Description:** ${issue.description}\n`;
        output += `- **Recommendation:** ${issue.recommendation}\n`;
        if (issue.wcag_reference) {
          output += `- **WCAG Reference:** ${issue.wcag_reference}\n`;
        }
        output += `\n`;
      }
    }
  } else {
    output += `## No issues found! 🎉\n\n`;
  }

  output += `\n---\n*Use \`chat_about_scan\` with scan ID \`${scan.id}\` to ask follow-up questions about these results.*`;

  return output;
}
