// One-time fill of the blank visitor locations (`geo`) on site visits
// (counter_tracking) and rock uploads (journey_tracking). Those came from
// /api/location, which looked up Cloudflare's address instead of the
// visitor's until nginx started passing CF-Connecting-IP (see
// data/ai-build-docs/bug-sweep/todo.md #4 / #15). The saved ip_address is
// the visitor's, so it's looked up again here with geoip-lite.
//
//   npm run backfill-geo              preview only: counts, nothing written
//   npm run backfill-geo -- --apply   fill them in
//
// Only rows whose geo is blank (NULL, or every value null/empty) are
// touched -- a row with any real location is never overwritten. Filled rows
// get `"backfilled": true`, so they can always be told apart from (or
// reverted back to blank) live ones. Rows with no usable IP, or an IP
// geoip-lite can't place, stay as they are. Safe to re-run.
//
// Prod: back up both tables first, and run it on ONE node only -- it's a
// data change, so pglogical copies it to the other node.
const geoip = require('geoip-lite');

const TABLES = [
  { name: 'counter_tracking', key: 'rct_key', label: 'site visits' },
  { name: 'journey_tracking', key: 'rpt_key', label: 'rock uploads' },
];

const BLANK_GEO_SQL = `(
  geo IS NULL
  OR jsonb_typeof(geo) = 'null'
  OR (jsonb_typeof(geo) = 'object' AND NOT EXISTS (
    SELECT 1 FROM jsonb_each(geo) e WHERE e.value NOT IN ('null'::jsonb, '""'::jsonb)
  ))
)`;

// Same shape the site saves (client/src/components/tracker/Tracker.jsx),
// or null when the IP can't be placed.
function lookupGeo(rawIp) {
  const ip = String(rawIp || '').trim().replace(/^::ffff:/i, '');
  if (!ip || ip.toLowerCase() === 'unknown') return null;
  const geo = geoip.lookup(ip);
  // Unplaceable addresses (e.g. Cloudflare's own) come back as a range with
  // every field empty rather than null.
  if (!geo || (!geo.country && geo.ll?.[0] == null)) return null;
  return {
    country: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
    latitude: geo.ll?.[0] ?? null,
    longitude: geo.ll?.[1] ?? null,
    backfilled: true,
  };
}

// Returns one { table, label, blank, fillable, noIp, notFound, updated }
// per table. Writes only when `apply`.
async function backfillGeo(db, { apply = false } = {}) {
  const results = [];
  for (const { name, key, label } of TABLES) {
    const { rows } = await db.query(
      `SELECT ${key} AS key, ip_address FROM ${name} WHERE ${BLANK_GEO_SQL} ORDER BY ${key}`
    );

    const cache = new Map();
    const fills = [];
    let noIp = 0;
    let notFound = 0;
    for (const row of rows) {
      const ip = String(row.ip_address || '').trim();
      if (!ip || ip.toLowerCase() === 'unknown') {
        noIp++;
        continue;
      }
      if (!cache.has(ip)) cache.set(ip, lookupGeo(ip));
      const geo = cache.get(ip);
      if (geo) fills.push({ key: row.key, geo });
      else notFound++;
    }

    let updated = 0;
    if (apply && fills.length) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        for (const { key: k, geo } of fills) {
          // Re-checks "still blank" so a row a visitor filled in meanwhile
          // is left alone.
          const res = await client.query(
            `UPDATE ${name} SET geo = $2::jsonb WHERE ${key} = $1 AND ${BLANK_GEO_SQL}`,
            [k, JSON.stringify(geo)]
          );
          updated += res.rowCount;
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    results.push({ table: name, label, blank: rows.length, fillable: fills.length, noIp, notFound, updated });
  }
  return results;
}

async function main() {
  require('dotenv').config();
  const db = require('../src/db/pool');
  const apply = process.argv.includes('--apply');
  try {
    const results = await backfillGeo(db, { apply });
    console.log(apply ? 'Backfill applied:\n' : 'Preview only (nothing written). Add --apply to fill them in.\n');
    for (const r of results) {
      console.log(`${r.label} (${r.table}):`);
      console.log(`  blank locations:          ${r.blank}`);
      console.log(`  can be filled:            ${r.fillable}`);
      console.log(`  no IP saved / "Unknown":  ${r.noIp}`);
      console.log(`  IP can't be placed:       ${r.notFound}`);
      if (apply) console.log(`  filled:                   ${r.updated}`);
      console.log('');
    }
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Backfill failed (nothing was changed in the table that failed):', err.message);
    process.exit(1);
  });
}

module.exports = { backfillGeo, lookupGeo };
