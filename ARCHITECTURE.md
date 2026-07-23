# AccessAI — Architecture

AI-powered web accessibility scanner. Users scan a URL (or sitemap, or raw HTML); the system runs axe-core in a headless browser, sends the violations to Google Gemini for analysis, and returns a scored, prioritized, human-readable report. Access is via a web dashboard, a Chrome extension, and an MCP server for IDE agents.

> Per-module details live in each directory's `README.md`. This document covers the system as a whole.

## Module map

```
                 ┌────────────┐   ┌──────────────┐   ┌───────────────┐
   users ───────▶│  frontend  │   │  extension   │   │  mcp-server   │  (IDE agents)
   (web)         │ Next.js 16 │   │  Chrome MV3  │   │  stdio / npm  │
                 └─────┬──────┘   └──────┬───────┘   └──────┬────────┘
                       │  HTTPS (JWT)    │ HTTPS (JWT)       │ HTTPS (API key / guest)
                       └────────────┬────┴───────────────────┘
                                    ▼
                            ┌───────────────┐        internal HTTP        ┌──────────────┐
                            │    backend    │ ─────────────────────────▶ │    agent     │
                            │ Express + TS  │  X-Internal-Secret          │ FastAPI +    │
                            │ Playwright/axe│ ◀───────────────────────── │ Gemini 2.5   │
                            └──────┬────────┘   analysis / NDJSON / SSE    └──────────────┘
                                   │ service_role
                                   ▼
                            ┌───────────────┐
                            │   Supabase    │  Postgres + Auth + RLS
                            └───────────────┘
```

Layers (top → bottom):
1. **Clients** — `frontend/`, `extension/`, `mcp-server/`. Presentation/integration only; no scanning or AI.
2. **Orchestration** — `backend/`. The only module that runs Playwright/axe, holds the Supabase `service_role` key, and calls the agent.
3. **AI** — `agent/`. Stateless Gemini wrapper; reachable only by the backend.
4. **Data/Identity** — `supabase/`. Postgres schema, RLS, and Supabase Auth.

Ports (local, via `docker-compose.yml`): frontend `3000`, backend `3001`, agent `8000`.

## Request lifecycles

### Streaming URL scan (primary web path)
1. `frontend` `streamScan()` → `POST /api/scans/stream` (SSE) with the user's JWT.
2. `backend` `optionalAuth` resolves user (or guest), inserts a `scans` row (`scanning`), validates the URL (`validateUrl`, SSRF guard).
3. Playwright + axe-core produce violations; backend computes a **deterministic** score and emits `violations_found`.
4. Backend streams trimmed violations to `agent` `POST /agent/analyze/stream` (NDJSON, `X-Internal-Secret`).
5. Backend relays `summary` then per-violation `issue` events to the client, persists `reports`/`issues`, marks the scan `completed`, emits `done`. Guests skip all DB writes.

### Blocking scan (extension / MCP)
`POST /api/scans` runs the same pipeline synchronously and returns `{ scan, issues, report }`. The extension and MCP `scan_url` use this. Sitemaps fan out (concurrency 3); HTML scans use `/api/scans/code`; `/api/scans/fix` also returns AI-fixed HTML.

### Chat about a scan
`POST /api/scans/:id/chat[/stream]` → backend loads scan/report/issues + history from Supabase → `agent /agent/chat[/stream]` → response persisted to `chat_messages`.

### Auth lifecycle
Supabase Auth issues JWTs. Web/extension send JWTs; MCP/SDK send `ak_live_…` API keys. `backend` verifies per request (`requireAuth`/`optionalAuth`): API keys are HMAC-hashed and looked up in `api_keys`; otherwise the token is validated as a Supabase JWT.

## Data flow

- **Write path:** only `backend` writes, always via the Supabase `service_role` client (bypasses RLS). Tables: `scans` → `issues`, `reports`, `chat_messages` (all `ON DELETE CASCADE`).
- **Read path:** `frontend`/`extension` read either through the backend (JWT/key) or directly from Supabase with the anon key + user JWT, gated by RLS SELECT policies (`auth.uid()`).
- **Score:** `100 − critical×15 − serious×10 − moderate×5 − minor×2`, clamped to 0–100. Computed deterministically in the backend for streaming; taken from the agent for blocking scans.
- **AI boundary:** raw HTML/violations flow backend → agent; only structured analysis (summary, issues, score) flows back. Violations are trimmed (max 5 elements, 500-char HTML) before leaving the backend.

## Cross-cutting rules

### Tenancy
- **All persisted rows are scoped to `user_id`; every read must filter by the owner.** The backend bypasses RLS (service_role), so ownership is enforced in code (`assertScanOwnership`, owner-scoped queries) *and* by RLS SELECT policies for direct client reads. Reason: multi-tenant isolation with two access paths.
- **Guest scans never persist.** Reason: no owner to attribute rows to; keeps the DB clean and avoids leaking anonymous data.

### Security / layering
- **Only the backend runs browsers, holds the `service_role` key, and calls the agent.** Clients never touch Playwright, service-role keys, or the agent directly. Reason: keeps privileged capability in one auditable layer.
- **All scan targets pass SSRF validation (`validateUrl`) with request-time DNS re-resolution.** Reason: blocks access to localhost, private/link-local ranges, and cloud metadata endpoints.
- **The agent is reachable only with `X-Internal-Secret`.** Reason: prevents third parties from burning Gemini quota.
- **All user-controlled text is sanitized before entering an LLM prompt.** Reason: prompt-injection defense.
- **Clients ship only anon/public keys.** Reason: privileged secrets must never reach a browser bundle.

### Error handling
- **Backend:** central `error-handler` middleware returns a uniform `{ success: false, error }` envelope; successes are `{ success: true, data }`. Scan failures flip the `scans` row to `failed` rather than throwing away the record.
- **Cold-start resilience:** the frontend `api()` helper retries 502/503/504 (4× / 15s); backend→agent calls retry with `15/20/25s` backoff; MCP uses long (300–600s) timeouts. Reason: Render free-tier services cold-start.
- **Streaming:** SSE/NDJSON consumers drop malformed frames silently and rely on a terminal `done`/`error` event; heartbeats keep connections alive.

## System-wide gotchas

- **Score can diverge** between the blocking (agent-provided) and streaming (backend-computed) paths despite the shared formula.
- **Duplicated types:** backend response/record shapes are re-declared in `frontend/src/shared/types`, `mcp-server/src/api-client.ts`, and `extension/src/types` — kept in sync by hand.
- **Dead-ish agent tooling:** `agent/app/tools/*` (ADK) and `services/supabase_client.py` are not used by the live pipeline and reference backend `/api/internal/*` routes that aren't mounted. TODO: verify intent.
- **Migrations are manual and forward-only** (`supabase/migrations`), applied in numeric order in the Supabase SQL editor.
- **Env split in the frontend:** `NEXT_PUBLIC_BACKEND_URL` (non-stream) vs `NEXT_PUBLIC_API_URL` (stream) must point to the same backend.

## Source files read to write this
`docker-compose.yml`, `.env.example`, `CLAUDE.md`; plus the per-module source surveyed for each `README.md` (backend `scan.service`/`scan.controller`/`auth.middleware`/`axe-scanner`/`url-validator`/`agent-client`; agent `main.py`/`accessibility_agent.py`/`routes/scan.py`; frontend `scan.ts`/`api.ts`/`middleware.ts`; mcp-server `index.ts`/`api-client.ts`; extension `App.tsx`/`api.ts`/`supabase.ts`; supabase migrations `001`–`007`).
