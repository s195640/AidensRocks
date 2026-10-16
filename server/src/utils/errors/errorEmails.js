// The two error alert emails (Page Details templates "New Site Error (to
// admin)" and "Daily Error Summary (to admin)"). Their Active switch turns
// them off; Send To / Sender come from the template like the upload failure
// emails, with ADMIN_ALERT_EMAIL as a last resort.
//
// A failed alert send is logged, never recorded as another error (that
// could loop), so these call sendEmail with trackFailure: false.
const db = require('../../db/pool');
const sendEmail = require('../sendEmail');
const { renderEmailTemplate } = require('../emailTemplates');
const { logError } = require('./log');
const { occurrencesSql, NEW_ERRORS_SQL } = require('./occurrences');

async function sendRendered(rendered) {
  if (!rendered || !rendered.visible) return false;
  const to = rendered.to || process.env.ADMIN_ALERT_EMAIL || null;
  if (!to) {
    logError(`Error tracking: no Send To for "${rendered.subject}" (set it in Page Details); not sent.`);
    return false;
  }
  await sendEmail({
    to,
    from: rendered.from,
    replyTo: rendered.replyTo,
    subject: rendered.subject,
    html: rendered.html,
    trackFailure: false,
  });
  return true;
}

async function sendNewErrorEmail(g) {
  try {
    const rendered = await renderEmailTemplate('error-new-email', {
      TITLE: g.title,
      TYPE: g.type,
      PAGE: g.context?.page || 'unknown',
      PLATFORM: g.context?.platform || 'unknown',
      VERSION: g.context?.version || 'unknown',
    });
    await sendRendered(rendered);
  } catch (err) {
    logError('Error tracking: new-error email failed:', err.message);
  }
}

const SUMMARY_LIMIT = 25;

// Every error group seen in the last 24 hours (internal traffic left out),
// new ones first; stillNew counts only kinds a real visitor has hit.
// Returns { rows, total, groups, stillNew }.
async function summaryFor(hours = 24) {
  // The same occurrences as Site Health: admins included, internal left out.
  const { rows } = await db.query(
    `WITH occ AS (${occurrencesSql({ start: '(NOW() - make_interval(hours => $1))', admins: 'TRUE', internal: 'FALSE' })})
     SELECT g.fingerprint, g.title, g.status, g.source,
            COUNT(*)::int AS count, COUNT(DISTINCT occ.who)::int AS visitors
       FROM occ JOIN error_group g ON g.fingerprint = occ.fp
      GROUP BY g.fingerprint
      ORDER BY (g.status = 'new') DESC, COUNT(*) DESC`,
    [hours]
  );
  const { rows: [{ new_errors: stillNew }] } = await db.query(NEW_ERRORS_SQL);
  return {
    rows: rows.slice(0, SUMMARY_LIMIT),
    total: rows.reduce((sum, r) => sum + r.count, 0),
    groups: rows.length,
    stillNew,
  };
}

// Sends the daily summary if there were any errors. Returns whether it sent.
async function sendDailySummary() {
  const summary = await summaryFor(24);
  if (summary.total === 0) return false;
  const rendered = await renderEmailTemplate('error-daily-summary-email', {
    ERROR_COUNT: summary.total,
    GROUP_COUNT: summary.groups,
    STILL_NEW: summary.stillNew,
    ERROR_SUMMARY: summary.rows,
  });
  return sendRendered(rendered);
}

module.exports = { sendNewErrorEmail, sendDailySummary, summaryFor };
