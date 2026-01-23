import express from "express";
import { getDB } from "../db/index.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";

const router = express.Router();

// Helper to create notifications
async function createNotification(
  userId,
  type,
  title,
  message,
  relatedId,
  relatedType,
) {
  const db = getDB();
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, relatedId, relatedType],
      function (err) {
        if (err) {
          console.error(`[NOTIFICATION ERROR] User ${userId}:`, err.message);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      },
    );
  });
}

/**
 * @swagger
 * /api/admin/licenses:
 *   get:
 *     summary: Get all licenses (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all licenses
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 */
router.get("/licenses", authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();

  db.all(
    `SELECT id, name, description, usage_rights, default_price, is_active, created_at
     FROM licenses
     ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
    },
  );
});

/**
 * @swagger
 * /api/admin/licenses:
 *   post:
 *     summary: Create a new license (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - usage_rights
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               usage_rights:
 *                 type: string
 *     responses:
 *       201:
 *         description: License created successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 */
router.post("/licenses", authenticateToken, requireAdmin, (req, res) => {
  const { name, description, usage_rights, price } = req.body;
  const db = getDB();

  if (!name || !description || !usage_rights || price === undefined) {
    return res.status(400).json({
      error: "Name, description, usage_rights, and price are required",
    });
  }

  if (price < 0) {
    return res
      .status(400)
      .json({ error: "Price must be greater than or equal to 0" });
  }

  db.run(
    `INSERT INTO licenses (name, description, usage_rights, default_price)
     VALUES (?, ?, ?, ?)`,
    [name, description, usage_rights, price],
    function (err) {
      if (err) {
        console.error("CREATE LICENSE ERROR:", err.message);
        return res.status(500).json({ error: "Database error" });
      }

      res.status(201).json({
        message: "License created successfully",
        license: {
          id: this.lastID,
          name,
          description,
          usage_rights,
          price,
        },
      });
    },
  );
});

/**
 * @swagger
 * /api/admin/licenses/{id}:
 *   put:
 *     summary: Update an existing license (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: License ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               usage_rights:
 *                 type: string
 *     responses:
 *       200:
 *         description: License updated successfully
 *       400:
 *         description: No fields to update
 *       404:
 *         description: License not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 */
router.put("/licenses/:id", authenticateToken, requireAdmin, (req, res) => {
  const licenseId = req.params.id;
  const { name, description, usage_rights } = req.body;
  const db = getDB();

  if (!name && !description && !usage_rights) {
    return res.status(400).json({
      error:
        "At least one field (name, description, or usage_rights) must be provided",
    });
  }

  // Build dynamic update query
  const updates = [];
  const values = [];

  if (name) {
    updates.push("name = ?");
    values.push(name);
  }
  if (description) {
    updates.push("description = ?");
    values.push(description);
  }
  if (usage_rights) {
    updates.push("usage_rights = ?");
    values.push(usage_rights);
  }

  values.push(licenseId);

  db.run(
    `UPDATE licenses SET ${updates.join(", ")} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        console.error("UPDATE LICENSE ERROR:", err.message);
        return res.status(500).json({ error: "Database error" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "License not found" });
      }

      res.json({
        message: "License updated successfully",
        updated: { id: licenseId, name, description, usage_rights },
      });
    },
  );
});

/**
 * @swagger
 * /api/admin/licenses/{id}/status:
 *   put:
 *     summary: Update license status (activate/deactivate)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: License ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: Set to 0 to deactivate, 1 to activate
 *     responses:
 *       200:
 *         description: License status updated successfully
 *       400:
 *         description: Missing is_active field
 *       404:
 *         description: License not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 */
router.put(
  "/licenses/:id/status",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const licenseId = req.params.id;
    const { is_active } = req.body;
    const db = getDB();

    if (is_active === undefined || is_active === null) {
      return res.status(400).json({ error: "is_active field is required" });
    }

    if (is_active !== 0 && is_active !== 1) {
      return res
        .status(400)
        .json({ error: "is_active must be 0 (inactive) or 1 (active)" });
    }

    // Check if license is in use (has purchases)
    db.get(
      `SELECT COUNT(*) as purchase_count FROM purchases WHERE license_id = ?`,
      [licenseId],
      (err, row) => {
        if (err) {
          console.error("CHECK LICENSE USAGE ERROR:", err.message);
          return res.status(500).json({ error: "Database error" });
        }

        const inUse = row.purchase_count > 0;

        // Update license status
        db.run(
          `UPDATE licenses SET is_active = ? WHERE id = ?`,
          [is_active, licenseId],
          function (err) {
            if (err) {
              console.error("UPDATE LICENSE STATUS ERROR:", err.message);
              return res.status(500).json({ error: "Database error" });
            }

            if (this.changes === 0) {
              return res.status(404).json({ error: "License not found" });
            }

            res.json({
              message: `License ${is_active === 1 ? "activated" : "deactivated"} successfully`,
              id: licenseId,
              is_active: is_active,
              in_use: inUse,
              note: inUse
                ? "License is in use (has existing purchases). It remains queryable for data integrity but won't be available for new beats."
                : "License is not currently in use.",
            });
          },
        );
      },
    );
  },
);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (with optional role filter)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [buyer, producer, admin]
 *         description: Filter users by role
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 */
router.get("/users", authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();
  const { role } = req.query;

  let query = `
    SELECT 
      id, 
      username, 
      email, 
      role, 
      wallet_balance,
      created_at,
      last_login
    FROM users
  `;

  const params = [];

  if (role && ["buyer", "producer", "admin"].includes(role)) {
    query += " WHERE role = ?";
    params.push(role);
  }

  query += " ORDER BY created_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("ADMIN USERS QUERY ERROR:", err.message);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({
      total: rows.length,
      filter: role || "all",
      users: rows,
    });
  });
});

/**
 * @swagger
 * /api/admin/beats:
 *   get:
 *     summary: Get all beats (including disabled/problematic)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all beats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 */
router.get("/beats", authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();
  const query = `
    SELECT id, producer_id, title, genre, tempo, duration, preview_url, full_url, created_at, is_active
    FROM beats
    ORDER BY created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    // Map rows to include derived status
    const beats = rows.map((beat) => ({
      ...beat,
      status: beat.is_active ? "enabled" : "disabled",
    }));

    res.json(beats);
  });
});

/**
 * @swagger
 * /api/admin/beats/{id}/status:
 *   put:
 *     summary: Moderate beat status (enable, disable, ban)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [enabled, disabled, under_review, banned]
 *     responses:
 *       200:
 *         description: Beat status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Beat not found
 */
router.put("/beats/:id/status", authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();
  const beatId = req.params.id;
  const { status } = req.body;

  const allowedStatuses = ["enabled", "disabled", "under_review", "banned"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const isActive = status === "enabled" ? 1 : 0;

  db.run(
    `
    UPDATE beats
    SET 
      status = ?,
      is_active = ?,
      dispute_status = CASE
        WHEN ? IN ('under_review', 'banned') THEN ?
        ELSE dispute_status
      END
    WHERE id = ?
    `,
    [status, isActive, status, status, beatId],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0)
        return res.status(404).json({ error: "Beat not found" });

      res.json({
        message: `Beat status updated to ${status}`,
      });
    },
  );
});

/**
 * @swagger
 * /api/admin/sales:
 *   get:
 *     summary: Get all platform sales
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all purchases
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 */
router.get("/sales", authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();
  const query = `
    SELECT
      p.id AS purchase_id,
      b.id AS beat_id,
      b.title AS beat_title,
      u.email AS buyer_email,
      l.name AS license_name,
      p.price,
      p.commission,
      p.seller_earnings,
      p.payout_status,
      p.refund_status,
      p.purchased_at
    FROM purchases p
    JOIN beats b ON b.id = p.beat_id
    JOIN users u ON u.id = p.buyer_id
    JOIN licenses l ON l.id = p.license_id
    ORDER BY p.purchased_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("ADMIN SALES QUERY ERROR:", err.message);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/admin/sales/summary:
 *   get:
 *     summary: Get platform-wide sales summary
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform sales summary
 */
router.get("/sales/summary", authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();
  const query = `
    SELECT
      COUNT(DISTINCT p.id) AS total_purchases,
      SUM(p.price) AS total_revenue,
      SUM(p.commission) AS total_commission,
      COUNT(DISTINCT p.buyer_id) AS unique_buyers,
      COUNT(DISTINCT b.producer_id) AS total_producers
    FROM purchases p
    JOIN beats b ON b.id = p.beat_id
  `;

  db.get(query, [], (err, summary) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(summary);
  });
});

/**
 * @swagger
 * /api/admin/disputes:
 *   get:
 *     summary: Get all disputes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all disputes
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 */
router.get("/disputes", authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();

  const query = `
    SELECT
      d.id,
      d.purchase_id,
      d.raised_by,
      d.reason,
      d.status,
      d.admin_response,
      d.producer_response,
      d.resolution,
      d.created_at,
      d.resolved_at,
      p.price,
      p.seller_earnings,
      b.id as beat_id,
      b.title as beat_title,
      b.producer_id,
      buyer.username as buyer_username,
      buyer.email as buyer_email,
      producer.username as producer_username,
      producer.email as producer_email
    FROM disputes d
    JOIN purchases p ON d.purchase_id = p.id
    JOIN beats b ON p.beat_id = b.id
    LEFT JOIN users buyer ON d.raised_by = buyer.id
    LEFT JOIN users producer ON b.producer_id = producer.id
    ORDER BY d.created_at DESC
  `;

  db.all(query, [], (err, disputes) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(disputes);
  });
});

/**
 * @swagger
 * /api/admin/disputes/{id}:
 *   get:
 *     summary: Get single dispute details
 *     tags: [Admin]
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
 *         description: Dispute details
 *       404:
 *         description: Dispute not found
 */
router.get("/disputes/:id", authenticateToken, requireAdmin, (req, res) => {
  const disputeId = req.params.id;
  const db = getDB();

  const query = `
    SELECT
      d.id,
      d.purchase_id,
      d.raised_by,
      d.reason,
      d.status,
      d.admin_response,
      d.producer_response,
      d.resolution,
      d.created_at,
      d.resolved_at,
      p.price,
      p.seller_earnings,
      p.refund_status,
      b.id as beat_id,
      b.title as beat_title,
      b.producer_id,
      buyer.username as buyer_username,
      buyer.email as buyer_email,
      producer.username as producer_username,
      producer.email as producer_email
    FROM disputes d
    JOIN purchases p ON d.purchase_id = p.id
    JOIN beats b ON p.beat_id = b.id
    LEFT JOIN users buyer ON d.raised_by = buyer.id
    LEFT JOIN users producer ON b.producer_id = producer.id
    WHERE d.id = ?
  `;

  db.get(query, [disputeId], (err, dispute) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!dispute) return res.status(404).json({ error: "Dispute not found" });
    res.json(dispute);
  });
});

/**
 * @swagger
 * /api/admin/disputes/{id}:
 *   patch:
 *     summary: Update dispute status (approve/reject)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [under_review, resolved, rejected]
 *               admin_response:
 *                 type: string
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dispute updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Dispute not found
 */
router.patch("/disputes/:id", authenticateToken, requireAdmin, (req, res) => {
  const disputeId = req.params.id;
  const { status, admin_response, resolution } = req.body;
  const db = getDB();

  if (!status || !["under_review", "resolved", "rejected"].includes(status)) {
    return res.status(400).json({
      error: "Invalid status. Must be: under_review, resolved, or rejected",
    });
  }

  // Get dispute details first
  db.get(
    `SELECT d.*, p.beat_id, b.producer_id, b.title as beat_title
     FROM disputes d
     JOIN purchases p ON d.purchase_id = p.id
     JOIN beats b ON p.beat_id = b.id
     WHERE d.id = ?`,
    [disputeId],
    (err, dispute) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!dispute) return res.status(404).json({ error: "Dispute not found" });

      const resolvedAt =
        status === "resolved" || status === "rejected"
          ? new Date().toISOString()
          : null;

      db.run(
        `UPDATE disputes 
         SET status = ?, admin_response = ?, resolution = ?, resolved_at = ?
         WHERE id = ?`,
        [status, admin_response, resolution, resolvedAt, disputeId],
        async function (err2) {
          if (err2) return res.status(500).json({ error: "Database error" });

          // Update purchase refund_status based on dispute outcome
          let newRefundStatus = "disputed"; // default, keep as is

          if (status === "rejected") {
            // Dispute rejected - restore to normal
            newRefundStatus = "none";
          } else if (status === "resolved") {
            // Dispute resolved - could be refunded or kept as disputed
            // For now, keep as disputed until refund is processed
            newRefundStatus = "disputed";
          }

          // Update purchase table
          db.run(
            `UPDATE purchases SET refund_status = ? WHERE id = ?`,
            [newRefundStatus, dispute.purchase_id],
            (err3) => {
              if (err3) {
                console.error(
                  "Failed to update purchase refund_status:",
                  err3.message,
                );
              }
            },
          );

          // Notify producer based on status change
          try {
            if (status === "under_review") {
              await createNotification(
                dispute.producer_id,
                "dispute_under_review",
                "Dispute Under Review",
                `Admin is reviewing the dispute for "${dispute.beat_title}". Please prepare your response.`,
                disputeId,
                "dispute",
              );
            } else if (status === "resolved") {
              // Notify producer to respond
              await createNotification(
                dispute.producer_id,
                "dispute_action_required",
                "Action Required: Dispute Approved",
                `Admin approved the dispute for "${dispute.beat_title}". You must respond with a resolution.`,
                disputeId,
                "dispute",
              );

              // Notify buyer
              await createNotification(
                dispute.raised_by,
                "dispute_resolved",
                "Dispute Resolved",
                `Your dispute for "${dispute.beat_title}" has been resolved by admin.${resolution ? " Resolution: " + resolution : ""}`,
                disputeId,
                "dispute",
              );
            } else if (status === "rejected") {
              // Notify buyer
              await createNotification(
                dispute.raised_by,
                "dispute_rejected",
                "Dispute Rejected",
                `Your dispute for "${dispute.beat_title}" has been rejected.${admin_response ? " Reason: " + admin_response : ""}`,
                disputeId,
                "dispute",
              );

              // Notify producer
              await createNotification(
                dispute.producer_id,
                "dispute_rejected",
                "Dispute Rejected",
                `The dispute for "${dispute.beat_title}" has been rejected by admin. No action needed.`,
                disputeId,
                "dispute",
              );
            }
          } catch (notifErr) {
            console.error("Notification failed:", notifErr.message);
          }

          res.json({
            message: "Dispute updated successfully",
            dispute_id: disputeId,
            status: status,
          });
        },
      );
    },
  );
});

/**
 * @swagger
 * /api/admin/notifications:
 *   get:
 *     summary: Get admin's notifications
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admin's notifications
 *       401:
 *         description: Unauthorized
 */
router.get("/notifications", authenticateToken, requireAdmin, (req, res) => {
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
 * /api/admin/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Admin]
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
router.patch(
  "/notifications/:id/read",
  authenticateToken,
  requireAdmin,
  (req, res) => {
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
  },
);

/**
 * @swagger
 * /api/admin/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch(
  "/notifications/read-all",
  authenticateToken,
  requireAdmin,
  (req, res) => {
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
  },
);

export default router;
