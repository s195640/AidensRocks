-- Adds the unmatched_path_hit table (Unmatched Path Tracking feature): logs
-- every hit against a URL path that didn't match any defined client route
-- (e.g. "/f"), so the admin Statistics panel can show a hit count per path.
-- pglogical does not replicate DDL: run the CREATE TABLE by hand, identically,
-- on the provider node first, then the subscriber node. Safe to re-run
-- (idempotent) if a deploy step fails partway through.
--
-- One row per hit (INSERT-only), NOT a single row per path with an
-- incrementing hit_count column. This deliberately mirrors the
-- counter/counter_tracking pattern (see createdb.sql) rather than
-- app_version's "increment in place" style: app_version's own migration
-- comment explains why an increment-in-place column is unsafe under
-- multi-master pglogical replication -- two nodes each doing
-- "hit_count = hit_count + 1" concurrently on the same path can silently
-- lose an update when replicated. Insert-only avoids that entirely (each
-- row is independent, no shared mutable cell to conflict on); the per-path
-- count the admin sees is COUNT(*) at read time
-- (see server/src/routes/unmatchedPath.js), not a stored column.

CREATE TABLE IF NOT EXISTS public.unmatched_path_hit (
    id         serial PRIMARY KEY,
    path       character varying(2048) NOT NULL,
    create_dt  timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unmatched_path_hit_path ON public.unmatched_path_hit (path);

-- pglogical replication set: this is a brand-new table, so it also needs a
-- one-time registration, distinct from the CREATE TABLE step above. Per
-- this repo's established pattern (see add_photoalbum_tags_table.sql),
-- replication-set membership is a provider-side catalog operation -- run
-- this once, on the PROVIDER node only, after CREATE TABLE has been applied
-- on both nodes.
--
-- synchronize_data := false is explicit and intentional: this table has
-- zero rows at creation time, so there's nothing to sync.
-- SELECT pglogical.replication_set_add_table('default', 'unmatched_path_hit', synchronize_data := false);
