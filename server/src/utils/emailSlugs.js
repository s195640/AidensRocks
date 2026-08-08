// Slugs whose page_content row is an email template, not a real public
// page. For these rows the `visible` column doesn't mean "shown on the
// public site" — it's repurposed as an Active/Inactive switch (see
// routes/pagesAdmin.js and utils/rock-upload/sendRockResponseEmail.js).
// routes/pages.js (the public nav endpoint) excludes these slugs
// unconditionally, regardless of Active state, since they have no public
// route to link to. Client-side mirror:
// client/src/admin/pages/pages/emailSlugs.js.
const EMAIL_SLUGS = new Set(['response-email']);

module.exports = EMAIL_SLUGS;
