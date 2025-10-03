// src/routes/serverHealth.js
const express = require('express');
const router = express.Router();
const os = require('os');
const axios = require('axios');
require('dotenv').config(); // Load .env

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

// Get host LAN IP from environment variable (DB_HOST)
// fallback to container IP if not available
async function getLanIp() {
  const envLanIp = process.env.DB_HOST;
  if (envLanIp) return envLanIp;
  return getServerIp();
}

// Get public Internet IP
async function getInternetIp() {
  try {
    const res = await axios.get("https://api.ipify.org?format=json");
    return res.data.ip;
  } catch (err) {
    return "unknown";
  }
}

function getMasterOrBackup() {
  const SERVER_NODE = process.env.SERVER_NODE || "node2";
  return SERVER_NODE === "node1" ? "MASTER" : "BACKUP";
}

router.get("/", async (req, res) => {
  const serverIp = getServerIp();
  const lanIp = await getLanIp();
  const internetIp = await getInternetIp();
  const connectedNode = getMasterOrBackup();

  const serverHealth = {
    lastUpdated: new Date().toISOString(),
    serverIp,
    lanIp,
    internetIp,
    connectedNode: connectedNode,
    gluster: {
      node1: true,
      node2: false,
    },
    dbSync: true,
    dbTables: {
      node1: {
        artist: 4,
        artist_link: 8,
        catalog: 123,
        counter: 1253,
        counter_tracker: 1253,
        journey: 345,
        journey_image: 4234,
        journey_tracking: 345,
        photoalbums: 4,
        photos: 454,
      },
      node2: {
        artist: 4,
        artist_link: 8,
        catalog: 120,
        counter: 1250,
        counter_tracker: 1250,
        journey: 340,
        journey_image: 4230,
        journey_tracking: 342,
        photoalbums: 4,
        photos: 450,
      },
    },
  };

  res.json(serverHealth);
});

module.exports = router;
