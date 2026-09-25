-- Adds requester-supplied message/email_dt to rock_requests. message is set
-- only by the public POST /api/rock-requests insert and is intentionally
-- never writable via the admin PUT route (backend-read-only, per request).
-- email_dt records the last time the family emailed the requester back via
-- POST /api/rock-requests/:rq_key/send-email -- stamped only on a successful
-- send, mirroring journey.email_sent/email_dt's send-then-record convention.
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent) if a deploy step fails partway through. No new
-- replication_set_add_table line needed -- rock_requests is already
-- registered (see add_rock_requests.sql).

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS message text;

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS email_dt timestamptz;
