// In-process daily jobs. Only one prod node may run them (the two nodes
// share the database, so both would send the same email), so they start
// only where RUN_SCHEDULED_JOBS=true is set in .env.
//
// Today: the daily error summary email, once a day at DAILY_SUMMARY_HOUR
// (default 8) in SITE_TIMEZONE (default America/New_York). A check every 10
// minutes compares the local date with the last date it ran (stored in the
// `setting` table), so a restart neither skips nor repeats a day.
const db = require('../db/pool');
const { sendDailySummary } = require('./errors/errorEmails');
const { logError } = require('./errors/log');

const CHECK_MS = 10 * 60 * 1000;
const LAST_RUN_SETTING = 'error-summary-last-run';

function localNow(tz, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

// Sends today's summary if it's past the hour and hasn't run today.
// Returns 'sent' | 'nothing' | 'not-yet' | 'already'.
async function runDailySummary(now = new Date()) {
  const tz = process.env.SITE_TIMEZONE || 'America/New_York';
  const hour = Number(process.env.DAILY_SUMMARY_HOUR ?? 8);
  const local = localNow(tz, now);
  if (local.hour < hour) return 'not-yet';

  // Claim today first: a failed or empty run still counts as today's.
  const { rowCount } = await db.query(
    `INSERT INTO setting (name, value, type, description)
     VALUES ($1, to_jsonb($2::text), 'string', 'Date the daily error summary last ran (scheduledJobs.js).')
     ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, update_dt = NOW()
       WHERE setting.value <> EXCLUDED.value`,
    [LAST_RUN_SETTING, local.date]
  );
  if (rowCount === 0) return 'already';
  return (await sendDailySummary()) ? 'sent' : 'nothing';
}

function startScheduledJobs() {
  if (process.env.RUN_SCHEDULED_JOBS !== 'true') return;
  const tick = () =>
    runDailySummary().catch((err) => logError('Daily error summary failed:', err.message));
  setTimeout(tick, 60 * 1000).unref();
  setInterval(tick, CHECK_MS).unref();
  console.log('Scheduled jobs running (daily error summary).');
}

module.exports = { startScheduledJobs, runDailySummary };
