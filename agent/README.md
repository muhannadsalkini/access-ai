# Agent (`agent/`)

Python FastAPI service wrapping Google Gemini 2.5 Flash. Port **8000**.

## Purpose

The agent is the AI reasoning layer. It receives axe-core violations (or chat context) from the backend and uses Gemini to classify severity, write human-readable descriptions and fix recommendations, produce a summary and priority recommendations, and compute an accessibility score. It supports both batch (JSON) and streaming (NDJSON / SSE) responses.

## Boundaries

- It does **not** run Playwright or axe-core — the backend does all browser work and passes violations in. (The `tools/axe_scan.py` / `fetch_page.py` helpers exist but are not used by the live pipeline — see Gotchas.)
- It does **not** own the database in the current architecture — the backend persists results. `tools/save_to_database.py` and `services/supabase_client.py` exist but are not wired into the request path.
- It does **not** authenticate end users — it only checks the shared `X-Internal-Secret` header proving the caller is the backend.
- It does **not** manage conversation history — the backend fetches history from the DB and passes it in each request.

## Public surface

Entry point: `app/main.py` (FastAPI app, internal-secret middleware, CORS, health). Routes mounted under `/agent` (`app/routes/scan.py`).

### HTTP endpoints

| Method + Path | Body schema | Description |
|---|---|---|
| `GET /health` | — | Liveness check (exempt from secret) |
| `POST /agent/analyze` | `AnalyzeRequest` | Batch analysis → `AnalyzeResponse` (summary, issues, score) |
| `POST /agent/analyze/stream` | `AnalyzeRequest` | Streaming NDJSON: one `summary` line then one `issue` line per violation |
| `POST /agent/chat` | `ChatRequest` | Single-shot chat answer → `ChatResponse` |
| `POST /agent/chat/stream` | `ChatRequest` | SSE token stream (`{text}` frames, then `{done, full_text}`) |

### Key functions (`app/agent/accessibility_agent.py`)

- `analyze_accessibility(request)` — batch Gemini call, JSON-mode, returns `AnalyzeResponse`.
- `analyze_accessibility_stream(request)` — async generator yielding validated NDJSON lines.
- `chat_about_scan(request)` — single-shot chat completion.
- `chat_about_scan_stream(request)` — async generator of text chunks (bridges sync SDK → async via a queue + thread).
- `_sanitize_url`, `_sanitize_text`, `_format_violations` — prompt-injection sanitization helpers.

Prompts live in `app/agent/prompts.py` (`SYSTEM_INSTRUCTION`, `ANALYSIS_PROMPT_TEMPLATE`, `STREAM_ANALYSIS_PROMPT_TEMPLATE`, `CHAT_SYSTEM_INSTRUCTION`, `CHAT_PROMPT_TEMPLATE`).

## Dependencies

- **Internal (this repo):** called only by the **backend** (`services/agent/agent-client.ts`). It does not call the backend in the live path.
- **External:** `google-genai` (Gemini 2.5 Flash), `fastapi`, `uvicorn`, `pydantic` / `pydantic-settings`, `google-adk` (declared, ADK tools unused), `supabase`/`httpx` (declared, unused in live path).
- **Config:** `app/config.py` reads `GOOGLE_API_KEY`, `SUPABASE_*`, `BACKEND_SERVICE_URL`, `INTERNAL_SECRET`, `PORT`.
- **Layer-crossing flag:** `tools/*.py` reach back into the backend (`/api/internal/*`) — this would be an agent→backend dependency, but those tools are not invoked by the current routes.

## Key flows

### 1. Batch analyze (`POST /agent/analyze`)
1. Route validates `AnalyzeRequest` (url, scan_id, violations).
2. `analyze_accessibility` sanitizes the URL, formats violations (`_format_violations`, capped at 50k chars, HTML tags/control chars stripped).
3. Calls Gemini with `response_mime_type="application/json"`, temperature 0.2, `SYSTEM_INSTRUCTION`.
4. Parses JSON (with brace-extraction fallback); clamps score to 0–100; if the LLM returns no issues but violations exist, builds fallback issues from axe data. Returns `AnalyzeResponse`.

### 2. Streaming analyze (`POST /agent/analyze/stream`)
1. Same prompt build but uses `STREAM_ANALYSIS_PROMPT_TEMPLATE`.
2. A background thread runs the synchronous `generate_content_stream`; chunks are pushed to a `queue.Queue` and pulled via `run_in_executor` to keep the event loop free.
3. Output is buffered and split on newlines; each complete line is JSON-validated (dropping code-fence artifacts / non-JSON) before being yielded. The route appends `\n` and streams as `application/x-ndjson`.

### 3. Internal-secret gate (`app/main.py` middleware)
1. Every request except `/health` passes through `verify_internal_secret`.
2. If `INTERNAL_SECRET` is unset, requests pass but a loud warning is logged. If set, a mismatched/missing `X-Internal-Secret` header yields `401`.

## Rules and constraints

- **All user-controlled text must go through `_sanitize_text` / `_sanitize_url` before entering a prompt.** Reason: prevents prompt injection via page titles, HTML snippets, selectors, and user chat messages.
- **The violations block must be length-capped (`_MAX_VIOLATIONS_TEXT_CHARS = 50_000`, per-field caps too).** Reason: avoids Gemini context-window overflow and controls latency/cost.
- **Streaming output must be one valid JSON object per line; non-JSON lines are dropped, not forwarded.** Reason: the backend parses NDJSON line-by-line and would break on partial/fenced output.
- **Scoring in the stream path is the backend's job, not the LLM's** (the stream prompt omits scoring). Reason: deterministic, instant scores without an LLM round-trip.
- **Sync Gemini streaming must run in a background thread, never inline.** Reason: the SDK stream is blocking; running it inline would stall FastAPI's event loop and prevent flushing SSE frames.
- **`INTERNAL_SECRET` must be set in production.** Reason: without it any caller can reach the agent and burn Gemini quota.

## Gotchas

- **ADK tools are effectively dead code in the live path.** `tools/axe_scan.py`, `tools/fetch_page.py`, `tools/classify_severity.py`, `tools/generate_report.py`, `tools/save_to_database.py`, and `services/supabase_client.py` are not imported by `routes/scan.py`. TODO: verify whether they're intended for a future ADK-agent path or should be removed.
- **Model string is hardcoded** to `"gemini-2.5-flash"` in `accessibility_agent.py` (the top-level README/CLAUDE.md sometimes say "2.0 Flash"). TODO: verify intended version.
- **JSON parsing has a silent fallback** producing a generic summary with score 50 if Gemini returns unparseable output — a scan can "succeed" with a placeholder report.
- **CORS `allow_origins` is derived from `BACKEND_SERVICE_URL` + localhost:3001 only**, and methods are limited to `POST`; the real gate is the internal-secret middleware, not CORS.
- **`get_settings()` is `lru_cache`d** — changing env vars requires a process restart.

## Source files read to write this
`app/main.py`, `app/config.py`, `app/routes/scan.py`, `app/agent/accessibility_agent.py`, `app/schemas/requests.py`, `app/schemas/responses.py`, `app/tools/{axe_scan,fetch_page,classify_severity,generate_report,save_to_database}.py`, `app/services/supabase_client.py`, `requirements.txt`.
