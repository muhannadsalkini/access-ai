#!/usr/bin/env node

/**
 * AccessAI MCP Server
 *
 * Exposes AccessAI's web accessibility scanning and AI-powered analysis
 * as tools for developer agents (Cursor, Cline, Claude Code, etc.).
 *
 * Tools:
 *   - scan_url          — Scan a URL for WCAG accessibility issues
 *   - get_scan_history  — View past scan history
 *   - get_scan_report   — Get full report for a specific scan
 *   - chat_about_scan   — Ask the AI follow-up questions about a scan
 *
 * Resources:
 *   - accessai://scans/latest — Latest scan report
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { loadConfig } from "./config.js";
import { AuthManager } from "./auth.js";
import { ApiClient } from "./api-client.js";
import { handleScanUrl } from "./tools/scan-url.js";
import { handleGetScanHistory } from "./tools/get-scan-history.js";
import { handleGetScanReport } from "./tools/get-scan-report.js";
import { handleChatAboutScan } from "./tools/chat-about-scan.js";
import {
  LATEST_SCAN_RESOURCE,
  handleLatestScanResource,
} from "./resources/latest-scan.js";

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const config = loadConfig();
const auth = new AuthManager(config);
const apiClient = new ApiClient(config, auth);

// ---------------------------------------------------------------------------
// Create MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "accessai",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Register Tools
// ---------------------------------------------------------------------------

server.tool(
  "scan_url",
  "Scan a website URL for WCAG accessibility issues using axe-core and get AI-powered analysis with severity classifications, descriptions, fix recommendations, and an overall accessibility score. Also supports sitemap URLs to scan multiple pages at once. This may take 30-120 seconds depending on the website.",
  {
    url: z
      .string()
      .describe(
        "The website URL to scan for accessibility issues (e.g. https://example.com). Can also be a sitemap URL to scan multiple pages."
      ),
  },
  async ({ url }) => {
    const result = await handleScanUrl(apiClient, { url });
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "get_scan_history",
  "Retrieve your past accessibility scan history. Returns a list of scans with their URLs, dates, accessibility scores, and statuses. Use this to find scan IDs for viewing detailed reports or chatting about results.",
  {
    limit: z
      .number()
      .optional()
      .describe(
        "Maximum number of scans to return (default: 10). The most recent scans are returned first."
      ),
  },
  async ({ limit }) => {
    const result = await handleGetScanHistory(apiClient, { limit });
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "get_scan_report",
  "Get the full detailed accessibility report for a specific scan, including all issues with their severity, descriptions, fix recommendations, and WCAG references. Use `get_scan_history` first to find a scan ID.",
  {
    scan_id: z
      .string()
      .describe("The UUID of the scan to get the report for."),
  },
  async ({ scan_id }) => {
    const result = await handleGetScanReport(apiClient, { scan_id });
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "chat_about_scan",
  'Ask the AI assistant follow-up questions about a specific accessibility scan. For example: "How do I fix the color contrast issues?", "Show me code examples for adding ARIA labels", or "Which issues should I fix first?". Requires a scan ID from a previous scan.',
  {
    scan_id: z
      .string()
      .describe(
        "The UUID of the scan to discuss. Use `get_scan_history` to find scan IDs."
      ),
    message: z
      .string()
      .describe(
        'Your question or message about the accessibility scan results (e.g. "How do I fix the missing alt text issues?").'
      ),
  },
  async ({ scan_id, message }) => {
    const result = await handleChatAboutScan(apiClient, { scan_id, message });
    return { content: [{ type: "text", text: result }] };
  }
);

// ---------------------------------------------------------------------------
// Register Resources
// ---------------------------------------------------------------------------

server.resource(
  "latest-scan",
  LATEST_SCAN_RESOURCE.uri,
  {
    description: LATEST_SCAN_RESOURCE.description,
    mimeType: LATEST_SCAN_RESOURCE.mimeType,
  },
  async (uri) => {
    const content = await handleLatestScanResource(apiClient);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: content,
        },
      ],
    };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Fatal error: ${error}\n`);
  process.exit(1);
});
