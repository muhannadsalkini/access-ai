# Frontend (`frontend/`)

Next.js 16 (App Router) + React 19 + Tailwind. The AccessAI web dashboard. Port **3000**.

## Purpose

The web app where users sign up/in, run accessibility scans (with live streaming progress), browse scan history, read reports, chat with the AI about a scan, and manage API keys. It is a thin presentation layer over the backend API and Supabase auth.

## Boundaries

- It does **not** run scans, axe-core, or Gemini — it calls the backend over HTTP.
- It does **not** use the Supabase `service_role` key or bypass RLS; browser/server clients use the anon key only.
- Business/analysis logic belongs in the backend/agent; the frontend only orchestrates fetches and renders results.
- It does **not** persist scan data itself — everything is fetched from the backend/Supabase.

## Public surface

Organized as feature-sliced modules under `src/features/*` with shared code in `src/shared/*`. "Surface" = routes + feature services.

### Routes (`src/app/`)
- `/` (`page.tsx`) — landing / scan entry.
- `(auth)/login`, `(auth)/signup`, `(auth)/forgot-password` — auth pages.
- `reset-password`, `auth/callback/route.ts` — password recovery + OAuth/email callback exchange.
- `(dashboard)/history`, `(dashboard)/history/[id]` — scan list + single report.
- `(dashboard)/settings` — API key management.
- `privacy` — privacy policy.
- `proxy.ts` — Next middleware entry (`updateSession`) guarding protected/auth routes.

### Feature services
- `features/scan/services/scan.ts`: `streamScan(url, { onEvent })` — SSE client for `POST /api/scans/stream`; `ScanStreamEvent` union type.
- `features/auth/services/auth.ts`: `signUp`, `signIn`, `signOut`, `getSession`, `getAccessToken`, `resetPasswordForEmail`, `updatePassword`.
- `features/history/services/history.ts`, `features/chat/services/chat.ts`, `features/api-keys/services/api-keys.ts` — history/chat/key fetch wrappers.

### Shared lib
- `shared/lib/api.ts`: `api<T>(endpoint, options)` — fetch wrapper with cold-start retry (4 retries, 15s each, on 502/503/504 or network error).
- `shared/lib/supabase/{client,server,middleware}.ts` — browser client, server client, and `updateSession` session/route guard.
- `shared/components/`: `Navbar`, `ScoreBadge`, `SeverityBadge`, `MarkdownRenderer`.

## Dependencies

- **Internal (this repo):** depends on the **backend** HTTP API and **Supabase** (auth). Nothing in the repo depends on it.
- **External:** `next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `react-markdown`, `tailwind-merge`, `clsx`, `lucide-react`.
- **Config:** `NEXT_PUBLIC_BACKEND_URL` / `NEXT_PUBLIC_API_URL` (backend base), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
- **Layer note:** all backend types are re-declared in `shared/types/index.ts` (duplicated, kept in sync manually with the backend).

## Key flows

### 1. Streaming scan (`features/scan`)
1. `URLInput` submits a URL; the scan feature calls `streamScan(url, { onEvent })`.
2. `streamScan` gets a token (`getAccessToken`), POSTs to `/api/scans/stream` with `Accept: text/event-stream`.
3. It reads the response body via a `ReadableStream` reader, splits on `\n\n`, parses `data:` lines into `ScanStreamEvent`s, and dispatches each (`status`, `scan`, `progress`, `violations_found`, `summary`, `issue`, `done`, `error`) to update `ScanProgress` / `ReportView` incrementally.

### 2. Route protection (`proxy.ts` → `updateSession`)
1. Middleware runs on all non-static paths; it builds a server Supabase client bound to the request cookies and calls `auth.getUser()`.
2. Unauthenticated hits to protected paths (`/history`) redirect to `/login?redirect=…`; authenticated hits to `/login`/`/signup`/`/forgot-password` redirect to `/`. `/reset-password` is intentionally excluded (needs the recovery session).

### 3. Auth (`features/auth`)
1. Forms call `signIn`/`signUp` (browser Supabase client), which set cookies via `@supabase/ssr`.
2. `resetPasswordForEmail` sends a recovery link to `/auth/callback?type=recovery`; `updatePassword` completes the reset.

## Rules and constraints

- **Every authenticated backend call must attach the Supabase access token** (`getAccessToken`). Reason: the backend authorizes per-request; missing tokens yield 401.
- **Use the SSR cookie-based Supabase clients server-side and the browser client client-side; never mix.** Reason: `@supabase/ssr` needs request/response cookie access for the middleware session refresh to work.
- **Only ever use the Supabase anon key in this app.** Reason: it ships to the browser; privileged keys would leak.
- **Route auth logic lives in `updateSession`, not in individual pages.** Reason: centralizes protection so a new protected page can't accidentally ship unguarded (add it to `protectedPaths`).
- **The non-streaming `api()` helper must keep its cold-start retry on 502/503/504.** Reason: the backend runs on Render free tier and cold-starts; without retries first requests fail spuriously.

## Gotchas

- **Two base-URL env vars coexist:** `shared/lib/api.ts` uses `NEXT_PUBLIC_BACKEND_URL` while `scan.ts` uses `NEXT_PUBLIC_API_URL` — both must be set to the same backend or streaming vs. non-streaming calls hit different hosts. TODO: verify these are meant to be unified.
- **`streamScan` has no retry logic** (comment: "assumes a stable, always-on server"), unlike `api()` — a cold backend can fail a stream immediately.
- **SSE parsing ignores malformed frames and `:` heartbeat comments silently** — a corrupted event is dropped, not surfaced.
- **`proxy.ts` (not the conventional `middleware.ts`)** is the middleware entry; the matcher excludes static assets and image extensions.
- **`AGENTS.md` / `CLAUDE.md` in this folder** are AI-assistant instructions, not app docs.

## Source files read to write this
`package.json`, `src/proxy.ts`, `src/shared/lib/api.ts`, `src/shared/lib/supabase/middleware.ts`, `src/features/scan/services/scan.ts`, `src/features/auth/services/auth.ts`, and the `src/` tree listing (`app/`, `features/`, `shared/`).
