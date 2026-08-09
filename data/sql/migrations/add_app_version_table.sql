-- Adds the app_version table: a per-node record of which app VERSION is
-- currently running, written by the server itself once at every process
-- startup (see server/src/utils/recordAppVersion.js) and surfaced on the
-- admin dashboard's Server Health "Node" tables (server/src/routes/serverHealth.js).
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run (idempotent)
-- if a deploy step fails partway through.
--
-- *** DO NOT add this table to the pglogical replication set. ***
-- Every other migration in this repo adds its table via
-- pglogical.replication_set_add_table('default', ...) -- this one deliberately
-- does NOT, and must never gain that line. The whole point of this table is
-- that each node reports its OWN actual locally-running version; if it were
-- replicated, one node's row would just overwrite the other's and a
-- mid-rollout version mismatch between node 1 and node 2 (exactly what this
-- table exists to catch) would become invisible.

CREATE TABLE IF NOT EXISTS public.app_version (
    id          smallint PRIMARY KEY DEFAULT 1,
    version     character varying(50) NOT NULL,
    updated_dt  timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT app_version_singleton CHECK (id = 1)
);
