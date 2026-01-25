import express from "express";
import { getDB } from "../db/index.js";
import {
  authenticateToken,
  optionalAuth,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/beats:
 *   get:
 *     summary: Get all beats (public)
 *     tags: [Beats]
 *     parameters:
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of beats
 *       500:
 *         description: Server error
 */
router.get("/", (req, res) => {
  const { genre, search } = req.query;
  const db = getDB();

  let sql = `
    SELECT 
      beats.*, 
      users.username AS producer_name,
      MIN(beat_licenses.price) as min_price
    FROM beats
    LEFT JOIN users ON beats.producer_id = users.id
    LEFT JOIN beat_licenses ON beats.id = beat_licenses.beat_id
    WHERE beats.is_active = 1 AND beats.status = 'enabled'
  `;
  const params = [];

  if (genre) {
    sql += ` AND beats.genre = ?`;
    params.push(genre);
  }

  if (search) {
    sql += ` AND (beats.title LIKE ? OR beats.tags LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ` GROUP BY beats.id ORDER BY beats.created_at DESC`;

  db.all(sql, params, (err, beats) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Update cover_art_url to use local files
    const updatedBeats = beats.map((beat) => {
      if (
        beat.cover_art_url &&
        beat.cover_art_url.includes("cdn.afrobeatz.com")
      ) {
        const filename = beat.cover_art_url.split("/").pop();
        beat.cover_art_url = `/audio/covers/${filename}`;
      }
      return beat;
    });

    res.json({ beats: updatedBeats });
  });
});

/**
 * @swagger
 * /api/beats/{id}:
 *   get:
 *     summary: Get beat details
 *     tags: [Beats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Beat details
 *       404:
 *         description: Beat not found
 */
router.get("/:id", optionalAuth, (req, res) => {
  const beatId = req.params.id;
  const db = getDB();

  db.get(
    `SELECT beats.*, users.username AS producer_name
     FROM beats
     JOIN users ON beats.producer_id = users.id
     WHERE beats.id = ?`,
    [beatId],
    (err, beat) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!beat) return res.status(404).json({ error: "Beat not found" });

      // Check if user has purchased this beat
      if (req.user) {
        db.get(
          `SELECT 1 FROM purchases WHERE buyer_id = ? AND beat_id = ?`,
          [req.user.id, beatId],
          (err, purchase) => {
            const hasPurchased = !!purchase;
            res.json({
              ...beat,
              has_purchased: hasPurchased,
              can_download: hasPurchased || req.user.id === beat.producer_id,
            });
          },
        );
      } else {
        res.json({ ...beat, has_purchased: false, can_download: false });
      }
    },
  );
});

/**
 * @swagger
 * /api/beats/{id}/download:
 *   get:
 *     summary: Download purchased beat
 *     tags: [Beats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audio file
 *       403:
 *         description: Purchase required
 *       404:
 *         description: File not found
 */
router.get("/:id/download", authenticateToken, (req, res) => {
  const beatId = req.params.id;
  const userId = req.user.id;
  const db = getDB();

  // Verify purchase or ownership
  db.get(
    `SELECT beats.*, purchases.id AS purchase_id
     FROM beats
     LEFT JOIN purchases ON purchases.beat_id = beats.id AND purchases.buyer_id = ?
     WHERE beats.id = ?`,
    [userId, beatId],
    (err, beat) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!beat) return res.status(404).json({ error: "Beat not found" });

      // Check if user owns the beat (producer) or has purchased it
      const isOwner = beat.producer_id === userId;
      const hasPurchased = !!beat.purchase_id;

      if (!isOwner && !hasPurchased) {
        return res
          .status(403)
          .json({ error: "You must purchase this beat to download it" });
      }

      // Send file
      const filePath = path.join(__dirname, "..", beat.audio_file_path);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Audio file not found" });
      }

      res.download(
        filePath,
        `${beat.title}${path.extname(beat.audio_file_path)}`,
      );
    },
  );
});

/**
 * @swagger
 * /api/beats/{beatId}/licenses:
 *   get:
 *     summary: Get licenses for a specific beat
 *     tags: [Beats]
 *     parameters:
 *       - in: path
 *         name: beatId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     responses:
 *       200:
 *         description: List of licenses for the beat
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   license_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   usage_rights:
 *                     type: string
 *                   price:
 *                     type: number
 *       400:
 *         description: Invalid beat ID
 *       500:
 *         description: Database error
 */
router.get("/:beatId/licenses", (req, res) => {
  const beatId = Number(req.params.beatId);
  const db = getDB();

  if (!beatId) {
    return res.status(400).json({ error: "Invalid beat ID" });
  }

  db.all(
    `
    SELECT
      l.id AS license_id,
      l.name,
      l.description,
      l.usage_rights,
      bl.price
    FROM beat_licenses bl
    JOIN licenses l ON bl.license_id = l.id
    WHERE bl.beat_id = ?
    ORDER BY l.id ASC
    `,
    [beatId],
    (err, rows) => {
      if (err) {
        console.error("GET BEAT LICENSES ERROR:", err.message);
        return res.status(500).json({ error: "Database error" });
      }

      res.json(rows);
    },
  );
});

export default router;
