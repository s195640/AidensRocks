-- Adds the "Rock Requests" feature: a rock_requests table for visitor
-- "Request A Rock" submissions (name/email/address/# rocks requested), plus
-- admin-managed shipped/tracking_number/comments/rock_numbers fields, and a
-- nullable catalog.rq_key column linking a cataloged rock to the request
-- it's currently assigned to. No DB-level FK constraint on catalog.rq_key
-- -> rock_requests.rq_key, matching this codebase's existing style of no
-- declared FK constraints between related tables (e.g. journey_image.rps_key).
-- rock_numbers is a delimited (comma-separated) text field, validated only
-- in application code -- mirrors how catalog.rock_number itself has no
-- DB-level uniqueness constraint (see server/src/routes/rockRequests.js and
-- client RockRequestsEditDialog.jsx for the validation/sync logic).
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent) if a deploy step fails partway through. Also run the
-- corresponding replication_set_add_table line in data/sql/pglogical.sql
-- (provider node only).

CREATE TABLE IF NOT EXISTS public.rock_requests (
    rq_key           serial PRIMARY KEY,
    name             character varying(255) NOT NULL,
    email            character varying(255) NOT NULL,
    address          text NOT NULL,
    rocks_requested  integer NOT NULL,
    shipped          boolean NOT NULL DEFAULT false,
    tracking_number  character varying(255),
    comments         text,
    rock_numbers     text,
    create_dt        timestamptz DEFAULT CURRENT_TIMESTAMP,
    update_dt        timestamptz DEFAULT CURRENT_TIMESTAMP,
    sent_dt          timestamptz
);

ALTER TABLE public.rock_requests OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_rock_requests_shipped ON public.rock_requests (shipped);

ALTER TABLE public.catalog
    ADD COLUMN IF NOT EXISTS rq_key integer;
