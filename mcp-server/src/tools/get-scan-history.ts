/**
 * get_scan_history tool — Retrieve the user's past scan history.
 */

import type { ApiClient, ScanRecord } from "../api-client.js";

export const GET_SCAN_HISTORY_TOOL = {
  name: "get_scan_history",
  description:
    "Retrieve your past accessibility scan history. Returns a list of scans with their URLs, dates, accessibility scores, and statuses. Use this to find scan IDs for viewing detailed reports or chatting about results.",
  inputSchema: {
    type: "object" as const,
    properties: {
      limit: {
        type: "number",
        description:
          "Maximum number of scans to return (default: 10). The most recent scans are returned first.",
      },
    },
    required: [],
  },
};

export async function handleGetScanHistory(
  apiClient: ApiClient,
  args: { limit?: number }
): Promise<string> {
  const limit = args.limit || 10;

  try {
    const scans: ScanRecord[] = await apiClient.getScans();
    const limited = scans.slice(0, limit);

    if (limited.length === 0) {
      return "No scan history found. Use the `scan_url` tool to run your first accessibility scan!";
    }

    let output = `# Scan History (${limited.length} of ${scans.length} total)\n\n`;
    output += `| # | URL | Score | Status | Date | Scan ID |\n`;
    output += `|---|-----|-------|--------|------|---------|\n`;

    for (let i = 0; i < limited.length; i++) {
      const scan = limited[i];
      const date = new Date(scan.scan_date).toLocaleDateString();
      const scoreEmoji =
        scan.accessibility_score >= 80
          ? "🟢"
          : scan.accessibility_score >= 50
            ? "🟡"
            : "🔴";

      output += `| ${i + 1} | ${scan.url} | ${scoreEmoji} ${scan.accessibility_score}/100 | ${scan.status} | ${date} | \`${scan.id}\` |\n`;
    }

    output += `\n---\n*Use the \`get_scan_report\` tool with a scan ID to view the full report, or \`chat_about_scan\` to ask questions about results.*`;

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fetching scan history: ${message}`;
  }
}
