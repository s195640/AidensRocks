// Replaces {SOME_VALUE}-style placeholders (used in email-template
// page_content rows, see routes/pagesAdmin.js's LOCKED_VISIBLE_SLUGS) with
// real values before sending. A placeholder with no matching key in `values`
// is left as-is (literal "{KEY}" text) rather than blanked out, so a missed
// value is obvious in the sent email instead of silently vanishing.
function applyTemplateValues(text, values = {}) {
  if (!text) return text;
  return text.replace(/\{([A-Z0-9_]+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

module.exports = applyTemplateValues;
