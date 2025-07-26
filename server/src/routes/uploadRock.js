const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const ensureDir = require('../utils/ensureDir');
const upload = require('../middleware/multer');

const router = express.Router();

router.post('/upload-rock', upload.array('images'), async (req, res, next) => {
  try {
    const { rockNumber, location, date, comment, trackerData } = req.body;
    const files = req.files;

    // Validate date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid or missing date' });
    }

    const uuid = uuidv4();
    const safeRockNumber =
      rockNumber && /^\d+$/.test(rockNumber) ? rockNumber : 'unknown';
    const locationSafe = location?.trim() || 'unknown';
    const commentSafe = comment?.trim() || 'unknown';
    const hasImages = files && files.length > 0;
    const timestamp = new Date().toISOString();

    // Create directory
    const baseDir = path.resolve('media', 'rocks', safeRockNumber, date, uuid);
    await ensureDir(baseDir);

    const renamedImageNames = [];
    const imageMetadataLines = [];

    // Save images with new names and collect metadata
    if (hasImages) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = path.extname(file.originalname);
        const newName = `[${safeRockNumber}][${date}][${uuid}][${i + 1}]${ext}`;
        await fs.writeFile(path.join(baseDir, newName), file.buffer);
        renamedImageNames.push(newName);

        const sizeKB = (file.size / 1024).toFixed(2);
        imageMetadataLines.push(
          `  [${i + 1}] Size: ${sizeKB} KB | Original: ${
            file.originalname
          } | Saved as: ${newName}`
        );
      }
    }

    // Parse tracker data
    let trackerInfo = '';
    try {
      const tracker = JSON.parse(trackerData);
      trackerInfo = `
--- Tracking Info ---
IP Address: ${tracker.ipAddress || 'unknown'}
User Agent: ${tracker.userAgent || 'unknown'}
Platform: ${tracker.platform || 'unknown'}
Language: ${tracker.language || 'unknown'}
Timezone: ${tracker.timezone || 'unknown'}
Page URL: ${tracker.pageUrl || 'unknown'}
Referrer: ${tracker.referrer || 'unknown'}
Session ID: ${tracker.sessionId || 'unknown'}`;
    } catch (err) {
      console.warn('Failed to parse trackerData:', err);
    }

    // Final metadata.txt content
    const metadata = `Upload Timestamp: ${timestamp}
Rock Number: ${safeRockNumber}
Location: ${locationSafe}
Date: ${date}
Comment: ${commentSafe}
${hasImages ? 'Images:\n' + imageMetadataLines.join('\n') : 'Images: none'}
${trackerInfo}`;

    // Save metadata.txt
    await fs.writeFile(path.join(baseDir, 'metadata.txt'), metadata, 'utf8');

    // Respond to client
    res.status(200).json({
      message: 'Rock uploaded successfully',
      savedTo: baseDir,
      images: renamedImageNames,
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
});

module.exports = router;
