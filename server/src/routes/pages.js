const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const EMAIL_SLUGS = require("../utils/emailSlugs");
const { ACCOUNT_PAGE_SLUGS } = require("../utils/accountPageSlugs");

// Rows that are never public nav pages: email templates (their `visible` is
// an Active/Inactive send switch, see routes/pagesAdmin.js) and the account
// pages (Sign In etc., reached from the Sign In nav item, not the page list).
const NON_NAV_SLUGS = [...EMAIL_SLUGS, ...ACCOUNT_PAGE_SLUGS];

// -------------------- GET /api/pages --------------------
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT page_slug AS slug, nav_label, order_num, visible
       FROM page_content
       WHERE visible = true
         AND page_slug != ALL($1)
       ORDER BY order_num`,
      [NON_NAV_SLUGS]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pages:", err);
    res.status(500).json({ error: "Server error fetching pages." });
  }
});

// -------------------- GET /api/pages/:slug/content --------------------
// `title` and `visible` are only meaningful for the account pages (Title
// is stored in published_email_subject; visible = page turned on).
// Email templates aren't pages: their bodies are only ever rendered
// server-side (or previewed through the admin API), so they 404 here.
router.get("/:slug/content", async (req, res) => {
  const { slug } = req.params;
  if (EMAIL_SLUGS.has(slug)) {
    return res.status(404).json({ error: "Page not found." });
  }

  try {
    const result = await db.query(
      `SELECT published_body, published_email_subject, visible
       FROM page_content WHERE page_slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    const row = result.rows[0];
    res.json({
      body: row.published_body,
      ...(ACCOUNT_PAGE_SLUGS.has(slug)
        ? { title: row.published_email_subject || "", visible: row.visible }
        : {}),
    });
  } catch (err) {
    console.error("Error fetching page content:", err);
    res.status(500).json({ error: "Server error fetching page content." });
  }
});

module.exports = router;
