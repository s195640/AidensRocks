# Unmatched Path Tracking — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phase 1 — Catch-all redirect + hit logging (2026-08-16)
**Status:** Complete
**Files changed:**
- New: `data/sql/migrations/add_unmatched_path_hit_table.sql`, `server/src/routes/unmatchedPath.js`, `client/src/components/notfoundredirect/NotFoundRedirect.jsx`, `data/ai-build-docs/unmatched-path-tracking/unmatched-path-tracking-feature-plan.md`, this file
- Changed: `data/sql/createdb.sql`, `data/sql/pglogical.sql`, `data/sql/droptables.sql`, `server/src/app.js`, `client/src/App.jsx`, `client/src/admin/components/statistics/Statistics.jsx`, `VERSION`

**Summary:**
- **Discovery:** confirmed no catch-all route existed anywhere in `client/src/App.jsx`'s `<Routes>`, and that production nginx serves `index.html` for any unmatched top-level path before Express sees it (`try_files ... /index.html`) — so the fix has to be a client-side React Router catch-all, not an Express 404 handler.
- **Backend:** new `unmatchedPath.js` router mounted at `/api/unmatched-path`. `POST /` inserts one row per hit (after checking a small server-side ignore-list for favicon/robots/apple-touch-icon/`.well-known/*` noise), `GET /` returns `path, hit_count, last_hit_dt` grouped/aggregated at read time, no auth (matches `statistics.js`'s existing precedent).
- **Frontend:** new `NotFoundRedirect.jsx` (modeled on `QRRedirect.jsx`) wired as the last `<Route path="*">` in `App.jsx`; fire-and-forget POSTs the hit path then `navigate("/", { replace: true })`. `Statistics.jsx` now fetches `/api/unmatched-path` alongside `/api/statistics` and renders a new "Unmatched Paths" table.
- **VERSION:** root `VERSION` bumped `0.1.113` → `0.2.0` (new feature folder). `server/VERSION` was left alone — found to be an empty, unused file; `server/src/utils/getAppVersion.js` only ever reads the repo-root `VERSION`.

**Deviations from plan:**
1. The approved plan described a single row per path with an `ON CONFLICT ... DO UPDATE SET hit_count = hit_count + 1` upsert. Implemented as an insert-only log table (`unmatched_path_hit`) aggregated via `COUNT(*) GROUP BY path` at read time instead. Cause: `data/sql/migrations/add_app_version_table.sql`'s own comment explains that an increment-in-place column is unsafe under this repo's multi-master pglogical replication (concurrent increments on two nodes can silently lose an update) — which is exactly why the existing `counter`/`counter_tracking` tables are insert-only rather than a mutable counter column. Matched that established pattern instead of introducing a new instance of the bug class it was designed to avoid. No user-visible difference — the admin still sees just path + count, nothing else.
2. `server/VERSION` was not bumped (plan said to bump both root and `server/VERSION`) — see VERSION note above.

**Issues/gotchas encountered:**
- Found the `counter`/`counter_tracking` insert-only precedent, and the `app_version` increment-hazard warning, while reading `data/sql/createdb.sql`/migrations for schema conventions — not something surfaced by earlier exploration, so worth having future work re-check `data/sql/migrations/add_app_version_table.sql`'s comment before designing any new per-row "counter" column in this schema.
- Not applied to any live database — this repo has no migration runner. `add_unmatched_path_hit_table.sql`'s `CREATE TABLE` still needs to be run manually against local/dev now, and identically on both prod nodes (plus the commented-out pglogical registration, provider node only) before this feature is live in production.

**Open questions for human review:**
1. Confirm you're fine with the insert-only-table deviation above (functionally identical to what was approved from the admin's point of view, but the actual schema shape differs from the plan).
2. Run the migration against local/dev, then verify end-to-end per the feature plan's verification steps, before this is considered done.

## Phase 1.1 — Show last-hit timestamp in the admin panel (2026-08-16)
**Status:** Complete
**Files changed:** `client/src/admin/components/statistics/Statistics.jsx`
**Summary:** Added a "Last Hit" column to the Unmatched Paths table. The backend already returned `last_hit_dt` (`MAX(create_dt)`) from `GET /api/unmatched-path` — no server change needed, just displaying the field, formatted via `toLocaleString()`.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.

## Phase 1.2 — Log /qr hits into the same table (2026-08-16)
**Status:** Complete
**Files changed:** `client/src/components/qrredirect/QRRedirect.jsx`, `client/src/admin/components/statistics/Statistics.jsx`, `server/src/routes/unmatchedPath.js`
**Summary:** Per request, `/qr` — a real, matched route, not an unmatched one — now also logs a hit through the same `POST /api/unmatched-path` endpoint/table, so it shows up in the admin panel's counts too. `QRRedirect.jsx`'s existing behavior (stashing `?r=` into `sessionStorage`, `navigate("/")` with no `replace`) is untouched; the log call is a fire-and-forget addition alongside it, matching `NotFoundRedirect.jsx`'s try/catch pattern. Renamed the admin panel section from "Unmatched Paths" to "Path Hits" (and its empty-state copy) since it's no longer strictly limited to unmatched paths; updated `unmatchedPath.js`'s route comment to match. No DB/schema change — the table was already a generic `(path, create_dt)` hit log.
**Deviations from plan:** None — table/endpoint naming (`unmatched_path_hit` / `/api/unmatched-path`) was left as-is rather than renamed to something fully generic, to avoid churn on a feature not yet deployed to any live DB; only the admin-facing label changed.
**Issues/gotchas encountered:** None.

## Phase 1.3 — Add unmatched_path_hit to the Server Health table-sync list (2026-08-16)
**Status:** Complete
**Files changed:** `server/src/routes/serverHealth.js`
**Summary:** Added `unmatched_path_hit` to `serverHealth.js`'s `TABLES` array, per that file's own header comment ("kept in sync with `data/sql/pglogical.sql`'s own table list — every table registered for replication should have a row count here too"). This makes it show up per-node on the admin dashboard's Server Health panel and included in the node-to-node `dbSync` comparison. `client/src/admin/components/server-health/ServerHealth.jsx` needed no change — it renders `dbTables` dynamically via `Object.entries`, not a hardcoded table list.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.

## Phase 1.4 — Add replication status to the Server Health node list (2026-08-16)
**Status:** Complete
**Files changed:** `server/src/routes/serverHealth.js`
**Summary:** `getDbCounts()` now also runs `SELECT status FROM pglogical.show_subscription_status()` over the same per-node direct Postgres connection already used for table counts/`app_version` (same reasoning: each node reports its own actual subscription status, not the other node's). Result is joined into a `replication_status` string (comma-separated if a node somehow has more than one subscription), defaulting to `"none"` for zero rows and `"unknown"` if the query itself fails (e.g. pglogical not set up on that node, matching the existing `version` field's fallback style). Added to each node's object in the main route handler as `replication_status`, placed right after `ip_addr` and before the spread of table counts, per request. `ServerHealth.jsx` needed no change — it renders each node's fields dynamically via `Object.entries`, so the new key just appears as its own row in that same position.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None — not verified against a live pglogical-enabled node in this session (no DB access here); the query and its zero-row/error fallbacks should be spot-checked against real node1/node2 Postgres instances before relying on this in production.
