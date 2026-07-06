-- Adds the photoalbum_tags table (Album Tags feature): multi-value tags per
-- album (e.g. "main") so specific pages can later filter to just tagged
-- albums. pglogical does not replicate DDL: run the CREATE TABLE by hand,
-- identically, on the provider node first, then the subscriber node. Safe to
-- re-run (idempotent) if a deploy step fails partway through.

CREATE TABLE IF NOT EXISTS public.photoalbum_tags (
    pa_key    integer NOT NULL REFERENCES public.photoalbums(pa_key) ON DELETE CASCADE,
    tag       varchar(100) NOT NULL,
    create_dt timestamptz DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pa_key, tag)
);

-- pglogical replication set: this is a brand-new table (not a new column on
-- an already-replicated table), so it also needs a one-time registration,
-- distinct from the CREATE TABLE step above. Per this repo's established
-- pattern (see add_page_content_table.sql), replication-set membership is a
-- provider-side catalog operation — run this once, on the PROVIDER node
-- only, after CREATE TABLE has been applied on both nodes.
--
-- NOTE: the phase doc for this feature says to note that "CREATE TABLE must
-- be run identically on both prod nodes before this registration statement
-- runs (also on both nodes)" — read literally that could mean the
-- registration call itself runs on both nodes too, which would be
-- inconsistent with how pglogical replication sets normally work (a
-- provider-side catalog, not something the subscriber has its own copy of)
-- and with how the prior feature's equivalent migration was written. Flagging
-- this ambiguity rather than guessing — confirm which is correct for this
-- prod topology before running.
--
-- synchronize_data := false is explicit and intentional: this table has zero
-- rows at creation time (no backfill/seed step for this feature), so there's
-- nothing to sync; writing it explicitly avoids relying on that being a
-- coincidence of whatever the default happens to be.
-- SELECT pglogical.replication_set_add_table('default', 'photoalbum_tags', synchronize_data := false);
