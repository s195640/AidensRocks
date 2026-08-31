# Path Display Names — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phase 1 — Display-name lookup + Path Hits/Statistics split + Jobs-page manager (2026-08-31)
**Status:** Complete (not yet applied to any live database)
**Files changed:**
- New: `data/sql/migrations/add_path_display_name_table.sql`, `server/src/utils/pathDisplayNameMatcher.js`, `server/src/routes/pathDisplayNameAdmin.js`, `client/src/admin/components/path-hits-panel/PathHitsPanel.jsx` (+ `.module.css`), `client/src/admin/components/path-display-names/PathDisplayNames.jsx` (+ `.module.css`), this file
- Changed: `data/sql/createdb.sql`, `data/sql/pglogical.sql`, `data/sql/droptables.sql`, `server/src/routes/serverHealth.js`, `server/src/routes/unmatchedPath.js`, `server/src/app.js`, `client/src/admin/components/statistics/Statistics.jsx`, `client/src/admin/pages/admin/Admin.jsx` (+ `Admin.module.css`), `client/src/admin/pages/jobs/Jobs.jsx`, `VERSION`

**Summary:**
- **New table `path_display_name`** (`id`, `url_pattern` unique, `display_name`, `create_dt`, `update_dt`): admin-managed lookup mapping a hit's full URL to a display label. `url_pattern` may contain `*` as a wildcard (e.g. `/qr?r=*` → `Rock`); an exact, non-wildcard pattern always wins over a wildcard one, and among wildcard matches the longest (most specific) pattern wins — see `pathDisplayNameMatcher.js`. Registered in `createdb.sql`/`pglogical.sql`/`droptables.sql`/`serverHealth.js`'s `TABLES` list following the exact pattern already established for `unmatched_path_hit`/`entry_media`.
- **`GET /api/unmatched-path` reshaped**: previously grouped hits by pathname only (`path`), discarding the query string. Now groups raw hits by `COALESCE(full_url, path)` first, then does a second merge in JS keyed by whichever `path_display_name` row each raw group resolves to (or by its own raw value when nothing matches). That second merge is what lets `/qr?r=*` collapse every distinct rock code into one combined-count "Rock" row, while an unmapped full_url stays listed on its own under `display_name: "Unknown"` rather than being hidden — the whole point is surfacing paths that still need a mapping. This is a genuine behavior change from the prior grouping (flagged per CLAUDE.md's "data model" approval rule, but directly implied by the request's own examples — `/treeHH?z=1` vs. a hypothetical `/treeHH?z=2` needing to resolve to different names required per-full_url granularity, not per-pathname).
- **Admin-only CRUD** at `/api/admin/path-display-names` (`pathDisplayNameAdmin.js`, gated by `requireAdminAuth` like `jobsAdmin.js`/`pagesAdmin.js`): list/create/update/delete, 409 on a duplicate `url_pattern`.
- **Dashboard**: "Path Hits" split out of `Statistics.jsx` into its own read-only widget (`PathHitsPanel.jsx`), styled like `MusicPanel`/`HonoringAidenPanel`, showing Display Name / Full URL / Hits / Last Hit. `Statistics.jsx` no longer fetches `/api/unmatched-path` at all — it's back to just `stats`/`agentStats`.
- **Jobs page**: new "Path Display Names" job (`PathDisplayNames.jsx`, following the `Job`/`Dialog`/`Table` pattern from `SendEmailsCatchup.jsx`) — add/edit/delete mappings inline in one dialog (a small pattern+name form above a `Table` of existing rows, edit icon populates the form, delete icon removes after `window.confirm`).
- **`Admin.module.css` mobile order fix**: `leftColumn` went from 4 to 5 stacked children; its `nth-child` mobile-reorder rules were already stale before this change (a 4th child, Server Health, had no rule at all and would've rendered *first* on mobile at the CSS default `order: 0`). Renumbered all the `nth-child` rules to match the actual current children (Music → Honoring Aiden → Path Hits → [ARDetails via `.rightColumn`] → Statistics → Server Health) and corrected the comment, since leaving it stale would only get worse with a 5th widget.
- **VERSION:** root `VERSION` bumped `0.2.19` → `0.3.0` (new feature folder, per CLAUDE.md's Y-bump rule).

**Deviations from plan:** None — no prior plan doc; scope/design was settled via in-conversation Q&A (grouping granularity inferred from the request's own examples; management UI location clarified by the user as a Jobs-page widget rather than inline on the Path Hits panel itself).

**Issues/gotchas encountered:**
- `Admin.module.css`'s mobile `nth-child` ordering was already out of sync with `Admin.jsx`'s actual children (see above) — pre-existing, unrelated to this feature, but touched here since adding a 5th widget would have made the existing bug worse.
- Not applied to any live database — this repo has no migration runner. `add_path_display_name_table.sql`'s `CREATE TABLE` still needs to be run manually against local/dev, then identically on both prod nodes (plus the commented-out `pglogical.replication_set_add_table` line, provider node only), before this feature is live.

**Open questions for human review:**
1. Confirm the `GET /api/unmatched-path` grouping-granularity change (pathname-only → full_url, merged again by matched pattern) reads the way you expect once you see it against real data — it's a real behavior change from what the Path Hits table showed before, even though no prior row shapes/counts are preserved anywhere else.
2. Run the migration against local/dev and verify end-to-end (add a mapping on the Jobs page, confirm it shows up correctly on the dashboard's Path Hits widget, including a wildcard case) before considering this done.

## Phase 1.1 — Hide Unknown rows by default on the Path Hits widget (2026-08-31)
**Status:** Complete
**Files changed:** `client/src/admin/components/path-hits-panel/PathHitsPanel.jsx` (+ `.module.css`), `VERSION`
**Summary:** `PathHitsPanel.jsx` now filters out `display_name === "Unknown"` rows by default. A "Show Unknown (N)" toggle button appears above the table whenever there's at least one Unknown row (hidden entirely otherwise); clicking it flips to showing every row and relabels itself "Hide Unknown". Purely a client-side filter over the already-fetched `pathHits` array (`useState(false)`, no fetch involved in toggling) -- not persisted anywhere (no localStorage/query param/backend flag), so it's always hidden again on next mount, per request. Empty-state copy now distinguishes "no hits logged at all" from "hits exist but all are Unknown and currently hidden".
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.3.0` → `0.3.1` (patch, same feature folder).

## Phase 1.2 — Show/hide Unknown as an icon button on the header row (2026-08-31)
**Status:** Complete
**Files changed:** `client/src/admin/components/path-hits-panel/PathHitsPanel.jsx` (+ `.module.css`), `VERSION`
**Summary:** Per request, replaced the labeled "Show Unknown (N)"/"Hide Unknown" button (previously its own row above the table) with an icon-only button (`FiEye`/`FiEyeOff`, label moved to a `title` tooltip) placed in the header row next to the existing refresh icon. `headerRow`'s single absolutely-positioned `.refreshBtn` became a `.headerActions` flex group (`gap: 12px`) holding both icon buttons, still absolutely positioned/vertically centered the same way; renamed `.refreshBtn` to the now-shared `.iconBtn`. Same toggle behavior as Phase 1.1 (client-side filter, not persisted, hidden again on remount) -- only the control's presentation changed.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.3.1` → `0.3.2` (patch, same feature folder).
