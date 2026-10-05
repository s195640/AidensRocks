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

// Sign-up and password reset can't work without these, so they always send
// (their Active switch is locked on in Page Details).
const REQUIRED_EMAIL_SLUGS = new Set(['account-verify-email', 'password-reset-email']);

// Token-link placeholders: slug -> [placeholder, route, link text]. The
// raw TOKEN value is never substituted directly. Previews/test sends have
// no real token, so they get an obviously fake one.
const TOKEN_LINKS = {
  'account-verify-email': ['VERIFY_LINK', '/verify-email', 'Verify my email'],
  'password-reset-email': ['RESET_LINK', '/reset-password', 'Reset my password'],
};

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
function buildTemplateValues(slug, raw = {}, { forSubject = false } = {}) {
  const values = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'TOKEN' || value === undefined || value === null) continue;
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

  const tokenLink = TOKEN_LINKS[slug];
  if (tokenLink) {
    const [key, route, text] = tokenLink;
    const token = raw.TOKEN || 'example-token';
    const href = siteUrl(`${route}?token=${encodeURIComponent(token)}`);
    values[key] = `<a href="${href}">${text}</a>`;
  }

  return values;
}

// Loads the template row and fills it in. version 'published' is for real
// sends (unattended, so only deliberately published content); 'draft' is
// for Page Details' preview and test send. Returns null if the row doesn't
// exist (migration not applied yet).
async function renderEmailTemplate(slug, raw = {}, { version = 'published' } = {}) {
  const bodyCol = version === 'draft' ? 'draft_body' : 'published_body';
  const subjectCol = version === 'draft' ? 'draft_email_subject' : 'published_email_subject';
  const { rows } = await db.query(
    `SELECT ${bodyCol} AS body, ${subjectCol} AS subject, visible
     FROM page_content WHERE page_slug = $1`,
    [slug]
  );
  if (rows.length === 0) return null;

  return {
    subject:
      applyTemplateValues(rows[0].subject, buildTemplateValues(slug, raw, { forSubject: true })) ||
      '(No subject)',
    html: applyTemplateValues(rows[0].body, buildTemplateValues(slug, raw)) || '',
    visible: rows[0].visible,
  };
}

module.exports = { renderEmailTemplate, buildTemplateValues, REQUIRED_EMAIL_SLUGS };
