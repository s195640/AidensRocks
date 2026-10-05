// The server is CommonJS: load it (and anything else from src/) through
// Node's own require so every test shares one module instance -- one
// pg.Pool, one Express app -- with tests/setup/perFile.mjs.
import { createRequire } from 'node:module';
import supertest from 'supertest';

export const require = createRequire(import.meta.url);

export const app = require('../../src/app.js');
export const pool = require('../../src/db/pool');
export const api = () => supertest(app);

export const PASSWORD = 'Test-Passw0rd!';

export const ACCOUNTS = {
  admin: 'admin@example.com',
  user: 'user@example.com',
  creator: 'creator@example.com',
  unverified: 'unverified@example.com',
  locked: 'locked@example.com',
};

const tokenCache = new Map();

// JWT for one of the seeded accounts, via the real login endpoint.
export async function tokenFor(role) {
  if (tokenCache.has(role)) return tokenCache.get(role);
  const res = await api().post('/api/auth/login').send({ email: ACCOUNTS[role], password: PASSWORD });
  if (res.status !== 200) {
    throw new Error(`login as ${role} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  tokenCache.set(role, res.body.token);
  return res.body.token;
}

export const bearer = async (role) => ({ Authorization: `Bearer ${await tokenFor(role)}` });

// Raw SQL for arranging/asserting state the API doesn't expose.
export const sql = async (text, params) => (await pool.query(text, params)).rows;

// Poll fn() until it returns truthy (for background jobs that run after the
// HTTP response, e.g. upload image processing and emails).
export async function waitFor(fn, { timeout = 15000, interval = 200, label = 'condition' } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Timed out waiting for ${label}`);
}
