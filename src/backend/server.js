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
import { JWT_SECRET } from './config/env.js';
import { requireAdmin } from './middleware/admin.middleware.js';
import { authenticateToken } from './middleware/auth.middleware.js';
import { requireProducer } from './middleware/producer.middleware.js';


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

const authenticateOptional = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    req.user = null;
    return next();
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch {
    req.user = null;
  }

  next();
};

// Generate download token
function generateDownloadToken(userId, beatId) {
  return jwt.sign(
    { userId, beatId, type: 'download' },
    JWT_SECRET,
    { expiresIn: '5m' } // ⏱️ expires in 5 minutes
  );
}

// ROUTES
// Register user
app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  if (!['buyer', 'producer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be buyer or producer' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, displayName, role],
      function(err) {
        if (err) {
          console.error('REGISTER ERROR:', err.message);
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'User created successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      console.error('LOGIN ERROR:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      is_admin: user.is_admin }, 
      JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role } });
  });
});

// =====================
// Beats (Public)
// =====================
// Get Licenses for a Beat (Public)
app.get('/api/beats/:beatId/licenses', (req, res) => {
  const beatId = Number(req.params.beatId);

  db.all(
    'SELECT * FROM licenses WHERE beat_id = ?',
    [beatId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Get beats (PUBLIC – only enabled beats) with licenses included
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
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (beats.length === 0) return res.json([]);

    const beatIds = beats.map(b => b.id);
    const placeholders = beatIds.map(() => '?').join(',');
    const licensesQuery = `SELECT * FROM licenses WHERE beat_id IN (${placeholders})`;

    db.all(licensesQuery, beatIds, (err, licenses) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      const beatsWithLicenses = beats.map(b => ({
        ...b,
        licenses: licenses.filter(l => l.beat_id === b.id)
      }));

      res.json(beatsWithLicenses);
    });
  });
});

// ----- Protected routes ----- //

// =====================
// Beats (Producer)
// =====================
// Create beat license (Producer only)
app.post('/api/beats/:beatId/licenses', authenticateToken,
  (req, res) => {
    if (req.user.role !== 'producer') {
      return res.status(403).json({ error: 'Only producers can create licenses' });
    }

    const beatId = Number(req.params.beatId);
    const { name, description, price, usageRights } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Verify beat ownership
    db.get(
      'SELECT * FROM beats WHERE id = ?',
      [beatId],
      (err, beat) => {
        if (!beat) return res.status(404).json({ error: 'Beat not found' });

        if (beat.producer_id !== req.user.id) {
          return res.status(403).json({ error: 'Not your beat' });
        }

        db.run(
          `INSERT INTO licenses 
           (beat_id, name, description, price, usage_rights)
           VALUES (?, ?, ?, ?, ?)`,
          [beatId, name, description, price, usageRights],
          function () {
            res.status(201).json({
              id: this.lastID,
              message: 'License created successfully'
            });
          }
        );
      }
    );
  }
);

// Update a license (Producer only)
app.put('/api/licenses/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'producer') {
    return res.status(403).json({ error: 'Only producers can edit licenses' });
  }

  const licenseId = Number(req.params.id);
  const { name, description, price, usageRights } = req.body;

  // Step 1: Load license + beat
  db.get(
    `SELECT l.*, b.producer_id 
     FROM licenses l
     JOIN beats b ON l.beat_id = b.id
     WHERE l.id = ?`,
    [licenseId],
    (err, license) => {
      if (!license) return res.status(404).json({ error: 'License not found' });

      // Step 2: Ownership check
      if (license.producer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not your license' });
      }

      // Step 3: Check purchases
      db.get(
        'SELECT id FROM purchases WHERE license_id = ? LIMIT 1',
        [licenseId],
        (err, purchase) => {
          if (purchase) {
            return res.status(400).json({
              error: 'License cannot be edited after it has been purchased'
            });
          }

          // Step 4: Update
          db.run(
            `UPDATE licenses
             SET name = ?, description = ?, price = ?, usage_rights = ?
             WHERE id = ?`,
            [name, description, price, usageRights, licenseId],
            () => {
              res.json({ message: 'License updated successfully' });
            }
          );
        }
      );
    }
  );
});

// Upload beat (producers only)
app.post('/api/beats', authenticateToken, (req, res) => {
  if (req.user.role !== 'producer') {
    return res.status(403).json({ error: 'Only producers can upload beats' });
  }

  const { title, genre, tempo, duration, previewUrl, fullUrl } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.run(
    'INSERT INTO beats (producer_id, title, genre, tempo, duration, preview_url, full_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, title, genre, tempo, duration, previewUrl, fullUrl],
    function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.status(201).json({ id: this.lastID, message: 'Beat uploaded successfully' });
    }
  );
});

// Update a beat
app.put('/api/beats/:id', authenticateToken, (req, res) => {
  console.log('UPDATE HIT:', req.params.id);

  if (req.user.role !== 'producer') {
    return res.status(403).json({ error: 'Only producers can update beats' });
  }

  const beatId = Number(req.params.id);
  const { title, genre, tempo, duration, previewUrl, fullUrl } = req.body;

  db.get('SELECT * FROM beats WHERE id = ?', [beatId], (err, beat) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!beat) return res.status(404).json({ error: 'Beat not found' });

    if (Number(beat.producer_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Not your beat' });
    }

    db.run(
      `UPDATE beats
       SET title = ?, genre = ?, tempo = ?, duration = ?, preview_url = ?, full_url = ?
       WHERE id = ?`,
      [title, genre, tempo, duration, previewUrl, fullUrl, beatId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Beat updated successfully' });
      }
    );
  });
});

// Delete a beat
app.delete('/api/beats/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'producer') {
    return res.status(403).json({ error: 'Only producers can delete beats' });
  }

  const beatId = Number(req.params.id);

  db.get('SELECT * FROM beats WHERE id = ?', [beatId], (err, beat) => {
    if (!beat) return res.status(404).json({ error: 'Beat not found' });

    if (Number(beat.producer_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'Not your beat' });
    }

    db.run('DELETE FROM beats WHERE id = ?', [beatId], () => {
      res.json({ message: 'Beat deleted successfully' });
    });
  });
});

// =====================
// Beats (Access-controlled)
// =====================
// Get single beat (access-controlled)
app.get('/api/beats/:id', authenticateOptional, async (req, res) => {
  const beatId = req.params.id;
  const user = req.user || null;

  db.get(
    `
    SELECT b.*, u.display_name AS producer_name
    FROM beats b
    JOIN users u ON b.producer_id = u.id
    WHERE b.id = ?
    `,
    [beatId],
    async (err, beat) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!beat) return res.status(404).json({ error: 'Beat not found' });

      let canAccessFull = false;

      if (user) {
        if (user.role === 'producer' && user.id === beat.producer_id) {
          canAccessFull = true;
        } else {
          db.get(
            `SELECT 1 FROM purchases WHERE buyer_id = ? AND beat_id = ?`,
            [user.id, beatId],
            (err, row) => {
              if (row) canAccessFull = true;
              respond();
            }
          );
          return;
        }
      }

      respond();

      function respond() {
        res.json({
          id: beat.id,
          title: beat.title,
          genre: beat.genre,
          tempo: beat.tempo,
          duration: beat.duration,
          preview_url: beat.preview_url,
          full_url: canAccessFull ? beat.full_url : null,
          producer_name: beat.producer_name,
          access: canAccessFull ? 'full' : 'preview'
        });
      }
    }
  );
});

// ================================
// SECURE STREAM / DOWNLOAD ROUTE
// ================================
app.get('/api/beats/:id/download', authenticateToken, (req, res) => {
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

// Get user purchases (authenticated)
app.get('/api/purchases', authenticateToken, (req, res) => {
  db.all(
    `SELECT p.*, b.title, l.name as license_name, l.usage_rights
     FROM purchases p
     JOIN beats b ON p.beat_id = b.id
     JOIN licenses l ON p.license_id = l.id
     WHERE p.buyer_id = ?`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Purchase a beat
app.post('/api/purchases', authenticateToken, (req, res) => {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ error: 'Only buyers can purchase beats' });
  }

  const { beatId, licenseId } = req.body;

  if (!beatId || !licenseId) {
    return res.status(400).json({ error: 'beatId and licenseId are required' });
  }

  // Load license + beat
  db.get(
    `SELECT l.price, b.producer_id
     FROM licenses l
     JOIN beats b ON l.beat_id = b.id
     WHERE l.id = ? AND b.id = ?`,
    [licenseId, beatId],
    (err, record) => {
      if (!record) {
        return res.status(404).json({ error: 'Beat or license not found' });
      }

      // Prevent self-purchase
      if (record.producer_id === req.user.id) {
        return res.status(400).json({ error: 'Cannot purchase your own beat' });
      }

      const price = record.price;
      const commission = price * 0.15;

      db.run(
        `INSERT INTO purchases
         (buyer_id, beat_id, license_id, price, commission)
         VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, beatId, licenseId, price, commission],
        function () {
          res.status(201).json({
            id: this.lastID,
            price,
            commission,
            message: 'Purchase completed successfully'
          });
        }
      );
    }
  );
});

// Generate secure download URL (buyers only)
app.get('/api/beats/:id/secure-url', authenticateToken, (req, res) => {
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

// Download / stream beat securely
app.get('/api/beats/:id/download', (req, res) => {
  const { token } = req.query;
  const beatId = req.params.id;

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    if (decoded.beatId !== Number(beatId)) {
      return res.status(403).json({ error: 'Token mismatch' });
    }

    db.get(
      `SELECT full_url FROM beats WHERE id = ?`,
      [beatId],
      (err, beat) => {
        if (err || !beat)
          return res.status(404).json({ error: 'Beat not found' });

        // 🔐 OPTION A: Redirect to protected file store
        return res.redirect(beat.full_url);

        // 🔐 OPTION B (later): stream from disk or S3
      }
    );
  });
});

// ================================
// PRODUCER ROUTES
// ================================
// Sales Dashboard
app.get('/api/sales', authenticateToken, (req, res) => {
  const producerId = req.user.id;

  // 1️⃣ Ensure user is a producer
  if (req.user.role !== 'producer') {
    return res.status(403).json({ error: 'Producers only' });
  }

  // 2️⃣ Fetch sales for producer’s beats
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
app.get('/api/sales/summary', authenticateToken, (req, res) => {
  if (req.user.role !== 'producer') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const producerId = req.user.id;

  db.get(
    `
    SELECT 
      COUNT(p.id) AS total_sales,
      COALESCE(SUM(p.price), 0) AS gross_revenue,
      COALESCE(SUM(p.commission), 0) AS total_commission,
      COALESCE(SUM(p.price - p.commission), 0) AS net_earnings
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    WHERE b.producer_id = ?
    `,
    [producerId],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(row);
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

// Producer's payout request
app.post('/api/producer/payouts/request', authenticateToken, (req, res) => {
    if (req.user.role !== 'producer')
      return res.status(403).json({ error: 'Only producers allowed' });

    db.run(
      `UPDATE purchases
       SET payout_status = 'requested'
       WHERE payout_status = 'pending'
       AND beat_id IN (
         SELECT id FROM beats WHERE producer_id = ?
       )`,
      [req.user.id],
      function (err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Payout request submitted' });
      }
    );
  }
);

// Producer requests withdrawal
app.post('/api/producer/withdrawals', authenticateToken, (req, res) => {
  const producerId = req.user.id;
  let { amount } = req.body;

  // 1️⃣ Calculate total pending payouts
  const query = `
    SELECT 
      COALESCE(SUM(p.price - p.commission), 0) AS pending_total
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    WHERE b.producer_id = ?
      AND p.payout_status = 'pending'
  `;

  db.get(query, [producerId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const pendingTotal = row.pending_total;

    if (pendingTotal <= 0) {
      return res.status(400).json({ error: 'No pending payouts available' });
    }

    // 2️⃣ Cap withdrawal amount to pendingTotal
    if (amount > pendingTotal) {
      amount = pendingTotal;
    }

    // 3️⃣ Insert withdrawal request
    const insertQuery = `
      INSERT INTO withdrawals (producer_id, amount, status)
      VALUES (?, ?, 'pending')
    `;
    db.run(insertQuery, [producerId, amount], function(err) {
      if (err) return res.status(500).json({ error: 'Database error' });

      // 4️⃣ Mark the corresponding purchases as 'in withdrawal'
      const updatePurchases = `
        UPDATE purchases
        SET payout_status = 'in_withdrawal'
        WHERE payout_status = 'pending'
          AND beat_id IN (
            SELECT id FROM beats WHERE producer_id = ?
          )
      `;
      db.run(updatePurchases, [producerId], function(err) {
        if (err) console.error('Failed to update purchases', err);
        // Not fatal
      });

      res.json({
        message: 'Withdrawal request submitted',
        withdrawal: {
          id: this.lastID,
          producer_id: producerId,
          amount: pendingAmount,
          status: 'pending',
          requested_at: new Date().toISOString()
        }
      });

    });
  });
});


// Producers Payout List Route
app.get('/api/producers/payouts', authenticateToken, (req, res) => {
  if (req.user.role !== 'producer') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const producerId = req.user.id;

  const query = `
    SELECT 
      p.id AS purchase_id,
      b.title AS beat_title,
      p.price,
      p.commission,
      (p.price - p.commission) AS payout_amount,
      p.payout_status,
      p.purchased_at
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    WHERE b.producer_id = ?
  `;

  db.all(query, [producerId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows);
  });
});

// ================================
// ADMIN ROUTES
// ================================
// View all beats (including hidden/problematic ones)
// Get all beats for admin view
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
  const { is_active } = req.body; // true or false

  // Determine numeric flag and status string
  const isActiveFlag = is_active ? 1 : 0;
  const statusString = is_active ? 'enabled' : 'disabled';

  db.run(
    'UPDATE beats SET is_active = ?, status = ? WHERE id = ?',
    [isActiveFlag, statusString, beatId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Beat not found' });
      }

      res.json({
        message: `Beat ${statusString}`
      });
    }
  );
});

// Mark payout as paid (Admin / System)
app.put('/api/admin/payouts/:purchaseId/pay', authenticateToken, (req, res) => {
  // For now, allow only producers or admin logic
  const purchaseId = req.params.purchaseId;

  const query = `
    UPDATE purchases
    SET payout_status = 'paid',
        paid_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [purchaseId], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json({ message: 'Payout marked as paid' });
  });
});

// GET admin payouts (pending OR all)
app.get('/api/admin/payouts', authenticateToken, requireAdmin, (req, res) => {
  const { status } = req.query; // optional: pending | approved

  let query = `
    SELECT *
    FROM purchases
  `;
  const params = [];

  if (status) {
    query += ' WHERE payout_status = ?';
    params.push(status);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(rows);
  });
});

// Admin approves payout
app.put('/api/admin/payouts/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  const payoutId = req.params.id;

  db.run(
    `
    UPDATE purchases
    SET payout_status = 'approved',
        paid_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [payoutId],
    function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Payout not found' });
      }

      res.json({ message: 'Payout approved' });
    }
  );
});

// Admin views withdrawal requests
app.get('/api/admin/withdrawals', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT w.*, u.email AS producer_email
     FROM withdrawals w
     JOIN users u ON w.producer_id = u.id
     ORDER BY requested_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(rows);
    }
  );
});

// Admin approves withdrawal (money sent)
app.put('/api/admin/withdrawals/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  const withdrawalId = req.params.id;

  db.run(
    `UPDATE withdrawals
     SET status = 'paid', processed_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'pending'`,
    [withdrawalId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Withdrawal not found or already processed' });
      }

      res.json({ message: 'Withdrawal paid successfully' });
    }
  );
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

