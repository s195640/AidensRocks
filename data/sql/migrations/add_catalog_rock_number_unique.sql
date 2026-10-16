-- One catalog row per rock number. Nothing enforced this before: a second
-- "rock 12" doubled that rock's artists everywhere, inflated the total rock
-- count, and its image save overwrote the first rock's photo (both use
-- media/catalog/<rock_number>/). See data/ai-build-docs/bug-sweep/todo.md #6.
--
-- Fails if duplicates already exist. Check first with:
--   SELECT rock_number, COUNT(*) FROM catalog GROUP BY rock_number HAVING COUNT(*) > 1;
-- (prod returned 0 rows on 2026-10-16). Safe to re-run.
--
-- Prod: run on BOTH pglogical nodes -- schema changes aren't replicated.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'catalog_rock_number_key'
  ) THEN
    ALTER TABLE public.catalog
      ADD CONSTRAINT catalog_rock_number_key UNIQUE (rock_number);
  END IF;
END $$;
