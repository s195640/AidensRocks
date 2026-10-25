// A short, plain-words category for an error group ("Connection drop",
// "Sign-in failed", ...), shown in Site Health next to the technical type.
// Worked out from the group's type and title (fingerprint.js builds both),
// so it's never stored and applies to existing groups too.

// Messages shown to visitors, by the fixed code each spot reports
// (client useShownError / reportShownError). Codes not listed fall back
// to "Couldn't load" for *_load and "Message shown" otherwise.
const SHOWN_CATEGORIES = {
  signin: 'Sign-in failed',
  signup: 'Sign-up failed',
  forgot_password: 'Password reset',
  reset_password: 'Password reset',
  verify_email: 'Email verify',
  upload_submit: 'Upload failed',
  upload_files: 'Upload files',
  rock_request: 'Rock request',
  track_rock_number: 'Bad input',
  my_rocks: 'My rocks',
  entry_not_found: 'Not found',
};

// A failed request's status ("network error", "500", ...).
function requestCategory(what) {
  if (what === 'network error') return 'Connection drop';
  const status = Number(what);
  if (status === 429) return 'Rate limited';
  if (status === 413) return 'Too large';
  if (status === 408) return 'Timed out';
  if (status >= 500) return 'Server error';
  if (status >= 400) return 'Rejected';
  return 'Failed request';
}

function errorCategory({ type, title }) {
  const t = String(title ?? '');
  switch (type) {
    case 'load_error':
      return requestCategory((t.match(/failed \(([^)]+)\)$/) || [])[1]);
    case 'error_shown': {
      const code = (t.match(/^Shown to visitor \(([^)]*)\)/) || [])[1] || '';
      if (SHOWN_CATEGORIES[code]) return SHOWN_CATEGORIES[code];
      return code.endsWith('_load') ? "Couldn't load" : 'Message shown';
    }
    case 'render_crash':
      return 'Page crash';
    case 'client_error':
      return 'Script error';
    case 'media_error':
      return 'Broken media';
    case 'map_tile_error':
      return 'Map tiles';
    case 'server_request': {
      const status = Number((t.match(/→ (\d+)/) || [])[1]);
      return status && status < 500 ? requestCategory(String(status)) : 'Server error';
    }
    case 'server_background':
      return 'Background job';
    case 'server_email':
      return 'Email failed';
    case 'server_process':
      return 'Server crash';
    default:
      return 'Other';
  }
}

module.exports = { errorCategory };
