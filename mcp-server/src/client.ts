/**
 * AccessAI Client Library
 *
 * Use this module to interact with the AccessAI backend directly
 * from your own code — no MCP needed.
 *
 * @example
 * ```typescript
 * import { createAccessAIClient } from "accessai-mcp/client";
 *
 * const client = createAccessAIClient({
 *   apiKey: "ak_live_...",
 * });
 *
 * const scan = await client.createScan("https://example.com");
 * console.log(scan.scan.accessibility_score);
 * ```
 */

import { type Config } from "./config.js";
import { AuthManager } from "./auth.js";
import { ApiClient } from "./api-client.js";

export { AuthManager, ApiClient };
export type { Config };
export type {
  ScanRecord,
  IssueRecord,
  ReportRecord,
  ScanResponse,
  ReportWithIssues,
  ChatMessage,
  SendChatResponse,
} from "./api-client.js";

/**
 * Create a ready-to-use AccessAI API client.
 *
 * @example
 * ```typescript
 * const client = createAccessAIClient({
 *   apiKey: "ak_live_...",
 * });
 *
 * // Scan a URL
 * const result = await client.createScan("https://example.com");
 *
 * // Get scan history
 * const scans = await client.getScans();
 *
 * // Get a specific report
 * const report = await client.getScanById(scans[0].id);
 *
 * // Chat about a scan
 * const chat = await client.sendChatMessage(scans[0].id, "How do I fix the contrast issues?");
 * ```
 */
export function createAccessAIClient(options: {
  apiKey: string;
  backendUrl?: string;
}): ApiClient {
  const config: Config = {
    backendUrl: (options.backendUrl || "https://access-ai-backend.onrender.com").replace(/\/+$/, ""),
    apiKey: options.apiKey,
  };

  const auth = new AuthManager(config);
  return new ApiClient(config, auth);
}
