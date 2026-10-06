-- Moves the two rock-upload failure emails to the admin into Page Details →
-- Emails as editable templates (same row shape as add_email_templates.sql).
-- Sent by server/src/utils/rock-upload/processImagesInBackground.js:
--
--   upload-files-failed-email       some files in an upload didn't process
--                                   {ROCK_NUMBER} {JOURNEY_ID} {FAILED_COUNT}
--                                   {PUBLISH_STATUS} {FAILED_FILES}
--   upload-processing-failed-email  processing failed outright
--                                   {ROCK_NUMBER} {JOURNEY_ID} {ERROR} {FOLDER}
--
-- Both are ALWAYS ON (a failed upload always needs a human), enforced in
-- code via REQUIRED_EMAIL_SLUGS, like the verify/reset emails. When the
-- New Rock Journey email is Active, the files-failed body is put in a red
-- box at the top of that email instead of being sent on its own.
--
-- Seeded with the wording the code used before (draft = published), so
-- nothing changes until someone edits it. The code keeps that wording as a
-- fallback if a template can't be loaded.
--
-- No DDL -- page_content is already in the pglogical replication set. Safe
-- to re-run (idempotent, ON CONFLICT DO NOTHING; order_num is computed per
-- row so new rows land after everything already there).

INSERT INTO public.page_content
  (page_slug, nav_label, order_num, visible, draft_body, published_body, draft_email_subject, published_email_subject)
SELECT t.slug, t.label,
       (SELECT COALESCE(MAX(order_num), 0) FROM public.page_content) + t.ord,
       true, t.body, t.body, t.subject, t.subject
FROM (VALUES
  (1, 'upload-files-failed-email', 'Upload Files Failed (to admin)',
   '[{FAILED_COUNT} FILE(S) FAILED] Rock upload: Rock {ROCK_NUMBER}',
   $html$<p><strong>{FAILED_COUNT} file(s) in this upload could not be processed</strong> and are hidden (journey #{JOURNEY_ID}).</p>
<p>{PUBLISH_STATUS}</p>
{FAILED_FILES}
<p>The originals are still on the server.</p>$html$),

  (2, 'upload-processing-failed-email', 'Upload Processing Failed (to admin)',
   'Rock upload processing FAILED: Rock {ROCK_NUMBER}',
   $html$<p>Processing the upload for rock {ROCK_NUMBER} (journey #{JOURNEY_ID}) failed, so it may still be hidden in Journey admin.</p>
<p>Error: {ERROR}</p>
<p>Folder: {FOLDER}</p>$html$)
) AS t(ord, slug, label, subject, body)
ON CONFLICT (page_slug) DO NOTHING;
