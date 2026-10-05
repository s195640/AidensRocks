// routes/rockPosts.js
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { optionalAuth } = require('../middleware/requireAuth');
const { followedRockNumbersSql } = require('../utils/followedRocks');
const visibleJourneySql = require('../utils/visibleJourneySql');

// "Display Name (Relation)", or just the name when relation is NULL --
// plain `||` made the whole label NULL for an artist with no relation.
const ARTIST_LABEL_SQL = `ra.display_name || COALESCE(' (' || ra.relation || ')', '')`;

router.get('/totals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(1) FROM catalog) AS total_rocks,
        (SELECT COUNT(DISTINCT rock_number) FROM journey WHERE ${visibleJourneySql()}) AS rocks_found
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
      FROM catalog rc
      LEFT JOIN artist_link ral ON rc.rc_key = ral.rc_key
      LEFT JOIN artist ra ON ral.ra_key = ra.ra_key
      GROUP BY rc.rock_number
      ORDER BY rc.rock_number DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all rocks with artists:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/', optionalAuth, async (req, res) => {
  // Paginated by distinct rock (not by raw journey row), since Track the
  // Rocks renders one card per rock_number grouping together all of that
  // rock's journey stops. Defaults preserve the old "give me everything"
  // shape for any caller that doesn't pass page/pageSize.
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.max(1, parseInt(req.query.pageSize, 10) || 25);
  const offset = (page - 1) * pageSize;
  // ?followed=1 (Track the Rocks "only rocks I follow" switch) narrows the
  // list to the signed-in account's followed rocks; ignored when signed out.
  const followedAccountId =
    req.query.followed === '1' && req.account ? req.account.id : null;

  try {
    const rockNumbersResult = await pool.query(
      `
      SELECT rock_number, COUNT(*) OVER() AS total_count
      FROM (
        SELECT rock_number, MAX(date) AS latest_date, MAX(create_dt) AS latest_create_dt
        FROM journey
        WHERE ${visibleJourneySql()}
          AND ($3::int IS NULL OR rock_number IN (
            ${followedRockNumbersSql('$3::int')}
          ))
        GROUP BY rock_number
      ) latest
      ORDER BY latest_date DESC, latest_create_dt DESC
      LIMIT $1 OFFSET $2;
      `,
      [pageSize, offset, followedAccountId]
    );

    const totalRocks = rockNumbersResult.rows[0]
      ? parseInt(rockNumbersResult.rows[0].total_count, 10)
      : 0;
    const rockNumbers = rockNumbersResult.rows.map((r) => r.rock_number);

    if (rockNumbers.length === 0) {
      return res.json({ rows: [], totalRocks, page, pageSize });
    }

    const result = await pool.query(
      `
WITH images AS (
    SELECT rps_key, json_agg(json_build_object('name', current_name, 'media_type', media_type) ORDER BY upload_order) AS imageNames
    FROM journey_image
    WHERE show = TRUE
    GROUP BY rps_key
),
artists AS (
    SELECT rc.rock_number,
           ARRAY_AGG(${ARTIST_LABEL_SQL}) AS artists
    FROM artist_link ral
    JOIN artist ra ON ra.ra_key = ral.ra_key
    JOIN catalog rc ON rc.rc_key = ral.rc_key
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
    COALESCE(a.artists, '{}') AS artists,
    rps.latitude,
    rps.longitude
FROM journey rps
JOIN images img ON img.rps_key = rps.rps_key
LEFT JOIN artists a ON a.rock_number = rps.rock_number
WHERE rps.show = TRUE
  AND rps.rock_number = ANY($1::int[])
ORDER BY rps.date DESC, rps.create_dt DESC;
      `,
      [rockNumbers]
    );

    res.json({ rows: result.rows, totalRocks, page, pageSize });
  } catch (err) {
    console.error('Error fetching rock post data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:rockNumber', async (req, res) => {
  const { rockNumber } = req.params;
  if (!/^\d+$/.test(rockNumber)) {
    return res.status(400).json({ error: 'Rock number must be a whole number.' });
  }

  try {
    const result = await pool.query(
      `
WITH images AS (
    SELECT rps_key, json_agg(json_build_object('name', current_name, 'media_type', media_type) ORDER BY upload_order) AS imageNames
    FROM journey_image
    WHERE show = TRUE
    GROUP BY rps_key
),
artists AS (
    SELECT rc.rock_number, 
           ARRAY_AGG(${ARTIST_LABEL_SQL}) AS artists
    FROM artist_link ral
    JOIN artist ra ON ra.ra_key = ral.ra_key
    JOIN catalog rc ON rc.rc_key = ral.rc_key
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
    COALESCE(a.artists, '{}') AS artists,
    rps.latitude,
    rps.longitude
FROM journey rps
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
      SELECT rps_key, rock_number, latitude, longitude, date
      FROM journey
      WHERE rock_number > 0
        AND ${visibleJourneySql()}
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
