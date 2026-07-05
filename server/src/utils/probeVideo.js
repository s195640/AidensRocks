// utils/probeVideo.js
const ffmpeg = require('fluent-ffmpeg');

function probeVideo(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return reject(err);

      const videoStream = data.streams?.find((s) => s.codec_type === 'video');
      const duration = data.format?.duration
        ? Math.round(data.format.duration)
        : null;

      resolve({
        width: videoStream?.width || null,
        height: videoStream?.height || null,
        duration,
      });
    });
  });
}

module.exports = probeVideo;
