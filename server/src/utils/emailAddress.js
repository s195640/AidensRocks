// Validation for the address fields an admin edits on an email template in
// Page Details (Sender / Reply-To / Send To). Shared by the save route and
// the senders, so a bad value can never reach nodemailer.
const addressparser = require('nodemailer/lib/addressparser');
const { isValidEmail } = require('./auth/password');

// A single plain address, e.g. "noreply@aidensrocks.com".
function isPlainEmail(value) {
  return typeof value === 'string' && isValidEmail(value.trim());
}

// A Sender: one address with an optional display name, e.g.
// "Aiden's Rocks – Requests <requests@aidensrocks.com>" or just
// "requests@aidensrocks.com". Returns { name, address } or null if it isn't
// exactly one valid address.
function parseSender(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = addressparser(value.trim());
  if (parsed.length !== 1 || parsed[0].group) return null;
  const { name, address } = parsed[0];
  if (!address || !isValidEmail(address)) return null;
  return { name: name || '', address };
}

module.exports = { isPlainEmail, parseSender };
