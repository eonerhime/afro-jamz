import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getDB } from "../db/index.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireBuyer } from "../middleware/role.middleware.js";
import { COMMISSION_RATE, HOLD_DAYS } from "../config/config.js";
import { debitWallet, getWalletBalance } from "../services/wallet.service.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate download token (moved from server.js)
function generateDownloadToken(userId, beatId) {
  const token = Buffer.from(`${userId}:${beatId}:${Date.now()}`).toString(
    "base64",
  );
  return token;
}

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
          console.log(`[NOTIFICATION] User ${userId}: ${message}`);
          resolve(this.lastID);
        }
      },
    );
  });
}

/**
 * @swagger
 * /api/buyer/purchase:
 *   post:
 *     summary: Purchase a beat with a specific license
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - beat_id
 *               - license_id
 *             properties:
 *               beat_id:
 *                 type: integer
 *                 example: 1
 *               license_id:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Purchase successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 purchase_id:
 *                   type: integer
 *                 beat_id:
 *                   type: integer
 *                 license:
 *                   type: object
 *                 hold_until_date:
 *                   type: string
 *       400:
 *         description: Invalid request or beat not available
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Buyer access only
 *       500:
 *         description: Purchase failed
 */
router.post("/purchase", authenticateToken, requireBuyer, async (req, res) => {
  const { beat_id, license_id, payment_method_id, use_wallet } = req.body;
  const buyerId = req.user.id;
  const db = getDB();

  if (!beat_id || !license_id) {
    return res
      .status(400)
      .json({ error: "Missing required fields: beat_id, license_id" });
  }

  try {
    // ✅ STEP 0: Get buyer's wallet balance
    const walletBalance = await getWalletBalance(buyerId);

    // ✅ STEP 0.5: Validate payment method (required if wallet doesn't cover full amount)
    if (!payment_method_id && walletBalance === 0) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    if (payment_method_id) {
      const paymentMethod = await new Promise((resolve, reject) => {
        db.get(
          `SELECT id FROM payment_methods WHERE id = ? AND user_id = ?`,
          [payment_method_id, buyerId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          },
        );
      });

      if (!paymentMethod) {
        return res.status(400).json({ error: "Invalid payment method" });
      }
    }

    // ✅ STEP 1: Check if buyer already owns this beat with this license
    db.get(
      `SELECT id FROM purchases 
       WHERE buyer_id = ? AND beat_id = ? AND license_id = ?`,
      [buyerId, beat_id, license_id],
      (err, duplicate) => {
        if (duplicate) {
          return res.status(400).json({
            error:
              "You already own this beat with this license. Consider upgrading to a higher license instead.",
          });
        }

        // ✅ STEP 2: Check if beat is exclusively sold
        db.get(
          `SELECT p.id, l.name 
           FROM purchases p
           JOIN beat_licenses bl ON p.license_id = bl.license_id AND p.beat_id = bl.beat_id
           JOIN licenses l ON bl.license_id = l.id
           WHERE p.beat_id = ? AND l.name = 'Exclusive'`,
          [beat_id],
          (err2, exclusiveSale) => {
            if (exclusiveSale) {
              return res.status(400).json({
                error:
                  "This beat has been exclusively licensed and is no longer available for purchase.",
              });
            }

            // ✅ STEP 3: Validate beat availability
            db.get(
              `SELECT id, producer_id, status, is_active
               FROM beats
               WHERE id = ?`,
              [beat_id],
              (err3, beat) => {
                if (err3)
                  return res
                    .status(500)
                    .json({ error: "Database error (beat)" });
                if (
                  !beat ||
                  beat.status !== "enabled" ||
                  beat.is_active !== 1
                ) {
                  return res
                    .status(400)
                    .json({ error: "Beat not available for purchase" });
                }

                // ✅ STEP 4: Get license details
                db.get(
                  `SELECT bl.price, l.id AS license_id, l.name, l.usage_rights
                   FROM beat_licenses bl
                   JOIN licenses l ON bl.license_id = l.id
                   WHERE bl.beat_id = ? AND bl.license_id = ?`,
                  [beat_id, license_id],
                  async (err4, license) => {
                    if (err4)
                      return res
                        .status(500)
                        .json({ error: "Database error (license)" });
                    if (!license)
                      return res
                        .status(400)
                        .json({ error: "Invalid license for this beat" });

                    const price = license.price;
                    const commission = price * COMMISSION_RATE;
                    const seller_earnings = price - commission;

                    // ✅ STEP 4.5: Calculate payment split (wallet + card)
                    const walletAmount = use_wallet
                      ? Math.min(walletBalance, price)
                      : 0;
                    const cardAmount = price - walletAmount;

                    console.log(
                      `💳 Payment breakdown: Total=$${price}, Wallet=$${walletAmount}, Card=$${cardAmount}`,
                    );

                    // ✅ STEP 5: Deduct from wallet if using wallet balance
                    const processPayment = async () => {
                      if (walletAmount > 0) {
                        try {
                          await debitWallet(
                            buyerId,
                            walletAmount,
                            `Purchase: ${license.name} for beat #${beat_id}`,
                            "purchase",
                            null, // Will be updated with purchase_id after creation
                          );
                          console.log(
                            `✅ Deducted $${walletAmount} from wallet`,
                          );
                        } catch (walletErr) {
                          throw new Error(
                            `Wallet deduction failed: ${walletErr.message}`,
                          );
                        }
                      }

                      // TODO: Process card payment for cardAmount (mock for now)
                      if (cardAmount > 0) {
                        console.log(
                          `✅ Processed card payment: $${cardAmount}`,
                        );
                      }
                    };

                    // Process payment first
                    processPayment()
                      .then(() => {
                        // ✅ STEP 6: Create purchase record
                        db.run(
                          `INSERT INTO purchases (
                              buyer_id, beat_id, license_id, price, commission,
                              seller_earnings, payout_status, withdrawal_id,
                              hold_until
                            )
                            VALUES (?, ?, ?, ?, ?, ?, 'unpaid', NULL, DATETIME('now', '+' || ? || ' days'))`,
                          [
                            buyerId,
                            beat_id,
                            license.license_id,
                            price,
                            commission,
                            seller_earnings,
                            HOLD_DAYS,
                          ],
                          function (err5) {
                            if (err5) {
                              return res.status(500).json({
                                error: "Failed to create purchase",
                                details: err5.message,
                              });
                            }

                            const purchaseId = this.lastID;

                            // ✅ STEP 7: If exclusive license, disable beat
                            if (license.name === "Exclusive") {
                              db.run(
                                `UPDATE beats 
                                   SET status = 'disabled', is_active = 0 
                                   WHERE id = ?`,
                                [beat_id],
                                (err6) => {
                                  if (err6) {
                                    console.error(
                                      "Failed to disable beat after exclusive purchase:",
                                      err6.message,
                                    );
                                  } else {
                                    console.log(
                                      `✅ Beat ${beat_id} disabled after exclusive purchase`,
                                    );
                                  }
                                },
                              );
                            }

                            res.status(201).json({
                              message: "Purchase successful",
                              purchase_id: purchaseId,
                              beat_id,
                              license: {
                                name: license.name,
                                price: license.price,
                                usage_rights: license.usage_rights,
                                exclusive: license.name === "Exclusive",
                              },
                              payment_breakdown: {
                                total: price,
                                wallet_used: walletAmount,
                                card_charged: cardAmount,
                              },
                              hold_until_date: `${HOLD_DAYS} days from now`,
                            });
                          },
                        );
                      })
                      .catch((paymentErr) => {
                        return res.status(500).json({
                          error: "Payment processing failed",
                          details: paymentErr.message,
                        });
                      });
                  },
                );
              },
            );
          },
        );
      },
    );
  } catch (error) {
    console.error("[PURCHASE ERROR]:", error);
    return res.status(500).json({
      error: "Purchase failed",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/buyer/purchases:
 *   get:
 *     summary: Get all purchases for logged-in buyer
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of buyer's purchases
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   purchase_id:
 *                     type: integer
 *                   paid_price:
 *                     type: number
 *                   commission:
 *                     type: number
 *                   seller_earnings:
 *                     type: number
 *                   payout_status:
 *                     type: string
 *                   purchased_at:
 *                     type: string
 *                   refund_status:
 *                     type: string
 *                   beat_id:
 *                     type: integer
 *                   beat_title:
 *                     type: string
 *                   genre:
 *                     type: string
 *                   license_name:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Buyer access only
 *       500:
 *         description: Database error
 */
router.get("/purchases", authenticateToken, requireBuyer, (req, res) => {
  const buyerId = req.user.id;
  const db = getDB();

  const query = `
    SELECT
      p.id AS purchase_id,
      p.price AS paid_price,
      p.commission,
      p.seller_earnings,
      p.payout_status,
      p.purchased_at,
      p.refund_status,
      p.refunded_at,
      b.id AS beat_id,
      b.title AS beat_title,
      b.genre,
      b.tempo,
      b.duration,
      b.preview_url,
      b.full_url,
      b.cover_art_url,
      b.key,
      b.bpm,
      b.tags,
      p.license_id,
      l.name AS license_name,
      l.usage_rights,
      l.description AS license_description
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    LEFT JOIN licenses l ON p.license_id = l.id
    WHERE p.buyer_id = ?
    ORDER BY p.purchased_at DESC
  `;

  db.all(query, [buyerId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/buyer/beats/{id}/download:
 *   get:
 *     summary: Download purchased beat (full version)
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     responses:
 *       200:
 *         description: File download initiated
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Access denied - purchase required
 *       404:
 *         description: Beat or file not found
 *       500:
 *         description: Server error
 */
router.get("/beats/:id/download", authenticateToken, (req, res) => {
  const beatId = req.params.id;
  const userId = req.user.id;
  const db = getDB();

  // 1️⃣ Verify purchase
  db.get(
    `SELECT * FROM purchases WHERE buyer_id = ? AND beat_id = ?`,
    [userId, beatId],
    (err, purchase) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!purchase) return res.status(403).json({ error: "Access denied" });

      // 2️⃣ Get beat info
      db.get(
        `SELECT full_url FROM beats WHERE id = ?`,
        [beatId],
        (err, beat) => {
          if (err) return res.status(500).json({ error: "Database error" });
          if (!beat) return res.status(404).json({ error: "Beat not found" });

          // 3️⃣ Absolute audio path
          const audioPath = path.join(__dirname, "../../audio", beat.full_url);

          if (!fs.existsSync(audioPath)) {
            return res.status(404).json({ error: "Audio file not found" });
          }

          // 4️⃣ FORCE DOWNLOAD
          res.download(audioPath, beat.full_url);
        },
      );
    },
  );
});

/**
 * @swagger
 * /api/buyer/beats/{id}/secure-url:
 *   get:
 *     summary: Generate secure download URL with temporary token
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     responses:
 *       200:
 *         description: Secure download URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 downloadUrl:
 *                   type: string
 *                   example: /api/beats/1/download?token=xyz123
 *                 expiresIn:
 *                   type: string
 *                   example: 5 minutes
 *       403:
 *         description: Purchase required
 *       500:
 *         description: Server error
 */
router.get("/beats/:id/secure-url", authenticateToken, (req, res) => {
  const beatId = req.params.id;
  const userId = req.user.id;
  const db = getDB();

  db.get(
    `SELECT 1 FROM purchases WHERE buyer_id = ? AND beat_id = ?`,
    [userId, beatId],
    (err, purchase) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!purchase)
        return res
          .status(403)
          .json({ error: "You have not purchased this beat" });

      const token = generateDownloadToken(userId, beatId);

      res.json({
        downloadUrl: `/api/beats/${beatId}/download?token=${token}`,
        expiresIn: "5 minutes",
      });
    },
  );
});

/**
 * @swagger
 * /api/buyer/purchases/{id}/dispute:
 *   post:
 *     summary: Lodge a dispute for a purchase
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Purchase ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Downloaded file is corrupted
 *     responses:
 *       200:
 *         description: Dispute lodged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 purchase_id:
 *                   type: integer
 *                 flag_reason:
 *                   type: string
 *       400:
 *         description: Already disputed or cannot dispute
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Buyer access only
 *       404:
 *         description: Purchase not found
 */
router.post(
  "/purchases/:id/dispute",
  authenticateToken,
  requireBuyer,
  (req, res) => {
    const purchaseId = Number(req.params.id);
    const buyerId = Number(req.user.id);
    const { reason } = req.body;
    const db = getDB();

    if (!reason) {
      return res.status(400).json({ error: "Dispute reason is required" });
    }

    db.get(
      `SELECT p.id, p.refund_status, p.withdrawal_id, b.id AS beat_id, b.title AS beat_title, b.producer_id
     FROM purchases p
     JOIN beats b ON b.id = p.beat_id
     WHERE p.id = ? AND p.buyer_id = ?`,
      [purchaseId, buyerId],
      (err, purchase) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!purchase)
          return res
            .status(404)
            .json({ error: "Purchase not found for this buyer" });

        if (purchase.refund_status === "disputed") {
          return res
            .status(400)
            .json({ error: "Purchase is already disputed" });
        }

        if (purchase.refund_status === "refunded") {
          return res
            .status(400)
            .json({ error: "Refunded purchase cannot be disputed" });
        }

        if (purchase.withdrawal_id !== null) {
          return res.status(400).json({
            error: "Cannot dispute a purchase that has already been withdrawn",
          });
        }

        // Create dispute record and flag purchase
        db.run(
          `INSERT INTO disputes (purchase_id, raised_by, reason, status)
           VALUES (?, ?, ?, 'open')`,
          [purchaseId, buyerId, reason],
          async function (err2) {
            if (err2) {
              console.error("DISPUTE INSERT ERROR:", err2.message);
              return res
                .status(500)
                .json({ error: "Failed to create dispute" });
            }

            const disputeId = this.lastID;

            // Update purchase refund status
            db.run(
              `UPDATE purchases SET refund_status = 'disputed', flag_reason = ? WHERE id = ?`,
              [reason, purchaseId],
              async (err3) => {
                if (err3) {
                  console.error("PURCHASE UPDATE ERROR:", err3.message);
                  return res
                    .status(500)
                    .json({ error: "Failed to update purchase" });
                }

                // Notify all admins AND the producer
                try {
                  const admins = await new Promise((resolve, reject) => {
                    db.all(
                      `SELECT id FROM users WHERE role = 'admin'`,
                      [],
                      (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                      },
                    );
                  });

                  // Notify admins
                  for (const admin of admins) {
                    await createNotification(
                      admin.id,
                      "dispute_filed",
                      "New Dispute Filed",
                      `Buyer filed dispute for purchase #${purchaseId} (${purchase.beat_title}). Reason: ${reason}`,
                      disputeId,
                      "dispute",
                    );
                  }

                  // Notify producer
                  await createNotification(
                    purchase.producer_id,
                    "dispute_filed",
                    "Dispute Filed on Your Beat",
                    `A buyer filed a dispute for your beat "${purchase.beat_title}" (Purchase #${purchaseId}). An admin will review it.`,
                    disputeId,
                    "dispute",
                  );
                } catch (notifErr) {
                  console.error("Notification failed:", notifErr.message);
                  // Don't fail the request
                }

                res.json({
                  message:
                    "Dispute filed successfully. Admin and producer notified.",
                  dispute_id: disputeId,
                  purchase_id: purchaseId,
                  status: "open",
                });
              },
            );
          },
        );
      },
    );
  },
);

/**
 * @swagger
 * /api/buyer/notifications:
 *   get:
 *     summary: Get buyer's notifications
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of buyer's notifications
 *       401:
 *         description: Unauthorized
 */
router.get("/notifications", authenticateToken, requireBuyer, (req, res) => {
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
 * /api/buyer/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Buyer]
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
  requireBuyer,
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
 * /api/buyer/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch(
  "/notifications/read-all",
  authenticateToken,
  requireBuyer,
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
