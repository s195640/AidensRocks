-- Photo Albums
SELECT pglogical.replication_set_add_table('default', 'photoalbums');
SELECT pglogical.replication_set_add_table('default', 'photos');
-- New table, zero rows at creation time (no backfill/seed) — explicit false.
SELECT pglogical.replication_set_add_table('default', 'photoalbum_tags', synchronize_data := false);

-- Rock / Artist
SELECT pglogical.replication_set_add_table('default', 'catalog');
SELECT pglogical.replication_set_add_table('default', 'artist');
SELECT pglogical.replication_set_add_table('default', 'artist_link');

-- Rock Posts
SELECT pglogical.replication_set_add_table('default', 'journey');
SELECT pglogical.replication_set_add_table('default', 'journey_image');
SELECT pglogical.replication_set_add_table('default', 'journey_tracking');

-- Counter
SELECT pglogical.replication_set_add_table('default', 'counter');
SELECT pglogical.replication_set_add_table('default', 'counter_tracking');

-- Music
SELECT pglogical.replication_set_add_table('default', 'music');

-- Page Content
SELECT pglogical.replication_set_add_table('default', 'page_content');

-- Honoring Aiden Entries
-- New table, zero rows at creation time (no backfill/seed) — explicit false.
SELECT pglogical.replication_set_add_table('default', 'entry', synchronize_data := false);

-- Unmatched Path Tracking
-- New table, zero rows at creation time (no backfill/seed) — explicit false.
SELECT pglogical.replication_set_add_table('default', 'unmatched_path_hit', synchronize_data := false);

-- Honoring Aiden Media tab
-- New table, zero rows at creation time (no backfill/seed) — explicit false.
SELECT pglogical.replication_set_add_table('default', 'entry_media', synchronize_data := false);

-- Path Display Names
-- New table, zero rows at creation time (no backfill/seed) — explicit false.
SELECT pglogical.replication_set_add_table('default', 'path_display_name', synchronize_data := false);