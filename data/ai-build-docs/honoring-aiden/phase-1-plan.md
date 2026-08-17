# Honoring Aiden — Phase 1: Entries, Journal Templates & In-Context Admin Editing

## Context
`data\ai-build-docs\honoring-aiden\summary-issue-log.md` already has two prior-session entries: Phase 1 briefly wired this page as a `page_content`-backed rich text page (like Home/Birthdays), then Phase 2 (same session) replaced that with the current shell — a left sidebar (desktop sticky, mobile hamburger drawer) routing to 5 placeholder sub-pages, content fully code-owned, admin rich-text editing explicitly removed. **Read that log before starting.**

This phase replaces the placeholder shell's static content with a real, admin-managed content model: entries (nav items, each its own page) containing ordered journal entries (templated blocks of text/image/gallery/video), while keeping the existing sidebar/drawer shell as-is. Public comments were discussed as a future addition to each entry page but are explicitly out of scope here — see `backlog.md` in this same folder. The page layout must still reserve a distinct section for them so that later addition is additive, not a rebuild.

## What already exists — read before writing anything
- `client\src\pages\honoring-aiden\HonoringAiden.jsx` — sidebar + nested `<Routes>`, one `SubPage` per menu item, index route with a "select a topic" prompt.
- `client\src\pages\honoring-aiden\HonoringAiden.module.css` — this page's own established z-index tiers: mobile drawer 1050, backdrop 1040 (sits between the navbar's 1100 and ordinary page content's 1000 per the app's global convention). Do not renumber these; new admin edit-modal chrome should use the app's modal tier (~2000), not these.
- `client\src\pages\honoring-aiden\honoringAidenMenuItems.js` — static placeholder `[{slug, label}]` array. **This file is replaced** by an API-backed entries list in this phase.
- `client\src\App.jsx` — `/honoring-aiden/*` already routed.
- TipTap + DOMPurify + `<RichText>` + `componentRegistry.js` — built for the Page Details feature (`data\ai-build-docs\video-addon\page-details-feature-plan.md`, Phases 4–5). Already an installed, working dependency. **Reuse this for journal_entry text items — do not add a second rich text editor.** Confirm during implementation whether the existing TipTap editor build can be reused as-is (it may be coupled to `page_content` draft/save calls) or needs a thin wrapper; note whichever it is in the issue log.
- `server\src\utils\convert-to-webp\convertToWebP.js` + `createThumbnails.js` — existing image processing, built for rock uploads.
- `server\src\utils\probeVideo.js`, `processVideo.js`, `isVideoFile.js` — existing video processing (poster frame + duration), built for the Albums video-support feature.
- Existing admin CRUD screens (`client\src\admin\pages\journey\`, `\rocks\`, `\albums\`, `\music\`) all follow a **list page + create/edit dialog** pattern. **This phase deliberately does not follow that pattern** (see "Admin editing model" below) — flag this explicitly in the issue log as a new UI pattern for the app, not an oversight.

## Decisions locked in
- **Content model:** `entry` (a nav item / page) → `journal_entry` (ordered templated blocks within an entry) → `journal_entry_item` (the actual content per template slot: text, image, gallery, or video).
- **Templates are fixed in code, not DB-driven**, but designed to be easy to add to. Each template is its own component + CSS Module; mobile reflow is handled via flexbox `order` on the same markup wherever possible (e.g. image-left/text-right → image-top/text-below), rather than maintaining separate desktop/mobile component trees. Only build a structurally distinct mobile variant if a future template's mobile needs are more than a reflow.
- **Two initial templates:** `image-left-text-right`, `image-top-text-below`.
- **Item types:** `text` (rich text, via existing TipTap/RichText), `image`, `gallery` (multiple images), `video`.
- **Media uploads get a new, dedicated direct-upload endpoint** — one file in, processed immediately (WebP conversion for images, ffmpeg poster-frame + duration probe for video, reusing the existing utils above). Not routed through the Albums folder-sync pipeline (built for bulk album management, wrong shape for a single in-modal upload) and not the rock-journey async pipeline (built for a different multi-stage flow with an intentional visibility gap — not needed here since these uploads are processed synchronously before the item is saved).
- **Soft delete:** `entry` and `journal_entry` get an `archived` boolean. Admin delete sets this flag rather than removing the row, given how emotionally costly an accidental loss would be here.
- **Admin editing model: in-context, not a separate list/form screen.** The public page renders normally; when an admin session is active (existing `AuthContext` stub, no changes to auth), each block — sidebar entries, title section, each journal entry, each item — gets a hover edit-affordance layer (pencil / drag handle / trash), plus "+" affordances (bottom of sidebar for a new entry, between/after journal entries for a new one). Clicking pencil or "+" opens a modal with the real form (entry fields; or template picker + per-slot item editors — image/video upload, gallery uploader, or the RichText box). The admin never sees a separately laid-out preview — what they see while editing is what visitors see.
- **Comments:** out of scope for this phase entirely (schema, API, UI). The entry detail page must still render a distinct, separately-composed section at the bottom of the layout for it — even if it renders nothing (or a static placeholder) — so it's a pure addition later, not a layout change.
- **Auth:** matches the existing (unprotected) admin route pattern used elsewhere in this app. Not something to fix as part of this feature.

## Data model
```sql
CREATE TABLE entry (
    id            serial PRIMARY KEY,
    slug          varchar(255) UNIQUE NOT NULL,
    title         varchar(255) NOT NULL,
    entry_date    date NULL,              -- optional, display-only, not the sort key
    sort_order    integer NOT NULL DEFAULT 0,
    published     boolean NOT NULL DEFAULT false,
    archived      boolean NOT NULL DEFAULT false,
    cover_image   varchar(500) NULL,
    created_at    timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at    timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_entry (
    id            serial PRIMARY KEY,
    entry_id      integer NOT NULL REFERENCES entry(id),
    template_type varchar(100) NOT NULL,   -- matches a key in the code template registry
    sort_order    integer NOT NULL DEFAULT 0,
    archived      boolean NOT NULL DEFAULT false,
    created_at    timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at    timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_entry_item (
    id                serial PRIMARY KEY,
    journal_entry_id  integer NOT NULL REFERENCES journal_entry(id),
    item_type         varchar(20) NOT NULL,   -- 'text' | 'image' | 'gallery' | 'video'
    position          integer NOT NULL DEFAULT 0,  -- maps to the template's slot order
    body_html         text NULL,          -- 'text' items: TipTap output, sanitized at render
    media_path        varchar(500) NULL,  -- 'image'/'video' items
    media_poster_path varchar(500) NULL,  -- 'video' items: extracted poster frame
    media_duration    integer NULL,       -- 'video' items: seconds
    created_at        timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_entry_item_image (
    id                    serial PRIMARY KEY,
    journal_entry_item_id integer NOT NULL REFERENCES journal_entry_item(id),
    media_path            varchar(500) NOT NULL,
    position              integer NOT NULL DEFAULT 0
);
```
`journal_entry_item_image` only gets rows for `item_type = 'gallery'` items — mirrors the existing `journey_image` one-row-per-image pattern rather than an array/JSON column, for consistency with how this codebase already models image collections.

## Migration & production replication — read before writing any SQL
This app runs pglogical replication across 2 Postgres nodes (provider + subscriber); DDL is **not** replicated automatically, and Claude CLI must **never run SQL against a live/production database** — produce files for the human to run by hand. Follow the established two-step process (see `data\ai-build-docs\album-tags\album-tags-feature-plan.md`, "Prod migration note"):
1. `CREATE TABLE` statements — run manually, identically, on both prod nodes.
2. `pglogical.replication_set_add_table('default', '<table>', synchronize_data := false)` for each of the 4 new tables, run on both nodes.

Deliverables:
- `data\sql\createdb.sql` — add the 4 new `CREATE TABLE` blocks so a fresh install matches the migrated steady state.
- A new file under `data\sql\migrations\` (idempotent, safe to re-run) with the same DDL for manual application to existing databases.
- **Investigate before assuming no other file needs changes** (same diligence as `data\ai-build-docs\video-addon\Add_Video.txt`):
  - `data\sql\droptables.sql` — likely needs the 4 new table names added for a full reset.
  - `data\sql\restorebackup.sql` — check whether it does column/table-explicit statements that would need the new tables added.
  - `data\sql\pglogical.sql` — confirm it defines replication sets by table (it should, per the album-tags precedent) and add the 4 new tables.
  - `data\sql\sequenceOffset.sql` — check whether the new tables' `serial` sequences need including.
  Report findings for each file individually before making changes, don't bundle silently.

## API surface
Public:
- `GET /api/honoring-aiden/entries` → `[{slug, title, entry_date, sort_order}]`, filtered to `published = true AND archived = false`, ordered by `sort_order`. Replaces `honoringAidenMenuItems.js` as the sidebar's data source.
- `GET /api/honoring-aiden/entries/:slug` → entry detail plus its ordered, non-archived `journal_entry` rows, each with its ordered `journal_entry_item` rows (and nested `journal_entry_item_image` rows for gallery items).

Admin (match existing route conventions, e.g. `pages.js`/`pagesAdmin.js`; no new auth):
- `GET /api/admin/honoring-aiden/entries` → all entries, including unpublished/archived.
- `POST /api/admin/honoring-aiden/entries` / `PUT /api/admin/honoring-aiden/entries/:id` → create/update.
- `PATCH /api/admin/honoring-aiden/entries/:id/archive` → soft delete.
- `PATCH /api/admin/honoring-aiden/entries/reorder` → bulk `sort_order` update for drag reordering.
- `POST /api/admin/honoring-aiden/entries/:id/journal-entries` / `PUT /api/admin/honoring-aiden/journal-entries/:id` → create/update a journal entry and its items.
- `PATCH /api/admin/honoring-aiden/journal-entries/:id/archive` → soft delete.
- `PATCH /api/admin/honoring-aiden/journal-entries/reorder` → bulk `sort_order` within an entry.
- `POST /api/admin/honoring-aiden/media` → the new direct-upload endpoint (see below); returns the processed path(s) to attach to an item.

## Media direct-upload endpoint
One file per request. Images: convert to WebP + thumbnail via the existing `convert-to-webp` utils. Video: extract poster frame + probe duration via the existing `probeVideo.js`/`processVideo.js` utils. Synchronous — the response includes the final path(s), and the admin modal only lets the item be saved once upload finishes (no async background-processing gap here, unlike the rock-journey pipeline).

## Template registry & initial templates
A small code registry (e.g. `client\src\pages\honoring-aiden\templates\journalEntryTemplates.js`) mapping `template_type` → `{ label, expectedSlots: [{ itemType, position }], component }`. Each template component owns its CSS Module, laid out with flexbox and `order` so the same markup reflows for mobile. Build `image-left-text-right` and `image-top-text-below` for this phase; adding a third template later should only mean a new registry entry + component, no changes elsewhere.

## Front-end: public page
- Sidebar/drawer shell stays as-is; swap its data source from `honoringAidenMenuItems.js` to `GET /api/honoring-aiden/entries`.
- Each `SubPage` becomes a real entry detail component: title section (title + `entry_date` if set) → journal entries rendered via their template component in `sort_order` → a distinct, separately-rendered comments section boundary (empty/placeholder for this phase).

## Front-end: admin in-context editing
Edit-affordance wrapper components render only when `AuthContext` shows an active admin session — pencil/drag/trash on sidebar entries, the title section, each journal entry, and each item slot; "+" affordances for adding new entries/journal entries. All editing happens through modals with real form fields (template + per-slot item editors), not inline `contentEditable`. This is new UI for the app (existing admin screens are list+dialog) — build it as its own thing under `client\src\pages\honoring-aiden\` rather than retrofitting the existing `client\src\admin\pages\...` list-page pattern.

## Explicitly out of scope for this phase
- Comments — schema, API, UI (see `backlog.md`).
- Any new rich text editor dependency — none needed.
- Auth changes — matches existing unprotected admin pattern.
- Albums sync pipeline and rock-journey async upload pipeline — untouched, not reused.
- Template-switch UX for a journal entry that already has items — not needed until a second real use case shows up (also in `backlog.md`).

---

## Instructions for Claude CLI (hand off in phases, stop after each and wait)

### Phase 1a — Investigation
Read `summary-issue-log.md`, `data\ai-build-docs\video-addon\page-details-feature-plan.md` (TipTap/RichText/DOMPurify shape), and the 5 SQL files under `data\sql\` per "Migration & production replication" above. Report back: whether the existing TipTap editor build is reusable as-is or needs a wrapper, and what (if anything) each of the 5 SQL files needs. Do not write code yet.

### Phase 1b — DB migration files
Produce (don't run) the `createdb.sql` update and the new idempotent migration file, plus any changes identified in Phase 1a for `droptables.sql`/`restorebackup.sql`/`pglogical.sql`/`sequenceOffset.sql`, called out individually with reasoning.

### Phase 1c — Backend CRUD routes
Public + admin endpoints per "API surface," following existing route file conventions (e.g. `pages.js`/`pagesAdmin.js`). Raw SQL via the existing `pg.Pool` pattern — no Prisma.

### Phase 1d — Media direct-upload endpoint
Per "Media direct-upload endpoint" above, reusing the existing WebP/video utils rather than reimplementing them.

### Phase 1e — Template registry + initial templates
The registry plus the two named templates, each with its own CSS Module and `order`-based mobile reflow.

### Phase 1f — Public page wiring
Replace `honoringAidenMenuItems.js` with the API-backed sidebar; build the real entry detail component (title → journal entries via template → empty comments-section placeholder).

### Phase 1g — Admin in-context editing
Edit-affordance wrappers, modals, drag reorder, add/archive — per "Front-end: admin in-context editing."

### Notes for Claude CLI throughout
- No test suite exists — don't scaffold one, but flag in the issue log anywhere a test would clearly catch regressions (e.g. template slot validation, sanitization allowlist reuse).
- If any UI verification would help confirm a phase works, ask the human before running automated browser checks.
- Flag any dependency this phase turns out to need beyond what's already installed — none are expected, but confirm before installing anything.
- Append an entry to `summary-issue-log.md` after each sub-phase using the established format (status, files changed, summary, deviations, issues/gotchas, open questions).
