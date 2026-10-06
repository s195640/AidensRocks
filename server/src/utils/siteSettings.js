// Site-wide values kept in the `setting` table (never hard-coded), e.g. the
// visitor-facing contact email. PUBLIC_SETTINGS is the allow-list that
// GET /api/site-settings exposes to anyone (routes/siteSettings.js); every
// other setting row stays admin-only.
const db = require('../db/pool');

const CONTACT_EMAIL_SETTING = 'contact-email';

// setting name -> key in the public JSON
const PUBLIC_SETTINGS = {
  [CONTACT_EMAIL_SETTING]: 'contactEmail',
};

async function getSettingValue(name) {
  const { rows } = await db.query('SELECT value FROM setting WHERE name = $1', [name]);
  return rows.length ? rows[0].value : null;
}

// The contact email as a string, or null if it was never set.
async function getContactEmail() {
  const value = await getSettingValue(CONTACT_EMAIL_SETTING);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

module.exports = { CONTACT_EMAIL_SETTING, PUBLIC_SETTINGS, getSettingValue, getContactEmail };
