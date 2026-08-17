-- Honoring Aiden entries: one entry per nav item/page — title, auto-slug
-- (see server/src/routes/honoringAidenAdmin.js's slugify()), a visibility
-- toggle (published), a self-referencing two-level parent/sub-entry
-- relationship (parent_id), and its whole page body as one body_json
-- document (raw Tiptap/ProseMirror JSON, authored via
-- @s195640/content-editor's ContentEditor). No seed data — every install
-- starts with zero entries.
--
-- Consolidated migration, replacing 8 incremental ones. This feature went
-- through several intermediate shapes during development — a 3-table
-- entry -> journal_entry -> journal_entry_item content model with its own
-- template/layout/column system, later collapsed to a single body_json
-- column once @s195640/content-editor could embed images/video directly
-- in one flowing document, then a self-referencing parent_id added for a
-- two-level sidebar menu — none of which was ever actually run against a
-- real database (every one of those migration files was still
-- untracked/unapplied when this consolidation happened). Rather than
-- replay that whole churn step by step against a real environment, this
-- single file goes straight from "no entry table at all" to the final
-- shape below. The individual migrations this replaces (now deleted):
-- add_honoring_aiden_display_transform.sql,
-- add_honoring_aiden_journal_entry_layout.sql,
-- change_honoring_aiden_journal_entry_layout_to_columns.sql,
-- change_honoring_aiden_journal_entry_item_body_to_json.sql,
-- drop_honoring_aiden_template_type.sql,
-- simplify_honoring_aiden_content_model.sql, and
-- add_honoring_aiden_entry_parent_id.sql — see summary-issue-log.md for
-- the full narrative history (still intact there) if any of that
-- intermediate context is ever needed.
--
-- entry_date/cover_image: unused by any current UI (kept rather than
-- dropped — harmless, nullable, no migration risk either way; simplest to
-- leave for a possible future use than to churn the schema twice).
--
-- parent_id: self-referencing, NULL = top-level. Hard-capped at two
-- levels by application code (routes/honoringAidenAdmin.js's
-- resolveParentId()), not the schema — nothing here stops a sub-entry
-- being given children directly in SQL, the app just never offers that in
-- the UI/API.
--
-- view_count: incremented by routes/honoringAiden.js's own
-- POST /entries/:slug/view (utils/honoringAiden/incrementEntryView.js) —
-- by request, "should only be increase for the normal page not the admin
-- page" AND "only count 1 time per session (per page)": the admin router
-- (routes/honoringAidenAdmin.js) has no equivalent endpoint at all, and the
-- public page's own client-side sessionStorage guard
-- (EntryDetailView.jsx's recordViewOnce) only calls this once per browser
-- session per entry. Not surfaced in any UI yet (by request) — tracked
-- only, read directly from the DB for now.
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent) if a deploy step fails partway through.

CREATE TABLE IF NOT EXISTS public.entry (
    id            serial PRIMARY KEY,
    slug          varchar(255) UNIQUE NOT NULL,
    title         varchar(255) NOT NULL,
    entry_date    date NULL,
    sort_order    integer NOT NULL DEFAULT 0,
    published     boolean NOT NULL DEFAULT false,
    archived      boolean NOT NULL DEFAULT false,
    cover_image   varchar(500) NULL,
    body_json     jsonb NULL,
    parent_id     integer NULL REFERENCES public.entry(id),
    view_count    integer NOT NULL DEFAULT 0,
    created_at    timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at    timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Defensive, not expected to actually fire anywhere: covers re-running
-- this against an environment where an older, narrower version of `entry`
-- (missing body_json/parent_id/view_count) somehow already exists, which
-- would make CREATE TABLE IF NOT EXISTS above a complete no-op. Every
-- environment this has been checked against has no `entry` table at all
-- yet, so this is pure safety margin, matching this file's own "safe to
-- re-run" claim, not a known real scenario.
ALTER TABLE public.entry ADD COLUMN IF NOT EXISTS body_json jsonb NULL;
ALTER TABLE public.entry ADD COLUMN IF NOT EXISTS parent_id integer NULL REFERENCES public.entry(id);
ALTER TABLE public.entry ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- pglogical replication set: run this on BOTH nodes — confirmed directly
-- by the human that THIS system's pglogical topology is bidirectional
-- (each node replicates to the other), not the simple one-way
-- provider->subscriber setup add_page_content_table.sql/
-- add_photoalbum_tags_table.sql's own "provider node only" precedent
-- assumed. In a bidirectional/multi-master setup each node is itself a
-- provider for its own local writes, so each needs `entry` registered in
-- ITS OWN local replication set catalog — there's no single shared
-- provider-side catalog the way there is in a one-way setup, so "run once,
-- on the provider only" doesn't apply here. (This supersedes this file's
-- own earlier comment, which had incorrectly resolved the
-- provider-vs-both-nodes question the OTHER way, based on that
-- one-way-topology precedent — see summary-issue-log.md for that
-- correction. Whether add_page_content_table.sql/
-- add_photoalbum_tags_table.sql were themselves ever actually registered on
-- both nodes despite their own "provider only" comments is outside this
-- file's scope to guess at — flagged for the human separately.)
--
-- synchronize_data := false is explicit and intentional: `entry` has zero
-- rows at this point, nothing to backfill either direction.
-- SELECT pglogical.replication_set_add_table('default', 'entry', synchronize_data := false);
