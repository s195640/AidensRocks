-- Adds the Request A Rock "Need rocks by" date and "No rush" checkbox to
-- rock_requests. New public/admin-created requests must have one or the
-- other (enforced in server/src/routes/rockRequests.js, not a CHECK
-- constraint, so requests made before this field existed stay valid with
-- neither set). no_rush = true always has needed_by NULL.
--
-- Also adds a "Need Rocks By: {NEEDED_BY}" line to the New Rock Request (to
-- admin) email template, right after the Rocks Requested line. Only touches
-- the draft/published body if that exact line is still there and the token
-- isn't already present -- if the template was reworded, add {NEEDED_BY} by
-- hand in Page Details → Emails.
--
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run
-- (idempotent). No new replication_set_add_table line needed --
-- rock_requests and page_content are already registered.

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS needed_by date;

ALTER TABLE public.rock_requests
    ADD COLUMN IF NOT EXISTS no_rush boolean NOT NULL DEFAULT false;

UPDATE public.page_content
SET draft_body = REPLACE(draft_body,
      '<p><strong>Rocks Requested:</strong> {ROCKS_REQUESTED}</p>',
      '<p><strong>Rocks Requested:</strong> {ROCKS_REQUESTED}</p>' || chr(10) || '<p><strong>Need Rocks By:</strong> {NEEDED_BY}</p>')
WHERE page_slug = 'new-rock-request-email'
  AND draft_body NOT LIKE '%{NEEDED_BY}%';

UPDATE public.page_content
SET published_body = REPLACE(published_body,
      '<p><strong>Rocks Requested:</strong> {ROCKS_REQUESTED}</p>',
      '<p><strong>Rocks Requested:</strong> {ROCKS_REQUESTED}</p>' || chr(10) || '<p><strong>Need Rocks By:</strong> {NEEDED_BY}</p>')
WHERE page_slug = 'new-rock-request-email'
  AND published_body NOT LIKE '%{NEEDED_BY}%';
