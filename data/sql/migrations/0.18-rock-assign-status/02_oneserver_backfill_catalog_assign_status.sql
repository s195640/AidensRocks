-- STEP 02 of 02 -- run on ONE server only (Node A), right after step 01 is
-- done on both, before deploying the code. Do NOT run it on Node B:
-- catalog replicates, so Node B gets these updates from Node A.
--
-- One-time backfill of catalog.assign_status / assigned_dt:
--   1. Linked to a rock request (rq_key set)  -> assigned, dated the
--      request's update_dt.
--   2. Otherwise, has a comment               -> assigned, dated the rock's
--      own update_dt (the last time its comment was saved).
--   3. Everything else                        -> available, no date.
--
-- Re-running it resets every rock to these rules, wiping any status set by
-- hand since -- so run it once. update_dt is deliberately left alone.
--
-- Preview first with:
--   SELECT CASE WHEN rq_key IS NOT NULL THEN 'linked'
--               WHEN NULLIF(btrim(comment), '') IS NOT NULL THEN 'comment'
--               ELSE 'available' END AS rule, COUNT(*)
--   FROM catalog GROUP BY 1;

BEGIN;

UPDATE public.catalog c
SET assign_status = 'assigned',
    assigned_dt   = rr.update_dt::date
FROM public.rock_requests rr
WHERE rr.rq_key = c.rq_key;

UPDATE public.catalog
SET assign_status = 'assigned',
    assigned_dt   = update_dt::date
WHERE rq_key IS NULL
  AND NULLIF(btrim(comment), '') IS NOT NULL;

UPDATE public.catalog
SET assign_status = 'available',
    assigned_dt   = NULL
WHERE rq_key IS NULL
  AND NULLIF(btrim(comment), '') IS NULL;

COMMIT;
