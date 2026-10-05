const jwt = require('jsonwebtoken');
const db = require('../db/pool');

// Access levels (account.access_level). "Locked" (40 in the admin UI) is the
// separate account.is_locked flag, not a stored level.
const LEVELS = {
  UNVERIFIED: 10,
  USER: 20,
  CREATOR: 30,
  ADMIN: 50,
};

// Records "last active" (account.last_seen_dt, shown on admin Accounts) on
// any authenticated request — the client calls /api/auth/me on every page
// load, plus Follow Rocks / map etc. Throttled in SQL to one write per
// account per 5 minutes, and fire-and-forget so it never slows or fails
// the request.
function touchLastSeen(accountId) {
  db.query(
    `UPDATE account SET last_seen_dt = NOW()
     WHERE id = $1
       AND (last_seen_dt IS NULL OR last_seen_dt < NOW() - INTERVAL '5 minutes')`,
    [accountId]
  ).catch((err) => console.error('last_seen_dt update failed:', err.message));
}

// Resolves the Bearer token to a live account row, or null. The account is
// re-read from the DB on every request so an admin's lock/level change takes
// effect immediately rather than when the JWT expires.
async function loadAccount(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
  if (!payload?.sub) return null;

  const { rows } = await db.query(
    `SELECT id, email, first_name, last_name, access_level, is_locked, notify_rock_moves,
            token_version
     FROM account WHERE id = $1`,
    [payload.sub]
  );
  const account = rows[0];
  if (!account || account.is_locked) return null;
  // Signed in before the last password reset / lock → no longer valid.
  // (Tokens from before token_version existed have no `ver`; treat as 0.)
  if ((payload.ver ?? 0) !== account.token_version) return null;
  touchLastSeen(account.id);
  return account;
}

// Gates a route behind a signed-in, unlocked account with at least
// `minLevel`. 401 = not signed in (the client signs out); 403 = signed in
// but not allowed (the client stays signed in).
function requireAuth(minLevel = LEVELS.USER) {
  return async function (req, res, next) {
    try {
      const account = await loadAccount(req);
      if (!account) return res.status(401).json({ error: 'Unauthorized' });
      if (account.access_level < minLevel) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.account = account;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Sets req.account when a valid token is present; never rejects. For public
// routes with optional signed-in extras (e.g. "only rocks I follow").
async function optionalAuth(req, res, next) {
  try {
    req.account = await loadAccount(req);
  } catch (err) {
    console.error('optionalAuth failed:', err);
    req.account = null;
  }
  next();
}

// Levels allowed a linked artist (account.ra_key): Creators and Admins.
const ARTIST_LINK_LEVELS = [LEVELS.CREATOR, LEVELS.ADMIN];

module.exports = { requireAuth, optionalAuth, LEVELS, ARTIST_LINK_LEVELS };
