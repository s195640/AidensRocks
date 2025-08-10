// utils/convert-to-webp/convertToWebP.js
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

async function convertToWebP(input, output, options = {}) {
  // If input is a directory, batch process
  const isDir = (await fs.lstat(input)).isDirectory();
  if (isDir) {
    const files = await fs.readdir(input);
    for (const file of files) {
      const inputPath = path.join(input, file);
      const outputPath = path.join(output, path.parse(file).name + '.webp');
      await sharp(inputPath)
        .rotate()
        .resize(options.width, options.height, { fit: options.fit || 'cover' })
        .toFormat('webp')
        .toFile(outputPath);
    }
  } else {
    // Single file mode
    await sharp(input)
      .rotate()
      .resize(options.width, options.height, { fit: options.fit || 'cover' })
      .toFormat('webp')
      .toFile(output);
  }
}

module.exports = convertToWebP;
