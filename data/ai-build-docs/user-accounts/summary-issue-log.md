# User Accounts — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phases 1–5 — Accounts, sign-in, admin Accounts page, Follow Rocks, map/Track the Rocks filters, follower emails (2026-10-04)
**Status:** Complete in code. **Not yet applied to any live database.** API verified end-to-end against a throwaway Postgres + Mailpit; UI not yet verified manually.

**Files changed:**
- New (server): `server/src/middleware/requireAuth.js`, `server/src/routes/accountsAdmin.js`, `server/src/routes/follows.js`, `server/src/utils/auth/password.js`, `server/src/utils/auth/tokens.js`, `server/src/utils/auth/accountEmails.js`, `server/src/utils/rock-upload/notifyFollowers.js`, `server/scripts/createAdmin.js`
- New (client): `client/src/pages/account/` (`SignIn`, `SignUp`, `SignOut`, `VerifyEmail`, `ForgotPassword`, `ResetPassword`, `PasswordFields`, `passwordRules.js`, `Account.module.css`), `client/src/pages/follow-rocks/FollowRocks.jsx` (+ `.module.css`), `client/src/admin/pages/accounts/AccountsAdmin.jsx`, `AccountEditDlg.jsx` (+ `AccountsAdmin.module.css`), `client/src/admin/utils/accessLevels.js`, `client/src/hooks/useFollowedRocks.js`
- New (data): `data/sql/migrations/add_account_tables.sql`, this folder
- Changed: `server/src/routes/auth.js` (rewritten), `server/src/middleware/requireAdminAuth.js` (now `requireAuth(50)`), `server/src/routes/rockPosts.js`, `server/src/routes/serverHealth.js`, `server/src/app.js`, `server/src/utils/rock-upload/processImagesInBackground.js`, `server/package.json` (+ `bcryptjs`, `express-rate-limit`, `create-admin` script), `client/src/App.jsx`, `client/src/admin/context/AuthContext.jsx`, `client/src/admin/components/PrivateRoute.jsx`, `client/src/admin/utils/authToken.js`, `client/src/adminContent/pagePaths.js`, `client/src/components/rock-map/RockMap.jsx` (+ `.module.css`), `client/src/pages/map/Map.jsx`, `client/src/pages/track-the-rocks/TrackTheRocks.jsx` (+ `.module.css`), `client/src/components/rock-journey/rock-table/RockTable.jsx`, `data/sql/createdb.sql`, `data/sql/droptables.sql`, `data/sql/pglogical.sql`, `data/docker-compose/demo`, `CLAUDE.md`, `VERSION`
- Changed (untracked env files): `server/.env`, `data/docker-compose/.env`: `JWT_EXPIRES_IN` 12h → 30d, added `PUBLIC_SITE_URL=http://192.168.1.50`
- Deleted: `client/src/admin/pages/login/Login.jsx` (+ `.module.css`), replaced by `pages/account/SignIn.jsx`

**Summary:**
- **Tables:** `account` (email unique case-insensitively, bcrypt hash, `access_level` 10/20/30/50, separate `is_locked` + `failed_login_count`, `notify_rock_moves`), `account_token` (sha256 of single-use verify/reset tokens), `account_follow` (account ↔ rock_number). Seeded `page_content` row `follow-rocks` for the nav.
- **Locked = 40** is the `is_locked` flag, not a stored level (decided with the user), so locking never loses an account's real level, and a password reset unlocks the account at its original level.
- **Auth:** JWT `{sub: accountId}`, 30d. The account row is re-read on every authed request, so admin lock/level changes take effect immediately. 401 means not signed in (the client signs out); 403 means not allowed (the client stays signed in). The old `ADMIN_USERNAME`/`ADMIN_PASSWORD` login is gone; the first admin is created with `npm run create-admin -- you@email.com`.
- **Every existing admin route** stays protected without edits because `requireAdminAuth` is now `requireAuth(50)`.
- **Sign-up/forgot/resend** answer generically, so they don't reveal which emails have accounts. 5 consecutive bad passwords lock the account (423). Unverified accounts get 403 `UNVERIFIED` with a resend option. A per-IP rate limit (30 / 15 min) applies to the unauthenticated auth endpoints; `trust proxy` is set because the app sits behind Nginx.
- **Nav:** `… | Follow Rocks (level ≥ 20) | Admin (level 50) | Sign In / Sign Out`. Sign Out is a `/sign-out` route, so `Navbar.jsx` is unchanged. Admin nav gained "Accounts".
- **Follow Rocks page:** an email toggle, search across `/api/rock-posts/allrocks` (rock-number prefix or artist name), and a followed table (Rock #, clickable thumbnail → `LightboxRock`, Artist, Created, View journey → `RockJourneyDialog`, Remove).
- **Map:** orange pins for followed rocks (green highlight still wins), plus a "Show Only Following Rocks" switch that appears only for signed-in users.
- **Track the Rocks:** a "Show only rocks I follow" switch for signed-in users, backed by `GET /api/rock-posts?followed=1` (`optionalAuth`).
- **Follower emails:** sent from `processImagesInBackground` right after a journey stop's `show` flips to true, one email per follower, isolated in try/catch.
- **VERSION:** 0.7.7 → 0.8.0 (new feature folder).

**Deviations from plan:**
- `accessLevels.js` was split out of `AuthContext.jsx` so the context file only exports components and hooks (keeps react-refresh lint clean).
- The admin Accounts page has no delete action (none was requested). It edits email, level, lock, verified and notify, and can send a reset email.
- `createdb.sql` seeds `follow-rocks` at `order_num` 8. The migration appends it at `MAX(order_num)+1` on live DBs.

**Issues/gotchas encountered:**
- `create-admin` originally dropped the confirm-password line when input was piped. It now uses one readline with a queued line reader.
- Test env needed `EMAIL_USER` set, or Mailpit rejects the empty `MAIL FROM`. Prod/dev `.env` files already set it.
- `createdb.sql` has a pre-existing, unrelated error on a fresh DB: `relation "music_m_key_seq" already exists`.

**Deploy steps (in order):**
1. Run `data/sql/migrations/add_account_tables.sql` on the provider node, then the subscriber. Then run the commented `pglogical.replication_set_add_table` lines on the provider only.
2. Deploy the server (new deps: `npm install`), and set `PUBLIC_SITE_URL` (the real public URL) and `JWT_EXPIRES_IN=30d` in prod `.env`.
3. Run `npm run create-admin -- <admin email>` in `server/` (in the server container for docker). **Until this is run, nobody can sign into admin.**
4. Deploy the client. Existing admin sessions are dropped (the token key moved from sessionStorage `adminToken` to localStorage `authToken`, and old `{role:'admin'}` tokens have no `sub`).

**Open questions for human review:**
1. The real production `PUBLIC_SITE_URL`. `demo` has a placeholder; both local `.env` files use `http://192.168.1.50`.
2. `ADMIN_USERNAME`/`ADMIN_PASSWORD` were left in `server/.env` and `data/docker-compose/.env` (unused now). Remove them when convenient.
3. Manual UI pass, per the plan's Verification section.

## Follow-up — Mobile menu scrolls (2026-10-04)
**Status:** Complete
**Files changed:** `client/src/components/navbar/Navbar.module.css`, `VERSION` (0.8.0 → 0.8.1)

**Summary:**
- With the new Follow Rocks / Admin / Sign In-Out items, the mobile slide-out menu could be taller than the screen.
- The panel was `height: 100vh` starting 50px down, with no overflow, so the bottom items were cut off and unreachable.
- It is now `calc(100dvh - 50px)` (with a `100vh` fallback), using `overflow-y: auto` and `overscroll-behavior: contain` so it scrolls inside without moving the page behind it. There is also bottom padding so the last item isn't flush against the edge.

## Follow-up — Follow Rocks remove button is an icon (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/pages/follow-rocks/FollowRocks.jsx` (+ `.module.css`), `VERSION` (0.8.1 → 0.8.2)

**Summary:**
- The followed-rocks table's "Remove" text button is now a red trash icon (`FaTrash` from react-icons, the same icon the admin tables use for delete).
- It has a "Stop following rock N" tooltip and aria-label.
- The column narrowed from 90px to 50px.

## Follow-up — Follow Rocks Email is an editable Page Details template (2026-10-05)
**Status:** Complete. **The migration has not been applied to any live database.** Tested against a throwaway Postgres + Mailpit.
**Files changed:**
- New: `data/sql/migrations/add_follow_rocks_email_page.sql`, `server/src/utils/buildRockJourneyLinkTag.js`, `server/src/utils/escapeHtml.js`
- Changed: `server/src/utils/emailSlugs.js`, `client/src/admin/pages/pages/emailSlugs.js`, `server/src/utils/rock-upload/notifyFollowers.js`, `server/src/routes/pagesAdmin.js`, `client/src/adminContent/emailPlaceholders.js`, `client/src/admin/pages/pages/send-email-dlg/SendEmailDialog.jsx`, `client/src/admin/pages/pages/email-preview/EmailPreview.jsx`, `VERSION` (0.8.2 → 0.8.3)

**Summary:**
- **New `follow-rocks-email` row** in `page_content`, listed in `EMAIL_SLUGS`. It gets the same Page Details workflow as Response Email / Response Email Multi: edit, draft/publish, Subject, Preview, test Send, and the Active toggle.
- **Placeholders:** `{ROCK_NUMBER}`, `{ROCK_IMAGE}`, `{LOCATION}`, `{DATE}`, `{ROCK_JOURNEY_LINK}` ("See Rock N's journey" → `/track-the-rocks?rock=N`).
- **Escaping:** `{LOCATION}` and `{DATE}` are HTML-escaped, both in the server send and in the client preview.
- **Rendering:** `{DATE}` is rendered as "October 4, 2026". A blank or `unknown` location becomes "a new place".
- **`notifyFollowers.js`** now sends the **published** template, the same rule as `sendRockResponseEmail.js`. It sends nothing when the row is missing or Active is off.
- **Migration seeds the row Active**, with the previous inline wording as both draft and published, so follower emails keep going out unchanged once it's applied. This differs from the response-email rows, which start inactive and blank.
- **Send dialog and Preview** for this template ask for a rock number, location and date.

**Issues/gotchas encountered:**
- Links in templates hardcode `https://aidensrocks.com`, matching the existing `buildRockImageTag`/`buildRockNumbersWithLinksTag`. `PUBLIC_SITE_URL` is now only used by the verify and reset emails.
- `createdb.sql` (fresh installs) has neither the `draft/published_email_subject` columns nor any email-template rows. This gap pre-dates this feature, so this row was not added to `createdb.sql` either; fresh installs get it by running the migrations.

**Deploy step:** run `add_follow_rocks_email_page.sql` after `add_account_tables.sql`. **Until it runs, no follower emails are sent.**

## Follow-up — Page Details split into Pages and Emails tables (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/admin/pages/pages/PagesAdmin.jsx` (+ `.module.css`), `VERSION` (0.8.3 → 0.8.4)

**Summary:**
- `/admin/pages` now shows two tables under `h3` section headings, like the Journey admin page.
- **Pages** holds the public pages. It is drag-reorderable, and that order sets the nav order.
- **Emails** holds the `EMAIL_SLUGS` templates, with an added Subject column (the published subject). It is not draggable.
- Actions, Active, Preview and Send are unchanged.
- Reordering Pages posts the pages in their new order followed by the email rows, so the email rows keep the highest `order_num` values. No server change.

## Follow-up — Every site email is an editable Page Details template (2026-10-05)
**Status:** Complete. **The migration has not been applied to any live database.** API verified against a throwaway Postgres + Mailpit; UI not verified in a browser.

**Files changed:**
- New: `data/sql/migrations/add_email_templates.sql`, `server/src/utils/emailTemplates.js`, `server/src/utils/siteUrl.js`, `client/src/adminContent/emailTemplates.js`, `client/src/adminContent/htmlToPlainText.js`, `client/src/adminContent/loadDefaultEmail.js`
- Changed: `server/src/utils/emailSlugs.js`, `server/src/utils/auth/accountEmails.js`, `server/src/utils/rock-upload/{processImagesInBackground,sendRockResponseEmail,notifyFollowers}.js`, `server/src/routes/{pagesAdmin,jobsAdmin,rockRequests}.js`, `client/src/admin/pages/pages/{PagesAdmin.jsx,emailSlugs.js}`, `client/src/admin/pages/pages/send-email-dlg/SendEmailDialog.jsx`, `client/src/admin/pages/pages/email-preview/EmailPreview.jsx` (+ `.module.css`), `client/src/adminContent/emailPlaceholders.js`, `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/SendRockRequestEmailDialog.jsx`, `client/src/admin/components/send-email/SendEmail.jsx`, `VERSION` (0.8.4 → 0.8.5)

**Summary:**
- **6 new templates**, giving 9 in total:
  - Verify Account Email (always on)
  - Password Reset Email (always on)
  - New Rock Journey (to admin)
  - New Rock Request (to admin)
  - Rock Request Reply (default)
  - Send Email (default)
- **Seeding:** all six are seeded Active, with the previous hardcoded wording as both draft and published.
- **One render path:** `server/src/utils/emailTemplates.js` (`renderEmailTemplate` / `buildTemplateValues`) is now the only place that fills in placeholders. All automated senders, Page Details' test Send, and Preview use it.
  - Free-text values are HTML-escaped in the body (newlines become `<br/>`) and left as-is in the plain-text subject.
  - Image and link placeholders, including verify/reset links, are only derived server-side.
- **New endpoints:** `POST /api/admin/pages/:slug/render`, so Preview is now rendered server-side by the sending code, and `GET /api/admin/pages/:slug/template` (raw published content, for default templates). `PATCH /:slug/visible` refuses the two required templates.
- **Verify/reset** ignore Active and fall back to the built-in wording if their row is missing. **Admin notifications** (journey, rock request) are skipped when inactive. New Rock Journey keeps its attachments and `TEST_SERVER - ` prefix.
- **Default templates:** the Rock Request reply dialog and the Send Email job pre-fill from their published template, converted to plain text (`htmlToPlainText`). The reply dialog fills `{NAME}`/`{ROCK_NUMBERS}`/`{TRACKING_NUMBER}`, using "not assigned yet"/"not available yet" when blank. If the template is missing or inactive, the old built-in default (or blank) is used.
- **Page Details Emails table:** gains a "Used For" column. Required switches are locked on. Default templates have no Send button.
- **Preview and Send dialogs** now build their inputs from `client/src/adminContent/emailTemplates.js`.

**Issues/gotchas encountered:**
- Escaping free-text values for HTML also escaped them in the plain-text subject (for example `&amp;`). Fixed by rendering the subject with unescaped values (`forSubject`).
- Mailpit stores sent HTML with CRLF line endings, so render-vs-send compare equal only after normalizing line endings.

**Deploy:** run `add_email_templates.sql` after `add_follow_rocks_email_page.sql`. **Until it runs, the New Rock Journey and New Rock Request notifications to the admin are not sent.** Verify/reset keep working via the fallback, and the default dialogs keep their built-in text.

## Follow-up — Rock-move emails default to on (2026-10-05)
**Status:** Complete
**Files changed:** `data/sql/migrations/add_account_tables.sql`, `data/sql/createdb.sql`, `VERSION` (0.8.5 → 0.8.6)

**Summary:**
- `account.notify_rock_moves` now defaults to `true`, so new accounts start with "Email me when rocks I follow move" on. Users can still turn it off on Follow Rocks, and admins can change it on Accounts.
- The migration also runs an idempotent `ALTER … SET DEFAULT true`, for any DB where an earlier version of the migration already created the table.
- Existing accounts keep their current setting.
- Verified on a throwaway DB: a new row gets `true`.
- Deviation from the feature plan, which specified `DEFAULT false`. Changed at the user's request.

## Follow-up — Follow Rocks table: eye icon, Last Location, Last Post (2026-10-05)
**Status:** Complete
**Files changed:** `server/src/routes/follows.js`, `client/src/pages/follow-rocks/FollowRocks.jsx` (+ `.module.css`), `VERSION` (0.8.6 → 0.8.7)

**Summary:**
- **"View journey"** is now a blue eye icon (`FaEye`) next to the trash icon in a right-hand actions column. It still opens `RockJourneyDialog`.
- **New sortable columns: Last Location and Last Post.** Both come from the rock's latest *visible* journey stop, using the same ordering as Track the Rocks (journey date, then post time). This is computed with a `LEFT JOIN LATERAL` in `GET /api/follows`.
- **Rocks with no visible stops** show "Not traveled yet" / "—".
- **Date handling:** `last_post_date` is returned as `YYYY-MM-DD` (`TO_CHAR`) and formatted in UTC, so the calendar date isn't shifted by time zone.
- Verified against a throwaway DB: hidden stops are ignored, and rocks without stops return null.
- Also fixed a lint error left by the 0.8.5 change: the Send Email job's description used raw `"` quotes (`react/no-unescaped-entities`). It was edited after that change's lint run, so 0.8.5's "lint clean" claim was wrong. Lint and build are clean now.

## Follow-up — Names, password eye toggle, account pages in Page Details (2026-10-05)
**Status:** Complete. **Migrations have not been applied to any live database.** API verified against a throwaway Postgres + Mailpit (19/19 checks); UI not verified in a browser.

**Files changed:**
- New: `data/sql/migrations/add_account_pages.sql`, `server/src/utils/accountPageSlugs.js`, `client/src/adminContent/accountPages.js`, `client/src/adminContent/useAccountPage.js`, `client/src/pages/account/PasswordInput.jsx`, `client/src/pages/account/AccountPageHeader.jsx`
- Changed: `data/sql/migrations/add_account_tables.sql`, `data/sql/createdb.sql`, `server/src/routes/{auth,accountsAdmin,pages,pagesAdmin}.js`, `server/src/middleware/requireAuth.js`, `client/src/pages/account/{SignIn,SignUp,ForgotPassword,PasswordFields}.jsx`, `client/src/pages/account/Account.module.css`, `client/src/admin/pages/pages/{PagesAdmin.jsx,pages-edit-dlg/PagesEditDialog.jsx}`, `client/src/admin/pages/accounts/{AccountsAdmin,AccountEditDlg}.jsx`, `client/src/adminContent/pagePaths.js`, `VERSION` (0.8.7 → 0.8.8)

**Summary:**
- **First and last name**
  - New nullable columns `account.first_name`/`last_name` (varchar 100). The migration also runs `ADD COLUMN IF NOT EXISTS`, for DBs where it already ran.
  - Required at sign-up: enforced client-side and server-side (400), trimmed, and single-spaced.
  - Returned by `/api/auth/me` and login as `firstName`/`lastName`.
  - Shown, searchable and editable on admin Accounts; a blank value clears it.
  - `create-admin` doesn't ask for names, which is why the columns are nullable.
- **Password eye toggle:** a new `PasswordInput` with a show/hide button, used on Sign In and on both new-password fields (Create Account, Reset).
- **New "Account Pages" table in Page Details** with `sign-in`, `create-account` and `reset-password` (the Forgot Password page, `/forgot-password`).
  - **Editable content:** an editable **Title**, stored in the existing draft/published_email_subject columns (no new columns), and a **description** (the rich-text body). Same edit, draft, publish and Preview workflow as other pages.
  - **Nav:** the rows are excluded from the public nav.
  - **Fallback:** the built-in wording shows until published, or if the rows are missing.
  - **Sign In** can't be turned off: the switch is locked, and PATCH returns 400.
  - **Create an Account off:** the link is hidden on Sign In, `/sign-up` shows "can't be created right now", and `POST /api/auth/signup` returns 403.
  - **Reset Password off:** "Forgot your password?" is hidden on Sign In. The locked-account message says to contact us instead. `/forgot-password` shows "not available", and `POST /api/auth/forgot-password` returns 403. The emailed `/reset-password?token=` page and the admin's "Send password reset email" **still work**, so an admin can still unlock people.
- `GET /api/pages/:slug/content` returns `title`/`visible` for account pages, and the admin preview endpoint now also returns `visible`.

**Deviations / interpretation:**
- "Reset Password page" was taken as the Forgot Password (request-a-link) page. The choose-a-new-password page reached from the email stays fixed, so emailed links keep working.
- Turning a page off also blocks it on the server, not just the link on Sign In.

**Deploy:** run `add_account_tables.sql` (re-run it if it was applied before, to add the name columns), then `add_account_pages.sql`.

## Follow-up — No flash of turned-off links on Sign In (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/pages/account/SignIn.jsx`, `VERSION` (0.8.8 → 0.8.9)

**Summary:**
- `useAccountPage` reports `visible: true` while it's still loading, so with Create an Account / Reset Password turned off, their links flashed on Sign In before disappearing.
- Sign In now shows each link (and the locked-account reset link) only once that page's setting has loaded.
- It also waits for its own editable Title before rendering, like Create Account / Reset Password already do, so the built-in title doesn't flash first either.

## Follow-up — Follow Rocks table scrolls inside its own box on phones (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/pages/follow-rocks/FollowRocks.jsx` (+ `.module.css`), `VERSION` (0.8.9 → 0.8.10)

**Summary:**
- The shared `Table`'s wrapper doesn't scroll. On a phone, the followed-rocks table made the whole page wider than the screen, and the app's grey background (`.appContainer`) only covered the screen width, so scrolling right showed white.
- The table is now wrapped in a `.tableScroll` box (`overflow-x: auto`, table `min-width: 640px`). It scrolls sideways inside that box, and the page itself no longer widens.
- Done locally rather than in the shared `Table.jsx`, so the admin tables are unaffected.

## Follow-up — Real fix for Follow Rocks being wider than a phone screen (2026-10-05)
**Status:** Complete (lint clean; not yet verified on a phone)
**Files changed:** `client/src/pages/follow-rocks/FollowRocks.module.css`, `VERSION` (0.8.10 → 0.8.11)

**Summary:**
- The 0.8.10 fix (an inner scroll box around the table) did **not** fix it. The user still saw an off-center title, a description running off-screen, and the footer ending when scrolling right. The whole *page* was wider than the screen, not just the table.
- **Root cause:** the page's `.container` is a flex item of `.appContainer` (`display: flex; flex-direction: column`). Its `margin: 0 auto` (used for centering) turns off flex stretching in the cross axis. With no explicit width, the item shrinks to fit its content, and that content's minimum width includes the table (≥640px). So the page laid out at about 670px on a ~375px phone.
- **Fix:** `.container` gets `width: 100%; min-width: 0;` (keeping `max-width: 960px; margin: 0 auto`), so it is screen-wide on phones and capped and centered on desktop. The 0.8.10 `.tableScroll` box stays; with the page now the right width, it is what scrolls the table sideways.
- `AllRocks.module.css` and `HonoringAidenPage.module.css` use the same margin-auto + max-width pattern. They were left unchanged because they have no wide content, and no issue has been reported on them.

## Follow-up — Tighter mobile menu spacing (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/components/navbar/Navbar.module.css`, `VERSION` (0.8.11 → 0.8.12)

**Summary:**
- Mobile slide-out menu (≤769px): `.navItem` `margin-bottom` reduced from `1.5rem` to `1rem`, so the gap between links is smaller.
- Desktop spacing is unchanged.

## Follow-up — "Welcome <name>" account block in its own navbar spot (2026-10-05)
**Status:** Complete (lint and build clean; not verified in a browser)
**Files changed:** `client/src/App.jsx`, `client/src/components/navbar/Navbar.jsx` (+ `.module.css`), `VERSION` (0.8.12 → 0.8.13)

**Summary:**
- **Sign In / Sign Out are no longer menu items.** `App.jsx` passes `account` to `Navbar`, which renders its own account block:
  - signed out: a "Sign In" link;
  - signed in: "Welcome <first name>", with a smaller "Sign out" link beneath. Accounts with no first name (e.g. made by `create-admin`) show "Welcome back".
- **Placement on desktop:** the far right. The menu links get `margin-left: auto`, so they stay right-aligned just left of it rather than drifting to the middle.
- **Placement on phones:** in the top bar to the right of the ☰ button, so it's visible without opening the menu.
- **Long names** truncate with an ellipsis (180px desktop / 120px phone).
- **Admin pages** show the same block, so admins can sign out from there too.
- **Behavior unchanged:** the "Admin" item stays the last menu item for admins. Sign out still goes through `/sign-out`, using the same unsaved-changes guard as the other nav links.

## Follow-up — Shorter, smaller account greeting (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/components/navbar/Navbar.jsx` (+ `.module.css`), `VERSION` (0.8.13 → 0.8.14)

**Summary:**
- **Greeting text:** "Welcome <first name>" is now "Hi! <first name>" (just "Hi!" with no first name).
- **Desktop:** greeting 0.95rem → 0.8rem (max 140px); Sign out 0.8rem → 0.7rem.
- **Phone:** greeting 0.8rem → 0.7rem (max 90px); Sign out 0.72rem → 0.62rem.

## Follow-up — "Hello, <name>" greeting, smaller again (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/components/navbar/Navbar.jsx` (+ `.module.css`), `VERSION` (0.8.14 → 0.8.15)

**Summary:**
- **Greeting text:** "Hi! <first name>" is now "Hello, <first name>" ("Hello!" with no first name).
- **Greeting font:** 0.8rem → 0.7rem on desktop, 0.7rem → 0.62rem on phones.
- **Sign out:** unchanged (0.7rem / 0.62rem), so on phones the two lines are now the same size.

## Fix — Admin name edit cut names at the letter "s" (2026-10-05)
**Status:** Complete
**Files changed:** `server/src/routes/accountsAdmin.js`, `VERSION` (0.8.15 → 0.8.16)

**Summary:**
- **Bug:** the admin Accounts edit route's name cleaner had `/s+/g` instead of `/\s+/g`. The backslash was lost when the 0.8.8 change was applied through a shell-quoted `node -e` script. It replaced every run of the letter "s" with a space, so "Chris" saved as "Chri ", which looked like a 4-character limit.
- **Fix:** restored `/\s+/g`.
- **Scope:** sign-up's cleaner (`routes/auth.js`) was already correct. A scan found no other regexes damaged the same way.
- **Why testing missed it:** the 0.8.8 test used "Janet", which has no "s".
- **Data to fix:** any names already saved through the admin edit dialog may have spaces where an "s" should be (e.g. "Chri "). Re-enter them in Accounts → Edit.

## Follow-up — Phone greeting at the right edge (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/components/navbar/Navbar.module.css`, `VERSION` (0.8.16 → 0.8.17)

**Summary:**
- On phones (≤769px) the navbar's right padding drops from 3.125rem to 0.75rem, so the "Hello, <name>" / Sign In block sits at the right edge of the screen. The ☰ moves right with it.
- The logo side and desktop are unchanged.

## Follow-up — "Sign out" centered under the greeting (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/components/navbar/Navbar.module.css`, `VERSION` (0.8.17 → 0.8.18)

**Summary:**
- The navbar account block's `align-items` changed from `flex-end` to `center`, so "Sign out" is centered under "Hello, <name>" on desktop and phones.
- The signed-out "Sign In" link is a single item, so it is unaffected.

## Fix — Page opened scrolled down after signing in (2026-10-05)
**Status:** Complete (lint clean; not verified on a phone)
**Files changed:** `client/src/pages/account/SignIn.jsx`, `VERSION` (0.8.18 → 0.8.19)

**Summary:**
- **Cause:** a successful sign-in navigated programmatically (`navigate(from || "/")`), which keeps the window's scroll position. On a phone, the Sign In page is usually scrolled down to the form (the keyboard pushes it up), so Home opened partway down.
- **Fix:** before navigating, the focused input is blurred (closing the phone keyboard). After navigating, `window.scrollTo(0, 0)`.
- Sign out needed no change: it is reached from the navbar link, whose click handler already scrolls to the top.

## Follow-up — Link Creator accounts to an artist (2026-10-05)
**Status:** Complete. **The migration has not been applied to any live database.** Server rules verified on a throwaway DB; UI not verified in a browser.
**Files changed:** `data/sql/migrations/add_account_tables.sql`, `data/sql/createdb.sql`, `server/src/routes/accountsAdmin.js`, `client/src/admin/pages/accounts/{AccountsAdmin,AccountEditDlg}.jsx`, `VERSION` (0.8.19 → 0.8.20)

**Summary (decisions confirmed with the user: one artist per account; changing away from Creator clears the link):**
- **Schema:** new `account.ra_key integer REFERENCES artist(ra_key) ON DELETE SET NULL`, plus a partial unique index `idx_account_ra_key`, so an artist links to at most one account. The migration adds them with `ADD COLUMN IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT EXISTS`. Deleting an artist (admin Users page) just unlinks the account.
- **`PUT /api/admin/accounts/:id`:**
  - accepts `ra_key`, and checks that the artist exists (400 otherwise);
  - the link only sticks while `access_level = 30`, and any other level clears it;
  - an artist already linked elsewhere gets 409 "That artist is already linked to another account" (matched by constraint name, so it isn't confused with the duplicate-email 409).
- **`GET`** now returns `ra_key` and `artist_name`.
- **Admin Accounts page:**
  - a new sortable "Artist" column;
  - the edit dialog shows a "Linked Artist" dropdown only while Access Level is Creator, listing all artists (from `/api/users`) sorted by name;
  - artists linked to another account are disabled and labeled with that account's email.
- **Verified:** link, duplicate-artist 409, ignored on non-Creator, unknown artist 400, demote clears, relink, and artist delete sets null.

## Follow-up — Creators automatically follow their own rocks (2026-10-05)
**Status:** Complete (server verified on a throwaway DB; UI not verified in a browser). No schema change.
**Files changed:** new `server/src/utils/followedRocks.js`; `server/src/routes/{follows,rockPosts,accountsAdmin}.js`, `server/src/utils/rock-upload/notifyFollowers.js`, `client/src/pages/follow-rocks/FollowRocks.jsx` (+ `.module.css`), `VERSION` (0.8.20 → 0.8.21)

**Summary:**
- **Followed rocks:** an account now follows its `account_follow` rows **plus**, for a Creator linked to an artist, every rock linked to that artist (`artist_link`) — its "own" rocks.
- **Computed, not stored:** new rocks for the artist appear automatically, and changing the account away from Creator (which clears the link) or deleting the artist removes them.
- **Shared SQL:** `utils/followedRocks.js` (`ownRockNumbersSql`, `followedRockNumbersSql`) is used by:
  - `GET /api/follows` (adds an `own` flag);
  - `GET /api/follows/ids`, so own rocks show as orange map pins and in the map filter;
  - `GET /api/rock-posts?followed=1` (Track the Rocks switch);
  - the admin Accounts "Following" count.
- **Emails:** `notifyFollowers` also emails the Creator when one of their own rocks moves (still subject to their email switch, lock and level).
- **Can't be removed:** `DELETE /api/follows/:rockNumber` refuses own rocks (400), including ones the Creator had also followed explicitly.
- **On the page:** the Follow Rocks table shows a "Your rock" tag under the rock number and no trash icon on those rows. Search results already show them as "Following".
- **Verified:** creator ids/list with the `own` flag; delete own → 400; delete non-own → 200; the followed=1 total counts own rocks; the rock-8 move emailed the creator.

## Follow-up — Paintbrush icon for a Creator's own rocks (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/pages/follow-rocks/FollowRocks.jsx` (+ `.module.css`), `VERSION` (0.8.21 → 0.8.22)

**Summary:**
- The "Your rock" tag under the rock number is replaced by an orange paintbrush icon (`FaPaintBrush`) to the left of the artist name on own-rock rows.
- Hovering it shows "You painted this rock" (`title` + `aria-label`).
- Rows still have no trash icon.

## Follow-up — Followed-rock count in the heading (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/pages/follow-rocks/FollowRocks.jsx`, `VERSION` (0.8.22 → 0.8.23)

**Summary:**
- The "Rocks you follow" heading now shows the number of rocks on the list, e.g. "Rocks you follow (12)".
- The count includes a Creator's own rocks, updates as rocks are followed or removed, and is hidden while the list is still loading.

## Follow-up — 90-day sign-ins; password reset / lock signs out every device (2026-10-05)
**Status:** Complete. **The migration has not been applied to any live database.** Verified end-to-end on a throwaway Postgres + Mailpit (12/12 checks).
**Files changed:** `data/sql/migrations/add_account_tables.sql`, `data/sql/createdb.sql`, `server/src/middleware/requireAuth.js`, `server/src/routes/{auth,accountsAdmin}.js`, `server/scripts/createAdmin.js`, `server/.env`, `data/docker-compose/.env`, `data/docker-compose/demo`, `CLAUDE.md`, `VERSION` (0.8.23 → 0.8.24)

**Summary:**
- **Sign-in length:** `JWT_EXPIRES_IN` goes from `30d` to `90d` in both `.env` files and `demo`, and the code default is also `90d`. Still a fixed window from sign-in, not sliding.
- **Closing the gap** (a password change didn't sign out other devices):
  - New column `account.token_version integer NOT NULL DEFAULT 0` (the migration uses `ADD COLUMN IF NOT EXISTS`).
  - The JWT now carries `ver` = `token_version` at sign-in, and `requireAuth`'s `loadAccount` rejects a token whose `ver` doesn't match. A token with no `ver` (issued before this change) is treated as version 0, so existing sign-ins keep working until the first bump.
- **What bumps `token_version`** (signing that account out everywhere):
  - a password reset (`POST /api/auth/reset-password`, which covers Forgot Password and the admin's "Send password reset email");
  - `npm run create-admin` updating an existing admin's password;
  - the account becoming locked, either from the 5th bad password or an admin locking it. Bumping on lock means unlocking later doesn't revive old sign-ins.
- **Doesn't sign anyone out:** other admin edits (name, level, email switch, etc.).
- **Verified:**
  - tokens carry `ver` and last 90 days;
  - a reset kills both "devices", and a new sign-in works;
  - admin lock + unlock kills the old sign-in;
  - a non-lock edit keeps it;
  - an auto-lock kills it even after a manual unlock;
  - a legacy token without `ver` is accepted at version 0;
  - the admin is unaffected.
- **Deviation from the feature plan:** the plan specified 30d. Changed at the user's request.

## Follow-up — Accounts page edit icon (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/admin/pages/accounts/AccountsAdmin.jsx` (+ `.module.css`), `VERSION` (0.8.24 → 0.8.25)

**Summary:**
- The admin Accounts table's "Edit" text button is now the same blue `FaEdit` icon the other admin tables use, matching `users/user-table/UserTable`: 1.1rem, darker on hover, and scales to 1.15.
- It has an "Edit" tooltip and an aria-label with the account email.
- The actions column narrowed from 70px to 50px.

## Follow-up — Admins can have a linked artist too (2026-10-05)
**Status:** Complete (server verified on a throwaway DB). No schema change.
**Files changed:** `server/src/middleware/requireAuth.js` (new `ARTIST_LINK_LEVELS` = [30, 50]), `server/src/routes/accountsAdmin.js`, `server/src/utils/followedRocks.js`, `server/src/utils/rock-upload/notifyFollowers.js`, `client/src/admin/pages/accounts/AccountEditDlg.jsx`, `VERSION` (0.8.25 → 0.8.26)

**Summary:**
- The artist link (`account.ra_key`) is now allowed for Creator **and** Admin accounts. The edit dialog shows "Linked Artist" for both levels, and only changing to User or Unverified clears it.
- Admins get the same "own rocks" behavior as Creators:
  - auto-followed (Follow Rocks, map pins/filter, Track the Rocks switch, admin follow count);
  - a paintbrush icon, and they can't be removed;
  - rock-move emails.
- An admin can link their own account. The level dropdown stays locked for self-edits, but the artist dropdown doesn't.
- **Verified:**
  - an admin links themselves and follows their own rock;
  - removing it gives 400;
  - a User-level link is ignored;
  - a second account linking the same artist gives 409.

## Fix — Admin Accounts "Following" counts were inflated (2026-10-05)
**Status:** Complete (verified on a throwaway DB)
**Files changed:** `server/src/utils/followedRocks.js`, `VERSION` (0.8.26 → 0.8.27)

**Summary:**
- **Bug (introduced in 0.8.21):** `ownRockNumbersSql` aliased its table `account a`, and the admin Accounts query passes its own outer column `a.id` as the parameter. Inside the fragment, `WHERE a.id = a.id` referred to the inner alias on both sides, which is always true. So every account's `follow_count` included the own rocks of *every* linked Creator/Admin.
- **Not affected:** the other callers pass a bind parameter (`$1` / `$3::int`). Follow Rocks, map pins/filter, Track the Rocks, the removal guard and the follower emails were correct.
- **Fix:** the fragment's aliases are now `own_acct` / `own_al` / `own_rc`, so an outer `a.id` can't be captured.
- **Verified:** each account's `follow_count` equals the length of its own `/api/follows/ids` (3/1/2/0 in the test).

## Follow-up — Admin "Users" page renamed to "Artists" (2026-10-05)
**Status:** Complete
**Files changed:** `client/src/App.jsx`, `client/src/admin/pages/users/Users.jsx`, `client/src/admin/pages/users/user-create-edit-dlg/UserCreateEditDlg.jsx`, `VERSION` (0.8.27 → 0.8.28)

**Summary:**
- The admin page that manages the `artist` table was labeled "Users", which got confusing next to the new Accounts page. Renamed only the user-facing text:
  - nav label "Users" → "Artists";
  - page heading "Users Dashboard" → "Artists";
  - "+ New User" → "+ New Artist";
  - dialog titles "Create/Edit User" → "Create/Edit Artist";
  - the delete confirmation and the duplicate-name error now say "artist".
- **Unchanged:** the route `/admin/users`, the API `/api/users`, and the file/component names, so existing links and code are unaffected.

## Follow-up — Removed DOB / Age from Artists and the dashboard (2026-10-05)
**Status:** Complete (lint and build clean; routes and dashboard query verified on a throwaway DB). No schema change.
**Files changed:** `client/src/admin/pages/users/{Users.jsx,user-table/UserTable.jsx,user-create-edit-dlg/UserCreateEditDlg.jsx}`, `client/src/admin/components/ar-details/ARDetails.jsx`, `server/src/routes/{users,arDetails}.js`, `VERSION` (0.8.28 → 0.8.29)

**Summary:**
- **Artists page:** the DOB and Age columns are removed, and the client-side `calculateAge` is gone. The create/edit dialog no longer has the (required) Date of Birth field. Name + relation are required as before.
- **Admin dashboard, AR Details widget:** the artists table no longer has an Age column, and `routes/arDetails.js` no longer computes `age` from `artist.dob`.
- **`/api/users` (artists):** POST no longer sets `dob`. PUT no longer touches `dob`, so existing birth dates aren't wiped when an artist is edited.
- **Kept:** the `artist.dob` column and its existing values. Nothing displays or edits them now; dropping the column would be a separate, explicit data-model change.
- **Verified:** an edit keeps the existing `dob`, a create works without it, and the dashboard query returns name/relation/rocks.

## Follow-up — "Last Active" on admin Accounts (2026-10-05)
**Status:** Complete. **The migration has not been applied to any live database.** Verified on a throwaway DB.
**Files changed:** `data/sql/migrations/add_account_tables.sql`, `data/sql/createdb.sql`, `server/src/middleware/requireAuth.js`, `server/src/routes/{auth,accountsAdmin}.js`, `client/src/admin/pages/accounts/AccountsAdmin.jsx`, `VERSION` (0.8.29 → 0.8.30)

**Summary:**
- **New column** `account.last_seen_dt timestamptz` (the migration uses `ADD COLUMN IF NOT EXISTS`).
- **When it's set:**
  - stamped on sign-in;
  - refreshed by `requireAuth`/`optionalAuth`'s `loadAccount` on any authenticated request. The client calls `/api/auth/me` on every page load, plus Follow Rocks / map / Track the Rocks calls.
- **Throttled:** the `UPDATE` only fires when the stored value is null or older than 5 minutes, so it's at most one write per account per 5 minutes. It's fire-and-forget and errors are only logged, so it never slows or fails a request.
- **Admin Accounts** gets a sortable "Last Active" column next to "Last Sign In".
- **Verified:** set on sign-in; a 10-minute-old value is refreshed by a request; a 2-minute-old value is left unchanged (throttled).

## Follow-up — Admins can delete accounts (2026-10-05)
**Status:** Complete (verified on a throwaway DB). No schema change.
**Files changed:** `server/src/routes/accountsAdmin.js`, `client/src/admin/pages/accounts/AccountsAdmin.jsx` (+ `.module.css`), `VERSION` (0.8.30 → 0.8.31)

**Summary:**
- **Endpoint:** new `DELETE /api/admin/accounts/:id`. It returns 404 if the account is missing and 400 for your own account.
- **What goes with it:** the account's `account_follow` and `account_token` rows (existing `ON DELETE CASCADE`). A linked artist is untouched.
- **Accounts page:** a red trash icon (`FaTrash`, styled like the Artists table) next to the edit icon. It is hidden on your own row and asks for a `window.confirm` naming the person and email ("…followed rocks are removed too. This can't be undone."). On success the row is removed from the table.
- **Undone by** the 0.8.8 decision not to offer deletion ("none was requested"); now requested.
- **Verified:** self-delete → 400; delete another → 200 and its follows/tokens are gone while the artist remains; unknown id → 404.
