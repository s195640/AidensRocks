/* eslint-env node */
// The site version (repo-root VERSION), baked into the client build by
// vite.config.js and vite.e2e.config.js (__APP_VERSION__), so activity and
// error reports say which release was running in the visitor's browser.
// The prod Dockerfile copies VERSION to /VERSION, which is ../VERSION from
// its /app build dir; locally it's the repo root. "unknown" if missing.
import { readFileSync } from "node:fs";

export default function appVersion() {
  try {
    return readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();
  } catch {
    return "unknown";
  }
}
