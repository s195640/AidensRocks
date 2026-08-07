// Client-side mirror of server/src/utils/applyTemplateValues.js — used to
// live-preview {SOME_VALUE} substitution before an email is actually sent.
// Keep the two in sync if the placeholder syntax ever changes.
export default function applyTemplateValues(text, values = {}) {
  if (!text) return text;
  return text.replace(/\{([A-Z0-9_]+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}
