-- Adds video support to the existing Photos table.
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run (idempotent)
-- if a deploy step fails partway through.

ALTER TABLE public.photos
    ADD COLUMN IF NOT EXISTS media_type character varying(10) NOT NULL DEFAULT 'photo';

ALTER TABLE public.photos
    ADD COLUMN IF NOT EXISTS duration_seconds integer;
