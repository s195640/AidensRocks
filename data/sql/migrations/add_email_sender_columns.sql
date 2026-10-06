-- Per-template Sender / Reply-To / Send To for every email template in
-- Page Details, plus the site-wide "contact-email" setting. See
-- data/ai-build-docs/email-senders-and-site-settings/.
--
--   {draft,published}_email_from      Sender (From), e.g.
--                                     Aiden's Rocks – Requests <requests@aidensrocks.com>
--   {draft,published}_email_reply_to  Reply-To, a single address
--   {draft,published}_email_to        Send To -- only used by the 4 emails sent
--                                     to the family (new request, new journey,
--                                     both upload failures); every other
--                                     template goes to the visitor it's about.
--
-- Same draft/published pair as the subject: edits go live on Publish.
-- NULL = default (EMAIL_FROM / EMAIL_REPLY_TO in .env; a blank Send To
-- falls back to the template's own Sender address).
--
-- The seed below only fills rows that have never been set, so re-running
-- never overwrites an admin's edits.
--
-- HOW TO RUN (prod's two nodes replicate to EACH OTHER with pglogical):
--   PART 1 (DDL) -- run on BOTH nodes. pglogical does not replicate DDL,
--                   and a node must have the columns before it receives
--                   replicated rows that use them.
--   PART 2 (data) -- run on ONE node only, after PART 1 is done on both.
--                   It replicates to the other node; running it on both
--                   would create the same rows twice and conflict.
-- Both parts are idempotent (safe to re-run on the same node). Full
-- deploy runbook: data/ai-build-docs/email-senders-and-site-settings/DEPLOY.md.
-- page_content and setting are already in the replication set.

-- ==================== PART 1: run on BOTH nodes ====================
ALTER TABLE public.page_content ADD COLUMN IF NOT EXISTS draft_email_from text;
ALTER TABLE public.page_content ADD COLUMN IF NOT EXISTS published_email_from text;
ALTER TABLE public.page_content ADD COLUMN IF NOT EXISTS draft_email_reply_to text;
ALTER TABLE public.page_content ADD COLUMN IF NOT EXISTS published_email_reply_to text;
ALTER TABLE public.page_content ADD COLUMN IF NOT EXISTS draft_email_to text;
ALTER TABLE public.page_content ADD COLUMN IF NOT EXISTS published_email_to text;

-- ============ PART 2: run on ONE node only (after PART 1 on both) ============
UPDATE public.page_content p
SET draft_email_from = v.sender,     published_email_from = v.sender,
    draft_email_reply_to = v.reply,  published_email_reply_to = v.reply,
    draft_email_to = v.send_to,      published_email_to = v.send_to
FROM (VALUES
  ('new-rock-request-email',         'Aiden''s Rocks – Requests <requests@aidensrocks.com>', 'noreply@aidensrocks.com',      'requests@aidensrocks.com'),
  ('new-journey-email',              'Aiden''s Rocks – Journeys <journeys@aidensrocks.com>', 'noreply@aidensrocks.com',      'journeys@aidensrocks.com'),
  ('upload-files-failed-email',      'Aiden''s Rocks – Failures <failures@aidensrocks.com>', 'noreply@aidensrocks.com',      'failures@aidensrocks.com'),
  ('upload-processing-failed-email', 'Aiden''s Rocks – Failures <failures@aidensrocks.com>', 'noreply@aidensrocks.com',      'failures@aidensrocks.com'),
  ('follow-rocks-email',             'Aiden''s Rocks <noreply@aidensrocks.com>',            'aidensfamily@aidensrocks.com', NULL),
  ('rock-request-reply-email',       'Aiden''s Rocks <noreply@aidensrocks.com>',            'aidensfamily@aidensrocks.com', NULL),
  ('account-verify-email',           'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL),
  ('password-reset-email',           'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL),
  ('response-email',                 'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL),
  ('response-email-multi',           'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL),
  ('send-email-default',             'Aiden''s Rocks <noreply@aidensrocks.com>',            'noreply@aidensrocks.com',      NULL)
) AS v(slug, sender, reply, send_to)
WHERE p.page_slug = v.slug
  AND p.draft_email_from IS NULL AND p.published_email_from IS NULL
  AND p.draft_email_reply_to IS NULL AND p.published_email_reply_to IS NULL;

-- Site-wide contact email shown to visitors (Contact Us, "email us" error
-- messages, the Contact Email chip and {CONTACT_EMAIL} in emails). Edited
-- in Admin → Settings.
INSERT INTO public.setting (name, value, type, description)
VALUES ('contact-email', '"aidensfamily@aidensrocks.com"', 'site',
        'Contact email shown to visitors (Contact Us, error messages, {CONTACT_EMAIL}).')
ON CONFLICT (name) DO NOTHING;
