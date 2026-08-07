const nodemailer = require('nodemailer');

require('dotenv').config();

async function sendEmail({ to, subject, text, html, attachments = [] }) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

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
