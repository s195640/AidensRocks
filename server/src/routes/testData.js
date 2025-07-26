const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

router.get('/count', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM testdata');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { comment, date } = req.body;
    await pool.query('INSERT INTO testdata (comment, date) VALUES ($1, $2)', [
      comment,
      date,
    ]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
