const fs = require('fs-extra');
const path = require('path');
const db = require('../../db/pool');

const ensureDir = require('../ensureDir');
const convertToWebP = require('../convert-to-webp/convertToWebP');
const createThumbnails = require('../convert-to-webp/createThumbnails');
const processVideo = require('./processVideo');

const baseDir = path.resolve('media', 'albums');

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|avi|mkv)$/i;

async function syncAlbums() {
  console.log('🔄 Starting incremental album sync...');

  const dirs = await fs.readdir(baseDir);
  const albums = dirs.filter((d) =>
    fs.statSync(path.join(baseDir, d)).isDirectory()
  );

  for (const album of albums) {
    console.log(`📁 Album: ${album}`);

    const albumPath = path.join(baseDir, album);
    const oPath = path.join(albumPath, 'o');
    const webpPath = path.join(albumPath, 'webp');
    const webp300Path = path.join(albumPath, 'webp300x300');
    const videoPath = path.join(albumPath, 'video');

    if (!(await fs.pathExists(oPath))) {
      console.log(`⚠️ Skipping ${album}: 'o' folder missing`);
      continue;
    }

    await ensureDir(webpPath);
    await ensureDir(webp300Path);
    await ensureDir(videoPath);

    const files = (await fs.readdir(oPath)).filter(
      (f) => /\.(jpg|jpeg|png)$/i.test(f) || VIDEO_EXTENSIONS.test(f)
    );

    // Ensure album exists
    let pa_key;
    const existingAlbum = await db.query(
      'SELECT * FROM PhotoAlbums WHERE name = $1',
      [album]
    );

    if (existingAlbum.rows.length === 0) {
      console.log(`📂 Creating new album in DB: ${album}`);

      const { rows } = await db.query(
        `SELECT COALESCE(MAX(order_num), 0) + 1 AS next_order FROM PhotoAlbums`
      );
      const nextOrder = rows[0].next_order;

      const insertRes = await db.query(
        `INSERT INTO PhotoAlbums (name, display_name, "desc", order_num, show)
         VALUES ($1, $1, '', $2, true) RETURNING pa_key`,
        [album, nextOrder]
      );

      pa_key = insertRes.rows[0].pa_key;
    } else {
      pa_key = existingAlbum.rows[0].pa_key;
    }

    // Get max photo order_num for this album
    const orderRes = await db.query(
      'SELECT COALESCE(MAX(order_num), 0) AS max_order FROM Photos WHERE pa_key = $1',
      [pa_key]
    );
    let photoOrder = orderRes.rows[0].max_order;

    for (const file of files) {
      const isVideo = VIDEO_EXTENSIONS.test(file);
      const basename = path.parse(file).name;
      const webpFile = basename + '.webp';

      const inputPath = path.join(oPath, file);
      const webpOutputPath = path.join(webpPath, webpFile);
      const webp300OutputPath = path.join(webp300Path, webpFile);

      let duration = null;

      if (isVideo) {
        const videoOutputPath = path.join(videoPath, basename + '.mp4');
        console.log(`🎬 Processing video: ${file}`);
        const result = await processVideo(inputPath, {
          webpOutputPath,
          videoOutputPath,
        });
        duration = result.duration;
        // Original was probed/remuxed into video/; the o/ copy is now redundant.
        await fs.remove(inputPath);
      } else {
        const webpExists = await fs.pathExists(webpOutputPath);

        if (!webpExists) {
          console.log(`🖼️ Converting to webp: ${file}`);
          await convertToWebP(inputPath, webpOutputPath);
        } else {
          console.log(`✅ Webp exists: ${webpFile}`);
        }
      }

      const webp300Exists = await fs.pathExists(webp300OutputPath);
      if (!webp300Exists) {
        console.log(`🔧 Creating 300x300 version of ${webpFile}`);
        // Create 300x300 thumbnail
        await createThumbnails(webpOutputPath, webp300OutputPath, 300, 300);
      } else {
        console.log(`✅ 300x300 exists: ${webpFile}`);
      }

      // Add photo/video to DB if it doesn't exist
      const existingPhoto = await db.query(
        `SELECT * FROM Photos WHERE name = $1 AND pa_key = $2`,
        [webpFile, pa_key]
      );

      if (existingPhoto.rows.length === 0) {
        const sharp = require('sharp');
        const { width, height } = await sharp(webpOutputPath).metadata();
        photoOrder += 1;
        console.log(`📸 Adding ${isVideo ? 'video' : 'photo'} to DB: ${webpFile} (order ${photoOrder})`);

        await db.query(
          `INSERT INTO Photos (pa_key, name, display_name, "desc", order_num, show, width, height, media_type, duration_seconds)
           VALUES ($1, $2, '', '', $3, true, $4, $5, $6, $7)`,
          [pa_key, webpFile, photoOrder, width, height, isVideo ? 'video' : 'photo', duration]
        );
      } else {
        console.log(`✅ Photo exists in DB: ${webpFile}`);
      }
    }
  }

  console.log('✅ Album sync complete.');
  return { success: true };
}

module.exports = syncAlbums;
