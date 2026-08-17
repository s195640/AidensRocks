// utils/honoringAiden/fetchEntryDetail.js — shared by the public
// (routes/honoringAiden.js) and admin (routes/honoringAidenAdmin.js) "get
// one entry" routes. The only difference between the two callers is
// whether an unpublished entry is excluded. View-counting is NOT part of
// this — that's its own separate write (utils/honoringAiden/incrementEntryView.js,
// via routes/honoringAiden.js's own POST /entries/:slug/view), decided
// client-side rather than as a side effect of this read.
//
// Was a multi-query assembly (entry + its journal_entry rows + their
// journal_entry_item rows + gallery items' journal_entry_item_image rows,
// grouped in JS) back when an entry's content was a nested
// entry -> journal_entry -> journal_entry_item structure — collapsed to
// this one flat SELECT once that model simplified down to a single
// `body_json` column directly on `entry` (see
// data/sql/migrations/add_honoring_aiden_entries.sql and
// summary-issue-log.md).
const pool = require('../../db/pool');

async function fetchEntryDetail({ slug, requirePublished }) {
  const result = await pool.query(
    `SELECT id, slug, title, entry_date, cover_image, published, body_json, view_count
     FROM entry
     WHERE slug = $1 AND archived = false ${requirePublished ? 'AND published = true' : ''}`,
    [slug]
  );

  return result.rows[0] || null;
}

module.exports = fetchEntryDetail;
