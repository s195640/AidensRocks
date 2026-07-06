# Phase 1 — Album tags (admin only, no public-facing change)

## Context
Design plan: `data\ai-build-docs\album-tags\album-tags-feature-plan.md` — read it before starting. Don't relitigate decisions made there. Note: this supersedes an earlier `group_name`-based design — ignore that entirely if any trace of it is still present, it was replaced before any code was written against it.

Read `data\ai-build-docs\album-tags\summary-issue-log.md` if it exists (prior phase history for this feature). Create it if it doesn't exist yet, and continue appending to it (see "Issue log" below). This log is scoped to this feature only — separate from any other feature's log elsewhere under `data\ai-build-docs\`.

## Task

**1. Discover the actual current admin Albums code before changing anything:**
- The admin album list/table component
- The create/edit dialog component for an album
- The backend route(s) handling album create/update and the admin listing fetch

Confirm these file paths and current query shapes before editing — don't assume file names/paths.

**2. DB migration:**
```sql
CREATE TABLE photoalbum_tags (
    pa_key    integer NOT NULL REFERENCES photoalbums(pa_key) ON DELETE CASCADE,
    tag       varchar(100) NOT NULL,
    create_dt timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pa_key, tag)
);
```
Add to `createdb.sql` (fresh installs) and as a new idempotent migration file (`CREATE TABLE IF NOT EXISTS`), matching the pattern from prior migrations in this repo. No seed data — every album starts with zero tag rows.

Also add, in a separate statement clearly commented as a one-time, provider-side action distinct from the CREATE TABLE step:
```sql
SELECT pglogical.replication_set_add_table('default', 'photoalbum_tags', synchronize_data := false);
```
**The `synchronize_data := false` must be explicit — do not write the bare 2-argument call.** This is a brand-new table with no rows at creation time, so there's nothing to sync; the explicit `false` avoids relying on that being a coincidence. Note in a comment that `CREATE TABLE` must be run identically on both prod nodes before this registration statement runs (also on both nodes) — do not run any of this against a live database, prepare the migration only.

**3. Backend:**
- Admin album list endpoint: `LEFT JOIN photoalbum_tags`, aggregate into an array per album (e.g. `array_agg(tag) FILTER (WHERE tag IS NOT NULL)` so untagged albums get `{}` not `{NULL}`), return as `tags: string[]` alongside the existing album fields.
- Admin create/update endpoint: accept `tags` as an array of strings in the request body. On save, inside one transaction: normalize the incoming array (trim each entry, lowercase each entry, drop empty strings, dedupe), `DELETE FROM photoalbum_tags WHERE pa_key = $1`, then bulk-insert the normalized set (skip the insert step entirely if the normalized set is empty).

**4. Front-end:**
- Add a "Tags" text input to the album create/edit dialog — comma-separated (e.g. `main, featured`), matching the visual style of the dialog's other text fields. Pre-fill on edit by joining the album's existing `tags` array into a comma-separated string. On save, parse the input back into an array using the **same normalization rules as the backend** (trim/lowercase/drop-empty/dedupe) — front end and back end should agree, so what's shown after a reload matches what was typed, not a differently-cleaned version of it.
- Add a "Tags" column to the admin Albums table, showing each album's tags (comma-joined text is fine, or small badges if the table already has a convention for multi-value display elsewhere — match whatever exists, don't invent a new visual pattern if one's already there).

## Explicitly out of scope for this phase
- Do NOT touch `Photos.jsx`, the public-facing albums endpoint, or any public-facing query. Nothing about what visitors see should change in this phase.
- Do NOT add any tag-based filtering logic anywhere yet, admin or public.

## Constraints
- No test suite — don't add one, but note in the issue log if a test around the normalization logic (trim/lowercase/dedupe) would be valuable, since front end and back end both implement it and drift between them would be a real bug.
- Ask before running any automated browser verification — the human will check the admin dialog/table visually.
- No new dependencies expected for this phase; flag if one turns out to be needed.

## Issue log
Append an entry to `data\ai-build-docs\album-tags\summary-issue-log.md` using the established format (status, files changed, summary, deviations, issues/gotchas, open questions).

## When done
List the files changed, confirm the migration is prepared (not applied), and show the admin dialog/table with the new Tags field. Stop — do not proceed to Phase 2. Phase 2 requires the human to have gone through and manually tagged the desired albums with `main` first.
