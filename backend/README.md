# Backend (`backend/`)

Express.js + TypeScript API. Port **3001**.

## Purpose

The backend is the orchestration layer of AccessAI. It runs axe-core scans via Playwright, calls the Python agent for AI analysis, persists results to Supabase, authenticates users (Supabase JWTs and API keys), and exposes the REST/SSE API consumed by the frontend, browser extension, and MCP server.

## Boundaries

- It does **not** call Gemini or do any LLM work directly — all AI reasoning is delegated to the agent service (`agent/`) over HTTP.
- It does **not** render UI; it returns JSON or Server-Sent Events only.
- It does **not** hold user sessions — Supabase issues and verifies JWTs; the backend only verifies tokens per request.
- Guest (unauthenticated) scans run the full pipeline but write nothing to the database — persistence belongs only to authenticated paths.

## Public surface

Entry points: `src/server.ts` (bootstrap + graceful shutdown), `src/app.ts` (Express app, middleware, route mounting).

### HTTP endpoints

| Method + Path | Auth | Handler | Description |
|---|---|---|---|
| `GET /health` | none | `app.ts` | Liveness check |
| `POST /api/auth/login` | none (rate-limited) | `auth.controller.login` | Email/password login → Supabase JWT |
| `POST /api/api-keys` | JWT | `api-keys.controller.create` | Create an API key (returns raw key once) |
| `GET /api/api-keys` | JWT | `api-keys.controller.list` | List key metadata (no raw values) |
| `DELETE /api/api-keys/:id` | JWT | `api-keys.controller.remove` | Delete a key |
| `POST /api/scans` | optional | `scan.controller.createScan` | Scan a URL/sitemap (blocking) |
| `POST /api/scans/stream` | optional | `scan.controller.createScanStream` | Scan a URL/sitemap (SSE progressive) |
| `POST /api/scans/code` | optional | `scan.controller.createCodeScan` | Scan raw HTML |
| `POST /api/scans/fix` | optional | `scan.controller.fixCode` | Scan HTML + return AI-fixed HTML |
| `GET /api/scans` | JWT/key | `scan.controller.getScans` | User's scan history |
| `GET /api/scans/:id` | JWT/key | `scan.controller.getScanById` | Scan + issues + report |
| `DELETE /api/scans/:id` | JWT/key | `scan.controller.deleteScan` | Delete scan + related rows |
| `GET /api/scans/:scanId/chat` | JWT/key | `chat.controller.getMessages` | Chat history for a scan |
| `POST /api/scans/:scanId/chat` | JWT/key (rate-limited) | `chat.controller.sendMessage` | Chat about a scan |
| `POST /api/scans/:scanId/chat/stream` | JWT/key | `chat.controller.sendMessageStream` | Chat about a scan (SSE) |
| `DELETE /api/scans/:scanId/chat` | JWT/key | `chat.controller.clearMessages` | Clear chat history |
| `GET /api/reports/:scanId` | JWT/key | `report.controller.getReport` | Report + issues for a scan |

### Key exported service functions

- `scan.service.createScan(userId, url)` — full blocking scan pipeline (persists).
- `scan.service.createScanStream(userId|null, url)` — async generator yielding `ScanStreamEvent`s.
- `scan.service.createGuestScan(url)` / `createGuestCodeScan(html, title?)` — pipeline without DB writes.
- `scan.service.createCodeScan(userId, html, title?)` / `fixCode(html, userId?, title?)` — HTML scanning/fixing.
- `scan.service.getScansByUser`, `getScanById`, `deleteScan`.
- `services/accessibility/axe-scanner.ts`: `runAxeScan(url)`, `runAxeScanOnCode(html)`, `trimViolationForAgent(v)`, `computeDeterministicScore(violations)`, `closeBrowser()`.
- `services/accessibility/url-validator.ts`: `validateUrl(url)`, `isPrivateIP(ip)` (SSRF guards).
- `services/accessibility/sitemap-parser.ts`: `isSitemapUrl(url)`, `parseSitemap(url)`.
- `services/agent/agent-client.ts`: `callAgent`, `callAgentAnalyzeStream`, `callAgentChat`.
- `modules/auth/auth.middleware.ts`: `requireAuth`, `optionalAuth`.
- `modules/api-keys/api-keys.service.ts`: `createApiKey`, `getApiKeys`, `deleteApiKey`, `verifyApiKey`.

## Dependencies

- **Internal (this repo):** calls the **agent** service over HTTP (`services/agent/agent-client.ts`). Consumed by **frontend**, **extension**, and **mcp-server** over HTTP.
- **Data:** Supabase (PostgreSQL) via `@supabase/supabase-js`. Uses the `service_role` key (`supabaseAdmin`) for all writes, bypassing RLS.
- **External:** `playwright` + `@axe-core/playwright` for scanning; `express`, `helmet`, `cors`, `express-rate-limit`, `zod`, `winston`, `uuid`.
- **Layer-crossing flags:** the backend deliberately holds the `service_role` key and bypasses RLS — this MUST never be exposed to the frontend/extension. The `runAxeScanOnCode` helper is also reachable via `POST /api/scans/code`; there is no separate internal-only axe endpoint even though `agent/app/tools/axe_scan.py` references `/api/internal/axe-scan` (see Gotchas).

## Key flows

### 1. Blocking URL scan (`POST /api/scans`, authenticated)
1. `scan.controller.createScan` validates the body with `createScanSchema` (zod).
2. `scan.service.createScan` calls `validateUrl` (SSRF guard), detects sitemap via `isSitemapUrl`.
3. Inserts a `scans` row (`status: "scanning"`), runs `runAxeScan` (or `scanPagesInParallel` for sitemaps, concurrency 3).
4. Trims violations (`trimViolationForAgent`) and calls `callAgent` → agent `/agent/analyze`.
5. Writes `reports`, `issues`, and updates the `scans` row (`status: "completed"`, score) in parallel; returns `ScanResponse`. On error, marks the scan `failed`.

### 2. Streaming scan (`POST /api/scans/stream`)
1. Controller sets SSE headers + 15s heartbeat and iterates `scan.service.createScanStream`.
2. Generator emits `status`/`scan` early, runs axe, emits `violations_found` with a **deterministic** score (`computeDeterministicScore`) — no LLM needed for the number.
3. If violations exist, it streams `callAgentAnalyzeStream` (NDJSON from the agent), yielding one `summary` then one `issue` per violation, then persists (unless guest) and yields `done`.

### 3. API-key authentication
1. `requireAuth` reads the `Bearer` token. If it starts with `ak_live_`, `verifyApiKey` HMAC-hashes it and looks it up in `api_keys`, updating `last_used_at` fire-and-forget.
2. Otherwise it verifies the token as a Supabase JWT via `supabase.auth.getUser()`. `optionalAuth` falls through to guest (`userId = null`) when no token is present.

## Rules and constraints

- **All URL inputs must pass `validateUrl` before any fetch/navigation.** Reason: SSRF protection — blocks localhost, private/link-local IPs (incl. AWS metadata `169.254.169.254`), and re-resolves DNS at request time in the Playwright route handler to defeat DNS rebinding.
- **All user data queries must be org/owner-scoped by `user_id`.** Reason: the backend uses the `service_role` key which bypasses RLS, so ownership must be enforced in code (see `getScanById`, `assertScanOwnership`, `deleteScan`).
- **Sanitize/trim violations before sending to the agent (`trimViolationForAgent`).** Reason: keeps Gemini prompts small (max 5 elements, 500-char HTML) to reduce latency and cost.
- **Never return the raw API key except once at creation.** Reason: keys are stored only as HMAC-SHA256 hashes (`api-keys.service.hashKey`); the DB cannot reconstruct them.
- **Backend→agent calls must include `X-Internal-Secret` when `AGENT_INTERNAL_SECRET` is set.** Reason: the agent rejects unauthenticated internal calls in production.
- **Fatal-fail on missing required env at boot (`validateEnv`).** Reason: better to crash than silently serve broken/insecure responses.

## Gotchas

- **Score source differs by path.** Blocking scans use the agent's `accessibility_score`; the streaming path uses the local `computeDeterministicScore`. They use the same weight formula (`100 − critical×15 − serious×10 − moderate×5 − minor×2`) but can diverge if the LLM overrides it.
- **`agent/app/tools/*.py` call `/api/internal/fetch-html` and `/api/internal/axe-scan`, which are not mounted in `app.ts`.** Those ADK tools appear unused by the current pipeline (the backend drives axe itself). TODO: verify whether these internal routes exist elsewhere or are dead code.
- **Single shared Chromium instance** (`getBrowser`) is reused across scans; sitemap parallelism is capped at 3 to avoid OOM on small Render instances.
- **Guest mode is implicit:** `optionalAuth` sets `req.userId = null as any`; downstream code branches on falsy `userId`. Read endpoints use `requireAuth` and will 401 for guests.
- **CORS in production locks to `EXTENSION_ORIGIN`;** in development any `chrome-extension://` origin is allowed. A blocked origin returns `false` (no CORS headers) rather than throwing.
- **Agent retry backoff is long** (`15s/20s/25s`) to tolerate Render free-tier cold starts; a first scan after idle can take up to ~60s before the agent responds.

## Source files read to write this
`src/server.ts`, `src/app.ts`, `src/config/env.ts`, `package.json`, `src/middleware/{cors,rate-limiter,error-handler}.ts`, `src/services/supabase/client.ts`, `src/services/accessibility/{axe-scanner,url-validator,sitemap-parser}.ts`, `src/services/agent/agent-client.ts`, `src/modules/scan/{scan.service,scan.controller,scan.routes,scan.validator,scan.types}.ts`, `src/modules/auth/{auth.middleware,auth.service,auth.routes,auth.controller}.ts`, `src/modules/api-keys/{api-keys.service,api-keys.routes}.ts`, `src/modules/chat/chat.service.ts`, `src/modules/report/{report.service,report.routes}.ts`.
