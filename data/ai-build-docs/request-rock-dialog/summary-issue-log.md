# Request A Rock dialog in Page Details (0.16.0)

## What was asked

Make the Request A Rock dialog editable from Page Details, in a new **Dialogs** section:
- the message under the "Request A Rock" heading,
- a note next to the **# Rocks** label,
- a limit on how many rocks one request can ask for.

## Decisions (approved by the user)

- **Storage:** a new `draft_settings` / `published_settings` jsonb pair on `page_content`, so the message, note and limit all follow Save → Preview → Publish together, and future dialogs can reuse the columns. Shape for Request A Rock: `{ "rocksNote": "<text>", "maxRocks": <1-100 or null> }`.
- **Always on:** the Dialogs row has no Active toggle; `PATCH /api/admin/pages/request-a-rock/visible` returns 400.

## What changed

- **Server**
  - `utils/dialogSlugs.js`: the dialog slugs, settings validation (note ≤ 200 chars, max a whole number 1–100 or blank) and `getMaxRocksPerRequest()`.
  - `routes/pagesAdmin.js`: list / draft / preview / publish carry the settings pair. `settings` on a non-dialog page is a 400.
  - `routes/pages.js`: the dialog slug is never a nav page. `/api/pages/request-a-rock/content` also returns `settings`.
  - `routes/rockRequests.js`: the public form's cap is the published `maxRocks`. It falls back to the old 100 when blank, when the row is missing or on a DB error. The admin "add/edit request" path is unchanged (no limit, as before).
- **Client**
  - `adminContent/dialogs.js` and `adminContent/useDialogContent.js` hold the dialog config and fetch it (published, or the draft under `?preview=1`).
  - `ContactReqestRocks.jsx`: rich-text message (with the built-in wording as a fallback), the note next to **# Rocks**, `max` on the input and a "Please request N rocks or fewer." check.
  - Page Details has a **Dialogs** table (# Rocks Note, Max Rocks, Last Updated, Last Published, Actions). The edit dialog has # Rocks Note and Max Rocks fields above the message editor.
  - Preview opens `/?requestRock=1&preview=1`. `FloatingRockLink` opens the dialog when `requestRock=1` is in the URL.
- **SQL:** `createdb.sql` (columns + seed row) and `data/sql/migrations/0.16-request-rock-dialog/` (see `DEPLOY.md`).
- **Tests:** `server/tests/api/admin-crud.test.mjs` → "Dialogs (Request A Rock)". No new routes, so the auth matrix is unchanged.

## Minor calls

- The note is plain text, shown in muted text after the label (it's part of the label's accessible name).
- The 100-rock ceiling stays: an admin limit can only lower it.
- The message is hidden until it has loaded, so the built-in wording never flashes before the edited one.

## # Rocks defaults to 1 (0.20.11)

- Per the user, the Request A Rock dialog's **# Rocks** field starts at 1 instead of blank (`ContactReqestRocks.jsx`). The visitor can still change it, and the 1-to-limit check is unchanged; clearing it still shows "Number of rocks is required."
- Lint clean. Not run: regression suite, browser check.
- **VERSION:** `0.20.10` → `0.20.11`.
