const fs = require('fs').promises;
const path = require('path');

async function saveMetadataFile(
  dir,
  {
    timestamp,
    safeRockNumber,
    safeRockNumberQr,
    locationSafe,
    date,
    commentSafe,
    name,
    email,
    imageMetadata,
    trackerInfo,
    uuid,
  }
) {
  const content = `UUID: ${uuid}
Timestamp: ${timestamp}
Rock Number: ${safeRockNumber}
QR Number: ${safeRockNumberQr}
Name: ${name || 'unknown'}
Email: ${email || 'unknown'}
Location: ${locationSafe}
Date: ${date}
Comment: ${commentSafe}

Images:
${imageMetadata.join('\n')}

Tracking:
${trackerInfo}
`;
  await fs.writeFile(path.join(dir, 'metadata.txt'), content, 'utf8');
}

module.exports = saveMetadataFile;
