# Birthdays page — single phase

## Context
New public page, `Birthdays`, added to the nav after `Photos`. Structure:
`<ContentBody><RichText/></ContentBody>` (admin-editable copy, same pattern as
Home/Sudc) followed by a grid of albums tagged `birthday`, reusing the album
tag filtering built in the `album-tags` feature. No banner on this page.

Read these before starting, for background on the two systems this feature
builds on top of:
- `data\ai-build-docs\summary-issue-log.md` (Page Details / editable content feature)
- `data\ai-build-docs\album-tags\summary-issue-log.md` (album tag filtering feature)

This phase creates `data\ai-build-docs\birthdays\summary-issue-log.md` fresh.

## Step 0 — Discovery (do this first, report findings before proceeding)

A few things this plan assumes but can't confirm without reading the current
code. Check each, and if reality diverges from the assumption, stop and flag
it in your response before continuing to build — don't silently route around
a mismatch:

1. **Nav mechanism.** The Page Details feature wired the navbar to fetch
   `GET /api/pages` and render `visible:true` rows by `order_num`. But
   `Photos` was explicitly excluded from the `page_content` table in that
   feature (it has no editable body). So confirm: how does `Photos` actually
   appear in the nav today? Likely one of — (a) navbar merges a hardcoded
   Photos entry with the fetched page_content list, or (b) Photos also has a
   `page_content` row (nav_label/order_num only, body unused/ignored), or
   (c) something else. Whatever it is, `Birthdays` needs to follow the same
   mechanism Photos uses, inserted immediately after it.
2. **Admin `/admin/pages` screen.** Confirm it lists `page_content` rows
   generically (iterates the table) rather than hardcoding "the three pages"
   from when it was originally built. If it's hardcoded, it'll need a small
   update so the new `birthdays` row actually shows up there for editing.
3. **Album tag filter genericity.** Confirm the album fetch endpoint's `tag`
   query param is a genuine passthrough filter, not hardcoded/allowlisted to
   `'main'` on the backend. `Photos.jsx` calls it with `?tag=main` — confirm
   the same endpoint works unmodified with `?tag=birthday`.
4. **`birthday` tag exists.** Per the human, `birthday` is already assignable
   as an album tag in the admin Albums screen — confirm at least one album is
   (or can be) tagged that way for testing, but don't assume test data exists;
   ask the human to tag one if none are.

## Step 1 — DB
Add a `birthdays` row to `page_content`:
- `nav_label`: "Birthdays"
- `order_num`: positioned immediately after Photos' entry, whatever that
  value turns out to be per Step 0 finding #1
- `visible`: true
- `draft_body` / `published_body`: seed with simple placeholder copy (a
  sentence or two — the human will rewrite it via the admin editor after this
  ships), not empty, so `ContentBody` isn't blank on first load

## Step 2 — Birthdays.jsx + Birthdays.module.css
New page component, modeled on the post-refactor `Sudc.jsx` but simpler
(no banner):
```jsx
<ContentBody>
  <RichText html={content.body} />
</ContentBody>
<BirthdayAlbums />
```
using `usePageContent('birthdays')` for `content`. Match existing page
component conventions (file location under `client/src/pages/Birthdays/`,
CSS Modules, same general layout spacing as other pages).

## Step 3 — Album grid
Build `BirthdayAlbums` (or reuse/extend whatever `Photos.jsx` already uses —
`PhotoAlbum`/`PhotoCollection` — rather than writing a new grid component from
scratch). It should call the same album-fetching endpoint Photos uses, but
with `?tag=birthday` instead of `?tag=main`. Sits outside `ContentBody`, so
it's code-owned, not part of the editable rich-text body.

## Step 4 — Routing + nav insertion
Add the `/birthdays` route alongside the other page routes. Insert the nav
entry after Photos using whatever mechanism Step 0 confirmed Photos itself
uses — don't invent a second, different mechanism just for this page.

## Out of scope for this phase
- No changes to the album-tags backend/filtering logic itself — only a new
  consumer of the existing `tag` param.
- No changes to how `Photos.jsx` works.
- No new TipTap registry components — plain rich text only, same as Sudc.

## Constraints
- No new dependencies expected — if anything comes up mid-phase, stop and ask
  before installing.
- No test suite exists — don't add one, but note in the issue log if a test
  around the tag-filter reuse or nav insertion logic would be valuable.
- Ask the human before running any automated browser verification — they'll
  check the new page and nav placement visually.
- Match existing code conventions (raw SQL via `server/src/db`, no Prisma;
  CSS Modules; existing route file conventions in `server/src/routes` if any
  new endpoint work turns out to be needed, though none is expected).

## Issue log
Create `data\ai-build-docs\birthdays\summary-issue-log.md` and append an
entry after this phase: status, files changed, summary, any deviations from
this plan (especially anything from Step 0 that didn't match the assumptions
above), issues/gotchas encountered, and open questions for human review.

## When done
Confirm: Birthdays appears in the nav directly after Photos, the page renders
placeholder ContentBody copy correctly, the album grid shows only
`birthday`-tagged albums, and the admin `/admin/pages` screen lets the human
edit the Birthdays body text. Append the issue log entry and stop.
