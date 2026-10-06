const express = require('express');
const pool = require('../db/pool');
const safeRollback = require('../utils/db/safeRollback');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const sendEmail = require('../utils/sendEmail');
const { renderEmailTemplate, getTemplateAddresses } = require('../utils/emailTemplates');
const { normalizeEmail, isValidEmail } = require('../utils/auth/password');
const { publicFormLimiter } = require('../middleware/publicFormLimiter');

const router = express.Router();

const badRequest = (msg) => {
  const err = new Error(msg);
  err.status = 400;
  return err;
};

// Validates the "Need rocks by" date / "No rush" pair. No rush wins (and
// clears any date). When `requireOne` is set, one of the two must be given;
// when `requireFuture` is set the date can't be in the past -- compared
// against UTC today minus a day so a visitor ahead of/behind UTC isn't
// rejected for picking their own "today". Returns { neededBy, noRush } with
// neededBy as a 'YYYY-MM-DD' string or null.
function parseNeededBy(neededBy, noRush, { requireOne, requireFuture }) {
  if (noRush === true || noRush === 'true') return { neededBy: null, noRush: true };

  const raw = neededBy == null ? '' : String(neededBy).trim();
  if (!raw) {
    if (requireOne) throw badRequest('Please choose a date you need the rocks by, or check "No rush".');
    return { neededBy: null, noRush: false };
  }

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw badRequest('Please enter a valid "need rocks by" date.');
  }
  if (requireFuture) {
    const earliest = new Date();
    earliest.setUTCDate(earliest.getUTCDate() - 1);
    if (raw < earliest.toISOString().slice(0, 10)) {
      throw badRequest('The "need rocks by" date can\'t be in the past.');
    }
  }
  return { neededBy: raw, noRush: false };
}

// needed_by is a DATE; selected as text so node-pg doesn't turn it into a
// local-midnight Date that serializes to the previous day in UTC.
const NEEDED_BY_TEXT = "to_char(needed_by, 'YYYY-MM-DD') AS needed_by";

const str = (v) => (v == null ? '' : String(v)).trim();

// The public "Request A Rock" insert. Everything but the message is
// required here (the admin dialog is looser -- see parseAdminFields). Throws
// an Error with a `.status` (400) for bad input; the caller translates that
// into the response.
async function insertRockRequest({ name, email, address, rocksRequested, neededBy, noRush, message }) {
  const trimmedName = str(name);
  const trimmedEmail = normalizeEmail(str(email));
  const trimmedAddress = str(address);
  const parsedRocksRequested = parseInt(rocksRequested, 10);
  const trimmedMessage = str(message);

  const bad = badRequest;

  if (
    !trimmedName ||
    !trimmedEmail ||
    !trimmedAddress ||
    !Number.isInteger(parsedRocksRequested) ||
    parsedRocksRequested < 1
  ) {
    throw bad('Name, email, address, and a valid number of rocks are required.');
  }
  // Column limits (name/email varchar 255) used to surface as a 500.
  if (trimmedName.length > 255) throw bad('Name is too long.');
  if (!isValidEmail(trimmedEmail)) throw bad('Please enter a valid email address.');
  if (trimmedAddress.length > 2000) throw bad('Address is too long.');
  if (trimmedMessage.length > 5000) throw bad('Message is too long.');
  if (parsedRocksRequested > 100) throw bad('Please request 100 rocks or fewer.');
  const needed = parseNeededBy(neededBy, noRush, { requireOne: true, requireFuture: true });

  const { rows } = await pool.query(
    `INSERT INTO rock_requests (name, email, address, rocks_requested, needed_by, no_rush, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING rq_key`,
    [
      trimmedName,
      trimmedEmail,
      trimmedAddress,
      parsedRocksRequested,
      needed.neededBy,
      needed.noRush,
      trimmedMessage || null,
    ]
  );

  return {
    rq_key: rows[0].rq_key,
    name: trimmedName,
    email: trimmedEmail,
    address: trimmedAddress,
    rocksRequested: parsedRocksRequested,
    neededBy: needed.neededBy,
    noRush: needed.noRush,
    message: trimmedMessage,
  };
}

// PUBLIC — visitor-facing "Request A Rock" submission. Registered before
// the admin auth gate below so it is reachable unauthenticated; a GET or
// PUT request doesn't match this POST '/' route (method mismatch) and
// falls through to requireAdminAuth instead.
router.post('/', publicFormLimiter, async (req, res) => {
  let inserted;
  try {
    inserted = await insertRockRequest(req.body);
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('POST /api/rock-requests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  const { rq_key, name, email, address, rocksRequested, neededBy, noRush, message } = inserted;
  res.status(201).json({ rq_key, info: 'Request received' });

  // Fire-and-forget: a failed notification email should never turn an
  // already-saved request into a user-facing failure -- just log it. Content
  // is the "New Rock Request (to admin)" template in Page Details; its
  // Active switch turns this notification off, and its Send To / Sender /
  // Reply-To decide where it goes and who it's from.
  renderEmailTemplate('new-rock-request-email', {
    NAME: name,
    EMAIL: email,
    ADDRESS: address,
    ROCKS_REQUESTED: rocksRequested,
    NEEDED_BY: noRush ? 'No rush' : neededBy,
    MESSAGE: message || '(none)',
  })
    .then((rendered) => {
      if (!rendered || !rendered.visible) return;
      if (!rendered.to) {
        console.error('New rock request email has no Send To (Page Details); not sent.');
        return;
      }
      return sendEmail({
        to: rendered.to,
        from: rendered.from,
        replyTo: rendered.replyTo,
        subject: rendered.subject,
        html: rendered.html,
      });
    })
    .catch((err) => {
      console.error('Failed to send rock request notification email:', err);
    });
});

// Everything below this line is admin-only.
router.use(requireAdminAuth);

// GET /api/rock-requests - list all requests for the admin table, including
// soft-deleted ones (deleted/deleted_dt are returned so the client can
// filter/label them -- the "Show Deleted" toggle is a client-side view, not
// a separate query param, since the admin page is the only consumer).
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rq_key, name, email, address, rocks_requested, ${NEEDED_BY_TEXT}, no_rush, shipped,
              tracking_number, comments, rock_numbers, message,
              create_dt, update_dt, sent_dt, email_dt, deleted, deleted_dt
       FROM rock_requests
       ORDER BY create_dt DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/rock-requests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Splits a "343, 234, 54" style CSV into a deduped array of integer rock
// numbers. Throws with a user-facing message if any token isn't a plain
// non-negative integer.
function parseRockNumbers(raw) {
  const tokens = (raw || '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const numbers = [];
  const seen = new Set();
  for (const token of tokens) {
    if (!/^\d+$/.test(token)) {
      const err = new Error(`"${token}" is not a valid rock number.`);
      err.status = 400;
      throw err;
    }
    const n = parseInt(token, 10);
    if (!seen.has(n)) {
      seen.add(n);
      numbers.push(n);
    }
  }
  return numbers;
}

// Validates/normalizes the admin dialog's fields. Create and Edit share the
// one dialog, so they share this too. Only name and rocks_requested are
// required. Email/address may be blank (stored NULL), and the need-by date
// isn't required or limited to the future (admins log phone requests and
// edit old ones). Throws a 400 Error on bad input.
function parseAdminFields(body) {
  const name = str(body.name);
  const email = normalizeEmail(str(body.email));
  const address = str(body.address);
  const rocksRequested = parseInt(body.rocks_requested, 10);
  const message = str(body.message);
  const comments = str(body.comments);
  const trackingNumber = str(body.tracking_number);

  if (!name) throw badRequest('Name is required.');
  if (!Number.isInteger(rocksRequested) || rocksRequested < 1) {
    throw badRequest('A valid number of rocks is required.');
  }
  if (name.length > 255) throw badRequest('Name is too long.');
  if (email && !isValidEmail(email)) throw badRequest('Please enter a valid email address.');
  if (address.length > 2000) throw badRequest('Address is too long.');
  if (rocksRequested > 100) throw badRequest('Please request 100 rocks or fewer.');
  if (message.length > 5000) throw badRequest('Message is too long.');
  if (comments.length > 5000) throw badRequest('Notes are too long.');
  if (trackingNumber.length > 255) throw badRequest('Tracking number is too long.');

  const needed = parseNeededBy(body.needed_by, body.no_rush, { requireOne: false, requireFuture: false });

  return {
    name,
    email: email || null,
    address: address || null,
    rocksRequested,
    neededBy: needed.neededBy,
    noRush: needed.noRush,
    message: message || null,
    comments: comments || null,
    shipped: !!body.shipped,
    trackingNumber: trackingNumber || null,
    rockNumbersRaw: str(body.rock_numbers) || null,
    rockNumbers: parseRockNumbers(body.rock_numbers),
  };
}

// Per-rock problems with linking `rockNumbers` to request `rqKey` (null
// while creating): each must exist in the catalog and not already belong to
// a different request. An empty array means all clear.
async function findRockNumberProblems(client, rockNumbers, rqKey) {
  if (rockNumbers.length === 0) return [];
  const catalogRes = await client.query(
    'SELECT rock_number, rq_key FROM catalog WHERE rock_number = ANY($1::int[])',
    [rockNumbers]
  );
  const byNumber = new Map(catalogRes.rows.map((r) => [r.rock_number, r.rq_key]));

  const details = [];
  for (const num of rockNumbers) {
    if (!byNumber.has(num)) {
      details.push({ rock_number: num, reason: 'Does not exist in the catalog.' });
    } else {
      const linkedTo = byNumber.get(num);
      if (linkedTo != null && String(linkedTo) !== String(rqKey)) {
        details.push({ rock_number: num, reason: `Already assigned to request #${linkedTo}.` });
      }
    }
  }
  return details;
}

// Unlinks any catalog rows assigned to this request that are no longer
// listed, then (re)links everything currently listed.
async function syncRockNumbers(client, rqKey, rockNumbers) {
  await client.query(
    'UPDATE catalog SET rq_key = NULL, update_dt = CURRENT_TIMESTAMP WHERE rq_key = $1 AND NOT (rock_number = ANY($2::int[]))',
    [rqKey, rockNumbers]
  );
  if (rockNumbers.length > 0) {
    await client.query(
      'UPDATE catalog SET rq_key = $1, update_dt = CURRENT_TIMESTAMP WHERE rock_number = ANY($2::int[])',
      [rqKey, rockNumbers]
    );
  }
}

// POST /api/rock-requests/admin-create - lets an admin log a request that
// came in outside the public form (phone, in person, etc). Same fields and
// rules as the edit route below (the admin uses one dialog for both).
// Deliberately sends no notification email, since the admin entering it
// already knows about it.
router.post('/admin-create', async (req, res) => {
  let fields;
  try {
    fields = parseAdminFields(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const details = await findRockNumberProblems(client, fields.rockNumbers, null);
    if (details.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or more rock numbers are invalid.', details });
    }

    const { rows } = await client.query(
      `INSERT INTO rock_requests
         (name, email, address, rocks_requested, needed_by, no_rush, message,
          comments, shipped, tracking_number, rock_numbers, sent_dt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
               CASE WHEN $9 THEN CURRENT_TIMESTAMP END)
       RETURNING rq_key`,
      [
        fields.name,
        fields.email,
        fields.address,
        fields.rocksRequested,
        fields.neededBy,
        fields.noRush,
        fields.message,
        fields.comments,
        fields.shipped,
        fields.trackingNumber,
        fields.rockNumbersRaw,
      ]
    );
    const rqKey = rows[0].rq_key;
    await syncRockNumbers(client, rqKey, fields.rockNumbers);

    await client.query('COMMIT');
    res.status(201).json({ rq_key: rqKey });
  } catch (err) {
    await safeRollback(client);
    console.error('POST /api/rock-requests/admin-create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
});

// PUT /api/rock-requests/:rq_key - update a request's details, including
// validating + syncing the rock_numbers CSV against catalog.rq_key.
router.put('/:rq_key', async (req, res) => {
  const { rq_key } = req.params;

  let fields;
  try {
    fields = parseAdminFields(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const existingRes = await client.query(
      'SELECT shipped FROM rock_requests WHERE rq_key = $1 FOR UPDATE',
      [rq_key]
    );
    if (existingRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }
    const wasShipped = existingRes.rows[0].shipped;

    const details = await findRockNumberProblems(client, fields.rockNumbers, rq_key);
    if (details.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'One or more rock numbers are invalid.', details });
    }

    // sent_dt is stamped only on a false -> true transition, never cleared.
    const stampSentDt = !wasShipped && fields.shipped;

    const updateRes = await client.query(
      `UPDATE rock_requests
       SET name = $1,
           email = $2,
           address = $3,
           rocks_requested = $4,
           shipped = $5,
           tracking_number = $6,
           comments = $7,
           rock_numbers = $8,
           needed_by = $11,
           no_rush = $12,
           message = $13,
           update_dt = CURRENT_TIMESTAMP,
           sent_dt = CASE WHEN $9 THEN CURRENT_TIMESTAMP ELSE sent_dt END
       WHERE rq_key = $10
       RETURNING *, ${NEEDED_BY_TEXT}`,
      [
        fields.name,
        fields.email,
        fields.address,
        fields.rocksRequested,
        fields.shipped,
        fields.trackingNumber,
        fields.comments,
        fields.rockNumbersRaw,
        stampSentDt,
        rq_key,
        fields.neededBy,
        fields.noRush,
        fields.message,
      ]
    );

    await syncRockNumbers(client, rq_key, fields.rockNumbers);

    await client.query('COMMIT');
    res.json(updateRes.rows[0]);
  } catch (err) {
    await safeRollback(client);
    console.error(`PUT /api/rock-requests/${rq_key} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
});

// DELETE /api/rock-requests/:rq_key - soft delete only, never a real row
// removal (sets deleted = true / deleted_dt; GET '/' still returns the row,
// the client's "Show Deleted" toggle decides whether to display it).
// Refuses while any catalog row is still linked to this request -- the
// admin has to clear the Rock Numbers field (which unlinks them, see PUT
// above) before a request can be deleted.
router.delete('/:rq_key', async (req, res) => {
  const { rq_key } = req.params;

  try {
    const existingRes = await pool.query(
      'SELECT rq_key FROM rock_requests WHERE rq_key = $1 AND deleted = false',
      [rq_key]
    );
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const linkedRes = await pool.query(
      'SELECT COUNT(*) AS count FROM catalog WHERE rq_key = $1',
      [rq_key]
    );
    const linkedCount = parseInt(linkedRes.rows[0].count, 10);
    if (linkedCount > 0) {
      return res.status(400).json({
        error: `Cannot delete: ${linkedCount} rock(s) are still linked to this request. Remove them from Rock Numbers first.`,
      });
    }

    await pool.query(
      'UPDATE rock_requests SET deleted = true, deleted_dt = CURRENT_TIMESTAMP, update_dt = CURRENT_TIMESTAMP WHERE rq_key = $1',
      [rq_key]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(`DELETE /api/rock-requests/${rq_key} error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rock-requests/:rq_key/undelete - reverses a soft delete. No
// linked-rocks check needed here (undeleting never affects catalog links).
router.post('/:rq_key/undelete', async (req, res) => {
  const { rq_key } = req.params;

  try {
    const result = await pool.query(
      `UPDATE rock_requests
       SET deleted = false, deleted_dt = NULL, update_dt = CURRENT_TIMESTAMP
       WHERE rq_key = $1
       RETURNING rq_key`,
      [rq_key]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(`POST /api/rock-requests/${rq_key}/undelete error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/rock-requests/:rq_key/send-email - composes and sends a
// freeform email to the requester (plain text, no template -- same
// convention as jobsAdmin.js's freeform /send-email route). email_dt is
// only stamped once the send actually succeeds, mirroring
// send-emails-catchup/send's send-then-record convention for journey rows.
router.post('/:rq_key/send-email', async (req, res) => {
  const { rq_key } = req.params;
  const subject = (req.body.subject || '').trim();
  const body = (req.body.body || '').trim();
  const markShipped = !!req.body.markShipped;

  if (!subject || !body) {
    return res.status(400).json({ error: 'A subject and body are required.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT email, shipped FROM rock_requests WHERE rq_key = $1',
      [rq_key]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (!rows[0].email) {
      return res.status(400).json({ error: 'This request has no email address.' });
    }
    const wasShipped = rows[0].shipped;

    // Sender / Reply-To come from the "Rock Request Reply (default)"
    // template that pre-filled this dialog.
    const { from, replyTo } = await getTemplateAddresses('rock-request-reply-email');
    await sendEmail({ to: rows[0].email, from, replyTo, subject, text: body });

    // sent_dt uses the same false -> true-only transition rule as the PUT
    // route above; email_dt always updates on a successful send.
    const stampSentDt = markShipped && !wasShipped;
    const updateRes = await pool.query(
      `UPDATE rock_requests
       SET email_dt = CURRENT_TIMESTAMP,
           shipped = CASE WHEN $1 THEN true ELSE shipped END,
           sent_dt = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE sent_dt END,
           update_dt = CURRENT_TIMESTAMP
       WHERE rq_key = $3
       RETURNING email_dt, shipped, sent_dt`,
      [markShipped, stampSentDt, rq_key]
    );

    res.json({ success: true, ...updateRes.rows[0] });
  } catch (err) {
    console.error(`POST /api/rock-requests/${rq_key}/send-email error:`, err);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

module.exports = router;
