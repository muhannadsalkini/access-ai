/**
 * compare_scans tool — Compare two scan results to measure accessibility improvement.
 */

import type { ApiClient } from "../api-client.js";

export const COMPARE_SCANS_TOOL = {
  name: "compare_scans",
  description:
    "Compare two accessibility scans to see improvement or regression. Shows score change, issues fixed, and remaining issues. Use this after making fixes to verify improvement. Requires an API key.",
  inputSchema: {
    type: "object" as const,
    properties: {
      before_scan_id: {
        type: "string",
        description: "The scan ID of the original (before fix) scan.",
      },
      after_scan_id: {
        type: "string",
        description: "The scan ID of the updated (after fix) scan.",
      },
    },
    required: ["before_scan_id", "after_scan_id"],
  },
};

export async function handleCompareScans(
  apiClient: ApiClient,
  args: { before_scan_id: string; after_scan_id: string }
): Promise<string> {
  if (apiClient.isGuestMode()) {
    return (
      "⚠️ **API key required.**\n\n" +
      "The `compare_scans` tool requires an `ACCESSAI_API_KEY`.\n\n" +
      "Get a free key at: https://access-ai.solutions → Settings → API Keys"
    );
  }

  const { before_scan_id, after_scan_id } = args;

  if (!before_scan_id || !after_scan_id) {
    return "Error: both before_scan_id and after_scan_id are required.";
  }
  if (before_scan_id === after_scan_id) {
    return "Error: before_scan_id and after_scan_id must be different scans.";
  }

  try {
    const [before, after] = await Promise.all([
      apiClient.getScanById(before_scan_id),
      apiClient.getScanById(after_scan_id),
    ]);

    const scoreDiff = after.scan.accessibility_score - before.scan.accessibility_score;
    const scoreArrow = scoreDiff > 0 ? "⬆️" : scoreDiff < 0 ? "⬇️" : "➡️";
    const scoreTrend = scoreDiff > 0 ? `+${scoreDiff}` : String(scoreDiff);

    // Find fixed issues (in before but not in after by issue_type+severity)
    const afterIssueKeys = new Set(
      after.issues.map((i) => `${i.issue_type}:${i.severity}`)
    );
    const beforeIssueKeys = new Set(
      before.issues.map((i) => `${i.issue_type}:${i.severity}`)
    );

    const fixedTypes = [...beforeIssueKeys].filter((k) => !afterIssueKeys.has(k));
    const newTypes = [...afterIssueKeys].filter((k) => !beforeIssueKeys.has(k));

    const issuesDiff = after.issues.length - before.issues.length;

    let output = `# Accessibility Comparison\n\n`;
    output += `| | Before | After | Change |\n`;
    output += `|---|---|---|---|\n`;
    output += `| **Score** | ${before.scan.accessibility_score}/100 | ${after.scan.accessibility_score}/100 | ${scoreArrow} ${scoreTrend} |\n`;
    output += `| **Issues** | ${before.issues.length} | ${after.issues.length} | ${issuesDiff <= 0 ? issuesDiff : `+${issuesDiff}`} |\n`;
    output += `| **URL** | ${before.scan.url} | ${after.scan.url} | |\n`;
    output += `| **Date** | ${new Date(before.scan.scan_date).toLocaleDateString()} | ${new Date(after.scan.scan_date).toLocaleDateString()} | |\n\n`;

    if (scoreDiff > 0) {
      output += `## ✅ Improvement: +${scoreDiff} points\n\n`;
    } else if (scoreDiff < 0) {
      output += `## ⚠️ Regression: ${scoreDiff} points\n\n`;
    } else {
      output += `## ➡️ No score change\n\n`;
    }

    if (fixedTypes.length > 0) {
      output += `## Fixed Issue Types (${fixedTypes.length})\n\n`;
      fixedTypes.forEach((k) => {
        const [type] = k.split(":");
        output += `- ✅ ${type}\n`;
      });
      output += `\n`;
    }

    if (newTypes.length > 0) {
      output += `## ⚠️ New Issue Types (${newTypes.length})\n\n`;
      newTypes.forEach((k) => {
        const [type] = k.split(":");
        output += `- 🔴 ${type}\n`;
      });
      output += `\n`;
    }

    if (after.issues.length > 0) {
      output += `## Remaining Issues (${after.issues.length})\n\n`;
      const bySeverity: Record<string, typeof after.issues> = {};
      for (const issue of after.issues) {
        if (!bySeverity[issue.severity]) bySeverity[issue.severity] = [];
        bySeverity[issue.severity].push(issue);
      }
      for (const sev of ["critical", "serious", "moderate", "minor"]) {
        const group = bySeverity[sev];
        if (!group?.length) continue;
        output += `- **${sev.toUpperCase()}:** ${group.length} issue(s)\n`;
      }
    } else {
      output += `## 🎉 All Issues Resolved!\n\nThe after scan has zero accessibility violations.`;
    }

    output += `\n\n---\n*Before: \`${before_scan_id}\` | After: \`${after_scan_id}\`*`;

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error comparing scans: ${message}`;
  }
}
