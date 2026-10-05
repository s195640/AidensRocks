// Account access levels, mirrored from server/src/middleware/requireAuth.js.
// "Locked" (40) is a separate is_locked flag server-side, not a stored
// level; locked accounts can't sign in.
export const LEVELS = {
  UNVERIFIED: 10,
  USER: 20,
  CREATOR: 30,
  ADMIN: 50,
};

export const LEVEL_LABELS = {
  [LEVELS.UNVERIFIED]: "Unverified",
  [LEVELS.USER]: "User",
  [LEVELS.CREATOR]: "Creator",
  [LEVELS.ADMIN]: "Admin",
};

export const LOCKED_LEVEL = 40;
