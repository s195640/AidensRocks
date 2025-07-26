const fs = require('fs').promises;

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

module.exports = ensureDir;
