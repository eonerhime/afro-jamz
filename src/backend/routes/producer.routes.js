import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getDB } from "../db/index.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireProducer } from "../middleware/role.middleware.js";
import { HOLD_DAYS } from "../config/config.js";
import { debitWallet, getWalletBalance } from "../services/wallet.service.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "Producer routes are working!" });
});

/**
 * @swagger
 * /api/producer/dashboard:
 *   get:
 *     summary: Get producer dashboard overview
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 */
router.get(
  "/dashboard",
  authenticateToken,
  requireProducer,
  async (req, res) => {
    const producerId = req.user.id;
    const db = getDB();

    try {
      // Get wallet balance
      const walletBalance = await getWalletBalance(producerId);

      // Get current time for balance calculation
      const now = new Date().toISOString();

      const dashboardQuery = `
      SELECT
        COUNT(DISTINCT p.id) as total_sales,
        COALESCE(SUM(CASE WHEN p.refund_status = 'none' THEN p.seller_earnings ELSE 0 END), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN p.hold_until > ? AND p.refund_status = 'none' AND p.payout_status = 'unpaid' THEN p.seller_earnings ELSE 0 END), 0) as pending_balance,
        COUNT(DISTINCT b.id) as total_beats,
        COUNT(DISTINCT CASE WHEN p.refund_status = 'disputed' THEN p.id END) as disputed_sales,
        COUNT(DISTINCT CASE WHEN p.refund_status = 'refunded' THEN p.id END) as refunded_sales
      FROM beats b
      LEFT JOIN purchases p ON b.id = p.beat_id
      WHERE b.producer_id = ?
    `;

      const recentSalesQuery = `
      SELECT
        p.id,
        p.price,
        p.seller_earnings,
        p.purchased_at,
        p.payout_status,
        p.refund_status,
        b.title as beat_title,
        l.name as license_name,
        u.username as buyer_username
      FROM purchases p
      JOIN beats b ON p.beat_id = b.id
      LEFT JOIN licenses l ON p.license_id = l.id
      LEFT JOIN users u ON p.buyer_id = u.id
      WHERE b.producer_id = ?
      ORDER BY p.purchased_at DESC
      LIMIT 5
    `;

      const topBeatsQuery = `
      SELECT
        b.id,
        b.title,
        b.cover_art_url,
        COUNT(p.id) as sales_count,
        COALESCE(SUM(p.seller_earnings), 0) as total_revenue
      FROM beats b
      LEFT JOIN purchases p ON b.id = p.beat_id AND p.refund_status = 'none'
      WHERE b.producer_id = ?
      GROUP BY b.id
      ORDER BY sales_count DESC, total_revenue DESC
      LIMIT 5
    `;

      db.get(dashboardQuery, [now, producerId], (err, stats) => {
        if (err) return res.status(500).json({ error: "Database error" });

        db.all(recentSalesQuery, [producerId], (err, recentSales) => {
          if (err) return res.status(500).json({ error: "Database error" });

          db.all(topBeatsQuery, [producerId], (err, topBeats) => {
            if (err) return res.status(500).json({ error: "Database error" });

            res.json({
              stats: {
                total_sales: stats.total_sales || 0,
                total_earnings: stats.total_earnings || 0,
                wallet_balance: walletBalance,
                pending_balance: stats.pending_balance || 0,
                total_beats: stats.total_beats || 0,
                disputed_sales: stats.disputed_sales || 0,
                refunded_sales: stats.refunded_sales || 0,
              },
              recent_sales: recentSales,
              top_beats: topBeats,
            });
          });
        });
      });
    } catch (error) {
      console.error("[DASHBOARD ERROR]:", error);
      return res.status(500).json({
        error: "Failed to load dashboard",
        details: error.message,
      });
    }
  },
);

/**
 * @swagger
 * /api/producer/sales:
 *   get:
 *     summary: Get all sales of producer's beats
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales list retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 */
router.get("/sales", authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;
  const db = getDB();

  const query = `
    SELECT
      p.id as purchase_id,
      p.beat_id,
      p.price,
      p.commission,
      p.seller_earnings,
      p.purchased_at,
      p.payout_status,
      p.hold_until,
      p.refund_status,
      b.title as beat_title,
      b.cover_art_url,
      l.name as license_name,
      l.usage_rights,
      u.username as buyer_username,
      u.email as buyer_email
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    LEFT JOIN licenses l ON p.license_id = l.id
    LEFT JOIN users u ON p.buyer_id = u.id
    WHERE b.producer_id = ?
    ORDER BY p.purchased_at DESC
  `;

  db.all(query, [producerId], (err, sales) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(sales);
  });
});

/**
 * @swagger
 * /api/producer/sales/summary:
 *   get:
 *     summary: Get aggregated sales summary
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales summary retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 */
router.get("/sales/summary", authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;
  const db = getDB();

  const summaryQuery = `
    SELECT
      COUNT(p.id) as total_sales,
      COALESCE(SUM(CASE WHEN p.refund_status = 'none' THEN p.price ELSE 0 END), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN p.refund_status = 'none' THEN p.commission ELSE 0 END), 0) as total_commission,
      COALESCE(SUM(CASE WHEN p.refund_status = 'none' THEN p.seller_earnings ELSE 0 END), 0) as total_earnings,
      COALESCE(AVG(CASE WHEN p.refund_status = 'none' THEN p.price END), 0) as average_sale_price,
      COUNT(CASE WHEN p.refund_status = 'disputed' THEN 1 END) as disputed_count,
      COUNT(CASE WHEN p.refund_status = 'refunded' THEN 1 END) as refunded_count,
      COALESCE(SUM(CASE WHEN p.refund_status = 'disputed' THEN p.seller_earnings ELSE 0 END), 0) as disputed_amount,
      COALESCE(SUM(CASE WHEN p.refund_status = 'refunded' THEN p.seller_earnings ELSE 0 END), 0) as refunded_amount
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    WHERE b.producer_id = ?
  `;

  const byBeatQuery = `
    SELECT
      b.id,
      b.title,
      COUNT(p.id) as sales_count,
      COALESCE(SUM(p.seller_earnings), 0) as revenue
    FROM beats b
    LEFT JOIN purchases p ON b.id = p.beat_id AND p.refund_status = 'none'
    WHERE b.producer_id = ?
    GROUP BY b.id
    ORDER BY revenue DESC
  `;

  const byLicenseQuery = `
    SELECT
      l.name as license_name,
      COUNT(p.id) as sales_count,
      COALESCE(SUM(p.seller_earnings), 0) as revenue
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    LEFT JOIN licenses l ON p.license_id = l.id
    WHERE b.producer_id = ? AND p.refund_status = 'none'
    GROUP BY l.id
    ORDER BY revenue DESC
  `;

  db.get(summaryQuery, [producerId], (err, summary) => {
    if (err) return res.status(500).json({ error: "Database error" });

    db.all(byBeatQuery, [producerId], (err, byBeat) => {
      if (err) return res.status(500).json({ error: "Database error" });

      db.all(byLicenseQuery, [producerId], (err, byLicense) => {
        if (err) return res.status(500).json({ error: "Database error" });

        res.json({
          summary: summary || {},
          by_beat: byBeat,
          by_license: byLicense,
        });
      });
    });
  });
});

/**
 * @swagger
 * /api/producer/withdrawals:
 *   get:
 *     summary: Get producer's withdrawal history
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Withdrawal history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 */
router.get("/withdrawals", authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;
  const db = getDB();

  const query = `
    SELECT
      id,
      amount,
      status,
      requested_at,
      processed_at
    FROM withdrawals
    WHERE producer_id = ?
    ORDER BY requested_at DESC
  `;

  db.all(query, [producerId], (err, withdrawals) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(withdrawals);
  });
});

/**
 * @swagger
 * /api/producer/withdrawals:
 *   post:
 *     summary: Request a withdrawal
 *     tags: [Producer]
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
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 500.00
 *     responses:
 *       201:
 *         description: Withdrawal request created successfully
 *       400:
 *         description: Invalid amount or insufficient balance
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 */
router.post(
  "/withdrawals",
  authenticateToken,
  requireProducer,
  async (req, res) => {
    const producerId = req.user.id;
    const { amount, paypal_email } = req.body;
    const db = getDB();

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    if (!paypal_email) {
      return res.status(400).json({ error: "PayPal email is required" });
    }

    try {
      // Get wallet balance
      const walletBalance = await getWalletBalance(producerId);

      if (amount > walletBalance) {
        return res.status(400).json({
          error: "Insufficient wallet balance",
          wallet_balance: walletBalance,
          requested_amount: amount,
        });
      }

      // Create withdrawal record first
      const withdrawalId = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO withdrawals (producer_id, amount, status, requested_at) 
         VALUES (?, ?, 'completed', CURRENT_TIMESTAMP)`,
          [producerId, amount],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          },
        );
      });

      // Deduct from wallet
      await debitWallet(
        producerId,
        amount,
        `Withdrawal to PayPal (${paypal_email})`,
        "withdrawal",
        withdrawalId,
      );

      // Mock PayPal payout (in production, this would call PayPal API)
      const mockPayPalResponse = {
        payout_id: `PAYOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: "SUCCESS",
        recipient_email: paypal_email,
        amount: amount,
        currency: "USD",
        time_processed: new Date().toISOString(),
      };

      console.log(`💸 Mock PayPal Payout:`, mockPayPalResponse);

      // Update withdrawal with processed timestamp
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE withdrawals SET processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [withdrawalId],
          (err) => {
            if (err) reject(err);
            else resolve();
          },
        );
      });

      // Notify admin of withdrawal
      await createNotification(
        1, // Admin user ID (assuming admin is user 1, adjust if needed)
        "withdrawal_processed",
        "Producer Withdrawal Processed",
        `Producer #${producerId} withdrew $${amount} to PayPal (${paypal_email})`,
        withdrawalId,
        "withdrawal",
      );

      res.status(201).json({
        message: "Withdrawal processed successfully",
        withdrawal_id: withdrawalId,
        amount: amount,
        status: "completed",
        paypal_payout_id: mockPayPalResponse.payout_id,
        processed_at: mockPayPalResponse.time_processed,
      });
    } catch (error) {
      console.error("[WITHDRAWAL ERROR]:", error);
      return res.status(500).json({
        error: "Withdrawal failed",
        details: error.message,
      });
    }
  },
);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../audio");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `beat-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [".mp3", ".wav", ".m4a", ".flac"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only MP3, WAV, M4A, and FLAC are allowed."),
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

/**
 * @swagger
 * /api/producer/beats:
 *   get:
 *     summary: Get producer's own beats
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Producer's beats
 */
router.get("/beats", authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;
  const db = getDB();

  db.all(
    `SELECT * FROM beats WHERE producer_id = ? ORDER BY created_at DESC`,
    [producerId],
    (err, beats) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (beats.length === 0) {
        return res.json({ beats: [] });
      }

      // Fetch licenses for each beat
      const beatIds = beats.map((b) => b.id);
      db.all(
        `SELECT bl.beat_id, bl.license_id, bl.price, l.name, l.description 
         FROM beat_licenses bl 
         JOIN licenses l ON bl.license_id = l.id 
         WHERE bl.beat_id IN (${beatIds.map(() => "?").join(",")})
         ORDER BY bl.license_id ASC`,
        beatIds,
        (err, licenses) => {
          if (err) {
            console.error("License fetch error:", err);
            return res.json({ beats }); // Return beats without licenses on error
          }

          // Group licenses by beat_id
          const licensesByBeat = licenses.reduce((acc, lic) => {
            if (!acc[lic.beat_id]) acc[lic.beat_id] = [];
            acc[lic.beat_id].push({
              license_id: lic.license_id,
              price: lic.price,
              name: lic.name,
              description: lic.description,
            });
            return acc;
          }, {});

          // Attach licenses to each beat
          const beatsWithLicenses = beats.map((beat) => ({
            ...beat,
            licenses: licensesByBeat[beat.id] || [],
          }));

          res.json({ beats: beatsWithLicenses });
        },
      );
    },
  );
});

// TODO: Switch to multipart file uploads in production

/**
 * @swagger
 * /api/producer/beats/upload:
 *   post:
 *     summary: Upload a new beat (currently accepts JSON with URLs for testing)
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - genre
 *               - tempo
 *               - duration
 *               - key
 *               - bpm
 *               - tags
 *               - fullUrl
 *             properties:
 *               title:
 *                 type: string
 *               genre:
 *                 type: string
 *               tempo:
 *                 type: integer
 *               duration:
 *                 type: string
 *               key:
 *                 type: string
 *               bpm:
 *                 type: integer
 *               tags:
 *                 type: string
 *               previewUrl:
 *                 type: string
 *               fullUrl:
 *                 type: string
 *               cover_art_url:
 *                 type: string
 *               licenses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     license_id:
 *                       type: integer
 *                     price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Beat created successfully
 *       400:
 *         description: Missing required fields
 */
router.post("/beats/upload", authenticateToken, requireProducer, (req, res) => {
  const {
    title,
    genre,
    tempo,
    duration,
    key,
    bpm,
    tags,
    previewUrl,
    fullUrl,
    cover_art_url,
    licenses,
  } = req.body;
  const producerId = req.user.id;
  const db = getDB();

  console.log("Beat upload request received:");
  console.log("Body:", req.body);

  // Validate required fields
  if (
    !title ||
    !genre ||
    !tempo ||
    !duration ||
    !key ||
    !bpm ||
    !tags ||
    !fullUrl
  ) {
    return res.status(400).json({
      error:
        "Missing required fields: title, genre, tempo, duration, key, bpm, tags, fullUrl",
    });
  }

  // Check for duplicate title from same producer
  db.get(
    `SELECT id FROM beats WHERE producer_id = ? AND LOWER(title) = LOWER(?)`,
    [producerId, title],
    (err, existing) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (existing) {
        return res.status(400).json({
          error:
            "You already have a beat with this title. Please use a different name.",
        });
      }

      // Insert beat into database
      db.run(
        `INSERT INTO beats (title, genre, tempo, bpm, key, duration, tags, cover_art_url, preview_url, full_url, producer_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          title,
          genre,
          tempo,
          bpm,
          key,
          duration,
          tags,
          cover_art_url || null,
          previewUrl || null,
          fullUrl,
          producerId,
        ],
        function (err) {
          if (err) {
            console.error("Database insert error:", err);
            return res
              .status(500)
              .json({ error: "Failed to save beat to database" });
          }

          const beatId = this.lastID;

          console.log("Beat created with ID:", beatId);
          console.log("Licenses to insert:", licenses);

          // If licenses are provided, insert them into beat_licenses table
          if (licenses && Array.isArray(licenses) && licenses.length > 0) {
            console.log("Inserting", licenses.length, "licenses");
            const licenseInserts = licenses.map(
              (lic) =>
                new Promise((resolve, reject) => {
                  console.log(
                    "Inserting license:",
                    lic.license_id,
                    "price:",
                    lic.price,
                  );
                  db.run(
                    `INSERT INTO beat_licenses (beat_id, license_id, price) VALUES (?, ?, ?)`,
                    [beatId, lic.license_id, lic.price],
                    (err) => {
                      if (err) {
                        console.error(
                          "License insert error for license",
                          lic.license_id,
                          ":",
                          err,
                        );
                        reject(err);
                      } else {
                        console.log(
                          "License",
                          lic.license_id,
                          "inserted successfully",
                        );
                        resolve();
                      }
                    },
                  );
                }),
            );

            Promise.all(licenseInserts)
              .then(() => {
                // Fetch the licenses with full details
                db.all(
                  `SELECT bl.license_id, bl.price, l.name, l.description 
                   FROM beat_licenses bl 
                   JOIN licenses l ON bl.license_id = l.id 
                   WHERE bl.beat_id = ?
                   ORDER BY bl.license_id ASC`,
                  [beatId],
                  (err, licenseDetails) => {
                    if (err) {
                      console.error("License fetch error:", err);
                      return res.status(201).json({
                        message:
                          "Beat created with licenses (unable to fetch details)",
                        beat: {
                          id: beatId,
                          title,
                          genre,
                          tempo,
                          bpm,
                          key,
                          duration,
                          tags,
                          cover_art_url,
                          preview_url: previewUrl,
                          full_url: fullUrl,
                          producer_id: producerId,
                        },
                      });
                    }

                    res.status(201).json({
                      message: "Beat created successfully with licenses",
                      beat: {
                        id: beatId,
                        title,
                        genre,
                        tempo,
                        bpm,
                        key,
                        duration,
                        tags,
                        cover_art_url,
                        preview_url: previewUrl,
                        full_url: fullUrl,
                        producer_id: producerId,
                        licenses: licenseDetails,
                      },
                    });
                  },
                );
              })
              .catch((err) => {
                console.error("License insert error:", err);
                res.status(500).json({
                  error: "Beat created but failed to add licenses",
                  beatId: beatId,
                });
              });
          } else {
            res.status(201).json({
              message: "Beat created successfully",
              beat: {
                id: beatId,
                title,
                genre,
                tempo,
                bpm,
                key,
                duration,
                tags,
                cover_art_url,
                preview_url: previewUrl,
                full_url: fullUrl,
                producer_id: producerId,
              },
            });
          }
        },
      );
    },
  );
});

/**
 * @swagger
 * /api/producer/beats/{id}:
 *   get:
 *     summary: Get single beat details (producer view)
 *     tags: [Producer]
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
 *         description: Beat details
 *       403:
 *         description: Not authorized to view this beat
 *       404:
 *         description: Beat not found
 */
router.get("/beats/:id", authenticateToken, requireProducer, (req, res) => {
  const beatId = req.params.id;
  const producerId = req.user.id;
  const db = getDB();

  db.get(
    `SELECT * FROM beats WHERE id = ? AND producer_id = ?`,
    [beatId, producerId],
    (err, beat) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!beat)
        return res
          .status(404)
          .json({ error: "Beat not found or not authorized" });

      // Fetch licenses for this beat
      db.all(
        `SELECT bl.license_id, bl.price, l.name, l.description, l.usage_rights
         FROM beat_licenses bl
         JOIN licenses l ON bl.license_id = l.id
         WHERE bl.beat_id = ?
         ORDER BY bl.license_id ASC`,
        [beatId],
        (err, licenses) => {
          if (err) {
            console.error("License fetch error:", err);
            return res.json(beat); // Return beat without licenses on error
          }

          res.json({
            ...beat,
            licenses: licenses || [],
          });
        },
      );
    },
  );
});

/**
 * @swagger
 * /api/producer/beats/{id}:
 *   put:
 *     summary: Update beat details
 *     tags: [Producer]
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
 *             properties:
 *               title:
 *                 type: string
 *               genre:
 *                 type: string
 *               tempo:
 *                 type: integer
 *               bpm:
 *                 type: integer
 *               key:
 *                 type: string
 *               duration:
 *                 type: string
 *               tags:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Beat updated successfully
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Beat not found
 */
router.put("/beats/:id", authenticateToken, requireProducer, (req, res) => {
  const beatId = req.params.id;
  const producerId = req.user.id;
  const {
    title,
    genre,
    tempo,
    bpm,
    key,
    duration,
    tags,
    description,
    cover_art_url,
    licenses,
  } = req.body;
  const db = getDB();

  // Verify ownership
  db.get(
    `SELECT id FROM beats WHERE id = ? AND producer_id = ?`,
    [beatId, producerId],
    (err, beat) => {
      if (err) return res.status(500).json({ error: "Database error" });
      if (!beat)
        return res
          .status(404)
          .json({ error: "Beat not found or not authorized" });

      // Build dynamic update query
      const updates = [];
      const values = [];

      if (title) {
        updates.push("title = ?");
        values.push(title);
      }
      if (genre) {
        updates.push("genre = ?");
        values.push(genre);
      }
      if (tempo) {
        updates.push("tempo = ?");
        values.push(tempo);
      }
      if (bpm) {
        updates.push("bpm = ?");
        values.push(bpm);
      }
      if (key) {
        updates.push("key = ?");
        values.push(key);
      }
      if (duration) {
        updates.push("duration = ?");
        values.push(duration);
      }
      if (tags) {
        updates.push("tags = ?");
        values.push(tags);
      }
      if (description) {
        updates.push("description = ?");
        values.push(description);
      }
      if (cover_art_url !== undefined) {
        updates.push("cover_art_url = ?");
        values.push(cover_art_url);
      }

      // Handle beat field updates
      const updateBeat = (callback) => {
        if (updates.length === 0) {
          return callback(null); // No beat fields to update, continue to licenses
        }

        values.push(beatId);
        db.run(
          `UPDATE beats SET ${updates.join(", ")} WHERE id = ?`,
          values,
          callback,
        );
      };

      // Handle license updates
      const updateLicenses = (callback) => {
        if (!licenses || !Array.isArray(licenses)) {
          return callback(null); // No licenses to update
        }

        // Delete existing licenses for this beat
        db.run(
          `DELETE FROM beat_licenses WHERE beat_id = ?`,
          [beatId],
          (err) => {
            if (err) return callback(err);

            if (licenses.length === 0) {
              return callback(null); // No licenses to insert
            }

            // Insert new licenses
            const licenseInserts = licenses.map(
              (lic) =>
                new Promise((resolve, reject) => {
                  db.run(
                    `INSERT INTO beat_licenses (beat_id, license_id, price) VALUES (?, ?, ?)`,
                    [beatId, lic.license_id, lic.price],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    },
                  );
                }),
            );

            Promise.all(licenseInserts)
              .then(() => callback(null))
              .catch(callback);
          },
        );
      };

      // Execute updates sequentially
      updateBeat((err) => {
        if (err) {
          console.error("UPDATE BEAT ERROR:", err.message);
          return res.status(500).json({ error: "Database error" });
        }

        updateLicenses((err) => {
          if (err) {
            console.error("UPDATE LICENSES ERROR:", err.message);
            return res.status(500).json({ error: "Failed to update licenses" });
          }

          // Check if anything was updated
          if (updates.length === 0 && (!licenses || !Array.isArray(licenses))) {
            return res.status(400).json({ error: "No fields to update" });
          }

          res.json({
            message: "Beat updated successfully",
            beatId: beatId,
          });
        });
      });
    },
  );
});

/**
 * @swagger
 * /api/producer/beats/{id}/status:
 *   patch:
 *     summary: Enable or disable a beat
 *     tags: [Producer]
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
 *                 enum: [enabled, disabled]
 *     responses:
 *       200:
 *         description: Beat status updated
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Beat not found
 */
router.patch(
  "/beats/:id/status",
  authenticateToken,
  requireProducer,
  (req, res) => {
    const beatId = req.params.id;
    const producerId = req.user.id;
    const { status } = req.body;
    const db = getDB();

    if (!status || !["enabled", "disabled"].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Status must be either "enabled" or "disabled"' });
    }

    // Verify ownership
    db.get(
      `SELECT id FROM beats WHERE id = ? AND producer_id = ?`,
      [beatId, producerId],
      (err, beat) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!beat)
          return res
            .status(404)
            .json({ error: "Beat not found or not authorized" });

        db.run(
          `UPDATE beats SET status = ? WHERE id = ?`,
          [status, beatId],
          function (err) {
            if (err) {
              console.error("UPDATE BEAT STATUS ERROR:", err.message);
              return res.status(500).json({ error: "Database error" });
            }

            res.json({
              message: `Beat ${status} successfully`,
              beatId: beatId,
              status: status,
            });
          },
        );
      },
    );
  },
);

/**
 * @swagger
 * /api/producer/disputes:
 *   get:
 *     summary: Get producer's disputes
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of disputes for producer's beats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 */
router.get("/disputes", authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;
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
      b.id as beat_id,
      b.title as beat_title,
      buyer.username as buyer_username,
      buyer.email as buyer_email
    FROM disputes d
    JOIN purchases p ON d.purchase_id = p.id
    JOIN beats b ON p.beat_id = b.id
    LEFT JOIN users buyer ON d.raised_by = buyer.id
    WHERE b.producer_id = ?
    ORDER BY d.created_at DESC
  `;

  db.all(query, [producerId], (err, disputes) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(disputes);
  });
});

/**
 * @swagger
 * /api/producer/disputes/{id}/respond:
 *   post:
 *     summary: Submit producer response to dispute
 *     tags: [Producer]
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
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *     responses:
 *       200:
 *         description: Response submitted successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Dispute not found
 */
router.post(
  "/disputes/:id/respond",
  authenticateToken,
  requireProducer,
  (req, res) => {
    const disputeId = req.params.id;
    const producerId = req.user.id;
    const { response } = req.body;
    const db = getDB();

    if (!response) {
      return res.status(400).json({ error: "Response is required" });
    }

    // Verify this dispute is for producer's beat
    db.get(
      `SELECT d.*, b.producer_id, b.title as beat_title
     FROM disputes d
     JOIN purchases p ON d.purchase_id = p.id
     JOIN beats b ON p.beat_id = b.id
     WHERE d.id = ?`,
      [disputeId],
      (err, dispute) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!dispute)
          return res.status(404).json({ error: "Dispute not found" });

        if (dispute.producer_id !== producerId) {
          return res
            .status(403)
            .json({ error: "Not authorized for this dispute" });
        }

        if (dispute.status === "rejected") {
          return res
            .status(400)
            .json({ error: "Cannot respond to rejected dispute" });
        }

        db.run(
          `UPDATE disputes SET producer_response = ? WHERE id = ?`,
          [response, disputeId],
          async function (err2) {
            if (err2) return res.status(500).json({ error: "Database error" });

            // Notify all admins of the response
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

              for (const admin of admins) {
                await createNotification(
                  admin.id,
                  "dispute_producer_response",
                  "Producer Responded to Dispute",
                  `Producer responded to dispute for "${dispute.beat_title}". Review the response.`,
                  disputeId,
                  "dispute",
                );
              }

              // Notify buyer
              await createNotification(
                dispute.raised_by,
                "dispute_producer_response",
                "Producer Responded to Your Dispute",
                `The producer has responded to your dispute for "${dispute.beat_title}".`,
                disputeId,
                "dispute",
              );
            } catch (notifErr) {
              console.error("Notification failed:", notifErr.message);
            }

            res.json({
              message: "Response submitted successfully",
              dispute_id: disputeId,
            });
          },
        );
      },
    );
  },
);

/**
 * @swagger
 * /api/producer/notifications:
 *   get:
 *     summary: Get producer's notifications
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of producer's notifications
 *       401:
 *         description: Unauthorized
 */
router.get("/notifications", authenticateToken, requireProducer, (req, res) => {
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
 * /api/producer/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Producer]
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
  requireProducer,
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
 * /api/producer/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch(
  "/notifications/read-all",
  authenticateToken,
  requireProducer,
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
