const express = require('express');
const path = require('path');
const app = express();
const router = express.Router();
const cors = require('cors');
app.use(cors());

// Serve static files from /app/media at /media route
app.use('/media', express.static('/app/media'));

router.get(`/api/test`, async (req, res) => {
  console.log('CAlled TESTING');
  res.json('TEST AGAIN');
});
router.get(`/api/ip`, async (req, res) => {
  console.log('calling ip address lookup');
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'Unknown';
  res.json({ ip });
});

router.get('/api/location', (req, res) => {
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

app.use('/', router);
// Start server
const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
