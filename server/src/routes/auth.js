const express = require('express');
const jwt = require('jsonwebtoken');
const requireAdminAuth = require('../middleware/requireAdminAuth');

const router = express.Router();

// POST /api/auth/login - checks credentials against server-only env vars,
// returns a signed JWT for use as `Authorization: Bearer <token>` on
// admin-only routes.
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    });
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// GET /api/auth/verify - lets the client confirm a stored token is still
// valid (e.g. after a page refresh) without re-implementing JWT
// verification in the browser.
router.get('/verify', requireAdminAuth, (req, res) => {
  res.json({ valid: true });
});

module.exports = router;
