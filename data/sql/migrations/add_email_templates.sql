-- Moves every remaining site email into Page Details → Emails as an
-- editable page_content email template (same row shape as
-- 'response-email' / 'follow-rocks-email'; requires
-- add_response_email_page.sql's draft/published_email_subject columns).
-- Rendered by server/src/utils/emailTemplates.js.
--
--   account-verify-email      automatic, ALWAYS ON  {EMAIL} {VERIFY_LINK}
--   password-reset-email      automatic, ALWAYS ON  {EMAIL} {RESET_LINK}
--   new-journey-email         automatic, to admin   {ROCK_NUMBER} {ROCK_IMAGE} {NAME} {DATE}
--                                                   {LOCATION} {COMMENT} {SUBMITTER_EMAIL}
--   new-rock-request-email    automatic, to admin   {NAME} {EMAIL} {ADDRESS} {ROCKS_REQUESTED} {MESSAGE}
--   rock-request-reply-email  default (pre-fills the Rock Request "Send Email" dialog)
--                                                   {NAME} {ROCK_NUMBERS} {TRACKING_NUMBER}
--   send-email-default        default (pre-fills the "Send Email" job), no placeholders
--
-- Every row is seeded Active with the wording the code used before this
-- migration (draft = published), so nothing changes until someone edits it.
-- "Always on" (verify/reset) is enforced in code: PATCH
-- /api/admin/pages/:slug/visible refuses them.
--
-- No DDL — page_content is already in the pglogical replication set. Safe
-- to re-run (idempotent, ON CONFLICT DO NOTHING; order_num is computed per
-- row so new rows land after everything already there).

INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT t.slug, t.label,
       (SELECT COALESCE(MAX(order_num), 0) FROM public.page_content) + t.ord,
       true, t.body, t.body, t.subject, t.subject
FROM (VALUES
  (1, 'account-verify-email', 'Verify Account Email',
   'Verify your Aiden''s Rocks account',
   $html$<h2>Welcome to Aiden's Rocks</h2>
<p>Thank you for joining us in following Aiden's rocks around the world.</p>
<p>Please verify your email address (this link is valid for 24 hours):</p>
<p>{VERIFY_LINK}</p>
<p>If you didn't create an account, you can ignore this email.</p>$html$),

  (2, 'password-reset-email', 'Password Reset Email',
   'Reset your Aiden''s Rocks password',
   $html$<h2>Reset your password</h2>
<p>We received a request to reset your password.</p>
<p>Choose a new password using the link below (valid for 1 hour):</p>
<p>{RESET_LINK}</p>
<p>If you didn't ask for this, you can ignore this email.</p>$html$),

  (3, 'new-journey-email', 'New Rock Journey (to admin)',
   'New Rock Journey: Rock {ROCK_NUMBER}',
   $html$<h2>New Rock Journey Posted</h2>
<p><strong>Rock Number:</strong> {ROCK_NUMBER}</p>
<p><strong>Name:</strong> {NAME}</p>
<p><strong>Date:</strong> {DATE}</p>
<p><strong>Location:</strong> {LOCATION}</p>
<p><strong>Comment:</strong> {COMMENT}</p>
<p><strong>Email:</strong> {SUBMITTER_EMAIL}</p>
<p>This is an automated notification from Aidens Rocks.</p>$html$),

  (4, 'new-rock-request-email', 'New Rock Request (to admin)',
   'New Rock Request from {NAME}',
   $html$<h2>New Rock Request</h2>
<p><strong>Name:</strong> {NAME}</p>
<p><strong>Email:</strong> {EMAIL}</p>
<p><strong>Address:</strong><br>{ADDRESS}</p>
<p><strong>Rocks Requested:</strong> {ROCKS_REQUESTED}</p>
<p><strong>Message:</strong><br>{MESSAGE}</p>
<p>This is an automated notification from Aidens Rocks.</p>$html$),

  (5, 'rock-request-reply-email', 'Rock Request Reply (default)',
   'Your Aiden''s Rocks Are On The Way!',
   $html$<p>Hi {NAME},</p>
<p>We're so happy to let you know we've sent the rock(s) you requested out to you!</p>
<p>Rock number(s): {ROCK_NUMBERS}<br>Tracking Number: {TRACKING_NUMBER}</p>
<p>Thank you so much for helping us remember our son Aiden by giving these rocks a new adventure.</p>
<p>With love,<br>The Aiden's Rocks Family</p>$html$),

  (6, 'send-email-default', 'Send Email (default)',
   '',
   '')
) AS t(ord, slug, label, subject, body)
ON CONFLICT (page_slug) DO NOTHING;
