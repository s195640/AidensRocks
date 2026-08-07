const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const requireAdminAuth = require("../middleware/requireAdminAuth");
const sendEmail = require("../utils/sendEmail");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(requireAdminAuth);

// Slugs that represent an email template rather than a public page — their
// visibility is permanently locked off (see PATCH /:slug/visible below).
// Client-side (PagesAdmin.jsx / PagesEditDialog.jsx / emailSlugs.js) mirrors
// this list for the Subject field, locked toggle, and email-styled preview.
const LOCKED_VISIBLE_SLUGS = new Set(["response-email"]);

// -------------------- GET /api/admin/pages --------------------
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT page_slug AS slug, nav_label, order_num, visible,
              draft_body, published_body,
              draft_email_subject, published_email_subject,
              updated_at, published_at
       FROM page_content
       ORDER BY order_num`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching admin pages:", err);
    res.status(500).json({ error: "Server error fetching pages." });
  }
});

// -------------------- POST /api/admin/pages/reorder --------------------
router.post("/reorder", async (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: "Invalid or empty order array." });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    for (let i = 0; i < order.length; i++) {
      await client.query(
        `UPDATE page_content SET order_num = $1, updated_at = CURRENT_TIMESTAMP WHERE page_slug = $2`,
        [i, order[i]]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error reordering pages:", err);
    res.status(500).json({ error: "Server error reordering pages." });
  } finally {
    client.release();
  }
});

// -------------------- PATCH /api/admin/pages/:slug/visible --------------------
router.patch("/:slug/visible", async (req, res) => {
  const { slug } = req.params;

  if (LOCKED_VISIBLE_SLUGS.has(slug)) {
    return res.status(400).json({
      error: "This page's visibility is locked and cannot be toggled.",
    });
  }

  try {
    const result = await db.query(
      `UPDATE page_content
       SET visible = NOT visible, updated_at = CURRENT_TIMESTAMP
       WHERE page_slug = $1
       RETURNING visible`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({ success: true, visible: result.rows[0].visible });
  } catch (err) {
    console.error("Error toggling page visibility:", err);
    res.status(500).json({ error: "Server error toggling page visibility." });
  }
});

// -------------------- PUT /api/admin/pages/:slug/draft --------------------
router.put("/:slug/draft", async (req, res) => {
  const { slug } = req.params;
  const { body, email_subject } = req.body;

  if (typeof body !== "string") {
    return res.status(400).json({ error: "'body' must be a string." });
  }

  try {
    // email_subject is only meaningful for email-template rows; other pages
    // never send it, so COALESCE leaves their (always-empty) value alone.
    const result = await db.query(
      `UPDATE page_content
       SET draft_body = $1,
           draft_email_subject = COALESCE($2, draft_email_subject),
           updated_at = CURRENT_TIMESTAMP
       WHERE page_slug = $3
       RETURNING draft_body, draft_email_subject`,
      [body, email_subject ?? null, slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({
      success: true,
      body: result.rows[0].draft_body,
      email_subject: result.rows[0].draft_email_subject,
    });
  } catch (err) {
    console.error("Error saving draft:", err);
    res.status(500).json({ error: "Server error saving draft." });
  }
});

// -------------------- GET /api/admin/pages/:slug/preview --------------------
router.get("/:slug/preview", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db.query(
      `SELECT draft_body, draft_email_subject FROM page_content WHERE page_slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({
      body: result.rows[0].draft_body,
      email_subject: result.rows[0].draft_email_subject,
    });
  } catch (err) {
    console.error("Error fetching preview:", err);
    res.status(500).json({ error: "Server error fetching preview." });
  }
});

// -------------------- POST /api/admin/pages/:slug/send --------------------
// Sends the *draft* content of an email-template row to a single recipient —
// the same content GET /:slug/preview shows, so "what you previewed is what
// gets sent" holds without requiring a Publish step first. Only usable for
// LOCKED_VISIBLE_SLUGS rows; normal pages have no sensible "send".
router.post("/:slug/send", async (req, res) => {
  const { slug } = req.params;
  const { to } = req.body;

  if (!LOCKED_VISIBLE_SLUGS.has(slug)) {
    return res.status(400).json({ error: "This page is not an email template." });
  }

  if (typeof to !== "string" || !EMAIL_RE.test(to.trim())) {
    return res.status(400).json({ error: "A valid recipient email address is required." });
  }

  try {
    const result = await db.query(
      `SELECT draft_body, draft_email_subject FROM page_content WHERE page_slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    const { draft_body, draft_email_subject } = result.rows[0];

    await sendEmail({
      to: to.trim(),
      subject: draft_email_subject || "(No subject)",
      html: draft_body,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(`Error sending email for "${slug}":`, err);
    res.status(500).json({ error: "Failed to send email." });
  }
});

// -------------------- POST /api/admin/pages/:slug/publish --------------------
router.post("/:slug/publish", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db.query(
      `UPDATE page_content
       SET published_body = draft_body,
           published_email_subject = draft_email_subject,
           published_at = CURRENT_TIMESTAMP
       WHERE page_slug = $1
       RETURNING published_body, published_email_subject, published_at`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({
      success: true,
      published_body: result.rows[0].published_body,
      published_email_subject: result.rows[0].published_email_subject,
      published_at: result.rows[0].published_at,
    });
  } catch (err) {
    console.error("Error publishing page:", err);
    res.status(500).json({ error: "Server error publishing page." });
  }
});

module.exports = router;
