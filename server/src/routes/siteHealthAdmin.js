// Admin Site Health panel (Site Tracking, error tracking): error groups from
// the browser (site_event) and the server (server_error), each group's
// recent occurrences with the visitor's trail and a readable stack, status
// changes, slow requests and page load speed.
//
// Every list takes the dashboard's range / tz plus includeAdmins /
// includeInternal (both off by default), and aggregates in SQL so a big
// "All" never loads raw rows into Node (the plan's visitor-experience
// review, finding 6).
const express = require('express');
const db = require('../db/pool');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const getAppVersion = require('../utils/getAppVersion');
const { activityFilters, metaNum } = require('../utils/activityFilters');
const resolveStack = require('../utils/errors/resolveStack');
const { occurrencesSql } = require('../utils/errors/occurrences');
const { CLIENT_ERROR_TYPES } = require('../utils/errors/fingerprint');

const router = express.Router();
router.use(requireAdminAuth);

// Shared filter params: [$1 start (timestamptz or null), $2 includeAdmins,
// $3 includeInternal] (utils/activityFilters.js; $4, the timezone, isn't
// used here).
async function filterParams(req, res) {
  const filters = await activityFilters(req, res);
  return filters ? filters.params.slice(0, 3) : null;
}

// Every error occurrence (browser + server) matching the filters.
const OCCURRENCES = occurrencesSql();

router.get('/errors', async (req, res) => {
  try {
    const params = await filterParams(req, res);
    if (!params) return;
    const { rows } = await db.query(
      `WITH occ AS (${OCCURRENCES})
       SELECT g.fingerprint, g.source, g.type, g.title, g.status, g.first_seen, g.status_changed_at,
              g.fixed_in_version, g.note,
              COUNT(*)::int AS count, COUNT(DISTINCT occ.who)::int AS visitors, MAX(occ.created_at) AS last_seen,
              (array_agg(DISTINCT occ.page) FILTER (WHERE occ.page IS NOT NULL))[1:5] AS pages,
              (array_agg(DISTINCT occ.platform) FILTER (WHERE occ.platform IS NOT NULL)) AS platforms,
              (array_agg(DISTINCT occ.version) FILTER (WHERE occ.version IS NOT NULL))[1:5] AS versions
         FROM occ JOIN error_group g ON g.fingerprint = occ.fp
        GROUP BY g.fingerprint
        ORDER BY (g.status = 'new') DESC, MAX(occ.created_at) DESC
        LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Site health: error groups failed:', err);
    res.status(500).json({ error: 'Could not load errors' });
  }
});

const RECENT = 25;
const TRAIL = 10;

// One group: its row plus its most recent occurrences (filters apply, the
// range doesn't), each with the visitor's last events before it.
router.get('/errors/:fingerprint', async (req, res) => {
  try {
    const params = await filterParams(req, res);
    if (!params) return;
    const [, includeAdmins, includeInternal] = params;
    const { fingerprint } = req.params;
    const group = (await db.query('SELECT * FROM error_group WHERE fingerprint = $1', [fingerprint])).rows[0];
    if (!group) return res.status(404).json({ error: 'No such error' });

    const { rows } = await db.query(
      `SELECT * FROM (
         SELECT 'client' AS source, e.id, e.created_at, e.visit_id, e.path AS page, e.target_id, e.meta,
                e.type, NULL::text AS message, NULL::text AS stack, NULL::text AS method, NULL::int AS status,
                COALESCE(e.meta->>'app_version', v.client_version) AS version,
                v.platform, v.user_agent, v.geo, a.email AS account_email
           FROM site_event e
           JOIN visit v ON v.id = e.visit_id
           LEFT JOIN account a ON a.id = e.account_id
          WHERE e.meta->>'fingerprint' = $1 AND e.type = ANY($4::text[])
            AND ($2 OR NOT e.is_admin) AND ($3 OR NOT v.is_internal)
         UNION ALL
         SELECT 'server', s.id, s.created_at, s.visit_id, s.route, NULL, s.meta,
                'server_' || s.kind, s.message, s.stack, s.method, s.status, s.app_version,
                COALESCE(v.platform, 'Server'), v.user_agent, v.geo, a.email
           FROM server_error s
           LEFT JOIN visit v ON v.id = s.visit_id
           LEFT JOIN account a ON a.id = s.account_id
          WHERE s.fingerprint = $1
            AND ($2 OR NOT s.is_admin) AND ($3 OR NOT s.is_internal)
       ) o
       ORDER BY created_at DESC
       LIMIT ${RECENT}`,
      [fingerprint, includeAdmins, includeInternal, [...CLIENT_ERROR_TYPES]]
    );

    const occurrences = await Promise.all(
      rows.map(async (o) => {
        const trail = o.visit_id
          ? (
              await db.query(
                `SELECT type, path, target_id, created_at FROM site_event
                  WHERE visit_id = $1 AND created_at <= $2 AND id <> $3
                  ORDER BY created_at DESC LIMIT ${TRAIL}`,
                [o.visit_id, o.created_at, o.id]
              )
            ).rows.reverse()
          : [];
        const rawStack = o.source === 'client' ? o.meta?.stack : o.stack;
        const stack = o.source === 'client' ? await resolveStack(rawStack, o.version) : rawStack;
        return {
          ...o,
          message: o.message || o.meta?.message || null,
          stack: stack || null,
          resolved: Boolean(stack && rawStack && stack !== rawStack),
          trail,
        };
      })
    );
    res.json({ group, occurrences });
  } catch (err) {
    console.error('Site health: error detail failed:', err);
    res.status(500).json({ error: 'Could not load this error' });
  }
});

const STATUSES = new Set(['new', 'known', 'fixed']);

// Mark a group known / fixed (or back to new), with an optional note.
// "Fixed" records the running version; if it happens again it goes back
// to new and alerts again (utils/errors/errorGroups.js).
router.put('/errors/:fingerprint', async (req, res) => {
  const { status, note } = req.body || {};
  if (!STATUSES.has(status)) return res.status(400).json({ error: 'status must be new, known or fixed' });
  try {
    const { rows } = await db.query(
      `UPDATE error_group
          SET status = $2::varchar, status_changed_at = NOW(),
              fixed_in_version = CASE WHEN $2::varchar = 'fixed' THEN $3 ELSE fixed_in_version END,
              note = COALESCE($4, note)
        WHERE fingerprint = $1
        RETURNING *`,
      [req.params.fingerprint, status, getAppVersion(), typeof note === 'string' ? note.slice(0, 2000) : null]
    );
    if (!rows[0]) return res.status(404).json({ error: 'No such error' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Site health: status change failed:', err);
    res.status(500).json({ error: 'Could not update this error' });
  }
});

// Requests over 10 seconds, by API path.
router.get('/slow', async (req, res) => {
  try {
    const params = await filterParams(req, res);
    if (!params) return;
    const { rows } = await db.query(
      `SELECT e.target_id AS path, e.meta->>'method' AS method, COUNT(*)::int AS count,
              COUNT(DISTINCT e.device_id)::int AS visitors,
              ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY ${metaNum('duration_ms', 'e')}))::int AS median_ms,
              MAX(${metaNum('duration_ms', 'e')})::int AS max_ms,
              MAX(e.created_at) AS last_seen
         FROM site_event e JOIN visit v ON v.id = e.visit_id
        WHERE e.type = 'slow_request'
          AND ($1::timestamptz IS NULL OR e.created_at >= $1)
          AND ($2 OR NOT e.is_admin) AND ($3 OR NOT v.is_internal)
        GROUP BY e.target_id, e.meta->>'method'
        ORDER BY COUNT(*) DESC
        LIMIT 50`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Site health: slow requests failed:', err);
    res.status(500).json({ error: 'Could not load slow requests' });
  }
});

// First-page load speed by platform: median and slowest 10%.
router.get('/speed', async (req, res) => {
  try {
    const params = await filterParams(req, res);
    if (!params) return;
    const pct = (p, key) =>
      `ROUND(percentile_cont(${p}) WITHIN GROUP (ORDER BY ${metaNum(key, 'e')}))::int`;
    const { rows } = await db.query(
      `SELECT v.platform, COUNT(*)::int AS count,
              ${pct(0.5, 'lcp_ms')} AS lcp_median, ${pct(0.9, 'lcp_ms')} AS lcp_p90,
              ${pct(0.5, 'load_ms')} AS load_median, ${pct(0.9, 'load_ms')} AS load_p90,
              ${pct(0.5, 'ttfb_ms')} AS ttfb_median
         FROM site_event e JOIN visit v ON v.id = e.visit_id
        WHERE e.type = 'page_perf'
          AND ($1::timestamptz IS NULL OR e.created_at >= $1)
          AND ($2 OR NOT e.is_admin) AND ($3 OR NOT v.is_internal)
        GROUP BY v.platform
        ORDER BY COUNT(*) DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Site health: page speed failed:', err);
    res.status(500).json({ error: 'Could not load page speed' });
  }
});

module.exports = router;
