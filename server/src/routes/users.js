const express = require('express');
const pool = require('../db/pool');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const router = express.Router();

// artist.display_name has no unique constraint, so the 23505 handlers
// below never fired: an edit could create a duplicate. Checked here
// instead (case-insensitive, ignoring the artist being edited).
async function nameTaken(displayName, exceptKey = null) {
  const { rows } = await pool.query(
    'SELECT 1 FROM artist WHERE lower(display_name) = lower($1) AND ($2::int IS NULL OR ra_key <> $2)',
    [displayName.trim(), exceptKey]
  );
  return rows.length > 0;
}

router.use(requireAdminAuth);

// Get all users
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM artist ORDER BY ra_key ASC'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Create a new user
router.post('/', async (req, res, next) => {
  try {
    // Artists no longer have a DOB in the UI; the artist.dob column is
    // kept (existing values untouched) but no longer set from here.
    const { display_name, relation } = req.body;
    if (!display_name)
      return res.status(400).json({ error: 'Display name required' });
    if (await nameTaken(display_name)) {
      return res.status(409).json({ error: 'Display name already exists' });
    }

    const result = await pool.query(
      `INSERT INTO artist (display_name, relation)
       VALUES ($1, $2)
       RETURNING *`,
      [display_name, relation || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Check for unique constraint violation
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Display name already exists' });
    }
    next(err);
  }
});

// Update user
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    // dob is deliberately not updated (no longer in the UI) — leaving it
    // out keeps any existing value instead of wiping it.
    const { display_name, relation } = req.body;
    if (!display_name)
      return res.status(400).json({ error: 'Display name required' });
    if (await nameTaken(display_name, Number(id) || null)) {
      return res.status(409).json({ error: 'Display name already exists' });
    }

    const result = await pool.query(
      `UPDATE artist
       SET display_name = $1,
           relation = $2,
           update_dt = CURRENT_TIMESTAMP
       WHERE ra_key = $3
       RETURNING *`,
      [display_name, relation || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Display name already exists' });
    }
    next(err);
  }
});

// Delete user
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM artist WHERE ra_key = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err) {
    // 23503 = foreign key: the artist is still linked to rocks.
    if (err.code === '23503') {
      return res.status(409).json({
        error: "This artist is still linked to rocks. Remove them from those rocks first.",
      });
    }
    next(err);
  }
});

module.exports = router;
