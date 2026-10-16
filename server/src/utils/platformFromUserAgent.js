// Maps a visit's user_agent to the platform name shown on the admin
// Statistics / Visitors by Day panels. navigator.platform (the stored
// `platform` column) is unreliable, so this reads the user agent instead.
// The order matters: iPad/iPhone user agents also contain "Mac", and
// Android ones contain "Linux".
const PLATFORMS = ["Android", "iPhone", "iPad", "Mac", "Windows", "Linux", "Other"];

function platformFromUserAgent(ua) {
  ua = ua || "";
  if (/android/i.test(ua)) return "Android";
  if (/iPhone|iPod/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Macintosh|MacIntel/.test(ua)) return "Mac";
  if (/Windows|Win32|Win64/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

module.exports = { platformFromUserAgent, PLATFORMS };
