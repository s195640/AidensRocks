const { LEVELS } = require('../middleware/requireAuth');

// Public list endpoints (albums, photos, music) hide show=false rows. The
// admin pages that manage those rows call the same endpoints with
// ?includeHidden=1 -- honoured only for a signed-in admin (the route must
// run optionalAuth first), so the public can't ask for hidden content.
const includeHidden = (req) =>
  req.query.includeHidden === '1' && (req.account?.access_level ?? 0) >= LEVELS.ADMIN;

module.exports = includeHidden;
