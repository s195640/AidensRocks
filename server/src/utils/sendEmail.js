const nodemailer = require('nodemailer');

require('dotenv').config();

// MAILPIT_ENABLED=true routes outbound mail to a local Mailpit inbox
// (MAILPIT_HOST:MAILPIT_PORT) instead of the real Gmail account. Defaults to
// off so prod (which never sets this var) keeps using Gmail unchanged; dev
// envs opt in via .env.
function buildTransporter() {
  if (process.env.MAILPIT_ENABLED === 'true') {
    return nodemailer.createTransport({
      host: process.env.MAILPIT_HOST || 'localhost',
      port: Number(process.env.MAILPIT_PORT) || 1025,
      secure: false,
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

async function sendEmail({ to, subject, text, html, attachments = [] }) {
  let transporter = buildTransporter();

  let mailOptions = {
    from: `"Aiden's Rocks" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
    attachments, // <-- include attachments here
  };

  return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
