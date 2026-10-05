const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const recordAppVersion = require('./utils/recordAppVersion');

require('dotenv').config();

const app = express();

// Behind Nginx: trust its X-Forwarded-For so req.ip (used by the auth
// rate limiter) is the real client, not the proxy.
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(morgan('dev'));

// Static files. Rock uploads keep private data next to the public images:
// metadata.txt (submitter name/email/IP/geo) and o/ (untouched originals,
// EXIF GPS included). The site only ever shows the webp/ + sm/ copies, so
// those two stay on disk for the family but are never served.
app.use('/media', (req, res, next) => {
  let p;
  try {
    p = decodeURIComponent(req.path).replace(/\\/g, '/').toLowerCase();
  } catch {
    return res.sendStatus(400);
  }
  if (p.endsWith('/metadata.txt') || /^\/rocks\/[^/]+\/[^/]+\/o(\/|$)/.test(p)) {
    return res.sendStatus(404);
  }
  next();
});
app.use('/media', express.static('media'));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/uploadRock'));
app.use('/api', require('./routes/misc'));
app.use('/api', require('./routes/rockCount'));
app.use('/api/users', require('./routes/users'));
app.use('/api/rocks', require('./routes/rocks'));
app.use('/api/rock-posts', require('./routes/rockPosts'));
app.use('/api/rock-requests', require('./routes/rockRequests'));
app.use('/api/albums', require('./routes/albums'));
app.use('/api/journey-admin', require('./routes/journeyAdmin'));
app.use('/api/server-health', require('./routes/serverHealth'));
app.use("/api/ar-details", require("./routes/arDetails"));
app.use("/api/music", require("./routes/music"));
app.use("/api/statistics", require("./routes/statistics"));
app.use("/api/unmatched-path", require("./routes/unmatchedPath"));
app.use("/api/admin/path-display-names", require("./routes/pathDisplayNameAdmin"));
app.use("/api/pages", require("./routes/pages"));
app.use("/api/admin/pages", require("./routes/pagesAdmin"));
app.use("/api/admin/jobs", require("./routes/jobsAdmin"));
app.use("/api/admin/settings", require("./routes/settingsAdmin"));
app.use("/api/honoring-aiden", require("./routes/honoringAiden"));
app.use("/api/admin/honoring-aiden", require("./routes/honoringAidenAdmin"));
app.use("/api/admin/accounts", require("./routes/accountsAdmin"));
app.use("/api/follows", require("./routes/follows"));

// Health Check
app.get('/health', (req, res) => res.send('OK'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Exported (and only listening when run directly -- `node src/app.js` /
// nodemon) so the regression suite can drive it in-process with supertest.
// See data/ai-build-docs/regression-testing/RUNBOOK.md.
if (require.main === module) {
  // Log, don't die: a stray rejected promise in one request (or a
  // background upload job) shouldn't take the whole site down.
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection:', reason);
  });

  const PORT = process.env.PORT || 8000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    recordAppVersion();
  });
}

module.exports = app;
