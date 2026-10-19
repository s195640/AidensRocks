-- STEP 01 of 01 -- run on ONE server only (Node A). No code deploy goes
-- with it. Do NOT run it on Node B: catalog replicates, so Node B gets
-- these updates from Node A.
--
-- One-time data cleanup: a rock still marked available but already out on
-- a journey wasn't really available. Every such rock becomes:
--   assign_status = 'unknown'   (it was given out, but we don't know to whom)
--   assigned_dt   = the date of its first journey stop
--   comment       = "Found on journey; recipient unknown" -- added on a
--                   new line when the rock already has a comment, never
--                   overwriting it (the date is in assigned_dt)
--
-- "Has a journey" = at least one PUBLIC stop: journey.show AND a visible
-- image, the same rule as server/src/utils/visibleJourneySql.js (and the
-- Rocks page's clickable Rock #). Hidden or still-processing uploads don't
-- count. "First stop" = earliest public stop by the date the finder
-- entered (journey.date), falling back to its upload date (create_dt).
--
-- Safe to re-run: a rock it changes is no longer available, so a second
-- run finds nothing. update_dt is deliberately left alone.
--
-- DRY RUN BY DEFAULT. As written it changes nothing: it makes the updates,
-- reports them, then undoes them --
--   NOTICE:  DRY RUN: would update 12 rock(s): 101, 102, ... Nothing was changed.
-- To apply for real, change  dry_run CONSTANT boolean := true  to false
-- below and run it again; it then reports  NOTICE:  Updated 12 rock(s): ...
-- Works in any client (psql, pgAdmin, DBeaver): no BEGIN/COMMIT needed.
--
-- Preview first (rocks it will change, with the date it will set):
--   WITH first_stop AS (
--     SELECT DISTINCT ON (j.rock_number) j.rock_number,
--            COALESCE(j.date, j.create_dt)::date AS first_dt, j.location
--     FROM journey j
--     WHERE j.show = TRUE
--       AND EXISTS (SELECT 1 FROM journey_image ji WHERE ji.rps_key = j.rps_key AND ji.show = TRUE)
--     ORDER BY j.rock_number, COALESCE(j.date, j.create_dt), j.rps_key
--   )
--   SELECT c.rock_number, c.comment AS current_comment, fs.first_dt, fs.location
--   FROM catalog c JOIN first_stop fs ON fs.rock_number = c.rock_number
--   WHERE c.assign_status = 'available'
--   ORDER BY c.rock_number;

DO $$
DECLARE
  dry_run CONSTANT boolean := true;  -- <<< false to apply the changes
  changed integer;
  rocks   text;
BEGIN
  -- Inner block = a savepoint: on a dry run, raising 'DRYRN' rolls back
  -- just the update. changed and rocks keep their values for the notice.
  BEGIN
    WITH first_stop AS (
      SELECT DISTINCT ON (j.rock_number)
             j.rock_number,
             COALESCE(j.date, j.create_dt)::date AS first_dt
      FROM public.journey j
      WHERE j.show = TRUE
        AND EXISTS (
          SELECT 1 FROM public.journey_image ji
          WHERE ji.rps_key = j.rps_key AND ji.show = TRUE
        )
      ORDER BY j.rock_number, COALESCE(j.date, j.create_dt), j.rps_key
    ), updated AS (
      UPDATE public.catalog c
      SET assign_status = 'unknown',
          assigned_dt   = fs.first_dt,
          comment       = CASE
                            WHEN NULLIF(btrim(c.comment), '') IS NULL THEN 'Found on journey; recipient unknown'
                            ELSE c.comment || E'\n' || 'Found on journey; recipient unknown'
                          END
      FROM first_stop fs
      WHERE fs.rock_number = c.rock_number
        AND c.assign_status = 'available'
      RETURNING c.rock_number
    )
    SELECT count(*), COALESCE(string_agg(rock_number::text, ', ' ORDER BY rock_number), 'none')
    INTO changed, rocks
    FROM updated;

    IF dry_run THEN
      RAISE EXCEPTION USING ERRCODE = 'DRYRN', MESSAGE = 'dry run';
    END IF;
  EXCEPTION WHEN SQLSTATE 'DRYRN' THEN
    RAISE NOTICE 'DRY RUN: would update % rock(s): %. Nothing was changed.', changed, rocks;
    RETURN;
  END;

  RAISE NOTICE 'Updated % rock(s): %.', changed, rocks;
END $$;
