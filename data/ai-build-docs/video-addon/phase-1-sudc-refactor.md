# Phase 1 — Sudc.jsx refactor to use ContentBody

## Context
Full feature design: `data\ai-build-docs\page-details-feature-plan.md` — read it before starting. This phase is step 1 of 7 in that plan. Don't relitigate decisions already made there.

This phase also establishes `data\ai-build-docs\summary-issue-log.md` — a running log maintained across all phases of this feature (see "Issue log" section below). Create it now if it doesn't exist.

## Task
Refactor `client/src/pages/Sudc/Sudc.jsx` to wrap its content in the existing `<ContentBody>` component instead of its own custom `sudcContainer` wrapper div.

Specifics:
- `Sudc.jsx` currently renders its content inside `<div className={styles.sudcContainer}>...</div>`. Replace that wrapper with `<ContentBody>...</ContentBody>` — see how `Home.jsx` or `ShareYourRock.jsx` already use `ContentBody` for the same purpose.
- Before removing `sudcContainer`'s styling, check `Sudc.module.css` for any padding/max-width/spacing rules tied to `.sudcContainer` and compare against `ContentBody`'s own component styles. Goal: the page looks visually identical after the refactor — no doubled padding, no layout shift.
- The banner (`sudcBannerWrapper`/`sudcBanner`) at the top of the page is unaffected — only the text content section changes wrappers.

## Out of scope for this phase
- Do NOT start on the `page_content` DB table, API routes, TipTap, the component registry, or any other part of the broader feature. This task is only the wrapper swap.
- Do NOT touch the donate link, the fact list content/structure, or any other page in this codebase.

## Constraints
- No test suite exists — don't add one for this change.
- Don't run automated browser verification — the human will check visually and confirm before Phase 2.

## Issue log
Append an entry to `data\ai-build-docs\summary-issue-log.md` (create the file with this structure if it doesn't exist yet) using this format:

```
## Phase 1 — Sudc refactor (YYYY-MM-DD)
**Status:** Complete / Blocked / Partial
**Files changed:** <list>
**Summary:** <2-4 sentences on what was implemented>
**Deviations from plan:** <anything that differs from page-details-feature-plan.md and why, or "None">
**Issues / gotchas encountered:** <anything unexpected, or "None">
**Open questions for human review:** <anything needing a decision before the next phase, or "None">
```

## When done
Report exactly what changed in `Sudc.jsx` and `Sudc.module.css` (including any CSS adjustments needed to avoid doubled spacing), append the issue log entry, and stop. Do not proceed to Phase 2.
