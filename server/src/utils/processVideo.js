// utils/processVideo.js
const ffmpeg = require('fluent-ffmpeg');
const probeVideo = require('./probeVideo');

function extractPosterFrame(inputPath, outputPath, timestampSeconds) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .seekInput(timestampSeconds)
      .frames(1)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

// Most phone/camera uploads are already H.264/AAC, so a stream copy (no
// re-encode) is enough to standardize the container to .mp4. Only fall back
// to a full transcode when the source codec can't be copied into an mp4 box.
function remuxToMp4(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const transcode = () => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-movflags +faststart'])
        .format('mp4')
        .save(outputPath)
        .on('end', resolve)
        .on('error', reject);
    };

    ffmpeg(inputPath)
      .outputOptions(['-c copy', '-movflags +faststart'])
      .format('mp4')
      .save(outputPath)
      .on('end', resolve)
      .on('error', transcode);
  });
}

async function processVideo(inputPath, { webpOutputPath, videoOutputPath }) {
  const { duration, width, height } = await probeVideo(inputPath);

  // Avoid seeking past the end of very short clips.
  const posterTimestamp = duration ? Math.min(1, duration / 2) : 0;
  await extractPosterFrame(inputPath, webpOutputPath, posterTimestamp);

  await remuxToMp4(inputPath, videoOutputPath);

  return { duration, width, height };
}

module.exports = processVideo;
