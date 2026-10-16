// The dashboard's shared date ranges (7 / 30 / 90 days, This year, All),
// counted in whole calendar days in the viewer's own timezone. Used by the
// Visitors by Day chart (routes/statistics.js) and Site Health
// (routes/siteHealthAdmin.js).
const RANGES = { '7': 7, '30': 30, '90': 90, year: null, all: null };

// "YYYY-MM-DD" for a Date as seen in `tz`. Throws on an unknown timezone.
const dayIn = (date, tz) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

// Calendar-day arithmetic on "YYYY-MM-DD" strings (UTC, so no DST drift).
const addDays = (day, n) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// From req.query { range, tz }: { range, tz, today, start } (start is null
// for "all"), or { error } for a bad range or timezone.
function parseRange(query, defaultRange = '30') {
  const range = String(query.range || defaultRange);
  if (!(range in RANGES)) return { error: 'range must be one of 7, 30, 90, year, all' };
  const tz = String(query.tz || 'UTC');
  let today;
  try {
    today = dayIn(new Date(), tz);
  } catch {
    return { error: 'Invalid timezone' };
  }
  let start = null;
  if (RANGES[range]) start = addDays(today, -(RANGES[range] - 1));
  else if (range === 'year') start = `${today.slice(0, 4)}-01-01`;
  return { range, tz, today, start };
}

module.exports = { parseRange, dayIn, addDays };
