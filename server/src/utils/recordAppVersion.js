// utils/recordAppVersion.js
const pool = require('../db/pool');
const getAppVersion = require('./getAppVersion');

// Best-effort: writes/refreshes this node's own row in the (intentionally
// unreplicated -- see data/sql/migrations/add_app_version_table.sql) app_version
// table, once per server startup. `pool` connects to this node's own local
// Postgres (DB_HOST in this node's .env), never a shared/remote one, so this
// always records what's actually running here, not on the other node.
//
// Read back per-node (over each node's own direct Postgres connection, not
// this process talking to itself) by server/src/routes/serverHealth.js, so
// the admin dashboard's Node tables show each node's real running version.
async function recordAppVersion() {
  const version = getAppVersion();
  try {
    await pool.query(
      `INSERT INTO app_version (id, version, updated_dt)
       VALUES (1, $1, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, updated_dt = EXCLUDED.updated_dt`,
      [version]
    );
    console.log(`✅ Recorded app version ${version} in app_version table`);
  } catch (err) {
    // Best-effort: a failure here shouldn't stop the server from starting --
    // it just means the dashboard's Version row shows stale/unknown data
    // for this node until the next successful startup.
    console.error('❌ Failed to record app version in DB:', err.message);
  }
}

module.exports = recordAppVersion;
