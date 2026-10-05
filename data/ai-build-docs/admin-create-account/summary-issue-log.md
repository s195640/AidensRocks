# Admin: Create Account — Summary Issue Log

Feature-scoped log. Plan: `admin-create-account-plan.md`.

## Phase 1 — Create account, locked with no password (2026-10-05)
**Status:** Complete in code. Regression suite all green:
- client lint: PASS
- API: 351 tests, including 14 new ones in `admin-create-account.test.mjs` and a new auth-matrix row
- Browser: 49 tests, including a new "Add Account" admin test

The UI is not yet checked by hand.

**Files changed:**
- **New:**
  - `client/src/admin/pages/accounts/AccountCreateDlg.jsx`
  - `server/tests/api/admin-create-account.test.mjs`
  - this folder
- **Changed:**
  - `server/src/routes/accountsAdmin.js`: `POST /`, plus `resolveArtistLink`/`cleanName`/`uniqueViolation` helpers now shared with the edit (`PUT`) route
  - `client/src/admin/pages/accounts/AccountsAdmin.jsx` (+ `.module.css`): Add Account button, result banner
  - `server/tests/api/auth-matrix.test.mjs`, `client/e2e/admin.spec.js`
  - `CLAUDE.md`, `VERSION`

**Summary:**
- `POST /api/admin/accounts` creates the account with `is_locked = true` and an unusable password hash (bcrypt of 32 random bytes nobody sees). There's no schema change and no prod migration.
- Setup email: a checkbox, on by default, that reuses the Password Reset Email template and token. If sending fails, the account is still created and the banner says to use "Send password reset email".
- The existing reset flow activates the account: it sets the password, unlocks, verifies, and raises the level to at least 20 (Creator and Admin are kept).
- Levels offered: User, Creator, Admin. Unverified is left out because the activating reset makes the account a User anyway.

**Deviations from plan:** none.

**Open / possible follow-ups:**
- The setup email uses the reset wording ("We received a request to reset your password"). A separate editable "Account Created" template would read better, but it needs a new `page_content` row (a prod data migration). Not done; decided against for now.
- **VERSION:** 0.9.2 → 0.10.0 (new feature folder).
