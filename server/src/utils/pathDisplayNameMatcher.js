// Builds a matcher for the path_display_name lookup table (see
// data/sql/migrations/add_path_display_name_table.sql). Resolves a stored
// hit value (full_url, or bare path for older rows with no full_url) to
// the admin-configured display name shown on the Path Hits widget
// (server/src/routes/unmatchedPath.js).
//
// A pattern may contain "*" as a wildcard matching any run of characters,
// e.g. "/qr?r=*" matches "/qr?r=ABC123", "/qr?r=XYZ", etc. Precedence:
//   1. An exact (non-wildcard) pattern always wins over a wildcard one.
//   2. Among multiple matching wildcard patterns, the longest (most
//      specific) pattern wins.
// A value that matches nothing returns null -- callers show "Unknown".

// Escapes every regex-special character in a literal chunk of the pattern
// (everything between "*"s) so it's matched verbatim.
function escapeRegExpLiteral(str) {
  return str.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

function patternToRegExp(pattern) {
  const escaped = pattern.split("*").map(escapeRegExpLiteral).join(".*");
  return new RegExp(`^${escaped}$`);
}

function buildPathDisplayNameMatcher(mappings) {
  const exact = new Map();
  const wildcards = [];

  for (const { url_pattern: urlPattern, display_name: displayName } of mappings) {
    if (urlPattern.includes("*")) {
      wildcards.push({ urlPattern, displayName, regex: patternToRegExp(urlPattern) });
    } else {
      exact.set(urlPattern, { urlPattern, displayName });
    }
  }

  // Longest pattern first, so the first regex match found is the most
  // specific one.
  wildcards.sort((a, b) => b.urlPattern.length - a.urlPattern.length);

  return function match(value) {
    if (exact.has(value)) return exact.get(value);
    for (const wildcard of wildcards) {
      if (wildcard.regex.test(value)) {
        return { urlPattern: wildcard.urlPattern, displayName: wildcard.displayName };
      }
    }
    return null;
  };
}

module.exports = buildPathDisplayNameMatcher;
