# Browser Extension (`extension/`)

Chrome Manifest V3 extension. React 19 + Vite + Tailwind, popup UI.

## Purpose

A one-click accessibility scanner living in the browser toolbar. The popup authenticates the user against Supabase, scans the current tab's URL via the AccessAI backend, and renders the resulting report (score, summary, issues) inline. It reuses the same backend API as the web app.

## Boundaries

- It does **not** run axe-core or any analysis locally — it POSTs the URL to the backend and displays the response.
- It does **not** inject content scripts or modify visited pages (only `activeTab` + `storage` permissions); it reads the active tab's URL only.
- It does **not** implement its own auth — session/token refresh is delegated to `@supabase/supabase-js` backed by `chrome.storage.local`.
- The background service worker does **no** business logic (see `background/service-worker.ts`).

## Public surface

This is an app, not a library — its "surface" is the popup UI and its API helpers.

### UI (`src/popup/`)
- `App.tsx` — root component; a `ViewState` state machine: `loading → login | scan → progress → report`.
- Screens (`src/popup/screens/`): `LoginScreen`, `ScanScreen`, `ProgressScreen`, `ReportScreen`.
- Components (`src/popup/components/`): `IssueCard`, `Logo`.

### Lib (`src/lib/`)
- `api.ts`: `createScan(url)` → `POST /api/scans`; `fetchScan(scanId)` → `GET /api/scans/:id`. Both go through `apiFetch` which injects the Bearer token.
- `supabase.ts`: `supabase` client (with a `chrome.storage.local` storage adapter) and `getAccessToken()`.

### Background (`src/background/service-worker.ts`)
- `chrome.runtime.onInstalled` listener that logs on install. Nothing else.

### Types (`src/types/index.ts`)
- `ScanResult`, `ApiResponse<T>`, issue/scan types shared across the popup.

## Dependencies

- **Internal (this repo):** depends on the **backend** HTTP API and on **Supabase** (auth). Nothing depends on it.
- **External:** `react`, `react-dom`, `@supabase/supabase-js`, Vite, Tailwind.
- **Config (build-time `import.meta.env`):** `VITE_BACKEND_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **`manifest.json` `host_permissions`** hardcode the production backend and Supabase project origins — these cross to external services and must match the configured env.

## Key flows

### 1. Auth bootstrap (`App.tsx`)
1. On mount, `supabase.auth.getSession()` resolves from `chrome.storage.local`; view becomes `scan` if a session exists, else `login`.
2. `onAuthStateChange` keeps `session` in sync and forces `login` on sign-out.

### 2. Scan the current tab
1. `ScanScreen` reads the active tab URL (via `activeTab`) and calls `onStartScan(url)`.
2. `App.handleStartScan` switches to `progress`, calls `createScan(url)`.
3. `apiFetch` fetches a token via `getAccessToken()` (throws "Not authenticated" if none), sets the Bearer header, POSTs to `/api/scans`.
4. On success the view becomes `report` with the `ScanResult`; on error it returns to `scan` with the error message.

### 3. Session persistence
1. The Supabase client uses `chromeStorageAdapter` (`getItem`/`setItem`/`removeItem` over `chrome.storage.local`) so the session survives popup close/reopen; `autoRefreshToken` and `persistSession` are on, `detectSessionInUrl` off.

## Rules and constraints

- **Every backend call must attach a fresh Supabase access token; no token ⇒ throw before fetching.** Reason: the backend rejects unauthenticated reads, and failing fast gives a clearer UX than a 401.
- **Session storage must use the `chrome.storage.local` adapter, not `localStorage`.** Reason: MV3 popups are ephemeral and `localStorage` is not reliably shared/persisted across popup lifecycles.
- **Keep the service worker logic-free.** Reason: MV3 workers are killed aggressively; persistence lives in the Supabase client instead, so the worker holds no critical state.
- **Only request `activeTab` + `storage`; never broaden host permissions beyond the backend + Supabase origins.** Reason: minimizes review friction and the extension's attack surface.
- **All secrets are anon/public keys only.** Reason: no service-role or privileged credentials may ship in a client bundle.

## Gotchas

- **`ProgressScreen` is time/spinner-based, not event-based** — the extension uses the blocking `POST /api/scans` (not the SSE stream the web app uses), so progress is indicative only and a slow scan can look stuck.
- **Hardcoded origins in `manifest.json`** (`access-ai-backend.onrender.com`, a specific Supabase project) — pointing the build at a different backend requires editing the manifest, not just env.
- **A packaged `accessai-extension-v1.0.0.zip` is committed** at the module root; it can drift from source. TODO: verify it's a build artifact and not the source of truth.
- **`VITE_*` values are inlined at build time**, so changing environments requires a rebuild, not a runtime config change.

## Source files read to write this
`manifest.json`, `src/popup/App.tsx`, `src/lib/api.ts`, `src/lib/supabase.ts`, `src/background/service-worker.ts`, `src/popup/screens/` (listing), `package.json`.
