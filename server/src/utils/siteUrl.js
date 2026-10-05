// Absolute URL on the public site for links in account emails, e.g.
// siteUrl('/verify-email?token=abc'). Base comes from PUBLIC_SITE_URL in
// .env (no trailing slash needed).
function siteUrl(path) {
  const base = (process.env.PUBLIC_SITE_URL || 'http://localhost').replace(/\/+$/, '');
  return `${base}${path}`;
}

module.exports = siteUrl;
