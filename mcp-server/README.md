# MCP Server (`mcp-server/`)

TypeScript MCP (Model Context Protocol) server over **stdio**. Published to npm as `accessai-mcp`.

> This file documents the module's architecture. End-user install/config docs (IDE setup, SDK examples) live in the root `README.md`.

## Purpose

Exposes AccessAI's accessibility scanning and analysis as MCP tools/resources for IDE agents (Cursor, Cline, Claude Code, Windsurf). It is a thin client: every tool call is translated into an HTTP request to the AccessAI backend. It also ships a reusable API client library (`accessai-mcp/client`).

## Boundaries

- It does **not** run axe-core, Playwright, or Gemini — all work happens in the backend/agent.
- It does **not** store data or manage sessions; the only credential is an optional `ACCESSAI_API_KEY` passed as a Bearer token.
- It does **not** talk to Supabase directly.
- Guest mode (no key) is supported only for `scan_url`, `scan_code`, `fix_code`; history/report/chat/compare/delete require a key and short-circuit with a "key required" message otherwise.

## Public surface

Entry point: `src/index.ts` (bootstraps `McpServer`, registers tools/resources, connects `StdioServerTransport`).

### Tools

| Tool | Handler | Backend call |
|---|---|---|
| `scan_url` | `tools/scan-url.ts` | `POST /api/scans` |
| `scan_code` | `tools/scan-code.ts` | `POST /api/scans/code` |
| `fix_code` | `tools/fix-code.ts` | `POST /api/scans/fix` |
| `get_scan_history` | `tools/get-scan-history.ts` | `GET /api/scans` |
| `get_scan_report` | `tools/get-scan-report.ts` | `GET /api/scans/:id` |
| `chat_about_scan` | `tools/chat-about-scan.ts` | `POST /api/scans/:id/chat` |
| `compare_scans` | `tools/compare-scans.ts` | two `GET /api/scans/:id` |
| `delete_scan` | `tools/delete-scan.ts` | `DELETE /api/scans/:id` |

### Resources

- `accessai://scans/latest` — `resources/latest-scan.ts` — latest scan report surfaced as agent context.

### Library exports (`src/client.ts`, entry `accessai-mcp/client`)

- `createAccessAIClient({ apiKey, backendUrl? })` → `ApiClient`.
- `ApiClient` methods: `createScan`, `createCodeScan`, `fixCode`, `getScans`, `getScanById`, `getReport`, `sendChatMessage`, `getChatMessages`, `deleteScan`, `isGuestMode`.
- `AuthManager` — turns the config's API key into a Bearer token (empty string ⇒ guest).
- Re-exported types: `ScanRecord`, `IssueRecord`, `ReportRecord`, `ScanResponse`, `ReportWithIssues`, `ChatMessage`, `SendChatResponse`.

## Dependencies

- **Internal (this repo):** depends on the **backend** HTTP API only. Nothing in this repo depends on it (it's a distributed npm package / IDE integration).
- **External:** `@modelcontextprotocol/sdk`, `zod`.
- **Config (`src/config.ts`):** `ACCESSAI_API_KEY` (optional), `ACCESSAI_BACKEND_URL` (defaults to `https://access-ai-backend.onrender.com`).
- **Layer note:** the client mirrors the backend's response envelope (`{ success, data }`) and record types — these are duplicated, not shared, so they must be kept in sync manually with `backend/src/modules/scan/scan.types.ts`.

## Key flows

### 1. `scan_url` (guest or authenticated)
1. `handleScanUrl` checks `apiClient.isGuestMode()`, calls `createScan(url)`.
2. `ApiClient.request` attaches `Authorization: Bearer <key>` if present, POSTs to `/api/scans` (600s timeout), unwraps `{ success, data }`.
3. Result is formatted as Markdown grouped by severity; guest results append a "not saved" notice with a link to get a key.

### 2. Key-gated tool (e.g. `get_scan_history`)
1. Handler returns `GUEST_MODE_MSG` immediately if `isGuestMode()`.
2. Otherwise calls `getScans()` and renders a Markdown table with score emojis and scan IDs.

### 3. Bootstrap
1. `loadConfig()` reads env, strips trailing slashes from the backend URL.
2. `AuthManager` + `ApiClient` are constructed, tools/resources registered on `McpServer`, then `server.connect(new StdioServerTransport())`.

## Rules and constraints

- **Every tool handler must catch errors and return a human-readable string, never throw.** Reason: MCP tool results are surfaced to the agent as text; an uncaught throw degrades the agent UX.
- **Key-requiring tools must short-circuit in guest mode before any HTTP call.** Reason: avoids a confusing backend 401 and tells the user exactly how to get a key.
- **The API key is only ever sent as a Bearer header to the configured backend.** Reason: it's a live credential; it must not be logged or sent elsewhere.
- **Response types must match the backend envelope `{ success, data }`.** Reason: `request()` throws if `success` is false or the shape is unexpected.
- **stdout is reserved for the MCP protocol; diagnostics go to stderr.** Reason: `index.ts` writes fatal errors to `process.stderr` so they don't corrupt the stdio transport.

## Gotchas

- **Long timeouts:** `createScan` uses a 600s timeout, code/fix use 300s — tuned for Render cold starts + full scans; agents may appear to "hang" for a minute on the first call.
- **Type drift risk:** `api-client.ts` re-declares backend types; a backend schema change won't be caught by the compiler here.
- **Version numbers are hardcoded** in `index.ts` (`version: "1.3.1"`) and the header comment (mentions v1.3.0 tools) — keep them aligned with `package.json`. TODO: verify current published version.
- **Default backend URL is the production Render host**, so `npx accessai-mcp` with no env talks to production immediately.

## Source files read to write this
`src/index.ts`, `src/api-client.ts`, `src/config.ts`, `src/auth.ts`, `src/client.ts`, `src/tools/scan-url.ts`, `src/tools/get-scan-history.ts`.
