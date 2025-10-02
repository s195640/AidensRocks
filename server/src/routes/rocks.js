//routes/rocks.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const ensureDir = require('../utils/ensureDir');
const convertToWebP = require('../utils/convert-to-webp/convertToWebP');
const createThumbnails = require('../utils/convert-to-webp/createThumbnails');

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
             rc.comment,
             json_agg(json_build_object('ra_key', ra.ra_key, 'display_name', ra.display_name)) AS artists
      FROM catalog rc
      LEFT JOIN Rock_Artist_Link ral ON rc.rc_key = ral.rc_key
      LEFT JOIN Rock_Artist ra ON ral.ra_key = ra.ra_key
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
  const client = await pool.connect();
  try {
    const { rock_number, artist_keys = '[]', comment = '' } = req.body;
    const artists = JSON.parse(artist_keys);

    await client.query('BEGIN');

    const insertRock = await client.query(
      `INSERT INTO catalog (rock_number, comment) VALUES ($1, $2) RETURNING rc_key, rock_number`,
      [rock_number, comment]
    );
    const rc_key = insertRock.rows[0].rc_key;

    for (const ra_key of artists) {
      await client.query(
        `INSERT INTO Rock_Artist_Link (ra_key, rc_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [ra_key, rc_key]
      );
    }

    if (req.file) {
      await saveImage(req.file, rock_number);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// UPDATE existing rock with comment
router.put('/:rc_key', upload.single('image'), async (req, res, next) => {
  const { rc_key } = req.params;
  const client = await pool.connect();
  try {
    const { artist_keys = '[]', comment = '' } = req.body;
    const artists = JSON.parse(artist_keys);

    await client.query('BEGIN');

    await client.query(
      `UPDATE catalog 
       SET update_dt = CURRENT_TIMESTAMP,
           comment = $2
       WHERE rc_key = $1`,
      [rc_key, comment]
    );

    await client.query(`DELETE FROM Rock_Artist_Link WHERE rc_key = $1`, [
      rc_key,
    ]);

    for (const ra_key of artists) {
      await client.query(
        `INSERT INTO Rock_Artist_Link (ra_key, rc_key) VALUES ($1, $2)`,
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
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// DELETE a rock
router.delete('/:rc_key', async (req, res, next) => {
  const { rc_key } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM catalog WHERE rc_key = $1 RETURNING rock_number`,
      [rc_key]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rock not found' });
    }

    const rock_number = result.rows[0].rock_number;
    const dir = path.join('media', 'catalog', String(rock_number));
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
