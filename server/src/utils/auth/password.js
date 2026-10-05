const bcrypt = require('bcryptjs');

const BCRYPT_COST = 12;

// Password policy: at least 8 characters with at least one each of
// upper-case, lower-case, number and special character. Mirrored
// client-side in client/src/pages/account/passwordRules.js — keep in sync.
const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, message: 'at least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), message: 'an upper-case letter' },
  { test: (p) => /[a-z]/.test(p), message: 'a lower-case letter' },
  { test: (p) => /[0-9]/.test(p), message: 'a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), message: 'a special character' },
];

// Returns null when valid, otherwise a human-readable error message.
function validatePassword(password) {
  if (typeof password !== 'string') return 'Password is required.';
  const missing = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.message);
  if (missing.length === 0) return null;
  return `Password must contain ${missing.join(', ')}.`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  return email.length <= 255 && EMAIL_RE.test(email);
}

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_COST);
const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

module.exports = {
  validatePassword,
  normalizeEmail,
  isValidEmail,
  hashPassword,
  verifyPassword,
};
