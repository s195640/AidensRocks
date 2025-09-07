const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

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
        rps.latitude,
		    rps.longitude,
        COUNT(rpi.rpi_key) AS total_images
      FROM Rock_Post_Summary rps
      LEFT JOIN Rock_Post_Image rpi ON rps.rps_key = rpi.rps_key
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
      UPDATE Rock_Post_Summary
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

// DELETE /api/journey/:rps_key
router.delete("/:rps_key", async (req, res) => {
  const { rps_key } = req.params;

  try {
    const deleteQuery = `DELETE FROM Rock_Post_Summary WHERE rps_key = $1 RETURNING rps_key`;
    const { rows } = await pool.query(deleteQuery, [rps_key]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ message: "Post deleted", rps_key });
  } catch (err) {
    console.error(`DELETE /api/journey/${rps_key} error:`, err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// GET images for a specific journey post by rps_key
router.get("/:rps_key/images", async (req, res) => {
  const { rps_key } = req.params;
  try {
    const query = `
      SELECT rpi_key, original_name, current_name, upload_order, show, width, height
      FROM Rock_Post_Image
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

// POST /api/journey-admin/images/:rpi_key/toggle-show
router.post("/images/:rpi_key/toggle-show", async (req, res) => {
  const { rpi_key } = req.params;
  const { show } = req.body; // boolean

  try {
    const result = await pool.query(
      "UPDATE Rock_Post_Image SET show = $1, update_dt = CURRENT_TIMESTAMP WHERE rpi_key = $2 RETURNING *",
      [show, rpi_key]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Image not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to toggle image show:", err);
    res.status(500).json({ error: "Failed to toggle image show" });
  }
});

// DELETE /api/journey-admin/images/:rpi_key
router.delete("/images/:rpi_key", async (req, res) => {
  const { rpi_key } = req.params;

  try {
    const result = await pool.query("DELETE FROM Rock_Post_Image WHERE rpi_key = $1", [rpi_key]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Image not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete image:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// PUT /api/journey-admin/:rps_key
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
    longitude, // ✅ new fields
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE Rock_Post_Summary
       SET rock_number = $1,
           location = $2,
           date = $3,
           comment = $4,
           name = $5,
           email = $6,
           show = $7,
           latitude = $8,
           longitude = $9,
           update_dt = CURRENT_TIMESTAMP
       WHERE rps_key = $10
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
        rps_key,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Failed to update post:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});



module.exports = router;
