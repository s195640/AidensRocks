-- Adds soft-delete support to rock_requests. Deleting a request never
-- removes the row -- it only flips `deleted` true and stamps `deleted_dt`.
-- GET /api/rock-requests filters these out, so deleted requests simply stop
-- showing up in the admin page rather than being purged. A request can't be
-- deleted while any catalog row is still linked to it (catalog.rq_key) --
-- see server/src/routes/rockRequests.js's DELETE route.
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent) if a deploy step fails partway through. No new
-- replication_set_add_table line needed -- rock_requests is already
-- registered.

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS deleted_dt timestamptz;
