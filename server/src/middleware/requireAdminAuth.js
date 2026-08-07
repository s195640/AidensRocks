const jwt = require('jsonwebtoken');

// Gates admin-only routes behind a valid JWT issued by POST /api/auth/login.
// Expects `Authorization: Bearer <token>`.
module.exports = function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
