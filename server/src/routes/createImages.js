const express = require('express');
const fs = require('fs').promises;
const fssync = require('fs');
const pathModule = require('path');
const sharp = require('sharp');

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
      return res
        .status(400)
        .json({ error: 'Provided path is not a directory.' });
    }

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

      const webPExists = fssync.existsSync(webPPath);
      const smExists = fssync.existsSync(smPath);

      if (webPExists || smExists) {
        if (regenerate) {
          if (webPExists)
            await fs.rm(webPPath, { recursive: true, force: true });
          if (smExists) await fs.rm(smPath, { recursive: true, force: true });
          console.log(`Regenerating: ${oImagesPath}`);
        } else {
          console.log(`Skipping ${oImagesPath} (folders already exist)`);
          skipped++;
          continue;
        }
      }

      await fs.mkdir(webPPath);
      await fs.mkdir(smPath);

      const imageFiles = (await fs.readdir(oImagesPath)).filter((file) => {
        const ext = pathModule.extname(file).toLowerCase();
        return validExtensions.includes(ext);
      });

      const isSingleImage = imageFiles.length === 1;
      const targetSize = isSingleImage ? 300 : 150;

      const webPTasks = imageFiles.map(async (file) => {
        const ext = pathModule.extname(file).toLowerCase();
        const inputPath = pathModule.join(oImagesPath, file);
        const baseName = pathModule.parse(file).name;
        const webPFilename = baseName + '.webp';
        const webPOutput = pathModule.join(webPPath, webPFilename);
        const smOutput = pathModule.join(smPath, webPFilename);

        // Convert to webp (or copy if already .webp)
        if (ext === '.webp') {
          await fs.copyFile(inputPath, webPOutput);
        } else {
          await sharp(inputPath).rotate().toFormat('webp').toFile(webPOutput);
        }

        // Create square centered thumbnail
        await sharp(webPOutput)
          .resize(targetSize, targetSize, {
            fit: 'cover',
            position: 'center',
          })
          .toFile(smOutput);
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
