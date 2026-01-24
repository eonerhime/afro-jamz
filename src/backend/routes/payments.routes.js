import express from "express";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireBuyer } from "../middleware/role.middleware.js";
import {
  processPayment,
  refundPayment,
} from "../services/payment-gateway.service.js";
import { creditWallet } from "../services/wallet.service.js";

const router = express.Router();

/**
 * @swagger
 * /api/payments/add-funds:
 *   post:
 *     summary: Add funds to wallet via payment gateway
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - payment_method_id
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 100
 *                 description: Amount to add in the specified currency
 *               currency:
 *                 type: string
 *                 example: NGN
 *                 description: Currency code
 *               payment_method_id:
 *                 type: string
 *                 example: pm_123456
 *                 description: Payment method ID from gateway
 *               gateway:
 *                 type: string
 *                 example: paystack
 *                 description: Preferred payment gateway (optional)
 *     responses:
 *       201:
 *         description: Funds added successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Payment failed
 */
router.post("/add-funds", authenticateToken, async (req, res) => {
  const { amount, currency, payment_method_id, gateway } = req.body;
  const userId = req.user.id;

  if (!amount || !currency || !payment_method_id) {
    return res.status(400).json({
      error: "Missing required fields: amount, currency, payment_method_id",
    });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "Amount must be greater than 0" });
  }

  try {
    // Process payment through gateway
    const paymentResult = await processPayment({
      amount,
      currency,
      paymentMethodId: payment_method_id,
      description: `Add funds to wallet - User ${userId}`,
      preferredGateway: gateway,
    });

    if (!paymentResult.success) {
      return res.status(500).json({
        error: "Payment failed",
        details: paymentResult,
      });
    }

    // Add funds to wallet (in original currency, will be converted to USD)
    const walletResult = await creditWallet(
      userId,
      amount,
      `Wallet top-up via ${paymentResult.gateway}`,
      "payment",
      null,
      currency,
    );

    res.status(201).json({
      message: "Funds added successfully",
      transaction: {
        id: walletResult.transactionId,
        amount: amount,
        currency: currency,
        usdAmount: paymentResult.usdAmount,
        gateway: paymentResult.gateway,
        transactionId: paymentResult.transactionId,
        previousBalance: walletResult.previousBalance,
        newBalance: walletResult.newBalance,
      },
    });
  } catch (error) {
    console.error("[PAYMENT ERROR]:", error);
    res.status(500).json({
      error: "Payment processing failed",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/payments/process:
 *   post:
 *     summary: Process a one-time payment (for purchases not using wallet)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - payment_method_id
 *               - description
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               payment_method_id:
 *                 type: string
 *               description:
 *                 type: string
 *               gateway:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment processed successfully
 */
router.post("/process", authenticateToken, requireBuyer, async (req, res) => {
  const { amount, currency, payment_method_id, description, gateway } =
    req.body;

  if (!amount || !currency || !payment_method_id || !description) {
    return res.status(400).json({
      error:
        "Missing required fields: amount, currency, payment_method_id, description",
    });
  }

  try {
    const paymentResult = await processPayment({
      amount,
      currency,
      paymentMethodId: payment_method_id,
      description,
      preferredGateway: gateway,
    });

    if (!paymentResult.success) {
      return res.status(500).json({
        error: "Payment failed",
        details: paymentResult,
      });
    }

    res.json({
      success: true,
      payment: paymentResult,
    });
  } catch (error) {
    console.error("[PAYMENT ERROR]:", error);
    res.status(500).json({
      error: "Payment processing failed",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /api/payments/refund:
 *   post:
 *     summary: Refund a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transaction_id
 *               - amount
 *               - currency
 *               - gateway
 *             properties:
 *               transaction_id:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               gateway:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund processed successfully
 */
router.post("/refund", authenticateToken, async (req, res) => {
  const { transaction_id, amount, currency, gateway } = req.body;

  if (!transaction_id || !amount || !currency || !gateway) {
    return res.status(400).json({
      error:
        "Missing required fields: transaction_id, amount, currency, gateway",
    });
  }

  try {
    const refundResult = await refundPayment({
      transactionId: transaction_id,
      amount,
      currency,
      gateway,
    });

    res.json({
      success: true,
      refund: refundResult,
    });
  } catch (error) {
    console.error("[REFUND ERROR]:", error);
    res.status(500).json({
      error: "Refund processing failed",
      details: error.message,
    });
  }
});

export default router;
