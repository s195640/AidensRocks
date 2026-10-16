-- STEP 01 of 02 -- run on BOTH servers (Node A, then Node B).
-- Finish this step on both servers before deploying the code.
--
-- Adds a draft/published `settings` jsonb pair to page_content for the
-- dialogs in Page Details' "Dialogs" table (server/src/utils/dialogSlugs.js).
-- Request A Rock keeps its # Rocks note and per-request rock limit there:
--   { "rocksNote": "<text>", "maxRocks": <1-100 or null> }
-- Like the body, the draft goes live on Publish.
--
-- Schema only: pglogical doesn't replicate it, so each server needs it.
-- page_content is already in the replication set on both servers, and
-- every row gets the same default, so no data step is needed here.
-- Safe to re-run.

ALTER TABLE public.page_content
  ADD COLUMN IF NOT EXISTS draft_settings     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
