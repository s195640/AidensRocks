// routes/honoringAidenAdmin.js — admin CRUD for the Honoring Aiden entries
// content model, plus the media direct-upload endpoint used by
// @s195640/content-editor's onUploadImage/onUploadVideo. Mounted at
// /api/admin/honoring-aiden.
//
// Simplified (by request — "lets simplify this a bit... the new component
// will be what is in the page") from a 3-table entry -> journal_entry ->
// journal_entry_item content model down to one `entry` row per page: title,
// auto-generated slug, a published on/off toggle, and the whole page body
// as one `body_json` Tiptap/ProseMirror document. See
// data/sql/migrations/add_honoring_aiden_entries.sql (a consolidated
// migration — its own header comment lists the incremental ones it
// replaces) and summary-issue-log.md for the full history — this file used
// to also own journal-entries CRUD (POST/PUT/PATCH under /journal-entries)
// and a much larger validateItem/insertItems item-type/layout validation
// layer, all removed along with those tables.
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const fetchEntryDetail = require('../utils/honoringAiden/fetchEntryDetail');
const upload = require('../middleware/multer');
const ensureDir = require('../utils/ensureDir');
const convertToWebP = require('../utils/convert-to-webp/convertToWebP');
const createThumbnails = require('../utils/convert-to-webp/createThumbnails');
const processVideo = require('../utils/processVideo');
const isVideoFile = require('../utils/isVideoFile');

router.use(requireAdminAuth);

// `pg` doesn't auto-serialize plain JS objects for jsonb parameters — only
// auto-parses jsonb columns back into objects on the way OUT. Stringify
// explicitly on the way in; null stays null (no transform set).
function toJsonbParam(value) {
  return value ? JSON.stringify(value) : null;
}

// Derives a URL-safe slug from a title — the only thing "Add Entry" asks
// for now (see EntryFormModal.jsx); there's no separate slug field for the
// admin to fix a collision by hand, so POST /entries below retries this
// with a numeric suffix on a unique-constraint hit instead. Falls back to
// "entry" for a title that's ALL punctuation/whitespace (rare, but a blank
// slug would violate the NOT NULL/UNIQUE constraint outright).
function slugify(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'entry';
}

// Resolves + validates a `parent_id` value from a request body against the
// two-level hard cap (see this file's own POST /entries and PATCH
// /entries/:id/move) — shared by both since a move is really just a
// generalized create-with-parent. Returns the resolved id (`null` for
// top-level), or throws `{status, error}` for the caller to respond with
// directly. `excludeId` (the move endpoint's own entry id) additionally
// rejects an entry being handed itself as its own parent — not relevant to
// POST /entries, where the entry being created doesn't have an id yet.
async function resolveParentId(parentIdInput, { excludeId } = {}) {
  if (parentIdInput == null) return null;

  if (excludeId != null && Number(parentIdInput) === Number(excludeId)) {
    throw { status: 400, error: 'An entry cannot be its own parent.' };
  }

  const { rows } = await pool.query(
    `SELECT id, parent_id FROM entry WHERE id = $1 AND archived = false`,
    [parentIdInput]
  );
  if (rows.length === 0) {
    throw { status: 400, error: 'Parent entry not found.' };
  }
  if (rows[0].parent_id != null) {
    throw { status: 400, error: 'A sub-entry cannot itself have sub-entries.' };
  }
  return rows[0].id;
}

// One-time seed for a new entry's body_json: the title, as a centered
// Heading 1, plus an empty trailing paragraph to type into — by request
// ("we do not need to save any space for the Title... seed the
// content-editor with the text provided by the title... this will not be
// maintained, if user later changes the title, it will not change the page
// text"). This is the ONLY place the title ever reaches body_json — a
// later rename (EntryFormModal.jsx, via the sidebar's pencil) only ever
// touches the `title` column, never re-seeds or touches body_json again.
//
// Shape confirmed against the real editor, not guessed: opened
// @s195640/content-editor live, typed text, toggled Heading 1 + center
// align via its own toolbar, and read back `editor.getJSON()` — level/
// textAlign are the exact attrs TipTap's (unmodified) Heading + TextAlign
// extensions produce; the trailing empty paragraph is what the editor's
// own heading-toggle command leaves behind for a ready typing position,
// reproduced here by hand for the same reason.
function seedTitleDoc(title) {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1, textAlign: 'center' },
        content: [{ type: 'text', text: title }],
      },
      { type: 'paragraph', attrs: { textAlign: null } },
    ],
  };
}

// -------------------- GET /api/admin/honoring-aiden/entries --------------------
// `view_count` added for the admin dashboard's HonoringAidenPanel widget
// (admin/components/honoring-aiden-panel/) — every other caller of this
// endpoint (HonoringAidenPage.jsx's sidebar) just ignores the extra field.
router.get('/entries', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, title, entry_date, sort_order, published, archived,
              cover_image, parent_id, view_count, created_at, updated_at
       FROM entry
       ORDER BY sort_order`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin honoring-aiden entries:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------- GET /api/admin/honoring-aiden/entries/slug/:slug --------------------
// Admin equivalent of the public detail route (routes/honoringAiden.js),
// minus the `published = true` filter — lets the in-context editor open a
// draft entry too. No view-counting endpoint exists on this admin router
// at all (unlike routes/honoringAiden.js's own POST /entries/:slug/view) —
// opening/editing/previewing an entry here never counts as a view, by
// construction rather than by a flag that could be forgotten.
router.get('/entries/slug/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const entry = await fetchEntryDetail({ slug, requirePublished: false });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    res.json(entry);
  } catch (err) {
    console.error(`Error fetching admin honoring-aiden entry "${slug}":`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------- POST /api/admin/honoring-aiden/entries --------------------
// Title only (see EntryFormModal.jsx), plus an optional `parent_id` (by
// request — the sidebar's "+" on a top-level entry creates a sub-entry
// under it; omitted/null creates a top-level entry same as before) —
// always created as a draft (published: false, by request: "always save as
// off, lets add a slider on/off to make it visable or not"), with body_json
// seeded to the title as a centered Heading 1 (see seedTitleDoc — a
// one-time seed, not kept in sync with the title column afterward). The
// admin lands on the new entry's detail page immediately after (see
// HonoringAidenPage.jsx's handleEntrySaved) to keep writing from there.
//
// Two-level hard cap enforced here, not in the schema (parent_id itself
// will happily reference any entry) — a given parent_id must resolve to an
// entry that is ITSELF top-level (parent_id IS NULL), so a sub-entry can
// never be handed a parent_id and become a grandparent.
router.post('/entries', async (req, res) => {
  const { title, parent_id } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "'title' is required." });
  }

  const trimmedTitle = title.trim();
  const baseSlug = slugify(trimmedTitle);
  const seedBodyJson = toJsonbParam(seedTitleDoc(trimmedTitle));

  try {
    let parentId;
    try {
      parentId = await resolveParentId(parent_id);
    } catch (e) {
      if (e && e.status) return res.status(e.status).json({ error: e.error });
      throw e;
    }

    const { rows } = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
       FROM entry
       WHERE parent_id IS NOT DISTINCT FROM $1`,
      [parentId]
    );
    const sort_order = rows[0].next_order;

    // Retries with -2, -3, ... on a slug collision (e.g. two entries titled
    // "Grandma's House") — there's no slug field for the admin to fix this
    // by hand anymore, so this just picks the next available one itself.
    // 50 attempts is generous padding, not a real expected ceiling.
    let slug = baseSlug;
    for (let attempt = 1; attempt <= 50; attempt++) {
      try {
        const result = await pool.query(
          `INSERT INTO entry (slug, title, sort_order, published, body_json, parent_id)
           VALUES ($1, $2, $3, false, $4, $5)
           RETURNING *`,
          [slug, trimmedTitle, sort_order, seedBodyJson, parentId]
        );
        return res.status(201).json(result.rows[0]);
      } catch (err) {
        if (err.code === '23505') {
          slug = `${baseSlug}-${attempt + 1}`;
          continue;
        }
        throw err;
      }
    }
    throw new Error(`Could not find a unique slug for "${trimmedTitle}" after 50 attempts.`);
  } catch (err) {
    console.error('Error creating honoring-aiden entry:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------- PUT /api/admin/honoring-aiden/entries/:id --------------------
// Full replace of title/published/body_json — same "client resends the
// whole editable shape" convention this feature's other PUT endpoints
// already use. Three different callers hit this now (EntryFormModal.jsx's
// rename dialog, EntryDetailView.jsx's visibility toggle, and its
// ContentEditor save) — each seeds its request from the currently-loaded
// entry and only actually changes its own one field, but all three still
// send the full set so nothing else gets silently clobbered back to a
// default. `slug` is deliberately NOT accepted here — immutable after
// creation, so an entry's URL never changes out from under a link to it.
router.put('/entries/:id', async (req, res) => {
  const { id } = req.params;
  const { title, published, body_json } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "'title' is required." });
  }

  try {
    const result = await pool.query(
      `UPDATE entry
       SET title = $1, published = $2, body_json = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [title.trim(), !!published, toJsonbParam(body_json), id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error updating honoring-aiden entry ${id}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------- PATCH /api/admin/honoring-aiden/entries/:id/move --------------------
// Relocates an entry: `parent_id: null` promotes it to top-level,
// `parent_id: <id>` moves it under a (different) top-level entry — covers
// sub-to-main, main-to-sub, and sub-to-a-different-parent in one endpoint,
// by request. Deliberately separate from PUT /entries/:id rather than
// folded into that full-replace body: PUT's callers (rename dialog, the
// visibility toggle, ContentEditor's save) all resend the entry's CURRENT
// values for fields they're not touching, and none of them know or care
// about parent_id — making it part of that full-replace shape would mean
// every one of those call sites needs to start threading parent_id through
// just to avoid silently resetting it.
//
// Two-level cap enforcement has two parts: `resolveParentId` (shared with
// POST /entries) rejects a destination that isn't itself top-level, and the
// child-count check just below additionally rejects moving THIS entry under
// any parent at all while it still has sub-entries of its own — letting
// that through would make its children grandchildren of the new parent, a
// third level the schema doesn't forbid but the app never allows into
// existence. Promoting to top-level (`parent_id: null`) never has this
// problem, since nothing gets nested further by that.
//
// sort_order is reset to the end of the destination group (same "append"
// behavior POST /entries uses for a brand new entry) — a moved entry's old
// position among its old siblings has no meaning in the new group.
router.patch('/entries/:id/move', async (req, res) => {
  const { id } = req.params;
  const { parent_id } = req.body;

  try {
    const { rows: entryRows } = await pool.query(`SELECT id FROM entry WHERE id = $1`, [id]);
    if (entryRows.length === 0) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    let parentId;
    try {
      parentId = await resolveParentId(parent_id, { excludeId: id });
    } catch (e) {
      if (e && e.status) return res.status(e.status).json({ error: e.error });
      throw e;
    }

    if (parentId != null) {
      const { rows: childRows } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM entry WHERE parent_id = $1 AND archived = false`,
        [id]
      );
      const childCount = childRows[0].count;
      if (childCount > 0) {
        return res.status(400).json({
          error: `This entry has ${childCount} sub-entr${childCount === 1 ? 'y' : 'ies'} and can't be moved under another entry — move or archive them first.`,
        });
      }
    }

    const { rows: orderRows } = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
       FROM entry
       WHERE parent_id IS NOT DISTINCT FROM $1`,
      [parentId]
    );

    const result = await pool.query(
      `UPDATE entry
       SET parent_id = $1, sort_order = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [parentId, orderRows[0].next_order, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`Error moving honoring-aiden entry ${id}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------- PATCH /api/admin/honoring-aiden/entries/:id/archive --------------------
// One-way soft delete — no "unarchive" endpoint yet (see backlog.md #4).
// Cascades to any sub-entries under this one (by request — archiving a
// main entry archives its whole branch together, same as it disappearing
// from the menu as a group). `id = $1 OR parent_id = $1` is a complete
// cascade in one statement given the two-level hard cap — a sub-entry can
// never have its own children, so there's no third level to chase.
router.patch('/entries/:id/archive', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE entry
       SET archived = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 OR parent_id = $1
       RETURNING id, archived`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found.' });
    }

    const archivedEntry = result.rows.find((row) => String(row.id) === String(id));
    res.json({ success: true, archived: archivedEntry ? archivedEntry.archived : true });
  } catch (err) {
    console.error(`Error archiving honoring-aiden entry ${id}:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// -------------------- PATCH /api/admin/honoring-aiden/entries/reorder --------------------
router.patch('/entries/reorder', async (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty order array.' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    for (let i = 0; i < order.length; i++) {
      await client.query(
        `UPDATE entry SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [i, order[i]]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Error reordering honoring-aiden entries:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (client) client.release();
  }
});

// -------------------- POST /api/admin/honoring-aiden/media --------------------
// One file per request, processed synchronously — called by
// @s195640/content-editor's onUploadImage/onUploadVideo (via
// contentEditorAdapters.js's makeUploadCallbacks) as the admin inserts
// media directly into the ContentEditor document. Not routed through the
// Albums folder-sync pipeline or the rock-journey pipeline — both are the
// wrong shape for a single in-editor upload. Each upload gets its own
// uuid-named folder under media/honoring-aiden/, since at upload time
// there's no entry row change to key off of yet — the returned path is
// embedded into body_json only once the editor's own onChange fires.
router.post('/media', upload.single('file'), async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({ error: 'No file provided.' });
  }

  try {
    const uuid = uuidv4();
    const baseDir = path.resolve('media', 'honoring-aiden', uuid);
    const originalDir = path.join(baseDir, 'o');
    const ext = path.extname(file.originalname);
    const originalPath = path.join(originalDir, `original${ext}`);

    await ensureDir(originalDir);
    await fs.writeFile(originalPath, file.buffer);

    if (isVideoFile(file.originalname)) {
      const webpDir = path.join(baseDir, 'webp');
      const videoDir = path.join(baseDir, 'video');
      await ensureDir(webpDir);
      await ensureDir(videoDir);

      const webpPath = path.join(webpDir, 'poster.webp');
      const videoPath = path.join(videoDir, 'video.mp4');
      const { duration, width, height } = await processVideo(originalPath, {
        webpOutputPath: webpPath,
        videoOutputPath: videoPath,
      });

      return res.status(201).json({
        item_type: 'video',
        media_path: `/media/honoring-aiden/${uuid}/video/video.mp4`,
        media_poster_path: `/media/honoring-aiden/${uuid}/webp/poster.webp`,
        media_duration: duration,
        width,
        height,
      });
    }

    const webpDir = path.join(baseDir, 'webp');
    const smDir = path.join(baseDir, 'sm');
    await ensureDir(webpDir);
    await ensureDir(smDir);

    const webpPath = path.join(webpDir, 'image.webp');
    const smPath = path.join(smDir, 'image.webp');

    const metadata = await sharp(file.buffer).metadata();
    await convertToWebP(originalPath, webpPath);
    await createThumbnails(webpPath, smPath, 300, 300);

    res.status(201).json({
      item_type: 'image',
      media_path: `/media/honoring-aiden/${uuid}/webp/image.webp`,
      thumbnail_path: `/media/honoring-aiden/${uuid}/sm/image.webp`,
      width: metadata.width || null,
      height: metadata.height || null,
    });
  } catch (err) {
    console.error('Error processing honoring-aiden media upload:', err);
    res.status(500).json({ error: 'Failed to process upload.' });
  }
});

module.exports = router;
