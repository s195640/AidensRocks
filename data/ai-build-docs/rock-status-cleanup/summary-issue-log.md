# Rock Status Cleanup — Summary Issue Log

Feature-scoped log, separate from other features' logs under `data/ai-build-docs/`. Append one entry per phase. One-time data fixes for `catalog.assign_status` (added in 0.18, `rock-assign-status`).

## Phase 1 — Available rocks already on a journey → unknown (2026-10-19)
**Status:** Complete (script tested on a throwaway DB; not yet run on test/prod)
**Files changed:** new `data/sql/migrations/0.20-rock-status-cleanup/01_oneserver_available_rocks_with_journey_to_unknown.sql`, this file, `VERSION`

**Summary:**
- Rocks still marked available but already found on a journey become `unknown` (given out, recipient not recorded), with `assigned_dt` = the date of the first journey stop. A comment explains why, e.g. "Found on a journey (first stop 2025-06-01, Zion, UT) while still marked available; status set to unknown by cleanup." It's added on a new line if the rock already has a comment.
- "Has a journey" = at least one public stop (`journey.show` + a visible image), the same rule as `utils/visibleJourneySql.js` and the Rocks page's clickable Rock #. Hidden or still-processing uploads don't count.
- "First stop" = earliest public stop by `journey.date` (the finder's date), falling back to `create_dt`. The location is left out of the comment when blank.
- Re-runnable (a changed rock is no longer available). `update_dt` left alone. The header has a preview query.
- Tested: earliest of two stops picked; no-date stop fell back to upload date; existing comment kept; hidden-only, image-less, already-assigned and journey-less rocks untouched; a second run changed nothing.
- **VERSION:** `0.19.2` → `0.20.0` (new feature folder; 0.19 already on prod).

**Deploy:** (updated in Phase 2: the script is a dry run by default)
1. `0.20-rock-status-cleanup/01_oneserver_available_rocks_with_journey_to_unknown.sql`, Node A only. No code deploy needed.

## Phase 2 — Dry run by default (2026-10-19)
**Status:** Complete (tested on a throwaway DB)
**Files changed:** `data/sql/migrations/0.20-rock-status-cleanup/01_oneserver_available_rocks_with_journey_to_unknown.sql`, `VERSION`
- The update now runs in a `DO` block with `dry_run CONSTANT boolean := true`. As written it makes the update, reports `NOTICE: DRY RUN: would update N rock(s): <rock numbers>. Nothing was changed.`, then rolls it back. An inner block raises SQLSTATE `DRYRN`, which acts as a savepoint, so the counts survive for the notice.
- Set `dry_run` to `false` to apply. It then reports `NOTICE: Updated N rock(s): ...`. Works in any SQL client; there's no BEGIN/COMMIT in the file.
- Tested: the dry run reported the right rocks and left them unchanged; the real run applied them; a second real run reported 0.
- **VERSION:** `0.20.0` → `0.20.1`.

**Deploy:**
1. Run the file as-is on Node A (dry run). Check the count and rock numbers in the NOTICE.
2. Change `dry_run` to `false` and run it again on Node A.

## Phase 3 — Shorter comment (2026-10-19)
**Status:** Complete (tested on a throwaway DB)
**Files changed:** `data/sql/migrations/0.20-rock-status-cleanup/01_oneserver_available_rocks_with_journey_to_unknown.sql`, `VERSION`
- The comment the script adds is now just "Found on journey; recipient unknown" (it was a sentence with the first stop's date and place). The date is already in `assigned_dt`. Still added on a new line when the rock has a comment.
- **VERSION:** `0.20.1` → `0.20.2`.

## Renumbered rock-0 journeys stay hidden (0.20.18)

- **Report:** rock 904's journey (rps_key 810, Santorini, 2026-10-24) was uploaded as rock 0, then renumbered to 904 in Admin → Journey, but Track the Rocks said "not found". The edit dialog's thumbnail was also broken while clicking it still opened the photo.
- **Cause (prod copy):** a rock-0 upload is processed (webp/sm made) but never published: `processImagesInBackground` only flips `show` when the rock number is > 0. Renumbering moved the folder and the journey's Show was ticked, but its one image (rpi_key 1987) stayed `show = false`, and a public stop needs at least one visible image (`visibleJourneySql`).
- **Fix (approved by the user: "publish on renumber"), `PUT /api/journey-admin/:rps_key`:** when the rock number goes from 0 to a real number, images with a processed webp in the new folder are shown (one that failed processing has none and stays hidden), and if the journey's Show is on, that rock's followers are notified, as a normal upload would. Notification isn't awaited, and a failure is recorded as a background server error.
- **Trade-off:** an image an admin hid on purpose while the post was still rock 0 is shown again on renumber. Rock-0 images are all hidden from upload, so the two can't be told apart.
- **Thumbnail:** `JourneyAdminEditDialog` built thumbnail URLs from the Rock Number *field*, so typing a new number pointed them at a folder that doesn't exist until Save (and that 404 could stay cached). It now uses the saved number, like the lightbox already did.
- **Rock 904 itself** was renumbered before this fix, so it needs its image enabled once (edit dialog → Enable). Its followers were not notified.
- **Test:** `admin-crud.test.mjs` adds a rock-0 journey with one processed and one failed image, renumbered to 104: the processed one shows, the failed one doesn't, and it's in `/api/rock-posts/104`. Full API suite 508 pass, lint clean. Not run: browser suite.
- **VERSION:** `0.20.17` → `0.20.18`.
