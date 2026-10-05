const { rateLimit } = require('express-rate-limit');

// Per-IP throttles for the unauthenticated forms that write to the DB and
// send email (rock upload, rock request). Generous enough for a family
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
};
