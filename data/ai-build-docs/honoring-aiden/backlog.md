# Honoring Aiden — Backlog / Future Features

Not part of `phase-1-plan.md`. Captured here so they aren't lost and so phase 1 is built with room for them, without being scope creep on phase 1 itself.

## 1. Public comments
Discussed at length during design but deliberately deferred. Decisions already made, to build from when this is picked up:
- Comments attach to an `entry`, not per `journal_entry` — one comment section at the bottom of each entry page.
- Live immediately (no pre-approval queue) — admin moderates after the fact via a `hidden`/`status` flag, not a hard delete.
- Custom-built (own `comment` table, moderated through the admin in-context editor pattern from phase 1), not a 3rd-party widget.
- No visitor login — needs spam mitigation from day one: a honeypot field, IP rate limiting on the submit endpoint, and optionally an auto-hide keyword filter so flagged comments queue for review without blocking submission outright.
- Consider an email-to-admin notification on new comment (mirrors the existing rock-upload notification pattern) so moderation doesn't depend on checking the admin panel proactively.
- Phase 1's entry detail page already reserves a distinct layout section for this — building it should be additive, not a page rebuild.

## 2. ~~Additional journal entry templates~~ — superseded
Phase 1 originally shipped two fixed templates (`image-left-text-right`, `image-top-text-below`). Removed (same session, human request): a `journal_entry` is now a free-form, ordered list of items — any mix/count of text/image/gallery/video, admin-composed per entry rather than picked from a fixed layout registry. See `summary-issue-log.md`. If a genuinely different *layout* (not just content mix) is wanted later — e.g. side-by-side instead of stacked — that's a new, separate feature, not a "template" in the old sense.

## 3. ~~Template-switch UX~~ — moot
No longer applicable now that there's no template to switch between (see #2).

## 4. Archived-content visibility/restore in admin
Phase 1's soft delete (`archived` flag) removes entries/journal entries from all admin lists once archived — there's no "trash" view to browse or restore from yet. Worth adding if an accidental archive ever needs recovering, or just via direct DB access for now.

## 5. Admin auth hardening
Current admin auth is a client-side stub (`AuthContext`, hardcoded credential, no session persistence) and admin API routes have no server-side auth middleware — consistent with the rest of the app today. Phase 1 adds a larger admin write surface (in-context editing, media uploads) on top of this. Worth a dedicated conversation later if that changes the risk calculus enough to matter; not addressed in phase 1.

## 6. Gallery viewing experience
For `gallery` items, phase 1 covers storage/upload/layout but not a dedicated viewing experience (e.g. a lightbox to click through multiple images). The Albums admin already uses `yet-another-react-lightbox` (`AlbumsSingleLightbox.jsx`/`AlbumsMultiLightbox.jsx`) — reuse that on the public side if/when gallery items need one.

## 7. ~~Structurally distinct mobile template variants~~ — moot
No longer applicable — see #2. `JournalEntry.jsx`'s stacked layout is already the same at every breakpoint, nothing to reflow.

## 8. Linking entries to Rock Journeys
Explicitly decided against for phase 1 — Honoring Aiden entries are a fully separate content type from rock journeys. Revisit only if a real case comes up (e.g. a story entry about the trip where a specific rock traveled).
