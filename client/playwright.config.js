import { defineConfig, devices } from "@playwright/test";

// Browser regression suite. Needs the throwaway docker stack:
//   (in server/) npm run test:db:up
// then:  npm run test:e2e
// Playwright starts the E2E API (seeded test DB) and a production build of
// this app on http://127.0.0.1:4174. See
// data/ai-build-docs/regression-testing/RUNBOOK.md.
export default defineConfig({
  testDir: "./e2e",
  // One shared seeded DB: run specs one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /mobile[.]spec[.]js/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.js/ },
  ],
  webServer: [
    {
      command: "npm --prefix ../server run test:serve",
      url: "http://127.0.0.1:8001/health",
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "ignore",
    },
    {
      command: "npx vite build -c vite.e2e.config.js && npx vite preview -c vite.e2e.config.js",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
