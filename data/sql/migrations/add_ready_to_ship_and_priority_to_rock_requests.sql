-- Adds the admin Rock Requests "Ready to ship" checkbox and High / Normal /
-- Low priority. Existing requests become not-ready, normal priority.
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent). No new replication_set_add_table line or sequenceOffset
-- run needed -- no new table, and rock_requests is already registered.

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS ready_to_ship boolean NOT NULL DEFAULT false;

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS priority character varying(10) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('high', 'normal', 'low'));
