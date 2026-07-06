# Phase 7 — Wire up Home, Sudc, ShareYourRock + nav

## Context
Full feature design: `data\ai-build-docs\page-details-feature-plan.md` — read it before starting, specifically "Per-page scope" section. Don't relitigate decisions made there.

Read `data\ai-build-docs\summary-issue-log.md` for what Phases 1–6 actually did — pay particular attention to any deviations noted for the seeded HTML in Phase 2 and the extracted components from Phase 4, since this phase wires them into the real pages for the first time.

## Task

**Home.jsx:** Replace everything currently inside `<ContentBody>` (the h2 + all narrative paragraphs) with:
```jsx
<ContentBody>
  <RichText html={content.body} />
</ContentBody>
```
using `usePageContent('home')` for `content`. Everything outside `<ContentBody>` (`FloatingRockLink`, `Counter`, `BkgImage` and its contents including `InHeavenCounter`) stays exactly as-is, untouched.

**Sudc.jsx:** Same pattern — replace the content currently inside `<ContentBody>` (post-Phase-1 refactor) with `<RichText html={content.body} />` using `usePageContent('sudc')`.

**ShareYourRock.jsx:** Replace everything currently inside `<ContentBody>` with `<RichText html={content.body} />` using `usePageContent('share-your-rock')`. Wrap the page in `UploadRockModalProvider` (from Phase 4) and remove the local `showForm` state — `UploadRockButton`/`UploadRockLinkTrigger` now source their open/close behavior from the provider instead.

**Navbar:** Replace whatever currently drives the nav item list with a fetch to `GET /api/pages`, rendering only `visible: true` entries in `order_num` order.

## Verification
After wiring each page, compare it against the current live version — the goal is that a visitor sees no difference at all immediately after this phase ships (the seeded `published_body` from Phase 2 should render identically to the old hardcoded JSX). Note in the issue log any place where it doesn't match exactly (e.g. the list-nesting normalization flagged as a risk for `share-your-rock` in the plan doc) so the human can review it in preview.

## Out of scope for this phase
- `Photos.jsx` is excluded from this feature entirely — do not touch it.
- No further feature additions (e.g. album-embed component) — that's a future, separate phase if ever needed.

## Constraints
- If any UI verification would help confirm these pages render correctly, ask the human before running automated browser checks — this is the highest-visibility phase (it touches live, real, hardcoded content on a memorial site), so a manual human check before/after is especially warranted here.
- No test suite — don't add one.

## Issue log
Append a final entry to `data\ai-build-docs\summary-issue-log.md` using the established format. This phase's entry should explicitly call out any visual discrepancies found during verification, however small.

## When done
Confirm all three pages and the navbar are wired up, list any visual discrepancies found (especially the `share-your-rock` list-nesting risk flagged in the plan doc), append the issue log entry, and stop. This is the last phase of the current plan.
