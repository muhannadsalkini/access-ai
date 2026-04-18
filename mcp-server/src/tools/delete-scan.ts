/**
 * delete_scan tool — Delete a scan and all related data from scan history.
 */

import type { ApiClient } from "../api-client.js";

export const DELETE_SCAN_TOOL = {
  name: "delete_scan",
  description:
    "Delete a scan and all its related data (issues, report, chat history) from your scan history. This action is irreversible. Requires an API key.",
  inputSchema: {
    type: "object" as const,
    properties: {
      scan_id: {
        type: "string",
        description: "The UUID of the scan to delete. Use `get_scan_history` to find scan IDs.",
      },
    },
    required: ["scan_id"],
  },
};

export async function handleDeleteScan(
  apiClient: ApiClient,
  args: { scan_id: string }
): Promise<string> {
  if (apiClient.isGuestMode()) {
    return (
      "⚠️ **API key required.**\n\n" +
      "The `delete_scan` tool requires an `ACCESSAI_API_KEY`.\n\n" +
      "Get a free key at: https://access-ai.solutions → Settings → API Keys"
    );
  }

  const { scan_id } = args;

  if (!scan_id) {
    return "Error: scan_id is required. Use `get_scan_history` to find scan IDs.";
  }

  try {
    await apiClient.deleteScan(scan_id);
    return `✅ Scan \`${scan_id}\` has been deleted successfully, including all issues, reports, and chat history.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error deleting scan ${scan_id}: ${message}`;
  }
}
