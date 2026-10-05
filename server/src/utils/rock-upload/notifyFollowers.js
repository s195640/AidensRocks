const db = require('../../db/pool');
const sendEmail = require('../sendEmail');
const { renderEmailTemplate } = require('../emailTemplates');
const { LEVELS, ARTIST_LINK_LEVELS } = require('../../middleware/requireAuth');

const FOLLOW_ROCKS_EMAIL_SLUG = 'follow-rocks-email';

// "2026-10-04" / a Date -> "October 4, 2026"; anything unparseable is used
// as-is.
function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Emails every account that follows `rockNumber` and has "email me when
// rocks I follow move" on — called once a new journey stop has finished
// processing and is visible. Content is the "Follow Rocks Email" template
// (page_content row managed at /admin/pages), *published* version only —
// same rule as sendRockResponseEmail.js, since this runs unattended. Its
// Active toggle (page_content.visible) turns these emails off entirely.
// One email per follower; a failure for one address doesn't stop the rest.
async function notifyFollowers(rockNumber, { location, date } = {}) {
  const rendered = await renderEmailTemplate(FOLLOW_ROCKS_EMAIL_SLUG, {
    ROCK_NUMBER: rockNumber,
    // uploadRock.js defaults a blank location to 'unknown'.
    LOCATION: location && location !== 'unknown' ? location : 'a new place',
    DATE: formatDate(date),
  });
  if (!rendered || !rendered.visible) return;

  // Followers = accounts following this rock, plus the Creator/Admin linked to
  // its artist (their own rocks always count as followed — see
  // utils/followedRocks.js).
  const { rows } = await db.query(
    `SELECT a.email
     FROM account a
     WHERE (
         a.id IN (SELECT account_id FROM account_follow WHERE rock_number = $1)
         OR (a.access_level IN (${ARTIST_LINK_LEVELS.join(', ')}) AND a.ra_key IN (
           SELECT al.ra_key FROM artist_link al
           JOIN catalog rc ON rc.rc_key = al.rc_key
           WHERE rc.rock_number = $1
         ))
       )
       AND a.notify_rock_moves = true
       AND a.is_locked = false
       AND a.access_level >= $2`,
    [rockNumber, LEVELS.USER]
  );
  if (rows.length === 0) return;

  for (const { email } of rows) {
    try {
      await sendEmail({ to: email, subject: rendered.subject, html: rendered.html });
    } catch (err) {
      console.error(`Rock-moved email to ${email} failed:`, err.message);
    }
  }
  console.log(`📬 Notified ${rows.length} follower(s) of rock ${rockNumber}`);
}

module.exports = notifyFollowers;
