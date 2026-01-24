import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
  getWalletBalance,
  getWalletTransactions,
  getWalletBalanceInCurrency,
} from "../services/wallet.service.js";

const router = express.Router();

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Get user's wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *           default: USD
 *         description: Currency to display balance in
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 */
router.get("/balance", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const currency = req.query.currency || "USD";

  try {
    if (currency === "USD") {
      const balance = await getWalletBalance(userId);
      res.json({
        user_id: userId,
        wallet_balance: balance,
        currency: "USD",
      });
    } else {
      const balanceInfo = await getWalletBalanceInCurrency(userId, currency);
      res.json({
        user_id: userId,
        wallet_balance: balanceInfo.balance,
        currency: balanceInfo.currency,
        usd_balance: balanceInfo.usdBalance,
      });
    }
  } catch (error) {
    console.error("[WALLET BALANCE ERROR]:", error);
    res.status(500).json({
      error: "Failed to retrieve wallet balance",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get user's wallet transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of transactions to retrieve
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 */
router.get("/transactions", authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const transactions = await getWalletTransactions(userId, limit);

    res.json({
      user_id: userId,
      transaction_count: transactions.length,
      transactions: transactions,
    });
  } catch (error) {
    console.error("[WALLET TRANSACTIONS ERROR]:", error);
    res.status(500).json({
      error: "Failed to retrieve wallet transactions",
      details: error.message,
    });
  }
});

export default router;
