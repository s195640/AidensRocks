// page_content rows for the public site's dialogs, edited in Page Details'
// "Dialogs" table — see data/sql/migrations/0.16-request-rock-dialog/. Not
// nav pages and always on: the body is the message under the dialog's
// heading, and each dialog's extra options live in the draft/published
// `settings` jsonb pair (draft until Publish, like the body). Client
// mirror: client/src/adminContent/dialogs.js.
const db = require('../db/pool');

const REQUEST_ROCK_SLUG = 'request-a-rock';

// The most rocks one request can ask for; an admin's limit can only lower it.
const MAX_ROCKS_CEILING = 100;

const DIALOG_SLUGS = new Set([REQUEST_ROCK_SLUG]);

// Validates a dialog's `settings` from PUT /api/admin/pages/:slug/draft.
// Returns { settings } with the cleaned object to store, or { error }.
function readDialogSettings(slug, settings) {
  if (!DIALOG_SLUGS.has(slug)) return { error: "Settings only apply to dialogs." };
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return { error: "'settings' must be an object." };
  }

  const { rocksNote = '', maxRocks = null } = settings;
  if (typeof rocksNote !== 'string') return { error: "'rocksNote' must be a string." };
  if (rocksNote.trim().length > 200) return { error: 'The # Rocks note must be 200 characters or fewer.' };

  // null / "" = no limit of your own (the ceiling still applies).
  let max = null;
  if (maxRocks !== null && maxRocks !== '') {
    max = Number(maxRocks);
    if (!Number.isInteger(max) || max < 1 || max > MAX_ROCKS_CEILING) {
      return { error: `Max rocks must be a whole number from 1 to ${MAX_ROCKS_CEILING}, or blank.` };
    }
  }

  return { settings: { rocksNote: rocksNote.trim(), maxRocks: max } };
}

// The published per-request rock limit for the Request A Rock form. A
// missing row or blank limit (or a DB error) falls back to the ceiling.
async function getMaxRocksPerRequest() {
  try {
    const { rows } = await db.query(
      'SELECT published_settings FROM page_content WHERE page_slug = $1',
      [REQUEST_ROCK_SLUG]
    );
    const max = rows[0]?.published_settings?.maxRocks;
    return Number.isInteger(max) && max >= 1 && max <= MAX_ROCKS_CEILING ? max : MAX_ROCKS_CEILING;
  } catch (err) {
    console.error('Error reading the Request A Rock limit:', err);
    return MAX_ROCKS_CEILING;
  }
}

module.exports = {
  DIALOG_SLUGS,
  REQUEST_ROCK_SLUG,
  MAX_ROCKS_CEILING,
  readDialogSettings,
  getMaxRocksPerRequest,
};
