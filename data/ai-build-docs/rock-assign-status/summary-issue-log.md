# Rock Assign Status — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phase 1 — Status + Assigned date on the Rock Catalog (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:**
- New: `data/sql/migrations/0.18-rock-assign-status/` (`01_bothservers_add_assign_status_to_catalog.sql`, `02_oneserver_backfill_catalog_assign_status.sql`), `client/src/admin/pages/rocks/assignStatuses.js`, this file
- Changed: `data/sql/createdb.sql`, `server/src/routes/rocks.js`, `server/src/routes/rockRequests.js`, `client/src/admin/pages/rocks/Rocks.jsx`, `client/src/admin/pages/rocks/rock-table/RockTable.jsx` (+ `.module.css`), `client/src/admin/pages/rocks/rock-create-edit-dlg/RockCreateEditDlg.jsx`, `server/tests/api/admin-crud.test.mjs`, `server/tests/api/auth-matrix.test.mjs`, `VERSION`

**Summary:**
- `catalog.assign_status` (`available` / `assigned` / `keep` / `unknown`, default `available`, CHECK constraint) and `catalog.assigned_dt` (DATE, returned as `YYYY-MM-DD` text).
- Rock Catalog: "Total Available" in the header totals, a status filter next to the search box, and Status (in-place dropdown) + Assigned columns.
- Table dropdown → `PATCH /api/rocks/:rc_key/assign-status`. Changing to assigned stamps today (an already-assigned rock keeps its date), available clears the date, keep/unknown leave it alone.
- Edit Rock dialog has Status + Assigned Date; the dialog's PUT sends both. A PUT without `assign_status` leaves them alone.
- Rock Requests: linking a rock (Rock Number(s)) sets it assigned + today; unlinking sets it available + no date. Rocks already linked to that request are not touched on re-save, so a hand-set status survives.
- Backfill (decided with the user): linked → assigned, dated the request's `update_dt`; else has a non-blank comment → assigned, dated the rock's `update_dt`; else available, no date.
- **VERSION:** `0.17.4` → `0.18.0` (new feature folder).

**Deploy:**
1. Run `0.18-rock-assign-status/01_bothservers_...` on BOTH pglogical nodes (DDL isn't replicated). Idempotent.
2. Then run `02_oneserver_...` on ONE node only (data is replicated). Re-running it resets every rock to the backfill rules, so run it once, right after step 1.
3. Deploy server + client.

**Issues/gotchas encountered:**
- `PATCH` reuses `$2` in a `CASE` and a SET, so it's cast to `::text` to avoid "inconsistent types deduced for parameter".
- Dates from `timestamptz::date` use the DB session's timezone (UTC in the containers), so an evening-US update can backfill as the next day.

**Open questions for human review:**
1. None.

## Phase 2 — SQL moved into a versioned migration folder (2026-10-19)
**Status:** Complete
**Files changed:** the two migrations moved into `data/sql/migrations/0.18-rock-assign-status/` with `STEP NN of 02` headers; `data/sql/createdb.sql` comment, `CLAUDE.md` (migration folder convention), `VERSION`.
- **VERSION:** `0.18.0` → `0.18.1`.

## Phase 3 — Status filter defaults to available (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
- The Rock Catalog opens filtered to available rocks; "All statuses" is still in the dropdown. Changing a row's status in the table drops it out of view while the filter is on.
- **VERSION:** `0.18.1` → `0.18.2`.

## Phase 4 — Total rocks moved into the title (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/Rocks.jsx`, `VERSION`
- The heading reads "Rock Catalog (N)"; the separate "Total Rocks" line is gone, saving a line in the sticky header.
- **VERSION:** `0.18.2` → `0.18.3`.

## Phase 5 — Edit-by-number input (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/Rocks.jsx`, `VERSION`
- Placeholder shortened to "Rock #" so it fits the narrow input; Enter in the input opens the rock, same as the Edit button.
- **VERSION:** `0.18.3` → `0.18.4`.

## Phase 6 — Focus returns to Rock # after editing (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/Rocks.jsx`, `VERSION`
- Closing the Edit Rock dialog (Save, Cancel, Escape) focuses the Rock # input and selects its text, so the next number can be typed straight over it. Applies however the dialog was opened (Rock # box or a row's edit icon); the Create Rocks flow is unchanged.
- **VERSION:** `0.18.4` → `0.18.5`.

## Phase 7 — Header totals become filter chips (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/Rocks.jsx` (+ `.module.css`), `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
- The header totals are now clickable chips: All (N), Available (N), Last 24h (N), Last 1h (N). Each sets the table's filters to that preset and is lit while it's showing; Available is lit on load.
- The status and recent-hours filters moved up from `RockTable` to `Rocks` so the chips and the table's status dropdown share one state. Picking a status in the dropdown keeps any Last 24h/1h filter (no chip is lit then). The search box still narrows within whatever's shown.
- **VERSION:** `0.18.5` → `0.18.6`.

## Phase 8 — Title shows "X of Y" (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/Rocks.jsx`, `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
- The heading reads "Rock Catalog (X of Y)": X is the rows the table is showing after the chips, status dropdown and search; Y is every rock. `RockTable` reports X through `onShownCountChange`.
- **VERSION:** `0.18.6` → `0.18.7`.

## Phase 9 — Status filter "All statuses" renamed (2026-10-19)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
- The status filter's first option reads "all", lowercase to match the other options.
- **VERSION:** `0.18.7` → `0.18.8`.

## Phase 10 — Filters and table header row stay on screen (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/Rocks.jsx` (+ `.module.css`), `client/src/admin/pages/rocks/rock-table/RockTable.jsx` (+ `.module.css`), `client/src/components/simple-components/table/Table.jsx` (+ `.module.css`), `VERSION`
- One sticky block under the navbar now holds the title, chips, Create/Edit controls, and the status filter + search row (moved up from `RockTable`, along with the search state).
- `Table` takes an optional `stickyHeaderTop` (px). When set, the header row sticks at that offset while the page scrolls. Other tables are unchanged because they don't pass it.
- `Rocks` measures the sticky block's bottom (`top` + height, re-measured with a ResizeObserver as chips wrap) and passes it down, so the header row sits right under it.
- **VERSION:** `0.18.8` → `0.18.9`.

**Issues/gotchas encountered:**
- `.table`'s `overflow: hidden` (rounded corners) stops `position: sticky` on `th`, so the sticky variant sets `overflow: visible`.
- On phones (≤640px) the table scrolls sideways in its own box, which also captures sticky. The header row doesn't stick there, but the filter block does.

## Phase 11 — Rocks page layout rework for phones (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/Rocks.jsx` (+ `.module.css`, rewritten), `client/src/components/simple-components/table/Table.jsx` (+ `.module.css`), `VERSION`
- Heading is "Rocks" with the "X of Y" count beside it in smaller text.
- Edit and Create are 36px icon buttons (pen, plus) next to a smaller Rock # box, all on the title line.
- Chips sit on the left of one filter row, with the status filter + search on the right. On screens ≤769px the row stacks: chips become one swipeable line, and status + search share the full width. Inputs use 16px text on phones so iOS doesn't zoom in on focus.
- Layout: the page is now exactly screen height under the navbar, and only the table area scrolls (both ways), with the header row stuck to its top (`stickyHeaderTop={0}`). Nothing scrolls under the see-through navbar any more. Replaces Phase 10's page-scroll approach (the measured offset and the sticky header block are gone).
- The table keeps every column on phones (user's choice) with a 1100px minimum width, scrolling sideways inside the table area.
- `Table`: with `stickyHeaderTop` set, the phone rule that made the table scroll sideways in itself is turned off, because that trapped the sticky header row. The wrapper does the scrolling.
- The page no longer uses `AdminContainer` (its padding/flow layout doesn't fit a screen-height page).
- **VERSION:** `0.18.9` → `0.18.10`.

**Issues/gotchas encountered:**
- `.page` is deliberately unpositioned with no z-index. The edit/info dialogs render inside it, and a stacking context there would cap them under the navbar (see CLAUDE.md's stacking-context note).
- The footer is still below the screen-height page, so the outer page can scroll by the footer's height. `overscroll-behavior: contain` on the table area keeps a table swipe from doing that.

**Open questions for human review:**
1. Closing the Edit dialog refocuses the Rock # box (Phase 6), which pops the keyboard on a phone. Keep it there, or limit it to desktop?

## Phase 12 — Sticky header gap, image column moved (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/components/simple-components/table/Table.module.css`, `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
- Fixed a 1px gap above the sticky header row that rows showed through. With `border-collapse: collapse`, borders belong to the table rather than the cell, so the header's top border didn't stick. The sticky variant now uses separate borders (spacing 0, each cell drawing right + bottom, the first column and the header drawing the outer edges), so the lines still look 1px.
- Image is now the second column, after Rock.
- **VERSION:** `0.18.10` → `0.18.11`.

## Phase 13 — Shorter request column names (2026-10-19)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
- "Request Name / Email / Address" columns are now "Name / Email / Address", so each header fits on one line.
- **VERSION:** `0.18.11` → `0.18.12`.

## Phase 14 — Actions column pinned on phones (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/components/simple-components/table/Table.jsx`, `client/src/admin/pages/rocks/rock-table/RockTable.jsx` (+ `.module.css`), `VERSION`
- On screens ≤769px the Actions column is `position: sticky; right: 0`, so it stays at the right edge, with a soft shadow on its left, while the other columns scroll sideways under it. Its header sits above everything (z 3), and its cells sit above the scrolling cells (z 1). Desktop is unchanged.
- `Table` columns take an optional `className`, applied to the column's `<th>` and every `<td>`. Other tables don't set it.
- **VERSION:** `0.18.12` → `0.18.13`.

## Phase 15 — Pinned Actions column no longer covers the music player (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/rock-table/RockTable.module.css`, `VERSION`
- On phones the pinned Actions cells (z-index 1) drew over the music player. The player (`react-modern-audio-player`, rendered in `Footer`) is `position: fixed` with no z-index, so anything positioned above z 0 beats it. The cells now use z-index 0. The player comes later in the DOM, so it paints over them, and they still cover the unpositioned cells that scroll under them.
- Left the player itself alone: giving it a z-index would change how it stacks against every public page's controls.
- **VERSION:** `0.18.13` → `0.18.14`.

## Phase 16 — Status is the third column (2026-10-19)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
- Column order now starts Rock, Image, Status, Artists, Comment, Assigned, ...
- **VERSION:** `0.18.14` → `0.18.15`.

## Phase 17 — Rock # opens its journey (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `server/src/routes/rocks.js`, `server/tests/api/admin-crud.test.mjs`, `client/src/admin/pages/rocks/rock-table/RockTable.jsx` (+ `.module.css`), `VERSION`
- `GET /api/rocks` returns `has_journey`: the rock has at least one public journey stop, per `utils/visibleJourneySql.js`, the same rule the journey popup itself uses.
- The Rock column (still first) shows the number as a link when `has_journey` is set, opening `RockJourneyDialog` like the Activity page's Rock Journeys panel. Rocks without a public journey are plain text. Same link style as the Activity page's `.linkButton`.
- A rock whose only stops are hidden or still processing isn't clickable until one publishes; it updates on the next page load.
- **VERSION:** `0.18.15` → `0.18.16`.

## Phase 18 — "View journey" link in the Edit Rock dialog (2026-10-19)
**Status:** Complete (awaiting manual UI check)
**Files changed:** `client/src/admin/pages/rocks/rock-create-edit-dlg/RockCreateEditDlg.jsx` (+ `.module.css`), `VERSION`
- Edit Rock shows a "View journey" link beside the rock's photo when `has_journey` is set, opening the same `RockJourneyDialog` as the table's Rock # link. It's rendered as a sibling of the edit Dialog (like `RockRequestInfoDialog`) so it stacks on top, and only while the edit dialog is open.
- **VERSION:** `0.18.16` → `0.18.17`.

## Phase 19 — Any status change fills an empty date (2026-10-19)
**Status:** Complete
**Files changed:** `server/src/routes/rocks.js`, `server/tests/api/admin-crud.test.mjs`, `client/src/admin/pages/rocks/rock-create-edit-dlg/RockCreateEditDlg.jsx`, `VERSION`
- Changing to keep or unknown now fills in today when the Assigned date is empty, and keeps a date that's already set. Assigned still stamps today when the rock wasn't already assigned. Available still clears the date (confirmed with the user).
- Same rule in the table dropdown (`PATCH .../assign-status`) and the Edit Rock dialog's Status select.
- **VERSION:** `0.18.17` → `0.18.18`.
