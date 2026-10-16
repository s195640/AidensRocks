// The real console.error, captured before middleware/errorCapture.js wraps
// it. Error tracking logs its own problems through this, so recording an
// error can never feed back into recording another one.
const logError = console.error.bind(console);

module.exports = { logError };
