# Phase 4 — Dependencies + core content pipeline

## Context
Full feature design: `data\ai-build-docs\page-details-feature-plan.md` — read it before starting, specifically "Front-end pattern," "Component registry," and "Modal-triggering state" sections. Don't relitigate decisions made there.

Read `data\ai-build-docs\summary-issue-log.md` for what Phases 1–3 actually did.

## Task

**1. Propose new dependencies — wait for explicit approval before installing any of them:**
- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-link`
- `dompurify`

Do not run any install commands until the human has confirmed each one.

**2. Build `usePageContent(slug)` hook:**
Fetches `/api/pages/:slug/content` normally, or `/api/admin/pages/:slug/preview` when a `PreviewContext` flag (set by `?preview=1` in the URL) is active. Falls back to a provided default string if `body` comes back empty.

**3. Build `PreviewContext`:**
Detects `?preview=1`, exposes a flag consumed by `usePageContent`. Preview mode does NOT disable or alter functional components — they must behave identically to production (per the plan doc's decision on this).

**4. Build `<RichText html={...} />`:**
Sanitizes with `DOMPurify.sanitize()` — allowlist must explicitly permit `data-component` and `data-props` attributes on `div` elements (this is how component chips are stored — see Phase 5/registry). Renders via `dangerouslySetInnerHTML`. After render, runs a hydration pass that finds every `[data-component]` node in the rendered output and mounts the corresponding registered component (from `componentRegistry.js`, built in this phase) into it, spreading any `data-props` JSON onto it.

**5. Build `componentRegistry.js`:**
Seed with the three existing functional elements from `ShareYourRock.jsx`:
```js
{
  "upload-rock-button": { label: "Upload Your Rock (button)", component: UploadRockButton, pages: ["share-your-rock"], configFields: [] },
  "upload-rock-link":   { label: "Upload Your Rock (text link)", component: UploadRockLinkTrigger, pages: ["share-your-rock"], configFields: [] },
  "facebook-link":      { label: "Facebook Link", component: FacebookLink, pages: ["share-your-rock"], configFields: [] },
}
```
`UploadRockButton`, `UploadRockLinkTrigger`, and `FacebookLink` are new small components extracted from `ShareYourRock.jsx`'s current inline JSX for the button, the "here" link, and the Facebook link+icon respectively — same markup/behavior, just extracted so the registry can reference them.

**6. Build `UploadRockModalProvider`:**
A page-scoped context replacing `ShareYourRock.jsx`'s current local `const [showForm, setShowForm] = useState(false)`. Both `UploadRockButton` and `UploadRockLinkTrigger` should call `useUploadRockModal().open()` instead of a locally-owned setter, so they work regardless of where they end up positioned inside the rich text body. Behavior must be identical to today — this only decouples the trigger from its position in the JSX.

## Out of scope for this phase
- Do not wire `ShareYourRock.jsx` itself into any of this yet (that's Phase 7) — just build the pieces and the extracted components in isolation.
- No TipTap editor UI yet (Phase 5) — this phase is the rendering/hydration pipeline, not the authoring UI.
- No admin screen yet (Phase 6).

## Constraints
- Sanitize HTML with DOMPurify at render time only, inside `<RichText>` — don't build a second rendering/sanitization path anywhere else.
- No test suite — don't add one, but flag in the issue log if a test around the sanitization allowlist or hydration pass would be valuable.

## Issue log
Append an entry to `data\ai-build-docs\summary-issue-log.md` using the established format. Explicitly note the DOMPurify allowlist configuration decided on, since future phases/components depend on it staying consistent.

## When done
List all new files created, confirm which dependencies were approved and installed, and stop. Do not proceed to Phase 5.
