// routes/honoringAiden.js — public read endpoints for the Honoring Aiden
// entries content model: one `entry` row per page (title, slug, and its
// whole body as one body_json Tiptap document — see
// summary-issue-log.md for the simplification away from a nested
// entry -> journal_entry -> journal_entry_item structure). Replaces the
// static honoringAidenMenuItems.js sidebar data.
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const fetchEntryDetail = require('../utils/honoringAiden/fetchEntryDetail');
const incrementEntryView = require('../utils/honoringAiden/incrementEntryView');

// -------------------- GET /api/honoring-aiden/entries --------------------
// `id`/`parent_id` (NULL = top-level) are what let HonoringAidenPage.jsx
// group this flat list into the sidebar's two-level menu — it matches a
// sub-entry to its parent via `child.parent_id === parentEntry.id`, so
// BOTH have to be in this SELECT (this route never needed `id` for
// anything before the two-level menu existed — easy to have left it out
// without noticing, since nothing else here reads it; menuLink keys/links
// use `slug`, not `id`). A sub-entry whose parent got unpublished/archived
// would still come back here on its own row (this WHERE only looks at the
// row's own published/archived, not its parent's), so the client building
// the tree only ever nests a sub-entry under a parent that's ALSO in this
// same result set; see HonoringAidenPage.jsx's own comment on that filter.
router.get('/entries', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, title, entry_date, sort_order, parent_id
       FROM entry
       WHERE published = true AND archived = false
       ORDER BY sort_order`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching honoring-aiden entries:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------- GET /api/honoring-aiden/entries/:slug --------------------
router.get('/entries/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const entry = await fetchEntryDetail({ slug, requirePublished: true });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    res.json(entry);
  } catch (err) {
    console.error(`Error fetching honoring-aiden entry "${slug}":`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------- POST /api/honoring-aiden/entries/:slug/view --------------------
// Bumps entry.view_count by exactly one. Deliberately its own endpoint
// rather than a side effect of the GET above — a GET shouldn't carry a
// side effect the client doesn't explicitly ask for, and splitting it out
// is what lets the client decide WHETHER this fires at all.
//
// Called by the public page's own sessionStorage guard
// (client/src/pages/honoring-aiden/EntryDetailView.jsx's recordViewOnce) —
// once per browser session per entry (by request: "only count 1 time per
// session (per page)"). The "session" here is purely a browser concept
// (sessionStorage, cleared when the tab/browser closes) — this app has no
// server-side session infrastructure of its own to hook into (see
// AuthContext.jsx's own doc comment on admin auth being a stub with no
// session), and a simple view counter doesn't need one; this endpoint
// itself has no memory of what it's already counted, the client is what
// only calls it once per session.
//
// Same published/archived guard as the public read path
// (incrementEntryView() mirrors fetchEntryDetail's requirePublished), so
// this can't be used to inflate a draft or archived entry's count — never
// called from /admin at all (see routes/honoringAidenAdmin.js), but this
// guard holds regardless of caller.
router.post('/entries/:slug/view', async (req, res) => {
  const { slug } = req.params;

  try {
    const counted = await incrementEntryView(slug);

    if (!counted) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(`Error counting honoring-aiden view for "${slug}":`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
