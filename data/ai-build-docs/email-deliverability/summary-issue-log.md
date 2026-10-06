# Email deliverability — summary / issue log

## Phase 1 — Code-side spam fixes + env-switchable sender (2026-10-06)
**Status:** Complete
**Files changed:** `server/src/utils/sendEmail.js`, `server/package.json` / `package-lock.json` (+ `html-to-text`), `server/tests/api/auth-flows.test.mjs`, `CLAUDE.md`, `data/docker-compose/demo`, `VERSION`
**Summary:** This is Part A of `plan.md`, all inside `sendEmail` so every caller benefits:
- Every HTML email now also gets a plain-text part, generated with `html-to-text`. Links are kept as `text [url]`, images are skipped, and headings are not upper-cased. Callers that pass their own `text` are unchanged.
- HTML fragments are wrapped in a full `<!doctype html><html lang="en">` document with a charset.
- New optional env vars:
  - `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` switch from Gmail to any SMTP provider (port 465 uses implicit TLS, others STARTTLS).
  - `EMAIL_FROM` overrides the From header.
  - `EMAIL_REPLY_TO` adds a Reply-To.
- Nothing changes in prod until those vars are set. `MAILPIT_ENABLED` still wins first.
- New API test: the verify email has a tag-free text part containing the verify URL, and the HTML part is a full document.
**Not done (needs the owner):** Part B, sending from the site's own domain. That means picking a provider, adding the SPF/DKIM/DMARC DNS records, and setting the env vars above in prod. Steps are in `plan.md`.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.10.18` → `0.11.0` (feature, new folder).

## Phase 2 — Fix the documented EMAIL_FROM format (2026-10-06)
**Status:** Complete
**Files changed:** `data/docker-compose/demo`, `data/ai-build-docs/email-deliverability/plan.md`, `VERSION` (and, outside git, the owner's dev `data/docker-compose/.env` line 35)
**Summary:** The suggested `EMAIL_FROM="Aiden's Rocks" <noreply@aidensrocks.com>` breaks docker compose's `.env` parser. It takes the quoted part as the whole value, then fails with `unexpected character "<" in variable name`, which stopped `docker compose ... down` from running. The correct form is unquoted: `EMAIL_FROM=Aiden's Rocks <noreply@aidensrocks.com>`. Checked with `docker compose config` and with nodemailer's addressparser, which reads name `Aiden's Rocks` and address `noreply@aidensrocks.com`. The docs now show the unquoted form. No code change.
**Deviations from plan:** None.
**Issues/gotchas encountered:** Docker compose `.env` quoting differs from the `dotenv` npm package. Don't put a quoted display name before `<address>` in `data/docker-compose/.env`.
**VERSION:** `0.11.0` → `0.11.1` (patch).

## Phase 3 — Upload failure emails become Page Details templates (2026-10-06)
**Status:** Complete
**Files changed:** `server/src/utils/rock-upload/processImagesInBackground.js`, `server/src/utils/emailTemplates.js`, `server/src/utils/emailSlugs.js`, `server/src/routes/pagesAdmin.js`, `client/src/adminContent/emailTemplates.js`, `client/src/admin/pages/pages/PagesAdmin.jsx`, `data/sql/createdb.sql`, `data/sql/migrations/add_upload_failure_email_templates.sql` (new), `server/tests/api/upload-pipeline.test.mjs`, `server/tests/api/admin-crud.test.mjs`, `VERSION`
**Summary:** The two failure emails that had hardcoded wording are now editable templates in Page Details → Emails:
- **Upload Files Failed (to admin)**, `upload-files-failed-email`. Sent when some files in an upload didn't process. Tokens: `{ROCK_NUMBER}` `{JOURNEY_ID}` `{FAILED_COUNT}` `{PUBLISH_STATUS}` `{FAILED_FILES}`. `{FAILED_FILES}` is a server-built, HTML-escaped `<ul>` list (comma-joined text in the subject).
- **Upload Processing Failed (to admin)**, `upload-processing-failed-email`. Sent when processing fails outright. Tokens: `{ROCK_NUMBER}` `{JOURNEY_ID}` `{ERROR}` `{FOLDER}`.

Both are seeded with the previous wording, so nothing changes until someone edits them.
**Decisions:**
1. Both are **always on** (added to `REQUIRED_EMAIL_SLUGS`, Active switch locked), which keeps the old behavior that failures always reach a human. The locked-switch tooltip now comes from a per-template `requiredReason`, and the server's refusal message is generic ("This email is always on and can't be turned off.").
2. When New Rock Journey is Active, the files-failed **body** is still placed in the red box at the top of that email, and the subject is still the journey subject with a `[N FILE(S) FAILED] ` prefix (unchanged). The files-failed template's own subject is used only when it's sent alone.
3. The code keeps the old wording as a **fallback** if a template can't be loaded (missing row, or the DB/template error being reported), so a failure is never silently dropped.
4. Preview and test Send take `FAILED_FILES` as one line of `name: error` entries separated by `;`, because the dialogs have single-line inputs. The real sender passes an array.

**Tests:** red-box combined email (list item, journey #, publish status); "nothing processed" wording; edited template used and sent alone when New Rock Journey is inactive; a processing crash sends the processing-failed email; both slugs refuse to be turned off; the Preview render escapes and lists files.
**Deviations from plan:** None.
**Issues/gotchas encountered:** The Bash heredoc path turned the `\r?\n` in a JS regex into real newlines. It was fixed with the Edit tool.
**Deploy:** run `data/sql/migrations/add_upload_failure_email_templates.sql` by hand (provider first, then subscriber). Until then the fallback wording is used.
**VERSION:** `0.11.1` → `0.11.2` (patch).
