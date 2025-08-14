const path = require('path');
const ensureDir = require('../ensureDir');
const convertToWebP = require('../convert-to-webp/convertToWebP');
const createThumbnails = require('../convert-to-webp/createThumbnails');
const sendEmail = require('../sendEmail');
const db = require('../../db/pool');

async function processImagesInBackground(baseDir, name, safeRockNumber, commentSafe, locationSafe, rpsKey) {
  try {
    const originalDir = path.join(baseDir, 'o');
    const webpDir = path.join(baseDir, 'webp');
    const smDir = path.join(baseDir, 'sm');

    await ensureDir(webpDir);

    await convertToWebP(originalDir, webpDir);

    await ensureDir(smDir);
    await createThumbnails(webpDir, smDir, 300, 300);

    // Only update DB if safeRockNumber > 0
    if (safeRockNumber > 0 && rpsKey) {
      await db.query('UPDATE Rock_Post_Summary SET show = true WHERE rps_key = $1', [rpsKey]);
      await db.query('UPDATE Rock_Post_Image SET show = true WHERE rps_key = $1', [rpsKey]);
      console.log(`✅ Updated DB show flags for rps_key ${rpsKey}`);
    }

    console.log(`✅ Finished background processing for ${baseDir}`);

    // Send notification email on success
    await sendEmail({
      to: "AidensRocks.AAA@gmail.com, 6142868724@vtext.com",
      subject: `New Rock Journey: Rock ${safeRockNumber}`,
      text: `A new Rock Journey has been posted.

Rock Number: ${safeRockNumber}
Name: ${name}
Location: ${locationSafe}
Comment: ${commentSafe}
  `,
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2 style="color: #4CAF50;">New Rock Journey Posted</h2>
      <p><strong>Rock Number:</strong> ${safeRockNumber}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Location:</strong> ${locationSafe}</p>
      <p><strong>Comment:</strong> ${commentSafe}</p>
      <hr style="border: none; border-top: 1px solid #ccc;" />
      <p style="font-size: 0.9em; color: #888;">This is an automated notification from Aidens Rocks.</p>
    </div>
  `,
    });



  } catch (err) {
    console.error(`❌ Background processing failed for ${baseDir}`, err);

    // Optional: send error notification email here
    // await sendEmail({...});
  }
}

module.exports = processImagesInBackground;
