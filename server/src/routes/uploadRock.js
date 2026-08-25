const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const ensureDir = require('../utils/ensureDir');
const upload = require('../middleware/multer');
const pool = require('../db/pool');
const insertRockSummary = require('../utils/rock-upload/insertRockSummary');
const saveOriginalImages = require('../utils/rock-upload/saveOriginalImages');
const handleTracking = require('../utils/rock-upload/handleTracking');
const saveMetadataFile = require('../utils/rock-upload/saveMetadataFile');
const processImagesInBackground = require('../utils/rock-upload/processImagesInBackground'); // Import the function
const sendRockResponseEmail = require('../utils/rock-upload/sendRockResponseEmail');

const router = express.Router();

// Large files (e.g. video) get split client-side into pieces under Cloudflare's
// 100MB request limit and staged here before the rock post itself is created,
// since the final submit needs to bundle metadata + small files + references
// to already-staged large files in a single request.
const STAGING_DIR = path.resolve('media', '.staging');
const STAGING_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

async function cleanupStaleStaging() {
  try {
    if (!(await fs.pathExists(STAGING_DIR))) return;
    const entries = await fs.readdir(STAGING_DIR);
    const now = Date.now();
    for (const entry of entries) {
      const entryPath = path.join(STAGING_DIR, entry);
      try {
        const stat = await fs.stat(entryPath);
        if (now - stat.mtimeMs > STAGING_MAX_AGE_MS) {
          await fs.remove(entryPath);
        }
      } catch {
        // best-effort; ignore individual entry failures
      }
    }
  } catch (err) {
    console.warn('Staging cleanup failed:', err.message);
  }
}

router.post('/upload-rock/stage-chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { stagingId, originalName } = req.body;
    const chunkIndex = Number(req.body.chunkIndex);
    const totalChunks = Number(req.body.totalChunks);

    if (
      !req.file ||
      !stagingId ||
      !originalName ||
      Number.isNaN(chunkIndex) ||
      Number.isNaN(totalChunks)
    ) {
      return res.status(400).json({ error: 'Missing chunk data' });
    }

    cleanupStaleStaging(); // best-effort, fire-and-forget

    await fs.ensureDir(STAGING_DIR);
    const tmpPath = path.join(STAGING_DIR, path.basename(stagingId));
    await fs.appendFile(tmpPath, req.file.buffer);

    res.json({ success: true, complete: chunkIndex >= totalChunks - 1 });
  } catch (err) {
    console.error('Rock chunk upload failed:', err);
    res.status(500).json({ error: 'Chunk upload failed' });
  }
});

router.post('/upload-rock', upload.array('images'), async (req, res, next) => {
  let client;

  try {
    client = await pool.connect();

    const {
      rockNumber,
      rockNumberQr,
      location,
      date,
      comment,
      name,
      email,
      trackerData = '{}',
      fileManifest,
    } = req.body;
    const files = req.files || [];
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid or missing date' });
    }

    // Files are either sent inline (small) or pre-staged via chunked upload
    // (large, e.g. video). fileManifest preserves the original selection
    // order across both groups; without one, everything is treated as inline.
    let manifest;
    try {
      manifest = fileManifest
        ? JSON.parse(fileManifest)
        : files.map(() => ({ type: 'inline' }));
    } catch {
      return res.status(400).json({ error: 'Invalid fileManifest' });
    }

    let inlineIndex = 0;
    const fileDescriptors = [];
    for (const entry of manifest) {
      if (entry.type === 'staged') {
        const stagedPath = path.join(STAGING_DIR, path.basename(entry.stagingId));
        if (!(await fs.pathExists(stagedPath))) {
          return res.status(400).json({
            error: `Staged file missing or expired: ${entry.originalName}`,
          });
        }
        fileDescriptors.push({ originalname: entry.originalName, stagedPath });
      } else {
        const f = files[inlineIndex++];
        if (!f) {
          return res.status(400).json({ error: 'File manifest/inline file count mismatch' });
        }
        fileDescriptors.push({ originalname: f.originalname, buffer: f.buffer });
      }
    }

    const uuid = uuidv4();
    const { DateTime } = require('luxon');
    const timestamp = DateTime.now().setZone('America/New_York').toISO();
    const safeRockNumber = /^\d+$/.test(rockNumber) ? rockNumber : '0';
    const safeRockNumberQr = /^\d+$/.test(rockNumberQr) ? rockNumberQr : 0;
    const locationSafe = location?.trim() || 'unknown';
    const commentSafe = comment?.trim() || 'unknown';
    const baseDir = path.resolve('media', 'rocks', safeRockNumber, uuid);
    const originalDir = path.join(baseDir, 'o');

    await ensureDir(originalDir);

    await client.query('BEGIN');

    const rpsKey = await insertRockSummary(client, {
      rockNumber: safeRockNumber,
      rockNumberQr: safeRockNumberQr,
      location: locationSafe,
      date,
      comment: commentSafe,
      name: name?.trim() || null,
      email: email?.trim() || null,
      timestamp,
      uuid,
    });

    const { imageMetadata, imageNames } = await saveOriginalImages(
      fileDescriptors,
      originalDir,
      uuid,
      client,
      rpsKey
    );

    const trackerInfo = await handleTracking(
      client,
      trackerData,
      rpsKey,
      timestamp
    );

    await saveMetadataFile(baseDir, {
      timestamp,
      safeRockNumber,
      safeRockNumberQr,
      locationSafe,
      date,
      commentSafe,
      name,
      email,
      imageMetadata,
      trackerInfo,
      uuid,
    });

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Rock uploaded successfully',
      uuid,
      rpsKey,
      images: imageNames,
    });

    // ✅ Run the image processing in the background
    const emailTrimmed = email?.trim();
    setImmediate(() => processImagesInBackground(baseDir, name, safeRockNumber, commentSafe, locationSafe, date, emailTrimmed, rpsKey));

    // ✅ If they gave a real rock number and an email, fire the (optional,
    // admin-controlled) Response Email — no-ops internally if that template
    // is currently Inactive. Independent of the background processing above.
    const rockNumberInt = parseInt(safeRockNumber, 10);
    if (rockNumberInt > 0 && emailTrimmed) {
      setImmediate(() => sendRockResponseEmail(rockNumberInt, emailTrimmed, rpsKey));
    }
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error(err);
    next(err);
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
