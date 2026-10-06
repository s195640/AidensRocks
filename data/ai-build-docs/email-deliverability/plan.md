# Email deliverability: why site emails land in spam, and the fix

## Context

Emails from the site, such as "Welcome to Aiden's Rocks" (the verify-account email), are landing in recipients' spam folders. You asked to understand the cause and what it takes to fix it.

All mail goes through one function, `server/src/utils/sendEmail.js`. It uses nodemailer, logs into the free Gmail account `AidensRocks.AAA@gmail.com` with an app password, and sends as `"Aiden's Rocks" <AidensRocks.AAA@gmail.com>`. Every templated email (verify, reset, follower updates, rock-request notices) is passed **HTML only**, with no plain-text version.

## Why it goes to spam

The problem is **not** failed authentication. Mail sent through Gmail's SMTP from a gmail.com address passes SPF, DKIM and DMARC for gmail.com. The problem is how trustworthy the mail *looks* to spam filters:

1. **A consumer mailbox is sending automated mail.** Spam filters expect automated email, like account verification, to come from the site's own domain. A free @gmail.com sender with links to a different domain (your site) is a classic phishing pattern: "Verify your account" from a gmail address, linking somewhere else. **This is the biggest factor.** The sender has no domain reputation of its own to build up.
2. **No sending history with the recipient.** New sign-ups have never received mail from this address. On top of point 1, that's enough for many filters.
3. **HTML-only messages.** A message with no `text/plain` alternative is a well-known spam-score penalty (e.g. SpamAssassin's `MIME_HTML_ONLY`).
4. **HTML fragment, not a document.** Templates are a bare `<h2>…<p>…`, with no `<html>`/`<body>`, charset or `lang`. This is a smaller penalty.
5. **No Reply-To or other "real sender" signals.** This is minor.

Points 3 to 5 can be fixed in code. Points 1 and 2 are fixed by **sending from your own domain with SPF, DKIM and DMARC set up**. That part is mostly account and DNS work, not code, and it's the step that makes the real difference.

## Part A: code changes (small; they help with any sender)

All changes are in `server/src/utils/sendEmail.js`, the single choke point, so every existing caller benefits without being touched:

- **Plain-text version automatically:** when `html` is given without `text`, generate `text` from the HTML. Add the `html-to-text` npm package to `server/package.json`; it's the standard library for this and keeps links readable as `Verify my email [https://…]`. Callers that already pass `text` (rock-request reply, freeform job email) are unchanged.
- **Full HTML document:** if the html doesn't already contain `<html`, wrap it in a minimal skeleton: `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body>…</body></html>`.
- **Transport and From set by env vars**, so moving to a domain sender later needs no code change:
  - Use generic SMTP (`host`/`port`/`secure`/`auth`) when `SMTP_HOST` is set. Otherwise keep today's `service: 'gmail'`, so prod is unchanged until you switch.
  - `EMAIL_FROM` (e.g. `"Aiden's Rocks" <hello@yourdomain.com>`) falls back to today's `"Aiden's Rocks" <EMAIL_USER>`.
  - Optional `EMAIL_REPLY_TO` (e.g. `AidensRocks.AAA@gmail.com`), so replies still reach the Gmail inbox after the switch.
  - Mailpit routing (`MAILPIT_ENABLED`) is untouched and still checked first.
- **Docs:** update the outbound-email paragraph in `CLAUDE.md`, and add the new vars (commented) to `data/docker-compose/demo`.
- **Feature folder:** `data/ai-build-docs/email-deliverability/`, with the plan and `summary-issue-log.md`. `VERSION` goes from `0.10.18` to `0.11.0` (new feature folder).

Code changes alone will improve the spam score, but **probably won't fix it on their own** while the sender is a gmail.com address.

## Part B: what's needed to send from your own domain (the real fix)

You own the domain and control DNS, so this is doable. Steps:

1. **Choose a sending service.** Any of these works through plain SMTP with the code from Part A (env vars only):
   - **Resend** or **Brevo**: free tiers (about 3,000 or 300 emails a month), easy DNS setup. A good fit for this site's volume.
   - **Amazon SES**: very cheap at any volume, with more setup (AWS account, leaving the sandbox).
   - **Google Workspace** on the domain (~$7 a month per user): gives a real `hello@yourdomain` mailbox too, if you'd like one for replies.
2. **Verify the domain with the provider and add the DNS records it gives you:**
   - **SPF** (TXT): authorizes the provider to send for your domain.
   - **DKIM** (CNAME/TXT): the cryptographic signature on each email.
   - **DMARC** (TXT on `_dmarc`): start with `v=DMARC1; p=none; rua=mailto:<you>` to monitor, then tighten to `p=quarantine` once reports look clean.
3. **Set the prod `.env`:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM=Aiden's Rocks <hello@yourdomain>` (no quotes; docker compose rejects a quoted name followed by `<…>`), `EMAIL_REPLY_TO=AidensRocks.AAA@gmail.com`. Restart the server. The sender and the site links are now the same domain, which removes the mismatch from point 1.
4. **Optional:** register the domain in **Google Postmaster Tools** to watch its reputation and spam rate in Gmail.
5. **In the meantime**, ask people you know who signed up to mark the email "Not spam" or add the address to their contacts. That trains Gmail for this sender.

I can't do Part B's account and DNS steps for you. Part A makes it a config-only switch.

## Verification

- `bash data/scripts/run-regression.sh` (lint + API + browser) passes.
- **New API test:** after a sign-up, the Mailpit message for the verify email has both a text part and an HTML part, and the text contains the verify URL. Use the existing `waitForMail` helper in `server/tests/helpers/mailpit.mjs`; Mailpit's message JSON has `Text` and `HTML` fields.
- **Manual, before and after Part B:**
  - Send a verify email to the address **mail-tester.com** gives you and compare the scores.
  - In Gmail, open the email → ⋮ → **Show original**, and check that SPF, DKIM and DMARC say PASS for your domain once Part B is live.
