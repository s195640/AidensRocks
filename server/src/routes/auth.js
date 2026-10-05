const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const db = require('../db/pool');
const { requireAuth, LEVELS } = require('../middleware/requireAuth');
const {
  validatePassword,
  normalizeEmail,
  isValidEmail,
  hashPassword,
  verifyPassword,
} = require('../utils/auth/password');
const { createAccountToken, consumeAccountToken } = require('../utils/auth/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/auth/accountEmails');

const { isAccountPageEnabled } = require('../utils/accountPageSlugs');

const router = express.Router();

// Trimmed, single-spaced, max 100 chars (account.first_name/last_name).
const cleanName = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 100) : '';

const MAX_FAILED_LOGINS = 5;

// Per-IP throttle on the unauthenticated endpoints (sign-up spam, password
// guessing across many accounts, email flooding). Per-account guessing is
// separately capped by the 5-strikes lockout below.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Overridable only so the regression suite can make many logins.
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

const CHECK_EMAIL_MESSAGE =
  'If that email can be used, a message is on its way. Please check your inbox.';

const toClientAccount = (a) => ({
  id: a.id,
  email: a.email,
  firstName: a.first_name || '',
  lastName: a.last_name || '',
  accessLevel: a.access_level,
  notifyRockMoves: a.notify_rock_moves,
});

// `ver` = account.token_version at sign-in; bumping it (password reset,
// lock) invalidates every existing sign-in — see middleware/requireAuth.js.
const signToken = (account) =>
  jwt.sign(
    { sub: String(account.id), ver: account.token_version ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '90d' }
  );

// Sends without failing the request — the response is generic either way,
// and a mail outage shouldn't surface as a 500 on sign-up.
async function trySend(fn, ...args) {
  try {
    await fn(...args);
  } catch (err) {
    console.error('Account email failed:', err);
  }
}

// POST /api/auth/signup - creates an unverified (level 10) account and
// emails a verification link. Always answers generically so the endpoint
// can't be used to discover which emails have accounts.
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    if (!(await isAccountPageEnabled('create-account'))) {
      return res.status(403).json({ error: 'Creating new accounts is turned off right now.' });
    }

    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};
    const firstName = cleanName(req.body?.firstName);
    const lastName = cleanName(req.body?.lastName);

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Please enter your first and last name.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const { rows: existing } = await db.query(
      'SELECT id, access_level FROM account WHERE lower(email) = $1',
      [email]
    );

    if (existing[0]) {
      // Unverified: resend the link (the original may have been lost).
      // Already verified: say nothing — they can use "forgot password".
      if (existing[0].access_level === LEVELS.UNVERIFIED) {
        const token = await createAccountToken(existing[0].id, 'verify');
        await trySend(sendVerificationEmail, email, token);
      }
      return res.json({ message: CHECK_EMAIL_MESSAGE });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO account (email, first_name, last_name, password_hash, access_level)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [email, firstName, lastName, passwordHash, LEVELS.UNVERIFIED]
    );
    const token = await createAccountToken(rows[0].id, 'verify');
    await trySend(sendVerificationEmail, email, token);

    res.json({ message: CHECK_EMAIL_MESSAGE });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-email - consumes the emailed token; an unverified
// account becomes a user (level 20). Higher levels are left alone.
router.post('/verify-email', authLimiter, async (req, res, next) => {
  try {
    const accountId = await consumeAccountToken(req.body?.token, 'verify');
    if (!accountId) {
      return res.status(400).json({
        error: 'This verification link is invalid or has expired.',
      });
    }
    await db.query(
      `UPDATE account
       SET email_verified_dt = COALESCE(email_verified_dt, NOW()),
           access_level = GREATEST(access_level, $2),
           update_dt = NOW()
       WHERE id = $1`,
      [accountId, LEVELS.USER]
    );
    res.json({ message: 'Your email is verified. You can sign in now.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', authLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { rows } = await db.query(
      'SELECT id, access_level FROM account WHERE lower(email) = $1',
      [email]
    );
    if (rows[0] && rows[0].access_level === LEVELS.UNVERIFIED) {
      const token = await createAccountToken(rows[0].id, 'verify');
      await trySend(sendVerificationEmail, email, token);
    }
    res.json({ message: CHECK_EMAIL_MESSAGE });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - email + password. 5 consecutive bad passwords
// lock the account until the password is reset.
//
// Every failure -- unknown email, wrong password, locked account -- gets
// the same 401 and message, and an unknown email still pays for a bcrypt
// compare, so neither the reply nor its timing says whether an account
// exists (decided with the family, replacing the "N attempts left" and
// 423 LOCKED replies). The message points at the reset link, which is
// also how a locked account unlocks.
const LOGIN_FAILED = {
  error:
    'Email or password is incorrect. After too many wrong tries an account is locked; ' +
    'use "Forgot your password?" to reset and unlock it.',
};
// A real bcrypt hash at the production cost, never matching any password.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};

    const { rows } = await db.query(
      'SELECT * FROM account WHERE lower(email) = $1',
      [email]
    );
    const account = rows[0];

    if (!account || typeof password !== 'string') {
      await verifyPassword(typeof password === 'string' ? password : '', DUMMY_HASH);
      return res.status(401).json(LOGIN_FAILED);
    }

    const ok = await verifyPassword(password, account.password_hash);

    if (account.is_locked) {
      return res.status(401).json(LOGIN_FAILED);
    }

    if (!ok) {
      await db.query(
        `UPDATE account
         SET failed_login_count = failed_login_count + 1,
             is_locked = (failed_login_count + 1 >= $2),
             locked_dt = CASE WHEN failed_login_count + 1 >= $2 THEN NOW() ELSE locked_dt END,
             -- Locking signs the account out everywhere.
             token_version = token_version + CASE WHEN failed_login_count + 1 >= $2 THEN 1 ELSE 0 END,
             update_dt = NOW()
         WHERE id = $1`,
        [account.id, MAX_FAILED_LOGINS]
      );
      return res.status(401).json(LOGIN_FAILED);
    }

    if (account.access_level === LEVELS.UNVERIFIED) {
      return res.status(403).json({
        code: 'UNVERIFIED',
        error: 'Please verify your email address before signing in.',
      });
    }

    const { rows: signedIn } = await db.query(
      `UPDATE account
       SET failed_login_count = 0, last_login_dt = NOW(), last_seen_dt = NOW()
       WHERE id = $1 RETURNING *`,
      [account.id]
    );

    res.json({ token: signToken(signedIn[0]), account: toClientAccount(signedIn[0]) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - lets the client confirm a stored token is still valid
// (e.g. after a page refresh) and get the current account.
router.get('/me', requireAuth(LEVELS.UNVERIFIED), (req, res) => {
  res.json({ account: toClientAccount(req.account) });
});

// POST /api/auth/forgot-password - emails a reset link to any existing
// account (locked ones included — that's how they unlock).
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    // Page Details → Reset Password turned off. (Emailed reset links and the
    // admin's "send reset email" still work.)
    if (!(await isAccountPageEnabled('reset-password'))) {
      return res.status(403).json({ error: 'Password reset is turned off right now.' });
    }

    const email = normalizeEmail(req.body?.email);
    const { rows } = await db.query(
      'SELECT id, email FROM account WHERE lower(email) = $1',
      [email]
    );
    if (rows[0]) {
      const token = await createAccountToken(rows[0].id, 'reset');
      await trySend(sendPasswordResetEmail, rows[0].email, token);
    }
    res.json({ message: CHECK_EMAIL_MESSAGE });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password - sets a new password from an emailed token
// and unlocks the account. Since the link proves they own the email, an
// unverified account is verified (level 20) at the same time.
router.post('/reset-password', authLimiter, async (req, res, next) => {
  let client;
  try {
    client = await db.connect();
  } catch (err) {
    // Outside the try below, a refused connection was an unhandled
    // rejection (Express 4 doesn't catch async throws) and the request hung.
    return next(err);
  }
  try {
    const { token, password } = req.body || {};
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    await client.query('BEGIN');
    const accountId = await consumeAccountToken(token, 'reset', client);
    if (!accountId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'This reset link is invalid or has expired. Please request a new one.',
      });
    }

    const passwordHash = await hashPassword(password);
    await client.query(
      `UPDATE account
       SET password_hash = $2,
           is_locked = false,
           failed_login_count = 0,
           locked_dt = NULL,
           -- New password: sign out every existing session on every device.
           token_version = token_version + 1,
           email_verified_dt = COALESCE(email_verified_dt, NOW()),
           access_level = GREATEST(access_level, $3),
           update_dt = NOW()
       WHERE id = $1`,
      [accountId, passwordHash, LEVELS.USER]
    );
    // Any other outstanding reset links for this account are now stale.
    await client.query(
      `UPDATE account_token SET used_dt = NOW()
       WHERE account_id = $1 AND purpose = 'reset' AND used_dt IS NULL`,
      [accountId]
    );
    await client.query('COMMIT');

    res.json({ message: 'Your password has been reset. You can sign in now.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
