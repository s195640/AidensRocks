// Groups errors: two occurrences of "the same error" get the same
// fingerprint (an error_group row), however their numbers, ids and quoted
// values differ. Computed on the server; the browser's own value is never
// trusted. See the plan's "Error tracking" > "Grouping and status".
const crypto = require('crypto');

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function normalizeMessage(message) {
  return String(message ?? '')
    .replace(UUID_RE, '<id>')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/(["'`])[^"'`]*\1/g, '<str>')
    .replace(/\b0x[0-9a-f]+\b/gi, '<n>')
    .replace(/\d+/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

// "index-7OgNxUl1.js" -> "index.js": the build hash changes every release,
// and the same bug shouldn't become a new group each deploy.
const stripBuildHash = (file) => file.replace(/-[A-Za-z0-9_]{8}(?=\.m?js$)/, '');

// First stack frame as "file" (browser: minified function names change per
// build, so file only) or "function@file" (server).
function topFrame(stack, { withFunction = false } = {}) {
  for (const line of String(stack ?? '').split('\n').slice(0, 12)) {
    // Chrome/Node: "    at fn (file:line:col)" or "    at file:line:col"
    // Firefox/Safari: "fn@file:line:col"
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):\d+:\d+\)?$/) || line.match(/^(.*?)@(.+?):\d+:\d+$/);
    if (!m) continue;
    const file = stripBuildHash((m[2].split('?')[0].split('/').pop() || '').trim());
    if (!file || file.startsWith('node:')) continue;
    return withFunction && m[1] ? `${m[1]}@${file}` : file;
  }
  return '';
}

// API or media path as a pattern: numbers -> :n, ids -> :id, and for media
// the file name -> *, so every broken photo of one kind is one group.
function pathPattern(path, { media = false } = {}) {
  let p = String(path ?? '').split('?')[0].replace(UUID_RE, ':id').replace(/\/\d+(?=\/|$)/g, '/:n');
  if (media) p = p.replace(/\/[^/]+$/, '/*');
  return p.slice(0, 200);
}

const hash = (...parts) => crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);

const clip = (s, n) => String(s ?? '').slice(0, n);

// Browser error event -> { fingerprint, title }. `event` is a cleaned
// site_event ({ type, target_id, meta }).
function forClientEvent({ type, target_id: targetId, meta = {} }) {
  const m = meta || {};
  switch (type) {
    case 'client_error':
      return {
        fingerprint: hash(type, normalizeMessage(m.message), topFrame(m.stack) || stripBuildHash(String(m.source || '').split('/').pop())),
        title: clip(m.message || 'JavaScript error', 300),
      };
    case 'render_crash':
      return {
        fingerprint: hash(type, normalizeMessage(m.message), topFrame(m.stack)),
        title: clip(`Page crashed: ${m.message || 'unknown error'}`, 300),
      };
    case 'error_shown':
      return {
        fingerprint: hash(type, targetId || ''),
        title: clip(`Shown to visitor (${targetId}): ${m.message || ''}`, 300),
      };
    case 'media_error': {
      const pattern = pathPattern(targetId, { media: true });
      return { fingerprint: hash(type, m.kind || '', pattern), title: clip(`Broken ${m.kind || 'media'}: ${pattern}`, 300) };
    }
    case 'map_tile_error':
      return { fingerprint: hash(type, targetId || ''), title: clip(`Map tiles failing: ${targetId}`, 300) };
    case 'load_error': {
      const what = m.status ? String(m.status) : 'network error';
      return {
        fingerprint: hash(type, m.method || '', pathPattern(targetId), what),
        title: clip(`${m.method || 'GET'} ${pathPattern(targetId)} failed (${what})`, 300),
      };
    }
    default:
      return null;
  }
}

// Server error -> { fingerprint, title }.
function forServerError({ kind, method, route, status, message, stack }) {
  if (kind === 'request') {
    return {
      fingerprint: hash('server_request', method || '', route || '', status || '', normalizeMessage(message)),
      title: clip(`${method} ${route} → ${status}${message ? `: ${message}` : ''}`, 300),
    };
  }
  return {
    fingerprint: hash(`server_${kind}`, normalizeMessage(message), topFrame(stack, { withFunction: true })),
    title: clip(`${kind === 'email' ? 'Email failed' : kind === 'process' ? 'Unhandled error' : 'Background job failed'}: ${message}`, 300),
  };
}

const CLIENT_ERROR_TYPES = new Set(['client_error', 'render_crash', 'error_shown', 'media_error', 'map_tile_error', 'load_error']);

module.exports = { forClientEvent, forServerError, normalizeMessage, topFrame, pathPattern, CLIENT_ERROR_TYPES };
