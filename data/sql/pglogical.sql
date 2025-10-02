-- Photo Albums
SELECT pglogical.replication_set_add_table('default', 'photoalbums');
SELECT pglogical.replication_set_add_table('default', 'photos');

-- Rock / Artist
SELECT pglogical.replication_set_add_table('default', 'rock_catalog');
SELECT pglogical.replication_set_add_table('default', 'rock_artist');
SELECT pglogical.replication_set_add_table('default', 'rock_artist_link');

-- Rock Posts
SELECT pglogical.replication_set_add_table('default', 'rock_post_summary');
SELECT pglogical.replication_set_add_table('default', 'rock_post_image');
SELECT pglogical.replication_set_add_table('default', 'rock_post_tracking');

-- Counter
SELECT pglogical.replication_set_add_table('default', 'rock_count_summary');
SELECT pglogical.replication_set_add_table('default', 'rock_count_tracking');
