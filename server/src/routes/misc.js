const express = require('express');
const geoip = require('geoip-lite');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json('TEST AGAIN! Again');
});

router.get('/ip', (req, res) => {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'Unknown';
  res.json({ ip });
});

router.get('/location', (req, res) => {
  const ip = req.ip === '::1' ? '127.0.0.1' : req.ip;
  const geo = geoip.lookup(ip);

  if (geo) {
    res.json({
      ip: ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      ll: geo.ll,
    });
  } else {
    res.status(404).json({ error: 'Geolocation data not found' });
  }
});

module.exports = router;
