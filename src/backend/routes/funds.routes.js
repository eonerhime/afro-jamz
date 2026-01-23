import express from "express";
import { getDB } from "../db/index.js";
import { creditWallet } from "../services/wallet.service.js";

const router = express.Router();

/**
 * Auto-release funds from hold period to producer wallets
 * This endpoint should be called periodically (e.g., via cron job)
 * or can be triggered manually by admin
 */
router.post("/release-funds", async (req, res) => {
  const db = getDB();

  try {
    // Get all purchases past hold period that haven't been paid out
    const purchasesToRelease = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          id,
          beat_id,
          seller_earnings,
          purchased_at,
          hold_until
        FROM purchases
        WHERE payout_status = 'unpaid'
          AND refund_status = 'none'
          AND hold_until <= DATETIME('now')
        ORDER BY hold_until ASC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      );
    });

    if (purchasesToRelease.length === 0) {
      return res.json({
        message: "No funds to release",
        released_count: 0,
      });
    }

    console.log(
      `\n🔓 Releasing funds for ${purchasesToRelease.length} purchases...`,
    );

    const releasedPurchases = [];
    const errors = [];

    // Process each purchase
    for (const purchase of purchasesToRelease) {
      try {
        // Get beat details to find producer
        const beat = await new Promise((resolve, reject) => {
          db.get(
            `SELECT producer_id, title FROM beats WHERE id = ?`,
            [purchase.beat_id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            },
          );
        });

        if (!beat) {
          errors.push({
            purchase_id: purchase.id,
            error: "Beat not found",
          });
          continue;
        }

        // Credit producer's wallet
        const walletTx = await creditWallet(
          beat.producer_id,
          purchase.seller_earnings,
          `Earnings from beat sale: ${beat.title} (Purchase #${purchase.id})`,
          "purchase",
          purchase.id,
        );

        // Update purchase payout_status
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE purchases SET payout_status = 'paid' WHERE id = ?`,
            [purchase.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            },
          );
        });

        console.log(
          `✅ Released $${purchase.seller_earnings} to producer #${beat.producer_id} for purchase #${purchase.id}`,
        );

        releasedPurchases.push({
          purchase_id: purchase.id,
          producer_id: beat.producer_id,
          amount: purchase.seller_earnings,
          new_balance: walletTx.newBalance,
        });
      } catch (err) {
        console.error(
          `❌ Failed to release purchase #${purchase.id}:`,
          err.message,
        );
        errors.push({
          purchase_id: purchase.id,
          error: err.message,
        });
      }
    }

    res.json({
      message: `Released funds for ${releasedPurchases.length} purchases`,
      released_count: releasedPurchases.length,
      error_count: errors.length,
      released_purchases: releasedPurchases,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[AUTO-RELEASE ERROR]:", error);
    res.status(500).json({
      error: "Failed to release funds",
      details: error.message,
    });
  }
});

/**
 * Get summary of pending funds to be released
 */
router.get("/pending-releases", async (req, res) => {
  const db = getDB();

  try {
    const pending = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
          p.id AS purchase_id,
          p.seller_earnings,
          p.hold_until,
          b.title AS beat_title,
          b.producer_id,
          u.username AS producer_username
        FROM purchases p
        JOIN beats b ON p.beat_id = b.id
        JOIN users u ON b.producer_id = u.id
        WHERE p.payout_status = 'unpaid'
          AND p.refund_status = 'none'
          AND p.hold_until <= DATETIME('now')
        ORDER BY p.hold_until ASC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      );
    });

    const totalAmount = pending.reduce((sum, p) => sum + p.seller_earnings, 0);

    res.json({
      pending_count: pending.length,
      total_amount: totalAmount,
      pending_releases: pending,
    });
  } catch (error) {
    console.error("[PENDING RELEASES ERROR]:", error);
    res.status(500).json({
      error: "Failed to get pending releases",
      details: error.message,
    });
  }
});

export default router;
