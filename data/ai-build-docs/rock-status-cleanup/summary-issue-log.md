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
