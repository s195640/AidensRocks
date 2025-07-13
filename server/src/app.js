const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const cors = require('cors');
app.use(cors());
require('dotenv').config();

// Write file to truenas-media volume
app.post('/api/write-file', async (req, res) => {
  const { filename, content } = req.body;
  try {
    // Sanitize filename to prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join('/app/media', safeFilename);
    await fs.writeFile(filePath, content);
    res.json({ message: 'File written successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write file: ' + error.message });
  }
});

// Read file from truenas-media volume
app.get('/api/read-file/:filename', async (req, res) => {
  try {
    // Sanitize filename to prevent path traversal
    const safeFilename = path.basename(req.params.filename);
    const filePath = path.join('/app/media', safeFilename);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read file: ' + error.message });
  }
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Serve static files from /app/media at /media route
app.use('/media', express.static('/app/media'));

console.log('Express version:', require('express/package.json').version);
app.use(express.json());
app.use((req, res, next) => {
  console.log('Raw body:', req.body);
  next();
});

app.post('/api/test', (req, res) => {
  console.log('POST /api/test - Body:', req.body);
  res.json({ body: req.body });
});

// Get row count
app.get('/api/testdata/count', async (req, res) => {
  try {
    console.log('COUNT');
    const result = await pool.query('SELECT COUNT(*) FROM testdata');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add new row
app.post('/api/testdata', async (req, res) => {
  console.log('POST /api/test - Body:', req.body);
  const { comment, date } = req.body;
  try {
    await pool.query('INSERT INTO testdata (comment, date) VALUES ($1, $2)', [
      comment,
      date,
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding row:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get(`/api/test`, async (req, res) => {
  console.log('CAlled TESTING');
  res.json('TEST AGAIN');
});

app.get(`/api/ip`, async (req, res) => {
  console.log('calling ip address lookup');
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'Unknown';
  res.json({ ip });
});

app.get('/api/location', (req, res) => {
  // Get client IP (Note: req.ip may need adjustment in production, e.g., behind proxies)
  const ip = req.ip === '::1' ? '127.0.0.1' : req.ip; // Handle localhost
  const geo = geoip.lookup(ip);

  if (geo) {
    res.json({
      ip: ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      ll: geo.ll, // Latitude and longitude
    });
  } else {
    res.status(404).json({ error: 'Geolocation data not found' });
  }
});

// app.use('/', router);
const PORT = 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
