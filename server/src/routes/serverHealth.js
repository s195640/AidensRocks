const express = require('express');
const router = express.Router();
const os = require('os');
const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config(); // Load .env

const TABLES = [
  "artist",
  "artist_link",
  "catalog",
  "counter",
  "counter_tracking",
  "journey",
  "journey_image",
  "journey_tracking",
  "photoalbums",
  "photos",
  "music"
];

// Get container/server IP
function getServerIp() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }
  return "127.0.0.1";
}

async function getLanIp() {
  const envLanIp = process.env.DB_HOST;
  if (envLanIp) return envLanIp;
  return getServerIp();
}

async function getInternetIp() {
  try {
    const res = await axios.get("https://api.ipify.org?format=json");
    return res.data.ip;
  } catch (err) {
    return "unknown";
  }
}

// Determine MASTER/BACKUP/TEST
function getMasterOrBackup() {
  const SERVER_NODE = process.env.SERVER_NODE || "node2";
  switch (SERVER_NODE) {
    case "node1": return "MASTER";
    case "node2": return "BACKUP";
    case "test": return "TEST";
    default: return "BACKUP";
  }
}

// Query DB counts, plus the app_version row -- read over this same direct
// per-node Postgres connection (never over HTTP to the other node's app),
// so each node reports its OWN actual locally-running version (see
// server/src/utils/recordAppVersion.js, which writes it there once per
// startup). app_version is intentionally NOT in the pglogical replication
// set, so this genuinely differs per node instead of always matching.
async function getDbCounts(host) {
  const client = new Client({
    host,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  let results = {};
  // Initialize all table counts to 0
  for (const table of TABLES) {
    results[table] = 0;
  }
  let version = 'unknown';

  try {
    await client.connect();

    for (const table of TABLES) {
      try {
        const res = await client.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
        results[table] = parseInt(res.rows[0].cnt, 10);
      } catch (err) {
        console.error(`Error querying ${table} on ${host}:`, err.message);
        results[table] = 0; // keep 0 if query fails
      }
    }

    try {
      const versionRes = await client.query('SELECT version FROM app_version WHERE id = 1');
      if (versionRes.rows.length > 0) {
        version = versionRes.rows[0].version;
      }
    } catch (err) {
      console.error(`Error querying app_version on ${host}:`, err.message);
      // keep 'unknown' if the table doesn't exist yet or the query fails
    }
  } catch (err) {
    console.error(`DB connection failed for ${host}:`, err.message);
    // results/version already defaulted above
  } finally {
    await client.end().catch(() => { });
  }
  return { tableCounts: results, version };
}

// Compare table counts between nodes
function checkDbSync(dbTables) {
  const nodes = Object.values(dbTables);
  if (nodes.length < 2) return true; // only one node or none

  const firstNodeTables = nodes[0];
  return nodes.slice(1).every((node) =>
    TABLES.every((table) => firstNodeTables[table] === node[table])
  );
}

// Main route
router.get("/", async (req, res) => {
  const serverIp = getServerIp();
  const lanIp = await getLanIp();
  const internetIp = await getInternetIp();
  const connectedNode = getMasterOrBackup();

  const dbIps = process.env.DB_IPS ? process.env.DB_IPS.split(",") : [];
  const dbTables = {};

  await Promise.all(
    dbIps.map(async (ip, idx) => {
      const nodeName = `node${idx + 1}`;
      const { tableCounts, version } = await getDbCounts(ip.trim());
      dbTables[nodeName] = {
        version,
        ip_addr: ip.trim(),
        ...tableCounts,
      };
    })
  );

  const dbSync = checkDbSync(dbTables);

  const serverHealth = {
    lastUpdated: new Date().toISOString(),
    serverIp,
    lanIp,
    internetIp,
    connectedNode,
    dbSync,
    dbTables,
  };

  res.json(serverHealth);
});

module.exports = router;
