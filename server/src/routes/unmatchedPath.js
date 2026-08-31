const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const buildPathDisplayNameMatcher = require("../utils/pathDisplayNameMatcher");

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

// GET / -- for the admin Path Hits widget (client/src/admin/components/
// path-hits-panel/PathHitsPanel.jsx). Public, no auth, matching this
// repo's existing precedent for this kind of aggregate analytics read (see
// routes/statistics.js). Mapping management itself (path_display_name) is
// admin-only -- see routes/pathDisplayNameAdmin.js.
//
// Raw hits are first aggregated per distinct full_url (falling back to the
// pathname-only `path` for older rows logged before full_url existed --
// see data/sql/migrations/add_full_url_to_unmatched_path_hit.sql), then
// merged a second time in JS by whichever path_display_name row each one
// resolves to (see utils/pathDisplayNameMatcher.js). That second merge is
// what lets a wildcard mapping like "/qr?r=*" -> "Rock" collapse every
// distinct rock code into a single "Rock" row with a combined hit count,
// while a full_url that matches no mapping stays listed on its own under
// "Unknown" -- surfacing it, rather than hiding it, is the point (it's how
// the family notices a path that still needs a mapping).
router.get("/", async (req, res) => {
  try {
    const [hitsResult, mappingsResult] = await Promise.all([
      db.query(
        `SELECT COALESCE(full_url, path) AS full_url, COUNT(*)::int AS hit_count, MAX(create_dt) AS last_hit_dt
         FROM unmatched_path_hit
         GROUP BY COALESCE(full_url, path)`
      ),
      db.query(`SELECT url_pattern, display_name FROM path_display_name`),
    ]);

    const resolve = buildPathDisplayNameMatcher(mappingsResult.rows);

    const merged = new Map();
    for (const row of hitsResult.rows) {
      const match = resolve(row.full_url);
      const key = match ? match.urlPattern : row.full_url;
      const existing = merged.get(key);
      if (existing) {
        existing.hit_count += row.hit_count;
        if (row.last_hit_dt > existing.last_hit_dt) existing.last_hit_dt = row.last_hit_dt;
      } else {
        merged.set(key, {
          full_url: key,
          display_name: match ? match.displayName : "Unknown",
          hit_count: row.hit_count,
          last_hit_dt: row.last_hit_dt,
        });
      }
    }

    const rows = [...merged.values()].sort(
      (a, b) => b.hit_count - a.hit_count || a.full_url.localeCompare(b.full_url)
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching unmatched path hits:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
