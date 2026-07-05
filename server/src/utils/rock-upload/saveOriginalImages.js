const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const probeVideo = require('../probeVideo');
const isVideoFile = require('../isVideoFile');

// Each descriptor is either inline ({ originalname, buffer }, small files sent
// in the same request) or staged ({ originalname, stagedPath }, large files
// pre-uploaded in chunks). Either way, the file lands at fullPath before any
// metadata is read, so image vs video probing can share one code path.
async function saveOriginalImages(files, destDir, uuid, client, rpsKey) {
  const imageMetadata = [];
  const imageNames = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.originalname);
    const baseName = `${i + 1}_${uuid}`;
    const fullName = baseName + ext;
    const fullPath = path.join(destDir, fullName);

    if (file.stagedPath) {
      await fs.move(file.stagedPath, fullPath, { overwrite: true });
    } else {
      await fs.writeFile(fullPath, file.buffer);
    }

    const isVideo = isVideoFile(fullName);
    let width = null;
    let height = null;
    let duration = null;

    if (isVideo) {
      const metadata = await probeVideo(fullPath);
      width = metadata.width;
      height = metadata.height;
      duration = metadata.duration;
    } else {
      const metadata = await sharp(fullPath).metadata();
      width = metadata.width || null;
      height = metadata.height || null;
    }

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
        height,
        media_type,
        duration_seconds
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        rpsKey,
        file.originalname,
        baseName,
        i + 1,
        width,
        height,
        isVideo ? 'video' : 'photo',
        duration,
      ]
    );
  }

  return { imageMetadata, imageNames };
}

module.exports = saveOriginalImages;
