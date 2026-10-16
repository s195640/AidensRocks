-- Adds the Request A Rock "US address" fields to rock_requests. When the
-- visitor leaves "US address" checked (the default) they enter Street, City,
-- State (2-letter code) and ZIP Code separately and country is set to USA.
-- Unchecked, they enter a free-text address plus a separate Country. The
-- parts land here AND are joined into the existing `address` column
-- ("Street\nCity, ST 12345\nUSA", or "<free text>\n<Country>"), so the
-- admin pages and the {ADDRESS} email token keep working unchanged. Requests
-- made before this, or by an admin, keep us_address = false with only the
-- free-text `address`.
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent). No new replication_set_add_table line needed --
-- rock_requests is already registered.

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS us_address boolean NOT NULL DEFAULT false;

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS street character varying(255);

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS city character varying(255);

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS state character varying(2);

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS postal_code character varying(10);

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS country character varying(100);
