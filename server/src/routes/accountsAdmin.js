// routes/accountsAdmin.js — admin Accounts page: list/edit site sign-in
// accounts (not to be confused with routes/users.js, which manages artists).
const express = require('express');
const db = require('../db/pool');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const { LEVELS, ARTIST_LINK_LEVELS } = require('../middleware/requireAuth');
const { followedRockNumbersSql } = require('../utils/followedRocks');
const crypto = require('crypto');
const { normalizeEmail, isValidEmail, hashPassword } = require('../utils/auth/password');
const { createAccountToken } = require('../utils/auth/tokens');
const { sendPasswordResetEmail } = require('../utils/auth/accountEmails');

const router = express.Router();

router.use(requireAdminAuth);

const VALID_LEVELS = Object.values(LEVELS);

// Never select password_hash here.
const ACCOUNT_COLUMNS = `
  a.id, a.email, a.first_name, a.last_name, a.access_level, a.is_locked, a.failed_login_count,
  a.locked_dt, a.email_verified_dt, a.notify_rock_moves, a.last_login_dt, a.last_seen_dt,
  a.create_dt, a.update_dt, a.ra_key,
  (SELECT ar.display_name FROM artist ar WHERE ar.ra_key = a.ra_key) AS artist_name,
  -- Includes a Creator's own rocks (utils/followedRocks.js).
  (SELECT COUNT(*)::int FROM (${followedRockNumbersSql('a.id')}) fr) AS follow_count
`;

// Resolves a requested linked artist (ra_key) for an account at
// `accessLevel`. Only Creators and Admins keep one; returns { raKey } or
// { error }. Shared by create (POST) and edit (PUT).
async function resolveArtistLink(requested, accessLevel) {
  let raKey = requested === undefined || requested === null || requested === '' ? null : Number(requested);
  if (raKey !== null && !Number.isInteger(raKey)) return { error: 'Invalid artist.' };
  if (!ARTIST_LINK_LEVELS.includes(accessLevel)) raKey = null;
  if (raKey !== null) {
    const { rows: artist } = await db.query('SELECT 1 FROM artist WHERE ra_key = $1', [raKey]);
    if (!artist[0]) return { error: "That artist doesn't exist." };
  }
  return { raKey };
}

const cleanName = (v) =>
  v === undefined || v === null ? null : String(v).trim().replace(/\s+/g, ' ').slice(0, 100) || null;

const uniqueViolation = (err) =>
  err.constraint === 'idx_account_ra_key'
    ? 'That artist is already linked to another account.'
    : 'Another account already uses that email.';

// GET /api/admin/accounts
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${ACCOUNT_COLUMNS} FROM account a ORDER BY a.create_dt DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/accounts - creates an account by hand (see
// data/ai-build-docs/admin-create-account/). It starts LOCKED with no
// usable password -- the hash is of a random secret nobody ever sees -- so
// it can't be signed into until the person sets a password through a
// reset link, which also unlocks and verifies it (routes/auth.js
// /reset-password). send_setup_email (default true) emails that link now.
// Body: { email, first_name?, last_name?, access_level? (20|30|50, default
// 20), ra_key?, notify_rock_moves? (default true), send_setup_email? }.
router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};

    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });

    const accessLevel = body.access_level === undefined ? LEVELS.USER : Number(body.access_level);
    // Unverified (10) isn't offered: the reset that activates the account
    // verifies it and raises it to User anyway.
    if (![LEVELS.USER, LEVELS.CREATOR, LEVELS.ADMIN].includes(accessLevel)) {
      return res.status(400).json({ error: 'Invalid access level.' });
    }

    const { raKey, error: artistError } = await resolveArtistLink(body.ra_key, accessLevel);
    if (artistError) return res.status(400).json({ error: artistError });

    const unusableHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
    const notify = body.notify_rock_moves === undefined ? true : Boolean(body.notify_rock_moves);

    const { rows } = await db.query(
      `INSERT INTO account
         (email, first_name, last_name, password_hash, access_level, ra_key,
          is_locked, locked_dt, notify_rock_moves)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), $7)
       RETURNING id`,
      [email, cleanName(body.first_name), cleanName(body.last_name), unusableHash, accessLevel, raKey, notify]
    );
    const id = rows[0].id;

    // The account exists either way; a mail problem is reported, not fatal.
    let setupEmailSent = false;
    let setupEmailError;
    if (body.send_setup_email !== false) {
      try {
        const token = await createAccountToken(id, 'reset');
        await sendPasswordResetEmail(email, token);
        setupEmailSent = true;
      } catch (mailErr) {
        console.error(`Setup email for new account ${id} failed:`, mailErr);
        setupEmailError = "The account was created, but the email couldn't be sent. Use \"Send password reset email\" to try again.";
      }
    }

    const { rows: created } = await db.query(`SELECT ${ACCOUNT_COLUMNS} FROM account a WHERE a.id = $1`, [id]);
    res.status(201).json({ ...created[0], setupEmailSent, ...(setupEmailError ? { setupEmailError } : {}) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: uniqueViolation(err) });
    next(err);
  }
});

// PUT /api/admin/accounts/:id
// Body (all optional): { email, first_name, last_name, access_level, is_locked, email_verified,
// notify_rock_moves, ra_key }. ra_key (linked artist) only sticks while
// the account is a Creator or Admin; any other level clears it.
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { rows: found } = await db.query('SELECT * FROM account WHERE id = $1', [id]);
    const current = found[0];
    if (!current) return res.status(404).json({ error: 'Account not found.' });

    const body = req.body || {};
    const isSelf = id === req.account.id;

    let email = current.email;
    if (body.email !== undefined) {
      email = normalizeEmail(body.email);
      if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email address.' });
    }

    // Names: blank clears them (admin-created accounts may have none).
    const firstName = body.first_name !== undefined ? cleanName(body.first_name) : current.first_name;
    const lastName = body.last_name !== undefined ? cleanName(body.last_name) : current.last_name;

    let accessLevel = current.access_level;
    if (body.access_level !== undefined) {
      accessLevel = Number(body.access_level);
      if (!VALID_LEVELS.includes(accessLevel)) {
        return res.status(400).json({ error: 'Invalid access level.' });
      }
    }

    let isLocked = current.is_locked;
    if (body.is_locked !== undefined) isLocked = Boolean(body.is_locked);

    // Keep the site from losing its own admin by accident.
    if (isSelf && accessLevel < LEVELS.ADMIN) {
      return res.status(400).json({ error: "You can't lower your own access level." });
    }
    if (isSelf && isLocked) {
      return res.status(400).json({ error: "You can't lock your own account." });
    }

    const notify =
      body.notify_rock_moves !== undefined ? Boolean(body.notify_rock_moves) : current.notify_rock_moves;

    let verifiedDt = current.email_verified_dt;
    if (body.email_verified !== undefined) {
      verifiedDt = body.email_verified ? current.email_verified_dt || new Date() : null;
    }

    // Linked artist: Creators and Admins only (one artist per account, one account per
    // artist — unique index idx_account_ra_key).
    const { raKey, error: artistError } = await resolveArtistLink(
      body.ra_key !== undefined ? body.ra_key : current.ra_key,
      accessLevel
    );
    if (artistError) return res.status(400).json({ error: artistError });

    const lockChanged = isLocked !== current.is_locked;

    const { rows } = await db.query(
      `UPDATE account
       SET email = $2,
           access_level = $3,
           is_locked = $4,
           failed_login_count = CASE WHEN $5 THEN 0 ELSE failed_login_count END,
           locked_dt = CASE WHEN $5 THEN (CASE WHEN $4 THEN NOW() ELSE NULL END) ELSE locked_dt END,
           -- Locking signs the account out everywhere (so unlocking later
           -- doesn't bring old sign-ins back).
           token_version = token_version + CASE WHEN $5 AND $4 THEN 1 ELSE 0 END,
           email_verified_dt = $6,
           notify_rock_moves = $7,
           first_name = $8,
           last_name = $9,
           ra_key = $10,
           update_dt = NOW()
       WHERE id = $1
       RETURNING id`,
      [id, email, accessLevel, isLocked, lockChanged, verifiedDt, notify, firstName, lastName, raKey]
    );

    const { rows: updated } = await db.query(
      `SELECT ${ACCOUNT_COLUMNS} FROM account a WHERE a.id = $1`,
      [rows[0].id]
    );
    res.json(updated[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: uniqueViolation(err) });
    next(err);
  }
});

// POST /api/admin/accounts/:id/send-reset - emails the account a password
// reset link (admins never see or set passwords directly).
router.post('/:id/send-reset', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT id, email FROM account WHERE id = $1', [
      Number(req.params.id),
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Account not found.' });

    const token = await createAccountToken(rows[0].id, 'reset');
    await sendPasswordResetEmail(rows[0].email, token);
    res.json({ message: `Password reset email sent to ${rows[0].email}.` });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/accounts/:id - permanently removes an account. Its
// account_follow / account_token rows go with it (ON DELETE CASCADE); a
// linked artist is untouched. Admins can't delete their own account.
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.account.id) {
      return res.status(400).json({ error: "You can't delete your own account." });
    }
    const { rowCount } = await db.query('DELETE FROM account WHERE id = $1', [id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Account not found.' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
