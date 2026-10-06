const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const { PUBLIC_SETTINGS } = require("../utils/siteSettings");

// PUBLIC — GET /api/site-settings: the site-wide values visitors' pages
// need (e.g. { contactEmail }). Only the allow-listed settings in
// utils/siteSettings.js are ever returned; every other `setting` row stays
// behind /api/admin/settings. A setting that was never saved is null.
router.get("/", async (req, res) => {
  const names = Object.keys(PUBLIC_SETTINGS);
  try {
    const { rows } = await db.query("SELECT name, value FROM setting WHERE name = ANY($1)", [names]);
    const byName = new Map(rows.map((r) => [r.name, r.value]));
    const result = {};
    for (const name of names) result[PUBLIC_SETTINGS[name]] = byName.get(name) ?? null;
    res.json(result);
  } catch (err) {
    console.error("Error fetching site settings:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
