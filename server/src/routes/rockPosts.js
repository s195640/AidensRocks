// routes/rockPosts.js
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
WITH images AS (
    SELECT rps_key, ARRAY_AGG(current_name ORDER BY upload_order) AS imageNames
    FROM Rock_Post_Image
    WHERE show = TRUE
    GROUP BY rps_key
),
artists AS (
    SELECT rc.rock_number, 
           ARRAY_AGG(ra.display_name || ' (' || ra.relation || ')') AS artists
    FROM Rock_Artist_Link ral
    JOIN Rock_Artist ra ON ra.ra_key = ral.ra_key
    JOIN Rock_Catalog rc ON rc.rc_key = ral.rc_key
    GROUP BY rc.rock_number
)
SELECT 
    rps.rps_key,
    rps.rock_number,
    TO_CHAR(rps.date, 'MM/DD/YYYY') AS date,
    rps.location,
    rps.comment,
    rps.uuid,
    img.imageNames,
    COALESCE(a.artists, '{}') AS artists
FROM Rock_Post_Summary rps
JOIN images img ON img.rps_key = rps.rps_key
LEFT JOIN artists a ON a.rock_number = rps.rock_number
WHERE rps.show = TRUE
ORDER BY rps.date DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching rock post data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
