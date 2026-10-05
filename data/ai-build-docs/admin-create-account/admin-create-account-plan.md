# Admin: Create Account — Plan

## Goal
Let an admin create a site sign-in account by hand, for example for a family member. The account starts **locked with no usable password**: the person can't sign in until they set a password through a reset link, and that also unlocks the account.

## Decisions (with the user, 2026-10-05)
- **No password:** store a bcrypt hash of a random secret nobody knows, so nothing can ever match it. No schema change (`account.password_hash` stays NOT NULL), so there's nothing to run on the prod nodes.
- **Setup email:** a checkbox in the create dialog, "Email them a link to set their password", ticked by default. It reuses the existing *Password Reset Email* template and token flow (`createAccountToken(id, 'reset')` + `sendPasswordResetEmail`). If it's unticked, the admin can send it later with the edit dialog's "Send password reset email", or the person can use "Forgot your password?" (which works for locked accounts).

## Behaviour
- **`POST /api/admin/accounts`** (admin only).
  - **Body:** `{ email, first_name?, last_name?, access_level? (20|30|50, default 20), ra_key?, notify_rock_moves? (default true), send_setup_email? (default true) }`.
  - **Stored as:** `is_locked = true`, `locked_dt = NOW()`, `email_verified_dt = NULL`, `failed_login_count = 0`.
  - **Linked artist:** `ra_key` only for Creator or Admin (same rule as the edit dialog).
  - **Errors:** 400 for a bad email or level; 409 when the email (case-insensitive) or the artist is taken.
  - **Reply:** 201 with the account row plus `{ setupEmailSent, setupEmailError? }`. A mail failure doesn't undo the account.
- **Sign-in before a reset:** the uniform "Email or password is incorrect…" 401, the same as any locked account.
- **The reset** (existing `POST /api/auth/reset-password`) sets the password, unlocks, marks the email verified and raises the level to at least 20. Creator and Admin are kept.

## UI
On Admin → Accounts, an **Add Account** button next to the search box opens `AccountCreateDlg` with:
- First and last name, email, access level (User/Creator/Admin), linked artist (Creator/Admin only)
- The "email when followed rocks move" toggle
- The setup-email checkbox
- A note explaining the locked, no-password start

The new row appears in the table, shown as Locked.

## Tests
- **API:** `server/tests/api/admin-create-account.test.mjs`, plus a row in the auth matrix (`POST /api/admin/accounts` = admin).
- **Browser:** `client/e2e/admin.spec.js`, where an admin creates an account through the dialog.
