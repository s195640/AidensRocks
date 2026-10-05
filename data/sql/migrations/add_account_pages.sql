-- Adds the account pages to Page Details (/admin/pages → "Account Pages"):
--
--   sign-in         /login            always on (PATCH visible refuses it)
--   create-account  /sign-up          Active off → "Create an account" hidden
--                                     on Sign In, page + POST /api/auth/signup
--                                     refuse
--   reset-password  /forgot-password  Active off → "Forgot your password?"
--                                     hidden on Sign In, page + POST
--                                     /api/auth/forgot-password refuse (the
--                                     emailed /reset-password?token= link and
--                                     the admin's "send reset email" still work)
--
-- Each row's editable Title lives in draft/published_email_subject (the
-- existing subject pair, reused rather than adding columns — requires
-- add_response_email_page.sql) and its description in draft/published_body.
-- Seeded Active with the wording those pages already showed.
-- These rows are excluded from the public nav (routes/pages.js).
--
-- No DDL — page_content is already in the pglogical replication set. Safe
-- to re-run (idempotent, ON CONFLICT DO NOTHING).

INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT t.slug, t.label,
       (SELECT COALESCE(MAX(order_num), 0) FROM public.page_content) + t.ord,
       true, t.body, t.body, t.title, t.title
FROM (VALUES
  (1, 'sign-in', 'Sign In', 'Sign In',
   $html$<p>Follow Aiden's rocks on their journeys.</p>$html$),
  (2, 'create-account', 'Create an Account', 'Create an Account',
   $html$<p>Follow rocks you care about and hear when they travel somewhere new.</p>$html$),
  (3, 'reset-password', 'Reset Password', 'Reset Password',
   $html$<p>Enter your email and we'll send you a link to choose a new password. This also unlocks a locked account.</p>$html$)
) AS t(ord, slug, label, title, body)
ON CONFLICT (page_slug) DO NOTHING;
