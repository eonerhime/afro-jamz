import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { COMMISSION_RATE, CURRENT_INDEMNITY_VERSION, HOLD_DAYS, JWT_SECRET } from './config/config.js';
import { authenticateToken } from './middleware/auth.middleware.js';
import { requireAdmin, requireBuyer, requireProducer } from './middleware/role.middleware.js';
import { issueJWT } from './utils/jwt.js';
import { getOAuthProfile } from './utils/oauth.js';

const sqlite = sqlite3.verbose();
const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));

// Database setup
const dbPath = path.join(path.resolve(), 'src', 'backend', 'db', 'sqlite.db');
console.log("DB Path", dbPath);

const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.', dbPath);
    initializeDatabase();
  }
});

console.log(db);

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL CHECK (role IN ('buyer', 'producer')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Beats table
    db.run(`CREATE TABLE IF NOT EXISTS beats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      genre TEXT,
      tempo INTEGER,
      duration INTEGER,
      preview_url TEXT,
      full_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producer_id) REFERENCES users(id)
    )`);

    // Licenses table
    db.run(`CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beat_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      usage_rights TEXT,
      FOREIGN KEY (beat_id) REFERENCES beats(id)
    )`);

    // Purchases table
    db.run(`CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,
      beat_id INTEGER NOT NULL,
      license_id INTEGER NOT NULL,
      price REAL NOT NULL,
      commission REAL NOT NULL,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (beat_id) REFERENCES beats(id),
      FOREIGN KEY (license_id) REFERENCES licenses(id)
    )`);

    // Payment methods table
    db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Promotions table
    db.run(`CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beat_id INTEGER NOT NULL,
      producer_id INTEGER NOT NULL,
      price REAL NOT NULL,
      duration_days INTEGER NOT NULL,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beat_id) REFERENCES beats(id),
      FOREIGN KEY (producer_id) REFERENCES users(id)
    )`);
  });
}

// Generate download token
function generateDownloadToken(userId, beatId) {
  return jwt.sign(
    { userId, beatId, type: 'download' },
    JWT_SECRET,
    { expiresIn: '5m' } // ⏱️ expires in 5 minutes
  );
}

// =====================
// REGISTER/ LOGIN USER 
// =====================

// REGISTER USER (LOCAL ONLY)
app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName, role, accept_indemnity } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  if (!['buyer', 'producer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if (role === 'producer' && accept_indemnity !== true) {
    return res.status(400).json({
      error: 'Producers must accept indemnity terms'
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (
        email,
        password_hash,
        display_name,
        role,
        auth_provider,
        email_verified
      ) VALUES (?, ?, ?, ?, 'local', 0)`,
      [email, hashedPassword, displayName, role],
      function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }

        const userId = this.lastID;

        if (role === 'producer') {
          db.run(
            `INSERT INTO producer_indemnity (
              producer_id,
              agreed,
              version,
              agreed_at
            ) VALUES (?, 1, ?, CURRENT_TIMESTAMP)`,
            [userId, CURRENT_INDEMNITY_VERSION]
          );
        }

        res.status(201).json({
          id: userId,
          message: 'User registered successfully'
        });
      }
    );
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// REGISTER USER (OAUTH ONLY) - NOT TESTED
app.get('/api/auth/oauth/:provider', (req, res) => {
  const { role } = req.query;

  if (!['buyer', 'producer'].includes(role)) {
    return res.status(400).json({ error: 'Role is required' });
  }

  const state = JSON.stringify({ role });

  startOAuthFlow(req.params.provider, state, res);
});

// REGISTER USER (OAUTH ONLY - STORE USER) - NOT TESTED
app.get('/api/auth/oauth/:provider/callback', async (req, res) => {
  const oauthProfile = await getOAuthProfile(req);
  const { email, name, providerId } = oauthProfile;

  const { role } = JSON.parse(req.query.state);

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    (err, existingUser) => {
      if (existingUser) {
        const token = issueJWT(existingUser);
        return res.redirect(`/auth/success?token=${token}`);
      }

      // NEW USER
      if (role === 'producer') {
        // Redirect to indemnity screen BEFORE DB insert
        return res.redirect(
          `/auth/indemnity?provider=${req.params.provider}&email=${email}`
        );
      }

      // Buyer → create immediately
      db.run(
        `INSERT INTO users (
          email,
          display_name,
          role,
          auth_provider,
          oauth_provider_id,
          email_verified
        ) VALUES (?, ?, 'buyer', ?, ?, 1)`,
        [email, name, req.params.provider, providerId],
        function () {
          const token = issueJWT({ id: this.lastID, role: 'buyer' });
          res.redirect(`/auth/success?token=${token}`);
        }
      );
    }
  );
});

// REGISTER: PRODUCER INDEMNITY VERIFICATION
app.post('/api/auth/oauth/indemnity', (req, res) => {
  const { email, provider, providerId, accept_indemnity } = req.body;

  if (accept_indemnity !== true) {
    return res.status(403).json({
      error: 'Indemnity not accepted. Signup cancelled.'
    });
  }

  db.run(
    `INSERT INTO users (
      email,
      role,
      auth_provider,
      oauth_provider_id,
      email_verified
    ) VALUES (?, 'producer', ?, ?, 1)`,
    [email, provider, providerId],
    function () {
      const userId = this.lastID;

      db.run(
        `INSERT INTO producer_indemnity (
          producer_id,
          agreed,
          version,
          agreed_at
        ) VALUES (?, 1, ?, CURRENT_TIMESTAMP)`,
        [userId, CURRENT_INDEMNITY_VERSION]
      );

      const token = issueJWT({ id: userId, role: 'producer' });
      res.json({ token });
    }
  );
});

// LOGIN USER (LOCAL ONLY)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    async (err, user) => {
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.auth_provider !== 'local') {
        return res.status(400).json({
          error: `Please log in using ${user.auth_provider}`
        });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = issueJWT(user);

      res.json({ token, 
        user: {
          id: user.id,
          role:user.role,
          email: user.email,
          name: user.display_name
        }
      });
    }
  );
});

// =====================
// ALL BEATS (Public)
// =====================

// Get all beats (Only enabled beats) with licenses included
app.get('/api/beats', (req, res) => {
  const { search, genre, tempo, producer } = req.query;

  let query = `
    SELECT 
      b.*,
      u.display_name AS producer_name
    FROM beats b
    JOIN users u ON b.producer_id = u.id
    WHERE b.is_active = 1
      AND b.status = 'enabled'
  `;
  const params = [];

  if (search) {
    query += ' AND b.title LIKE ?';
    params.push(`%${search}%`);
  }

  if (genre) {
    query += ' AND b.genre = ?';
    params.push(genre);
  }

  if (tempo) {
    query += ' AND b.tempo = ?';
    params.push(tempo);
  }

  if (producer) {
    query += ' AND u.display_name LIKE ?';
    params.push(`%${producer}%`);
  }

  db.all(query, params, (err, beats) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (beats.length === 0) return res.json([]);

    // Get all beat IDs
    const beatIds = beats.map(b => b.id);
    const placeholders = beatIds.map(() => '?').join(',');

    // Fetch licenses for these beats from beat_licenses join
    const licenseQuery = `
      SELECT bl.beat_id, l.id AS license_id, l.name, l.description, l.usage_rights, bl.price
      FROM beat_licenses bl
      JOIN licenses l ON bl.license_id = l.id
      WHERE bl.beat_id IN (${placeholders})
    `;

    db.all(licenseQuery, beatIds, (err, licenses) => {
      if (err) return res.status(500).json({ error: 'Database error fetching licenses' });

      const beatsWithLicenses = beats.map(b => ({
        ...b,
        licenses: licenses.filter(l => l.beat_id === b.id)
      }));

      res.json(beatsWithLicenses);
    });
  });
});

// Get single beat with licenses details (Only enabled beats)
app.get('/api/beats/:id', (req, res) => {
  const beatId = Number(req.params.id);

  // 1️⃣ Fetch the beat and producer info
  db.get(
    `
    SELECT 
      b.*,
      u.display_name AS producer_name
    FROM beats b
    JOIN users u ON b.producer_id = u.id
    WHERE b.id = ?
      AND b.is_active = 1
      AND b.status = 'enabled'
    `,
    [beatId],
    (err, beat) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!beat) return res.status(404).json({ error: 'Beat not found' });

      // 2️⃣ Fetch the licenses for this beat
      db.all(
        `
        SELECT 
          bl.beat_id, 
          l.id AS license_id, 
          l.name, 
          l.description, 
          l.usage_rights, 
          bl.price
        FROM beat_licenses bl
        JOIN licenses l ON bl.license_id = l.id
        WHERE bl.beat_id = ?
        `,
        [beatId],
        (err, licenses) => {
          if (err) return res.status(500).json({ error: 'Database error fetching licenses' });

          // 3️⃣ Construct response
          res.json({
            ...beat,
            licenses: licenses
          });
        }
      );
    }
  );
});

// Get Licenses for a Beat 
app.get('/api/beats/:beatId/licenses', (req, res) => {
  const beatId = Number(req.params.beatId);

  if (!beatId) {
    return res.status(400).json({ error: 'Invalid beat ID' });
  }

  db.all(
    `
    SELECT
      l.id AS license_id,
      l.name,
      l.description,
      l.usage_rights,
      bl.price
    FROM beat_licenses bl
    JOIN licenses l ON bl.license_id = l.id
    WHERE bl.beat_id = ?
    `,
    [beatId],
    (err, rows) => {
      if (err) {
        console.error('GET BEAT LICENSES ERROR:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(rows);
    }
  );
});


// =====================
// PROTECTED ROUTES
// =====================

// ================================
// BUYER ROUTES
// ================================

// Purchase a beat
app.post('/api/buyer/purchase', authenticateToken, requireBuyer, (req, res) => {
  const { beat_id, license_id } = req.body;
  const buyerId = req.user.id;

  if (!beat_id || !license_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 1️⃣ Validate beat
  db.get(
    `SELECT id, producer_id, status, is_active FROM beats WHERE id = ?`,
    [beat_id],
    (err, beat) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!beat || beat.status !== 'enabled' || beat.is_active !== 1) {
        return res.status(400).json({ error: 'Beat not available for purchase' });
      }

      // 2️⃣ Fetch license variant for this beat
      db.get(
        `
        SELECT lv.id AS variant_id, lv.price, lv.is_exclusive, lv.max_sales,
               l.id AS license_global_id, l.name, l.usage_rights
        FROM license_variants lv
        JOIN licenses l ON lv.license_id = l.id
        WHERE lv.license_id = ? AND lv.beat_id = ?
        `,
        [license_id, beat_id],
        (err, variant) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          if (!variant) {
            return res.status(400).json({ error: 'Invalid license for this beat' });
          }

          const price = variant.price;
          const commission = price * COMMISSION_RATE;
          const seller_earnings = price - commission;

          // 3️⃣ Create purchase
          db.run(
            `
            INSERT INTO purchases (
              buyer_id,
              beat_id,
              license_id,
              price,
              commission,
              seller_earnings,
              payout_status,
              eligible_for_withdrawal,
              hold_until
            )
            VALUES (?, ?, ?, ?, ?, ?, 'unpaid', 1, DATETIME('now', '+' || ? || ' days'))
            `,
            [
              buyerId,
              beat_id,
              variant.variant_id, // store variant id
              price,
              commission,
              seller_earnings,
              HOLD_DAYS
            ],
            function (err) {
              if (err) {
                console.error('PURCHASE ERROR:', err);
                return res.status(500).json({ error: 'Failed to create purchase' });
              }

              res.status(201).json({
                message: 'Purchase successful',
                purchase_id: this.lastID,
                beat_id,
                license_name: variant.name,
                license_price: variant.price,
                is_exclusive: variant.is_exclusive,
                max_sales: variant.max_sales
              });
            }
          );
        }
      );
    }
  );
});

// Get user purchases (authenticated)
app.get('/api/buyer/purchases', authenticateToken, requireBuyer, (req, res) => {
  const buyerId = req.user.id;

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
      l.name AS license_name,
      l.usage_rights,
      lv.price AS license_price,
      lv.is_exclusive,
      lv.max_sales
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    LEFT JOIN license_variants lv ON p.license_id = lv.id
    LEFT JOIN licenses l ON lv.license_id = l.id
    WHERE p.buyer_id = ?
    ORDER BY p.purchased_at DESC
  `;

  db.all(query, [buyerId], (err, rows) => {
    if (err) {
      console.error('FETCH BUYER PURCHASES ERROR:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Debug for missing links
    rows.forEach(r => {
      if (!r.beat_id) console.log('Missing beat for purchase:', r.purchase_id);
      if (!r.license_name) console.log('Missing license for purchase:', r.purchase_id);
    });

    res.json(rows);
  });
});

// Download purchased beat - NOT TESTED
app.get('/api/buyer/beats/:id/download', authenticateToken, (req, res) => {
  const beatId = req.params.id;
  const userId = req.user.id;

  // 1️⃣ Verify purchase
  db.get(
    `SELECT * FROM purchases WHERE buyer_id = ? AND beat_id = ?`,
    [userId, beatId],
    (err, purchase) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!purchase) return res.status(403).json({ error: 'Access denied' });

      // 2️⃣ Get beat info
      db.get(
        `SELECT full_url FROM beats WHERE id = ?`,
        [beatId],
        (err, beat) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          if (!beat) return res.status(404).json({ error: 'Beat not found' });

          // 3️⃣ Absolute audio path
          const audioPath = path.join(
            __dirname,
            'audio',
            beat.full_url
          );

          if (!fs.existsSync(audioPath)) {
            return res.status(404).json({ error: 'Audio file not found' });
          }

          // 4️⃣ FORCE DOWNLOAD
          res.download(audioPath, beat.full_url);
        }
      );
    }
  );
});

// Generate secure download URL 
app.get('/api/buyer/beats/:id/secure-url', authenticateToken, (req, res) => {
  const beatId = req.params.id;
  const userId = req.user.id;

  db.get(
    `SELECT 1 FROM purchases WHERE buyer_id = ? AND beat_id = ?`,
    [userId, beatId],
    (err, purchase) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!purchase)
        return res.status(403).json({ error: 'You have not purchased this beat' });

      const token = generateDownloadToken(userId, beatId);

      res.json({
        downloadUrl: `/api/beats/${beatId}/download?token=${token}`,
        expiresIn: '5 minutes'
      });
    }
  );
});

// Buyer lodges a beat purchase dispute
app.post('/api/buyer/purchases/:beatId/dispute', authenticateToken, requireBuyer, (req, res) => {
  const purchaseId = Number(req.params.id);
  const buyerId = req.user.id;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Dispute reason is required' });
  }

  db.get(
    `SELECT * FROM purchases WHERE id = ? AND buyer_id = ?`,
    [purchaseId, buyerId],
    (err, purchase) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

      db.run(
        `UPDATE purchases
         SET refund_status = 'disputed',
             flag_reason = ?,
             flagged_at = CURRENT_TIMESTAMP,
             hold_until = DATETIME('now', '+0 days')
         WHERE id = ? AND buyer_id = ?`,
        [reason, purchaseId, buyerId],
        function(err) {
          if (err) return res.status(500).json({ error: 'Failed to flag dispute' });

          res.json({
            message: 'Dispute submitted successfully',
            purchase_id: purchaseId,
            reason
          });
        }
      );
    }
  );
});


// ================================
// PRODUCER ROUTES
// ================================

// Upload beat 
app.post('/api/producer/beats/upload', authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;

  const {
    title,
    genre,
    tempo,
    duration,
    previewUrl,
    fullUrl,
    licenses
  } = req.body;

  if (!title || !Array.isArray(licenses) || licenses.length === 0) {
    return res.status(400).json({
      error: 'Title and at least one license are required'
    });
  }

  db.serialize(() => {
    // 1️⃣ Insert beat
    db.run(
      `
      INSERT INTO beats (
        producer_id,
        title,
        genre,
        tempo,
        duration,
        preview_url,
        full_url,
        is_active,
        status,
        dispute_status,
        moderation_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'enabled', 'clean', 'clean')
      `,
      [
        producerId,
        title,
        genre,
        tempo,
        duration,
        previewUrl,
        fullUrl
      ],
      function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Failed to create beat' });
        }

        const beatId = this.lastID;

        // 2️⃣ Prepare beat_licenses inserts
        const stmt = db.prepare(`
          INSERT INTO beat_licenses (beat_id, license_id, price)
          VALUES (?, ?, ?)
        `);

        for (const lic of licenses) {
          if (!lic.license_id || !lic.price) {
            stmt.finalize();
            return res.status(400).json({
              error: 'Each license must include license_id and price'
            });
          }

          stmt.run(beatId, lic.license_id, lic.price);
        }

        stmt.finalize(err => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to attach licenses' });
          }

          res.status(201).json({
            message: 'Beat uploaded successfully',
            beat_id: beatId
          });
        });
      }
    );
  });
});

// Update a beat 
app.put('/api/producer/beats/:id', authenticateToken, requireProducer, (req, res) => {
  const beatId = Number(req.params.id);

  const {
    title,
    genre,
    tempo,
    duration,
    previewUrl,
    fullUrl,
    key,
    bpm,
    cover_art_url,
    tags,
    licenses // optional
  } = req.body;

  db.get(`SELECT * FROM beats WHERE id = ?`, [beatId], (err, beat) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!beat) return res.status(404).json({ error: 'Beat not found' });

    // Producers can only edit their own beats
    if (req.user.role === 'producer' && beat.producer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your beat' });
    }

    // Preserve existing values
    const updatedBeat = {
      title: title ?? beat.title,
      genre: genre ?? beat.genre,
      tempo: tempo ?? beat.tempo,
      duration: duration ?? beat.duration,
      preview_url: previewUrl ?? beat.preview_url,
      full_url: fullUrl ?? beat.full_url,
      key: key ?? beat.key,
      bpm: bpm ?? beat.bpm,
      cover_art_url: cover_art_url ?? beat.cover_art_url,
      tags: tags ?? beat.tags
    };

    // Update the beat fields
    db.run(
      `
      UPDATE beats
      SET title = ?, genre = ?, tempo = ?, duration = ?, 
          preview_url = ?, full_url = ?, key = ?, bpm = ?, 
          cover_art_url = ?, tags = ?
      WHERE id = ?
      `,
      [
        updatedBeat.title,
        updatedBeat.genre,
        updatedBeat.tempo,
        updatedBeat.duration,
        updatedBeat.preview_url,
        updatedBeat.full_url,
        updatedBeat.key,
        updatedBeat.bpm,
        updatedBeat.cover_art_url,
        updatedBeat.tags,
        beatId
      ],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Handle license updates only if licenses array is provided
        if (Array.isArray(licenses)) {
          // Check if any purchase exists for this beat
          db.get(
            `SELECT COUNT(*) AS count FROM purchases WHERE beat_id = ?`,
            [beatId],
            (err, row) => {
              if (err) return res.status(500).json({ error: 'Database error checking purchases' });

              if (row.count > 0 && req.user.role === 'producer') {
                // Purchases exist → producers cannot update licenses
                return res.status(403).json({
                  error: 'Cannot update licenses: this beat has been purchased'
                });
              }

              // Safe to update licenses
              db.run(`DELETE FROM beat_licenses WHERE beat_id = ?`, [beatId], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to update licenses' });

                const stmt = db.prepare(
                  `INSERT INTO beat_licenses (beat_id, license_id, price) VALUES (?, ?, ?)`
                );

                licenses.forEach(l => stmt.run([beatId, l.license_id, l.price]));

                stmt.finalize(() => {
                  // Return updated beat
                  db.get(`SELECT * FROM beats WHERE id = ?`, [beatId], (err, updated) => {
                    if (err) return res.status(500).json({ error: 'Error fetching updated beat' });
                    res.json({
                      message: 'Beat and licenses updated successfully',
                      beat: updated
                    });
                  });
                });
              });
            }
          );
        } else {
          // No licenses to update → just return updated beat
          db.get(`SELECT * FROM beats WHERE id = ?`, [beatId], (err, updated) => {
            if (err) return res.status(500).json({ error: 'Error fetching updated beat' });
            res.json({ message: 'Beat updated successfully', beat: updated });
          });
        }
      }
    );
  });
});

// View all beats
app.get('/api/producer/beats', authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;

  db.all(
    `SELECT *
     FROM beats
     WHERE producer_id = ?
     ORDER BY created_at DESC`,
    [producerId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      res.json({
        total: rows.length,
        beats: rows
      });
    }
  );
});

// Producer Dashboard Route
app.get('/api/producer/dashboard', authenticateToken, requireProducer, (req, res) => {
    const producerId = req.user.id;

    const query = `
      SELECT
        COUNT(p.id) AS total_sales,
        COALESCE(SUM(p.price), 0) AS gross_revenue,
        COALESCE(SUM(p.commission), 0) AS total_commission,
        COALESCE(SUM(p.price - p.commission), 0) AS total_earnings,
        COALESCE(SUM(
          CASE WHEN p.payout_status = 'approved'
          THEN p.price - p.commission ELSE 0 END
        ), 0) AS paid_out,
        COALESCE(SUM(
          CASE WHEN p.payout_status = 'pending'
          THEN p.price - p.commission ELSE 0 END
        ), 0) AS pending_payouts
      FROM purchases p
      JOIN beats b ON p.beat_id = b.id
      WHERE b.producer_id = ?
    `;

    db.get(query, [producerId], (err, stats) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(stats);
    });
  }
);

// Producer Sales Dashboard
app.get('/api/producer/sales', authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;

  const query = `
    SELECT
      p.id AS purchase_id,
      b.id AS beat_id,
      b.title AS beat_title,
      u.email AS buyer_email,
      l.name AS license_name,
      p.price AS paid_price,
      p.commission,
      p.seller_earnings,
      p.purchased_at
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    JOIN users u ON p.buyer_id = u.id
    JOIN licenses l ON p.license_id = l.id
    WHERE b.producer_id = ?
    ORDER BY p.purchased_at DESC
  `;

  db.all(query, [producerId], (err, rows) => {
    if (err) {
      console.error('PRODUCER SALES ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows);
  });
});

// Producer Sales Summary
app.get('/api/producer/sales/summary', authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;

  const query = `
    SELECT 
      COUNT(p.id) AS total_sales,
      COALESCE(SUM(p.price), 0) AS gross_revenue,
      COALESCE(SUM(p.commission), 0) AS total_commission,
      COALESCE(SUM(p.seller_earnings), 0) AS net_earnings
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    WHERE b.producer_id = ?
  `;

  db.get(query, [producerId], (err, row) => {
    if (err) {
      console.error('PRODUCER SALES SUMMARY ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(row);
  });
});

// Producer requests withdrawal
app.post('/api/producer/withdrawals', authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }

  // Calculate available earnings for this producer (exclude disputed/refunded)
  const earningsQuery = `
    SELECT COALESCE(SUM(p.seller_earnings), 0) AS available
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    WHERE b.producer_id = ?
      AND p.payout_status = 'unpaid'
      AND (p.refund_status IS NULL OR p.refund_status != 'disputed')
  `;

  db.get(earningsQuery, [producerId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (row.available <= 0) {
      return res.status(400).json({ error: 'No earnings available for withdrawal' });
    }

    if (amount > row.available) {
      return res.status(400).json({
        error: 'Amount exceeds available earnings',
        available: row.available
      });
    }

    db.serialize(() => {
      // 1️⃣ Create withdrawal record with status 'paid'
      db.run(
        `INSERT INTO withdrawals (producer_id, amount, status)
         VALUES (?, ?, 'paid')`,
        [producerId, amount],
        function(err) {
          if (err) return res.status(500).json({ error: 'Failed to create withdrawal' });

          const withdrawalId = this.lastID;

          // 2️⃣ Mark eligible purchases as paid
          db.run(
            `
            UPDATE purchases
            SET payout_status = 'paid', withdrawal_id = ?
            WHERE id IN (
              SELECT p.id
              FROM purchases p
              JOIN beats b ON p.beat_id = b.id
              WHERE b.producer_id = ?
                AND p.payout_status = 'unpaid'
                AND (p.refund_status IS NULL OR p.refund_status != 'disputed')
            )
            `,
            [withdrawalId, producerId],
            function(err) {
              if (err) return res.status(500).json({ error: 'Failed to update purchases' });

              res.json({
                message: 'Withdrawal successful',
                withdrawal: {
                  id: withdrawalId,
                  producer_id: producerId,
                  amount,
                  status: 'paid'
                }
              });
            }
          );
        }
      );
    });
  });
});

// Disable beat (not listed in beats list)
app.put('/api/producer/beats/:id/status', authenticateToken, requireProducer, (req, res) => {
  const beatId = Number(req.params.id);
  const producerId = req.user.id;
  const { status } = req.body;

  const allowedStatuses = ['enabled', 'disabled'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Allowed: enabled, disabled' });
  }

  const isActive = status === 'enabled' ? 1 : 0;

  // Verify the beat belongs to the producer first
  db.get(
    `SELECT id, producer_id FROM beats WHERE id = ?`,
    [beatId],
    (err, beat) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!beat) return res.status(404).json({ error: 'Beat not found' });
      if (beat.producer_id !== producerId) {
        return res.status(403).json({ error: 'Not your beat' });
      }

      // Update the beat status
      db.run(
        `UPDATE beats
         SET status = ?, is_active = ?
         WHERE id = ?`,
        [status, isActive, beatId],
        function(err) {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({
            message: `Beat status updated to ${status}`
          });
        }
      );
    }
  );
});


// ================================
// ADMIN ROUTES
// ================================


// Create a license 
app.post('/api/admin/licenses', authenticateToken, requireAdmin, (req, res) => {
  const { name, description, usage_rights } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'License name is required' });
  }

  db.run(
    `INSERT INTO licenses (name, description, usage_rights)
     VALUES (?, ?, ?)`,
    [name, description || '', usage_rights || ''],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'License name must be unique' });
        }
        return res.status(500).json({ error: 'Failed to create license' });
      }

      res.status(201).json({
        message: 'License created successfully',
        license_id: this.lastID
      });
    }
  );
});

// Update a license 
app.put('/api/admin/licenses/:id', authenticateToken, requireAdmin, (req, res) => {
  const licenseId = Number(req.params.id);
  const { name, description, usage_rights } = req.body;

  if (!licenseId) {
    return res.status(400).json({ error: 'License ID is required' });
  }

  // Check if the license is linked to any beat
  db.get(
    `SELECT 1 FROM beat_licenses WHERE license_id = ? LIMIT 1`,
    [licenseId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (row) {
        return res.status(400).json({ error: 'Cannot update license already used by a beat' });
      }

      db.run(
        `UPDATE licenses
         SET name = COALESCE(?, name),
             description = COALESCE(?, description),
             usage_rights = COALESCE(?, usage_rights)
         WHERE id = ?`,
        [name, description, usage_rights, licenseId],
        function (err) {
          if (err) return res.status(500).json({ error: 'Failed to update license' });
          if (this.changes === 0) return res.status(404).json({ error: 'License not found' });

          res.json({ message: 'License updated successfully' });
        }
      );
    }
  );
});

// View all licenses
app.get('/api/admin/licenses', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT id, name, description, usage_rights, created_at
     FROM licenses
     ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// View all beats (including hidden/problematic ones)
app.get('/api/admin/beats', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT id, producer_id, title, genre, tempo, duration, preview_url, full_url, created_at, is_active
    FROM beats
    ORDER BY created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Map rows to include derived status
    const beats = rows.map(beat => ({
      ...beat,
      status: beat.is_active ? 'enabled' : 'disabled'
    }));

    res.json(beats);
  });
});

// Disable / enable a beat (soft moderation)
app.put('/api/admin/beats/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const beatId = req.params.id;
  const { status } = req.body;

  const allowedStatuses = ['enabled', 'disabled', 'under_review', 'banned'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const isActive = status === 'enabled' ? 1 : 0;

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
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Beat not found' });

      res.json({
        message: `Beat status updated to ${status}`
      });
    }
  );
});

// Admin views all withdrawal
app.get('/api/admin/withdrawals', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `
    SELECT w.*, u.email AS producer_email
    FROM withdrawals w
    JOIN users u ON w.producer_id = u.id
    ORDER BY w.created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Admin approves a producer withdrawal (if flagged and reviewed)
app.put('/api/admin/purchases/:id/resolve', authenticateToken, requireAdmin, (req, res) => {
  const purchaseId = Number(req.params.id);
  const { action, note } = req.body; // action: 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject".' });
  }

  // 1️⃣ Fetch the disputed purchase
  db.get(
    `SELECT * FROM purchases WHERE id = ? AND refund_status = 'disputed'`,
    [purchaseId],
    (err, purchase) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!purchase) return res.status(404).json({ error: 'Disputed purchase not found' });

      // 2️⃣ Determine new refund_status and hold_until
      let newStatus;
      let holdUntil = null;

      if (action === 'approve') {
        // Approved dispute: payout stays on hold until resolved manually or refunded
        newStatus = 'on_hold';
        holdUntil = purchase.hold_until || new Date().toISOString(); 
      } else {
        // Rejected dispute: payout can proceed
        newStatus = 'none';
      }

      // 3️⃣ Update purchase record
      db.run(
        `UPDATE purchases
         SET refund_status = ?, hold_until = ?, admin_note = ?
         WHERE id = ?`,
        [newStatus, holdUntil, note || null, purchaseId],
        function(err) {
          if (err) return res.status(500).json({ error: 'Failed to resolve dispute' });

          res.json({
            message: `Purchase dispute ${action}d successfully`,
            purchase_id: purchaseId,
            new_status: newStatus,
            admin_note: note || null
          });
        }
      );
    }
  );
});

// Sales Dashboard
app.get('/api/admin/sales', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT
      p.id AS purchase_id,
      b.id AS beat_id,
      b.title AS beat_title,
      u.email AS buyer_email,
      l.name AS license_name,
      l.price,
      p.commission,
      p.created_at AS purchased_at
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    JOIN users u ON p.buyer_id = u.id
    JOIN licenses l ON p.license_id = l.id
    WHERE b.producer_id = ?
    ORDER BY p.created_at DESC
  `;

  db.all('SELECT * FROM purchases', [], (err, rows) => {
    if (err) {
      console.error('PURCHASES QUERY ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });

});

// Sales Summary
app.get('/api/admin/sales/summary', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT 
      COUNT(p.id) AS total_sales,
      COALESCE(SUM(p.price), 0) AS gross_revenue,
      COALESCE(SUM(p.commission), 0) AS total_commission,
      COALESCE(SUM(p.price - p.commission), 0) AS net_earnings
    FROM purchases p
  `;

  db.get(query, [], (err, row) => {
    if (err) {
      console.error('SALES SUMMARY ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(row);
  });
});

// Admin platform analytics
app.get('/api/admin/analytics', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT
      COUNT(*) AS total_sales,
      COALESCE(SUM(price), 0) AS gross_revenue,
      COALESCE(SUM(commission), 0) AS total_commission,
      COALESCE(SUM(price - commission), 0) AS total_paid_to_producers,
      COALESCE(SUM(CASE WHEN payout_status = 'approved' THEN price - commission ELSE 0 END), 0) AS paid_out
    FROM purchases
  `;

  db.get(query, [], (err, stats) => {
    if (err) {
      console.error('ANALYTICS ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    // Compute pending payouts
    const pending_payouts = stats.total_paid_to_producers - stats.paid_out;

    res.json({
      total_sales: stats.total_sales,
      gross_revenue: stats.gross_revenue,
      total_commission: stats.total_commission,
      total_paid_to_producers: stats.total_paid_to_producers,
      paid_out: stats.paid_out,
      pending_payouts
    });
  });
});




// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

