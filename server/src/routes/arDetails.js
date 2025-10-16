const express = require("express");
const router = express.Router();
const db = require('../db/pool');

// GET /api/ar-details
router.get("/", async (req, res) => {
  const client = await db.connect();
  try {
    // --- Summary counts ---
    const rocksRes = await client.query("SELECT COUNT(*) AS count FROM Catalog");
    const rocksFoundRes = await client.query("select count(distinct rock_number) from journey");
    const journeysRes = await client.query("select count(*) from journey");
    const artistsRes = await client.query("SELECT COUNT(*) AS count FROM Artist");
    const countriesRes = await client.query("select count(distinct country) from journey");
    const statesRes = await client.query("select count(distinct state) from journey where country='United States'");

    // --- Detailed tables ---
    const artistsTable = await client.query(`
      SELECT ra.display_name AS name,
	  		     ra.relation,
             EXTRACT(YEAR FROM age(CURRENT_DATE, ra.dob))::int AS age,
             COUNT(ral.rc_key) AS rocks
      FROM Artist ra
      LEFT JOIN Artist_Link ral ON ra.ra_key = ral.ra_key
      GROUP BY ra.ra_key
      ORDER BY ra.display_name;
    `);

    const countriesTable = await client.query(`
      SELECT country AS name, COUNT(*) AS rocks
      FROM journey
      GROUP BY country
      ORDER BY country;
    `);

    const statesTable = await client.query(`
      SELECT state AS name, COUNT(*) AS rocks
      FROM journey
      WHERE country = 'United States'
      GROUP BY state
      ORDER BY state;
    `);

    res.json({
      rocks: parseInt(rocksRes.rows[0].count, 10),
      rocksFound: parseInt(rocksFoundRes.rows[0].count, 10),
      journeys: parseInt(journeysRes.rows[0].count, 10),
      artists: parseInt(artistsRes.rows[0].count, 10),
      countries: parseInt(countriesRes.rows[0].count, 10),
      usStates: parseInt(statesRes.rows[0].count, 10),

      artistsTable: artistsTable.rows,
      countriesTable: countriesTable.rows,
      statesTable: statesTable.rows,
    });
  } catch (err) {
    console.error("Error fetching AR Details:", err);
    res.status(500).json({ error: "Failed to fetch AR details" });
  } finally {
    client.release();
  }
});

module.exports = router;
