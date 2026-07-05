// utils/isVideoFile.js
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|avi|mkv)$/i;

function isVideoFile(filename) {
  return VIDEO_EXTENSIONS.test(filename);
}

module.exports = isVideoFile;
module.exports.VIDEO_EXTENSIONS = VIDEO_EXTENSIONS;
