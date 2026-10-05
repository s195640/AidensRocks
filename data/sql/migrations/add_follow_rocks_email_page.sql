-- Adds "Follow Rocks Email" (Page Details / email templates): the email
-- sent to people following a rock when it gets a new journey stop (see
-- server/src/utils/rock-upload/notifyFollowers.js). Same page_content
-- email-template row shape as 'response-email' / 'response-email-multi'
-- (requires add_response_email_page.sql's draft/published_email_subject
-- columns), editable at /admin/pages.
--
-- Placeholders: {ROCK_NUMBER}, {ROCK_IMAGE}, {LOCATION}, {DATE},
-- {ROCK_JOURNEY_LINK}.
--
-- Unlike the response-email rows, visible (= Active) starts TRUE and the
-- body/subject are seeded (draft + published) with the wording these emails
-- already used, so rock-moved emails keep going out unchanged after this is
-- applied. Turning Active off in Page Details stops them.
--
-- No DDL — just the INSERT, which pglogical replicates fine since
-- page_content is already in the replication set. Safe to re-run
-- (idempotent).

WITH body AS (
  SELECT
    $html$<h2>Rock {ROCK_NUMBER} has a new adventure</h2>
<p>Rock {ROCK_NUMBER}, one of the rocks you follow, has traveled to {LOCATION} on {DATE}.</p>
<p>{ROCK_IMAGE}</p>
<p>{ROCK_JOURNEY_LINK}</p>
<p>You're receiving this because you turned on rock move emails on your Follow Rocks page.</p>$html$::text AS content,
    'Rock {ROCK_NUMBER} has a new adventure'::text AS subject
)
INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT 'follow-rocks-email', 'Follow Rocks Email',
       (SELECT COALESCE(MAX(order_num), 0) + 1 FROM public.page_content),
       true, content, content, subject, subject
FROM body
ON CONFLICT (page_slug) DO NOTHING;
