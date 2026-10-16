-- STEP 03 of 05 -- run on BOTH servers (Node A, then Node B), after steps
-- 01 and 02 are done on both. Finish this step on both servers before
-- starting step 04.
--
-- Adds the four new tables to each server's pglogical replication set. The
-- servers replicate to each other, and each one only sends changes for
-- tables in its own set; visits and errors are written on whichever server
-- handles the request, so both need this.
--
-- The tables are empty, so synchronize_data := false. visit before
-- site_event (site_event rows reference it).
--
-- If a server says a table is already in the set, that one is done; run
-- the remaining lines.

SELECT pglogical.replication_set_add_table('default', 'visit', synchronize_data := false);
SELECT pglogical.replication_set_add_table('default', 'site_event', synchronize_data := false);
SELECT pglogical.replication_set_add_table('default', 'server_error', synchronize_data := false);
SELECT pglogical.replication_set_add_table('default', 'error_group', synchronize_data := false);
