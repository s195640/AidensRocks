const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// Get all users
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM Rock_Artist ORDER BY ra_key ASC'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Create a new user
router.post('/', async (req, res, next) => {
  try {
    const { display_name } = req.body;
    if (!display_name)
      return res.status(400).json({ error: 'Display name required' });

    const result = await pool.query(
      `INSERT INTO Rock_Artist (display_name)
       VALUES ($1)
       RETURNING *`,
      [display_name]
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
    const { display_name } = req.body;
    if (!display_name)
      return res.status(400).json({ error: 'Display name required' });

    const result = await pool.query(
      `UPDATE Rock_Artist
       SET display_name = $1,
           update_dt = CURRENT_TIMESTAMP
       WHERE ra_key = $2
       RETURNING *`,
      [display_name, id]
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
      'DELETE FROM Rock_Artist WHERE ra_key = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
