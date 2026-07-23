# Supabase (`supabase/`)

PostgreSQL schema + Row Level Security policies, delivered as ordered SQL migrations. This is the system's data layer and identity provider.

## Purpose

Defines the database (`scans`, `issues`, `reports`, `chat_messages`, `api_keys`), their indexes, and the RLS policies + grants that enforce per-user data isolation. Supabase Auth (`auth.users`) is also the identity provider for the whole system.

## Boundaries

- It contains **no** application logic — no functions, triggers, or edge functions; just tables, indexes, RLS policies, and grants.
- It does **not** hash API keys or run scans — the backend does that and writes rows via the `service_role`.
- Migrations are **run manually** (in the Supabase SQL editor per `001`'s header comment); there is no automated migration runner committed here.

## Public surface

Migrations in `migrations/`, applied in numeric order:

| File | Change |
|---|---|
| `001_initial_schema.sql` | Creates `scans`, `issues`, `reports`; enables RLS; base SELECT/INSERT policies + grants |
| `002_add_scan_type.sql` | Adds `scans.scan_type` (`url` \| `sitemap`, default `url`) |
| `003_add_chat_messages.sql` | Creates `chat_messages` + RLS |
| `004_add_api_keys.sql` | Creates `api_keys` (hash + prefix) + RLS |
| `005_add_code_scan_type.sql` | Extends `scan_type` check to include `code` |
| `006_rls_for_chat_messages.sql` | Reasserts chat RLS + service-role update/delete policies |
| `007_fix_rls_insert_policies.sql` | Hardens INSERT policies to `TO service_role` + owner-scoped fallbacks |

### Tables (columns of note)
- `scans` — `id`, `user_id → auth.users`, `url`, `scan_date`, `accessibility_score`, `status` (`pending`/`scanning`/`analyzing`/`completed`/`failed`), `scan_type`.
- `issues` — `scan_id → scans`, `issue_type`, `severity` (`critical`/`serious`/`moderate`/`minor`), `description`, `recommendation`, `wcag_reference`.
- `reports` — `scan_id` (UNIQUE) `→ scans`, `summary`, `priority_recommendations`.
- `chat_messages` — `scan_id → scans`, `role` (`user`/`assistant`), `content`, `created_at`.
- `api_keys` — `user_id → auth.users`, `name`, `key_hash` (UNIQUE), `key_prefix`, `last_used_at`.

## Dependencies

- **Internal (this repo):** consumed by the **backend** (writes via `service_role`, bypassing RLS) and by the **frontend**/**extension** (read via anon key + user JWT, subject to RLS). The **agent** has a Supabase client configured but does not use it in the live path.
- **External:** the `uuid-ossp` Postgres extension; Supabase Auth (`auth.users`, `auth.uid()`).
- **Layer note:** `ON DELETE CASCADE` from `scans` fans out to `issues`, `reports`, and `chat_messages`, so deleting a scan cleans up all children.

## Key flows

### 1. User reads their own data (frontend/extension)
1. Client queries with a user JWT (anon key). RLS `SELECT` policies allow a row only when it (or its parent scan) has `user_id = auth.uid()`.
2. `issues`/`reports`/`chat_messages` reach ownership through an `EXISTS` subquery against `scans`.

### 2. Backend writes results
1. Backend uses the `service_role` key, which **bypasses RLS entirely**; the explicit `TO service_role` INSERT policies document intent rather than gate access.
2. Ownership on writes is therefore enforced in backend code, not by the DB (see `007`'s rationale).

### 3. API-key lookup
1. On each API request the backend hashes the presented key and looks it up by `key_hash` (indexed) in `api_keys`, then updates `last_used_at`.

## Rules and constraints

- **Every table must have RLS enabled and a user-scoped SELECT policy keyed on `auth.uid()`.** Reason: multi-tenant isolation — without it, one user's JWT could read another user's scans over PostgREST.
- **INSERT/UPDATE/DELETE policies must be restricted `TO service_role`, with owner-scoped `authenticated` fallbacks.** Reason: `001`'s `WITH CHECK (true)` policies gave no ownership guarantee; `007` fixes this so a future client-side GRANT can't accidentally open direct inserts.
- **`api_keys.key_hash` stores only a hash; never a raw key column.** Reason: a DB leak must not expose usable keys (raw key shown once at creation by the backend).
- **Child tables must `REFERENCES scans(id) ON DELETE CASCADE`.** Reason: guarantees no orphaned issues/reports/chat/rows when a scan is deleted.
- **Migrations must be additive and idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).** Reason: they're applied manually and may be re-run; they must not fail on an already-migrated DB.

## Gotchas

- **RLS is largely advisory for the backend** because it connects as `service_role` and bypasses all policies; the real authorization for writes lives in backend code. Reading the SQL alone overstates DB-level protection.
- **No down/rollback migrations** are provided — changes are forward-only.
- **`reports.scan_id` is UNIQUE**, so a scan can have at most one report; re-analyzing a scan would need an upsert, not a second insert. TODO: verify re-scan behavior.
- **`002` originally constrained `scan_type` to `url`/`sitemap`; `005` widens it to include `code`** — applying migrations out of order will violate the check constraint on code scans.
- **`analyzing` is a valid `status`** in the schema even though the live streaming pipeline mostly moves `scanning → completed`.

## Source files read to write this
`migrations/001_initial_schema.sql`, `002_add_scan_type.sql`, `003_add_chat_messages.sql`, `004_add_api_keys.sql`, `005_add_code_scan_type.sql`, `006_rls_for_chat_messages.sql`, `007_fix_rls_insert_policies.sql`.
