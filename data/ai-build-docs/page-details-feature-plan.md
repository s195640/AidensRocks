# Page Details Feature — Design & Claude CLI Instructions

## What this covers
An admin screen ("Page Details") for editing the body content of specific public pages (Home, Sudc, Share Your Rock — Photos excluded, no existing content to convert) and toggling any page's visibility in the nav. Content edits go through draft → preview → publish; visibility is instant.

## Decisions locked in
- **Visibility** (show/hide in nav) is instant — a live boolean, no draft/preview step. Free to remove/hide anything; preview is the safety net before publishing content changes, not a publish-time warning system.
- **Content** is a single rich-text `body` field per page (not several named fields) — this is what makes the system extend cleanly to future pages without new schema/field decisions each time.
- Rich text is **true WYSIWYG via TipTap** (not markdown) — the person editing isn't tech-savvy and needs to see bold/italic look like bold/italic while typing, not `**syntax**`.
- TipTap stores **HTML**. It's sanitized via `DOMPurify` immediately before rendering, in one shared `<RichText>` component used by both the public page and the admin preview — one sanitization path, not two.
- **Functional elements** (the "Upload Your Rock" button, the upload-triggering text link, the Facebook link+icon) are not stored as raw HTML — they're portable **component chips** inserted via a registry, so a non-technical editor can reword and reposition surrounding text without breaking a click handler or losing a React icon component.
- Preview renders the real public page in a new tab via `?preview=1`, reusing the actual page components rather than a parallel renderer — and functional components in preview are **fully live** (same behavior as production), not disabled — so preview also verifies "does the button still work" for free.
- Album-embed-style insertion (linking to a specific photo album from within body text) is **deferred** — not needed for the three in-scope pages — but the registry+config-fields mechanism below makes it a same-day addition later, not a new system.

## Data model

```sql
CREATE TABLE page_content (
    page_slug       varchar(100) PRIMARY KEY,   -- 'home', 'sudc', 'share-your-rock'
    nav_label       varchar(255) NOT NULL,
    order_num       integer NOT NULL DEFAULT 0,
    visible         boolean NOT NULL DEFAULT true,
    draft_body      text NOT NULL DEFAULT '',
    published_body  text NOT NULL DEFAULT '',
    updated_at      timestamptz DEFAULT CURRENT_TIMESTAMP,
    published_at    timestamptz
);
```

One row per page. `text`, not JSONB — since there's only ever one editable HTML blob per page now, JSONB's per-field flexibility isn't needed. `nav_label`/`order_num` are set via seed/migration and are **not** exposed as editable in the admin UI yet (only `visible` gets a live toggle) — reordering/renaming nav items via the admin screen is a small additive feature later if wanted, not part of this build.

Publish = `UPDATE page_content SET published_body = draft_body, published_at = now() WHERE page_slug = $1`. Discard draft = the reverse copy.

## Component registry (functional elements inside body content)

A single file, e.g. `client/src/adminContent/componentRegistry.js`:

```js
{
  "upload-rock-button": {
    label: "Upload Your Rock (button)",
    component: UploadRockButton,
    pages: ["share-your-rock"],
    configFields: [],   // no arguments needed
  },
  "upload-rock-link": {
    label: "Upload Your Rock (text link)",
    component: UploadRockLinkTrigger,
    pages: ["share-your-rock"],
    configFields: [],
  },
  "facebook-link": {
    label: "Facebook Link",
    component: FacebookLink,
    pages: ["share-your-rock"],
    configFields: [],
  },
}
```

This is the one source of truth for: what shows up in the editor's "Insert" dropdown (filtered by current page slug), and what the render-time hydration pass mounts. No separate list to keep in sync.

**Adding a new functional component later** (code-only, no editor UI needed): write the component normally, add one registry entry with a `key`/`label`/`pages`. Nothing else changes — not the TipTap node, not the insert-menu UI, not the sanitizer config.

**Components that take arguments** (e.g. a future album-link): add a `configFields` array describing the inputs (`{ key, label, type }`). Non-empty `configFields` makes the "Insert" action open a small popup collecting those values before the chip is placed; clicking an existing chip reopens the same popup pre-filled, for editing. Example:

```js
"album-link": {
  label: "Link to an Album",
  component: AlbumLink,
  pages: null,   // available on every page
  configFields: [
    { key: "albumSlug", label: "Album", type: "select", optionsSource: "albums" },
    { key: "linkText", label: "Link text", type: "text" },
  ],
}
```

**Storage format:** a chip serializes as `<div data-component="upload-rock-button" data-props='{}'></div>` (or with a populated JSON blob in `data-props` for configurable ones). Using one `data-props` JSON attribute for all components — rather than a bespoke attribute per component — means the DOMPurify allowlist only ever needs `data-component` and `data-props`, regardless of how many registry entries get added later.

**Known limitation to write down, not solve now:** if a component's expected prop shape changes after it's already been placed on a page, previously-stored `data-props` blobs won't auto-migrate. Not a problem today; worth remembering if a registry entry's contract changes later.

## Modal-triggering state: page-scoped context, not local `useState`

Today `ShareYourRock.jsx` owns `const [showForm, setShowForm] = useState(false)` right beside the button that sets it. Once that button is a portable chip that could be moved anywhere in the body text (or reused on a different page), it can't depend on being positioned next to that state. Fix: a small page-scoped `UploadRockModalProvider` context; both `UploadRockButton` and `UploadRockLinkTrigger` call `useUploadRockModal().open()` instead of a locally-owned setter. Behavior is identical to today — this only decouples the trigger from its position in the text.

## API surface

Public:
- `GET /api/pages` → `[{slug, nav_label, order_num, visible}]`, filtered to `visible = true`, ordered by `order_num`. Navbar uses this instead of a hardcoded list.
- `GET /api/pages/:slug/content` → `published_body` for that page.

Admin:
- `GET /api/admin/pages` → everything, all pages, draft + published + visible.
- `PATCH /api/admin/pages/:slug/visible` → flips `visible` immediately.
- `PUT /api/admin/pages/:slug/draft` → saves edits to `draft_body`.
- `GET /api/admin/pages/:slug/preview` → returns `draft_body` in the same shape as the public content endpoint.
- `POST /api/admin/pages/:slug/publish` → copies `draft_body` → `published_body`, sets `published_at`.

## Front-end pattern

- `usePageContent(slug)`: fetches `/api/pages/:slug/content` normally, or `/api/admin/pages/:slug/preview` when `?preview=1` is present (via a `PreviewContext` flag). Falls back to the current hardcoded copy if `body` is empty — only three pages convert in this round, not the whole site.
- `<RichText html={...} />`: sanitizes with `DOMPurify.sanitize()` (allowlisting `data-component`/`data-props` on `div`, plus normal formatting tags/attributes), inserts via `dangerouslySetInnerHTML`, then a hydration pass walks the result for `[data-component]` nodes and mounts the registered component (with `data-props` spread onto it) into each. Both the public page and the admin preview render through this one component.
- TipTap setup: `@tiptap/react` + `@tiptap/starter-kit` (paragraphs, bold, italic, nested bullet/ordered lists, headings) + `@tiptap/extension-link`, plus a custom atom node for the component chips (non-editable, shows as a small labeled block in the editor, draggable/deletable but not text-editable).
- Editor toolbar: Bold / Italic / Link, plus an "Insert" dropdown listing registry entries whose `pages` includes the current page (or `pages: null`).
- New admin route `/admin/pages` — "Page Details": list of the three pages, each with instant visibility toggle, edit button (opens the TipTap editor for that page's `draft_body`), preview button (new tab, `?preview=1`), publish button (disabled when draft matches published), discard-draft action.

## Per-page scope (this round)

**Home** — everything inside `<ContentBody>` (h2 + full narrative) becomes the `body` field. Everything outside it (`FloatingRockLink`, `Counter`, `BkgImage` and its contents including `InHeavenCounter`) stays hardcoded. No registry components needed on this page.

**Sudc** — currently does **not** use `<ContentBody>` (it has its own `sudcContainer` wrapper styled by `Sudc.module.css`). **Refactor this to use `<ContentBody>` as its own isolated, verifiable step before wiring in rich text** — check `Sudc.module.css`'s existing spacing/width rules against `ContentBody`'s own styling so nothing doubles up, confirm visually unchanged, then proceed. No registry components needed on this page; content includes a nested bullet list and an inline link, both handled natively by StarterKit + Link.

**ShareYourRock** — everything inside `<ContentBody>` becomes the `body` field, with the Insert menu offering `upload-rock-button`, `upload-rock-link`, and `facebook-link` as droppable chips at whatever position the editor places them. Heads-up: the current markup has a `<ul>` nested directly inside an `<ol>` without a wrapping `<li>` (technically invalid HTML that browsers tolerate) — TipTap's parser will likely normalize this to valid nesting on conversion, which may shift indentation slightly. Check in preview after conversion rather than assuming pixel-identical output. Seed `draft_body`/`published_body` with the chips already placed at their current positions so nothing visually changes on day one.

**Photos** — excluded from this round; its `<ContentBody>` currently contains no static text, only the `PhotoAlbum`/`PhotoCollection` components.

## Explicitly out of scope / not touched by this feature
- **Rock journey visibility** (`journey.show`, `journey_image.show`) is unrelated to this feature's page-level `visible` — different table, different meaning. Don't let naming similarity cause cross-editing.
- No async background processing — this is synchronous CRUD on `page_content`, unlike rock uploads. The async upload gap doesn't apply here.
- No Leaflet markers touched by this feature.
- No nav reordering/renaming UI — `nav_label`/`order_num` are seed-time only for now.

---

## Instructions for Claude CLI (hand off in phases)

### Phase 1 — Sudc refactor (isolated, verify before continuing)
Refactor `Sudc.jsx` to wrap its content in `<ContentBody>` instead of its own `sudcContainer` div. Check `Sudc.module.css` against `ContentBody`'s styling for doubled padding/max-width. Confirm the page looks the same before moving on — don't combine this with any other change.

### Phase 2 — DB migration
Add `page_content` table per the DDL above. Seed three rows (`home`, `sudc`, `share-your-rock`) with `nav_label`/`order_num` matching current nav order, `visible = true`, and `draft_body`/`published_body` both initialized to the current hardcoded copy for each page — for `share-your-rock`, the seed HTML must already include the `data-component` chips at their current positions. Raw SQL consistent with `server/src/db` — no Prisma.

### Phase 3 — Backend routes
Implement the five endpoints under "API surface." Follow existing route conventions in `server/src/routes`. No auth middleware exists for admin routes currently — match the existing (unprotected) pattern rather than inventing new auth.

### Phase 4 — Dependencies + core content pipeline
Propose adding `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `dompurify` — **wait for explicit approval before installing any of them**. Build:
- `usePageContent(slug)` + `PreviewContext`
- `<RichText>` (sanitize + render + hydrate registry components)
- `componentRegistry.js` seeded with `upload-rock-button`, `upload-rock-link`, `facebook-link` (all `configFields: []`)
- `UploadRockModalProvider` (page-scoped context replacing `ShareYourRock`'s local `showForm` state)

### Phase 5 — TipTap editor + custom chip node
Build the TipTap instance with Bold/Italic/Link toolbar, a custom non-editable atom node for component chips, and an "Insert" dropdown filtered to the current page's registry entries.

### Phase 6 — Admin "Page Details" screen
New route `/admin/pages`. List view: three pages, instant visibility toggle, edit button (opens the Phase 5 editor on `draft_body`), preview button (new tab, `?preview=1`), publish button (disabled when draft equals published), discard-draft action.

### Phase 7 — Wire up the three pages
Replace the identified hardcoded content in `Home.jsx`, `Sudc.jsx`, and `ShareYourRock.jsx` with `<RichText html={content.body} />` inside `<ContentBody>`. `ShareYourRock.jsx` also switches its button/link to consume `UploadRockModalProvider` instead of local state. Wire the navbar to `GET /api/pages` instead of a hardcoded list.

### Notes for Claude CLI throughout
- No test suite exists — don't scaffold one unprompted, but flag where a test would catch regressions (e.g. draft/publish copy logic, DOMPurify allowlist).
- For any UI verification, ask before running automated browser checks.
- Flag `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `dompurify` (and anything else) before installing.
- Sanitize HTML with DOMPurify at render time only, in the shared `<RichText>` component — don't build a second rendering path for preview vs. production.
