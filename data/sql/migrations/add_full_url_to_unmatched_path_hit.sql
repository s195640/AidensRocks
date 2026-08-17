-- Adds a full_url column to unmatched_path_hit, capturing the entire URL the
-- visitor hit (pathname + query string, e.g. "/f?ref=abc"), not just the
-- pathname already stored in the existing path column. path stays as-is
-- (still the column the admin Statistics panel groups/counts by); full_url
-- is stored alongside it purely so the query string isn't lost.
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run (idempotent)
-- if a deploy step fails partway through.

ALTER TABLE public.unmatched_path_hit
    ADD COLUMN IF NOT EXISTS full_url character varying(2048);
