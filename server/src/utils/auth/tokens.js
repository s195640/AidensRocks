const crypto = require('crypto');
const db = require('../../db/pool');

const TOKEN_TTL_MS = {
  verify: 24 * 60 * 60 * 1000, // 24h
  reset: 60 * 60 * 1000, // 1h
};

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// Creates a single-use email token (verify/reset) for an account. Only the
// sha256 is stored; the raw token goes out in the emailed link. Any earlier
// unused token of the same purpose is invalidated so only the newest link
// works.
async function createAccountToken(accountId, purpose, client = db) {
  const raw = crypto.randomBytes(32).toString('hex');
  await client.query(
    `UPDATE account_token SET used_dt = NOW()
     WHERE account_id = $1 AND purpose = $2 AND used_dt IS NULL`,
    [accountId, purpose]
  );
  await client.query(
    `INSERT INTO account_token (account_id, token_hash, purpose, expires_dt)
     VALUES ($1, $2, $3, NOW() + ($4 || ' milliseconds')::interval)`,
    [accountId, hashToken(raw), purpose, String(TOKEN_TTL_MS[purpose])]
  );
  return raw;
}

// Marks a valid (unexpired, unused) token as used and returns its
// account_id, or null if the token is unknown/expired/already used.
async function consumeAccountToken(raw, purpose, client = db) {
  if (typeof raw !== 'string' || !raw) return null;
  const { rows } = await client.query(
    `UPDATE account_token SET used_dt = NOW()
     WHERE token_hash = $1 AND purpose = $2
       AND used_dt IS NULL AND expires_dt > NOW()
     RETURNING account_id`,
    [hashToken(raw), purpose]
  );
  return rows[0]?.account_id ?? null;
}

module.exports = { createAccountToken, consumeAccountToken };
