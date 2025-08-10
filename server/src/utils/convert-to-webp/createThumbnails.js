// utils/convert-to-webp/createThumbnails.js
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

async function createThumbnails(input, output, width = 300, height = 300) {
  const isDir = (await fs.lstat(input)).isDirectory();
  if (isDir) {
    const files = await fs.readdir(input);
    for (const file of files) {
      const inputPath = path.join(input, file);
      const outputPath = path.join(output, file);
      await sharp(inputPath)
        .rotate()
        .resize(width, height, {
          fit: sharp.fit.cover,
          position: sharp.strategy.center,
        })
        .toFile(outputPath);
    }
  } else {
    await sharp(input)
      .rotate()
      .resize(width, height, {
        fit: sharp.fit.cover,
        position: sharp.strategy.center,
      })
      .toFile(output);
  }
}

module.exports = createThumbnails;
