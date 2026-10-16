-- STEP 04 of 05 -- run on ONE server only (Node A), after step 03 is done
-- on both. Do NOT run it on Node B: page_content replicates, so Node B gets
-- these rows from Node A. Running it on both would create the rows twice
-- and conflict.
--
-- Adds the two error alert email templates (Page Details):
--   error-new-email            a new kind of error appeared
--   error-daily-summary-email  the morning summary
-- draft = published, with the same Sender / Reply-To / Send To as the
-- upload failure emails (failures@aidensrocks.com). Only fills rows that
-- don't exist / have never been set, so re-running on Node A never
-- overwrites an admin's edits.

INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT t.slug, t.label,
       (SELECT COALESCE(MAX(order_num), 0) FROM public.page_content) + t.ord,
       true, t.body, t.body, t.subject, t.subject
FROM (VALUES
  (1, 'error-new-email', 'New Site Error (to admin)',
   'New error on the site: {TITLE}',
   $html$<p>A new kind of error just happened on the site.</p>
<p><strong>{TITLE}</strong></p>
<p><strong>Type:</strong> {TYPE}<br>
<strong>Page:</strong> {PAGE}<br>
<strong>Device:</strong> {PLATFORM}<br>
<strong>Version:</strong> {VERSION}</p>
<p>{DASHBOARD_LINK}</p>$html$),

  (2, 'error-daily-summary-email', 'Daily Error Summary (to admin)',
   'Site errors in the last 24 hours: {ERROR_COUNT}',
   $html$<p>{ERROR_COUNT} error(s) of {GROUP_COUNT} kind(s) happened on the site in the last 24 hours.</p>
{ERROR_SUMMARY}
<p>{STILL_NEW} kind(s) of error are still marked New on the dashboard.</p>
<p>{DASHBOARD_LINK}</p>$html$)
) AS t(ord, slug, label, subject, body)
ON CONFLICT (page_slug) DO NOTHING;

UPDATE public.page_content p
SET draft_email_from = v.sender,     published_email_from = v.sender,
    draft_email_reply_to = v.reply,  published_email_reply_to = v.reply,
    draft_email_to = v.send_to,      published_email_to = v.send_to
FROM (VALUES
  ('error-new-email',           'Aiden''s Rocks – Failures <failures@aidensrocks.com>', 'noreply@aidensrocks.com', 'failures@aidensrocks.com'),
  ('error-daily-summary-email', 'Aiden''s Rocks – Failures <failures@aidensrocks.com>', 'noreply@aidensrocks.com', 'failures@aidensrocks.com')
) AS v(slug, sender, reply, send_to)
WHERE p.page_slug = v.slug
  AND p.draft_email_from IS NULL AND p.published_email_from IS NULL;
