// utils/getAppVersion.js
const fs = require('fs');
const path = require('path');

let cachedVersion = null;

// Reads the repo-root VERSION file. Has to work across every context this
// server actually runs in, which each put VERSION at a different relative
// location:
//   - Docker (WORKDIR /app): VERSION is bind-mounted at /app/VERSION (see
//     data/docker-compose/docker-compose-*.yml) -- cwd-relative.
//   - Local, non-Docker `npm start`/`npm run dev` run from server/: VERSION
//     is one directory up from cwd.
//   - Fallback relative to this file, in case cwd assumptions don't hold.
// Tries each in order, caches the first hit. Never throws -- falls back to
// "unknown" (logged once) so a missing/unmounted file degrades gracefully
// instead of crashing the server.
function getAppVersion() {
  if (cachedVersion) return cachedVersion;

  const candidates = [
    path.resolve(process.cwd(), 'VERSION'),
    path.resolve(process.cwd(), '..', 'VERSION'),
    path.resolve(__dirname, '..', '..', '..', 'VERSION'),
  ];

  for (const candidate of candidates) {
    try {
      cachedVersion = fs.readFileSync(candidate, 'utf8').trim();
      return cachedVersion;
    } catch {
      // try next candidate
    }
  }

  console.warn('⚠️ Could not locate VERSION file; defaulting to "unknown"');
  cachedVersion = 'unknown';
  return cachedVersion;
}

module.exports = getAppVersion;
