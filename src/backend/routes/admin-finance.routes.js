import express from "express";
import { getDB } from "../db/index.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/role.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/admin/finance/summary:
 *   get:
 *     summary: Get platform financial summary
 *     tags: [Admin Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial summary retrieved successfully
 */
router.get("/finance/summary", authenticateToken, requireAdmin, (req, res) => {
  const db = getDB();

  const summaryQuery = `
    SELECT 
      -- Revenue
      COALESCE(SUM(price), 0) as total_revenue,
      COALESCE(SUM(commission), 0) as total_commission_earned,
      COALESCE(SUM(seller_earnings), 0) as total_paid_to_producers,
      
      -- Sales breakdown
      COUNT(*) as total_sales,
      COUNT(CASE WHEN refund_status = 'none' THEN 1 END) as successful_sales,
      COUNT(CASE WHEN refund_status = 'disputed' THEN 1 END) as disputed_sales,
      COUNT(CASE WHEN refund_status = 'refunded' THEN 1 END) as refunded_sales,
      
      -- Commission breakdown
      COALESCE(SUM(CASE WHEN refund_status = 'none' THEN commission ELSE 0 END), 0) as available_commission,
      COALESCE(SUM(CASE WHEN refund_status = 'disputed' THEN commission ELSE 0 END), 0) as held_commission,
      COALESCE(SUM(CASE WHEN refund_status = 'refunded' THEN commission ELSE 0 END), 0) as lost_commission,
      
      -- Payout status
      COUNT(CASE WHEN payout_status = 'paid' THEN 1 END) as paid_out_count,
      COUNT(CASE WHEN payout_status = 'unpaid' THEN 1 END) as pending_payout_count,
      COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN seller_earnings ELSE 0 END), 0) as total_paid_out,
      COALESCE(SUM(CASE WHEN payout_status = 'unpaid' AND refund_status = 'none' THEN seller_earnings ELSE 0 END), 0) as pending_payouts
    FROM purchases
  `;

  const topProducersQuery = `
    SELECT 
      u.id,
      u.username,
      u.email,
      COUNT(p.id) as total_sales,
      COALESCE(SUM(p.price), 0) as total_revenue,
      COALESCE(SUM(p.commission), 0) as commission_generated,
      COALESCE(SUM(p.seller_earnings), 0) as earnings_paid
    FROM users u
    JOIN beats b ON u.id = b.producer_id
    JOIN purchases p ON b.id = p.beat_id
    WHERE u.role = 'producer' AND p.refund_status = 'none'
    GROUP BY u.id
    ORDER BY commission_generated DESC
    LIMIT 10
  `;

  const recentTransactionsQuery = `
    SELECT 
      p.id as purchase_id,
      p.price,
      p.commission,
      p.seller_earnings,
      p.purchased_at,
      p.refund_status,
      p.payout_status,
      b.title as beat_title,
      producer.username as producer_username,
      buyer.username as buyer_username
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    JOIN users producer ON b.producer_id = producer.id
    JOIN users buyer ON p.buyer_id = buyer.id
    ORDER BY p.purchased_at DESC
    LIMIT 20
  `;

  db.get(summaryQuery, [], (err, summary) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Database error", details: err.message });

    db.all(topProducersQuery, [], (err, topProducers) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });

      db.all(recentTransactionsQuery, [], (err, recentTransactions) => {
        if (err)
          return res
            .status(500)
            .json({ error: "Database error", details: err.message });

        res.json({
          summary: {
            revenue: {
              total: summary.total_revenue || 0,
              successful:
                summary.available_commission +
                  summary.total_paid_to_producers || 0,
            },
            commission: {
              total_earned: summary.total_commission_earned || 0,
              available: summary.available_commission || 0,
              held_in_disputes: summary.held_commission || 0,
              lost_to_refunds: summary.lost_commission || 0,
            },
            sales: {
              total: summary.total_sales || 0,
              successful: summary.successful_sales || 0,
              disputed: summary.disputed_sales || 0,
              refunded: summary.refunded_sales || 0,
            },
            payouts: {
              paid_out_count: summary.paid_out_count || 0,
              pending_count: summary.pending_payout_count || 0,
              total_paid: summary.total_paid_out || 0,
              pending_amount: summary.pending_payouts || 0,
            },
          },
          top_producers: topProducers,
          recent_transactions: recentTransactions,
        });
      });
    });
  });
});

/**
 * @swagger
 * /api/admin/finance/commissions:
 *   get:
 *     summary: Get detailed commission breakdown
 *     tags: [Admin Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, year, all]
 *         description: Time period for commission data
 *     responses:
 *       200:
 *         description: Commission data retrieved successfully
 */
router.get(
  "/finance/commissions",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { period = "all" } = req.query;
    const db = getDB();

    let dateFilter = "";
    switch (period) {
      case "today":
        dateFilter = "AND DATE(p.purchased_at) = DATE('now')";
        break;
      case "week":
        dateFilter = "AND p.purchased_at >= DATE('now', '-7 days')";
        break;
      case "month":
        dateFilter = "AND p.purchased_at >= DATE('now', '-30 days')";
        break;
      case "year":
        dateFilter = "AND p.purchased_at >= DATE('now', '-1 year')";
        break;
      default:
        dateFilter = "";
    }

    const query = `
    SELECT 
      p.id,
      p.price,
      p.commission,
      p.seller_earnings,
      p.purchased_at,
      p.refund_status,
      p.payout_status,
      b.id as beat_id,
      b.title as beat_title,
      l.name as license_name,
      producer.username as producer_username,
      buyer.username as buyer_username
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    JOIN licenses l ON p.license_id = l.id
    JOIN users producer ON b.producer_id = producer.id
    JOIN users buyer ON p.buyer_id = buyer.id
    WHERE 1=1 ${dateFilter}
    ORDER BY p.purchased_at DESC
  `;

    db.all(query, [], (err, commissions) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });

      const stats = commissions.reduce(
        (acc, c) => {
          acc.total += c.commission;
          if (c.refund_status === "none") acc.available += c.commission;
          if (c.refund_status === "disputed") acc.held += c.commission;
          if (c.refund_status === "refunded") acc.lost += c.commission;
          return acc;
        },
        { total: 0, available: 0, held: 0, lost: 0 },
      );

      res.json({
        period,
        stats,
        commission_count: commissions.length,
        commissions,
      });
    });
  },
);

/**
 * @swagger
 * /api/admin/finance/revenue-by-license:
 *   get:
 *     summary: Get revenue breakdown by license type
 *     tags: [Admin Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue breakdown retrieved successfully
 */
router.get(
  "/finance/revenue-by-license",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const db = getDB();

    const query = `
    SELECT 
      l.id as license_id,
      l.name as license_name,
      COUNT(p.id) as sales_count,
      COALESCE(SUM(p.price), 0) as total_revenue,
      COALESCE(SUM(p.commission), 0) as total_commission,
      COALESCE(SUM(p.seller_earnings), 0) as total_to_producers,
      COALESCE(AVG(p.price), 0) as average_price
    FROM licenses l
    LEFT JOIN purchases p ON l.id = p.license_id AND p.refund_status = 'none'
    GROUP BY l.id
    ORDER BY total_commission DESC
  `;

    db.all(query, [], (err, breakdown) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });

      res.json({
        license_breakdown: breakdown,
      });
    });
  },
);

/**
 * @swagger
 * /api/admin/finance/revenue-trend:
 *   get:
 *     summary: Get revenue trend over time
 *     tags: [Admin Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Grouping period
 *     responses:
 *       200:
 *         description: Revenue trend retrieved successfully
 */
router.get(
  "/finance/revenue-trend",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const { groupBy = "day" } = req.query;
    const db = getDB();

    let dateFormat;
    switch (groupBy) {
      case "week":
        dateFormat = "strftime('%Y-W%W', p.purchased_at)";
        break;
      case "month":
        dateFormat = "strftime('%Y-%m', p.purchased_at)";
        break;
      default:
        dateFormat = "DATE(p.purchased_at)";
    }

    const query = `
    SELECT 
      ${dateFormat} as period,
      COUNT(*) as sales_count,
      COALESCE(SUM(p.price), 0) as total_revenue,
      COALESCE(SUM(p.commission), 0) as total_commission,
      COALESCE(SUM(p.seller_earnings), 0) as total_to_producers
    FROM purchases p
    WHERE p.refund_status = 'none'
    GROUP BY period
    ORDER BY period DESC
    LIMIT 30
  `;

    db.all(query, [], (err, trend) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });

      res.json({
        grouping: groupBy,
        data_points: trend.length,
        trend: trend.reverse(), // Oldest to newest
      });
    });
  },
);

/**
 * @swagger
 * /api/admin/finance/withdrawable-balance:
 *   get:
 *     summary: Get platform's total withdrawable commission balance
 *     tags: [Admin Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Withdrawable balance retrieved successfully
 */
router.get(
  "/finance/withdrawable-balance",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const db = getDB();

    const query = `
    SELECT 
      COALESCE(SUM(CASE WHEN refund_status = 'none' THEN commission ELSE 0 END), 0) as available_balance,
      COALESCE(SUM(CASE WHEN refund_status = 'disputed' THEN commission ELSE 0 END), 0) as held_balance,
      COUNT(CASE WHEN refund_status = 'none' THEN 1 END) as successful_sales,
      COUNT(CASE WHEN refund_status = 'disputed' THEN 1 END) as disputed_sales
    FROM purchases
  `;

    db.get(query, [], (err, result) => {
      if (err)
        return res
          .status(500)
          .json({ error: "Database error", details: err.message });

      res.json({
        withdrawable_balance: result.available_balance || 0,
        held_in_disputes: result.held_balance || 0,
        total_balance:
          (result.available_balance || 0) + (result.held_balance || 0),
        successful_sales: result.successful_sales || 0,
        disputed_sales: result.disputed_sales || 0,
        note: "Available balance represents commission from completed, non-disputed sales that can be withdrawn",
      });
    });
  },
);

export default router;
