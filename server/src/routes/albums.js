const express = require('express');
const router = express.Router();
const syncAlbums = require('../utils/albums/syncAlbums');
const db = require('../db/pool');
const path = require('path');
const fs = require('fs-extra');
const upload = require('../middleware/multer');

router.post('/sync', async (req, res) => {
  try {
    console.log('ALBUM POST');
    const result = await syncAlbums();
    res.json(result);
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        pa.pa_key,
        pa.name,
        pa.display_name,
        pa."desc",
        pa.order_num,
        pa.show,
        COUNT(p.p_key) AS count,
        (
          SELECT p2.name
          FROM Photos p2
          WHERE p2.pa_key = pa.pa_key AND p2.show = TRUE
          ORDER BY p2.order_num ASC
          LIMIT 1
        ) AS first_image_name
      FROM PhotoAlbums pa
      LEFT JOIN Photos p ON pa.pa_key = p.pa_key
      GROUP BY pa.pa_key
      ORDER BY pa.order_num;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching albums:', err);
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

router.patch('/:pa_key/show', async (req, res) => {
  const { pa_key } = req.params;

  try {
    const result = await db.query(
      `UPDATE PhotoAlbums
       SET show = NOT show, update_dt = CURRENT_TIMESTAMP
       WHERE pa_key = $1
       RETURNING show`,
      [pa_key]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json({ success: true, show: result.rows[0].show });
  } catch (err) {
    console.error('Toggle show error:', err);
    res.status(500).json({ error: 'Failed to toggle show' });
  }
});

router.delete('/:pa_key', async (req, res) => {
  const { pa_key } = req.params;

  try {
    // Get the album name before deleting (so we know the folder path)
    const albumRes = await db.query(
      'SELECT name FROM PhotoAlbums WHERE pa_key = $1',
      [pa_key]
    );
    if (albumRes.rows.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }

    const albumName = albumRes.rows[0].name;
    const albumPath = path.join('media', 'albums', albumName);

    // Delete DB record (Photos will be deleted via ON DELETE CASCADE)
    await db.query('DELETE FROM PhotoAlbums WHERE pa_key = $1', [pa_key]);

    // Delete folder
    await fs.remove(albumPath);
    console.log(`🗑️ Deleted album folder: ${albumPath}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete album:', err);
    res.status(500).json({ error: 'Failed to delete album' });
  }
});

router.post('/reorder-all', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pa_key FROM PhotoAlbums WHERE show = true ORDER BY order_num ASC, pa_key ASC`
    );

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < rows.length; i++) {
        await client.query(
          `UPDATE PhotoAlbums SET order_num = $1 WHERE pa_key = $2`,
          [i, rows[i].pa_key]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Reordering failed:', err);
      res.status(500).json({ error: 'Failed to reorder albums' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Query failed:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/:pa_key', async (req, res) => {
  const { pa_key } = req.params;
  const { name, display_name, desc, show } = req.body;

  try {
    await db.query(
      `UPDATE PhotoAlbums
   SET display_name = $1,
       "desc" = $2,
       show = $3,
       update_dt = NOW()
   WHERE pa_key = $4`,
      [display_name, desc, show, pa_key]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Album update failed:', err);
    res.status(500).json({ error: 'Failed to update album' });
  }
});

router.get('/:pa_key', async (req, res) => {
  const { pa_key } = req.params;

  try {
    const result = await db.query(
      `SELECT pa_key, name, display_name, "desc", show
       FROM PhotoAlbums
       WHERE pa_key = $1`,
      [pa_key]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to fetch album metadata:', err);
    res.status(500).json({ error: 'Failed to fetch album metadata' });
  }
});

router.get('/:pa_key/photos', async (req, res) => {
  const { pa_key } = req.params;

  try {
    const result = await db.query(
      `SELECT 
        p_key,
        name,
        display_name,
        "desc",
        date,
        order_num,
        show,
        width,
        height
      FROM Photos
      WHERE pa_key = $1
      ORDER BY order_num`,
      [pa_key]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error loading album photos:', err);
    res.status(500).json({ error: 'Failed to load photos' });
  }
});

router.post('/', async (req, res) => {
  const { name, display_name, desc, show } = req.body;

  try {
    const existing = await db.query(
      'SELECT * FROM PhotoAlbums WHERE name = $1',
      [name]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Album name already exists' });
    }

    const { rows } = await db.query(
      'SELECT COALESCE(MAX(order_num), 0) + 1 AS next_order FROM PhotoAlbums'
    );
    const order_num = rows[0].next_order;

    await db.query(
      `
      INSERT INTO PhotoAlbums (name, display_name, "desc", order_num, show)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [name, display_name, desc, order_num, show]
    );

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error creating album:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:name/init-folder', (req, res) => {
  const { name } = req.params;
  const albumDir = path.join('media', 'albums', name);

  console.log(
    `[INIT-FOLDER] Received request to initialize folder for album: ${name}`
  );
  console.log(`[INIT-FOLDER] Target directory: ${albumDir}`);

  try {
    if (!fs.existsSync(albumDir)) {
      fs.mkdirSync(albumDir, { recursive: true });
      console.log(`[INIT-FOLDER] Directory created: ${albumDir}`);
    } else {
      console.log(`[INIT-FOLDER] Directory already exists: ${albumDir}`);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[INIT-FOLDER] Error creating folder '${albumDir}':`, err);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

router.post("/reorder", async (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: "Invalid or empty order array." });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Loop through array and update each record
    for (let i = 0; i < order.length; i++) {
      const pa_key = order[i];
      await client.query(
        "UPDATE PhotoAlbums SET order_num = $1 WHERE pa_key = $2",
        [i, pa_key]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error reordering albums:", err);
    res.status(500).json({ error: "Failed to reorder albums." });
  } finally {
    client.release();
  }
});

router.post("/photos/reorder", async (req, res) => {
  const { pa_key, order } = req.body;

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: "Invalid or empty order array." });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Loop through array and update each record
    for (let i = 0; i < order.length; i++) {
      const p_key = order[i];
      await client.query(
        "UPDATE photos SET order_num = $1 WHERE pa_key = $2 and p_key = $3",
        [i, pa_key, p_key]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error reordering albums:", err);
    res.status(500).json({ error: "Failed to reorder albums." });
  } finally {
    client.release();
  }
});

router.post('/photos/:p_key/toggle-show', async (req, res) => {
  const { p_key } = req.params;

  const client = await db.connect();
  try {
    const result = await client.query(
      `UPDATE Photos
       SET show = NOT show, update_dt = NOW()
       WHERE p_key = $1
       RETURNING show`,
      [p_key]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json({ success: true, show: result.rows[0].show });
  } catch (err) {
    console.error('Toggle show error:', err);
    res.status(500).json({ error: 'Failed to toggle show' });
  } finally {
    client.release();
  }
});

router.delete('/photos/:p_key', async (req, res) => {
  const { p_key } = req.params;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Get photo name and album info before deletion
    const result = await client.query(
      `SELECT p.name, p.pa_key, a.name AS album_name
       FROM Photos p
       JOIN PhotoAlbums a ON p.pa_key = a.pa_key
       WHERE p.p_key = $1`,
      [p_key]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const { name: photoName, album_name, pa_key } = result.rows[0];
    const baseDir = `/media/albums/${album_name}`;

    // 2. Delete photo from DB
    await client.query('DELETE FROM Photos WHERE p_key = $1', [p_key]);

    // 3. Delete files
    const pathsToDelete = [
      path.join(baseDir, 'o', `${photoName}.jpg`),
      path.join(baseDir, 'webp', `${photoName}.webp`),
      path.join(baseDir, 'webp300x300', `${photoName}.webp`),
    ];
    for (const filePath of pathsToDelete) {
      await fs.remove(filePath);
    }

    // 4. Reset order_num for remaining photos in album
    const remainingPhotos = await client.query(
      `SELECT p_key FROM Photos WHERE pa_key = $1 ORDER BY order_num`,
      [pa_key]
    );

    for (let i = 0; i < remainingPhotos.rows.length; i++) {
      const { p_key } = remainingPhotos.rows[i];
      await client.query(
        `UPDATE Photos SET order_num = $1, update_dt = NOW() WHERE p_key = $2`,
        [i + 1, p_key]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Photo delete failed:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  } finally {
    client.release();
  }
});

router.put('/photos/:p_key', async (req, res) => {
  const { p_key } = req.params;
  const { display_name, desc, date, show } = req.body;

  console.log(`[PUT /photos/${p_key}] Received update:`, {
    display_name,
    desc,
    date,
    show,
  });

  try {
    const result = await db.query(
      `UPDATE Photos
       SET display_name = $1,
           "desc" = $2,
           date = $3,
           show = $4,
           update_dt = CURRENT_TIMESTAMP
       WHERE p_key = $5`,
      [display_name, desc, date, show, p_key]
    );

    console.log(
      `[PUT /photos/${p_key}] Update successful. Rows affected:`,
      result.rowCount
    );
    res.json({ success: true });
  } catch (err) {
    console.error(`[PUT /photos/${p_key}] Photo update failed:`, err);
    res.status(500).json({ error: 'Failed to update photo' });
  }
});

router.post('/:name/upload-images', upload.array('files'), async (req, res) => {
  try {
    const albumName = req.params.name;
    const uploadDir = path.join(__dirname, `../../media/albums/${albumName}/o`);

    await fs.ensureDir(uploadDir);
    console.log(`Upload dir ensured: ${uploadDir}`);

    for (const file of req.files) {
      const destPath = path.join(uploadDir, file.originalname);
      await fs.writeFile(destPath, file.buffer);
      console.log(`Saved file: ${destPath}`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('File upload failed:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
