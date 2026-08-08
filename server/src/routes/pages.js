const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const EMAIL_SLUGS = require("../utils/emailSlugs");

// -------------------- GET /api/pages --------------------
// Excludes EMAIL_SLUGS rows unconditionally, regardless of `visible` — for
// those rows `visible` is repurposed as an Active/Inactive send switch (see
// routes/pagesAdmin.js), not "show this in the nav", and they have no
// public route (PAGE_PATHS entry) to link to in the first place.
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT page_slug AS slug, nav_label, order_num, visible
       FROM page_content
       WHERE visible = true
         AND page_slug != ALL($1)
       ORDER BY order_num`,
      [Array.from(EMAIL_SLUGS)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pages:", err);
    res.status(500).json({ error: "Server error fetching pages." });
  }
});

// -------------------- GET /api/pages/:slug/content --------------------
router.get("/:slug/content", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db.query(
      `SELECT published_body FROM page_content WHERE page_slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({ body: result.rows[0].published_body });
  } catch (err) {
    console.error("Error fetching page content:", err);
    res.status(500).json({ error: "Server error fetching page content." });
  }
});

module.exports = router;
