// utils/normalizeTags.js
// Canonical tag normalization: trim, lowercase, drop empty, dedupe. Matching
// (e.g. a future ?tag=main filter) is a plain exact-match query against
// these normalized values, not a LOWER()-wrapped one — so this is the one
// place that decides what "main" and "Main " collapse to.
// The client implements the same rules independently (client/src/admin/pages
// /albums/normalizeTags.js) so what's shown after a reload matches what was
// typed; keep the two in sync if this logic changes.
function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  const seen = new Set();
  const result = [];

  for (const raw of tags) {
    const tag = String(raw ?? '').trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }

  return result;
}

module.exports = normalizeTags;
