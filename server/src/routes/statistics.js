const express = require("express");
const router = express.Router();
const db = require('../db/pool');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const { platformFromUserAgent, PLATFORMS } = require('../utils/platformFromUserAgent');
const { parseRange, addDays } = require('../utils/statsRange');

router.get("/", requireAdminAuth, async (req, res) => {
  try {
    // We select user_agent to perform more accurate platform detection
    const result = await db.query("SELECT ip_address, user_agent, platform, geo, create_dt FROM counter_tracking");
    const rows = result.rows || result;

    const now = new Date();
    const currentYear = now.getFullYear();
    const jan1Current = new Date(currentYear, 0, 1);
    const jan1Last = new Date(currentYear - 1, 0, 1);
    const dec31Last = new Date(currentYear, 0, 1);
    const msInDay = 24 * 60 * 60 * 1000;

    const getMetrics = (filteredRows) => ({
      total: filteredRows.length,
      unique: new Set(filteredRows.map(r => r.ip_address)).size
    });

    // Top Table Data (Summary Metrics)
    const data = {
      visitors: getMetrics(rows),
      noLocation: getMetrics(rows.filter(r => !r.geo)),
      sinceJan1: getMetrics(rows.filter(r => r.create_dt && new Date(r.create_dt) >= jan1Current)),
      lastYear: getMetrics(rows.filter(r => {
        const d = new Date(r.create_dt);
        return d >= jan1Last && d < dec31Last;
      })),
      last24h: getMetrics(rows.filter(r => r.create_dt && (now - new Date(r.create_dt)) <= msInDay)),
      last7d: getMetrics(rows.filter(r => r.create_dt && (now - new Date(r.create_dt)) <= (msInDay * 7))),
      last30d: getMetrics(rows.filter(r => r.create_dt && (now - new Date(r.create_dt)) <= (msInDay * 30))),
    };

    // Visitors by Platform (Second Table) - Logic using user_agent
    const platformMap = {};
    rows.forEach(row => {
      const displayPlatform = platformFromUserAgent(row.user_agent);

      if (!platformMap[displayPlatform]) {
        platformMap[displayPlatform] = { total: 0, ips: new Set() };
      }
      platformMap[displayPlatform].total += 1;
      platformMap[displayPlatform].ips.add(row.ip_address);
    });

    data.agentStats = Object.entries(platformMap).map(([name, stats]) => ({
      name,
      total: stats.total,
      unique: stats.ips.size
    })).sort((a, b) => b.unique - a.unique);

    res.json(data);
  } catch (err) {
    console.error("Error calculating statistics:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Visitors by Day panel: one row per calendar day in the viewer's timezone
// (`tz`, an IANA name; defaults to UTC), total visits + unique IPs, overall
// and per platform. Days with no visits are included as zeros so the chart's
// x-axis is continuous.
router.get("/daily", requireAdminAuth, async (req, res) => {
  const parsed = parseRange(req.query);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { range, tz, today } = parsed;
  let { start } = parsed;

  try {
    const { rows } = await db.query(
      `SELECT to_char((create_dt AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS day, ip_address, user_agent
         FROM counter_tracking
        WHERE create_dt IS NOT NULL
          AND ($2::date IS NULL OR (create_dt AT TIME ZONE $1)::date >= $2::date)`,
      [tz, start]
    );

    if (!start) {
      start = rows.reduce((min, r) => (r.day < min ? r.day : min), today);
    }

    const emptyBucket = () => ({ total: 0, ips: new Set() });
    const byDay = new Map();
    for (let day = start; day <= today; day = addDays(day, 1)) {
      byDay.set(day, { all: emptyBucket(), platforms: Object.fromEntries(PLATFORMS.map((p) => [p, emptyBucket()])) });
    }

    for (const row of rows) {
      const bucket = byDay.get(row.day);
      if (!bucket) continue; // a create_dt in the future relative to `today`
      const platform = bucket.platforms[platformFromUserAgent(row.user_agent)];
      bucket.all.total += 1;
      bucket.all.ips.add(row.ip_address);
      platform.total += 1;
      platform.ips.add(row.ip_address);
    }

    const counts = (b) => ({ total: b.total, unique: b.ips.size });
    res.json({
      range,
      tz,
      platforms: PLATFORMS,
      days: [...byDay].map(([date, b]) => ({
        date,
        ...counts(b.all),
        platforms: Object.fromEntries(PLATFORMS.map((p) => [p, counts(b.platforms[p])])),
      })),
    });
  } catch (err) {
    console.error("Error calculating daily visitors:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;