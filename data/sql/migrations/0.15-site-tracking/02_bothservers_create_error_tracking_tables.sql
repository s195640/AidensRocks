-- STEP 02 of 05 -- run on BOTH servers (Node A, then Node B).
-- Finish this step on both servers before starting step 03.
--
-- Creates error tracking (Site Tracking, phase 2):
--   server_error   one row per server-side error (a 5xx response, a failed
--                  background job or email send, an unhandled rejection).
--                  INSERT-only, UUID keys.
--   error_group    one row per kind of error (fingerprint): its status
--                  (new / known / fixed) and alert bookkeeping. Counts are
--                  computed at read time, never stored, so updates here are
--                  only status changes and the alert throttle (last-writer-
--                  wins is harmless).
-- plus an index on site_event (from step 01) for browser errors, which stay
-- in site_event with meta.fingerprint.
--
-- Schema only: pglogical doesn't replicate it, so each server needs it.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.server_error (
    id           uuid PRIMARY KEY,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    kind         character varying(20) NOT NULL,   -- request | background | email | process
    visit_id     uuid,                             -- X-Visit-Id from the browser, if any
    account_id   integer,
    is_admin     boolean NOT NULL DEFAULT false,
    is_internal  boolean NOT NULL DEFAULT false,
    method       character varying(10),
    route        character varying(300),
    status       integer,
    message      text,
    stack        text,
    fingerprint  character varying(64) NOT NULL,
    app_version  character varying(50),
    meta         jsonb
);

CREATE INDEX IF NOT EXISTS idx_server_error_created_at ON public.server_error (created_at);
CREATE INDEX IF NOT EXISTS idx_server_error_fingerprint ON public.server_error (fingerprint);

ALTER TABLE public.server_error OWNER TO postgres;

CREATE TABLE IF NOT EXISTS public.error_group (
    fingerprint        character varying(64) PRIMARY KEY,
    source             character varying(10) NOT NULL,   -- client | server
    type               character varying(40) NOT NULL,
    title              character varying(500) NOT NULL,
    first_seen         timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status             character varying(10) NOT NULL DEFAULT 'new',   -- new | known | fixed
    status_changed_at  timestamptz,
    fixed_in_version   character varying(50),
    last_alerted_at    timestamptz,
    note               text
);

ALTER TABLE public.error_group OWNER TO postgres;

-- Browser errors are looked up by fingerprint inside site_event.meta.
CREATE INDEX IF NOT EXISTS idx_site_event_error_fingerprint
    ON public.site_event ((meta->>'fingerprint'))
    WHERE meta ? 'fingerprint';
