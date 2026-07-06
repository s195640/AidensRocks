# Album Tags Feature — Design Plan

**Location:** this file and everything else for this feature lives under `data\ai-build-docs\album-tags\`.

**Supersedes an earlier `group_name`-based plan.** That version used a single free-text `group_name` field. Before any code was written against it, this was replaced with multi-value tags instead. This is the current design.

## What this is
Adds multi-value "Tags" to albums (admin-editable, comma-separated input, blank by default) so specific pages can pull only albums carrying a particular tag. First use: the public Photos page shows only albums tagged `main`.

## Decisions
- **Storage:** a join table, `photoalbum_tags` (`pa_key`, `tag`), mirroring the existing `artist_link` many-to-many pattern already in this schema — not a Postgres array column. Composite primary key `(pa_key, tag)`.
- **Input:** comma-separated text field in the admin dialog (e.g. `main, featured`). Parsed into individual tags on save.
- **Normalization:** each tag is trimmed and lowercased at write time, both dropped-empty and deduped. This is a canonical-form decision — matching later is a plain exact-match query, not a `LOWER()`-wrapped one, and it avoids `"Main"` and `"main"` silently becoming two different tags on the same album.
- **Save strategy:** on every save, delete all of that album's existing tag rows and reinsert the current set inside one transaction — simpler and safe at this scale, no need to diff adds/removes.
- **Filtering:** server-side, an optional `?tag=<value>` query param on the existing public albums endpoint, matched via `EXISTS` against `photoalbum_tags`. Absent param = current (unfiltered) behavior, so nothing else hitting that endpoint changes.
- **Admin list/dialog is unaffected by any filtering** — always shows/edits every album's full tag set regardless of what a public page later filters on.

## Rollout sequencing
No auto-backfill — every album starts with zero tags, including existing ones, and the family is hand-picking which albums get tagged `main`. Split into two phases with a checkpoint between them so the public Photos page never briefly shows zero albums:

1. **Phase 1** — table + admin editing only. No visitor-facing change.
2. **Human checkpoint** — go tag the desired albums with `main` via the admin dialog.
3. **Phase 2** — public Photos page starts filtering by `tag=main`.

Do not start Phase 2 until the checkpoint is confirmed done.

## Prod migration note — this is a brand-new table, not a new column
`photoalbum_tags` doesn't exist anywhere yet, on either prod node. Same one-time registration as established for the last feature's new table:
1. `CREATE TABLE photoalbum_tags (...)` — run manually and identically on both prod nodes (DDL isn't replicated by pglogical).
2. `SELECT pglogical.replication_set_add_table('default', 'photoalbum_tags', synchronize_data := false);` — run on both nodes, **explicit `false`**, not the bare default-`true` call.
3. No seed/backfill step needed either way, since there's no auto-tagging — the table starts and stays empty until a human tags something through the running app, and ordinary per-row edits replicate normally from there.

## Issue log
`data\ai-build-docs\album-tags\summary-issue-log.md` — feature-scoped, not shared with other features' logs. Append one entry per phase using the established format (status, files changed, summary, deviations from plan, issues/gotchas encountered, open questions for human review). Create it fresh if it doesn't exist yet.
