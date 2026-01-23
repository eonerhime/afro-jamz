import express from "express";
import { getDB } from "../db/index.js";

const router = express.Router();

/**
 * @swagger
 * /api/licenses:
 *   get:
 *     summary: Get all standard licenses
 *     tags: [Licenses]
 *     responses:
 *       200:
 *         description: List of all standard licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   usage_rights:
 *                     type: string
 *       500:
 *         description: Database error
 */
router.get("/", (req, res) => {
  const db = getDB();

  db.all(
    `SELECT id, name, description, usage_rights, default_price FROM licenses WHERE is_active = 1 ORDER BY id`,
    [],
    (err, rows) => {
      if (err) {
        console.error("GET LICENSES ERROR:", err.message);
        return res.status(500).json({ error: "Database error" });
      }

      res.json(rows);
    },
  );
});

export default router;
