# User accounts, sign-in, and Follow Rocks

## Context
The site currently has one admin login, a username and password kept in env vars (`ADMIN_USERNAME`/`ADMIN_PASSWORD`). `server/src/routes/auth.js` compares them as plain text and signs a `{role:'admin'}` JWT. There is no accounts table and no password hashing. Visitors want to follow specific rocks and hear when they move. This feature adds:
- real accounts: sign-up, email verification, password reset, access levels, lockout;
- the admin moving onto the same sign-in;
- an admin Accounts page;
- a "Follow Rocks" page;
- orange map pins plus a "following only" filter on the map and on Track the Rocks;
- emails to followers when a rock they follow moves.

Feature folder: `data/ai-build-docs/user-accounts/`. It holds this plan as `user-accounts-feature-plan.md` plus a `summary-issue-log.md` with one entry per phase. **VERSION 0.7.7 → 0.8.0** (new feature folder), then a patch bump for each later change.

### Decisions already made with the user
- **Locking:** a separate `is_locked` flag. The stored level is only 10, 20, 30 or 50. The admin UI shows locked accounts as "Locked (40)". Locked accounts are blocked everywhere, and a password reset unlocks them while keeping their real level.
- **First admin:** created by a one-time seed script. The env-var admin login is removed.
- **Follower emails:** one email per new journey stop, sent once background processing makes the stop visible.
- **Session:** the token lives in `localStorage` with a 30-day expiry (`JWT_EXPIRES_IN` default `30d`).
- **Menu when signed out:** `… | Sign In`.
- **Menu when signed in:** `… | Follow Rocks | [Admin] | Sign Out`. "Admin" shows only for level 50.
- **Admin page name:** the new admin page is **Accounts** (`/admin/accounts`). The existing "Users" page, which manages artists, is unchanged.
- **Creator (30):** can only be assigned by an admin. For now it has the same access as User.

---

## Phase 1: Database and server auth core
**Migration** `data/sql/migrations/add_account_tables.sql`, following the existing pattern: idempotent, the pglogical header comment, and the commented `replication_set_add_table` lines.
- `account`:
  - `id serial PK`, `email varchar(255) NOT NULL` with a unique index on `lower(email)`, `password_hash varchar(255) NOT NULL`
  - `access_level smallint NOT NULL DEFAULT 10 CHECK (access_level IN (10,20,30,50))`
  - `is_locked bool NOT NULL DEFAULT false`, `failed_login_count int NOT NULL DEFAULT 0`, `locked_dt`
  - `email_verified_dt`, `notify_rock_moves bool NOT NULL DEFAULT false`, `last_login_dt`, `create_dt`, `update_dt`
- `account_token`: `id serial PK`, `account_id int REFERENCES account ON DELETE CASCADE`, `token_hash char(64)` (sha256 of a random 32-byte token), `purpose varchar(20)` ('verify' | 'reset'), `expires_dt`, `used_dt`, `create_dt`.
- `account_follow`: `account_id int REFERENCES account ON DELETE CASCADE`, `rock_number int NOT NULL`, `create_dt`, `PRIMARY KEY (account_id, rock_number)`.
- Seed a `page_content` row `follow-rocks` with nav_label "Follow Rocks", an empty body, and `ON CONFLICT DO NOTHING`. This copies `add_nav_pages_seed.sql`.
- Mirror the new tables in `createdb.sql`, `droptables.sql` and `pglogical.sql`, and in `TABLES` in `server/src/routes/serverHealth.js`. This is the checklist in `rock-requests/summary-issue-log.md`.

**Dependencies:** add `bcryptjs`, which is pure JS so there is no native build in Docker or on Windows, and `express-rate-limit`. Add `app.set('trust proxy', 1)` in `app.js` because the app sits behind Nginx.

**New utils** in `server/src/utils/auth/`:
- `password.js`: `validatePassword()` enforces at least 8 characters with at least one each of upper, lower, number and special. Also `hashPassword` and `verifyPassword` (bcrypt cost 12).
- `tokens.js`: `createAccountToken(accountId, purpose, ttl)` returns the raw token and stores only its hash. `consumeAccountToken(raw, purpose)` checks the token is unexpired and unused, then marks it used.
- `accountEmails.js`: sends the verification email (link `/verify-email?token=`, 24h) and the reset email (link `/reset-password?token=`, 1h) through the existing `utils/sendEmail.js`. Links are built from a new `PUBLIC_SITE_URL` env var, added to `server/.env` and the docker-compose `.env`/demo files.

**Middleware** `server/src/middleware/requireAuth.js`:
- `requireAuth(minLevel)` verifies the JWT `{sub: accountId}` and loads the account row on every request, so lock and level changes apply immediately. It rejects locked accounts, sets `req.account`, returns 401 for a missing or invalid token and 403 when the level is too low.
- `optionalAuth` sets `req.account` when a valid token is present and otherwise just continues.
- `requireAdminAuth.js` becomes `module.exports = requireAuth(50)`, so every existing admin route stays protected with no other edits.

**`server/src/routes/auth.js` rewrite.** Rate-limit signup, login, forgot-password and resend.
- `POST /signup {email,password}`: validates input and creates a level-10 account, then sends the verification email. It always returns a generic "check your email" so nobody can tell which emails already have accounts. If the email exists but is unverified, it resends the verification email instead.
- `POST /verify-email {token}`: sets `email_verified_dt`, and changes level 10 to 20.
- `POST /resend-verification {email}`: generic response.
- `POST /login {email,password}`:
  - Unknown email: 401.
  - Locked account: 423 with "account locked — reset your password".
  - Wrong password: increments `failed_login_count`. The 5th failure sets `is_locked` and returns 423. Other failures return 401.
  - Unverified account (level 10): 403 with code `UNVERIFIED`. The client offers to resend the email.
  - Success: resets the counter, sets `last_login_dt`, and returns `{token, account:{id,email,accessLevel,notifyRockMoves}}`.
- `GET /me` (`requireAuth(10)`): returns the account. This replaces `/verify`.
- `POST /forgot-password {email}`: generic response. It emails a reset link to any existing account, including locked ones.
- `POST /reset-password {token,password}`: validates and sets the new hash. It sets `is_locked=false` and `failed_login_count=0`, invalidates other reset tokens, and marks an unverified account as verified at level 20, since it has proved it owns the email.

**Seed script** `server/scripts/createAdmin.js` with `"create-admin"` in `package.json`. Usage: `npm run create-admin -- you@email.com`. It prompts for a password, validates it against the policy, and upserts a verified, unlocked level-50 account. The code stops reading `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

## Phase 2: Client auth and navigation
**`client/src/admin/context/AuthContext.jsx`** (generalized, same file):
- State is `account` (null or `{id,email,accessLevel,notifyRockMoves}`), plus derived `isAuthenticated`, `isAdmin` (level ≥ 50) and `isUser` (level ≥ 20), and `isLoading`.
- It calls `/api/auth/me` on load.
- `login(email,password)` returns `{ok}` or `{ok:false, code, message}`. Also adds `logout()` and `refreshAccount()`.
- It keeps the existing module-load header logic and the 401 interceptor. 403s for a too-low level won't log users out.

**Token storage:** `client/src/admin/utils/authToken.js` moves to `localStorage` under the key `authToken`. `authFetch.js` keeps working because it calls `getStoredToken()`.

**`PrivateRoute.jsx`:** takes a `minLevel` prop (default 50). It sends signed-out users to `/login` with a return-to path and sends users below the required level to `/`.

**New public pages** in `client/src/pages/account/`, styled after `Login.module.css` and `ContactReqestRocks.module.css`:
- `SignIn.jsx` at `/login`. It replaces `admin/pages/login/Login.jsx`, which is deleted. It has an email field, links to sign-up and forgot-password, a resend link for unverified accounts, and a locked-account message that links to reset. After sign-in it returns to the original path or `/`.
- `SignUp.jsx` at `/sign-up`, with a live password-rule checklist and a confirm-password field.
- `VerifyEmail.jsx` at `/verify-email`.
- `ForgotPassword.jsx` at `/forgot-password`.
- `ResetPassword.jsx` at `/reset-password`.
- `SignOut.jsx` at `/sign-out`. It calls `logout()` and then navigates to `/`. Making Sign Out a route keeps `Navbar.jsx` unchanged.

**`App.jsx` navigation:**
- Public items come from `/api/pages`. The `follow-rocks` item is dropped unless `isUser`.
- After those come `Admin` (`isAdmin`), then `Sign Out` when signed in or `Sign In` when signed out.
- `PAGE_PATHS` gets `follow-rocks: "/follow-rocks"`.
- The admin nav gains `{ path: "/admin/accounts", label: "Accounts" }`.

## Phase 3: Admin Accounts page
- Server: `server/src/routes/accountsAdmin.js`, mounted at `/api/admin/accounts` with `router.use(requireAdminAuth)`.
  - `GET /` lists accounts. Password hashes are never returned.
  - `PUT /:id` edits email (uniqueness checked, 409 on a duplicate), `access_level`, `is_locked` (unlocking resets `failed_login_count`), `notify_rock_moves`, and verified on/off.
  - `POST /:id/send-reset` emails a reset link. Admins never see or set passwords directly.
  - Guard: an admin can't lower their own level or lock themselves, so the site can't lose its last admin.
- Client: `client/src/admin/pages/accounts/Accounts.jsx` plus an edit dialog, reusing:
  - `components/simple-components/table/Table.jsx`
  - `Dialog.jsx`
  - `ToggleSwitch.jsx` for Locked, Verified and Notify
  - a level select: Unverified (10), User (20), Creator (30), Admin (50)
  - Columns: email, level (shown as "Locked (40)" when locked), verified, failed attempts, notify, created, last login, actions.
  - Route wrapped in `<PrivateRoute>`.

## Phase 4: Following rocks
**Server: `server/src/routes/follows.js`** at `/api/follows`, protected by `requireAuth(20)`:
- `GET /`: the account's followed rocks joined to `catalog`, returning `rock_number`, `create_dt` and `artists [{display_name}]` in the same shape `/api/rocks` uses, so `LightboxRock` works as-is.
- `GET /ids`: an array of followed rock numbers.
- `POST {rockNumber}`: must exist in `catalog`. Uses `ON CONFLICT DO NOTHING`.
- `DELETE /:rockNumber`
- `PUT /settings {notifyRockMoves}`

**Client hook** `client/src/hooks/useFollowedRocks.js`: returns `{followedSet, follow, unfollow, reload}`. It fetches `/ids` only when `isUser`.

**Page** `client/src/pages/follow-rocks/FollowRocks.jsx` at `/follow-rocks`, wrapped in `<PrivateRoute minLevel={20}>`:
- A global `ToggleSwitch`: "Email me when rocks I follow move".
- Search by rock number or artist across the public `GET /api/rock-posts/allrocks`, with a Follow button on each result that is disabled when the rock is already followed.
- A followed-rocks table built with `Table.jsx`:
  - Rock #
  - Image: the `/media/catalog/N/a_sm.webp` thumbnail. Clicking opens `LightboxRock`, as on the admin Rocks page.
  - Artist(s)
  - Created
  - "View journey": opens `RockJourneyDialog`, the same popup the map uses.
  - Remove

## Phase 5: Map, Track the Rocks, and follower emails
**Map:**
- `client/src/pages/map/Map.jsx` passes `followedSet` and `isUser` into `RockMap`.
- `RockMap.jsx` adds an `orangeIcon` with a CSS filter class, alongside `defaultIcon` and `greenIcon`. Every marker always gets an explicit icon: green when highlighted, otherwise orange when followed, otherwise default.
- A new `onlyFollowed` filter switch in the Map Filters dialog, rendered only when `isUser`, applied in `visiblePins`.

**Track the Rocks:**
- `TrackTheRocks.jsx` gets a `ToggleSwitch` "Show only rocks I follow", shown only when `isUser`, and passes `followedOnly` to `RockTable`. Turning it on resets paging.
- `RockTable.jsx` adds `&followed=1`.
- `GET /api/rock-posts` uses `optionalAuth`. When `followed=1` and `req.account` is set, it limits results to `rock_number IN (SELECT rock_number FROM account_follow WHERE account_id=$n)`. This applies to both the page query and its total.

**Follower emails:**
- New `server/src/utils/rock-upload/notifyFollowers.js` takes the rock number and journey row. It selects accounts that follow the rock with `notify_rock_moves`, level ≥ 20 and not locked, and sends each one an email.
- The email is warm, short and inline. It says where the rock traveled and links to `PUBLIC_SITE_URL/track-the-rocks?rock=N` (the existing deep link).
- It is called in `processImagesInBackground.js` after the `show = true` updates (around lines 52-53). It runs inside its own try/catch so a mail failure never breaks the upload pipeline.

## Docs
- Update `CLAUDE.md` "Admin auth" to describe the new account/JWT model: `requireAuth(level)`, `requireAdminAuth` = level 50, localStorage, the `create-admin` script, and `PUBLIC_SITE_URL`.
- Record in each phase's log entry that the migration must be run by hand on provider and subscriber, and that `npm run create-admin` must run before the old admin login disappears.

## Verification
- `cd client && npm run lint` must report 0 warnings. Start `cd server && npm run dev` with `MAILPIT_ENABLED=true` and Mailpit running.
- API checks with curl:
  - Sign up, read the email in Mailpit (`:8025`), verify, and confirm the level changes 10 → 20.
  - Weak password: rejected.
  - 5 bad logins: the 5th returns 423. A correct password still gets 423. Reset: unlocked at the same level.
  - Admin endpoints with a user token: 403.
  - Follow and unfollow. `GET /api/rock-posts?followed=1` returns only followed rocks.
  - Upload a rock journey for a followed rock: the follower email arrives in Mailpit after processing finishes.
- Manual UI check (user first; ask before any Playwright run):
  - Nav states for signed-out, user and admin.
  - Admin sign-in through the new page, then the Accounts page edit, lock/unlock, and level changes.
  - The Follow Rocks page: toggle, search, table, lightbox, journey popup, remove.
  - Orange pins and the map filter.
  - The Track the Rocks switch.
