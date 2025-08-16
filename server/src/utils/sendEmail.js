const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, text, html, attachments = [] }) {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'AidensRocks.AAA@gmail.com',
      pass: 'qeilhnkjcqfnsepg',
    },
  });

  let mailOptions = {
    from: '"Aiden\'s Rocks" <AidensRocks.AAA@gmail.com>',
    to,
    subject,
    text,
    html,
    attachments, // <-- include attachments here
  };

  return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
