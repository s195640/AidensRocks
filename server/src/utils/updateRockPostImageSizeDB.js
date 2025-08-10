    const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

async function updateRockPostImageSizes(client, folderPath) {
  if (!folderPath.includes('/media/rocks')) {
    console.log('Folder not inside /media/rocks, skipping updateRockPostImageSizes');
    return;
  }

  // Read all files in the folder
  let files;
  try {
    files = await fs.readdir(folderPath);
  } catch (err) {
    console.error('Error reading folder:', folderPath, err);
    return;
  }

  for (const fileName of files) {
    const filePath = path.join(folderPath, fileName);
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) continue;

      // Extract the base name without extension, this should match current_name in DB
      const baseName = path.parse(fileName).name;

      // Query DB for matching current_name
      const { rows } = await client.query(
        'SELECT rpi_key FROM Rock_Post_Image WHERE current_name = $1',
        [baseName]
      );

      if (rows.length === 0) {
        // No matching DB record found
        continue;
      }

      // Get image metadata (width, height) using sharp
      const metadata = await sharp(filePath).metadata();
      const width = metadata.width || null;
      const height = metadata.height || null;

      // Update DB record with width and height
      await client.query(
        `UPDATE Rock_Post_Image 
         SET width = $1, height = $2, update_dt = CURRENT_TIMESTAMP
         WHERE rpi_key = $3`,
        [width, height, rows[0].rpi_key]
      );

      console.log(`Updated image size in DB for ${baseName}: ${width}x${height}`);

    } catch (err) {
      console.error(`Error processing file ${fileName}:`, err);
    }
  }
}

module.exports = updateRockPostImageSizes;
