// Server-side facts about an activity request (POST /api/activity) that the
// browser isn't trusted to report itself: its IP, location, and whether it's
// internal traffic or a bot.
const geoip = require('geoip-lite');

// "::ffff:1.2.3.4" (IPv4 seen through an IPv6 socket) -> "1.2.3.4".
function clientIp(req) {
  const ip = req.ip || '';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

const PRIVATE_IP_RE = /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|f[cd][0-9a-f]{2}:|fe80:)/i;

const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
};

// Dev site / home network: a private or loopback IP, or a page served from
// anywhere other than PUBLIC_SITE_URL's host (www. ignored). Flagged, not
// dropped -- the dashboard's "Include internal" toggle shows it.
function isInternalRequest(req, ip = clientIp(req)) {
  if (PRIVATE_IP_RE.test(ip)) return true;
  const siteHost = hostOf(process.env.PUBLIC_SITE_URL || '');
  const pageHost = hostOf(req.get('origin') || '');
  return Boolean(siteHost && pageHost && siteHost !== pageHost);
}

// Same shape the old Tracker stored in counter_tracking.geo.
function geoFor(ip) {
  const geo = geoip.lookup(ip);
  if (!geo) return null;
  return {
    country: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
    latitude: geo.ll?.[0] ?? null,
    longitude: geo.ll?.[1] ?? null,
  };
}

// Crawlers and headless tools that run JavaScript. Most bots never run the
// tracker at all; these are the ones that do.
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|python-requests|curl\/|wget/i;

const isBotUserAgent = (ua) => !ua || BOT_RE.test(ua);

module.exports = { clientIp, isInternalRequest, geoFor, isBotUserAgent };
