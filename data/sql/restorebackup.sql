-- bring up only the database
docker compose -f ~/AidensRocks/data/docker-compose/docker-compose-demo.yml up postgres -d

docker exec -it database psql -U postgres -d postgres
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'aidensrocks';


SELECT * FROM pg_replication_slots;

SELECT pg_terminate_backend(174);
SELECT pg_drop_replication_slot('pgl_aidensrocks_node2_sub_node1');

-- drop database
DROP DATABASE aidensrocks;

-- recreate
CREATE DATABASE aidensrocks;
psql -h 192.168.1.57 -p 5432 -U postgres -d aidensrocks -f aidensrocks_backup_2025-09-30_19-00.sql