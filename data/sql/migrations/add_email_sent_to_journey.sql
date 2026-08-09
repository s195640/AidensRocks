-- Adds Response Email send-tracking to the journey table (rock journey
-- submissions). email_sent/email_dt record whether/when the automatic
-- "Response Email" (see server/src/utils/rock-upload/sendRockResponseEmail.js)
-- was actually sent for a given submission.
-- pglogical does not replicate DDL: run this by hand, identically, on the
-- provider node first, then the subscriber node. Safe to re-run (idempotent)
-- if a deploy step fails partway through.

ALTER TABLE public.journey
    ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false;

ALTER TABLE public.journey
    ADD COLUMN IF NOT EXISTS email_dt timestamp with time zone DEFAULT NULL;
