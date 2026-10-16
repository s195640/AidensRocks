// The global Express error handler (last in app.js).
//
// A request the client got wrong gets the 4xx it deserves, not a 500:
//   - errors that already carry a 4xx status (body-parser: malformed JSON
//     400, body too large 413, unsupported charset 415; anything built with
//     http-errors)
//   - upload (multer) errors, which carry no status: a file or field over
//     its size limit is 413, anything else (too many files, an unexpected
//     field) is 400
// Everything else is a server failure: 500, and error tracking records it
// (middleware/errorCapture.js). The body is { error } either way, as before.
const { setRequestError } = require('./errorCapture');

const TOO_LARGE_UPLOAD_CODES = new Set(['LIMIT_FILE_SIZE', 'LIMIT_FIELD_VALUE']);

// The 4xx status for a client error, or null for a server error.
function clientErrorStatus(err) {
  const status = err?.status ?? err?.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) return status;
  if (err?.name === 'MulterError') return TOO_LARGE_UPLOAD_CODES.has(err.code) ? 413 : 400;
  return null;
}

// Express only treats a 4-argument middleware as an error handler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = clientErrorStatus(err);
  if (status) {
    // Client errors aren't logged as failures; a short line is enough.
    console.warn(`${req.method} ${req.originalUrl} -> ${status}: ${err.message}`);
    const message = err.expose || err.name === 'MulterError' ? err.message : 'Bad request';
    return res.status(status).json({ error: message });
  }
  setRequestError(err);
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
}

module.exports = errorHandler;
module.exports.clientErrorStatus = clientErrorStatus;
