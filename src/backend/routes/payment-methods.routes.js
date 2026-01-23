import express from "express";
import { getDB } from "../db/index.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireBuyer } from "../middleware/role.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/buyer/payment-methods:
 *   get:
 *     summary: Get all saved payment methods for buyer
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of saved payment methods
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   provider:
 *                     type: string
 *                     enum: [stripe, paypal, credit_card]
 *                   reference_id:
 *                     type: string
 *                   is_default:
 *                     type: boolean
 *                   created_at:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Buyer access only
 */
router.get("/", authenticateToken, requireBuyer, (req, res) => {
  const userId = req.user.id;
  const db = getDB();

  db.all(
    `SELECT id, provider, reference_id, last_four, cardholder_name, is_default, created_at
     FROM payment_methods
     WHERE user_id = ?
     ORDER BY is_default DESC, created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows || []);
    },
  );
});

/**
 * @swagger
 * /api/buyer/payment-methods:
 *   post:
 *     summary: Save a new payment method
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
 *               - provider
 *               - reference_id
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [stripe, paypal, credit_card]
 *                 example: stripe
 *               reference_id:
 *                 type: string
 *                 description: Payment provider's token/ID
 *                 example: pm_1234567890
 *               is_default:
 *                 type: boolean
 *                 description: Set as default payment method
 *                 example: false
 *     responses:
 *       201:
 *         description: Payment method saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 provider:
 *                   type: string
 *                 is_default:
 *                   type: boolean
 *                 created_at:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Buyer access only
 */
router.post("/", authenticateToken, requireBuyer, (req, res) => {
  const userId = req.user.id;
  const { provider, reference_id, is_default, card_number, cardholder_name } =
    req.body;
  const db = getDB();

  if (!provider || !reference_id) {
    return res
      .status(400)
      .json({ error: "Provider and reference_id are required" });
  }

  const validProviders = ["stripe", "paypal", "credit_card"];
  if (!validProviders.includes(provider)) {
    return res.status(400).json({
      error: `Invalid provider. Must be one of: ${validProviders.join(", ")}`,
    });
  }

  // Extract last 4 digits if card_number provided (for display only)
  const lastFour = card_number ? card_number.slice(-4) : null;

  const setDefault = is_default === true ? 1 : 0;

  // If setting as default, unset other defaults
  if (setDefault) {
    db.run(
      `UPDATE payment_methods SET is_default = 0 WHERE user_id = ?`,
      [userId],
      (err) => {
        if (err) console.error("Error updating defaults:", err);
      },
    );
  }

  db.run(
    `INSERT INTO payment_methods (user_id, provider, reference_id, last_four, cardholder_name, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      userId,
      provider,
      reference_id,
      lastFour,
      cardholder_name || null,
      setDefault,
    ],
    function (err) {
      if (err) {
        console.error("Payment method save error:", err);
        return res.status(500).json({ error: "Failed to save payment method" });
      }

      res.status(201).json({
        id: this.lastID,
        provider,
        reference_id: reference_id.substring(0, 10) + "****", // Mask sensitive data
        last_four: lastFour,
        cardholder_name: cardholder_name || null,
        is_default: !!setDefault,
        created_at: new Date().toISOString(),
      });
    },
  );
});

/**
 * @swagger
 * /api/buyer/payment-methods/{id}:
 *   delete:
 *     summary: Delete a saved payment method
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Payment method deleted
 *       403:
 *         description: Cannot delete only payment method
 *       404:
 *         description: Payment method not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", authenticateToken, requireBuyer, (req, res) => {
  const userId = req.user.id;
  const methodId = req.params.id;
  const db = getDB();

  // Check if this is the only payment method
  db.get(
    `SELECT COUNT(*) as count FROM payment_methods WHERE user_id = ?`,
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (result.count <= 1) {
        return res.status(403).json({
          error: "Cannot delete your only payment method. Add another first.",
        });
      }

      // Delete the payment method
      db.run(
        `DELETE FROM payment_methods WHERE id = ? AND user_id = ?`,
        [methodId, userId],
        function (err) {
          if (err) return res.status(500).json({ error: "Database error" });
          if (this.changes === 0)
            return res.status(404).json({ error: "Payment method not found" });

          res.json({ message: "Payment method deleted" });
        },
      );
    },
  );
});

/**
 * @swagger
 * /api/buyer/payment-methods/{id}/default:
 *   patch:
 *     summary: Set payment method as default
 *     tags: [Buyer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment method ID
 *     responses:
 *       200:
 *         description: Default payment method updated
 *       404:
 *         description: Payment method not found
 *       401:
 *         description: Unauthorized
 */
router.patch("/:id/default", authenticateToken, requireBuyer, (req, res) => {
  const userId = req.user.id;
  const methodId = req.params.id;
  const db = getDB();

  // First, unset all other defaults
  db.run(
    `UPDATE payment_methods SET is_default = 0 WHERE user_id = ?`,
    [userId],
    (err) => {
      if (err) {
        console.error("Error updating defaults:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // Set this method as default
      db.run(
        `UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?`,
        [methodId, userId],
        function (err) {
          if (err) return res.status(500).json({ error: "Database error" });
          if (this.changes === 0)
            return res.status(404).json({ error: "Payment method not found" });

          res.json({ message: "Default payment method updated" });
        },
      );
    },
  );
});

export default router;
