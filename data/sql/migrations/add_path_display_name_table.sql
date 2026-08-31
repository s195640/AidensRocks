-- Adds the path_display_name table (Path Display Names feature): an
-- admin-managed lookup mapping a hit's full_url (or bare path, for older
-- rows with no full_url) to a human-readable label shown on the admin
-- Path Hits widget instead of the raw URL -- e.g. "/treeHH?z=1" ->
-- "Hocking Hills". url_pattern may contain "*" as a wildcard matching any
-- run of characters (e.g. "/qr?r=*" -> "Rock", covering every rock code
-- with one row) -- see server/src/utils/pathDisplayNameMatcher.js for the
-- match/precedence rules (an exact, non-wildcard pattern always wins over
-- a wildcard one; the longest wildcard pattern wins among wildcard
-- matches). A hit with no matching row shows as "Unknown"
-- (server/src/routes/unmatchedPath.js), never omitted.
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent) if a deploy step fails partway through.

CREATE TABLE IF NOT EXISTS public.path_display_name (
    id            serial PRIMARY KEY,
    url_pattern   character varying(2048) NOT NULL UNIQUE,
    display_name  character varying(255) NOT NULL,
    create_dt     timestamptz DEFAULT CURRENT_TIMESTAMP,
    update_dt     timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- pglogical replication set: this is a brand-new table, so it also needs a
-- one-time registration, distinct from the CREATE TABLE step above. Per
-- this repo's established pattern (see add_unmatched_path_hit_table.sql),
-- replication-set membership is a provider-side catalog operation -- run
-- this once, on the PROVIDER node only, after CREATE TABLE has been applied
-- on both nodes.
--
-- synchronize_data := false is explicit and intentional: this table has
-- zero rows at creation time, so there's nothing to sync.
-- SELECT pglogical.replication_set_add_table('default', 'path_display_name', synchronize_data := false);
