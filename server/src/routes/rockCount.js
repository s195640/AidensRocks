const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.post('/rock-count', async (req, res) => {
  const {
    rock_qr_number = 'unknown',
    ipAddress,
    userAgent,
    window,
    screen,
    platform,
    language,
    timezone,
    timestamp,
    page_url,
    referrer,
    cookiesEnabled,
    session_id,
    geo,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert or get rcs_key from Rock_Count_Summary
    const { rows } = await client.query(
      `INSERT INTO Rock_Count_Summary (rock_qr_number)
   VALUES ($1)
   RETURNING rcs_key`,
      [rock_qr_number]
    );

    const rcs_key = rows[0].rcs_key;

    // 2. Insert into Rock_Count_Tracking
    await client.query(
      `INSERT INTO Rock_Count_Tracking (
        rcs_key, ip_address, user_agent, "window", screen, platform, language,
        timezone, timestamp, page_url, referrer, cookies_enabled, session_id, geo
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14
      )`,
      [
        rcs_key,
        ipAddress,
        userAgent,
        JSON.stringify(window),
        JSON.stringify(screen),
        platform,
        language,
        timezone,
        timestamp,
        page_url,
        referrer,
        cookiesEnabled,
        session_id,
        geo ? JSON.stringify(geo) : null,
      ]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: 'Tracking recorded.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Rock tracking error:', error);
    res.status(500).json({ error: 'Failed to track rock visit' });
  } finally {
    client.release();
  }
});

module.exports = router;
