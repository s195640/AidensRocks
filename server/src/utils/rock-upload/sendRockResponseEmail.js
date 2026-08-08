const db = require('../../db/pool');
const sendEmail = require('../sendEmail');
const applyTemplateValues = require('../applyTemplateValues');
const buildRockImageTag = require('../buildRockImageTag');

const RESPONSE_EMAIL_SLUG = 'response-email';

// Fires the "Response Email" template (page_content row managed at
// /admin/pages, see routes/pagesAdmin.js) to a rock submitter after a
// successful /upload-rock, when they gave a real rock number and an email
// address (see uploadRock.js's call site for that gating) and the template
// is currently Active (page_content.visible for this row — see
// PagesAdmin.jsx's "Active" column).
//
// Uses the *published* body/subject, not draft: this runs unattended with
// no human reviewing each individual send, so it should only ever use
// content the admin deliberately published — draft is a work-in-progress
// state, only used by the admin's own manual "Send" test button.
//
// Independent of processImagesInBackground.js's journey-photo processing:
// {ROCK_IMAGE} is the rock's catalog reference photo (routes/rocks.js),
// not a photo from this upload, so there's nothing to wait on.
async function sendRockResponseEmail(rockNumber, email) {
  try {
    const { rows } = await db.query(
      `SELECT published_body, published_email_subject, visible
       FROM page_content
       WHERE page_slug = $1`,
      [RESPONSE_EMAIL_SLUG]
    );

    if (rows.length === 0 || !rows[0].visible) return;

    const { published_body, published_email_subject } = rows[0];

    const templateValues = {
      ROCK_NUMBER: rockNumber,
      ROCK_IMAGE: buildRockImageTag(rockNumber),
    };

    await sendEmail({
      to: email,
      subject: applyTemplateValues(published_email_subject, templateValues) || '(No subject)',
      html: applyTemplateValues(published_body, templateValues),
    });

    console.log(`✅ Sent response email to ${email} for rock ${rockNumber}`);
  } catch (err) {
    // Best-effort: a failure here shouldn't be visible to the submitter —
    // their upload already succeeded and got its own response.
    console.error(`❌ Failed to send response email for rock ${rockNumber}:`, err);
  }
}

module.exports = sendRockResponseEmail;
