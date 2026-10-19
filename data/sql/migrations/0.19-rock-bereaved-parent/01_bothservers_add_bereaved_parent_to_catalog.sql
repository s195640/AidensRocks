-- STEP 01 of 02 -- run on BOTH servers (Node A, then Node B).
-- Finish this step on both servers before deploying the code (the 0.19
-- code selects this column). Needs 0.18-rock-assign-status already run.
--
-- Adds the admin Rock Catalog "Bereaved parent" flag. Rock Requests copies
-- its own bereaved_parent flag onto linked rocks; a rock's flag can also be
-- set on its own from the Rocks page (that never changes the request).
-- Every existing rock starts unflagged -- no backfill (by design).
--
-- Schema only: pglogical doesn't replicate it, so each server needs it.
-- catalog is already in the replication set. Safe to re-run.

ALTER TABLE public.catalog
    ADD COLUMN IF NOT EXISTS bereaved_parent boolean NOT NULL DEFAULT false;
