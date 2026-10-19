-- STEP 01 of 02 -- run on BOTH servers (Node A, then Node B).
-- Finish this step on both servers before step 02 and before deploying the
-- code (the 0.18 code selects these columns).
--
-- Adds the admin Rock Catalog "Status" (available / assigned / keep /
-- unknown) and "Assigned" date. Every existing rock becomes available with
-- no date until step 02 fills them in.
--
-- Schema only: pglogical doesn't replicate it, so each server needs it.
-- catalog is already in the replication set, so no new
-- replication_set_add_table line or sequenceOffset run is needed.
-- Safe to re-run.

ALTER TABLE public.catalog
    ADD COLUMN IF NOT EXISTS assign_status character varying(10) NOT NULL DEFAULT 'available';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'catalog_assign_status_check'
  ) THEN
    ALTER TABLE public.catalog
      ADD CONSTRAINT catalog_assign_status_check
      CHECK (assign_status IN ('available', 'assigned', 'keep', 'unknown'));
  END IF;
END $$;

ALTER TABLE public.catalog
    ADD COLUMN IF NOT EXISTS assigned_dt date;
