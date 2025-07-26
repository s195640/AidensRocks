const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

router.post('/write-file', async (req, res, next) => {
  try {
    const { filename, content } = req.body;
    const safeFilename = path.basename(filename);
    const filePath = path.resolve('media', safeFilename);
    await fs.writeFile(filePath, content);
    res.json({ message: 'File written successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/read-file/:filename', async (req, res, next) => {
  try {
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.resolve('media', safeFilename);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
