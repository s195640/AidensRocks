// Shared rendering for every email-template page_content row (see
// emailSlugs.js). One place turns raw values into {PLACEHOLDER}
// substitutions, so the automated senders, Page Details' test "Send", and
// its live Preview (POST /api/admin/pages/:slug/render) all produce exactly
// the same email.
const db = require('../db/pool');
const applyTemplateValues = require('./applyTemplateValues');
const buildRockImageTag = require('./buildRockImageTag');
const buildRockImagesTag = require('./buildRockImagesTag');
const buildRockNumbersWithLinksTag = require('./buildRockNumbersWithLinksTag');
const buildRockJourneyLinkTag = require('./buildRockJourneyLinkTag');
const escapeHtml = require('./escapeHtml');
const siteUrl = require('./siteUrl');
const { parseSender } = require('./emailAddress');
const { getContactEmail } = require('./siteSettings');

// Notifications sent to the family, not to a visitor. These have a Send To
// in Page Details; every other template goes to the visitor it's about.
const ADMIN_RECIPIENT_SLUGS = new Set([
  'new-rock-request-email',
  'new-journey-email',
  'upload-files-failed-email',
  'upload-processing-failed-email',
]);

// Always sent; their Active switch is locked on in Page Details. Sign-up
// and password reset can't work without the first two, and a failed rock
// upload always needs a human to look at it.
const REQUIRED_EMAIL_SLUGS = new Set([
  'account-verify-email',
  'password-reset-email',
  'upload-files-failed-email',
  'upload-processing-failed-email',
]);

// Token-link placeholders: slug -> [placeholder, route, link text]. The
// raw TOKEN value is never substituted directly. Previews/test sends have
// no real token, so they get an obviously fake one.
const TOKEN_LINKS = {
  'account-verify-email': ['VERIFY_LINK', '/verify-email', 'Verify my email'],
  'password-reset-email': ['RESET_LINK', '/reset-password', 'Reset my password'],
};

// FAILED_FILES for 'upload-files-failed-email': the real sender passes
// [{ name, error }]; Page Details' Preview/test Send passes a single-line
// string, "name: error" entries separated by ";".
const failedFileLines = (value) =>
  Array.isArray(value)
    ? value.map((f) => `${f?.name ?? ''}: ${f?.error ?? ''}`)
    : String(value ?? '')
        .split(/;|\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

const parseRockNumbers = (value) =>
  String(value ?? '')
    .split(/[,\s]+/)
    .map((n) => parseInt(n, 10))
    .filter((n) => n > 0);

// raw: plain values ({ ROCK_NUMBER: 7, LOCATION: 'Zion', TOKEN: '...' }).
// For the body every plain value is HTML-escaped (newlines -> <br/>); the
// subject is plain text, so there (forSubject) they go in as-is. HTML-
// producing placeholders are only ever derived here, never taken from the
// caller.
// contactEmail: the `contact-email` setting, for {CONTACT_EMAIL} (any
// template). It's never taken from `raw`.
function buildTemplateValues(slug, raw = {}, { forSubject = false, contactEmail = null } = {}) {
  const values = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      key === 'TOKEN' ||
      key === 'FAILED_FILES' ||
      key === 'CONTACT_EMAIL' ||
      value === undefined ||
      value === null
    ) {
      continue;
    }
    values[key] = forSubject
      ? String(value).replace(/\s*\r?\n\s*/g, ' ')
      : escapeHtml(value).replace(/\r?\n/g, '<br/>');
  }

  if (raw.ROCK_NUMBER !== undefined) {
    const rockNumber = parseInt(raw.ROCK_NUMBER, 10);
    if (rockNumber > 0) {
      values.ROCK_NUMBER = rockNumber;
      values.ROCK_IMAGE = buildRockImageTag(rockNumber);
      values.ROCK_JOURNEY_LINK = buildRockJourneyLinkTag(rockNumber);
    } else {
      values.ROCK_IMAGE = '';
      values.ROCK_JOURNEY_LINK = '';
    }
  }

  // "Response Email Multi" takes a raw comma/space-separated list; other
  // templates (e.g. the rock request reply) just show ROCK_NUMBERS as text.
  if (slug === 'response-email-multi' && raw.ROCK_NUMBERS !== undefined) {
    const rockNumbers = parseRockNumbers(raw.ROCK_NUMBERS);
    if (rockNumbers.length > 0) {
      values.ROCK_NUMBERS = rockNumbers.join(', ');
      values.ROCK_IMAGES = buildRockImagesTag(rockNumbers);
      values.ROCK_NUMBERS_WITH_LINKS = buildRockNumbersWithLinksTag(rockNumbers);
    }
  }

  if (raw.FAILED_FILES !== undefined) {
    const lines = failedFileLines(raw.FAILED_FILES);
    values.FAILED_FILES = forSubject
      ? lines.join(', ')
      : `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`;
  }

  const tokenLink = TOKEN_LINKS[slug];
  if (tokenLink) {
    const [key, route, text] = tokenLink;
    const token = raw.TOKEN || 'example-token';
    const href = siteUrl(`${route}?token=${encodeURIComponent(token)}`);
    values[key] = `<a href="${href}">${text}</a>`;
  }

  // Left as a literal "{CONTACT_EMAIL}" if the setting is missing, so the
  // gap is obvious instead of silently blank.
  if (contactEmail) {
    const safe = escapeHtml(contactEmail);
    values.CONTACT_EMAIL = forSubject ? contactEmail : `<a href="mailto:${safe}">${safe}</a>`;
  }

  return values;
}

// The Sender / Reply-To / Send To an admin sets per template in Page
// Details (page_content.{draft,published}_email_{from,reply_to,to}). A
// blank Sender/Reply-To falls back to EMAIL_FROM / EMAIL_REPLY_TO in
// sendEmail.js. Send To only applies to ADMIN_RECIPIENT_SLUGS (everything
// else goes to the visitor it's about); blank falls back to the template's
// own Sender address, which the domain forwards to the family's inbox.
function templateAddresses(slug, row) {
  const from = row.email_from || null;
  const replyTo = row.email_reply_to || null;
  let to = null;
  if (ADMIN_RECIPIENT_SLUGS.has(slug)) {
    to = row.email_to || parseSender(from)?.address || null;
  }
  return { from, replyTo, to };
}

const addressColumns = (version) => {
  const v = version === 'draft' ? 'draft' : 'published';
  return `${v}_email_from AS email_from, ${v}_email_reply_to AS email_reply_to, ${v}_email_to AS email_to`;
};

// Just a template's addresses, for the freeform senders that use a
// "default" template only to pre-fill (Rock Requests → Send Email, the Send
// Email job). Returns { from, replyTo, to }, all null if the row is missing.
async function getTemplateAddresses(slug, { version = 'published' } = {}) {
  const { rows } = await db.query(
    `SELECT ${addressColumns(version)} FROM page_content WHERE page_slug = $1`,
    [slug]
  );
  return rows.length ? templateAddresses(slug, rows[0]) : { from: null, replyTo: null, to: null };
}

// Loads the template row and fills it in. version 'published' is for real
// sends (unattended, so only deliberately published content); 'draft' is
// for Page Details' preview and test send. Returns null if the row doesn't
// exist (migration not applied yet). Also returns the template's
// { from, replyTo, to } (see templateAddresses) for the caller to pass to
// sendEmail.
async function renderEmailTemplate(slug, raw = {}, { version = 'published' } = {}) {
  const bodyCol = version === 'draft' ? 'draft_body' : 'published_body';
  const subjectCol = version === 'draft' ? 'draft_email_subject' : 'published_email_subject';
  const { rows } = await db.query(
    `SELECT ${bodyCol} AS body, ${subjectCol} AS subject, visible, ${addressColumns(version)}
     FROM page_content WHERE page_slug = $1`,
    [slug]
  );
  if (rows.length === 0) return null;

  const contactEmail = await getContactEmail();
  return {
    subject:
      applyTemplateValues(
        rows[0].subject,
        buildTemplateValues(slug, raw, { forSubject: true, contactEmail })
      ) || '(No subject)',
    html: applyTemplateValues(rows[0].body, buildTemplateValues(slug, raw, { contactEmail })) || '',
    visible: rows[0].visible,
    ...templateAddresses(slug, rows[0]),
  };
}

module.exports = {
  renderEmailTemplate,
  buildTemplateValues,
  getTemplateAddresses,
  REQUIRED_EMAIL_SLUGS,
  ADMIN_RECIPIENT_SLUGS,
};
