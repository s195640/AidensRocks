// Escapes text for safe insertion into an HTML email body (e.g. a
// visitor-typed journey location substituted into a template).
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

module.exports = escapeHtml;
