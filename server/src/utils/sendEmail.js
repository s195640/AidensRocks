const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text, html }) {
  // Configure your SMTP transporter here, e.g., Gmail, SMTP server, etc.
  // Example uses Gmail SMTP (you need to enable app passwords or OAuth)
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'AidensRocks.AAA@gmail.com',
      pass: 'qeilhnkjcqfnsepg',
    },
  });

  let mailOptions = {
    from: '"Aiden\'s Rocks" AidensRocks.AAA@gmail.com',
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
