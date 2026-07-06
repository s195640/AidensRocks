# Phase 2 — page_content table + seed data

## Context
Full feature design: `data\ai-build-docs\page-details-feature-plan.md` — read it before starting, specifically the "Data model" and "Per-page scope" sections. Don't relitigate decisions made there.

Read `data\ai-build-docs\summary-issue-log.md` for what Phase 1 actually did (in case anything deviated from the plan doc in a way that affects this phase — e.g. if Sudc's class names or structure changed unexpectedly).

## Task
1. Add the `page_content` table exactly as specified in the plan doc's "Data model" section:

```sql
CREATE TABLE page_content (
    page_slug       varchar(100) PRIMARY KEY,
    nav_label       varchar(255) NOT NULL,
    order_num       integer NOT NULL DEFAULT 0,
    visible         boolean NOT NULL DEFAULT true,
    draft_body      text NOT NULL DEFAULT '',
    published_body  text NOT NULL DEFAULT '',
    updated_at      timestamptz DEFAULT CURRENT_TIMESTAMP,
    published_at    timestamptz
);
```

2. Seed exactly three rows: `home`, `sudc`, `share-your-rock`, with `nav_label`/`order_num` matching the current live nav order, `visible = true`.

3. For each seeded row, `draft_body` and `published_body` must both be initialized to the **current hardcoded copy** of that page's content, converted to HTML:
   - `home`: the h2 + all narrative paragraphs currently inside `Home.jsx`'s `<ContentBody>`.
   - `sudc`: the intro paragraph, nested bullet fact list, and closing paragraph (with donate link) currently inside `Sudc.jsx`'s content area (post-Phase-1 refactor).
   - `share-your-rock`: the h2 + all paragraphs + the numbered how-to list currently inside `ShareYourRock.jsx`'s `<ContentBody>` — **with the functional elements (upload button, upload-triggering link, Facebook link) already represented as component-chip placeholders** at their current positions in the HTML, e.g. `<div data-component="upload-rock-button" data-props="{}"></div>`. This is required so that nothing visually changes the moment this feature ships, before anyone has edited anything. See the plan doc's component registry section for the exact chip keys to use (`upload-rock-button`, `upload-rock-link`, `facebook-link`).

## Out of scope for this phase
- No API routes yet (Phase 3).
- No front-end changes yet — pages keep rendering their current hardcoded JSX; this phase only gets the data in place.
- No TipTap, no component registry code — just the placeholder `data-component` markup as static seed data in this migration.

## Constraints
- Raw SQL, consistent with the existing `server/src/db` pattern — no Prisma (it's dead code in this project, don't touch it or use it).
- No test suite — don't add one for this migration.

## Issue log
Append an entry to `data\ai-build-docs\summary-issue-log.md` using the established format (see Phase 1's log entry for the template). Include in "Deviations from plan" anything about the seeded HTML that required judgment calls (e.g. how a paragraph break was represented, any markup that didn't translate cleanly).

## When done
Show the migration file and the exact seeded `draft_body`/`published_body` HTML for all three rows, append the issue log entry, and stop. Do not proceed to Phase 3.
