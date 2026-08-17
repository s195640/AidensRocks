// utils/honoringAiden/incrementEntryView.js — bumps `entry.view_count` by
// one, for the public "count this view" endpoint only (see
// routes/honoringAiden.js's own POST /entries/:slug/view). A standalone
// query rather than folded into fetchEntryDetail() — it's a write, not a
// read, and (by request) only ever fires once per browser session per
// entry, decided entirely client-side (see EntryDetailView.jsx's
// recordViewOnce), not as an automatic side effect of loading the entry.
//
// Scoped to the same published/archived guard fetchEntryDetail() uses for
// a public (requirePublished: true) read, so this can't be used to inflate
// a draft or archived entry's count.
const pool = require('../../db/pool');

// Returns true if a row was actually bumped, false if the slug didn't
// match anything countable (unpublished/archived/nonexistent) — the caller
// uses this to decide 404 vs. success, not the updated row itself, since
// nothing reads view_count back yet (by request — tracked only, not
// displayed anywhere).
async function incrementEntryView(slug) {
  const result = await pool.query(
    `UPDATE entry
     SET view_count = view_count + 1
     WHERE slug = $1 AND published = true AND archived = false`,
    [slug]
  );

  return result.rowCount > 0;
}

module.exports = incrementEntryView;
