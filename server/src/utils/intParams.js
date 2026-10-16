// Rejects a non-numeric id in the URL (e.g. /api/rock-requests/abc) with a
// 400. Without it the id went straight into SQL against an integer column,
// and Postgres's "invalid input syntax for type integer" came back as a 500.
//
//   intParams(router, 'rq_key');        // every route in `router` with :rq_key
const INT_RE = /^\d{1,9}$/; // fits a Postgres integer

function intParams(router, ...names) {
  for (const name of names) {
    router.param(name, (req, res, next, value) => {
      if (!INT_RE.test(value)) {
        return res.status(400).json({ error: `Invalid ${name}.` });
      }
      next();
    });
  }
}

module.exports = intParams;
