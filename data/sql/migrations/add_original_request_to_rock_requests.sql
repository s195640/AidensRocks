-- Adds rock_requests.original_request: a readable text snapshot of every
-- detail a request was created with (name, email, address parts, country,
-- # rocks, need-by / no rush, message, and whether it came from the public
-- form or an admin). Written once on insert by server/src/routes/rockRequests.js
-- and never updated, so if an admin changes something by accident the
-- original can still be read (the (i) button in the admin Edit dialog).
--
-- Requests made before this column existed stay NULL: their current values
-- may already have been edited, so they aren't copied in as an "original".
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent). No new replication_set_add_table line needed --
-- rock_requests is already registered.

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS original_request text;
