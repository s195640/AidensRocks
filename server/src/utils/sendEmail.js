const nodemailer = require('nodemailer');
const { convert: htmlToText } = require('html-to-text');

require('dotenv').config();

// Transport, in priority order:
// - MAILPIT_ENABLED=true routes outbound mail to a local Mailpit inbox
//   (MAILPIT_HOST:MAILPIT_PORT) instead of a real sender. Dev/test only.
// - SMTP_HOST set: any SMTP provider (e.g. a transactional service sending
//   from the site's own domain) with SMTP_PORT / SMTP_USER / SMTP_PASSWORD.
//   Port 465 uses implicit TLS; anything else upgrades with STARTTLS.
// - Otherwise the Gmail account (EMAIL_USER / EMAIL_PASSWORD), which is what
//   prod uses until it sets SMTP_HOST.
// See data/ai-build-docs/email-deliverability/.
function buildTransporter() {
  if (process.env.MAILPIT_ENABLED === 'true') {
    return nodemailer.createTransport({
      host: process.env.MAILPIT_HOST || 'localhost',
      port: Number(process.env.MAILPIT_PORT) || 1025,
      secure: false,
    });
  }

  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

// Templates are HTML fragments (<h2>..<p>..). Spam filters score a bare
// fragment worse than a real document, so give it one.
function asHtmlDocument(html) {
  if (/<html[\s>]/i.test(html)) return html;
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
${html}
</body>
</html>`;
}

// from / replyTo: the per-template Sender / Reply-To from Page Details
// (renderEmailTemplate returns them). Blank falls back to EMAIL_FROM /
// EMAIL_REPLY_TO. Note: plain Gmail SMTP (no SMTP_HOST) rewrites From to
// the Gmail account, so per-template senders only show via a domain sender.
async function sendEmail({ to, subject, text, html, from, replyTo, attachments = [] }) {
  let transporter = buildTransporter();

  let mailOptions = {
    from: from || process.env.EMAIL_FROM || `"Aiden's Rocks" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: html ? asHtmlDocument(html) : html,
    attachments, // <-- include attachments here
  };

  // HTML-only mail is a common spam signal, so every HTML email also gets a
  // plain-text part (links kept as "text [url]").
  if (html && !text) {
    mailOptions.text = htmlToText(html, {
      wordwrap: 78,
      selectors: [
        { selector: 'img', format: 'skip' },
        // Keep headings as written instead of html-to-text's default ALL CAPS.
        ...['h1', 'h2', 'h3'].map((selector) => ({ selector, options: { uppercase: false } })),
      ],
    });
  }

  if (replyTo || process.env.EMAIL_REPLY_TO) {
    mailOptions.replyTo = replyTo || process.env.EMAIL_REPLY_TO;
  }

  return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
