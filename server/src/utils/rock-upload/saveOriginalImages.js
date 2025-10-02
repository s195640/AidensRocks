const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

async function saveOriginalImages(files, destDir, uuid, client, rpsKey) {
  const imageMetadata = [];
  const imageNames = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.originalname);
    const baseName = `${i + 1}_${uuid}`;
    const fullName = baseName + ext;
    const fullPath = path.join(destDir, fullName);

    // Use sharp to get metadata from buffer
    const metadata = await sharp(file.buffer).metadata();
    const width = metadata.width || null;
    const height = metadata.height || null;

    await fs.writeFile(fullPath, file.buffer);

    imageNames.push(fullName);
    imageMetadata.push(`  [${i + 1}] ${file.originalname} → ${fullName} (${width}x${height})`);

    await client.query(
      `
      INSERT INTO journey_image (
        rps_key,
        original_name,
        current_name,
        upload_order,
        width,
        height
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [rpsKey, file.originalname, baseName, i + 1, width, height]
    );
  }

  return { imageMetadata, imageNames };
}

module.exports = saveOriginalImages;
