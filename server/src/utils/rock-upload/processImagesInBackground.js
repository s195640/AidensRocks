const path = require('path');
const fs = require('fs').promises;
const ensureDir = require('../ensureDir');
const convertToWebP = require('../convert-to-webp/convertToWebP');
const createThumbnails = require('../convert-to-webp/createThumbnails');
const processVideo = require('../processVideo');
const sendEmail = require('../sendEmail');
const notifyFollowers = require('./notifyFollowers');
const { renderEmailTemplate } = require('../emailTemplates');
const db = require('../../db/pool');

const ADMIN_EMAIL = 'AidensRocks.AAA@gmail.com';

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Prepended to the admin's new-journey email when some files didn't process.
function failureNoteHtml(failures, processedCount, rpsKey) {
  if (!failures.length) return '';
  const items = failures.map((f) => `<li>${escapeHtml(f.name)}: ${escapeHtml(f.error)}</li>`).join('');
  return `<div style="border:2px solid #c0392b;padding:8px;margin-bottom:12px">
<p><strong>${failures.length} file(s) in this upload could not be processed</strong> and are hidden (journey #${rpsKey}).
${processedCount ? `The other ${processedCount} file(s) are published.` : 'Nothing processed, so the journey is still hidden.'}</p>
<ul>${items}</ul><p>The originals are still on the server.</p></div>`;
}

async function processImagesInBackground(baseDir, name, safeRockNumber, commentSafe, locationSafe, dateSafe, emailSafe, rpsKey) {
  try {
    const originalDir = path.join(baseDir, 'o');
    const webpDir = path.join(baseDir, 'webp');
    const smDir = path.join(baseDir, 'sm');
    const videoDir = path.join(baseDir, 'video');

    await ensureDir(webpDir);
    await ensureDir(smDir);
    await ensureDir(videoDir);

    const { rows } = await db.query(
      'SELECT rpi_key, original_name, current_name, media_type FROM journey_image WHERE rps_key = $1',
      [rpsKey]
    );
    const originalFiles = await fs.readdir(originalDir);

    // Each file is converted on its own: one bad file (a corrupt or odd
    // video, an unreadable image) is skipped and reported, instead of
    // aborting the loop and leaving the whole journey hidden forever.
    const failures = [];
    let processedCount = 0;
    for (const row of rows) {
      const originalFile = originalFiles.find(
        (f) => path.parse(f).name === row.current_name
      );
      if (!originalFile) {
        console.warn(`⚠️ Original file for ${row.current_name} not found, skipping`);
        failures.push({ rpiKey: row.rpi_key, name: row.original_name, error: 'original file missing' });
        continue;
      }

      const originalPath = path.join(originalDir, originalFile);
      const webpOutputPath = path.join(webpDir, `${row.current_name}.webp`);
      const smOutputPath = path.join(smDir, `${row.current_name}.webp`);

      try {
        if (row.media_type === 'video') {
          const videoOutputPath = path.join(videoDir, `${row.current_name}.mp4`);
          await processVideo(originalPath, { webpOutputPath, videoOutputPath });
        } else {
          await convertToWebP(originalPath, webpOutputPath);
        }

        await createThumbnails(webpOutputPath, smOutputPath, 300, 300);
        processedCount++;
      } catch (fileErr) {
        console.error(`❌ Processing failed for ${originalFile} (rps_key ${rpsKey}):`, fileErr);
        failures.push({ rpiKey: row.rpi_key, name: row.original_name, error: fileErr.message });
      }
    }

    // Only update DB if safeRockNumber > 0
    // Publish whatever processed (decided with the family: a partly-failed
    // upload still appears, and the admin email below lists what didn't).
    // Failed files stay show=false so the site never links to a missing
    // webp; nothing processed at all = stays hidden.
    if (safeRockNumber > 0 && rpsKey && processedCount > 0) {
      const failedKeys = failures.map((f) => f.rpiKey).filter(Boolean);
      await db.query('UPDATE journey SET show = true WHERE rps_key = $1', [rpsKey]);
      await db.query(
        'UPDATE journey_image SET show = true WHERE rps_key = $1 AND NOT (rpi_key = ANY($2::int[]))',
        [rpsKey, failedKeys]
      );
      console.log(`✅ Updated DB show flags for rps_key ${rpsKey}`);

      // The stop is visible now — tell this rock's followers. Isolated so a
      // mail problem never fails the rest of the upload pipeline.
      try {
        await notifyFollowers(safeRockNumber, { location: locationSafe, date: dateSafe });
      } catch (err) {
        console.error(`⚠️ Follower notification failed for rock ${safeRockNumber}:`, err);
      }
    }

    console.log(`✅ Finished background processing for ${baseDir}`);

    // --- Render the "New Rock Journey (to admin)" template (Page Details);
    // its Active switch turns this notification off. ---
    const rendered = await renderEmailTemplate('new-journey-email', {
      ROCK_NUMBER: safeRockNumber,
      NAME: name,
      DATE: dateSafe || 'Not provided',
      LOCATION: locationSafe,
      COMMENT: commentSafe,
      SUBMITTER_EMAIL: emailSafe || 'Not provided',
    });
    if (!rendered || !rendered.visible) {
      // The routine notification is switched off, but failures still need
      // a human -- send just the failure note.
      if (failures.length) {
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: `[${failures.length} FILE(S) FAILED] Rock upload: Rock ${safeRockNumber}`,
          html: failureNoteHtml(failures, processedCount, rpsKey),
        });
      }
      return;
    }

    const subject = rendered.subject;

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
      to: ADMIN_EMAIL,
      subject: failures.length ? `[${failures.length} FILE(S) FAILED] ${subject}` : subject,
      html: failureNoteHtml(failures, processedCount, rpsKey) + rendered.html,
      attachments,
    });

  } catch (err) {
    console.error(`❌ Background processing failed for ${baseDir}`, err);

    // Something outside the per-file loop failed (DB, disk, template): tell
    // the admin rather than leaving a hidden journey nobody knows about.
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `Rock upload processing FAILED: Rock ${safeRockNumber}`,
        html: `<p>Processing the upload for rock ${safeRockNumber} (journey #${rpsKey}) failed, so it may still be hidden in Journey admin.</p>
<p>Error: ${escapeHtml(err.message)}</p><p>Folder: ${escapeHtml(baseDir)}</p>`,
      });
    } catch (mailErr) {
      console.error('❌ Could not send the processing-failure email:', mailErr);
    }
  }
}

module.exports = processImagesInBackground;
