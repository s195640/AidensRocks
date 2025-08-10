const express = require('express');
const fs = require('fs').promises;
const fssync = require('fs');
const pathModule = require('path');
const convertToWebP = require('../utils/convert-to-webp/convertToWebP');
const createThumbnails = require('../utils/convert-to-webp/createThumbnails');
const ensureDir = require('../utils/ensureDir');
const updateRockPostImageSizes = require('../utils/updateRockPostImageSizeDB');
const pool = require('../db/pool');

const router = express.Router();

router.post('/create-images', async (req, res) => {
  const { path, regenerate = false } = req.body;

  if (!path) {
    return res.status(400).json({ error: 'Missing path' });
  }

  const validExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];

  try {
    const rootPath = pathModule.resolve(path);
    const stats = await fs.stat(rootPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Provided path is not a directory.' });
    }

    // Recursively find all "o" image folders
    async function findOImageFolders(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let result = [];

      for (const entry of entries) {
        const fullPath = pathModule.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'o') {
            result.push(fullPath);
          } else {
            result = result.concat(await findOImageFolders(fullPath));
          }
        }
      }
      return result;
    }

    const oImageFolders = await findOImageFolders(rootPath);
    if (oImageFolders.length === 0) {
      return res.status(404).json({ error: 'No o folders found.' });
    }

    let skipped = 0;
    let processed = 0;

    // Get a DB client from pool for all updates
    const client = await pool.connect();

    try {
      for (const oImagesPath of oImageFolders) {
        const parentDir = pathModule.dirname(oImagesPath);
        const webPPath = pathModule.join(parentDir, 'webp');
        const smPath = pathModule.join(parentDir, 'sm');

        const webPExists = fssync.existsSync(webPPath);
        const smExists = fssync.existsSync(smPath);

        if (webPExists || smExists) {
          if (regenerate) {
            if (webPExists) await fs.rm(webPPath, { recursive: true, force: true });
            if (smExists) await fs.rm(smPath, { recursive: true, force: true });
            console.log(`Regenerating: ${oImagesPath}`);
          } else {
            console.log(`Skipping ${oImagesPath} (folders already exist)`);
            skipped++;
            continue;
          }
        }

        await ensureDir(webPPath);
        await ensureDir(smPath);

        // Filter valid image files
        const imageFiles = (await fs.readdir(oImagesPath)).filter(file =>
          validExtensions.includes(pathModule.extname(file).toLowerCase())
        );

        if (imageFiles.length === 0) {
          console.log(`No valid images in ${oImagesPath}`);
          skipped++;
          continue;
        }

        await convertToWebP(oImagesPath, webPPath);

        // Create thumbnails (300x300 from the webp folder)
        await createThumbnails(webPPath, smPath, 300, 300);

        // Update DB image sizes
        await updateRockPostImageSizes(client, oImagesPath);

        console.log(`Processed: ${oImagesPath}`);
        processed++;
      }
    } finally {
      client.release();
    }

    return res.status(200).json({
      message: `✅ Completed. Processed: ${processed}, Skipped: ${skipped}`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

module.exports = router;
