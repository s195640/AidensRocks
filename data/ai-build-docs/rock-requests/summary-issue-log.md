# Rock Requests — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase.

## Phase 1 — Request A Rock form, rock_requests table, admin Rock Requests page (2026-09-24)
**Status:** Complete (not yet applied to any live database)
**Files changed:**
- New: `data/sql/migrations/add_rock_requests.sql`, `server/src/routes/rockRequests.js`, `client/src/admin/pages/rock-requests/RockRequestsAdmin.jsx`, `client/src/admin/pages/rock-requests/rock-requests-table/RockRequestsAdminTable.jsx` (+ `.module.css`), `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/RockRequestsEditDialog.jsx` (+ `.module.css`), this file
- Changed: `data/sql/createdb.sql`, `data/sql/pglogical.sql`, `data/sql/droptables.sql`, `server/src/routes/serverHealth.js`, `server/src/app.js`, `server/src/routes/rocks.js`, `client/src/components/contact-request-rocks/ContactReqestRocks.jsx` (+ `.module.css`), `client/src/components/upload-rock-form/UploadRockForm.jsx` (+ `.css`), `client/src/App.jsx`, `VERSION`

**Summary:**
- **New table `rock_requests`** (`rq_key`, `name`, `email`, `address`, `rocks_requested`, `shipped`, `tracking_number`, `comments`, `rock_numbers`, `create_dt`, `update_dt`, `sent_dt`) captures visitor "Request A Rock" submissions and admin fulfillment tracking. Registered in `createdb.sql`/`pglogical.sql`/`droptables.sql`/`serverHealth.js`'s `TABLES` list following the exact pattern established for `unmatched_path_hit`/`entry_media`/`path_display_name`.
- **New nullable `catalog.rq_key` column** links a cataloged rock to the request it's currently assigned to (no DB-level FK, matching this codebase's existing style). `rock_numbers` on `rock_requests` is a plain comma-separated text field (e.g. `"343,234,54"`) — validated and synced against `catalog.rq_key` only in application code, both client-side (UX convenience) and server-side (authoritative, inside a transaction). A rock number must exist in `catalog` and not already be linked to a *different* request; listing a rock links it to the current request, removing it from the list unlinks it.
- **`sent_dt` transition rule:** stamped with `CURRENT_TIMESTAMP` only on a `shipped` false→true transition; never cleared on true→false, and untouched on any other save.
- **Public "Request A Rock"** (`ContactReqestRocks.jsx`, opened from `FloatingRockLink.jsx` and now also from the post-upload "Thank You" dialog in `UploadRockForm.jsx`) replaced its static mailto message with a real form (Name/Email/Address/# Rocks, all required) that POSTs to the new public `POST /api/rock-requests` endpoint. A DB insert failure is the only thing that fails the request; a failed admin-notification email is only logged server-side (`console.error`) and never affects the response already sent to the visitor — confirmed requirement.
- **New admin page** `/admin/rock-requests` ("Rock Requests" in the nav, after "Journey"), modeled directly on `JourneyAdmin.jsx`/`JourneyAdminTable.jsx`/`JourneyAdminEditDialog.jsx`: two tables split literally on `shipped` ("Pending"/"Shipped"), a read-only `shipped` checkbox in the table (copies the disabled `email_sent` cell pattern, not the editable `show` pattern — confirmed requirement), and a single edit-icon action opening a dialog where all fields including `shipped`/`tracking_number`/`comments`/`rock_numbers` can be changed. No delete route/UI — none was requested.
- **`GET /api/rocks`** now also selects `rc.rq_key` so the new edit dialog can validate its `rock_numbers` field against current catalog assignments client-side, mirroring `RockCreateEditDlg.jsx`'s existing `numbersSeen`/`rocks.some(...)` validation shape.
- **VERSION:** root `VERSION` bumped `0.4.0` → `0.5.0` (new feature folder, per CLAUDE.md's Y-bump rule).

**Deviations from plan:** None — plan was finalized via in-conversation Q&A (plan-mode) before implementation; all four open decisions (single free-text address field, rock-validation meaning, read-only shipped toggle in the table, email-failure tolerance) were confirmed with the user before writing any code.

**Issues/gotchas encountered:**
- Not applied to any live database — this repo has no migration runner. `add_rock_requests.sql`'s `CREATE TABLE`/`ALTER TABLE` statements still need to be run manually against local/dev, then identically on both prod nodes (plus the `pglogical.replication_set_add_table` line in `data/sql/pglogical.sql`, provider node only, with `synchronize_data := false` since the table starts empty), before this feature is live.
- Pre-existing, unrelated ESLint errors exist elsewhere in the client codebase (`JourneyAdmin.jsx`, `RockTable.jsx`, etc.) — not touched or introduced by this feature; only the files this feature actually changed were verified to lint clean.

**Open questions for human review:**
1. Run the migration against local/dev and verify end-to-end per this feature's plan's verification steps (submit a request, confirm the notification email, edit it in the new admin page, assign/unassign catalog rock numbers, mark shipped) before considering this done.

## Phase 2 — Message field, email_dt, Send Email action, popup outside-click fix (2026-09-24)
**Status:** Complete (not yet applied to any live database)
**Files changed:**
- New: `data/sql/migrations/add_message_and_email_dt_to_rock_requests.sql`, `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/SendRockRequestEmailDialog.jsx` (+ `.module.css`)
- Changed: `data/sql/createdb.sql`, `server/src/routes/rockRequests.js`, `client/src/components/contact-request-rocks/ContactReqestRocks.jsx` (+ `.module.css`), `client/src/admin/pages/rock-requests/RockRequestsAdmin.jsx`, `client/src/admin/pages/rock-requests/rock-requests-table/RockRequestsAdminTable.jsx` (+ `.module.css`), `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/RockRequestsEditDialog.jsx` (+ `.module.css`), `VERSION`

**Summary:**
- **Public popup no longer closes on outside click.** `ContactReqestRocks.jsx`'s overlay `onClick={onClose}` was removed — closing now only happens via the form's own Close/Submit-success-Close buttons, matching the shared admin `Dialog` component's default (`closeOnOutsideClick = false`).
- **New optional `message` field** on the public request form, stored in a new `rock_requests.message` column. Included in the admin notification email when non-blank. **Deliberately excluded from the admin `PUT /api/rock-requests/:rq_key` route's accepted fields** — it can only ever be set at insert time, never edited afterward, per request ("read only on the backend"). Shown in the admin table (truncated at 150 chars, click-to-expand via a "Full Message" `Dialog`, copying `JourneyAdminTable.jsx`'s existing comment-cell pattern) and in the edit dialog as a plain non-input `<div>` (not a form control), labeled "Message (from requester)".
- **New `rock_requests.email_dt`** column, stamped only by the new `POST /api/rock-requests/:rq_key/send-email` route, only after a successful send — mirrors `jobsAdmin.js`'s `send-emails-catchup/send` send-then-record convention. Also excluded from the general `PUT` route's accepted fields for the same reason as `message`.
- **New "Send Email" action** in the edit dialog opens `SendRockRequestEmailDialog.jsx` — a second `Dialog` rendered as a sibling (not nested) inside `RockRequestsEditDialog.jsx`; two sibling `Dialog`s at the same `z-index: 2000` tier stack correctly with no CSS changes needed. Subject/body are pre-filled with a default (rock numbers + tracking number + a thank-you mentioning Aiden, gracefully omitting either detail line when not yet set) but fully editable before sending. Send is gated behind `window.confirm`, same "real send, no undo" convention as `SendEmail.jsx`/`SendEmailsCatchup.jsx`. On success, calls a new `onEmailSent` callback (a lighter-weight sibling to `onSave` — just `fetchRequests()`, no `fetchRocks()`/dialog-close) so the underlying table refreshes in the background **without closing the edit dialog**, letting the send dialog's own "Email sent" confirmation actually be seen before the admin closes it manually. (Using the existing `onSave` here instead would have closed the edit dialog synchronously on send-success, before the confirmation could render — caught and fixed during implementation, not part of the original plan text.)
- **VERSION:** root `VERSION` bumped `0.5.0` → `0.5.1` (patch, same feature folder).

**Deviations from plan:** The plan's `onSent` handler said to call the existing `onSave()` callback; implemented instead with a new, separate `onEmailSent` prop (`fetchRequests()` only, no dialog close) once it became clear `onSave()` closing the edit dialog would cut off the send dialog's own success confirmation before it could be seen. Functionally equivalent goal (table stays in sync), different mechanism.

**Issues/gotchas encountered:** None beyond the `onSave`/`onEmailSent` split above.

**Open questions for human review:**
1. Run `add_message_and_email_dt_to_rock_requests.sql` against local/dev (after `add_rock_requests.sql`, if not already applied) and verify end-to-end: submit a request with a message, confirm it's read-only in the edit dialog, send a follow-up email and confirm `email_dt` updates in both the dialog and the table.

## Phase 3 — Shipped-on-send checkbox, create-from-admin (2026-09-24)
**Status:** Complete (not yet applied to any live database)
**Files changed:**
- New: `client/src/admin/pages/rock-requests/rock-requests-create-dlg/CreateRockRequestDialog.jsx` (+ `.module.css`), `client/src/admin/pages/rock-requests/RockRequestsAdmin.module.css`
- Changed: `server/src/routes/rockRequests.js`, `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/SendRockRequestEmailDialog.jsx` (+ `.module.css`), `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/RockRequestsEditDialog.jsx`, `client/src/admin/pages/rock-requests/RockRequestsAdmin.jsx`, `VERSION`

**Summary:**
- **`insertRockRequest()` helper extracted** in `rockRequests.js` so the public `POST /` and new admin `POST /admin-create` share identical validation/insert logic. The public route still fire-and-forgets the `AidensRocks.AAA@gmail.com` notification email afterward; the admin route **does not** — confirmed requirement, since the admin entering the request already knows about it.
- **New admin-gated `POST /api/rock-requests/admin-create`** (same body shape as the public form: name/email/address/rocksRequested/message) backs a new "+ Create Request" button on the admin page (`CreateRockRequestDialog.jsx`, built on the shared `Dialog`, same field set/validation as the public `ContactReqestRocks.jsx` form). Deliberately doesn't collect `shipped`/`tracking_number`/`rock_numbers`/`comments` at creation — those stay in the normal edit flow afterward, same as a real visitor submission would produce.
- **`POST /:rq_key/send-email` now accepts an optional `markShipped` boolean.** On a successful send, `email_dt` always updates; if `markShipped` is true, `shipped` is set true and `sent_dt` is stamped using the same false→true-only transition rule the `PUT` route already uses (never re-stamped, never cleared). Response now returns `{ email_dt, shipped, sent_dt }` instead of just `email_dt`.
- **`SendRockRequestEmailDialog.jsx`** gained an "Also mark this request as Shipped" checkbox, defaulting to checked only when the request isn't already shipped (avoids a confusing default-on no-op for an already-shipped request). Confirmed UI choice: a checkbox in the dialog, not a second native `confirm()` popup.
- **`RockRequestsEditDialog.jsx`** now passes `SendRockRequestEmailDialog` a merged view of the request (`request` prop overlaid with the dialog's own live `formData.shipped`/`tracking_number`/`rock_numbers` and `emailDt` state) instead of the original stale `request` prop — otherwise a second Send Email within the same still-open edit session would keep defaulting the Shipped checkbox from outdated data. Its `onSent` handler now also patches `formData.shipped` from the response, so the edit dialog's own Shipped checkbox reflects a mark-shipped-on-send immediately without closing/reopening.
- **VERSION:** root `VERSION` bumped `0.5.3` → `0.5.4` (patch, same feature folder).

**Deviations from plan:** None.

**Issues/gotchas encountered:** An initial edit to `rockRequests.js`'s `POST /` handler left a dangling, syntactically-broken `catch` block (leftover from restructuring it around the new `insertRockRequest()` helper) — caught immediately via `node --check` before it was ever considered done, then rewritten cleanly.

**Open questions for human review:**
1. Same as Phase 1/2 — nothing in this feature has been applied to a live database yet. Verify end-to-end once migrated: send-with-shipped-checked moves a row from Pending to Shipped and stamps `sent_dt` once; send-with-shipped-unchecked only updates `email_dt`; admin-created requests appear in the table without triggering a notification email.

## Phase 4 — Send Email dialog auto-closes on success (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/SendRockRequestEmailDialog.jsx` (+ `.module.css`), `VERSION`
**Summary:** Per request, `SendRockRequestEmailDialog.jsx` now calls `onSent(data)` then `onClose()` directly on a successful send, instead of flipping to an inline "Email sent to X" screen with its own Close button. A failed send still leaves the dialog open with the error shown (unchanged) so the admin can fix and retry. Removed the now-dead `sent` state and the now-unused `.successMessage` style.
**Deviations from plan:** None.
**Issues/gotchas encountered:** First edit pass left a stray trailing `}` after removing the ternary's success branch (`</div>}` instead of `</div>`) — caught by reading the file back before running lint, fixed before it was ever run.
**VERSION:** `0.5.4` → `0.5.5` (patch, same feature folder).

## Phase 5 — Soft delete for rock requests (2026-09-24)
**Status:** Complete (not yet applied to any live database)
**Files changed:**
- New: `data/sql/migrations/add_deleted_to_rock_requests.sql`
- Changed: `data/sql/createdb.sql`, `server/src/routes/rockRequests.js`, `client/src/admin/pages/rock-requests/RockRequestsAdmin.jsx`, `client/src/admin/pages/rock-requests/rock-requests-table/RockRequestsAdminTable.jsx`, `VERSION`

**Summary:**
- **New `rock_requests.deleted` (boolean, default false) + `deleted_dt` (timestamptz) columns.** Deleting a request is *always* a soft delete — the row is never actually removed. `GET /api/rock-requests` now filters `WHERE deleted = false`, so a deleted request simply stops appearing anywhere in the admin page; there's no separate "view deleted" UI, matching the request's plain scope ("dont display them on the page").
- **New `DELETE /api/rock-requests/:rq_key`** (admin-gated): 404s if the request doesn't exist or is already deleted; otherwise checks `SELECT COUNT(*) FROM catalog WHERE rq_key = $1` — if any catalog rows are still linked, rejects with `400` and a message telling the admin to clear the Rock Numbers field first (which already unlinks them via the existing `PUT` route's sync logic). Only if the count is zero does it flip `deleted = true` / stamp `deleted_dt`.
- **Admin table** gained a `FaTrash` delete icon next to the edit icon (same hover-scale styling as `FaEdit`), gated behind `window.confirm` at the page level (`RockRequestsAdmin.jsx`'s new `handleDelete`, matching `JourneyAdmin.jsx`'s delete-confirmation convention). A blocked delete (linked rocks) surfaces the server's message via `alert(...)`.
- **VERSION:** root `VERSION` bumped `0.5.5` → `0.5.6` (patch, same feature folder).

**Deviations from plan:** None — scope was exactly as requested (soft delete via flag, hidden from the page, blocked while rocks are linked).

**Issues/gotchas encountered:** None.

**Open questions for human review:**
1. Same as prior phases — migrate and verify end-to-end: deleting a request with linked rock numbers is rejected with a clear message; clearing the Rock Numbers field first and retrying succeeds; the deleted request disappears from both Pending and Shipped tables.

## Phase 6 — "Show Deleted" toggle + undelete (2026-09-24)
**Status:** Complete (not yet applied to any live database)
**Files changed:**
- Changed: `server/src/routes/rockRequests.js`, `client/src/admin/pages/rock-requests/RockRequestsAdmin.jsx` (+ `.module.css`), `client/src/admin/pages/rock-requests/rock-requests-table/RockRequestsAdminTable.jsx`, `VERSION`

**Summary:**
- **`GET /api/rock-requests` no longer filters out soft-deleted rows** — it now always returns every request (including `deleted`/`deleted_dt`), and the admin page's "Show Deleted" toggle is a purely client-side view over that one payload rather than a second query/param. Pending/Shipped always exclude deleted rows regardless of the toggle; a third "Deleted" section only renders when the toggle is on.
- **New `POST /api/rock-requests/:rq_key/undelete`** (admin-gated): flips `deleted` back to `false` and clears `deleted_dt`. No linked-rocks check needed (undeleting never touches `catalog`).
- **"Show Deleted" toggle** in the admin header uses the existing reusable `ToggleSwitch` component (`client/src/components/simple-components/toggle-switch/ToggleSwitch.jsx`), default off, matching the request.
- **Deleted rows get a different Actions cell**: a single `FaTrashRestore` "Undelete" icon instead of Edit/Delete, since editing or re-deleting an already-deleted request doesn't make sense.
- **VERSION:** root `VERSION` bumped `0.5.6` → `0.5.7` (patch, same feature folder).

**Deviations from plan:** None.

**Issues/gotchas encountered:** None.

**Open questions for human review:**
1. Same as prior phases — migrate and verify end-to-end: toggle off (default) never shows deleted rows anywhere; toggle on reveals a "Deleted" section; clicking Undelete there moves the row back into Pending/Shipped and the toggle can be switched off again without it reappearing incorrectly.

## Phase 7 — Gate Send Email on no unsaved changes; Save no longer closes the dialog (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/RockRequestsEditDialog.jsx` (+ `.module.css`), `client/src/admin/pages/rock-requests/RockRequestsAdmin.jsx`, `VERSION`

**Summary:**
- **`RockRequestsEditDialog.jsx` now tracks a `savedFormData` baseline** alongside the live `formData`, compared via a new `formsEqual()` helper (string-coerced field-by-field, not `===`/`JSON.stringify`, specifically to avoid a false "unsaved changes" read from `rocks_requested` being a number before the admin ever touches that input but a string the moment they do — an untouched-vs-touched type mismatch that would otherwise permanently block Send Email).
- **"Send Email" is now disabled whenever `isDirty`** (`formData` doesn't match `savedFormData`), with a `title` tooltip explaining why. `savedFormData` updates on a successful Save, and separately whenever a Send Email response changes `shipped` directly (so marking shipped via the send-email flow doesn't itself read as an "unsaved change" afterward).
- **Save no longer closes the dialog.** `RockRequestsAdmin.jsx`'s `onSave` callback dropped its `setEditingRequest(null)` — it now only refetches. The admin closes the dialog manually (Cancel button, Escape, or the dialog's own affordances) once they're done, which is also what makes the new Send Email gating usable in one sitting: edit → Save → (now enabled) Send Email, without a close/reopen round-trip.
- Added a small transient "Saved" text next to the buttons (auto-clears after 3s) since closing-on-save was previously the only feedback a save had succeeded, and that signal was removed by the above change.
- **VERSION:** root `VERSION` bumped `0.5.7` → `0.5.8` (patch, same feature folder).

**Deviations from plan:** None — both requested behaviors implemented directly; the "Saved" indicator and the `formsEqual` type-coercion handling were judgment calls made to avoid leaving the requested change in a broken/confusing state, not scope additions beyond what was asked.

**Issues/gotchas encountered:** None.

**Open questions for human review:**
1. Verify end-to-end: edit a field → Send Email stays disabled with a tooltip → Save → Send Email becomes enabled and a brief "Saved" note appears → dialog stays open after Save → Cancel/Escape closes it. Also verify sending an email with "Also mark this request as Shipped" checked doesn't leave Send Email looking dirty afterward.

## Phase 8 — Visibly gray out the disabled Send Email button (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/RockRequestsEditDialog.jsx` (+ `.module.css`), `VERSION`
**Summary:** Discovered while implementing this that the shared `Dialog` component's `buttonPanel` buttons have no `:disabled` styling at all (`Dialog.module.css`'s `.dialogButtons button` is a flat green background regardless of the `disabled` attribute) — so a disabled Send Email button looked identical to an enabled one. Rather than touch the shared `Dialog` component's CSS (which would affect every other admin dialog's disabled buttons too, out of scope for this request), scoped a conditional inline `style` to just this one button when `isDirty` (gray background/text, `not-allowed` cursor — inline `style` reliably wins over the external stylesheet without fighting CSS specificity/import order). Also added a visible `"Save required to send email"` text next to the button (not just the existing hover `title` tooltip, which is easy to miss), matching the wording the user asked for.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.5.8` → `0.5.9` (patch, same feature folder).

## Phase 9 — Clickable rock numbers reuse the Track the Rocks journey dialog (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rock-requests/rock-requests-table/RockRequestsAdminTable.jsx` (+ `.module.css`), `VERSION`
**Summary:** The "Rock Numbers" column's CSV string is now parsed and rendered as individually clickable numbers; clicking one opens `client/src/components/rock-map/rock-journey-dialog/RockJourneyDialog.jsx` — the exact same shared dialog already used by both the map page and Track the Rocks (its own header comment already describes it as shared for that reason), not a new one. It's a self-contained public component (fetches `/api/rock-posts/:rockNumber` itself, no map/Leaflet context dependency), so it drops into the admin table with no changes needed to the dialog itself. Same `z-index: 2000` modal tier as the rest of the app, and since it's only ever opened directly from the table (never stacked on top of the edit dialog), there's no stacking-context concern.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.5.9` → `0.5.10` (patch, same feature folder).

## Phase 10 — Correction: rock number click should open the picture popup, not the full journey dialog (2026-09-24)
**Status:** Complete
**Files changed:**
- New: `client/src/components/rock-popup/RockPopupByNumber.jsx`
- Changed: `client/src/admin/pages/rock-requests/rock-requests-table/RockRequestsAdminTable.jsx`, `VERSION`

**Summary:** Phase 9 wired rock-number clicks to `RockJourneyDialog` (the full journey timeline/collections view) — wrong target. What the user actually meant was the *smaller* popup that opens when you click the rock thumbnail in the top-left corner of `RockBanner` inside that journey dialog: `RockImage.jsx` → `RockPopup.jsx` (just the catalog picture, artist name(s), trip count, and start/latest dates). `RockImage` only opens `RockPopup` given props (`totalTrips`/`startDate`/`latestDate`/`artists`) that a nearby `RockJourney` has already computed from a `collections` array — the admin table has no such context, just a bare rock number. New `RockPopupByNumber.jsx` fetches `GET /api/rock-posts/:rockNumber` and derives those same four values the exact same way `RockJourney.jsx`/`RockMapPopup.jsx` already do (`entries.length`, `entries[0].date`, `entries[last].date`, `entries[0].artists`), then renders the same `RockPopup`. Swapped into `RockRequestsAdminTable.jsx` in place of `RockJourneyDialog`.
**Deviations from plan:** None — this replaces Phase 9's dialog choice per direct correction from the user.
**Issues/gotchas encountered:** `RockPopup.css`'s backdrop is `z-index: 1000` (page-content tier per `CLAUDE.md`'s stacking-context notes, not the `~2000` true-modal tier `Dialog`/`RockJourneyDialog` use) — pre-existing in that component, not touched here since it already works correctly in its existing public usage and CLAUDE.md's own guidance is to suspect an ancestor's stacking context before bumping a z-index without evidence of an actual visible problem. Worth a quick visual check once this is verified live in case the admin page's DOM structure differs enough to actually expose it.
**VERSION:** `0.5.10` → `0.5.11` (patch, same feature folder).

## Phase 11 — Clickable rock numbers on the edit dialog too (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/RockRequestsEditDialog.jsx` (+ `.module.css`), `client/src/components/rock-popup/RockPopup.css`, `VERSION`
**Summary:**
- The "Rock Numbers" field in the edit dialog is a free-text `<textarea>` (individual characters inside a textarea can't be made clickable), so a read-only parsed preview of the current value now renders just below it — each number a clickable link, reusing the same `RockPopupByNumber` from Phase 10. Only shown when the field is non-blank; updates live as the admin edits the textarea (parses `formData.rock_numbers`, not the last-saved value), so it always reflects what's currently typed, not just what's persisted.
- **Bumped `RockPopup.css`'s backdrop from `z-index: 1000` to `2100`.** This is exactly the pre-existing risk flagged in Phase 10's gotcha note, now a real (not hypothetical) problem: this popup can now be triggered from *inside* an already-open `Dialog` (the edit dialog itself, `z-index: 2000`), so it must render above that, not behind it. `2100` keeps it above the standard `~2000` modal tier per `CLAUDE.md`'s own tier convention. Fixing this now, scoped to just this one value, rather than leaving the dialog broken when opened from this new call site.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None new — resolves the one flagged in Phase 10.
**VERSION:** `0.5.11` → `0.5.12` (patch, same feature folder).

## Phase 12 — Fix: rock-picture popup rendering inside the edit dialog instead of on top of it (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/RockRequestsEditDialog.jsx`, `VERSION`

**Root cause:** Phase 11 (and, in fact, `SendRockRequestEmailDialog` even earlier) rendered `RockPopupByNumber`/`SendRockRequestEmailDialog` as **children inside** `<Dialog>...</Dialog>`'s JSX, not as siblings of it. `Dialog.module.css`'s `.dialog` has `transform: scale(...)` for its open/close animation (still an active, non-`none` transform even at rest via `animation-fill-mode: forwards`'s final `scale(1)`). Per CSS spec, *any* `transform` on an ancestor makes that ancestor the **containing block for `position: fixed` descendants** — so a fixed-position overlay nested inside stops being fixed to the viewport and becomes fixed relative to that transformed box instead. That's a different (and easier to miss) trigger than the `z-index`/stacking-context issue `CLAUDE.md` already documents, which is why bumping `RockPopup.css`'s `z-index` in Phase 11 didn't fix it — the popup wasn't losing a stacking fight, it was never anchored to the viewport in the first place.
**Fix:** Restructured `RockRequestsEditDialog.jsx`'s return to a fragment with `Dialog`, `SendRockRequestEmailDialog`, and `RockPopupByNumber` as three top-level siblings, instead of the latter two nested inside `Dialog`'s children. Verified `AdminContainer.module.css` (the nearest ancestor above all of this) has no `transform` of its own, so nothing higher up the tree can re-trap them.
**Deviations from plan:** None — this is a bugfix for behavior introduced in Phases 7 and 11, reported directly by the user.
**Issues/gotchas encountered:** The fix generalizes: *any* dialog-type component that itself renders a fixed-position overlay must never be nested inside another `Dialog`'s children in this codebase, specifically because of `.dialog`'s `transform`, not just because of z-index stacking. Worth keeping in mind for future dialogs-within-dialogs.
**VERSION:** `0.5.12` → `0.5.13` (patch, same feature folder).

## Phase 13 — Left-align the Shipped checkbox in the admin table (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rock-requests/rock-requests-table/RockRequestsAdminTable.jsx`, `VERSION`
**Summary:** The read-only "Shipped" checkbox cell in `RockRequestsAdminTable.jsx` was wrapped in `style={{ display: "flex", justifyContent: "center" }}`, centering it in the column. Changed to `justifyContent: "flex-start"` per request.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.5.13` → `0.5.14` (patch, same feature folder).

## Phase 14 — Correction: left-align the Shipped checkbox in the edit dialog, not the table (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rock-requests/rock-requests-table/RockRequestsAdminTable.jsx`, `client/src/admin/pages/rock-requests/rock-requests-edit-dlg/RockRequestsEditDialog.jsx` (+ `.module.css`), `VERSION`
**Summary:** Phase 13 targeted the wrong "Shipped" checkbox — reverted the table's cell back to `justifyContent: "center"`. The one the user actually meant is in the **edit dialog**'s form. Its label and checkbox were two separate full-width rows (label on its own line, then a bare left-flowing checkbox on the next), which read as visually off-center/misplaced against the form's other full-width inputs above and below it. Paired them into a single `<label>` wrapping both the checkbox and the "Shipped" text in a `display: flex; justify-content: flex-start;` row (new `.checkboxRow` class), matching the same label+checkbox pairing pattern already used by `SendRockRequestEmailDialog.jsx`'s "Also mark this request as Shipped" checkbox.
**Deviations from plan:** None — corrects Phase 13 per direct user feedback.
**Issues/gotchas encountered:** None.
**VERSION:** `0.5.14` → `0.5.15` (patch, same feature folder).

## Phase 15 — Surface the linked rock request on the Rocks admin page (2026-09-24)
**Status:** Complete
**Files changed:**
- New: `client/src/admin/pages/rocks/rock-request-info-dlg/RockRequestInfoDialog.jsx` (+ `.module.css`)
- Changed: `client/src/admin/pages/rocks/Rocks.jsx`, `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `client/src/admin/pages/rocks/rock-create-edit-dlg/RockCreateEditDlg.jsx` (+ `.module.css`), `VERSION`

**Summary:**
- **New `RockRequestInfoDialog.jsx`** — fully read-only view of a `rock_requests` row (name/email/address/# requested/shipped/tracking/rock numbers/comments/message/timestamps), built on the shared `Dialog`, single "Close" button. No editing here by design — the request only edits via the Rock Requests admin page's own edit dialog.
- **`Rocks.jsx`** now also fetches `GET /api/rock-requests` (already existed, admin-gated, already returns everything needed) and passes the list down to both `RockTable` and `RockCreateEditDlg` — no new server endpoint needed, since `GET /api/rocks` already returns `rq_key` per catalog row (added back in Phase 1 for the rock-number-assignment validation) and the request objects can be looked up client-side by matching `rq_key`.
- **`RockTable.jsx`**: rows whose `rq_key` matches a fetched request get a new `FaClipboardList` icon in the Actions column (alongside Edit/Delete), opening `RockRequestInfoDialog` for that rock's linked request. Rows with no link show no icon at all.
- **`RockCreateEditDlg.jsx`**: the single-rock edit form shows a "View Request from {name}" button (only when `selectedRock.rq_key` resolves to a request) that opens the same `RockRequestInfoDialog`. Rendered as a **sibling** of the edit `Dialog`, not nested inside its children — same `transform`-creates-a-containing-block-for-`position:fixed` fix from Phase 12, since this is another case of a fixed-overlay dialog that can be triggered from inside an already-open `Dialog`.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None — applied the Phase 12 sibling-not-nested lesson proactively this time instead of shipping the bug again.
**VERSION:** `0.5.15` → `0.5.16` (patch, same feature folder).

## Phase 16 — Reorder admin nav: Rock Requests between Rocks and Albums (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/App.jsx`, `VERSION`
**Summary:** Moved the "Rock Requests" entry in `adminNavItems` from after "Journey" to directly after "Rocks" (now Dashboard → Jobs → Users → Rocks → Rock Requests → Albums → Journey → Music → Page Details → Honoring Aiden → Exit Admin).
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.5.16` → `0.5.17` (patch, same feature folder).

## Phase 17 — Searchable/sortable "Rock Request" column on the Rock Catalog table (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
**Summary:** Added a new "Rock Request" column showing the linked request's name (from the `requests` lookup already added in Phase 15). Refactored the per-row linked-request lookup into a single `_data` precompute step (`_linkedRequest`/`_requestName` on each row) so the search filter, the column's `sortValue`, and the existing Actions-cell icon all share one derivation instead of recomputing it three separate ways. Search box placeholder updated to mention it; rocks with no linked request show `-`.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.5.17` → `0.5.18` (patch, same feature folder).

## Phase 18 — Add Request Email and Request Address columns too (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rocks/rock-table/RockTable.jsx` (+ `.module.css`), `VERSION`
**Summary:** Extended Phase 17's pattern with two more searchable/sortable columns, "Request Email" and "Request Address", precomputed alongside `_requestName` in the same `_data` step and included in the search filter. Address can be a multi-line free-text field on the request, so its cell reuses the same single-line-with-ellipsis `.addressCell` treatment already used on the Rock Requests admin table (`title` attribute shows the full text on hover). Search placeholder updated again.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.5.18` → `0.5.19` (patch, same feature folder).

## Phase 19 — Rename "Rock Request" column to "Request Name" (2026-09-24)
**Status:** Complete
**Files changed:** `client/src/admin/pages/rocks/rock-table/RockTable.jsx`, `VERSION`
**Summary:** Relabeled the Rock Catalog table's `request_name` column header from "Rock Request" to "Request Name" per request.
**Deviations from plan:** None.
**Issues/gotchas encountered:** None.
**VERSION:** `0.5.19` → `0.5.20` (patch, same feature folder).
