-- Adds "Response Email" (Page Details / email templates): a page_content
-- row that represents an editable email template rather than a public page,
-- plus a subject-line pair (draft_email_subject/published_email_subject)
-- mirroring the existing draft_body/published_body columns.
--
-- visible starts (and always stays) false for this row — enforced in code,
-- not a DB constraint (see the LOCKED_VISIBLE_SLUGS guard on
-- PATCH /api/admin/pages/:slug/visible in routes/pagesAdmin.js), consistent
-- with this table's existing "just a row, specialness lives in code" pattern
-- rather than a new schema flag.
--
-- pglogical does not replicate DDL: run the ALTER TABLE by hand, identically,
-- on the provider node first, then the subscriber node. The INSERT below
-- doesn't need separate pglogical action — page_content is already in the
-- replication set (see add_nav_pages_seed.sql). Safe to re-run (idempotent).

ALTER TABLE public.page_content
  ADD COLUMN IF NOT EXISTS draft_email_subject text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS published_email_subject text NOT NULL DEFAULT '';

INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT 'response-email', 'Response Email', COALESCE(MAX(order_num), 0) + 1, false, '', '', '', ''
FROM public.page_content
ON CONFLICT (page_slug) DO NOTHING;
