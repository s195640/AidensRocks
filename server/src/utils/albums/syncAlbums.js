const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const db = require('../../db/pool');

const baseDir = path.resolve('media', 'albums');

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

    if (!(await fs.pathExists(oPath))) {
      console.log(`⚠️ Skipping ${album}: 'o' folder missing`);
      continue;
    }

    await fs.ensureDir(webpPath);
    await fs.ensureDir(webp300Path);

    const files = (await fs.readdir(oPath)).filter((f) =>
      /\.(jpg|jpeg|png)$/i.test(f)
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
      const basename = path.parse(file).name;
      const webpFile = basename + '.webp';

      const inputPath = path.join(oPath, file);
      const webpOutputPath = path.join(webpPath, webpFile);
      const webp300OutputPath = path.join(webp300Path, webpFile);

      const webpExists = await fs.pathExists(webpOutputPath);
      const webp300Exists = await fs.pathExists(webp300OutputPath);

      if (!webpExists) {
        console.log(`🖼️ Converting to webp: ${file}`);
        await sharp(inputPath)
          .rotate() // <-- this fixes EXIF orientation
          .webp()
          .toFile(webpOutputPath);
      } else {
        console.log(`✅ Webp exists: ${webpFile}`);
      }

      if (!webp300Exists) {
        console.log(`🔧 Creating 300x300 version of ${webpFile}`);
        await sharp(webpOutputPath)
          .rotate()
          .resize(300, 300, { fit: 'cover' })
          .toFile(webp300OutputPath);
      } else {
        console.log(`✅ 300x300 exists: ${webpFile}`);
      }

      // Add photo to DB if it doesn't exist
      const existingPhoto = await db.query(
        `SELECT * FROM Photos WHERE name = $1 AND pa_key = $2`,
        [webpFile, pa_key]
      );

      if (existingPhoto.rows.length === 0) {
        const { width, height } = await sharp(webpOutputPath).metadata();
        photoOrder += 1;
        console.log(`📸 Adding photo to DB: ${webpFile} (order ${photoOrder})`);

        await db.query(
          `INSERT INTO Photos (pa_key, name, display_name, "desc", order_num, show, width, height)
   VALUES ($1, $2, '', '', $3, true, $4, $5)`,
          [pa_key, webpFile, photoOrder, width, height]
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
