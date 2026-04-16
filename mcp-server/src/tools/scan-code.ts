/**
 * scan_code tool — Scan raw HTML code directly for WCAG accessibility issues.
 * Ideal for AI agents checking code they are writing or editing before deployment.
 */

import type { ApiClient } from "../api-client.js";

export const SCAN_CODE_TOOL = {
  name: "scan_code",
  description:
    "Scan raw HTML code directly for WCAG accessibility issues using axe-core and get AI-powered analysis with severity classifications, descriptions, fix recommendations, and an overall accessibility score. Use this when you have HTML code (e.g. a component or page template) and want to check it for accessibility issues without needing a live URL. Results are saved to your scan history.",
  inputSchema: {
    type: "object" as const,
    properties: {
      html: {
        type: "string",
        description:
          "The raw HTML code to scan for accessibility issues. Can be a full page, a component, or any HTML snippet.",
      },
      title: {
        type: "string",
        description:
          "Optional label for this code scan (e.g. 'LoginForm', 'NavBar component'). Used to identify the scan in your history.",
      },
    },
    required: ["html"],
  },
};

export async function handleScanCode(
  apiClient: ApiClient,
  args: { html: string; title?: string }
): Promise<string> {
  const { html, title } = args;

  if (!html || html.trim().length === 0) {
    return "Error: html is required. Please provide the HTML code you want to scan.";
  }

  if (html.length > 500_000) {
    return "Error: HTML code is too large (max 500KB). Please provide a smaller code snippet.";
  }

  try {
    const label = title ? `"${title}"` : "the provided HTML code";
    let output = `## Scanning ${label} for accessibility issues...\n\n`;
    output += `*Running axe-core WCAG analysis on your code — this may take 30-60 seconds...*\n\n`;

    const result = await apiClient.createCodeScan(html, title);

    const { scan, issues, report } = result;

    // Score badge
    const score = scan.accessibility_score;
    const scoreEmoji = score >= 90 ? "🟢" : score >= 70 ? "🟡" : "🔴";

    output = `## Code Accessibility Scan Results\n\n`;
    output += `**Label:** ${title || "Inline HTML"}\n`;
    output += `**Score:** ${scoreEmoji} ${score}/100\n`;
    output += `**Scan ID:** \`${scan.id}\`\n\n`;

    if (report) {
      output += `## Summary\n\n${report.summary}\n\n`;
      output += `## Priority Recommendations\n\n${report.priority_recommendations}\n\n`;
    }

    if (issues.length === 0) {
      output += `## ✅ No Accessibility Issues Found!\n\nYour code passes all WCAG 2.1 AA checks.\n`;
    } else {
      // Group issues by severity
      const grouped: Record<string, typeof issues> = {};
      for (const issue of issues) {
        if (!grouped[issue.severity]) grouped[issue.severity] = [];
        grouped[issue.severity].push(issue);
      }

      const severityOrder = ["critical", "serious", "moderate", "minor"];
      const severityEmoji: Record<string, string> = {
        critical: "🔴",
        serious: "🟠",
        moderate: "🟡",
        minor: "🔵",
      };

      output += `## All Issues (${issues.length} total)\n\n`;

      for (const severity of severityOrder) {
        const severityIssues = grouped[severity];
        if (!severityIssues || severityIssues.length === 0) continue;

        output += `### ${severityEmoji[severity] || "⚪"} ${severity.toUpperCase()} (${severityIssues.length})\n\n`;

        severityIssues.forEach((issue, i) => {
          output += `**${i + 1}. ${issue.issue_type}**\n\n`;
          output += `- **Description:** ${issue.description}\n`;
          output += `- **Fix:** ${issue.recommendation}\n`;
          output += `- **WCAG:** ${issue.wcag_reference}\n\n`;
        });
      }
    }

    output += `---\n*Use \`chat_about_scan\` with scan ID \`${scan.id}\` to ask follow-up questions.*`;

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error scanning code: ${message}`;
  }
}
