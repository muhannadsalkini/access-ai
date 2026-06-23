# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

AccessAI is a web accessibility platform that combines automated WCAG scanning (axe-core via Playwright) with AI-powered analysis (Gemini 2.5 Flash). It ships as a web app, a browser extension, and an MCP server for IDE agents.

## Development Commands

### Full Stack (Docker)
```bash
docker compose up --build
```

### Backend (Express.js + TypeScript) — port 3001
```bash
cd backend
npm install
npm run dev       # ts-node-dev with hot reload
npm run build     # tsc → dist/
npm run lint      # eslint src/
```

### Agent (Python FastAPI) — port 8000
```bash
cd agent
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (Next.js 16 + React 19) — port 3000
```bash
cd frontend
npm install
npm run dev
npm run build
npm run lint
```

### Browser Extension (React 18 + Vite + Chrome MV3)
```bash
cd extension
npm install
npm run build       # production build → dist/
npm run dev         # watch mode
```
Load the `dist/` folder via `chrome://extensions → Load unpacked`.

### MCP Server (TypeScript)
```bash
cd mcp-server
npm install
npm run build       # tsc → dist/
npm run dev         # tsc --watch
```

## Architecture

```
Browser / IDE Agent
       ↓ HTTPS / stdio (MCP)
  Frontend (Next.js)  ←→  Backend (Express)  ←→  Agent (FastAPI + Gemini)
                                  ↕
                           Supabase (PostgreSQL)
```

### Request Flow for a Scan

1. **Frontend** calls `POST /api/scans` (or via SSE stream `POST /api/scans/stream`) with a URL or HTML.
2. **Backend** (`backend/src/modules/scan/scan.service.ts`) runs axe-core via Playwright (`backend/src/services/accessibility/axe-scanner.ts`), then calls the agent.
3. **Agent** (`agent/app/agent/accessibility_agent.py`) calls Gemini 2.5 Flash to classify severity, generate descriptions, recommendations, and an accessibility score. The streaming path emits NDJSON line by line.
4. Backend persists the result to Supabase (`scans`, `issues`, `reports` tables) and returns to the frontend.

For guest/unauthenticated scans, the same pipeline runs but nothing is written to the database.

### Component Breakdown

| Directory | Role |
|-----------|------|
| `backend/src/modules/` | Modular Express routes: `auth`, `api-keys`, `scan`, `report`, `chat` (each has `.routes`, `.controller`, `.service`, `.types`) |
| `backend/src/services/accessibility/` | axe-core scanner (Playwright), URL validator (DNS rebinding guard), sitemap parser |
| `backend/src/services/agent/` | HTTP client that calls the Python agent; supports both batch and streaming modes |
| `agent/app/agent/` | Gemini integration — `accessibility_agent.py` contains all LLM calls; `prompts.py` has all system instructions and prompt templates |
| `agent/app/tools/` | Individual ADK-style tool functions (fetch page, axe scan, classify severity, generate report, save to DB) |
| `frontend/src/features/` | Feature-based architecture: `auth`, `scan`, `history`, `chat`, `api-keys` — each has `components/` and `services/` |
| `frontend/src/shared/` | Shared components (`Navbar`, `MarkdownRenderer`, `ScoreBadge`), Supabase client helpers, API utility |
| `extension/src/popup/` | Chrome extension popup — screen-based navigation: `ScanScreen`, `ProgressScreen`, `ReportScreen`, `LoginScreen` |
| `mcp-server/src/` | MCP server tools exposed to IDE agents; `api-client.ts` wraps all backend API calls |
| `supabase/migrations/` | SQL migrations applied in numeric order to the Supabase project |

### Authentication

The backend `requireAuth` middleware (`backend/src/modules/auth/auth.middleware.ts`) accepts two token types:
- **Supabase JWTs** (`Bearer eyJ...`) — verified via `supabase.auth.getUser()`
- **AccessAI API keys** (`Bearer ak_live_...`) — HMAC-hashed with `API_KEY_SECRET` before DB lookup

Scan endpoints that support guest mode use `optionalAuth` instead of `requireAuth`.

### Inter-Service Security

Backend → Agent calls include an `X-Internal-Secret` header (env: `AGENT_INTERNAL_SECRET` on the backend, `INTERNAL_SECRET` on the agent). All agent endpoints except `/health` reject requests without this secret.

### Streaming

Scans can be triggered as Server-Sent Events (SSE). The backend `createScanStream` async generator yields typed events (`status`, `scan`, `progress`, `violations_found`, `summary`, `issue`, `done`, `error`). The agent streams NDJSON line-by-line (one `summary` record then one `issue` record per violation) via a background thread bridging the sync Gemini SDK to the async FastAPI event loop.

## Environment Variables

Copy `.env.example` to `.env` at the repo root. Key variables:

| Variable | Used by |
|----------|---------|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Backend (admin DB access) |
| `SUPABASE_ANON_KEY` | Backend (JWT verification) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend |
| `GOOGLE_API_KEY` | Agent (Gemini) |
| `AGENT_SERVICE_URL` | Backend → Agent URL |
| `BACKEND_SERVICE_URL` | Agent → Backend URL |
| `API_KEY_SECRET` | Backend (HMAC for API key hashing — **required in production**) |
| `AGENT_INTERNAL_SECRET` / `INTERNAL_SECRET` | Backend ↔ Agent shared secret — **required in production** |
| `EXTENSION_ORIGIN` | Backend CORS allowlist for the Chrome extension |
| `NEXT_PUBLIC_BACKEND_URL` | Frontend → Backend URL |

## Database Schema

Tables: `scans`, `issues`, `reports`, `chat_messages`, `api_keys`. All tables use Supabase RLS — the backend uses the `service_role` key to bypass RLS for writes; the frontend uses the `anon` key with RLS for reads. Migrations are in `supabase/migrations/` and must be applied in order.

## Frontend Notes

The frontend uses **Next.js 16 with React 19** — this version has breaking changes from earlier Next.js. The `frontend/AGENTS.md` note applies: read `node_modules/next/dist/docs/` before writing Next.js-specific code; do not assume APIs match training data.

The frontend `src/proxy.ts` re-exports Supabase's middleware helper for the Next.js middleware layer.
