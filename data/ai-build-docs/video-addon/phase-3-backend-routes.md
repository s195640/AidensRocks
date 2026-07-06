# Phase 3 — Backend API routes

## Context
Full feature design: `data\ai-build-docs\page-details-feature-plan.md` — read it before starting, specifically the "API surface" section. Don't relitigate decisions made there.

Read `data\ai-build-docs\summary-issue-log.md` for what Phases 1–2 actually did.

## Task
Implement these five endpoints against the `page_content` table from Phase 2:

**Public:**
- `GET /api/pages` → `[{slug, nav_label, order_num, visible}]`, filtered to `visible = true`, ordered by `order_num`.
- `GET /api/pages/:slug/content` → `published_body` for that page.

**Admin:**
- `GET /api/admin/pages` → all pages, all columns (draft + published + visible).
- `PATCH /api/admin/pages/:slug/visible` → flips `visible` immediately (no draft/publish involved).
- `PUT /api/admin/pages/:slug/draft` → saves edits to `draft_body`.
- `GET /api/admin/pages/:slug/preview` → returns `draft_body` in the same response shape as the public content endpoint.
- `POST /api/admin/pages/:slug/publish` → `published_body = draft_body`, `published_at = now()`.

## Constraints
- Follow existing route/file conventions in `server/src/routes` — match the style of existing route files, don't introduce a new pattern.
- **No auth middleware exists for admin routes currently.** Match the existing (unprotected) pattern used by other admin routes — do not invent new auth for this feature. This is a known, already-accepted gap in the project, not something to fix here.
- Raw SQL via the existing `pg.Pool` pattern — no Prisma.
- No test suite — don't add one, but note in the issue log if there's an endpoint where a test would clearly be valuable later.

## Out of scope for this phase
- No front-end wiring yet (later phases).
- No TipTap, no component registry.

## Issue log
Append an entry to `data\ai-build-docs\summary-issue-log.md` using the established format.

## When done
List the route files created/modified and confirm each of the five endpoints works via a quick manual check (e.g. curl or similar) against the seeded data from Phase 2. Append the issue log entry, and stop. Do not proceed to Phase 4.
