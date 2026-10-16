// Records every request that ends in a 5xx (Site Tracking, error tracking),
// whichever route's catch block sent it, without touching each handler.
//
// The route handlers log the real error with console.error(...) and then
// send a 500 with a generic message. So, per request (AsyncLocalStorage),
// console.error is wrapped to remember the last Error logged while handling
// it, and when the response finishes with a 5xx that's the error recorded.
// Nothing is added to the response path: recording happens after 'finish'.
const { AsyncLocalStorage } = require('async_hooks');
const { logError } = require('../utils/errors/log');
const recordServerError = require('../utils/errors/recordServerError');
const { RECORDED } = recordServerError;

const requestStore = new AsyncLocalStorage();

let consoleWrapped = false;
function wrapConsoleError() {
  if (consoleWrapped) return;
  consoleWrapped = true;
  console.error = (...args) => {
    logError(...args);
    const store = requestStore.getStore();
    if (!store) return;
    const err = args.find((a) => a instanceof Error);
    if (err) store.lastError = err;
    else if (!store.lastError) store.lastError = new Error(args.map(String).join(' ').slice(0, 1000));
  };
}

function errorCapture(req, res, next) {
  wrapConsoleError();
  const store = {};
  res.on('finish', () => {
    if (res.statusCode < 500) return;
    // Already recorded as what it really is (e.g. a failed email send, by
    // sendEmail): not a second server error. (Client errors never get here:
    // the global handler answers them with their 4xx.)
    if (store.lastError?.[RECORDED]) return;
    recordServerError(store.lastError || new Error(`HTTP ${res.statusCode}`), {
      kind: 'request',
      req,
      status: res.statusCode,
    });
  });
  requestStore.run(store, next);
}

// For the global error handler: the actual Error, not its logged stack text.
function setRequestError(err) {
  const store = requestStore.getStore();
  if (store) store.lastError = err;
}

module.exports = { errorCapture, setRequestError };
