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
