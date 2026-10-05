// Password policy, mirrored from server/src/utils/auth/password.js (the
// server is the real gate — keep the two in sync).
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "An upper-case letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lower-case letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
  { label: "A special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const passwordMeetsRules = (p) => PASSWORD_RULES.every((r) => r.test(p));
