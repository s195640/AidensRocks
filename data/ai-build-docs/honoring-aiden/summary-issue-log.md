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
- Real page copy is still a placeholder — write the actual "Honoring Aiden"
  content via the admin editor when ready.
- Automated browser verification wasn't run (per CLAUDE.md, ask before
  doing that) — human should confirm the page renders and the nav order
  looks right after migrating.
