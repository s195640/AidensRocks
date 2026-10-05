// ROLLBACK for a catch block. A failing ROLLBACK (e.g. the connection itself
// dropped -- often the very error being handled) must not throw out of the
// catch: in Express 4 that's an unhandled rejection and the request hangs.
// Safe to call with no client (connect() failed) or after a COMMIT.
async function safeRollback(client) {
  if (!client) return;
  try {
    await client.query('ROLLBACK');
  } catch (err) {
    console.error('ROLLBACK failed:', err.message);
  }
}

module.exports = safeRollback;
