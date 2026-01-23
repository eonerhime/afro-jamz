import express from "express";
import { getDB } from "../db/index.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user's notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's notifications
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const db = getDB();

  const query = `
    SELECT
      id,
      type,
      title,
      message,
      reference_id,
      reference_type,
      is_read,
      created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.all(query, [userId], (err, notifications) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(notifications);
  });
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Notification not found
 */
router.patch("/:id/read", authenticateToken, (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;
  const db = getDB();

  // Verify notification belongs to user
  db.get(
    `SELECT id FROM notifications WHERE id = ? AND user_id = ?`,
    [notificationId, userId],
    (err, notification) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!notification) {
        return res.status(404).json({ error: "Notification not found" });
      }

      db.run(
        `UPDATE notifications SET is_read = 1 WHERE id = ?`,
        [notificationId],
        (err2) => {
          if (err2) return res.status(500).json({ error: "Database error" });
          res.json({ message: "Notification marked as read" });
        },
      );
    },
  );
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch("/read-all", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const db = getDB();

  db.run(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
    [userId],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({
        message: "All notifications marked as read",
        updated_count: this.changes,
      });
    },
  );
});

export default router;
