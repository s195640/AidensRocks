const fs = require('fs').promises;
const path = require('path');

async function saveOriginalImages(files, destDir, uuid, client, rpsKey) {
  const imageMetadata = [];
  const imageNames = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.originalname);
    const baseName = `${i + 1}_${uuid}`;
    const fullName = baseName + ext;
    const fullPath = path.join(destDir, fullName);

    await fs.writeFile(fullPath, file.buffer);

    imageNames.push(fullName);
    imageMetadata.push(`  [${i + 1}] ${file.originalname} → ${fullName}`);

    await client.query(
      `
      INSERT INTO Rock_Post_Image (
        rps_key,
        original_name,
        current_name,
        upload_order
      )
      VALUES ($1, $2, $3, $4)
      `,
      [rpsKey, file.originalname, baseName, i + 1]
    );
  }

  return { imageMetadata, imageNames };
}

module.exports = saveOriginalImages;
