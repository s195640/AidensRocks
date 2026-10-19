-- STEP 02 of 02 -- run on ONE server only (Node A). Any time after step 01
-- is done on both; before or after the code deploy doesn't matter. Do NOT
-- run it on Node B: catalog replicates, so Node B gets these updates.
--
-- One-time data cleanup: every rock whose ONLY artist is Kayla Ellington
-- and that's still available becomes:
--   assign_status = 'assigned'
--   assigned_dt   = the date the rock was added (create_dt)
--   comment       = "Brooke's dance student" (added on a new line when the
--                   rock already has a comment, never overwriting it)
-- Rocks Kayla shares with another artist are left alone.
--
-- Safe to re-run: a rock it changes is no longer available, so a second
-- run finds nothing. update_dt is deliberately left alone.
--
-- Preview first (rocks it will change):
--   SELECT c.rock_number, c.comment, c.create_dt::date
--   FROM catalog c
--   WHERE c.assign_status = 'available'
--     AND EXISTS (SELECT 1 FROM artist_link l JOIN artist a ON a.ra_key = l.ra_key
--                 WHERE l.rc_key = c.rc_key AND lower(btrim(a.display_name)) = 'kayla ellington')
--     AND NOT EXISTS (SELECT 1 FROM artist_link l JOIN artist a ON a.ra_key = l.ra_key
--                     WHERE l.rc_key = c.rc_key AND lower(btrim(a.display_name)) <> 'kayla ellington')
--   ORDER BY c.rock_number;

BEGIN;

UPDATE public.catalog c
SET assign_status = 'assigned',
    assigned_dt   = c.create_dt::date,
    comment       = CASE
                      WHEN NULLIF(btrim(c.comment), '') IS NULL THEN 'Brooke''s dance student'
                      ELSE c.comment || E'\n' || 'Brooke''s dance student'
                    END
WHERE c.assign_status = 'available'
  AND EXISTS (
    SELECT 1 FROM public.artist_link l JOIN public.artist a ON a.ra_key = l.ra_key
    WHERE l.rc_key = c.rc_key AND lower(btrim(a.display_name)) = 'kayla ellington'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.artist_link l JOIN public.artist a ON a.ra_key = l.ra_key
    WHERE l.rc_key = c.rc_key AND lower(btrim(a.display_name)) <> 'kayla ellington'
  );

COMMIT;
