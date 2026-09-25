const express = require('express');
const pool = require('../db/pool');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

// Shared by the public submission route and the admin-gated creation route
// below, so both paths validate/insert identically. Throws an Error with a
// `.status` (400) for bad input; callers translate that into the response.
async function insertRockRequest({ name, email, address, rocksRequested, message }) {
  const trimmedName = (name || '').trim();
  const trimmedEmail = (email || '').trim();
  const trimmedAddress = (address || '').trim();
  const parsedRocksRequested = parseInt(rocksRequested, 10);
  const trimmedMessage = (message || '').trim();

  if (
    !trimmedName ||
    !trimmedEmail ||
    !trimmedAddress ||
    !Number.isInteger(parsedRocksRequested) ||
    parsedRocksRequested < 1
  ) {
    const err = new Error('Name, email, address, and a valid number of rocks are required.');
    err.status = 400;
    throw err;
  }

  const { rows } = await pool.query(
    `INSERT INTO rock_requests (name, email, address, rocks_requested, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING rq_key`,
    [trimmedName, trimmedEmail, trimmedAddress, parsedRocksRequested, trimmedMessage || null]
  );

  return {
    rq_key: rows[0].rq_key,
    name: trimmedName,
    email: trimmedEmail,
    address: trimmedAddress,
    rocksRequested: parsedRocksRequested,
    message: trimmedMessage,
  };
}

// PUBLIC — visitor-facing "Request A Rock" submission. Registered before
// the admin auth gate below so it is reachable unauthenticated; a GET or
// PUT request doesn't match this POST '/' route (method mismatch) and
// falls through to requireAdminAuth instead.
router.post('/', async (req, res) => {
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

  const { rq_key, name, email, address, rocksRequested, message } = inserted;
  res.status(201).json({ rq_key, info: 'Request received' });

  // Fire-and-forget: a failed notification email should never turn an
  // already-saved request into a user-facing failure -- just log it.
  sendEmail({
    to: 'AidensRocks.AAA@gmail.com',
    subject: `New Rock Request from ${name}`,
    text: `A new rock request has been submitted.

Name: ${name}
Email: ${email}
Address: ${address}
Rocks Requested: ${rocksRequested}
${message ? `Message: ${message}\n` : ''}`,
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #4CAF50;">New Rock Request</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Address:</strong><br/>${address.replace(/\n/g, '<br/>')}</p>
          <p><strong>Rocks Requested:</strong> ${rocksRequested}</p>
          ${message ? `<p><strong>Message:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #ccc;" />
          <p style="font-size: 0.9em; color: #888;">This is an automated notification from Aidens Rocks.</p>
        </div>
      `,
  }).catch((err) => {
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
      `SELECT rq_key, name, email, address, rocks_requested, shipped,
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

// POST /api/rock-requests/admin-create - lets an admin log a request that
// came in outside the public form (phone, in person, etc). Same validation/
// insert as the public route via insertRockRequest, but deliberately sends
// no notification email -- the admin entering it already knows about it.
router.post('/admin-create', async (req, res) => {
  try {
    const { rq_key } = await insertRockRequest(req.body);
    res.status(201).json({ rq_key });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error('POST /api/rock-requests/admin-create error:', err);
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

// PUT /api/rock-requests/:rq_key - update a request's details, including
// validating + syncing the rock_numbers CSV against catalog.rq_key.
router.put('/:rq_key', async (req, res) => {
  const { rq_key } = req.params;
  const {
    name,
    email,
    address,
    rocks_requested,
    shipped,
    tracking_number,
    comments,
    rock_numbers,
  } = req.body;

  let rockNumbers;
  try {
    rockNumbers = parseRockNumbers(rock_numbers);
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

    if (rockNumbers.length > 0) {
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
          if (linkedTo != null && String(linkedTo) !== String(rq_key)) {
            details.push({ rock_number: num, reason: `Already assigned to request #${linkedTo}.` });
          }
        }
      }

      if (details.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'One or more rock numbers are invalid.', details });
      }
    }

    // sent_dt is stamped only on a false -> true transition, never cleared.
    const nowShipped = !!shipped;
    const stampSentDt = !wasShipped && nowShipped;

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
           update_dt = CURRENT_TIMESTAMP,
           sent_dt = CASE WHEN $9 THEN CURRENT_TIMESTAMP ELSE sent_dt END
       WHERE rq_key = $10
       RETURNING *`,
      [
        name,
        email,
        address,
        rocks_requested,
        nowShipped,
        tracking_number || null,
        comments || null,
        rock_numbers || null,
        stampSentDt,
        rq_key,
      ]
    );

    // Unlink any catalog rows previously assigned to this request that are
    // no longer in the new list, then (re)link everything currently listed.
    await client.query(
      'UPDATE catalog SET rq_key = NULL, update_dt = CURRENT_TIMESTAMP WHERE rq_key = $1 AND NOT (rock_number = ANY($2::int[]))',
      [rq_key, rockNumbers]
    );
    if (rockNumbers.length > 0) {
      await client.query(
        'UPDATE catalog SET rq_key = $1, update_dt = CURRENT_TIMESTAMP WHERE rock_number = ANY($2::int[])',
        [rq_key, rockNumbers]
      );
    }

    await client.query('COMMIT');
    res.json(updateRes.rows[0]);
  } catch (err) {
    if (client) await client.query('ROLLBACK');
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
    const wasShipped = rows[0].shipped;

    await sendEmail({ to: rows[0].email, subject, text: body });

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
