-- Sequence offset for SERVER 1 ONLY.
--
-- The two prod servers replicate rows to each other (pglogical) but not
-- sequences, so each one hands out keys from its own range:
--   server 1: 100000 - 999999 in every table
--   server 2: below 100000 (counter / counter_tracking: 1000000+)
--
-- Run this on server 1:
--   - after any restore onto server 1 (a pg_dump carries the other
--     server's setval()s, see restorebackup.sql)
--   - after deploying a new table with a serial key
-- It moves any sequence that's outside 100000-999999, or behind server 1's
-- own rows in that range, and leaves the rest alone. It refuses to run on
-- server 2.
--
-- Run it with dry_run = true first, check the NOTICE lines, then set false.

DO $$
DECLARE
  dry_run  boolean := true;   -- change to false to apply
  r        record;
  s        record;
  max_mid  bigint;
  target   bigint;
BEGIN
  -- Guard: server 1 has journey's sequence at 100000+; server 2 has it below 100000.
  IF (SELECT last_value FROM journey_rps_key_seq) < 100000 THEN
    RAISE EXCEPTION 'This looks like server 2. Nothing changed.';
  END IF;

  FOR r IN
    SELECT c.relname AS tbl, a.attname AS col,
           substring(pg_get_expr(ad.adbin, ad.adrelid) from 'nextval\(''([^'']+)''') AS seq
    FROM pg_attrdef ad
    JOIN pg_class c     ON c.oid = ad.adrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
    WHERE pg_get_expr(ad.adbin, ad.adrelid) LIKE 'nextval(%'
    ORDER BY 1
  LOOP
    EXECUTE format('SELECT last_value, is_called FROM %s', r.seq) INTO s;
    EXECUTE format('SELECT max(%1$I) FROM %2$I WHERE %1$I >= 100000 AND %1$I < 1000000', r.col, r.tbl)
      INTO max_mid;
    target := coalesce(max_mid + 1, 100000);   -- next key this server should hand out

    IF (CASE WHEN s.is_called THEN s.last_value + 1 ELSE s.last_value END) BETWEEN target AND 999999 THEN
      RAISE NOTICE 'OK     %: next=%', r.tbl, CASE WHEN s.is_called THEN s.last_value + 1 ELSE s.last_value END;
    ELSE
      RAISE NOTICE 'RESET  %: seq=% -> next key %', r.tbl, s.last_value, target;
      IF NOT dry_run THEN
        PERFORM setval(r.seq::regclass, target, false);
      END IF;
    END IF;
  END LOOP;
END $$;

/*
-- Report (read-only, safe on either server): each sequence and where its
-- table's keys sit in the three ranges.
DO $$
DECLARE
  r record; s record;
  max_low bigint; n_mid bigint; max_mid bigint; n_high bigint; max_high bigint;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl, a.attname AS col,
           substring(pg_get_expr(ad.adbin, ad.adrelid) from 'nextval\(''([^'']+)''') AS seq
    FROM pg_attrdef ad
    JOIN pg_class c     ON c.oid = ad.adrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    JOIN pg_attribute a ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
    WHERE pg_get_expr(ad.adbin, ad.adrelid) LIKE 'nextval(%'
    ORDER BY 1
  LOOP
    EXECUTE format('SELECT last_value, is_called FROM %s', r.seq) INTO s;
    EXECUTE format($q$SELECT max(%1$I) FILTER (WHERE %1$I < 100000),
                             count(*)  FILTER (WHERE %1$I >= 100000 AND %1$I < 1000000),
                             max(%1$I) FILTER (WHERE %1$I >= 100000 AND %1$I < 1000000),
                             count(*)  FILTER (WHERE %1$I >= 1000000),
                             max(%1$I) FILTER (WHERE %1$I >= 1000000)
                      FROM %2$I$q$, r.col, r.tbl)
      INTO max_low, n_mid, max_mid, n_high, max_high;
    RAISE NOTICE '% | seq=% called=% | low max=% | 100k: n=% max=% | 1M: n=% max=%',
      r.tbl, s.last_value, s.is_called, max_low, n_mid, max_mid, n_high, max_high;
  END LOOP;
END $$;
*/
