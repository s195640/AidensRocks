// routes/rockPosts.js
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/totals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(1) FROM Rock_Catalog) AS total_rocks,
        (SELECT COUNT(DISTINCT rock_number) FROM Rock_Post_Summary WHERE show = TRUE) AS rocks_found
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching rock totals:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/allrocks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        rc.rock_number,
        COALESCE(
          STRING_AGG(ra.display_name, ', ' ORDER BY ra.display_name),
          ''
        ) AS artists
      FROM Rock_Catalog rc
      LEFT JOIN Rock_Artist_Link ral ON rc.rc_key = ral.rc_key
      LEFT JOIN Rock_Artist ra ON ral.ra_key = ra.ra_key
      GROUP BY rc.rock_number
      ORDER BY rc.rock_number;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all rocks with artists:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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
ORDER BY rps.date DESC, rps.create_dt DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching rock post data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:rockNumber', async (req, res) => {
  const { rockNumber } = req.params;

  try {
    const result = await pool.query(
      `
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
  AND rps.rock_number = $1
ORDER BY rps.date DESC, rps.create_dt DESC;
      `,
      [rockNumber]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching rock post data for rock number:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/locations/all', async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT rps_key, rock_number, latitude, longitude
      FROM Rock_Post_Summary
      WHERE rock_number > 0
        AND show = TRUE
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY rps_key DESC;
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching rock locations:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
