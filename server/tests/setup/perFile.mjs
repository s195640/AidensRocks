// Runs in each test file's worker before the file is imported, so the
// server's own `require('dotenv').config()` / pg.Pool see test values only.
import { beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { applyTestEnv, TEST_ROOT } from './testEnv.mjs';
import { resetState } from './resetState.mjs';

applyTestEnv();
process.chdir(TEST_ROOT);

const require = createRequire(import.meta.url);
// libvips keeps recently read files open; on Windows that blocks deleting
// them (rock/music/album deletes in the tests). Linux prod doesn't care.
require('sharp').cache(false);

// Fresh DB + media for every file.
beforeAll(resetState);

afterAll(async () => {
  // Let background jobs (image processing, emails) fired by the last test
  // settle before the pool closes under them.
  await new Promise((r) => setTimeout(r, 250));
  await require('../../src/db/pool').end().catch(() => {});
});
