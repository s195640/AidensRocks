const { requireAuth, LEVELS } = require('./requireAuth');

// Gates admin-only routes behind a signed-in admin account (level 50), via
// a JWT issued by POST /api/auth/login. Expects `Authorization: Bearer <token>`.
module.exports = requireAuth(LEVELS.ADMIN);
