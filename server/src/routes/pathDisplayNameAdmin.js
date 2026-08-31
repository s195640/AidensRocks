const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const requireAdminAuth = require("../middleware/requireAdminAuth");

// Admin CRUD for the path_display_name lookup table (see
// data/sql/migrations/add_path_display_name_table.sql), managed from the
// "Path Display Names" job on the admin Jobs page. Read by
// GET /api/unmatched-path to label the admin Path Hits widget -- see
// server/src/utils/pathDisplayNameMatcher.js for how url_pattern (which
// may contain a "*" wildcard) is matched against a logged hit.
router.use(requireAdminAuth);

function validateInput(body) {
  const urlPattern = typeof body.urlPattern === "string" ? body.urlPattern.trim() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";

  if (!urlPattern || urlPattern.length > 2048) {
    return { error: "A URL pattern (1-2048 characters) is required." };
  }
  if (!displayName || displayName.length > 255) {
    return { error: "A display name (1-255 characters) is required." };
  }
  return { urlPattern, displayName };
}

// GET / -- lists every mapping, alphabetical by pattern.
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, url_pattern, display_name, create_dt, update_dt
       FROM path_display_name
       ORDER BY url_pattern ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching path display names:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST / -- creates a new mapping.
router.post("/", async (req, res) => {
  const { error, urlPattern, displayName } = validateInput(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const result = await db.query(
      `INSERT INTO path_display_name (url_pattern, display_name)
       VALUES ($1, $2)
       RETURNING id, url_pattern, display_name, create_dt, update_dt`,
      [urlPattern, displayName]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A mapping for that URL pattern already exists." });
    }
    console.error("Error creating path display name:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /:id -- updates an existing mapping's pattern and/or display name.
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { error, urlPattern, displayName } = validateInput(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const result = await db.query(
      `UPDATE path_display_name
       SET url_pattern = $1, display_name = $2, update_dt = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, url_pattern, display_name, create_dt, update_dt`,
      [urlPattern, displayName, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mapping not found." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A mapping for that URL pattern already exists." });
    }
    console.error("Error updating path display name:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// DELETE /:id -- removes a mapping.
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`DELETE FROM path_display_name WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Mapping not found." });
    }
    res.status(204).end();
  } catch (err) {
    console.error("Error deleting path display name:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
