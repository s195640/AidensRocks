# Email senders + site settings — summary / issue log

Feature-scoped log. Plan: `plan.md` in this folder. Append one entry per phase.

## Phase 1 — Per-template Sender / Reply-To / Send To, and a global Contact Email setting (2026-10-06)
**Status:** Complete (migration must be run by hand; awaiting manual testing)

**Files changed:**
- New:
  - `server/src/utils/emailAddress.js`, `server/src/utils/siteSettings.js`, `server/src/routes/siteSettings.js`
  - `client/src/context/SiteSettingsContext.jsx`, `client/src/adminContent/components/ContactEmailLink.jsx`, `client/src/admin/pages/settings/SettingsAdmin.jsx` (+ `.module.css`)
  - `data/sql/migrations/add_email_sender_columns.sql`, this folder
- Server:
  - `server/src/utils/emailTemplates.js`, `server/src/utils/sendEmail.js`, `server/src/routes/pagesAdmin.js`, `server/src/routes/settingsAdmin.js`, `server/src/routes/rockRequests.js`, `server/src/routes/jobsAdmin.js`, `server/src/app.js`
  - `server/src/utils/rock-upload/{processImagesInBackground,notifyFollowers,sendRockResponseEmail}.js`, `server/src/utils/auth/accountEmails.js`
- Client:
  - `client/src/adminContent/{emailTemplates,componentRegistry,loadDefaultEmail}.js`, `client/src/adminContent/PageContentEditor.jsx`
  - `client/src/admin/pages/pages/{PagesAdmin.jsx,pages-edit-dlg/PagesEditDialog.jsx (+ .module.css),email-preview/EmailPreview.jsx}`
  - `client/src/components/{contact-popup/ContactPopup.jsx,upload-rock-form/UploadRockForm.jsx,contact-request-rocks/ContactReqestRocks.jsx}`, `client/src/pages/share-your-rock/ShareYourRock.jsx`, `client/src/App.jsx`, `client/src/main.jsx`
- Other:
  - `data/sql/createdb.sql`, `data/docker-compose/demo`, `CLAUDE.md`, `VERSION`
  - Tests: `server/tests/api/{admin-crud,upload-pipeline,auth-flows,auth-matrix}.test.mjs`, `client/e2e/admin.spec.js`

**Summary:**
- **Data model (approved in plan):** 6 nullable columns on `page_content`: `{draft,published}_email_{from,reply_to,to}`. They use the same draft/publish pair as the subject, so Preview and test Send use the draft and real sends use the published values.
- **Seeded values:**
  - New Rock Request: `Aiden's Rocks – Requests <requests@aidensrocks.com>`, sent to `requests@`
  - New Rock Journey: `journeys@`, sent to `journeys@`
  - Both upload failures: `failures@`, sent to `failures@`
  - Follow Rocks and Rock Request Reply: from `noreply@`, Reply-To `aidensfamily@`
  - Everything else: `noreply@` for both. All admin emails reply to `noreply@`.
  - The migration seed only fills rows that have never been set, so re-running never overwrites edits.
- **Server:**
  - `renderEmailTemplate` returns `{ from, replyTo, to }`.
  - `sendEmail` takes per-call `from`/`replyTo`; blank falls back to `EMAIL_FROM`/`EMAIL_REPLY_TO`.
  - Send To only applies to `ADMIN_RECIPIENT_SLUGS` (the 4 emails to the family); blank falls back to the template's Sender address, as the owner asked, since the domain forwards to Gmail.
  - Both hard-coded `AidensRocks.AAA@gmail.com` recipients are gone. A failure note whose template can't be read goes to `ADMIN_ALERT_EMAIL` (.env); if that's unset, it's logged only.
  - Every sender passes its template's from/replyTo. The freeform Rock Requests → Send Email and Send Email job use their "default" template's published sender and reply-to (`getTemplateAddresses`).
- **Validation (`emailAddress.js`):**
  - Sender must parse (nodemailer `addressparser`) to exactly one valid address, with an optional name.
  - Reply-To and Send To must each be a single valid address. `""` clears a value back to the default.
  - Address fields are rejected on non-email pages, and Send To is rejected on non-admin templates.
- **Page Details:**
  - The email edit dialog has Sender / Reply-To fields, plus Send To on admin templates.
  - The "unpublished changes" check and Discard cover the new fields.
  - Preview shows From / Reply-To / To from the draft, replacing the hard-coded From line.
- **Contact email:**
  - It's a `setting` row (`contact-email`, type `site`, seeded `aidensfamily@aidensrocks.com`), edited on a new **Admin → Settings** page.
  - The new public `GET /api/site-settings` returns only the allow-list in `siteSettings.js` (`{ contactEmail }`). `PUT /api/admin/settings/contact-email` validates it.
  - The client loads it once via `SiteSettingsProvider` / `useSiteSettings()`.
  - It's used by Contact Us, the Upload Your Rock and Request A Rock error messages (which drop the "email us" part if it hasn't loaded rather than show a stale address), and the Share Your Rock built-in text.
- **`{CONTACT_EMAIL}`:**
  - **In emails:** the server fills it for every template (a mailto link in the body, plain text in the subject). The client-filled "default" templates get it from `/template`'s new `contactEmail`.
  - **In pages:** a new "Contact Email (link)" chip, available on every page but never in email templates (chips need JS). The `createdb.sql` Share Your Rock seed uses the chip.

**Decisions:**
1. Sender is stored as one string (`Name <address>`) rather than separate name/address columns.
2. `ADMIN_ALERT_EMAIL` keeps the "a failure is never silently dropped" rule without a hard-coded address.
3. `PageContentEditor` now hides `pages: null` chips from email templates. Before this, no chip used `pages: null`.

**Deploy steps:**
1. Run `data/sql/migrations/add_email_sender_columns.sql` on the provider node, then the subscriber. No new tables, and page_content and setting are already replicated.
2. Optional: set `ADMIN_ALERT_EMAIL=AidensRocks.AAA@gmail.com` in prod `.env`.
3. Admin → Page Details → Share Your Rock: replace the typed Gmail address with the **Contact Email (link)** chip, then Publish.
4. Remember that per-template senders only show when sending through Resend (`SMTP_HOST` set). Plain Gmail SMTP rewrites From.

**Tests:** 364 pass. New or updated:
- the request email goes to/from `requests@` with Reply-To `noreply@`
- journey and failure emails go to `journeys@`/`failures@` from their own senders
- the `ADMIN_ALERT_EMAIL` fallback
- verify email From/Reply-To
- seeded senders, and `{CONTACT_EMAIL}` rendering in emails
- draft vs published addresses, plus test Send using the draft
- address validation, and blank Send To falling back to the Sender
- the public site-settings allow-list and contact-email validation
- `/admin/settings` in the e2e admin page list

**Issues/gotchas encountered:** Long Bash heredocs on this machine sometimes cut off or turn `\r\n` into real newlines, so the bigger edits were done with script files and the Edit tool.

**VERSION:** `0.11.2` → `0.12.0` (feature, new folder).

## Phase 2 — Sender / Reply-To / Send To columns in the Page Details Emails table (2026-10-06)
**Status:** Complete
**Files changed:** `client/src/admin/pages/pages/PagesAdmin.jsx` (+ `.module.css`), `VERSION`
**Summary:** The Emails table has three new columns after Subject: **Sender**, **Reply-To** and **Send To**. Like Subject, they show the live (published) values. Blank values show grey placeholder text for what actually happens: "Site default" for Sender/Reply-To; "Sender's address" for an admin email's blank Send To; "The visitor" for templates without a Send To.
**Bug fixed along the way:** `handlePublish` only copied the body, subject and date into local state. After Publish, the new address columns and the "unpublished changes" buttons stayed stale until the page was reloaded. It now copies `published_email_{from,reply_to,to}` too.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.12.0` → `0.12.1` (patch).

## Phase 3 — Prod deploy runbook for two-way replication (2026-10-06)
**Status:** Complete (docs only)
**Files changed:** `data/ai-build-docs/email-senders-and-site-settings/DEPLOY.md` (new), `data/sql/migrations/add_email_sender_columns.sql` (header and section markers only, no SQL change), `VERSION`
**Summary:** Prod's two database nodes replicate to each other with pglogical. The old "run the migration identically on both nodes" advice would apply the seed `UPDATE` and the `setting` `INSERT` twice and cause replication conflicts. The migration is now split:
- **PART 1** (DDL): run on both nodes.
- **PART 2** (data): run on one node only, after PART 1 is done on both.

`DEPLOY.md` is the full runbook for going from 0.11.2 to 0.12.x:
- Pre-checks: replication status, 0.11.2 rows present, `setting`/`page_content` in the replication set.
- Order: database → env → code, because the new code needs the columns and the old code ignores them.
- Env changes, `--build` deploy, a smoke test (SPF/DKIM/DMARC, mail-tester), post-deploy steps, and rollback. Rollback never drops columns.
**Deviations from plan:** None.
**Issues/gotchas encountered:** Earlier migrations in this repo say "run identically on both nodes". That's safe for DDL but not for data statements when the nodes replicate both ways.
**VERSION:** `0.12.1` → `0.12.2` (patch).
