const express = require("express");
const router = express.Router();
const db = require("../db/pool");
const path = require("path");
const fs = require("fs-extra");
const upload = require("../middleware/upload"); // new multer
const { v4: uuidv4 } = require("uuid");
const ensureDir = require('../utils/ensureDir');
const convertToWebP = require('../utils/convert-to-webp/convertToWebP');

// -------------------- GET /api/music --------------------
router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        ROW_NUMBER() OVER (ORDER BY m.show desc, m.order_num)::int AS id,
        m_key, name, writer, lyrics, create_dt, update_dt, show, order_num
      FROM music m
      ORDER BY order_num`
    );

    const songs = result.rows.map((row) => {
      const basePath = path.join('media', 'music', String(row.m_key));

      return {
        id: row.id,
        m_key: row.m_key,
        order_num: row.order_num,
        name: row.name,
        writer: row.writer,
        lyrics: row.lyrics,
        show: row.show,
        create_dt: row.create_dt,
        update_dt: row.update_dt,
        img: path.join('/', basePath, 'sm.webp').replace(/\\/g, '/'),
        fullImg: path.join('/', basePath, 'full.webp').replace(/\\/g, '/'),
        src: path.join('/', basePath, 'song.mp3').replace(/\\/g, '/'),
      };
    });

    res.json(songs);
  } catch (err) {
    console.error("Error fetching music:", err);
    res.status(500).json({ error: "Server error fetching music." });
  }
});

// -------------------- POST /api/music --------------------
router.post("/", upload.fields([{ name: "music_file" }, { name: "image_file" }]), async (req, res) => {
  console.log("START CREATE MUSIC");
  const { title, writer, lyrics } = req.body;
  const audioFile = req.files?.music_file?.[0];
  const imageFile = req.files?.image_file?.[0];

  if (!title || !writer || !lyrics || !audioFile || !imageFile) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const client = await db.connect();
  try {
    // Start transaction
    await client.query("BEGIN");

    // Get total number of existing rows (for next order_num)
    const countResult = await client.query("SELECT COUNT(*) AS count FROM music");
    const order_num = parseInt(countResult.rows[0].count, 10) + 1;

    // Insert DB record with order_num
    const insertResult = await client.query(
      `INSERT INTO music (name, writer, lyrics, order_num)
       VALUES ($1, $2, $3, $4)
       RETURNING m_key`,
      [title, writer, lyrics, order_num]
    );
    const m_key = insertResult.rows[0].m_key;

    // Create directories
    const baseDir = path.join("media", "music", String(m_key), "o");
    await ensureDir(baseDir);

    // Generate UUID filenames
    const uuid = uuidv4();
    const audioExt = path.extname(audioFile.originalname).toLowerCase() || ".mp3";
    const imageExt = path.extname(imageFile.originalname).toLowerCase() || ".jpg";
    const audioDest = path.join(baseDir, `${uuid}${audioExt}`);
    const imageDest = path.join(baseDir, `${uuid}${imageExt}`);

    // Move files from temp to final destination
    await fs.move(audioFile.path, audioDest, { overwrite: true });
    await fs.move(imageFile.path, imageDest, { overwrite: true });

    // Create WebP images in media/music/%m_key%
    const webpDir = path.join("media", "music", String(m_key));
    await convertToWebP(imageDest, path.join(webpDir, "full.webp")); // original size
    await convertToWebP(imageDest, path.join(webpDir, "lg.webp"), { width: 500, height: 500 });
    await convertToWebP(imageDest, path.join(webpDir, "sm.webp"), { width: 50, height: 50 });

    // Copy to main folder as song.mp3
    await fs.copy(audioDest, path.join(webpDir, "song.mp3"), { overwrite: true });

    console.log("files moved and webp images created");

    // Commit transaction
    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      m_key,
      order_num,
      message: "Music created successfully.",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating music:", err);
    res.status(500).json({ error: "Server error creating music." });
  } finally {
    client.release();
  }
});


// -------------------- PUT /api/music/:m_key --------------------
router.put("/:m_key", upload.fields([{ name: "music_file" }, { name: "image_file" }]), async (req, res) => {
  const { m_key } = req.params;
  const { title, writer, lyrics } = req.body;
  const audioFile = req.files?.music_file?.[0];
  const imageFile = req.files?.image_file?.[0];

  if (!title || !writer || !lyrics) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Verify record exists
    const existing = await db.query("SELECT * FROM music WHERE m_key = $1", [m_key]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Music not found." });
    }

    // Update DB record
    await db.query(
      `UPDATE music
       SET name = $1, writer = $2, lyrics = $3, update_dt = CURRENT_TIMESTAMP
       WHERE m_key = $4`,
      [title, writer, lyrics, m_key]
    );

    const baseODir = path.join("media", "music", String(m_key), "o");
    const musicDir = path.join("media", "music", String(m_key));
    await fs.ensureDir(baseODir);
    await fs.ensureDir(musicDir);

    // -------------------- Handle audio file update --------------------
    if (audioFile) {
      const audioUUID = uuidv4();
      const audioExt = path.extname(audioFile.originalname).toLowerCase() || ".mp3";
      const audioDest = path.join(baseODir, `${audioUUID}${audioExt}`);

      // Move uploaded file into o directory
      await fs.move(audioFile.path, audioDest, { overwrite: true });

      // Copy to main folder as song.mp3
      const songDest = path.join(musicDir, "song.mp3");
      await fs.copy(audioDest, songDest, { overwrite: true });

      console.log(`Audio updated: saved to ${audioDest} and copied to ${songDest}`);
    }

    // -------------------- Handle image file update --------------------
    if (imageFile) {
      const imageUUID = uuidv4();
      const imageExt = path.extname(imageFile.originalname).toLowerCase() || ".jpg";
      const imageDest = path.join(baseODir, `${imageUUID}${imageExt}`);

      // Move new image into o dir (keep old images)
      await fs.move(imageFile.path, imageDest, { overwrite: true });

      // Recreate WebP images
      const webpDir = path.join("media", "music", String(m_key));
      await convertToWebP(imageDest, path.join(webpDir, "full.webp")); // original size
      await convertToWebP(imageDest, path.join(webpDir, "lg.webp"), { width: 500, height: 500 });
      await convertToWebP(imageDest, path.join(webpDir, "sm.webp"), { width: 50, height: 50 });

      console.log("Image replaced and webp images updated");
    }

    res.json({ success: true, message: "Music updated successfully." });
  } catch (err) {
    console.error("Error updating music:", err);
    res.status(500).json({ error: "Server error updating music." });
  }
});


// -------------------- PUT /api/music/:m_key/toggle-show --------------------
router.put("/:m_key/toggle-show", async (req, res) => {
  const { m_key } = req.params;
  const { show } = req.body;

  if (typeof show !== "boolean") {
    return res.status(400).json({ error: "Invalid value for show. Must be boolean." });
  }

  try {
    // Verify record exists
    const existing = await db.query("SELECT * FROM music WHERE m_key = $1", [m_key]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Music not found." });
    }

    // Update the 'show' field
    await db.query(
      `UPDATE music
       SET show = $1, update_dt = CURRENT_TIMESTAMP
       WHERE m_key = $2`,
      [show, m_key]
    );

    res.json({ success: true, m_key, show, message: `Music ${show ? "enabled" : "disabled"} successfully.` });
  } catch (err) {
    console.error("Error toggling show:", err);
    res.status(500).json({ error: "Server error toggling show." });
  }
});

// -------------------- DELETE /api/music/:m_key --------------------
router.delete("/:m_key", async (req, res) => {
  const { m_key } = req.params;
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Verify record exists
    const existing = await client.query("SELECT * FROM music WHERE m_key = $1", [m_key]);
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Music not found." });
    }

    // Delete media files
    const mediaDir = path.join(__dirname, `../media/music/${m_key}`);
    await fs.remove(mediaDir);

    // Delete the DB record
    await client.query("DELETE FROM music WHERE m_key = $1", [m_key]);

    // Reorder all remaining rows based on current order
    await client.query(`
      WITH ordered AS (
        SELECT m_key, ROW_NUMBER() OVER (ORDER BY order_num) AS new_order
        FROM music
      )
      UPDATE music
      SET order_num = ordered.new_order
      FROM ordered
      WHERE music.m_key = ordered.m_key;
    `);

    await client.query("COMMIT");

    res.json({ success: true, m_key, message: "Music deleted and order updated successfully." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error deleting music:", err);
    res.status(500).json({ error: "Server error deleting music." });
  } finally {
    client.release();
  }
});



module.exports = router;
