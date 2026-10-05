// page_content rows for the account pages (Sign In / Create an Account /
// Reset Password), edited in Page Details' "Account Pages" table — see
// data/sql/migrations/add_account_pages.sql. Not public nav pages: their
// Title lives in the *_email_subject columns, their description in the body,
// and `visible` means "this page/feature is turned on". Client mirror:
// client/src/adminContent/accountPages.js.
const db = require('../db/pool');

const ACCOUNT_PAGE_SLUGS = new Set(['sign-in', 'create-account', 'reset-password']);

// Sign In can't be turned off.
const LOCKED_ON_PAGE_SLUGS = new Set(['sign-in']);

// True unless the page's row exists and is turned off (a missing row —
// migration not applied — leaves the feature on).
async function isAccountPageEnabled(slug) {
  const { rows } = await db.query('SELECT visible FROM page_content WHERE page_slug = $1', [slug]);
  return rows.length === 0 || rows[0].visible;
}

module.exports = { ACCOUNT_PAGE_SLUGS, LOCKED_ON_PAGE_SLUGS, isAccountPageEnabled };
