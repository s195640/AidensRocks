# Visitors by Day — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phase 1 — Visitors by Day dashboard panel (2026-10-16)
**Status:** Complete
**Files changed:**
- New: `server/src/utils/platformFromUserAgent.js`, `server/tests/api/statistics-daily.test.mjs`, `client/src/admin/components/visitors-by-day/VisitorsByDay.{jsx,module.css}`, this file
- Changed: `server/src/routes/statistics.js`, `server/tests/api/auth-matrix.test.mjs`, `client/src/admin/pages/admin/Admin.{jsx,module.css}`, `client/package.json` (+ lock), `VERSION` (0.13.10 → 0.14.0)

**Decisions (asked and answered):**
- Its own dashboard panel, placed above Statistics (mobile order: after AR Details, before Statistics).
- Ranges: 7 / 30 / 90 days, This year, All (default 30 days).
- Two views: **Visitors** (Total + Unique lines) and **By Platform** (stacked columns per day, with a Total / Unique toggle).
- Charting library: Recharts (`recharts@3.10.1`), new client dependency.

**Summary:**
- **Backend:** `GET /api/statistics/daily?range=7|30|90|year|all&tz=<IANA>` (admin only). Buckets `counter_tracking.create_dt` by calendar day in the admin's own timezone (the client sends `Intl` timezone; invalid tz or range → 400). Every day from the range start through today is returned, zero-filled. "All" starts at the first recorded visit. Per day: `total`, `unique` (distinct IPs), and the same per platform.
- Platform detection was pulled out of `statistics.js` into `utils/platformFromUserAgent.js` so the Statistics table and the new chart can't disagree.
- **Frontend:** `VisitorsByDay.jsx`. Platform colors are fixed per platform (never by rank) and "Other" is gray; platforms with nothing in the range are left out of the legend. The By Platform tooltip's "All platforms" line is the day's real figure, not the stack's sum (in Unique mode one IP on two platforms counts once).

**Notes:**
- No schema change, no migration.
- Rows with a NULL `create_dt` aren't charted (they have no day).

## Phase 1.1 — Move panel to the top of the left column (2026-10-16)
**Status:** Complete
- Per request, Visitors by Day is now the first panel in the dashboard's left column, and first on mobile too. `Admin.jsx` order and `Admin.module.css` mobile `nth-child` orders renumbered. `VERSION` 0.14.0 → 0.14.1.

## Phase 1.2 — Keep Recharts out of the public download (2026-10-16)
**Status:** Complete
- Found in the site-tracking visitor-experience review: the client was one bundle that every visitor downloaded, admin included, so Recharts (about 119 KB gzipped) had made the public site about 10% heavier.
- Fix (approved): all 13 admin pages are now `React.lazy` in `client/src/App.jsx`, inside one `Suspense` with a small "Loading..." fallback (`.loading` in `App.module.css`). The public routes aren't lazy, so they never show it.
- Result: the main bundle went from 1,134.9 KB to 776.6 KB gzipped. Recharts now lives in the dashboard's own chunk.
- The visible change: the first time someone opens an admin page in a session, there's a brief loading state while its code downloads.
- `VERSION` 0.15.9 → 0.15.10.
