const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const requireAdminAuth = require("../middleware/requireAdminAuth");

// Admin read/write for the generic `setting` key/value table (see
// data/sql/migrations/add_setting_table.sql). Rows are addressed by name,
// e.g. "qr-center-label" -- the "Create QR Codes (Center Label)" job's
// saved controls.
router.use(requireAdminAuth);

const NAME_RE = /^[a-z0-9._-]{1,100}$/;
const MAX_VALUE_BYTES = 64 * 1024;

const COLUMNS = "name, value, type, description, create_dt, update_dt";

// GET /:name -- returns one setting, 404 if it has never been saved.
router.get("/:name", async (req, res) => {
  const { name } = req.params;
  if (!NAME_RE.test(name)) return res.status(400).json({ error: "Invalid setting name." });

  try {
    const result = await db.query(`SELECT ${COLUMNS} FROM setting WHERE name = $1`, [name]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Setting not found." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching setting:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /:name -- creates or replaces a setting's value. type/description are
// optional; when omitted, an existing row keeps its current ones.
router.put("/:name", async (req, res) => {
  const { name } = req.params;
  const { value, type, description } = req.body || {};

  if (!NAME_RE.test(name)) return res.status(400).json({ error: "Invalid setting name." });
  if (value === undefined) return res.status(400).json({ error: "A value is required." });

  const json = JSON.stringify(value);
  if (Buffer.byteLength(json) > MAX_VALUE_BYTES) {
    return res.status(400).json({ error: "Setting value is too large (max 64KB)." });
  }
  if (type != null && (typeof type !== "string" || type.length > 50)) {
    return res.status(400).json({ error: "Type must be a string of at most 50 characters." });
  }
  if (description != null && typeof description !== "string") {
    return res.status(400).json({ error: "Description must be a string." });
  }

  try {
    const result = await db.query(
      `INSERT INTO setting (name, value, type, description)
       VALUES ($1, $2::jsonb, $3, $4)
       ON CONFLICT (name) DO UPDATE
         SET value = EXCLUDED.value,
             type = COALESCE(EXCLUDED.type, setting.type),
             description = COALESCE(EXCLUDED.description, setting.description),
             update_dt = CURRENT_TIMESTAMP
       RETURNING ${COLUMNS}`,
      [name, json, type ?? null, description ?? null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error saving setting:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
