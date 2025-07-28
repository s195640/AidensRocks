const express = require('express');
const fs = require('fs').promises;
const fssync = require('fs');
const pathModule = require('path');
const sharp = require('sharp');

const router = express.Router();

router.post('/create-images', async (req, res) => {
  const { path } = req.body;

  if (!path) {
    return res.status(400).json({ error: 'Missing path' });
  }

  const validExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'];

  try {
    const rootPath = pathModule.resolve(path);
    const stats = await fs.stat(rootPath);
    if (!stats.isDirectory()) {
      return res
        .status(400)
        .json({ error: 'Provided path is not a directory.' });
    }

    // Helper: Recursively find all folders named "o_images"
    async function findOImageFolders(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let result = [];

      for (const entry of entries) {
        const fullPath = pathModule.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'o_images') {
            result.push(fullPath);
          } else {
            const nested = await findOImageFolders(fullPath);
            result = result.concat(nested);
          }
        }
      }

      return result;
    }

    const oImageFolders = await findOImageFolders(rootPath);

    if (oImageFolders.length === 0) {
      return res.status(404).json({ error: 'No o_images folders found.' });
    }

    let skipped = 0;
    let processed = 0;

    for (const oImagesPath of oImageFolders) {
      const parentDir = pathModule.dirname(oImagesPath);
      const webPPath = pathModule.join(parentDir, 'webP_images');
      const smPath = pathModule.join(parentDir, 'sm_images');

      if (fssync.existsSync(webPPath) || fssync.existsSync(smPath)) {
        console.log(
          `Skipping ${oImagesPath} (webP_images or sm_images already exist)`
        );
        skipped++;
        continue;
      }

      await fs.mkdir(webPPath);
      await fs.mkdir(smPath);

      const imageFiles = await fs.readdir(oImagesPath);
      const webPTasks = imageFiles.map(async (file) => {
        const ext = pathModule.extname(file).toLowerCase();
        if (!validExtensions.includes(ext)) return;

        const inputPath = pathModule.join(oImagesPath, file);
        const outputFilename = pathModule.parse(file).name + '.webp';
        const webPOutput = pathModule.join(webPPath, outputFilename);
        const smOutput = pathModule.join(smPath, outputFilename);

        await sharp(inputPath).toFormat('webp').toFile(webPOutput);
        await sharp(webPOutput).resize({ width: 300 }).toFile(smOutput);
      });

      await Promise.all(webPTasks);
      console.log(`Processed: ${oImagesPath}`);
      processed++;
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
