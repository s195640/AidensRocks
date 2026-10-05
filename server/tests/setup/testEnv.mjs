import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const SERVER_DIR = path.resolve(here, '../..');
export const REPO_DIR = path.resolve(SERVER_DIR, '..');
// The server resolves `media/...` against process.cwd(), so tests run with
// cwd = TEST_ROOT and every file the API writes lands in TEST_ROOT/media
// (wiped at the start of every run, gitignored).
export const TEST_ROOT = path.join(SERVER_DIR, 'tests', '.tmp');
export const MEDIA_ROOT = path.join(TEST_ROOT, 'media');

// Everything points at the throwaway stack in
// data/docker-compose/docker-compose-test.yml -- never the dev DB or Gmail.
export const TEST_ENV = {
  NODE_ENV: 'test',
  DB_HOST: 'localhost',
  DB_PORT: '5433',
  DB_USER: 'postgres',
  DB_PASSWORD: 'test',
  DB_NAME: 'aidensrocks_test',
  DB_IPS: 'localhost',
  JWT_SECRET: 'regression-test-secret',
  JWT_EXPIRES_IN: '1h',
  MAILPIT_ENABLED: 'true',
  MAILPIT_HOST: 'localhost',
  MAILPIT_PORT: '1026',
  MAILPIT_API: 'http://localhost:8026',
  EMAIL_USER: 'aidensrocks-test@example.com',
  EMAIL_PASSWORD: 'unused',
  PUBLIC_SITE_URL: 'http://localhost:4174',
  // The per-IP auth limiter would trip on a full run; the limiter itself
  // has its own test with a low override.
  AUTH_RATE_LIMIT_MAX: '100000',
  PUBLIC_FORM_RATE_LIMIT_MAX: '100000',
  OPENCAGE_API_KEY: '',
};

export function applyTestEnv() {
  // Overwrite (not default): a developer's shell or server/.env must never
  // leak a real DB or mail account into a test run.
  Object.assign(process.env, TEST_ENV);
}
