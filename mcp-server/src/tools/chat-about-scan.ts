/**
 * chat_about_scan tool — Ask the AI follow-up questions about a scan's results.
 */

import type { ApiClient } from "../api-client.js";

export const CHAT_ABOUT_SCAN_TOOL = {
  name: "chat_about_scan",
  description:
    'Ask the AI assistant follow-up questions about a specific accessibility scan. For example: "How do I fix the color contrast issues?", "Show me code examples for adding ARIA labels", or "Which issues should I fix first?". Requires a scan ID from a previous scan.',
  inputSchema: {
    type: "object" as const,
    properties: {
      scan_id: {
        type: "string",
        description:
          "The UUID of the scan to discuss. Use `get_scan_history` to find scan IDs.",
      },
      message: {
        type: "string",
        description:
          'Your question or message about the accessibility scan results (e.g. "How do I fix the missing alt text issues?").',
      },
    },
    required: ["scan_id", "message"],
  },
};

export async function handleChatAboutScan(
  apiClient: ApiClient,
  args: { scan_id: string; message: string }
): Promise<string> {
  const { scan_id, message } = args;

  if (!scan_id) {
    return "Error: scan_id is required. Use `get_scan_history` to find a scan ID.";
  }

  if (!message) {
    return "Error: message is required. What would you like to ask about the scan?";
  }

  try {
    const result = await apiClient.sendChatMessage(scan_id, message);

    let output = `## AI Response\n\n`;
    output += result.response.content;
    output += `\n\n---\n*Conversation saved. You can continue asking questions about scan \`${scan_id}\`.*`;

    return output;
  } catch (error) {
    const message_ = error instanceof Error ? error.message : String(error);
    return `Error chatting about scan ${scan_id}: ${message_}`;
  }
}
