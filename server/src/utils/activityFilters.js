// The admin activity / Site Health filters, shared by
// routes/activityAdmin.js and routes/siteHealthAdmin.js: the dashboard
// range (7 / 30 / 90 / This year / All, in the viewer's timezone) plus
// includeAdmins / includeInternal (both off by default).
const db = require('../db/pool');
const { parseRange } = require('./statsRange');

const flag = (v) => v === '1' || v === 'true';

// -> { params: [$1 start timestamptz|null, $2 includeAdmins, $3 includeInternal, $4 tz],
//      tz, today, startDay } or null after sending a 400.
async function activityFilters(req, res) {
  const parsed = parseRange(req.query);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return null;
  }
  let start = null;
  if (parsed.start) {
    // Local midnight in `tz`, as a timestamptz, so created_at indexes work.
    const { rows } = await db.query(`SELECT ($1::date::timestamp AT TIME ZONE $2) AS start`, [parsed.start, parsed.tz]);
    start = rows[0].start;
  }
  return {
    params: [start, flag(req.query.includeAdmins), flag(req.query.includeInternal), parsed.tz],
    tz: parsed.tz,
    today: parsed.today,
    startDay: parsed.start,
  };
}

// Events matching the filters, with their visit's platform, returning flag
// and start time. Use as a CTE:
// `WITH ${EVENTS} SELECT ... FROM ev ...` with activityFilters' params.
const EVENTS = `ev AS (
  SELECT e.*, v.platform, v.is_returning, v.started_at
    FROM site_event e JOIN visit v ON v.id = e.visit_id
   WHERE ($1::timestamptz IS NULL OR e.created_at >= $1)
     AND ($2 OR NOT e.is_admin) AND ($3 OR NOT v.is_internal))`;

// "YYYY-MM-DD" of a timestamptz column in the viewer's timezone ($4).
const dayOf = (col) => `to_char((${col} AT TIME ZONE $4)::date, 'YYYY-MM-DD')`;

// A meta value as a number / boolean, or NULL if it isn't one. Event meta
// comes from the public /api/activity, so a plain ::numeric cast would let
// one malformed event (engaged_ms: "x") make a panel fail for every range
// that includes it. `alias` is the table alias ("e", "ev") when needed.
const metaCol = (alias) => (alias ? `${alias}.meta` : 'meta');
const metaNum = (key, alias) =>
  `(CASE WHEN jsonb_typeof(${metaCol(alias)}->'${key}') = 'number' THEN (${metaCol(alias)}->>'${key}')::numeric END)`;
const metaBool = (key, alias) =>
  `(CASE WHEN jsonb_typeof(${metaCol(alias)}->'${key}') = 'boolean' THEN (${metaCol(alias)}->>'${key}')::boolean END)`;

module.exports = { activityFilters, EVENTS, dayOf, metaNum, metaBool };
