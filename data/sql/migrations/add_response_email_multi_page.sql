-- Adds "Response Email Multi" (Page Details / email templates): a second
-- page_content row alongside 'response-email' (see
-- add_response_email_page.sql), for the multi-rock variant of that
-- template. Reuses the same draft_email_subject/published_email_subject
-- columns that migration already added — no schema change needed here,
-- just a new row.
--
-- visible starts (and always stays) false for this row, same convention as
-- 'response-email' (see routes/pagesAdmin.js's EMAIL_SLUGS-gated handling
-- of the Active/Inactive toggle).
--
-- pglogical does not replicate DDL, but there's no DDL here — just the
-- INSERT, which pglogical replicates fine since page_content is already in
-- the replication set (see add_nav_pages_seed.sql). Safe to re-run
-- (idempotent).

INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT 'response-email-multi', 'Response Email Multi', COALESCE(MAX(order_num), 0) + 1, false, '', '', '', ''
FROM public.page_content
ON CONFLICT (page_slug) DO NOTHING;
