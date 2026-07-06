# Phase 6 — Admin "Page Details" screen

## Context
Full feature design: `data\ai-build-docs\page-details-feature-plan.md` — read it before starting, specifically "Front-end pattern" and "API surface" sections. Don't relitigate decisions made there.

Read `data\ai-build-docs\summary-issue-log.md` for what Phases 1–5 actually did.

## Task
Build a new admin route `/admin/pages` — "Page Details."

List view showing the three pages (`home`, `sudc`, `share-your-rock`), each with:
- **Visibility toggle** — instant, calls `PATCH /api/admin/pages/:slug/visible` directly, no confirmation step, no draft/publish involved.
- **Edit button** — opens the Phase 5 TipTap editor loaded with that page's `draft_body` (fetched from `GET /api/admin/pages`). Saving writes to `draft_body` via `PUT /api/admin/pages/:slug/draft`.
- **Preview button** — opens the real public page in a new browser tab at its normal URL with `?preview=1` appended.
- **Publish button** — calls `POST /api/admin/pages/:slug/publish`. Disabled (or visually indicated as no-op) when `draft_body` already equals `published_body` — no unpublished changes to push.
- **Discard draft option** — resets `draft_body` back to the current `published_body` (a small new admin-only action; add whichever endpoint/mechanism is simplest given the existing routes, or extend `PUT /api/admin/pages/:slug/draft` to accept a "reset to published" flag — your call, note the choice in the issue log).

## Constraints
- Match the existing admin section's visual/component conventions (whatever styling pattern the current admin pages already use) — don't introduce a new UI pattern for this screen.
- No auth middleware protects this route any more than any other admin route currently does — consistent with the existing (unprotected) admin pattern. Not something to fix in this phase.
- No test suite — don't add one.
- If any UI verification would help confirm this screen works, ask the human before running automated browser checks.

## Out of scope for this phase
- Don't wire the three real public pages (`Home.jsx`, `Sudc.jsx`, `ShareYourRock.jsx`) into this content system yet — that's Phase 7. This phase's edit/preview flow should work against the seeded data from Phase 2 even though the public pages themselves are still rendering their old hardcoded JSX until Phase 7 lands.

## Issue log
Append an entry to `data\ai-build-docs\summary-issue-log.md` using the established format. Note the mechanism chosen for "discard draft" specifically.

## When done
Walk through the full edit → preview → publish loop against one seeded page and confirm it works end to end. Append the issue log entry, and stop. Do not proceed to Phase 7.
