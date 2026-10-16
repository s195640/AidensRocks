const { rateLimit } = require('express-rate-limit');

// Per-IP throttles for the unauthenticated forms that write to the DB and
// send email (rock upload, rock request), and for the public counters. Generous enough for a family
// sharing one connection, low enough that a script can't flood the admin
// inbox or the disk. PUBLIC_FORM_RATE_LIMIT_MAX exists only so the
// regression suite can submit many times.
const max = () => Number(process.env.PUBLIC_FORM_RATE_LIMIT_MAX) || 0;

const make = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: () => max() || limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many submissions. Please try again in a few minutes.' },
  });

module.exports = {
  // Whole submissions (one per upload / request).
  publicFormLimiter: make(20),
  // Chunks of large uploads -- many per submission.
  publicChunkLimiter: make(300),
  // The anonymous counters (site visit, path hit, song play, Honoring
  // Aiden view). A real visitor sends a handful; this only stops a script
  // from inflating the numbers. Fire-and-forget on the client, so a 429
  // is never seen by anyone.
  publicCounterLimiter: make(120),
  // Site activity batches (POST /api/activity). Its own budget, so a busy
  // visit -- or a group on one Wi-Fi -- never uses up the counters' 120 and
  // starts failing song plays. One request per ~5 seconds of activity per
  // device; the client stops sending for the page on a 429.
  activityLimiter: make(1500),
};
