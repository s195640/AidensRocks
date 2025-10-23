const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../../media/temp');
fs.ensureDirSync(tempDir);

// Configure multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, tempDir);
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
