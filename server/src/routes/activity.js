// POST /api/activity -- the site-wide activity log (Site Tracking feature).
// The browser (client/src/utils/activity.js) sends batches of
// { visit: {...}, events: [...] }; the visit row is created on first sight
// and every event is one site_event row. See
// data/ai-build-docs/site-tracking/site-tracking-feature-plan.md.
//
// Named "activity", not "track": ad blockers block URLs containing "track".
//
// Never in a visitor's way: it answers 204 as soon as the batch is
// validated and does the insert after responding, so a slow or failing
// database can't hold anything up. Bots are answered 204 and dropped.
const express = require('express');
const db = require('../db/pool');
const safeRollback = require('../utils/db/safeRollback');
const { optionalAuth, LEVELS } = require('../middleware/requireAuth');
const { activityLimiter } = require('../middleware/publicFormLimiter');
const { platformFromUserAgent } = require('../utils/platformFromUserAgent');
const { clientIp, isInternalRequest, geoFor, isBotUserAgent } = require('../utils/activity/requestInfo');
const { forClientEvent, CLIENT_ERROR_TYPES } = require('../utils/errors/fingerprint');
const { noteError } = require('../utils/errors/errorGroups');

const router = express.Router();

// Event types the site sends. Adding a type is an entry here plus the
// client code that sends it; no schema change.
const EVENT_TYPES = new Set([
  'page_view',
  'page_leave',
  'page_perf',
  'client_error',
  'load_error',
  'outbound_click',
  'contact_open',
  'qr_scan',
  'not_found',
  // Error tracking (phase 2)
  'render_crash',
  'error_shown',
  'media_error',
  'map_tile_error',
  'slow_request',
  // Phase 3: what visitors do
  'player_close',
  'song_play',
  'song_stop',
  'entry_view',
  'rock_view',
  'rock_close',
  'journey_location',
  'journey_comment',
  'journey_photo_view',
  'map_pin',
  'rock_search',
  'rock_link',
  'album_open',
  'album_close',
  'photo_view',
  'form_open',
  'form_start',
  'form_submit',
  'form_error',
  'form_close',
  'follow',
  'unfollow',
  'follow_notify',
  'my_rocks_search',
  'sign_up',
  'sign_in',
  'sign_out',
]);

const MAX_EVENTS = 50;
const MAX_META_CHARS = 4000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);
const str = (v, max) => (typeof v === 'string' && v !== '' ? v.slice(0, max) : null);

// Over-large or non-object meta is replaced rather than stored, so one
// buggy event can't bloat the table.
function cleanMeta(meta) {
  if (meta == null) return null;
  if (typeof meta !== 'object' || Array.isArray(meta)) return { invalid: true };
  const json = JSON.stringify(meta);
  return json.length > MAX_META_CHARS ? { truncated: true } : meta;
}

function cleanEvent(e) {
  if (!e || !isUuid(e.id) || !EVENT_TYPES.has(e.type)) return null;
  const event = {
    id: e.id,
    type: e.type,
    path: str(e.path, 2048),
    target_id: e.targetId == null ? null : str(String(e.targetId), 200),
    meta: cleanMeta(e.meta),
  };
  // Error events are grouped here; the browser's own fingerprint (if any)
  // is replaced, never trusted, and other events can't carry one.
  if (event.meta && 'fingerprint' in event.meta) {
    const { fingerprint, ...rest } = event.meta;
    event.meta = rest;
  }
  if (CLIENT_ERROR_TYPES.has(event.type)) {
    const group = forClientEvent(event);
    event.meta = { ...(event.meta || {}), fingerprint: group.fingerprint };
    event.group = group;
  }
  return event;
}

async function saveBatch({ visit, events, req }) {
  const ua = req.get('user-agent') || null;
  const ip = clientIp(req);
  const account = req.account;
  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO visit (id, device_id, landing_path, referrer, ip_address, geo, user_agent,
                          platform, screen, language, timezone, client_version, is_returning, is_internal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO NOTHING`,
      [
        visit.id,
        visit.deviceId,
        str(visit.landingPath, 2048),
        str(visit.referrer, 2048),
        ip.slice(0, 45) || null,
        JSON.stringify(geoFor(ip)),
        ua,
        platformFromUserAgent(ua),
        str(visit.screen, 50),
        str(visit.language, 50),
        str(visit.timezone, 100),
        str(visit.clientVersion, 50),
        visit.isReturning === true,
        isInternalRequest(req, ip),
      ]
    );
    await client.query(
      `INSERT INTO site_event (id, visit_id, device_id, type, path, target_id, meta, account_id, is_admin)
       SELECT e.id, $1, $2, e.type, e.path, e.target_id, e.meta, $3, $4
         FROM jsonb_to_recordset($5::jsonb)
              AS e(id uuid, type varchar, path varchar, target_id varchar, meta jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [
        visit.id,
        visit.deviceId,
        account?.id ?? null,
        (account?.access_level ?? 0) >= LEVELS.ADMIN,
        JSON.stringify(events.map(({ group, ...e }) => e)),
      ]
    );
    await client.query('COMMIT');
    noteErrorGroups(events, { req, ua, visit });
  } catch (err) {
    await safeRollback(client);
    console.error('Activity insert failed:', err.message);
  } finally {
    if (client) client.release();
  }
}

// One error_group update per distinct error in the batch (may send the
// new-error email). Internal traffic is grouped but never alerts.
function noteErrorGroups(events, { req, ua, visit }) {
  const seen = new Set();
  const isInternal = isInternalRequest(req);
  for (const e of events) {
    if (!e.group || seen.has(e.group.fingerprint)) continue;
    seen.add(e.group.fingerprint);
    noteError({
      ...e.group,
      source: 'client',
      type: e.type,
      alert: !isInternal,
      context: {
        page: e.path,
        platform: platformFromUserAgent(ua),
        version: e.meta?.app_version || str(visit.clientVersion, 50),
      },
    });
  }
}

// Sends made while a page unloads come by navigator.sendBeacon (see
// client/src/utils/activity.js): a text/plain JSON body, with the sign-in
// token in "auth" because a beacon can't set an Authorization header.
// Normal sends are application/json with the header, as before.
const textParser = express.text({ type: 'text/plain', limit: '200kb' });
const beaconBody = [
  // A body the parser rejects (too large, bad charset) is the sender's
  // problem: answer it here instead of letting it become a 500 that error
  // tracking would record and alert on.
  (req, res, next) => textParser(req, res, (err) => (err ? res.status(err.status || 400).end() : next())),
  (req, res, next) => {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        return res.status(400).json({ error: 'Invalid activity batch' });
      }
    }
    const auth = req.body?.auth;
    if (auth !== undefined) {
      if (typeof auth === 'string' && !req.headers.authorization) req.headers.authorization = `Bearer ${auth}`;
      delete req.body.auth;
    }
    next();
  },
];

router.post('/', beaconBody, activityLimiter, optionalAuth, (req, res) => {
  const { visit, events } = req.body || {};
  if (!visit || !isUuid(visit.id) || !isUuid(visit.deviceId) || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid activity batch' });
  }
  if (events.length > MAX_EVENTS) {
    return res.status(413).json({ error: `At most ${MAX_EVENTS} events per batch` });
  }

  res.status(204).end();

  if (isBotUserAgent(req.get('user-agent'))) return;
  const clean = events.map(cleanEvent).filter(Boolean);
  if (clean.length === 0) return;
  saveBatch({ visit, events: clean, req });
});

module.exports = router;
