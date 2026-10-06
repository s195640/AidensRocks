# Per-email Sender / Reply-To / Send To + a global Contact Email setting

## Context

Mail now goes out through Resend from `aidensrocks.com`, and the domain already forwards inbound mail to Gmail. You want to:

1. Tell the 4 admin notification emails apart at a glance. Each gets its own sender (`requests@`, `journeys@`, `failures@`) and is sent *to* that same address, which forwards to Gmail.
2. Make every email's **Sender**, **Reply-To** and (for admin emails) **Send To** editable in Page Details, instead of hard-coded.
3. Change the visitor-facing contact address to `aidensfamily@aidensrocks.com`, stored once in the database (`setting` table) and never hard-coded again. Add a `{CONTACT_EMAIL}` placeholder for page text and email templates.

Today `AidensRocks.AAA@gmail.com` is hard-coded in 2 server senders, 4 visitor-facing client spots, and the admin email Preview's "From" line.

Definitions:
- **Sender** = the From address
- **Send To** = the recipient. Only admin emails have it; visitor emails always go to the visitor.
- **Reply-To** = where a reply goes

## Part 1: Sender / Reply-To / Send To per email template

**Data model** (needs approval; this plan is that approval). Add 6 nullable text columns to `page_content`, using the same draft/published pattern as the subject, so edits only go live on Publish and Preview/test Send match what you saw:
`draft_email_from`, `published_email_from`, `draft_email_reply_to`, `published_email_reply_to`, `draft_email_to`, `published_email_to`.
- Sender is stored as one string, e.g. `Aiden's Rocks – Requests <requests@aidensrocks.com>`. It's validated server-side with nodemailer's `addressparser` (already a dependency): exactly one valid address, with an optional name.
- Reply-To and Send To are each a single email address.

**Seeded values** (migration `add_email_sender_columns.sql` + `createdb.sql`; draft = published):

| Template | Sender | Reply-To | Send To |
|---|---|---|---|
| New Rock Request (to admin) | `Aiden's Rocks – Requests <requests@aidensrocks.com>` | noreply@ | requests@aidensrocks.com |
| New Rock Journey (to admin) | `Aiden's Rocks – Journeys <journeys@aidensrocks.com>` | noreply@ | journeys@aidensrocks.com |
| Upload Files Failed / Upload Processing Failed | `Aiden's Rocks – Failures <failures@aidensrocks.com>` | noreply@ | failures@aidensrocks.com |
| Follow Rocks (rock moved), Rock Request Reply ("on the way") | `Aiden's Rocks <noreply@aidensrocks.com>` | aidensfamily@aidensrocks.com | (none, goes to the visitor) |
| Every other template (verify, reset, response emails, send-email default) | `Aiden's Rocks <noreply@aidensrocks.com>` | noreply@aidensrocks.com | (none, goes to the visitor) |

**Server:**
- `server/src/utils/emailTemplates.js`, `renderEmailTemplate`: also select and return `from`, `replyTo`, `to` for the requested version (draft/published).
- `server/src/utils/sendEmail.js`: accept optional `from` / `replyTo` per call. A blank value falls back to the existing `EMAIL_FROM` / `EMAIL_REPLY_TO` env vars.
- New `ADMIN_RECIPIENT_SLUGS` in `emailTemplates.js` (the 4 admin templates). For these, Send To comes from the template, and a blank value falls back to the template's own Sender address, as you asked.
- **Remove both hard-coded recipients:** `rockRequests.js:144` and `ADMIN_EMAIL` in `processImagesInBackground.js`. They use the rendered template's `to`/`from`/`replyTo` instead.
- **Safety net:** when a failure template can't be read at all (the DB is the thing that broke), the recipient comes from a new optional env var `ADMIN_ALERT_EMAIL`. If that's unset, the failure is logged only. This keeps the "a failure is never silently dropped" guarantee without hard-coding an address.
- **Everything else passes `from`/`replyTo` from its template:** account emails (`utils/auth/accountEmails.js`), follower updates (`notifyFollowers.js`), response emails (`sendRockResponseEmail.js`), and Page Details test Send (`pagesAdmin.js`, which uses the draft). The freeform senders read their default template's published sender and reply-to: Rock Requests → Send Email reads `rock-request-reply-email`, and the Send Email job reads `send-email-default`.
- `pagesAdmin.js`:
  - `GET /` returns the new columns.
  - `PUT /:slug/draft` accepts and validates `email_from` / `email_reply_to` / `email_to`, but only for email slugs; `email_to` only for admin slugs.
  - `POST /:slug/publish` copies them.
  - `POST /:slug/render` returns them for the preview.

**Client:**
- `client/src/adminContent/emailTemplates.js`: add `adminRecipient: true` to the 4 admin templates.
- `client/src/admin/pages/pages/pages-edit-dlg/PagesEditDialog.jsx`: for email templates, add **Sender**, **Reply-To** and (admin templates only) **Send To** inputs under Subject, saved with the draft.
- `PagesAdmin.jsx`: the "unpublished changes" check also compares these fields.
- `EmailPreview.jsx`: replace the hard-coded `From: Aiden's Rocks <AidensRocks.AAA@gmail.com>` with the template's draft Sender, plus Reply-To and (admin) Send To lines.

## Part 2: Global Contact Email setting (`setting` table)

- **Seed** a `setting` row: `name='contact-email'`, `value='"aidensfamily@aidensrocks.com"'`, `type='site'`, with a description. Add it to `createdb.sql` and the migration.
- **New public endpoint** `GET /api/site-settings` (new `server/src/routes/siteSettings.js`, mounted in `app.js`). It returns only an allow-listed set of public values (`{ contactEmail }`), never the whole table. Add it to `server/tests/api/auth-matrix.test.mjs` as public.
- `server/src/routes/settingsAdmin.js`: validate known settings on PUT; `contact-email` must be a valid email.
- **New Admin → Settings page** (`/admin/settings`, admin nav link, `PrivateRoute` level 50): a "Contact email" field that saves through the existing `PUT /api/admin/settings/contact-email`. Future site-wide values go here.
- **Client:** a small `SiteSettingsProvider` + `useSiteSettings()` that fetches `/api/site-settings` once on load. Used by:
  - `ContactPopup.jsx` (mailto link)
  - `UploadRockForm.jsx:267` and `ContactReqestRocks.jsx:76` error messages. If the setting hasn't loaded, they drop the "email us at …" part rather than show a stale address.
  - `ShareYourRock.jsx:97` built-in fallback text
- **`{CONTACT_EMAIL}` in emails:** `buildTemplateValues` fills it for *every* template from the setting, as a `mailto:` link in the body and plain text in the subject. It's added to every template's `tokens` list so it appears in the editor's Insert menu.
- **`{CONTACT_EMAIL}` in pages:** a new component chip "Contact Email (link)" in `client/src/adminContent/componentRegistry.js`, available on every page. It renders a `mailto:` link from the setting, using the same chip/portal mechanism as the Upload Your Rock button. The `createdb.sql` Share Your Rock seed switches to the chip. On prod you replace the typed address in Share Your Rock once, in Page Details.

## Housekeeping

- New feature folder `data/ai-build-docs/email-senders-and-site-settings/` with this plan and `summary-issue-log.md`. `VERSION` goes from `0.11.2` to `0.12.0`.
- `CLAUDE.md`:
  - Outbound email: sender, reply-to and send-to come from each template, plus `ADMIN_ALERT_EMAIL`.
  - Settings store: the public allow-list endpoint, and "never hard-code an email; use the `contact-email` setting or a template field".
- `data/docker-compose/demo`: a commented `ADMIN_ALERT_EMAIL`.
- **Deploy:** run the migration on provider, then subscriber (page_content and setting are already replicated, no new tables). Optionally set `ADMIN_ALERT_EMAIL=AidensRocks.AAA@gmail.com` in prod `.env`. Then edit Share Your Rock to use the Contact Email chip.

## Verification

- `bash data/scripts/run-regression.sh` passes (lint + API + browser).
- **New/updated API tests** (Mailpit shows From, Reply-To and To):
  - A public rock request sends to `requests@aidensrocks.com`, From `…Requests <requests@…>`, Reply-To `noreply@`.
  - Upload failure / journey emails use their template's sender and send-to. The upload-pipeline test's `ADMIN_INBOX` constant becomes the seeded addresses.
  - Follower update Reply-To is `aidensfamily@`; verify email Reply-To is `noreply@`.
  - Editing a template's draft Sender/Send To doesn't affect real sends until Publish; test Send uses the draft.
  - Bad Sender / Reply-To / Send To → 400. Send To is rejected on non-admin templates.
  - `GET /api/site-settings` is public and returns only `contactEmail`. `PUT /api/admin/settings/contact-email` with a bad email → 400.
  - `{CONTACT_EMAIL}` renders as a mailto link in a template preview.
  - The processing-failed fallback with no readable template and `ADMIN_ALERT_EMAIL` set goes to that address.
- **Final grep:** `AidensRocks.AAA@gmail.com` appears only in tests/docs/env examples, and `@aidensrocks.com` only in SQL seeds.
- **Manual (you):**
  - Page Details: edit a template's Sender, Preview, test Send, Publish.
  - Admin → Settings: change the contact email; check Contact Us and an error message.
  - Insert the Contact Email chip in Share Your Rock.
