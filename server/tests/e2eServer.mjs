// API server for the Playwright E2E run (client/playwright.config.js starts
// it via `npm run test:serve`). Same throwaway stack and seed as the Vitest
// suite: test DB on 5433, Mailpit on 1026/8026, media under tests/.tmp.
// Listens on E2E_API_PORT (default 8001) -- never the dev server's 8000.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { applyTestEnv, TEST_ROOT } from './setup/testEnv.mjs';
import { resetState } from './setup/resetState.mjs';

applyTestEnv();
fs.mkdirSync(TEST_ROOT, { recursive: true });
await resetState();
process.chdir(TEST_ROOT);

const require = createRequire(import.meta.url);
require('sharp').cache(false);
const app = require('../src/app.js');

const port = Number(process.env.E2E_API_PORT) || 8001;
app.listen(port, '127.0.0.1', () => {
  console.log(`E2E API listening on http://127.0.0.1:${port}`);
});
