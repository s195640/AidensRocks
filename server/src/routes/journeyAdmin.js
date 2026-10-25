const express = require('express');
const intParams = require('../utils/intParams');
const pool = require('../db/pool');
const safeRollback = require('../utils/db/safeRollback');
const NodeGeocoder = require("node-geocoder");
const fs = require("fs");
const path = require('path');
const sharp = require('sharp');
const upload = require('../middleware/multer');
const ensureDir = require('../utils/ensureDir');
const convertToWebP = require('../utils/convert-to-webp/convertToWebP');
const createThumbnails = require('../utils/convert-to-webp/createThumbnails');
const processVideo = require('../utils/processVideo');
const isVideoFile = require('../utils/isVideoFile');
const requireAdminAuth = require('../middleware/requireAdminAuth');
const notifyFollowers = require('../utils/rock-upload/notifyFollowers');
const recordServerError = require('../utils/errors/recordServerError');

const router = express.Router();
intParams(router, 'rps_key', 'rpi_key');
router.use(requireAdminAuth);

// OPENCAGE_API_KEY comes from .env (it used to be hard-coded here, i.e. in
// git). Without one, saving a journey still works -- country/state just
// aren't looked up (they keep their current values).
const geocoder = process.env.OPENCAGE_API_KEY
  ? NodeGeocoder({ provider: "opencage", apiKey: process.env.OPENCAGE_API_KEY })
  : null;

const accessAsync = fs.promises.access;
const mkdirAsync = fs.promises.mkdir;
const renameAsync = fs.promises.rename;

// GET /api/journey - fetch all posts with total images count
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        rps.rps_key,
        rps.rock_number,
        rps.location,
        rps.date,
        rps.comment,
        rps.name,
        rps.email,
        rps.uuid,
        rps.show,
        rps.email_sent,
        rps.email_dt,
        rps.latitude,
		    rps.longitude,
        COUNT(rpi.rpi_key) AS total_images
      FROM journey rps
      LEFT JOIN journey_image rpi ON rps.rps_key = rpi.rps_key
      GROUP BY rps.rps_key
      ORDER BY rps.latitude desc, rps.date desc
    `;

    const { rows } = await pool.query(query);

    // Convert total_images to integer
    const posts = rows.map(row => ({
      ...row,
      total_images: parseInt(row.total_images, 10),
    }));

    res.json(posts);
  } catch (err) {
    console.error("GET /api/journey error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/journey/:rps_key/toggle-show
router.post("/:rps_key/toggle-show", async (req, res) => {
  const { rps_key } = req.params;
  const { show } = req.body;

  if (typeof show !== "boolean") {
    return res.status(400).json({ error: "'show' must be a boolean" });
  }

  try {
    const updateQuery = `
      UPDATE journey
      SET show = $1,
          update_dt = CURRENT_TIMESTAMP
      WHERE rps_key = $2
      RETURNING rps_key, show
    `;
    const { rows } = await pool.query(updateQuery, [show, rps_key]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(`POST /api/journey/${rps_key}/toggle-show error:`, err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/journey/:rps_key -- the journey, its image + tracking rows
// (no FKs to cascade) and its media folder. Used to delete only the
// journey row, leaving orphaned rows and files behind.
router.delete("/:rps_key", async (req, res) => {
  const { rps_key } = req.params;
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const { rows } = await client.query(
      `DELETE FROM journey WHERE rps_key = $1 RETURNING rps_key, rock_number, uuid`,
      [rps_key]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Post not found" });
    }

    await client.query("DELETE FROM journey_image WHERE rps_key = $1", [rps_key]);
    await client.query("DELETE FROM journey_tracking WHERE rps_key = $1", [rps_key]);
    await client.query("COMMIT");

    const { rock_number, uuid } = rows[0];
    if (uuid) {
      await fs.promises
        .rm(path.join("media", "rocks", String(rock_number), uuid), { recursive: true, force: true })
        .catch((fsErr) => console.error(`⚠️ Couldn't remove media for rps_key=${rps_key}:`, fsErr));
    }

    res.json({ message: "Post deleted", rps_key });
  } catch (err) {
    await safeRollback(client);
    console.error(`DELETE /api/journey/${rps_key} error:`, err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    if (client) client.release();
  }
});


// GET images for a specific journey post by rps_key
router.get("/:rps_key/images", async (req, res) => {
  const { rps_key } = req.params;
  try {
    const query = `
      SELECT rpi_key, original_name, current_name, upload_order, show, width, height, media_type, duration_seconds
      FROM journey_image
      WHERE rps_key = $1
      ORDER BY upload_order ASC NULLS LAST, create_dt ASC
    `;
    const { rows } = await pool.query(query, [rps_key]);
    res.json(rows);
  } catch (err) {
    console.error("Failed to load images:", err);
    res.status(500).json({ error: "Failed to load images" });
  }
});

// POST /api/journey-admin/:rps_key/images - upload new images to an existing post
router.post("/:rps_key/images", upload.array("images"), async (req, res) => {
  const { rps_key } = req.params;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No images provided" });
  }

  try {
    const postRes = await pool.query(
      "SELECT rock_number, uuid FROM journey WHERE rps_key = $1",
      [rps_key]
    );
    if (postRes.rowCount === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    const { rock_number, uuid } = postRes.rows[0];

    const orderRes = await pool.query(
      "SELECT COALESCE(MAX(upload_order), 0) AS max_order FROM journey_image WHERE rps_key = $1",
      [rps_key]
    );
    let nextOrder = orderRes.rows[0].max_order + 1;

    const baseDir = path.resolve("media", "rocks", String(rock_number), uuid);
    const originalDir = path.join(baseDir, "o");
    const webpDir = path.join(baseDir, "webp");
    const smDir = path.join(baseDir, "sm");
    const videoDir = path.join(baseDir, "video");

    await ensureDir(originalDir);
    await ensureDir(webpDir);
    await ensureDir(smDir);
    await ensureDir(videoDir);

    const newImages = [];

    for (const file of files) {
      const ext = path.extname(file.originalname);
      const baseName = `${nextOrder}_${uuid}`;
      const fullName = baseName + ext;
      const originalPath = path.join(originalDir, fullName);
      const webpPath = path.join(webpDir, `${baseName}.webp`);
      const smPath = path.join(smDir, `${baseName}.webp`);
      const isVideo = isVideoFile(fullName);

      await fs.promises.writeFile(originalPath, file.buffer);

      let width = null;
      let height = null;
      let duration = null;

      if (isVideo) {
        const videoPath = path.join(videoDir, `${baseName}.mp4`);
        const result = await processVideo(originalPath, {
          webpOutputPath: webpPath,
          videoOutputPath: videoPath,
        });
        duration = result.duration;
        width = result.width;
        height = result.height;
      } else {
        const metadata = await sharp(file.buffer).metadata();
        width = metadata.width || null;
        height = metadata.height || null;
        await convertToWebP(originalPath, webpPath);
      }

      await createThumbnails(webpPath, smPath, 300, 300);

      const { rows } = await pool.query(
        `INSERT INTO journey_image (
           rps_key, original_name, current_name, upload_order, width, height, show, media_type, duration_seconds
         )
         VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
         RETURNING rpi_key, original_name, current_name, upload_order, show, width, height, media_type, duration_seconds`,
        [rps_key, file.originalname, baseName, nextOrder, width, height, isVideo ? 'video' : 'photo', duration]
      );

      newImages.push(rows[0]);
      nextOrder++;
    }

    res.status(201).json(newImages);
  } catch (err) {
    console.error(`POST /api/journey-admin/${rps_key}/images error:`, err);
    res.status(500).json({ error: "Failed to upload images" });
  }
});

// POST /api/journey-admin/images/:rpi_key/toggle-show
router.post("/images/:rpi_key/toggle-show", async (req, res) => {
  const { rpi_key } = req.params;
  const { show } = req.body; // boolean

  try {
    const result = await pool.query(
      "UPDATE journey_image SET show = $1, update_dt = CURRENT_TIMESTAMP WHERE rpi_key = $2 RETURNING *",
      [show, rpi_key]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Image not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to toggle image show:", err);
    res.status(500).json({ error: "Failed to toggle image show" });
  }
});

// DELETE /api/journey-admin/images/:rpi_key -- the row and its files
// (original in o/, webp/, sm/ thumbnail, video/ mp4). It used to delete only
// the row, leaving the files on disk forever.
router.delete("/images/:rpi_key", async (req, res) => {
  const { rpi_key } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM journey_image ji
       USING journey j
       WHERE ji.rpi_key = $1 AND j.rps_key = ji.rps_key
       RETURNING ji.rps_key, ji.current_name, j.rock_number, j.uuid`,
      [rpi_key]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Image not found" });

    // Files after the row is gone, best-effort (like the journey delete
    // above): a file that can't be removed is logged, not a 500.
    const { rps_key, current_name, rock_number, uuid } = result.rows[0];
    const { rows: sameName } = await pool.query(
      "SELECT 1 FROM journey_image WHERE rps_key = $1 AND current_name = $2",
      [rps_key, current_name]
    );
    if (uuid && current_name && sameName.length === 0) {
      const baseDir = path.join("media", "rocks", String(rock_number), uuid);
      const oDir = path.join(baseDir, "o");
      // The original keeps its upload extension, which isn't stored.
      const originals = await fs.promises
        .readdir(oDir)
        .then((files) => files.filter((f) => path.parse(f).name === current_name))
        .catch(() => []);
      const files = [
        ...originals.map((f) => path.join(oDir, f)),
        path.join(baseDir, "webp", `${current_name}.webp`),
        path.join(baseDir, "sm", `${current_name}.webp`),
        path.join(baseDir, "video", `${current_name}.mp4`),
      ];
      for (const file of files) {
        await fs.promises
          .rm(file, { force: true })
          .catch((fsErr) => console.error(`⚠️ Couldn't remove ${file}:`, fsErr.message));
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete image:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// PUT /api/journey-admin/:rps_key
// Shows a renumbered journey's hidden images that have a processed webp.
// Returns how many it showed.
async function publishImagesAfterRenumber(rps_key, dir) {
  const { rows } = await pool.query(
    "SELECT rpi_key, current_name FROM journey_image WHERE rps_key = $1 AND show = FALSE",
    [rps_key]
  );
  const ready = rows
    .filter((r) => fs.existsSync(path.join(dir, "webp", `${r.current_name}.webp`)))
    .map((r) => r.rpi_key);
  if (ready.length === 0) return 0;
  await pool.query(
    "UPDATE journey_image SET show = TRUE, update_dt = CURRENT_TIMESTAMP WHERE rpi_key = ANY($1::int[])",
    [ready]
  );
  return ready.length;
}

router.put("/:rps_key", async (req, res) => {
  const { rps_key } = req.params;
  const {
    rock_number,
    location,
    date,
    comment,
    name,
    email,
    show,
    latitude,
    longitude,
  } = req.body;

  let country = null;
  let state = null;

  try {
    // ✅ 1. Fetch current record to compare old vs new rock_number
    const oldRes = await pool.query(
      "SELECT rock_number, uuid FROM journey WHERE rps_key = $1",
      [rps_key]
    );

    if (oldRes.rowCount === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const oldRockNumber = oldRes.rows[0].rock_number;
    const uuid = oldRes.rows[0].uuid; // assuming `uuid` is stored in `journey`

    // ✅ 2. Reverse geocode (optional)
    if (geocoder && latitude && longitude) {
      try {
        const geoRes = await geocoder.reverse({ lat: latitude, lon: longitude });
        if (geoRes && geoRes.length > 0) {
          country = geoRes[0].country || null;
          state = geoRes[0].state || null;
        }
      } catch (geoErr) {
        console.warn(`Reverse geocode failed for rps_key=${rps_key}`, geoErr.message);
      }
    }

    // ✅ 3. If rock_number changed, move the directory first (string
    // compare: the column is an int, the body value a string, so `!==`
    // used to "move" on every save). A failed move stops the save, rather
    // than updating the row to point at a folder that isn't there.
    const rockNumberChanged = String(oldRockNumber) !== String(rock_number);
    const oldDir = path.join("media", "rocks", String(oldRockNumber), String(uuid));
    const newDir = path.join("media", "rocks", String(rock_number), String(uuid));
    let moved = false;
    if (rockNumberChanged && uuid && fs.existsSync(oldDir)) {
      try {
        await mkdirAsync(path.dirname(newDir), { recursive: true });
        await renameAsync(oldDir, newDir);
        moved = true;
        console.log(`Moved directory from ${oldDir} → ${newDir}`);
      } catch (fsErr) {
        console.error(`⚠️ Failed to move directory for rps_key=${rps_key}:`, fsErr);
        return res.status(500).json({ error: "Couldn't move this journey's photos to the new rock number." });
      }
    }

    // ✅ 4. Perform DB update (moving the folder back if it fails)
    const moveBack = async () => {
      if (moved) await renameAsync(newDir, oldDir).catch(() => {});
    };
    const result = await pool.query(
      `UPDATE journey
       SET rock_number = $1,
           location = $2,
           date = $3,
           comment = $4,
           name = $5,
           email = $6,
           show = $7,
           latitude = $8,
           longitude = $9,
           country = COALESCE($10, country),
           state = COALESCE($11, state),
           update_dt = CURRENT_TIMESTAMP
       WHERE rps_key = $12
       RETURNING *`,
      [
        rock_number,
        location,
        date,
        comment,
        name,
        email,
        show,
        latitude,
        longitude,
        country,
        state,
        rps_key,
      ]
    ).catch(async (dbErr) => {
      await moveBack();
      throw dbErr;
    });

    if (result.rowCount === 0) {
      await moveBack();
      return res.status(404).json({ error: "Post not found" });
    }

    // ✅ 5. A rock-0 upload ("no number") is processed but never published
    // (processImagesInBackground skips it). Giving it a real number does
    // the publishing that upload skipped: images whose webp exists are
    // shown (a file that failed processing has none and stays hidden), and
    // if the stop is now public the rock's followers are told. The
    // journey's own Show is the admin's, from the form.
    const publishedFromZero =
      Number(oldRockNumber) === 0 && Number(rock_number) > 0 && uuid
        ? await publishImagesAfterRenumber(rps_key, newDir)
        : 0;
    if (publishedFromZero > 0 && result.rows[0].show) {
      notifyFollowers(Number(rock_number), { location, date }).catch((err) => {
        console.error(`⚠️ Follower notification failed for rock ${rock_number}:`, err);
        recordServerError(err, { kind: 'background', meta: { rock_number, rps_key, step: 'notify_followers' } });
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to update post:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});



module.exports = router;
