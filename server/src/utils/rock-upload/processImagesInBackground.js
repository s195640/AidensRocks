const path = require('path');
const fs = require('fs').promises;
const ensureDir = require('../ensureDir');
const convertToWebP = require('../convert-to-webp/convertToWebP');
const createThumbnails = require('../convert-to-webp/createThumbnails');
const processVideo = require('../processVideo');
const sendEmail = require('../sendEmail');
const db = require('../../db/pool');

async function processImagesInBackground(baseDir, name, safeRockNumber, commentSafe, locationSafe, dateSafe, emailSafe, rpsKey, req) {
  try {
    const originalDir = path.join(baseDir, 'o');
    const webpDir = path.join(baseDir, 'webp');
    const smDir = path.join(baseDir, 'sm');
    const videoDir = path.join(baseDir, 'video');

    await ensureDir(webpDir);
    await ensureDir(smDir);
    await ensureDir(videoDir);

    const { rows } = await db.query(
      'SELECT current_name, media_type FROM journey_image WHERE rps_key = $1',
      [rpsKey]
    );
    const originalFiles = await fs.readdir(originalDir);

    for (const row of rows) {
      const originalFile = originalFiles.find(
        (f) => path.parse(f).name === row.current_name
      );
      if (!originalFile) {
        console.warn(`⚠️ Original file for ${row.current_name} not found, skipping`);
        continue;
      }

      const originalPath = path.join(originalDir, originalFile);
      const webpOutputPath = path.join(webpDir, `${row.current_name}.webp`);
      const smOutputPath = path.join(smDir, `${row.current_name}.webp`);

      if (row.media_type === 'video') {
        const videoOutputPath = path.join(videoDir, `${row.current_name}.mp4`);
        await processVideo(originalPath, { webpOutputPath, videoOutputPath });
      } else {
        await convertToWebP(originalPath, webpOutputPath);
      }

      await createThumbnails(webpOutputPath, smOutputPath, 300, 300);
    }

    // Only update DB if safeRockNumber > 0
    if (safeRockNumber > 0 && rpsKey) {
      await db.query('UPDATE journey SET show = true WHERE rps_key = $1', [rpsKey]);
      await db.query('UPDATE journey_image SET show = true WHERE rps_key = $1', [rpsKey]);
      console.log(`✅ Updated DB show flags for rps_key ${rpsKey}`);
    }

    console.log(`✅ Finished background processing for ${baseDir}`);

    // --- Build subject ---
    let subject = `New Rock Journey: Rock ${safeRockNumber}`;
    const remoteAddr = req?.ip || req?.connection?.remoteAddress || '';
    if (remoteAddr.includes('127.0.0.1') || remoteAddr.includes('localhost') || remoteAddr.includes('192.168.1.50')) {
      subject = `TEST_SERVER - ${subject}`;
    }

    // --- Collect attachments from webpDir ---
    let attachments = [];
    try {
      const files = await fs.readdir(webpDir);
      attachments = files.map(file => ({
        filename: file,
        path: path.join(webpDir, file),
      }));
    } catch (err) {
      console.warn(`⚠️ Could not attach images from ${webpDir}:`, err.message);
    }

    // --- Send notification email ---
    await sendEmail({
      to: "AidensRocks.AAA@gmail.com",
      subject,
      text: `A new Rock Journey has been posted.

Rock Number: ${safeRockNumber}
Name: ${name}
Date: ${dateSafe || 'Not provided'}
Location: ${locationSafe}
Comment: ${commentSafe}
Email: ${emailSafe || 'Not provided'}
  `,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
          <h2 style="color: #4CAF50;">New Rock Journey Posted</h2>
          <p><strong>Rock Number:</strong> ${safeRockNumber}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Date:</strong> ${dateSafe || 'Not provided'}</p>
          <p><strong>Location:</strong> ${locationSafe}</p>
          <p><strong>Comment:</strong> ${commentSafe}</p>
          <p><strong>Email:</strong> ${emailSafe || 'Not provided'}</p>
          <hr style="border: none; border-top: 1px solid #ccc;" />
          <p style="font-size: 0.9em; color: #888;">This is an automated notification from Aidens Rocks.</p>
        </div>
      `,
      attachments,
    });

  } catch (err) {
    console.error(`❌ Background processing failed for ${baseDir}`, err);

    // Optional: send error notification email here
  }
}

module.exports = processImagesInBackground;
