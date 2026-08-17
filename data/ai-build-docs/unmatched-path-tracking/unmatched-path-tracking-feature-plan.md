# Unmatched Path Tracking — Design Plan

**Location:** this file and everything else for this feature lives under `data\ai-build-docs\unmatched-path-tracking\`.

## What this is
Any URL that doesn't match a defined client route (e.g. `aidensrocks.com/f`) redirects the visitor to `/` and logs a hit for that path, visible to the family as a new "Unmatched Paths" section in the existing admin Statistics panel.

## Decisions
- **Where implemented:** client-side only. Production nginx serves `index.html` for any unmatched top-level path (`try_files ... /index.html`) before Express ever sees the request — only React Router sees the mismatch, so a `path="*"` catch-all route (`client/src/components/notfoundredirect/NotFoundRedirect.jsx`, wired in `client/src/App.jsx`) is the only place this can be caught, not an Express 404 handler.
- **Where viewed:** new "Unmatched Paths" section added to the existing `client/src/admin/components/statistics/Statistics.jsx` panel, not a separate page.
- **Storage — insert-only, not an incrementing counter column.** New table `unmatched_path_hit` (`id`, `path`, `create_dt`) gets one row per hit; the per-path count shown to the admin is `COUNT(*) GROUP BY path` computed at read time in `server/src/routes/unmatchedPath.js`, not a stored `hit_count` column that gets incremented in place.
  - **Deviation from the original plan** (worth flagging explicitly): the plan approved by the user described a single row per path with an `ON CONFLICT ... DO UPDATE SET hit_count = hit_count + 1` upsert. While implementing, `data/sql/migrations/add_app_version_table.sql`'s own comment surfaced a concrete reason not to do that here: this schema replicates across two prod nodes via pglogical, and an increment-in-place column is unsafe under multi-master replication — two nodes each doing `hit_count = hit_count + 1` concurrently on the same path can silently lose an update. That's exactly why the existing `counter`/`counter_tracking` tables are insert-only with aggregation at read time instead of a mutable counter column, and this feature now follows that same established pattern. From the admin's point of view nothing changes — still just a path + a count, no per-visit detail (IP/user agent/session) shown or stored.
- **Noise filtering:** server-side ignore-list (favicon/robots/apple-touch-icon/`.well-known/*`) in `server/src/routes/unmatchedPath.js`, so routine browser/crawler requests for nonexistent static assets don't pollute the table. Ignored paths respond `204` without inserting a row. Tunable list, revisit after real data comes in.
- **Auth:** `GET /api/unmatched-path` is unauthenticated, matching `statistics.js`'s existing precedent for this analytics panel — consistency with the sibling endpoint outweighs the marginal security gain, since the data has no PII (just path + count).
- **History:** the redirect uses `navigate("/", { replace: true })` (unlike `QRRedirect.jsx`, which doesn't use `replace`) so a dead path never lands in browser history — hitting Back after landing on `/f` shouldn't bounce right back to it.
- **VERSION:** only the repo-root `VERSION` file was bumped (`0.1.113` → `0.2.0`). `server/VERSION` was left untouched — it turned out to be an empty, unused file; `server/src/utils/getAppVersion.js` only ever reads the repo-root `VERSION` (via a few different relative-path candidates depending on run context), so `server/VERSION` isn't part of the real version-reporting path.

## Prod migration note — this is a brand-new table, not a new column
`unmatched_path_hit` doesn't exist anywhere yet, on either prod node. Same one-time registration as established for prior features' new tables:
1. `CREATE TABLE unmatched_path_hit (...)` (see `data/sql/migrations/add_unmatched_path_hit_table.sql`) — run manually and identically on both prod nodes (DDL isn't replicated by pglogical).
2. `SELECT pglogical.replication_set_add_table('default', 'unmatched_path_hit', synchronize_data := false);` — run on the provider node only, per this repo's established pattern (see `add_photoalbum_tags_table.sql`).
3. No seed/backfill needed — table starts and stays empty until a real unmatched-path hit occurs.

## Issue log
`data\ai-build-docs\unmatched-path-tracking\summary-issue-log.md` — feature-scoped. Append one entry per phase (status, files changed, summary, deviations, issues/gotchas, open questions).
