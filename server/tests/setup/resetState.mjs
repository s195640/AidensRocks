// Rebuilds the test DB (data/sql/createdb.sql + tests/fixtures/seed.sql)
// and the temp media root. Run once per test FILE (perFile.mjs), so every
// file starts from the same known state no matter what earlier files did.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { REPO_DIR, SERVER_DIR, MEDIA_ROOT } from './testEnv.mjs';
import { writeSeedMedia } from '../helpers/media.mjs';

const createdb = () => fs.readFileSync(path.join(REPO_DIR, 'data/sql/createdb.sql'), 'utf8');
const seed = () => fs.readFileSync(path.join(SERVER_DIR, 'tests/fixtures/seed.sql'), 'utf8');

export async function resetState() {
  const client = new pg.Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `Can't reach the test database on ${process.env.DB_HOST}:${process.env.DB_PORT} ` +
        `(${err.message}). Start it with: npm run test:db:up`
    );
  }
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    await client.query(createdb());
    await client.query(seed());
  } finally {
    await client.end();
  }

  fs.rmSync(MEDIA_ROOT, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  fs.mkdirSync(MEDIA_ROOT, { recursive: true });
  await writeSeedMedia(MEDIA_ROOT);
}
