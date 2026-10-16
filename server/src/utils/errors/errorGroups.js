// error_group bookkeeping: every recorded error (browser or server) passes
// through noteError, which creates its group the first time and reopens a
// group marked "fixed" that happens again on a version at or after the fix.
// It sends the new-error email for a New group that hasn't been alerted
// since it became New -- at most once per group per 24 hours. Never throws.
//
// The alert is decided per occurrence, not by the group's first one: a group
// first seen on internal traffic (no alert) or from an upload failure
// (alert: false) still alerts when a real visitor hits it later.
const db = require('../../db/pool');
const { logError } = require('./log');
const { sendNewErrorEmail } = require('./errorEmails');

// "0.15.16" -> [0, 15, 16]; null for anything else ("unknown", missing).
const parseVersion = (v) => (/^\d+(\.\d+)*$/.test(v || '') ? v.split('.').map(Number) : null);

// a < b, for parsed versions.
function olderThan(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) return x < y;
  }
  return false;
}

// g: { fingerprint, source, type, title, alert, context: { page, platform, version } }
async function noteError(g) {
  try {
    await db.query(
      `INSERT INTO error_group (fingerprint, source, type, title, status_changed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (fingerprint) DO NOTHING`,
      [g.fingerprint, g.source, g.type, String(g.title).slice(0, 500)]
    );

    // Reopen a Fixed group -- unless this occurrence came from a version older
    // than the fix (a tab left open since before the deploy).
    const { rows } = await db.query('SELECT status, fixed_in_version FROM error_group WHERE fingerprint = $1', [
      g.fingerprint,
    ]);
    const group = rows[0];
    if (!group) return;
    if (group.status === 'fixed') {
      const seen = parseVersion(g.context?.version);
      const fixed = parseVersion(group.fixed_in_version);
      if (seen && fixed && olderThan(seen, fixed)) return;
      await db.query(
        `UPDATE error_group SET status = 'new', status_changed_at = NOW()
         WHERE fingerprint = $1 AND status = 'fixed'`,
        [g.fingerprint]
      );
    } else if (group.status !== 'new') {
      return; // Known: you've seen it, no alerts
    }
    if (!g.alert) return;

    // Claim the alert first, so two errors arriving together send one email:
    // a New group not alerted since it became New, at most once a day.
    const claimed = await db.query(
      `UPDATE error_group SET last_alerted_at = NOW()
       WHERE fingerprint = $1 AND status = 'new'
         AND (last_alerted_at IS NULL
              OR (last_alerted_at < status_changed_at AND last_alerted_at < NOW() - INTERVAL '24 hours'))
       RETURNING fingerprint`,
      [g.fingerprint]
    );
    if (claimed.rowCount > 0) await sendNewErrorEmail(g);
  } catch (err) {
    logError('Error tracking: could not update error_group:', err.message);
  }
}

module.exports = { noteError, parseVersion, olderThan };
