-- Adds the admin Rock Requests "Bereaved parent" flag (shown as a
-- hand-holding-heart icon next to the message). Admin-set only; existing
-- requests start unflagged.
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent). No new replication_set_add_table line or sequenceOffset
-- run needed -- no new table, and rock_requests is already registered.

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS bereaved_parent boolean NOT NULL DEFAULT false;
