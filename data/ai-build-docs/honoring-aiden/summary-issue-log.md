# Honoring Aiden page

## Context
New public page, "Honoring Aiden", requested by the human with the same
edit/preview/publish/discard-draft workflow as the other CMS pages
(Home/Share Your Rock/SUDC/Birthdays). Modeled directly on the `birthdays`
feature (`data\ai-build-docs\birthdays\`), which is the most recent precedent
for adding a nav page backed by `page_content`.

## Decisions (asked of the human up front)
- **Nav position:** immediately after Birthdays (order_num 4), pushing
  Track The Rocks/Map/SUDC each up one slot (5/6/7).
- **Layout:** no banner — plain `ContentBody` + rich text only, same shape as
  Birthdays minus the album grid.
- **Initial content:** short placeholder ("More about Aiden, coming soon.")
  seeded into both `draft_body` and `published_body`; the human will replace
  it via the admin editor (`/admin/pages` → Edit → Publish).

## Status: implemented, DB migration not yet applied
Client-side wiring is done. The SQL migration
(`data\sql\migrations\add_honoring_aiden_page.sql`) exists but has **not**
been run against any database — no migration runner exists in this repo
(confirmed: no `server` code references `data/sql/migrations`), so it's
applied manually. The human needs to run it against dev/prod before the page
shows up in the nav or the admin Page Details table.

## Files changed
- `data\sql\migrations\add_honoring_aiden_page.sql` — new migration: shifts
  `track-the-rocks`/`map`/`sudc` order_num +1, inserts `honoring-aiden` row.
- `data\sql\createdb.sql` — fresh-install schema updated to the same steady
  state (order_nums renumbered, `honoring-aiden` row added), so a clean
  install matches a migrated one.
- `client\src\pages\honoring-aiden\HonoringAiden.jsx` — new page component,
  `usePageContent("honoring-aiden")` + `ContentBody` + `RichText`, no banner.
- `client\src\App.jsx` — added `/honoring-aiden` route.
- `client\src\adminContent\pagePaths.js` — added `honoring-aiden` → path
  mapping (used by nav rendering and the admin Preview link).
- `client\src\admin\pages\pages\PagesAdmin.jsx` — added `honoring-aiden` to
  `EDITABLE_SLUGS` so Edit/Publish/Discard Draft show up for it in
  `/admin/pages`.

## Deviations from the birthdays precedent
- No new component analogous to `BirthdayAlbums` — the human explicitly
  wants a blank page for now, nothing else added.
- No CSS module created — the page has no page-specific styling beyond what
  `ContentBody` already provides (same as `Birthdays.jsx`, which also has an
  unused `.module.css` file sitting next to it from before its own
  simplification — not replicated here).

## Verified
- `npm run lint` in `client/` — the new files introduce zero lint errors
  (all 29 pre-existing errors reported are in unrelated files, untouched by
  this change).
- Backend routes (`server/src/routes/pages.js`, `pagesAdmin.js`) are fully
  slug-generic already — confirmed no hardcoded page list needed updating.

## Open questions for human review
- Migration needs to be run manually against dev and prod databases.
- Automated browser verification wasn't run (per CLAUDE.md, ask before
  doing that) — human should confirm the page renders and the nav order
  looks right after migrating.

## Phase 2 — sidebar layout (same session, follow-up request)
The human decided the page should diverge from the other CMS pages: a left
sidebar menu (always visible on desktop, hamburger/slide-out drawer on
small screens), with 5 items that each route to their own sub-page.
Admin rich-text editing for this page is explicitly out of scope for now —
only the existing Active/Inactive visibility toggle applies, same as the
`photos`/`track-the-rocks`/`map` rows that have no CMS body.

Decisions (asked up front): 5 items seeded as generic placeholders
("Item 1"–"Item 5", slugs `item-1`–`item-5`) to be renamed later; each
item's sub-page is a placeholder ("Content coming soon."); routes nest
under `/honoring-aiden/...`; mobile menu is a hamburger-triggered slide-out
drawer over the content (matches `Navbar.jsx`'s own mobile pattern).

### Files changed (phase 2)
- `client\src\admin\pages\pages\PagesAdmin.jsx` — reverted the phase-1
  addition of `honoring-aiden` to `EDITABLE_SLUGS`; the page no longer has
  admin-editable rich text, so Edit/Publish/Discard Draft shouldn't show for
  it (Active/Inactive toggle still works via the existing generic
  `/api/admin/pages/:slug/visible` route, unaffected).
- `client\src\pages\honoring-aiden\HonoringAiden.jsx` — rewritten as a
  layout: sidebar (desktop always-visible via `position: sticky`, mobile
  off-canvas drawer) + a nested `<Routes>` rendering one `SubPage` per menu
  item, plus an index route with a "select a topic" prompt. No longer uses
  `usePageContent`/`ContentBody`/`RichText` — content is fully code-owned,
  same pattern as `Photos.jsx`/`TrackTheRocks.jsx`.
- `client\src\pages\honoring-aiden\HonoringAiden.module.css` — new, styled
  to match the site's existing card look (white/90%-opacity panels, rounded
  corners, soft shadow, teal accent `rgba(110, 183, 216, 1)`). Mobile
  drawer/backdrop use z-index 1050/1040 — between the navbar's 1100 and
  ordinary page content's 1000, per the app's established tiers. The
  `.page` wrapper deliberately has no `position`/`z-index` of its own so the
  fixed-position drawer isn't capped by an ancestor stacking context (the
  footgun called out in CLAUDE.md).
- `client\src\pages\honoring-aiden\honoringAidenMenuItems.js` — new, the 5
  placeholder `{slug, label}` entries, imported by both the sidebar and the
  route list so they can't drift out of sync.
- `client\src\App.jsx` — route changed from `/honoring-aiden` (exact) to
  `/honoring-aiden/*` so the nested item routes match.

### Verified (phase 2)
- `npm run lint` in `client/` — zero new errors from the changed/added files.

### Open questions (phase 2)
- Real menu item labels and per-item content still needed from the human.
- Top nav's "active" highlighting only exact-matches `/honoring-aiden`
  (see `Navbar.jsx`'s `location.pathname === path`), so it won't stay
  highlighted while on `/honoring-aiden/item-1` etc. Not addressed — flag
  if that's undesired.
- Automated browser verification still not run — ask before doing so.
