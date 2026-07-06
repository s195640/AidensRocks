-- Follow-up to add_page_content_table.sql: seeds nav-only rows for the three
-- public pages that aren't part of the content-editing feature (no rich text
-- to convert) but still need a page_content row now that the navbar reads
-- entirely from GET /api/pages instead of a hardcoded list. draft_body/
-- published_body stay empty — these pages keep their existing hardcoded JSX
-- untouched; only nav_label/order_num/visible matter for them.
-- Safe to re-run (idempotent, ON CONFLICT DO NOTHING). No pglogical action
-- needed here — page_content is already in the replication set.

INSERT INTO public.page_content (page_slug, nav_label, order_num, visible)
VALUES
  ('photos', 'Photos', 2, true),
  ('track-the-rocks', 'Track The Rocks', 3, true),
  ('map', 'Map', 4, true)
ON CONFLICT (page_slug) DO NOTHING;
