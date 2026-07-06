# Phase 2 — Filter public Photos page to Tag = "main"

## ⚠️ Do not start this phase until the human confirms the checkpoint below is done.

## Checkpoint (human, not Claude CLI)
Before this phase begins, the family needs to have gone into the admin Albums table (from Phase 1) and tagged whichever albums should appear on the public Photos page with `main`. If this hasn't happened yet, completing this phase will make the public Photos page show **zero albums** the moment it ships. Confirm with the human that this is done before writing any code.

## Context
Design plan: `data\ai-build-docs\album-tags\album-tags-feature-plan.md` — read it before starting. Don't relitigate decisions made there.

Read `data\ai-build-docs\album-tags\summary-issue-log.md`, specifically Phase 1's entry, for the actual file paths/route shapes discovered there — this phase builds directly on them.

## Task

**1. Identify the actual route powering the public Photos page's album list** (should already be known from Phase 1's discovery — confirm it, don't re-discover from scratch unless something's changed).

**2. Add an optional `tag` query parameter to that endpoint:**
- When `?tag=<value>` is present, add `AND EXISTS (SELECT 1 FROM photoalbum_tags t WHERE t.pa_key = pa.pa_key AND t.tag = LOWER($n))` to the existing query, alongside whatever filtering already exists (e.g. `show = true`). Lowercase the incoming param before comparing, since stored tags are always lowercase — this makes the filter forgiving of how the URL param is typed even though the stored data is canonical.
- When `tag` is absent, preserve current behavior exactly (no tag filtering) — this matters if any other consumer of this same endpoint exists beyond `Photos.jsx` and shouldn't suddenly be filtered.

**3. Update `Photos.jsx`** (or whichever component issues the album fetch) to explicitly request `?tag=main`.

**4. Do not touch the admin listing endpoint** — it stays unfiltered by tag, showing every album with its full tag set, per the design plan.

## Constraints
- No test suite — don't add one, but note in the issue log if a test around the query-param filtering logic would be valuable.
- Ask before running any automated browser verification — the human will check the public Photos page.
- No new dependencies expected.

## Issue log
Append an entry to `data\ai-build-docs\album-tags\summary-issue-log.md` using the established format. Explicitly note in this entry that the human confirmed the pre-tagging checkpoint before this phase ran.

## When done
Confirm the public Photos page now shows only albums tagged `main`, confirm the admin Albums list still shows every album with its full tag set untouched, and confirm nothing else that might hit the same endpoint got unexpectedly filtered. Append the issue log entry, and stop — this is the last phase of this feature.
