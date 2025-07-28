const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const ensureDir = require('../utils/ensureDir');
const upload = require('../middleware/multer');
const pool = require('../db/pool');

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
      trackerData = '{}',
    } = req.body;
    const files = req.files;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid or missing date' });
    }

    const uuid = uuidv4();
    const safeRockNumber =
      rockNumber && /^\d+$/.test(rockNumber) ? rockNumber : 'unknown';
    const safeRockNumberQr =
      rockNumberQr && /^\d+$/.test(rockNumberQr) ? rockNumberQr : 'unknown';
    const locationSafe = location?.trim() || 'unknown';
    const commentSafe = comment?.trim() || 'unknown';
    const hasImages = files && files.length > 0;
    const timestamp = new Date().toISOString();

    // Set up base paths
    const rootDir = path.resolve('media', 'rocks', safeRockNumber, date, uuid);
    const imageDir = path.join(rootDir, 'o_images');
    await ensureDir(imageDir);

    const renamedImageNames = [];
    const imageMetadataLines = [];

    await client.query('BEGIN'); // Start transaction

    // --- Insert into Rock_Post_Summary ---
    const summaryResult = await client.query(
      `
      INSERT INTO Rock_Post_Summary (
        rock_qr_number,
        rock_number,
        location,
        date,
        comment,
        upload_timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING rps_key
      `,
      [
        safeRockNumberQr,
        safeRockNumber,
        locationSafe,
        date,
        commentSafe,
        timestamp,
      ]
    );

    const rpsKey = summaryResult.rows[0].rps_key;

    // --- Save and Insert Images ---
    if (hasImages) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = path.extname(file.originalname);
        const newName = `[${safeRockNumber}][${date}][${uuid}][${i + 1}]${ext}`;
        const imagePath = path.join(imageDir, newName);
        await fs.writeFile(imagePath, file.buffer);
        renamedImageNames.push(newName);

        const sizeKB = (file.size / 1024).toFixed(2);
        imageMetadataLines.push(
          `  [${i + 1}] Size: ${sizeKB} KB | Original: ${
            file.originalname
          } | Saved as: ${newName}`
        );

        await client.query(
          `
          INSERT INTO Rock_Post_Image (
            rps_key,
            original_name,
            current_name,
            path,
            size
          )
          VALUES ($1, $2, $3, $4, $5)
          `,
          [rpsKey, file.originalname, newName, imagePath, file.size]
        );
      }
    }

    // --- Parse trackerData and Insert into Rock_Post_Tracking ---
    let trackerInfo = '';
    if (trackerData) {
      try {
        const tracker = JSON.parse(trackerData);
        trackerInfo = `
--- Tracking Info ---
IP Address: ${tracker.ipAddress || 'unknown'}
User Agent: ${tracker.userAgent || 'unknown'}
Window: ${JSON.stringify(tracker.window || {})}
Screen: ${JSON.stringify(tracker.screen || {})}
Platform: ${tracker.platform || 'unknown'}
Language: ${tracker.language || 'unknown'}
Timezone: ${tracker.timezone || 'unknown'}
Timestamp: ${tracker.timestamp || 'unknown'}
Page URL: ${tracker.pageUrl || 'unknown'}
Referrer: ${tracker.referrer || 'unknown'}
CookiesEnabled: ${tracker.cookiesEnabled ?? 'unknown'}
Session ID: ${tracker.sessionId || 'unknown'}
Geo: ${JSON.stringify(tracker.geo || {})}
`;

        await client.query(
          `
          INSERT INTO Rock_Post_Tracking (
            rps_key,
            ip_address,
            user_agent,
            "window",
            screen,
            platform,
            language,
            timezone,
            timestamp,
            page_url,
            referrer,
            cookies_enabled,
            session_id,
            geo
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          `,
          [
            rpsKey,
            tracker.ipAddress || null,
            tracker.userAgent || null,
            JSON.stringify(tracker.window || {}),
            JSON.stringify(tracker.screen || {}),
            tracker.platform || null,
            tracker.language || null,
            tracker.timezone || null,
            tracker.timestamp || timestamp,
            tracker.pageUrl || null,
            tracker.referrer || null,
            tracker.cookiesEnabled ?? null,
            tracker.sessionId || null,
            tracker.geo ? JSON.stringify(tracker.geo) : null,
          ]
        );
      } catch (err) {
        console.warn('Failed to parse trackerData:', err);
      }
    }

    // --- Save metadata.txt ---
    const metadata = `Upload Timestamp: ${timestamp}
Rock Number: ${safeRockNumber}
Rock Number QR: ${safeRockNumberQr}
Location: ${locationSafe}
Date: ${date}
Comment: ${commentSafe}

${hasImages ? 'Images:\n' + imageMetadataLines.join('\n') : 'Images: none'}

${trackerInfo}`;

    await fs.writeFile(path.join(rootDir, 'metadata.txt'), metadata, 'utf8');

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Rock uploaded and saved',
      savedTo: imageDir,
      images: renamedImageNames,
      rpsKey,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Upload error:', error);
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
