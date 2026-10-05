// Runs once per `vitest run`: fails fast with a clear message if the test
// stack isn't up, and makes sure the temp root exists for perFile's chdir.
// (The DB itself is rebuilt per test file -- see resetState.mjs.)
import fs from 'node:fs';
import { applyTestEnv, TEST_ROOT } from './testEnv.mjs';
import { resetState } from './resetState.mjs';

export default async function globalSetup() {
  applyTestEnv();
  fs.rmSync(TEST_ROOT, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  fs.mkdirSync(TEST_ROOT, { recursive: true });
  await resetState();
}
