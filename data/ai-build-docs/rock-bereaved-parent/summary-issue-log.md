# Rock Bereaved Parent — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase. Builds on `rock-assign-status` (0.18).

## Phase 1 — Bereaved parent flag on rocks (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:**
- New: `data/sql/migrations/0.19-rock-bereaved-parent/01_bothservers_add_bereaved_parent_to_catalog.sql`, this file
- Changed: `data/sql/createdb.sql`, `server/src/routes/rocks.js`, `server/src/routes/rockRequests.js`, `server/tests/api/admin-crud.test.mjs`, `server/tests/api/auth-matrix.test.mjs`, `client/src/admin/pages/rocks/Rocks.jsx`, `client/src/admin/pages/rocks/rock-table/RockTable.jsx` (+ `.module.css`), `client/src/admin/pages/rocks/rock-create-edit-dlg/RockCreateEditDlg.jsx` (+ `.module.css`), `VERSION`

**Summary:**
- `catalog.bereaved_parent` boolean, NOT NULL, default false. No backfill: existing rocks start unflagged (user's call).
- Rocks page: Bereaved column right of Status, the same hand-holding-heart toggle as Rock Requests, sortable with flagged rocks first. It saves in place via `PATCH /api/rocks/:rc_key/bereaved-parent`. The Edit Rock dialog has a "Bereaved parent" checkbox, sent with its PUT.
- One-way from Rock Requests: the flag never flows from a rock back to its request.
  - Linking a rock to a request copies the request's flag; unlinking turns it off (along with status → available).
  - Changing a request's flag (table toggle PATCH or edit-dialog PUT) copies the new value to all its linked rocks. Only on an actual change, so re-saving a request, or a PATCH of other fields, doesn't undo a flag set by hand on one of its rocks. PATCH does this in one statement (CTE comparing the before/after row).
- **VERSION:** `0.18.19` → `0.19.0` (new feature folder; first built as 0.18.19 inside the 0.18 migration folder, moved out because 0.18 had already run on test/prod).

**Deploy (0.18 already done on test/prod):** (Phase 3 adds a step 02.)
1. `0.19-rock-bereaved-parent/01_bothservers_add_bereaved_parent_to_catalog.sql`, BOTH nodes.
2. Deploy server + client.

**Open questions for human review:**
1. Unlinking a rock turns its bereaved flag off, because the rock goes back to the available pool. Flag if a hand-set flag should survive unlinking.

## Phase 2 — Artists column sort fixed (2026-10-19)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
- Sorting by Artists did nothing: the column's value is an array of `{ra_key, display_name}`, which the Table's comparison can't order. Each row now gets `_artistNames` (the names joined, as shown in the cell), and the column sorts by it. Rocks with no artist sort last both ways. The cell and the search use the same `_artistNames`.
- Not part of the bereaved feature, logged here as the current feature folder.
- **VERSION:** `0.19.0` → `0.19.1`.

## Phase 3 — Kayla Ellington rocks cleanup script (2026-10-19)
**Status:** Complete (script tested on a throwaway DB; not yet run on test/prod)
**Files changed:** new `data/sql/migrations/0.19-rock-bereaved-parent/02_oneserver_assign_kayla_ellington_rocks.sql`; step 01's header is now "of 02"; `VERSION`
- One-time data fix: available rocks whose only artist is Kayla Ellington become assigned, dated their `create_dt`, with "Brooke's dance student" as the comment (added on a new line if a comment exists). Rocks she shares with another artist, and rocks not available, are untouched. Re-runnable (finds nothing the second time). The file has a preview query.
- Tested: Kayla-only rocks changed (one with an existing comment, which was kept); a shared rock, a `keep` rock and an Ashley-only rock were untouched; a second run changed nothing.
- **VERSION:** `0.19.1` → `0.19.2`.

**Deploy (0.19, in order):**
1. `01_bothservers_add_bereaved_parent_to_catalog.sql`, BOTH nodes.
2. `02_oneserver_assign_kayla_ellington_rocks.sql`, Node A only. Run the preview query in its header first.
3. Deploy server + client (the order relative to step 2 doesn't matter).
