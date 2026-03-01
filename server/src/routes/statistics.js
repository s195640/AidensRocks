// server/routes/statistics.js
const express = require("express");
const router = express.Router();
const db = require('../db/pool');

router.get("/", async (req, res) => {
  try {
    const result = await db.query("select ip_address, platform, geo, create_dt from counter_tracking");
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

    // Top Table Data
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

    // Visitors by Platform (Second Table)
    const platformMap = {};
    rows.forEach(row => {
      const platform = row.platform || "Unknown";
      if (!platformMap[platform]) {
        platformMap[platform] = { total: 0, ips: new Set() };
      }
      platformMap[platform].total += 1;
      platformMap[platform].ips.add(row.ip_address);
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

module.exports = router;