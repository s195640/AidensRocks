const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

async function createThumbnails(inputDir, outputDir) {
  const files = await fs.readdir(inputDir);
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    await sharp(inputPath)
      .resize(125, 125, {
        fit: sharp.fit.cover,
        position: sharp.strategy.entropy,
      })
      .toFile(outputPath);
  }
}

module.exports = createThumbnails;
