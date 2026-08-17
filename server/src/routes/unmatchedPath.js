const express = require("express");
const router = express.Router();
const db = require("../db/pool");

// Paths that are routine browser/crawler noise, not a bad link a visitor
// actually typed/followed -- never logged. Matched case-insensitively
// against the pathname only (no query string). This site doesn't define its
// own favicon/robots.txt/apple-touch-icon, so every browser's automatic
// request for one of these would otherwise hit the catch-all and pollute
// the hit-count table. Extend this list as new noise shows up in real data.
const IGNORE_EXACT = new Set([
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
]);
const IGNORE_PREFIXES = ["/.well-known/"];

function isIgnoredPath(path) {
  const p = path.toLowerCase();
  if (IGNORE_EXACT.has(p)) return true;
  return IGNORE_PREFIXES.some((prefix) => p.startsWith(prefix));
}

// POST / -- logs one hit against a path. Fired by
// client/src/components/notfoundredirect/NotFoundRedirect.jsx (any path
// that didn't match a route) and client/src/components/qrredirect/
// QRRedirect.jsx (the real, matched "/qr" route -- the family wants its hit
// count shown here too, even though it isn't an unmatched path) before each
// redirects the visitor to "/". No auth -- anonymous visitors hit this, same
// as /api/rock-count. Insert-only (see data/sql/migrations/
// add_unmatched_path_hit_table.sql for why it's not an incrementing column).
// fullUrl (optional) is the entire URL including the query string --
// path stays pathname-only since that's still what grouping/counting below
// keys on (see data/sql/migrations/add_full_url_to_unmatched_path_hit.sql).
router.post("/", async (req, res) => {
  const { path, fullUrl } = req.body;

  if (!path || typeof path !== "string" || path.length > 2048) {
    return res.status(400).json({ error: "Invalid path" });
  }

  if (fullUrl !== undefined && (typeof fullUrl !== "string" || fullUrl.length > 2048)) {
    return res.status(400).json({ error: "Invalid fullUrl" });
  }

  if (isIgnoredPath(path)) {
    return res.status(204).end();
  }

  try {
    await db.query(
      "INSERT INTO unmatched_path_hit (path, full_url) VALUES ($1, $2)",
      [path, fullUrl || null]
    );
    res.status(204).end();
  } catch (err) {
    console.error("Error logging unmatched path:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET / -- for the admin Statistics panel. Public, no auth, matching this
// repo's existing precedent for this kind of aggregate analytics read (see
// routes/statistics.js). Counts are computed at read time via COUNT(*).
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT path, COUNT(*)::int AS hit_count, MAX(create_dt) AS last_hit_dt
       FROM unmatched_path_hit
       GROUP BY path
       ORDER BY COUNT(*) DESC, path ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching unmatched path hits:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
