/**
 * fix_code tool — Scan HTML code for accessibility issues and return the fixed version.
 * Works in BOTH guest mode and authenticated mode.
 * Results are saved to scan history only when an API key is provided.
 */

import type { ApiClient } from "../api-client.js";

export const FIX_CODE_TOOL = {
  name: "fix_code",
  description:
    "Scan raw HTML code for WCAG accessibility issues and automatically return the fixed version with all issues resolved. This combines scanning and fixing in a single step — ideal for AI agents that want to write accessible code from the start. Works without an API key (guest mode), but results are only saved to history when authenticated.",
  inputSchema: {
    type: "object" as const,
    properties: {
      html: {
        type: "string",
        description: "The raw HTML code to scan and fix for accessibility issues.",
      },
      title: {
        type: "string",
        description: "Optional label for this scan (e.g. 'LoginForm', 'NavBar component').",
      },
    },
    required: ["html"],
  },
};

export async function handleFixCode(
  apiClient: ApiClient,
  args: { html: string; title?: string }
): Promise<string> {
  const { html, title } = args;
  const isGuest = apiClient.isGuestMode();

  if (!html || html.trim().length === 0) {
    return "Error: html is required.";
  }
  if (html.length > 500_000) {
    return "Error: HTML too large (max 500KB).";
  }

  try {
    const result = await apiClient.fixCode(html, title);

    if (result.issueCount === 0) {
      let output = `## ✅ No Issues Found — Code is Already Accessible!\n\n`;
      output += `**Score:** ${result.score}/100\n`;
      output += `Your code passes all WCAG 2.1 AA checks. No fixes needed.\n`;
      if (isGuest) {
        output += `\n> 💡 **Guest mode** — Add an API key to save this result to your history.\n`;
        output += `> Get a free key at https://access-ai.solutions → Settings → API Keys`;
      } else {
        output += `\n**Scan ID:** \`${result.scanId}\``;
      }
      return output;
    }

    let output = `## ♿ Accessibility Fix Complete\n\n`;
    output += `**Original score:** ${result.score}/100\n`;
    output += `**Issues fixed:** ${result.issueCount}\n`;

    if (result.saved) {
      output += `**Scan ID:** \`${result.scanId}\`\n`;
    }

    output += `\n## Fixed Code\n\n\`\`\`html\n${result.fixedHtml}\n\`\`\`\n`;

    if (isGuest) {
      output += `\n---\n> 💡 **Guest mode** — Results not saved. Add an API key to save history and use \`compare_scans\` to track improvement.\n`;
      output += `> Get a free key at https://access-ai.solutions → Settings → API Keys`;
    } else {
      output += `\n---\n*Use \`compare_scans\` or \`chat_about_scan\` with scan ID \`${result.scanId}\` for more details.*`;
    }

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error fixing code: ${message}`;
  }
}
