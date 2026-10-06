-- Lets an admin-created rock request leave Email and/or Address blank
-- (stored NULL): the admin Create/Edit dialog only requires Name and
-- # Rocks Requested. The public Request A Rock form still requires both
-- (enforced in server/src/routes/rockRequests.js, insertRockRequest).
-- Send Email refuses a request with no email on file.
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent -- DROP NOT NULL on an already-nullable column is a no-op).

ALTER TABLE public.rock_requests
    ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.rock_requests
    ALTER COLUMN address DROP NOT NULL;
