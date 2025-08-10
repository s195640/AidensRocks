const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ensureDir = require('../utils/ensureDir');
const upload = require('../middleware/multer');
const pool = require('../db/pool');
const insertRockSummary = require('../utils/rock-upload/insertRockSummary');
const saveOriginalImages = require('../utils/rock-upload/saveOriginalImages');
const handleTracking = require('../utils/rock-upload/handleTracking');
const saveMetadataFile = require('../utils/rock-upload/saveMetadataFile');
const processImagesInBackground = require('../utils/rock-upload/processImagesInBackground'); // Import the function

const router = express.Router();

router.post('/upload-rock', upload.array('images'), async (req, res, next) => {
  const client = await pool.connect();

  try {
    const {
      rockNumber,
      rockNumberQr,
      location,
      date,
      comment,
      name,
      email,
      trackerData = '{}',
    } = req.body;
    const files = req.files;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid or missing date' });
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
      files,
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
    setImmediate(() => processImagesInBackground(baseDir, name, safeRockNumber, commentSafe, locationSafe));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
