const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Ensure temp directory exists. Under media/.staging (like the other
// upload staging dirs) because express.static never serves dot-folders --
// media/temp was publicly downloadable while a file sat in it.
const tempDir = path.resolve('media', '.staging', 'temp');
fs.ensureDirSync(tempDir);

// Configure multer
const upload = multer({
  storage: multer.diskStorage({
    // multer doesn't create a destination given as a function, so make
    // sure it still exists (it lives under media/.staging, which gets
    // cleaned up).
    destination: (req, file, cb) => {
      fs.ensureDir(tempDir)
        .then(() => cb(null, tempDir))
        .catch(cb);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 10,
  },
});

module.exports = upload;
