// utils/rock-upload/processImagesInBackground.js
const path = require('path');
const ensureDir = require('../ensureDir');
const convertToWebP = require('./convertToWebP');
const createThumbnails = require('./createThumbnails');

async function processImagesInBackground(baseDir) {
  try {
    const originalDir = path.join(baseDir, 'o');
    const webpDir = path.join(baseDir, 'webp');
    const smDir = path.join(baseDir, 'sm');

    await ensureDir(webpDir);
    await convertToWebP(originalDir, webpDir);

    await ensureDir(smDir);
    await createThumbnails(webpDir, smDir);

    console.log(`✅ Finished background processing for ${baseDir}`);
  } catch (err) {
    console.error(`❌ Background processing failed for ${baseDir}`, err);
  }
}

module.exports = processImagesInBackground;
