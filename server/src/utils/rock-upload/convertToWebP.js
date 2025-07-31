const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

async function convertToWebP(inputDir, outputDir) {
  const files = await fs.readdir(inputDir);
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, path.parse(file).name + '.webp');
    await sharp(inputPath).toFormat('webp').toFile(outputPath);
  }
}

module.exports = convertToWebP;
