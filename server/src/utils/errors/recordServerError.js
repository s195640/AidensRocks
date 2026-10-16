// Records a server-side error in server_error and its error_group (which may
// send the new-error email). Never throws, and never logs through the
// wrapped console.error, so a failure here can't loop.
//
//   kind   request (a 5xx response) | background (photo processing)
//        | email (a send failed) | process (unhandled rejection)
//   req    the Express request, when there is one: gives the route, the
//          visitor's visit (X-Visit-Id), account and internal flag
//   alert  false for errors that already email someone (upload failures)
const { randomUUID } = require('crypto');
const db = require('../../db/pool');
const getAppVersion = require('../getAppVersion');
const { platformFromUserAgent } = require('../platformFromUserAgent');
const { isInternalRequest } = require('../activity/requestInfo');
const { LEVELS } = require('../../middleware/requireAuth');
const { forServerError, pathPattern } = require('./fingerprint');
const { noteError } = require('./errorGroups');
const { logError } = require('./log');

// Marks an Error once it's been recorded, so errorCapture doesn't record the
// same failure again as the request's 5xx.
const RECORDED = Symbol('recordedServerError');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Express's route pattern (/api/rock-posts/:rockNumber), so the same failing
// route groups together whatever the URL; the URL as a pattern otherwise.
function routeOf(req) {
  if (req.route?.path) return `${req.baseUrl || ''}${req.route.path}`.slice(0, 300);
  return pathPattern(req.originalUrl || req.url || '');
}

async function recordServerError(err, { kind = 'request', req = null, status = null, meta = null, alert = true } = {}) {
  try {
    if (err && typeof err === 'object') {
      if (err[RECORDED]) return;
      err[RECORDED] = true;
    }
    const message = String(err?.message ?? err ?? 'Unknown error').slice(0, 2000);
    const stack = typeof err?.stack === 'string' ? err.stack.slice(0, 8000) : null;
    const method = req?.method || null;
    const route = req ? routeOf(req) : null;
    const visitHeader = req?.get?.('x-visit-id');
    const visitId = UUID_RE.test(visitHeader || '') ? visitHeader : null;
    const isInternal = req ? isInternalRequest(req) : false;
    const isAdmin = (req?.account?.access_level ?? 0) >= LEVELS.ADMIN;
    const version = getAppVersion();
    const { fingerprint, title } = forServerError({ kind, method, route, status, message, stack });

    await db.query(
      `INSERT INTO server_error (id, kind, visit_id, account_id, is_admin, is_internal, method, route,
                                 status, message, stack, fingerprint, app_version, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        randomUUID(), kind, visitId, req?.account?.id ?? null, isAdmin, isInternal, method, route,
        status, message, stack, fingerprint, version, meta ? JSON.stringify(meta) : null,
      ]
    );
    await noteError({
      fingerprint,
      source: 'server',
      type: `server_${kind}`,
      title,
      alert: alert && !isInternal,
      context: {
        page: route || kind,
        platform: req ? platformFromUserAgent(req.get('user-agent')) : 'server',
        version,
      },
    });
  } catch (recordErr) {
    logError('Error tracking: could not record a server error:', recordErr.message);
  }
}

module.exports = recordServerError;
module.exports.RECORDED = RECORDED;
