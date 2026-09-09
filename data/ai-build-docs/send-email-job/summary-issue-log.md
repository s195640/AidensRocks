# Send Email Job — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phase 1 — Freeform "Send Email" job on the admin Jobs page (2026-09-09)
**Status:** Complete
**Files changed:**
- New: `client/src/admin/components/send-email/SendEmail.jsx` (+ `.module.css`), this file
- Changed: `client/src/admin/pages/jobs/Jobs.jsx`, `server/src/routes/jobsAdmin.js`, `VERSION`

**Summary:**
- New Jobs-page widget, "Send Email" (`SendEmail.jsx`, follows the `Job` box convention every other Jobs widget uses): a plain To/Subject/Message form with a Send button. No dialog, no table — unlike "Send Emails - Catch-up" this isn't tied to rock/journey data at all, it's a one-off free-typed email to any address.
- Client validates `to` looks like an email and that subject/message are non-empty before enabling Send; gated behind a `window.confirm` (same "real send, no undo" convention as `SendEmailsCatchup.jsx`'s row/batch sends) before hitting the API. Success clears the form; failure shows the server's error inline.
- New `POST /api/admin/jobs/send-email` in `jobsAdmin.js` (covered by the router's existing `requireAdminAuth`): validates `to` against the same `EMAIL_RE` already used by the catch-up route, requires non-empty `subject`/`message`, then calls the shared `sendEmail()` util with `text: message` (plain text, no template/HTML — this is freeform admin content, not a published page_content template). Nothing is written to the database — no journey/rock rows involved, no send history recorded anywhere.
- **VERSION:** root `VERSION` bumped `0.3.2` → `0.4.0` (new feature folder, per CLAUDE.md's Y-bump rule).

**Deviations from plan:** None — scope matched the request as given (to/subject/message fields + a send button).

**Issues/gotchas encountered:**
- Whatever transport `sendEmail()` picks at send time (Gmail vs. Mailpit, per `MAILPIT_ENABLED`) applies here identically — this job doesn't change or bypass that in any way, see the existing "Outbound email" note in the root `CLAUDE.md`.

**Open questions for human review:**
1. Confirm plain-text-only (no HTML/rich formatting) is fine for this job's messages — nothing in the request implied HTML was needed, so it wasn't added.
2. No send is logged/recorded anywhere (unlike the catch-up job's `journey.email_sent`) — confirm that's acceptable for this one-off use case.
