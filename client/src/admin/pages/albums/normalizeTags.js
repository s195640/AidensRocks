// Canonical tag normalization: trim, lowercase, drop empty, dedupe. Mirrors
// server/src/utils/normalizeTags.js exactly — front end and back end must
// agree, so what's shown after a reload matches what was typed, not a
// differently-cleaned version of it. Keep the two in sync if this changes.
export default function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  const seen = new Set();
  const result = [];

  for (const raw of tags) {
    const tag = String(raw ?? "").trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }

  return result;
}
