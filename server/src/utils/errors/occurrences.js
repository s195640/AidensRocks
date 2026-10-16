// Every error occurrence, browser (site_event) and server (server_error),
// as one row set -- the single definition used by Site Health
// (routes/siteHealthAdmin.js), the daily summary (errorEmails.js) and the
// Dashboard's "new errors" count (routes/activityAdmin.js glance).
//
// The filters are SQL expressions, by default the shared filter params:
// start ($1, timestamptz or NULL), admins ($2, include admins), internal
// ($3, include internal traffic). Columns: fp, created_at, who (the
// visitor's device; a server error with no visit counts as its own), page,
// platform, version.
//
// Only the error event types count: a fingerprint on any other event (which
// a browser could forge) is ignored.
const { CLIENT_ERROR_TYPES } = require('./fingerprint');

const ERROR_TYPES_SQL = [...CLIENT_ERROR_TYPES].map((t) => `'${t}'`).join(', ');

function occurrencesSql({ start = '$1', admins = '$2', internal = '$3' } = {}) {
  return `
  SELECT e.meta->>'fingerprint' AS fp, e.created_at, e.device_id::text AS who, e.path AS page,
         v.platform, COALESCE(e.meta->>'app_version', v.client_version) AS version
    FROM site_event e JOIN visit v ON v.id = e.visit_id
   WHERE e.type IN (${ERROR_TYPES_SQL}) AND e.meta ? 'fingerprint'
     AND (${start}::timestamptz IS NULL OR e.created_at >= ${start}::timestamptz)
     AND (${admins} OR NOT e.is_admin) AND (${internal} OR NOT v.is_internal)
  UNION ALL
  SELECT s.fingerprint, s.created_at, COALESCE(v.device_id::text, s.visit_id::text, s.id::text), s.route,
         COALESCE(v.platform, 'Server'), s.app_version
    FROM server_error s LEFT JOIN visit v ON v.id = s.visit_id
   WHERE (${start}::timestamptz IS NULL OR s.created_at >= ${start}::timestamptz)
     AND (${admins} OR NOT s.is_admin) AND (${internal} OR NOT s.is_internal)`;
}

// Error kinds still marked New that a real visitor (not internal traffic)
// has hit at least once. No params.
const NEW_ERRORS_SQL = `
  SELECT COUNT(*)::int AS new_errors FROM error_group g
   WHERE g.status = 'new'
     AND EXISTS (SELECT 1 FROM (${occurrencesSql({ start: 'NULL', admins: 'TRUE', internal: 'FALSE' })}) o
                  WHERE o.fp = g.fingerprint)`;

module.exports = { occurrencesSql, NEW_ERRORS_SQL };
