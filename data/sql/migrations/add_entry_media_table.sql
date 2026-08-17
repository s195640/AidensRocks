-- Adds the entry_media table (Honoring Aiden Media tab feature): tracks
-- every image/video uploaded into a given entry's ContentEditor document,
-- independent of whether it's still referenced in that entry's current
-- body_json. Uploads (server/src/routes/honoringAidenAdmin.js's POST /media
-- and POST /media/stage-chunk) insert one row per file, right after the
-- upload is processed. Nothing else in this app ever deleted an uploaded
-- file before this feature -- this table is what makes that visible/
-- actionable rather than an invisible, ever-growing pile on disk.
--
-- pglogical does not replicate DDL: run the CREATE TABLE by hand,
-- identically, on the provider node first, then the subscriber node. Safe
-- to re-run (idempotent) if a deploy step fails partway through.

CREATE TABLE IF NOT EXISTS public.entry_media (
    id             serial PRIMARY KEY,
    entry_id       integer NOT NULL REFERENCES public.entry(id) ON DELETE CASCADE,
    item_type      character varying(10) NOT NULL,   -- 'image' | 'video'
    media_path     character varying(500) NOT NULL,
    thumbnail_path character varying(500),
    poster_path    character varying(500),
    original_name  character varying(500),
    width          integer,
    height         integer,
    duration       numeric,
    create_dt      timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entry_media_entry_id ON public.entry_media (entry_id);

-- pglogical replication set: this is a brand-new table, so it also needs a
-- one-time registration, distinct from the CREATE TABLE step above. Per
-- this repo's established pattern (see add_photoalbum_tags_table.sql),
-- replication-set membership is a provider-side catalog operation -- run
-- this once, on the PROVIDER node only, after CREATE TABLE has been applied
-- on both nodes.
--
-- synchronize_data := false is explicit and intentional: this table has
-- zero rows at creation time, so there's nothing to sync.
-- SELECT pglogical.replication_set_add_table('default', 'entry_media', synchronize_data := false);
