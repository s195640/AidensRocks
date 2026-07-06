const express = require("express");
const router = express.Router();
const db = require("../db/pool");

// -------------------- GET /api/admin/pages --------------------
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT page_slug AS slug, nav_label, order_num, visible,
              draft_body, published_body, updated_at, published_at
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
  const { body } = req.body;

  if (typeof body !== "string") {
    return res.status(400).json({ error: "'body' must be a string." });
  }

  try {
    const result = await db.query(
      `UPDATE page_content
       SET draft_body = $1, updated_at = CURRENT_TIMESTAMP
       WHERE page_slug = $2
       RETURNING draft_body`,
      [body, slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({ success: true, body: result.rows[0].draft_body });
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
      `SELECT draft_body FROM page_content WHERE page_slug = $1`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({ body: result.rows[0].draft_body });
  } catch (err) {
    console.error("Error fetching preview:", err);
    res.status(500).json({ error: "Server error fetching preview." });
  }
});

// -------------------- POST /api/admin/pages/:slug/publish --------------------
router.post("/:slug/publish", async (req, res) => {
  const { slug } = req.params;

  try {
    const result = await db.query(
      `UPDATE page_content
       SET published_body = draft_body, published_at = CURRENT_TIMESTAMP
       WHERE page_slug = $1
       RETURNING published_body, published_at`,
      [slug]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Page not found." });
    }

    res.json({
      success: true,
      published_body: result.rows[0].published_body,
      published_at: result.rows[0].published_at,
    });
  } catch (err) {
    console.error("Error publishing page:", err);
    res.status(500).json({ error: "Server error publishing page." });
  }
});

module.exports = router;
