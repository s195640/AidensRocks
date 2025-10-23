-- Photo Albums
SELECT pglogical.replication_set_add_table('default', 'photoalbums');
SELECT pglogical.replication_set_add_table('default', 'photos');

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