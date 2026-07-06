# Phase 5 — TipTap editor + component chip node

## Context
Full feature design: `data\ai-build-docs\page-details-feature-plan.md` — read it before starting, specifically "Component registry" and "Front-end pattern" sections. Don't relitigate decisions made there.

Read `data\ai-build-docs\summary-issue-log.md` for what Phases 1–4 actually did, especially the DOMPurify allowlist and `componentRegistry.js` shape from Phase 4 — this phase builds directly on both.

## Task

**1. Build the TipTap editor instance** using `@tiptap/starter-kit` (paragraphs, bold, italic, nested bullet/ordered lists, headings) + `@tiptap/extension-link`.

**2. Build a custom TipTap atom node for component chips:**
- Non-editable as text — appears as a small labeled block (e.g. showing the registry entry's `label`) in the editor.
- Draggable/repositionable and deletable like any other block, but its internal content isn't text-editable.
- Serializes to/from `<div data-component="KEY" data-props='{"...json..."}'></div>` — matching exactly what Phase 4's `<RichText>` hydration pass expects to parse.
- For registry entries with non-empty `configFields` (none exist yet, but the mechanism should support it): clicking the chip should reopen a small popup pre-filled with its current `data-props` values, allowing edits. For today's three registry entries (`configFields: []`), no popup is needed — placing the chip is the entire interaction.

**3. Build the "Insert" toolbar dropdown:**
- Lists registry entries from `componentRegistry.js` filtered to those whose `pages` array includes the page currently being edited (or `pages: null`, meaning available everywhere — not used by any current entry, but the filter should support it).
- For entries with empty `configFields`, clicking inserts the chip immediately at the cursor.
- For entries with non-empty `configFields` (future-proofing, not needed for the three current entries), clicking should open the config popup first, then insert on submit.

## Out of scope for this phase
- No admin screen/page list yet (Phase 6) — this phase is just the editor component itself, usable in isolation (e.g. via a temporary test harness if useful for verification).
- No wiring into the real pages yet (Phase 7).

## Constraints
- No test suite — don't add one, but flag in the issue log if a test around chip serialization round-tripping (HTML → editor state → HTML) would be valuable.
- If any UI verification would help confirm the editor works as intended, ask the human before running automated browser checks.

## Issue log
Append an entry to `data\ai-build-docs\summary-issue-log.md` using the established format. Note specifically whether chip serialization round-trips cleanly, since that's the main risk area in this phase.

## When done
Show how the editor renders a page's `draft_body` (including at least one chip), and stop. Do not proceed to Phase 6.
