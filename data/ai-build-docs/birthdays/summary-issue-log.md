# Birthdays Page — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phase 1 — Birthdays page (2026-07-06)
**Status:** Complete
**Files changed:**
- New: `client/src/pages/birthdays/Birthdays.jsx`, `client/src/pages/birthdays/Birthdays.module.css`, `client/src/components/birthday-albums/BirthdayAlbums.jsx`, `data/sql/migrations/add_birthdays_page.sql`
- Changed: `client/src/components/photo-album/PhotoAlbum.jsx`, `client/src/App.jsx`, `client/src/adminContent/pagePaths.js`, `client/src/admin/pages/pages/PagesAdmin.jsx`, `data/sql/createdb.sql`

**Summary:**
- **Discovery (Step 0):** confirmed all four assumptions before building — see deviations below for the two that needed small implementation details filled in, and the open item for #4.
- **DB:** new migration `add_birthdays_page.sql` inserts a `birthdays` row into `page_content` (`nav_label`: "Birthdays", `visible`: true, `draft_body`/`published_body` seeded with placeholder copy) at `order_num = 3`, and shifts `track-the-rocks`/`map`/`sudc` from `3/4/5` to `4/5/6` to make room immediately after Photos (`order_num = 2`). Guarded by an existence check on the `birthdays` row (not just `ON CONFLICT DO NOTHING`) so the renumbering half can't double-apply on a re-run. `createdb.sql`'s fresh-install seed updated to match the same final ordering (home 0, share-your-rock 1, photos 2, birthdays 3, track-the-rocks 4, map 5, sudc 6). Applied for real to the local dev DB (not a dry run) to test end-to-end, per this session's established practice — verified via `psql` that final ordering and seed body are correct.
- **`PhotoAlbum.jsx`:** added a `tag = "main"` prop (default preserves `Photos.jsx`'s exact current behavior unmodified) and templated it into the fetch URL instead of the hardcoded `?tag=main`, so the same component serves both pages without duplicating the grid/lightbox logic.
- **`BirthdayAlbums.jsx`:** new component mirroring the `selectedAlbum` toggle logic already inline in `Photos.jsx`, but as its own reusable piece — renders `PhotoAlbum tag="birthday"` or `PhotoCollection` for the selected album. No new grid/lightbox code; both come from the existing `photo-album` components.
- **`Birthdays.jsx`:** `<ContentBody><RichText/></ContentBody>` (via `usePageContent("birthdays")`, same pattern as Home/Sudc) followed by `<BirthdayAlbums />` as a sibling, outside `ContentBody` — matches the plan's explicit instruction that the album grid stay code-owned, not part of the editable rich-text body. No banner (unlike Sudc), no page-specific background (unlike Sudc's navy treatment) — closer to Home/Photos' plain-page look. `Birthdays.module.css` created empty per the plan's file list, matching `Home.module.css`'s existing precedent of an unused placeholder stylesheet (not imported, since nothing page-specific needs styling yet).
- **Routing/nav:** `/birthdays` route added to `App.jsx` alongside the other page routes, positioned in the route list right after `/photos` for readability (route order itself has no bearing on nav order, which is DB-driven). `pagePaths.js` got an explicit `birthdays: "/birthdays"` entry, matching the existing convention of every slug having an explicit mapping even when it matches the `/${slug}` fallback.
- **Admin:** `PagesAdmin.jsx`'s `EDITABLE_SLUGS` allowlist extended to include `"birthdays"` so the Edit/Publish/Discard Draft buttons appear for it (the listing itself was already generic — this was the one hardcoded piece, per the plan's own anticipation of this in Step 0 item 2).

**Deviations from plan:**
1. Step 0 assumption #1 (nav mechanism) was confirmed as (b) — Photos already has a nav-only `page_content` row. But "insert immediately after Photos" isn't a pure insert: `track-the-rocks`/`map`/`sudc` all needed their `order_num` shifted up by one to open a slot at `3`. Handled in the same migration as the insert, guarded against double-application (see DB section above).
2. Step 0 assumption #2 (admin `/admin/pages` screen genericity) was confirmed true for the *listing* (iterates `page_content` generically), but a separate hardcoded `EDITABLE_SLUGS` allowlist gates which rows get Edit/Publish/Discard buttons. `"birthdays"` needed adding to that set — anticipated by the plan's own phrasing ("if it's hardcoded, it'll need a small update"), not a surprise.

**Issues/gotchas encountered:**
- None technical. Verified end-to-end against the real running stack (through nginx, not just build/lint): `GET /api/pages` returns all 7 rows in the correct shifted order; `GET /api/pages/birthdays/content` returns the seeded placeholder body; `GET /api/admin/pages` lists the `birthdays` row generically with full draft/published bodies; `GET /api/albums/?tag=birthday` returns `[]` (correct — no albums tagged yet, see open question). Lint: `npm run lint` inside the client container shows 27 pre-existing errors across unrelated files, none in any file this phase touched or created (confirmed the one arguable overlap, `PhotoAlbum.jsx`'s line-45 `no-empty-pattern` error, predates this session via `git stash` + re-lint). Build: clean, 2141 modules (up from 2138 in the prior feature's last phase — confirms the 3 new files are genuinely reachable, not just compiled in isolation).
- Did not run automated browser verification (Playwright/chromium click-through) per `CLAUDE.md`'s explicit UI-verification workflow — asking first, as instructed, rather than launching it unprompted.

**Open questions for human review:**
1. **No albums are tagged `birthday` yet** (checked the dev DB directly: 6 albums exist, none tagged `birthday`) — the grid will render empty until you tag at least one album via the admin Albums screen. Per the plan, flagging rather than assuming test data exists.
2. Should I run an automated browser check (dev server + Playwright) now, or would you rather do your own manual pass first per the usual workflow?

**When done — confirmations:**
- Birthdays appears in the nav directly after Photos (confirmed via live `GET /api/pages`: order 0–6 = home, share-your-rock, photos, birthdays, track-the-rocks, map, sudc).
- The page's `ContentBody` renders the seeded placeholder copy (confirmed via live `GET /api/pages/birthdays/content`).
- The album grid calls the existing tag-filtered endpoint with `?tag=birthday` and will show only `birthday`-tagged albums once at least one exists (confirmed the endpoint itself works correctly — currently empty, see open question 1).
- The admin `/admin/pages` screen lists Birthdays and now offers Edit/Preview/Publish/Discard Draft for it, same as Home/Share Your Rock/SUDC (confirmed via live `GET /api/admin/pages` and the `EDITABLE_SLUGS` update).
