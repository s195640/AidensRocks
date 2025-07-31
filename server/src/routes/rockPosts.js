// routes/rockPosts.js
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        rps.rps_key,
        rps.rock_number,
        TO_CHAR(rps.date, 'MM/DD/YYYY') AS date,
        rps.location,
        rps.comment,
        rps.uuid,
        ARRAY_AGG(rpi.current_name ORDER BY rpi.upload_order) AS "imageNames"
      FROM Rock_Post_Summary rps
      JOIN Rock_Post_Image rpi ON rpi.rps_key = rps.rps_key
      WHERE rps.show = TRUE AND rpi.show = TRUE
      GROUP BY rps.rps_key
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching rock post data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
