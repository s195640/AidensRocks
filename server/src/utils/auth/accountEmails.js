const sendEmail = require('../sendEmail');
const siteUrl = require('../siteUrl');
const { renderEmailTemplate } = require('../emailTemplates');

// Verify / reset emails come from the "Verify Account Email" / "Password
// Reset Email" templates in Page Details (published version; always sent,
// regardless of Active). The built-in wording below is only a fallback for
// when the template row doesn't exist yet (migration not applied), so
// sign-up and password reset never break.

function wrapHtml(heading, bodyHtml) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 560px;">
      <h2 style="color: #4CAF50;">${heading}</h2>
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #ccc;" />
      <p style="font-size: 0.9em; color: #888;">Journey Through the World With Aiden's Rocks</p>
    </div>
  `;
}

async function sendTemplateOrFallback(slug, email, token, fallback) {
  let rendered = null;
  try {
    rendered = await renderEmailTemplate(slug, { EMAIL: email, TOKEN: token });
  } catch (err) {
    console.error(`Couldn't load "${slug}" template, using built-in wording:`, err.message);
  }
  if (rendered) {
    return sendEmail({ to: email, subject: rendered.subject, html: rendered.html });
  }
  return sendEmail({ to: email, ...fallback });
}

function sendVerificationEmail(email, token) {
  const link = siteUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  return sendTemplateOrFallback('account-verify-email', email, token, {
    subject: "Verify your Aiden's Rocks account",
    html: wrapHtml(
      'Welcome to Aiden\'s Rocks',
      `<p>Thank you for joining us in following Aiden's rocks around the world.</p>
       <p>Please verify your email address (this link is valid for 24 hours):</p>
       <p><a href="${link}">Verify my email</a></p>
       <p style="font-size: 0.9em; color: #666;">If you didn't create an account, you can ignore this email.</p>`
    ),
  });
}

function sendPasswordResetEmail(email, token) {
  const link = siteUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  return sendTemplateOrFallback('password-reset-email', email, token, {
    subject: "Reset your Aiden's Rocks password",
    html: wrapHtml(
      'Reset your password',
      `<p>We received a request to reset your password.</p>
       <p>Choose a new password using the link below (valid for 1 hour):</p>
       <p><a href="${link}">Reset my password</a></p>
       <p style="font-size: 0.9em; color: #666;">If you didn't ask for this, you can ignore this email.</p>`
    ),
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
