-- Adds a play_count counter to the existing music table, incremented each
-- time a visitor plays a song in the bottom audio player (see
-- PUT /api/music/:m_key/increment-play in server/src/routes/music.js).
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run (idempotent)
-- if a deploy step fails partway through.

ALTER TABLE public.music
    ADD COLUMN IF NOT EXISTS play_count integer NOT NULL DEFAULT 0;
