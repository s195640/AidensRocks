//routes/rocks.js
const express = require('express');
const router = express.Router();

// artist_keys arrives as a JSON string (multipart form). Returns the
// distinct positive integer ids, or null when it isn't an array at all.
// Nulls are dropped: a rock with no artist used to send [null], which hit
// artist_link.ra_key NOT NULL and failed the whole save.
function parseArtistKeys(raw) {
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(value)) return null;
  const ids = value.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)];
}
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const safeRollback = require('../utils/db/safeRollback');
const ensureDir = require('../utils/ensureDir');
const convertToWebP = require('../utils/convert-to-webp/convertToWebP');
const createThumbnails = require('../utils/convert-to-webp/createThumbnails');
const requireAdminAuth = require('../middleware/requireAdminAuth');

router.use(requireAdminAuth);

// Multer setup
const upload = multer({ dest: 'temp_uploads/' });

const saveImage = async (file, rock_number) => {
  const outDir = path.join('media', 'catalog', String(rock_number));
  await ensureDir(outDir);

  const baseImagePath = path.join(outDir, 'a.webp');
  const thumbImagePath = path.join(outDir, 'a_sm.webp');

  await convertToWebP(file.path, baseImagePath, { width: 512, height: 512 });
  await createThumbnails(baseImagePath, thumbImagePath, 50, 50);

  await fs.promises.unlink(file.path);

  return { baseImagePath, thumbImagePath };
};

// GET all rocks with linked artists, include comment
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT rc.rc_key, rc.rock_number, rc.create_dt, rc.update_dt,
             rc.comment, rc.rq_key,
             json_agg(json_build_object('ra_key', ra.ra_key, 'display_name', ra.display_name)) AS artists
      FROM catalog rc
      LEFT JOIN artist_link ral ON rc.rc_key = ral.rc_key
      LEFT JOIN artist ra ON ral.ra_key = ra.ra_key
      GROUP BY rc.rc_key
      ORDER BY rc.rock_number ASC
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// CREATE new rock with comment
router.post('/', upload.single('image'), async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const { rock_number, artist_keys = '[]', comment = '' } = req.body;
    const artists = parseArtistKeys(artist_keys);
    if (!artists) return res.status(400).json({ error: 'artist_keys must be a JSON array of artist ids.' });

    await client.query('BEGIN');

    const insertRock = await client.query(
      `INSERT INTO catalog (rock_number, comment) VALUES ($1, $2) RETURNING rc_key, rock_number`,
      [rock_number, comment]
    );
    const rc_key = insertRock.rows[0].rc_key;

    for (const ra_key of artists) {
      await client.query(
        `INSERT INTO artist_link (ra_key, rc_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [ra_key, rc_key]
      );
    }

    if (req.file) {
      await saveImage(req.file, rock_number);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true });
  } catch (err) {
    await safeRollback(client);
    next(err);
  } finally {
    if (client) client.release();
  }
});

// UPDATE existing rock with comment
router.put('/:rc_key', upload.single('image'), async (req, res, next) => {
  const { rc_key } = req.params;
  let client;
  try {
    client = await pool.connect();
    const { artist_keys = '[]', comment = '' } = req.body;
    const artists = parseArtistKeys(artist_keys);
    if (!artists) return res.status(400).json({ error: 'artist_keys must be a JSON array of artist ids.' });

    await client.query('BEGIN');

    await client.query(
      `UPDATE catalog 
       SET update_dt = CURRENT_TIMESTAMP,
           comment = $2
       WHERE rc_key = $1`,
      [rc_key, comment]
    );

    await client.query(`DELETE FROM artist_link WHERE rc_key = $1`, [
      rc_key,
    ]);

    for (const ra_key of artists) {
      await client.query(
        `INSERT INTO artist_link (ra_key, rc_key) VALUES ($1, $2)`,
        [ra_key, rc_key]
      );
    }

    if (req.file) {
      const rockRes = await client.query(
        `SELECT rock_number FROM catalog WHERE rc_key = $1`,
        [rc_key]
      );
      const rock_number = rockRes.rows[0]?.rock_number;
      if (rock_number) {
        await saveImage(req.file, rock_number);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await safeRollback(client);
    next(err);
  } finally {
    if (client) client.release();
  }
});

// DELETE a rock. The link + catalog deletes run on one checked-out client:
// BEGIN/COMMIT through pool.query would each land on whichever pooled
// connection was free, so nothing was actually transactional.
router.delete('/:rc_key', async (req, res, next) => {
  const { rc_key } = req.params;
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // 1️⃣ Remove all links from rock_artist_link
    await client.query('DELETE FROM artist_link WHERE rc_key = $1', [rc_key]);

    // 2️⃣ Delete the rock from catalog
    const result = await client.query(
      'DELETE FROM catalog WHERE rc_key = $1 RETURNING rock_number',
      [rc_key]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rock not found' });
    }

    const rock_number = result.rows[0].rock_number;
    await client.query('COMMIT');

    // 3️⃣ Delete associated media folder (after the commit, so a failed
    // delete never leaves the rock in the DB with its images gone)
    // Best-effort: the rock is already gone from the DB, so a file that
    // can't be removed (e.g. still held open on Windows) is logged, not a 500.
    const dir = path.join('media', 'catalog', String(rock_number));
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (fsErr) {
      console.error(`⚠️ Couldn't remove ${dir}:`, fsErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    await safeRollback(client);
    next(err);
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
