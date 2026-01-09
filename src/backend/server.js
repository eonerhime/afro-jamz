import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import validator from 'validator';
import winston from 'winston';
// import { swaggerSpec, swaggerUi } from '../../swagger.js';
import { COMMISSION_RATE, CURRENT_INDEMNITY_VERSION, HOLD_DAYS, JWT_SECRET } from './config/config.js';
import { authenticateToken } from './middleware/auth.middleware.js';
import { requireAdmin, requireBuyer, requireProducer } from './middleware/role.middleware.js';
import { issueJWT } from './utils/jwt.js';
import { getOAuthProfile } from './utils/oauth.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const sqlite = sqlite3.verbose();
const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database setup
const dbPath = path.join(path.resolve(), 'src', 'backend', 'db', 'sqlite.db');
console.log("DB Path", dbPath);

const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.', dbPath);
    
    // ==========================================
    // SQLITE PERFORMANCE OPTIMIZATIONS
    // ==========================================
    
    // Enable Write-Ahead Logging (critical for concurrency)
    db.run('PRAGMA journal_mode = WAL', (err) => {
      if (err) {
        console.error('⚠️  WAL mode error:', err.message);
      } else {
        console.log('✅ SQLite WAL mode enabled (better concurrency)');
      }
    });
    
    // Increase cache size (uses more RAM but much faster)
    db.run('PRAGMA cache_size = -64000', (err) => {
      if (!err) console.log('✅ Cache size set to 64MB');
    });
    
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (!err) console.log('✅ Foreign keys enabled');
    });
    
    // Optimize for speed (normal synchronization is safe enough)
    db.run('PRAGMA synchronous = NORMAL', (err) => {
      if (!err) console.log('✅ Synchronous mode: NORMAL');
    });
    
    // Store temp tables in memory for speed
    db.run('PRAGMA temp_store = MEMORY', (err) => {
      if (!err) console.log('✅ Temp store: MEMORY');
    });
    
    console.log('🚀 SQLite optimizations complete');
    
    // Initialize database tables
    initializeDatabase();
  }
});

console.log(db);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // 5 attempts
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// ==========================================
// SWAGGER CONFIGURATION
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AfroJamz API',
      version: '1.0.0',
      description: 'API documentation for AfroJamz - African Beat Marketplace',
      contact: {
        name: 'AfroJamz Support',
        email: 'support@afrojamz.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      },
      {
        url: 'https://api.afrojamz.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/backend/server.js', './src/backend/routes/*.js'] // Path to API docs
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

console.log(`📚 Swagger documentation available at http://localhost:${PORT}/api-docs`);


// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(loginLimiter);


// ==========================================
// HELPER FUNCTIONS
// ==========================================

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

    // Withdrawals table
    db.run(`CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'paid', 'blocked', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

// Validate registration
function validateRegistration(req, res, next) {
  const { email, password } = req.body;
  
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  
  next();
}

// ==========================================
// NOTIFICATION HELPER
// ==========================================

function createNotification(userId, type, title, message, referenceId, referenceType) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, referenceId, referenceType],
      function (err) {
        if (err) {
          console.error('NOTIFICATION CREATE ERROR:', err.message);
          reject(err);
        } else {
          console.log(`✅ Notification created for user ${userId}: ${type}`);
          resolve(this.lastID);
        }
      }
    );
  });
}
// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (local authentication)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: producer@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePassword123!
 *               display_name:
 *                 type: string
 *                 example: John Doe
 *               role:
 *                 type: string
 *                 enum: [buyer, producer]
 *                 example: producer
 *               accept_indemnity:
 *                 type: boolean
 *                 description: Required only for producers
 *                 example: true
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *       400:
 *         description: Invalid input or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Email, password, and role are required
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Email already exists
 */
app.post('/api/auth/register', validateRegistration, async (req, res) => {
  const { email, password, display_name, role, accept_indemnity } = req.body;

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
      [email, hashedPassword, display_name, role],
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

/**
 * @swagger
 * /api/auth/oauth/{provider}:
 *   get:
 *     summary: Initiate OAuth authentication flow
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github]
 *         description: OAuth provider
 *       - in: query
 *         name: role
 *         required: true
 *         schema:
 *           type: string
 *           enum: [buyer, producer]
 *         description: User role for registration
 *     responses:
 *       302:
 *         description: Redirect to OAuth provider
 *       400:
 *         description: Invalid role
 */
app.get('/api/auth/oauth/:provider', (req, res) => {
  const { role } = req.query;

  if (!['buyer', 'producer'].includes(role)) {
    return res.status(400).json({ error: 'Role is required' });
  }

  const state = JSON.stringify({ role });

  startOAuthFlow(req.params.provider, state, res);
});

/**
 * @swagger
 * /api/auth/oauth/{provider}/callback:
 *   get:
 *     summary: OAuth callback handler
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth provider
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from provider
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter containing role
 *     responses:
 *       302:
 *         description: Redirect to success or indemnity page
 *       500:
 *         description: OAuth processing error
 */
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

/**
 * @swagger
 * /api/auth/oauth/indemnity:
 *   post:
 *     summary: Accept producer indemnity agreement (OAuth)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - provider
 *               - providerId
 *               - accept_indemnity
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               provider:
 *                 type: string
 *               providerId:
 *                 type: string
 *               accept_indemnity:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Indemnity accepted, user created
 *       403:
 *         description: Indemnity not accepted
 */
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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: producer@afrojamz.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     role:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: Must use OAuth provider
 *       401:
 *         description: Invalid credentials
 */
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

// ==========================================
// PUBLIC BEATS ROUTES
// ==========================================

/**
 * @swagger
 * /api/beats:
 *   get:
 *     summary: Get all available beats (public)
 *     tags: [Beats]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search beats by title
 *         example: afro
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre
 *         example: Afrobeat
 *       - in: query
 *         name: tempo
 *         schema:
 *           type: integer
 *         description: Filter by tempo (BPM)
 *         example: 120
 *       - in: query
 *         name: producer
 *         schema:
 *           type: string
 *         description: Filter by producer name
 *         example: DJ Awesome
 *     responses:
 *       200:
 *         description: List of enabled beats with licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   genre:
 *                     type: string
 *                   tempo:
 *                     type: integer
 *                   bpm:
 *                     type: integer
 *                   key:
 *                     type: string
 *                   duration:
 *                     type: integer
 *                   preview_url:
 *                     type: string
 *                   cover_art_url:
 *                     type: string
 *                   tags:
 *                     type: string
 *                   producer_name:
 *                     type: string
 *                   licenses:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         license_id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         price:
 *                           type: number
 *       500:
 *         description: Database error
 */
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

/**
 * @swagger
 * /api/beats/{id}:
 *   get:
 *     summary: Get single beat details (public)
 *     tags: [Beats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     responses:
 *       200:
 *         description: Beat details with licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 genre:
 *                   type: string
 *                 tempo:
 *                   type: integer
 *                 bpm:
 *                   type: integer
 *                 key:
 *                   type: string
 *                 duration:
 *                   type: integer
 *                 preview_url:
 *                   type: string
 *                 cover_art_url:
 *                   type: string
 *                 tags:
 *                   type: string
 *                 producer_name:
 *                   type: string
 *                 licenses:
 *                   type: array
 *       404:
 *         description: Beat not found
 *       500:
 *         description: Database error
 */
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

/**
 * @swagger
 * /api/beats/{beatId}/licenses:
 *   get:
 *     summary: Get licenses for a specific beat
 *     tags: [Beats]
 *     parameters:
 *       - in: path
 *         name: beatId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Beat ID
 *     responses:
 *       200:
 *         description: List of licenses for the beat
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   license_id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   usage_rights:
 *                     type: string
 *                   price:
 *                     type: number
 *       400:
 *         description: Invalid beat ID
 *       500:
 *         description: Database error
 */
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


// ==========================================
// BUYER ROUTES
// ==========================================

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
app.post('/api/buyer/purchase', authenticateToken, requireBuyer, (req, res) => {
  const { beat_id, license_id } = req.body;
  const buyerId = req.user.id;

  if (!beat_id || !license_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ✅ STEP 1: Check if buyer already owns this beat with this license
  db.get(
    `SELECT id FROM purchases 
     WHERE buyer_id = ? AND beat_id = ? AND license_id = ?`,
    [buyerId, beat_id, license_id],
    (err, duplicate) => {
      if (duplicate) {
        return res.status(400).json({ 
          error: 'You already own this beat with this license. Consider upgrading to a higher license instead.' 
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
              error: 'This beat has been exclusively licensed and is no longer available for purchase.' 
            });
          }

          // ✅ STEP 3: Validate beat availability
          db.get(
            `SELECT id, producer_id, status, is_active
             FROM beats
             WHERE id = ?`,
            [beat_id],
            (err3, beat) => {
              if (err3) return res.status(500).json({ error: 'Database error (beat)' });
              if (!beat || beat.status !== 'enabled' || beat.is_active !== 1) {
                return res.status(400).json({ error: 'Beat not available for purchase' });
              }

              // ✅ STEP 4: Get license details
              db.get(
                `SELECT bl.price, l.id AS license_id, l.name, l.usage_rights
                 FROM beat_licenses bl
                 JOIN licenses l ON bl.license_id = l.id
                 WHERE bl.beat_id = ? AND bl.license_id = ?`,
                [beat_id, license_id],
                (err4, license) => {
                  if (err4) return res.status(500).json({ error: 'Database error (license)' });
                  if (!license) return res.status(400).json({ error: 'Invalid license for this beat' });

                  const price = license.price;
                  const commission = price * COMMISSION_RATE;
                  const seller_earnings = price - commission;

                  // ✅ STEP 5: Create purchase
                  db.run(
                    `INSERT INTO purchases (
                      buyer_id, beat_id, license_id, price, commission,
                      seller_earnings, payout_status, withdrawal_id,
                      hold_until
                    )
                    VALUES (?, ?, ?, ?, ?, ?, 'unpaid', NULL, DATETIME('now', '+' || ? || ' days'))`,
                    [buyerId, beat_id, license.license_id, price, commission, seller_earnings, HOLD_DAYS],
                    function (err5) {
                      if (err5) {
                        return res.status(500).json({ error: 'Failed to create purchase', details: err5.message });
                      }

                      const purchaseId = this.lastID;

                      // ✅ STEP 6: If exclusive license, disable beat
                      if (license.name === 'Exclusive') {
                        db.run(
                          `UPDATE beats 
                           SET status = 'disabled', is_active = 0 
                           WHERE id = ?`,
                          [beat_id],
                          (err6) => {
                            if (err6) {
                              console.error('Failed to disable beat after exclusive purchase:', err6.message);
                            } else {
                              console.log(`✅ Beat ${beat_id} disabled after exclusive purchase`);
                            }
                          }
                        );
                      }

                      res.status(201).json({
                        message: 'Purchase successful',
                        purchase_id: purchaseId,
                        beat_id,
                        license: {
                          name: license.name,
                          price: license.price,
                          usage_rights: license.usage_rights,
                          exclusive: license.name === 'Exclusive'
                        },
                        hold_until_date: `${HOLD_DAYS} days from now`
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
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
      p.license_id,
      l.name AS license_name,
      l.usage_rights,
      bl.price AS license_price
    FROM purchases p
    JOIN beats b ON p.beat_id = b.id
    LEFT JOIN beat_licenses bl ON p.license_id = bl.id
    LEFT JOIN licenses l ON bl.license_id = l.id
    WHERE p.buyer_id = ?
    ORDER BY p.purchased_at DESC
  `;

  db.all(query, [buyerId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
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
app.post('/api/buyer/purchases/:id/dispute', authenticateToken, requireBuyer, (req, res) => {
  const purchaseId = Number(req.params.id);
  const buyerId = Number(req.user.id);
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Dispute reason is required' });
  }

  db.get(
    `SELECT p.id, p.refund_status, p.withdrawal_id, b.id AS beat_id, b.title AS beat_title, b.producer_id
     FROM purchases p
     JOIN beats b ON b.id = p.beat_id
     WHERE p.id = ? AND p.buyer_id = ?`,
    [purchaseId, buyerId],
    (err, purchase) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!purchase) return res.status(404).json({ error: 'Purchase not found for this buyer' });

      if (purchase.refund_status === 'disputed') {
        return res.status(400).json({ error: 'Purchase is already disputed' });
      }

      if (purchase.refund_status === 'refunded') {
        return res.status(400).json({ error: 'Refunded purchase cannot be disputed' });
      }

      if (purchase.withdrawal_id !== null) {
        return res.status(400).json({ error: 'Cannot dispute a purchase that has already been withdrawn' });
      }

      // Flag as disputed
      db.run(
        `UPDATE purchases
         SET refund_status = 'disputed', flag_reason = ?
         WHERE id = ? AND buyer_id = ?`,
        [reason, purchaseId, buyerId],
        async function (err2) {
          if (err2) {
            console.error('DISPUTE UPDATE ERROR:', err2.message);
            return res.status(500).json({ error: 'Failed to flag dispute' });
          }

          // ✅ NOTIFY ALL ADMINS
          try {
            const admins = await new Promise((resolve, reject) => {
              db.all(`SELECT id FROM users WHERE role = 'admin'`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
              });
            });

            for (const admin of admins) {
              await createNotification(
                admin.id,
                'dispute_filed',
                'New Dispute Filed',
                `Buyer filed dispute for purchase #${purchaseId} (${purchase.beat_title}). Reason: ${reason}`,
                purchaseId,
                'purchase'
              );
            }
          } catch (notifErr) {
            console.error('Admin notification failed:', notifErr.message);
            // Don't fail the request
          }

          res.status(200).json({
            message: 'Purchase disputed successfully. An admin will review this case.',
            purchase_id: purchaseId,
            flag_reason: reason
          });
        }
      );
    }
  );
});


// ==========================================
// PRODUCER ROUTES
// ==========================================

/**
 * @swagger
 * /api/producer/beats/upload:
 *   post:
 *     summary: Upload a new beat
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
 *               - licenses
 *             properties:
 *               title:
 *                 type: string
 *                 example: Afro Groove
 *               genre:
 *                 type: string
 *                 example: Afrobeat
 *               tempo:
 *                 type: integer
 *                 example: 120
 *               key:
 *                 type: string
 *                 example: Am
 *               bpm:
 *                 type: integer
 *                 example: 120
 *               duration:
 *                 type: integer
 *                 example: 180
 *               previewUrl:
 *                 type: string
 *                 example: preview.mp3
 *               fullUrl:
 *                 type: string
 *                 example: full.mp3
 *               cover_art_url:
 *                 type: string
 *                 example: cover.jpg
 *               tags:
 *                 type: string
 *                 example: afrobeat,dance,uptempo
 *               licenses:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     license_id:
 *                       type: integer
 *                     price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Beat uploaded successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Upload failed
 */
app.post('/api/producer/beats/upload', authenticateToken, requireProducer, (req, res) => {
    const producerId = req.user.id;

    const {
      title,
      genre,
      tempo,
      duration,
      previewUrl,
      fullUrl,
      licenses,
      key,
      bpm,
      cover_art_url,
      tags
    } = req.body;

    if (!title || !Array.isArray(licenses) || licenses.length === 0) {
      return res.status(400).json({
        error: 'Title and at least one license are required'
      });
    }

    db.serialize(() => {
      db.run(
        `
        INSERT INTO beats (
          producer_id,
          title,
          genre,
          tempo,
          key,
          bpm,
          duration,
          preview_url,
          full_url,
          cover_art_url,
          tags,
          is_active,
          status,
          dispute_status,
          moderation_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'enabled', 'clean', 'clean')
        `,
        [
          producerId,
          title,
          genre,
          tempo,
          key,
          bpm,
          duration,
          previewUrl,
          fullUrl,
          cover_art_url,
          tags
        ],
        function (err) {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to create beat' });
          }

          const beatId = this.lastID;

          const stmt = db.prepare(`
            INSERT INTO beat_licenses (beat_id, license_id, price)
            VALUES (?, ?, ?)
          `);

          licenses.forEach(l => {
            stmt.run(beatId, l.license_id, l.price);
          });

          stmt.finalize(err => {
            if (err) {
              console.error(err);
              return res
                .status(500)
                .json({ error: 'Failed to attach licenses' });
            }

            // 🔁 FETCH licenses back
            db.all(
              `
              SELECT
                bl.license_id,
                l.name,
                l.description,
                l.usage_rights,
                bl.price
              FROM beat_licenses bl
              JOIN licenses l ON bl.license_id = l.id
              WHERE bl.beat_id = ?
              `,
              [beatId],
              (err, attachedLicenses) => {
                if (err)
                  return res
                    .status(500)
                    .json({ error: 'Failed to fetch licenses' });

                res.status(201).json({
                  message: 'Beat uploaded successfully',
                  beat: {
                    id: beatId,
                    title,
                    genre,
                    tempo,
                    key,
                    bpm,
                    duration,
                    preview_url: previewUrl,
                    full_url: fullUrl,
                    cover_art_url,
                    tags,
                    licenses: attachedLicenses
                  }
                });
              }
            );
          });
        }
      );
    });
  }
);

/**
 * @swagger
 * /api/producer/beats/{id}:
 *   put:
 *     summary: Update an existing beat
 *     tags: [Producer]
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
 *             properties:
 *               title:
 *                 type: string
 *               genre:
 *                 type: string
 *               tempo:
 *                 type: integer
 *               key:
 *                 type: string
 *               bpm:
 *                 type: integer
 *               duration:
 *                 type: integer
 *               previewUrl:
 *                 type: string
 *               fullUrl:
 *                 type: string
 *               cover_art_url:
 *                 type: string
 *               tags:
 *                 type: string
 *               licenses:
 *                 type: array
 *                 description: Can only update if beat has no purchases
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Beat updated successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not your beat or has purchases (licenses)
 *       404:
 *         description: Beat not found
 *       500:
 *         description: Update failed
 */
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

/**
 * @swagger
 * /api/producer/beats:
 *   get:
 *     summary: Get all beats for logged-in producer
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of producer's beats with licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 beats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       genre:
 *                         type: string
 *                       is_active:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       licenses:
 *                         type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Database error
 */
app.get('/api/producer/beats', authenticateToken, requireProducer, (req, res) => {
    const producerId = req.user.id;

    const query = `
      SELECT
        b.id AS beat_id,
        b.title,
        b.genre,
        b.tempo,
        b.duration,
        b.preview_url,
        b.full_url,
        b.created_at,
        b.is_active,
        b.status,
        b.dispute_status,
        b.moderation_status,
        b.key,
        b.bpm,
        b.cover_art_url,
        b.tags,

        l.id AS license_id,
        l.name AS license_name,
        l.usage_rights,
        bl.price
      FROM beats b
      LEFT JOIN beat_licenses bl ON bl.beat_id = b.id
      LEFT JOIN licenses l ON bl.license_id = l.id
      WHERE b.producer_id = ?
      ORDER BY b.created_at DESC
    `;

    db.all(query, [producerId], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      // 🔁 Group licenses per beat
      const beatsMap = {};

      rows.forEach(row => {
        if (!beatsMap[row.beat_id]) {
          beatsMap[row.beat_id] = {
            id: row.beat_id,
            title: row.title,
            genre: row.genre,
            tempo: row.tempo,
            duration: row.duration,
            preview_url: row.preview_url,
            full_url: row.full_url,
            created_at: row.created_at,
            is_active: row.is_active,
            status: row.status,
            dispute_status: row.dispute_status,
            moderation_status: row.moderation_status,
            key: row.key,
            bpm: row.bpm,
            cover_art_url: row.cover_art_url,
            tags: row.tags,
            licenses: []
          };
        }

        if (row.license_id) {
          beatsMap[row.beat_id].licenses.push({
            license_id: row.license_id,
            name: row.license_name,
            usage_rights: row.usage_rights,
            price: row.price
          });
        }
      });

      res.json({
        total: Object.keys(beatsMap).length,
        beats: Object.values(beatsMap)
      });
    });
  }
);

/**
 * @swagger
 * /api/producer/dashboard:
 *   get:
 *     summary: Get producer financial dashboard
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard financial data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sales:
 *                   type: integer
 *                   description: Total number of sales
 *                 gross_revenue:
 *                   type: number
 *                   description: Total revenue before commission
 *                 total_commission:
 *                   type: number
 *                   description: Platform commission taken
 *                 total_earnings:
 *                   type: number
 *                   description: Total producer earnings
 *                 paid_out:
 *                   type: number
 *                   description: Amount already withdrawn
 *                 available_for_withdrawal:
 *                   type: number
 *                   description: Amount available to withdraw now
 *                 total_on_hold:
 *                   type: number
 *                   description: Amount locked (disputes/time-hold)
 *                 on_hold:
 *                   type: array
 *                   description: Details of held purchases
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Database error
 */
app.get('/api/producer/dashboard', authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;

  // 1️⃣ Aggregate lifetime sales + earnings
  const summaryQuery = `
    SELECT
      COUNT(p.id) AS total_sales,
      COALESCE(SUM(p.price), 0) AS gross_revenue,
      COALESCE(SUM(p.commission), 0) AS total_commission,
      COALESCE(SUM(p.seller_earnings), 0) AS total_earnings
    FROM purchases p
    JOIN beats b ON b.id = p.beat_id
    WHERE b.producer_id = ?
  `;

  // 2️⃣ Total amount already withdrawn (amount-based, not purchase-based)
  const paidOutQuery = `
    SELECT COALESCE(SUM(w.amount), 0) AS paid_out
    FROM withdrawals w
    WHERE w.producer_id = ?
      AND w.status = 'paid'
  `;

  // 3️⃣ Purchases currently on hold (time-locked or disputed)
  const heldQuery = `
    SELECT
      p.id AS purchase_id,
      p.seller_earnings,
      p.flag_reason,
      p.hold_until,
      CASE
        WHEN p.hold_until IS NOT NULL
        THEN JULIANDAY(p.hold_until) - JULIANDAY(CURRENT_TIMESTAMP)
        ELSE NULL
      END AS days_until_release
    FROM purchases p
    JOIN beats b ON b.id = p.beat_id
    WHERE b.producer_id = ?
      AND (
        p.refund_status = 'disputed'
        OR (p.hold_until IS NOT NULL AND p.hold_until > CURRENT_TIMESTAMP)
      )
    ORDER BY p.hold_until ASC
  `;

  db.get(summaryQuery, [producerId], (err, summary) => {
    if (err) {
      console.error('DASHBOARD SUMMARY ERROR:', err.message);
      return res.status(500).json({ error: 'Failed to load dashboard summary' });
    }

    db.get(paidOutQuery, [producerId], (err2, paidRow) => {
      if (err2) {
        console.error('DASHBOARD PAID OUT ERROR:', err2.message);
        return res.status(500).json({ error: 'Failed to load withdrawals' });
      }

      db.all(heldQuery, [producerId], (err3, heldPurchases) => {
        if (err3) {
          console.error('DASHBOARD HOLD ERROR:', err3.message);
          return res.status(500).json({ error: 'Failed to load held funds' });
        }

        const totalOnHold = heldPurchases.reduce(
          (sum, p) => sum + p.seller_earnings,
          0
        );

        // ✅ SINGLE SOURCE OF TRUTH
        const availableForWithdrawal =
          summary.total_earnings -
          paidRow.paid_out -
          totalOnHold;

        res.json({
          total_sales: summary.total_sales,
          gross_revenue: summary.gross_revenue,
          total_commission: summary.total_commission,
          total_earnings: summary.total_earnings,
          paid_out: paidRow.paid_out,
          available_for_withdrawal: Math.max(0, availableForWithdrawal),
          on_hold: heldPurchases,
          total_on_hold: totalOnHold
        });
      });
    });
  });
});

/**
 * @swagger
 * /api/producer/sales:
 *   get:
 *     summary: Get detailed sales history
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all sales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   purchase_id:
 *                     type: integer
 *                   beat_id:
 *                     type: integer
 *                   beat_title:
 *                     type: string
 *                   buyer_email:
 *                     type: string
 *                   license_name:
 *                     type: string
 *                   paid_price:
 *                     type: number
 *                   commission:
 *                     type: number
 *                   seller_earnings:
 *                     type: number
 *                   payout_status:
 *                     type: string
 *                   refund_status:
 *                     type: string
 *                   purchased_at:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Database error
 */
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

      p.payout_status,
      p.refund_status,
      p.withdrawal_id,

      p.purchased_at
    FROM purchases p
    JOIN beats b ON b.id = p.beat_id
    JOIN users u ON u.id = p.buyer_id
    JOIN licenses l ON l.id = p.license_id
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

/**
 * @swagger
 * /api/producer/sales/summary:
 *   get:
 *     summary: Get sales summary statistics
 *     tags: [Producer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sales summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sales:
 *                   type: integer
 *                 gross_revenue:
 *                   type: number
 *                 total_commission:
 *                   type: number
 *                 total_earnings:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Database error
 */
app.get('/api/producer/sales/summary', authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;

  const query = `
    SELECT 
      COUNT(p.id) AS total_sales,
      COALESCE(SUM(p.price), 0) AS gross_revenue,
      COALESCE(SUM(p.commission), 0) AS total_commission,
      COALESCE(SUM(p.seller_earnings), 0) AS total_earnings
    FROM purchases p
    JOIN beats b ON b.id = p.beat_id
    WHERE b.producer_id = ?
      AND p.refund_status != 'refunded'
  `;

  db.get(query, [producerId], (err, row) => {
    if (err) {
      console.error('PRODUCER SALES SUMMARY ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(row);
  });
});

/**
 * @swagger
 * /api/producer/withdrawals:
 *   post:
 *     summary: Request withdrawal of available funds
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
 *                 minimum: 0.01
 *                 example: 500.00
 *                 description: Amount to withdraw (must not exceed available funds)
 *     responses:
 *       200:
 *         description: Withdrawal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 withdrawal:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     purchases_linked:
 *                       type: integer
 *                     available_before:
 *                       type: number
 *                     available_after:
 *                       type: number
 *       400:
 *         description: Insufficient funds or invalid amount
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Producer access only
 *       500:
 *         description: Withdrawal failed
 */
app.post('/api/producer/withdrawals', authenticateToken, requireProducer, (req, res) => {
  const producerId = req.user.id;
  const requestedAmount = Number(req.body.amount);

  if (!requestedAmount || requestedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }

  // ✅ STEP 1: Calculate available funds using SAME logic as dashboard
  const summaryQuery = `
    SELECT
      COALESCE(SUM(p.seller_earnings), 0) AS total_earnings
    FROM purchases p
    JOIN beats b ON b.id = p.beat_id
    WHERE b.producer_id = ?
  `;

  const paidOutQuery = `
    SELECT COALESCE(SUM(w.amount), 0) AS paid_out
    FROM withdrawals w
    WHERE w.producer_id = ?
      AND w.status = 'paid'
  `;

  const heldQuery = `
    SELECT COALESCE(SUM(p.seller_earnings), 0) AS total_on_hold
    FROM purchases p
    JOIN beats b ON b.id = p.beat_id
    WHERE b.producer_id = ?
      AND (
        p.refund_status = 'disputed'
        OR (p.hold_until IS NOT NULL AND p.hold_until > CURRENT_TIMESTAMP)
      )
  `;

  db.get(summaryQuery, [producerId], (err, summary) => {
    if (err) {
      console.error('WITHDRAWALS SUMMARY ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    db.get(paidOutQuery, [producerId], (err2, paidRow) => {
      if (err2) {
        console.error('WITHDRAWALS PAID OUT ERROR:', err2.message);
        return res.status(500).json({ error: 'Database error' });
      }

      db.get(heldQuery, [producerId], (err3, heldRow) => {
        if (err3) {
          console.error('WITHDRAWALS HELD ERROR:', err3.message);
          return res.status(500).json({ error: 'Database error' });
        }

        // ✅ SINGLE SOURCE OF TRUTH - matches dashboard exactly
        const availableForWithdrawal = Math.max(
          0,
          summary.total_earnings - paidRow.paid_out - heldRow.total_on_hold
        );

        // ✅ Validate requested amount
        if (requestedAmount > availableForWithdrawal) {
          return res.status(400).json({
            error: 'Insufficient available funds',
            requested: requestedAmount,
            available: availableForWithdrawal
          });
        }

        // ✅ STEP 2: Get eligible purchases to link (for record-keeping)
        const eligibleQuery = `
          SELECT
            p.id,
            p.seller_earnings
          FROM purchases p
          JOIN beats b ON p.beat_id = b.id
          WHERE b.producer_id = ?
            AND p.refund_status != 'disputed'
            AND (p.hold_until IS NULL OR p.hold_until <= CURRENT_TIMESTAMP)
            AND p.withdrawal_id IS NULL
          ORDER BY p.purchased_at ASC
        `;

        db.all(eligibleQuery, [producerId], (err4, purchases) => {
          if (err4) {
            console.error('WITHDRAWALS ELIGIBLE ERROR:', err4.message);
            return res.status(500).json({ error: 'Database error' });
          }

          // ✅ STEP 3: Select purchases to cover withdrawal amount
          let runningTotal = 0;
          const selectedPurchases = [];

          for (const p of purchases) {
            if (runningTotal >= requestedAmount) break;
            runningTotal += p.seller_earnings;
            selectedPurchases.push(p);
          }

          // 🔒 Safety check: ensure we have purchases to link
          if (selectedPurchases.length === 0) {
            return res.status(500).json({
              error: 'No eligible purchases found to link to withdrawal'
            });
          }

          // ✅ STEP 4: Create withdrawal record
          db.run(
            `INSERT INTO withdrawals (producer_id, amount, status)
             VALUES (?, ?, 'paid')`,
            [producerId, requestedAmount],
            function (err5) {
              if (err5) {
                console.error('WITHDRAWALS INSERT ERROR:', err5.message);
                return res.status(500).json({ error: 'Failed to create withdrawal' });
              }

              const withdrawalId = this.lastID;
              const purchaseIds = selectedPurchases.map(p => p.id);
              const placeholders = purchaseIds.map(() => '?').join(',');

              // ✅ STEP 5: Link selected purchases to withdrawal
              db.run(
                `UPDATE purchases
                 SET
                   withdrawal_id = ?,
                   payout_status = 'paid',
                   paid_at = CURRENT_TIMESTAMP
                 WHERE id IN (${placeholders})`, // derived from array length
                [withdrawalId, ...purchaseIds],
                (err6) => {
                  if (err6) {
                    console.error('WITHDRAWALS UPDATE ERROR:', err6.message);
                    return res.status(500).json({ error: 'Failed to link purchases' });
                  }

                  res.json({
                    message: 'Withdrawal successfully',
                    withdrawal: {
                      id: withdrawalId,
                      amount: requestedAmount,
                      status: 'paid',
                      purchases_linked: purchaseIds.length,
                      available_before: availableForWithdrawal,
                      available_after: availableForWithdrawal - requestedAmount
                    }
                  });
                }
              );
            }
          );
        });
      });
    });
  });
});

/**
 * @swagger
 * /api/producer/beats/{id}/status:
 *   put:
 *     summary: Enable or disable a beat (producer self-moderation)
 *     tags: [Producer]
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
 *                 enum: [enabled, disabled]
 *                 example: disabled
 *     responses:
 *       200:
 *         description: Beat status updated
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Not your beat
 *       404:
 *         description: Beat not found
 *       500:
 *         description: Update failed
 */
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


// ==========================================
// ADMIN ROUTES
// ==========================================

/**
 * @swagger
 * /api/admin/licenses:
 *   post:
 *     summary: Create a new global license template
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Exclusive Plus
 *               description:
 *                 type: string
 *                 example: Premium exclusive rights with distribution
 *               usage_rights:
 *                 type: string
 *                 example: Full ownership, unlimited distribution
 *     responses:
 *       201:
 *         description: License created
 *       400:
 *         description: License name must be unique
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Creation failed
 */
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

/**
 * @swagger
 * /api/admin/licenses/{id}:
 *   put:
 *     summary: Update a license template (if not used by any beat)
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
 *         description: License updated
 *       400:
 *         description: Cannot update - already used by beats
 *       404:
 *         description: License not found
 *       500:
 *         description: Update failed
 */
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

/**
 * @swagger
 * /api/admin/licenses:
 *   get:
 *     summary: Get all license templates
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   usage_rights:
 *                     type: string
 *                   created_at:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   producer_id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   genre:
 *                     type: string
 *                   is_active:
 *                     type: integer
 *                   status:
 *                     type: string
 *                   created_at:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
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
 *                 example: banned
 *     responses:
 *       200:
 *         description: Beat status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Beat not found
 *       500:
 *         description: Update failed
 */
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

/**
 * @swagger
 * /api/admin/withdrawals:
 *   get:
 *     summary: View all producer withdrawals (admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [paid, unpaid, blocked, cancelled]
 *         description: Filter by withdrawal status
 *       - in: query
 *         name: producer_id
 *         schema:
 *           type: integer
 *         description: Filter by specific producer
 *     responses:
 *       200:
 *         description: List of all withdrawals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   producer_id:
 *                     type: integer
 *                   producer_email:
 *                     type: string
 *                   producer_name:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   status:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                   purchase_count:
 *                     type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
app.get('/api/admin/withdrawals', authenticateToken, requireAdmin, (req, res) => {
  const { status, producer_id } = req.query;

  // Base query to get all withdrawals with producer details
  let query = `
    SELECT 
      w.id,
      w.producer_id,
      w.amount,
      w.status,
      w.created_at,
      u.email AS producer_email,
      u.display_name AS producer_name,
      (
        SELECT COUNT(*) 
        FROM purchases p 
        WHERE p.withdrawal_id = w.id
      ) AS purchase_count
    FROM withdrawals w
    JOIN users u ON u.id = w.producer_id
    WHERE 1=1
  `;

  const params = [];

  // Optional filters
  if (status) {
    query += ' AND w.status = ?';
    params.push(status);
  }

  if (producer_id) {
    query += ' AND w.producer_id = ?';
    params.push(Number(producer_id));
  }

  query += ' ORDER BY w.created_at DESC';

  db.all(query, params, (err, withdrawals) => {
    if (err) {
      console.error('ADMIN WITHDRAWALS ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(withdrawals);
  });
});

/**
 * @swagger
 * /api/admin/disputes/{purchaseId}/resolve:
 *   put:
 *     summary: Resolve a purchase dispute
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: purchaseId
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
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [reject, approve, resolve]
 *                 description: |
 *                   **reject**: Dismiss buyer complaint (invalid) - release funds
 *                   
 *                   **approve**: Valid complaint - producer must fix - keep funds locked
 *                   
 *                   **resolve**: Producer fixed issue - release funds
 *                 example: approve
 *               note:
 *                 type: string
 *                 example: File was corrupted, producer must re-upload
 *     responses:
 *       200:
 *         description: Dispute resolved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 purchase_id:
 *                   type: integer
 *                 action:
 *                   type: string
 *                 amount_released:
 *                   type: number
 *       400:
 *         description: Invalid action or purchase not disputed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       404:
 *         description: Purchase not found
 */
app.put('/api/admin/disputes/:purchaseId/resolve', authenticateToken, requireAdmin, (req, res) => {
  const purchaseId = Number(req.params.purchaseId);
  const { action, note } = req.body;

  if (!['reject', 'approve', 'resolve'].includes(action)) {
    return res.status(400).json({ 
      error: 'Invalid action. Use "reject", "approve", or "resolve"' 
    });
  }

  db.get(
    `SELECT 
      p.id,
      p.buyer_id,
      p.seller_earnings,
      p.payout_status,
      p.refund_status,
      p.withdrawal_id,
      p.flag_reason,
      b.producer_id,
      b.title AS beat_title,
      u.email AS buyer_email,
      u.display_name AS buyer_name
    FROM purchases p
    JOIN beats b ON b.id = p.beat_id
    JOIN users u ON u.id = p.buyer_id
    WHERE p.id = ?
      AND (p.refund_status = 'disputed' OR p.refund_status = 'pending_resolution')`,
    [purchaseId],
    async (err, purchase) => {
      if (err) {
        console.error('DISPUTE FETCH ERROR:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!purchase) {
        return res.status(404).json({ 
          error: 'No active dispute found for this purchase' 
        });
      }

      if (purchase.withdrawal_id !== null) {
        return res.status(400).json({ 
          error: 'This purchase has already been withdrawn and cannot be modified' 
        });
      }

      // ❌ ACTION: REJECT
      if (action === 'reject') {
        db.run(
          `UPDATE purchases
           SET refund_status = 'none', flag_reason = NULL, hold_until = NULL, admin_note = ?
           WHERE id = ?`,
          [note || 'Dispute rejected - no valid reason found', purchaseId],
          async (err2) => {
            if (err2) {
              console.error('DISPUTE REJECT ERROR:', err2.message);
              return res.status(500).json({ error: 'Failed to reject dispute' });
            }

            // ✅ NOTIFY BUYER (dispute rejected)
            try {
              await createNotification(
                purchase.buyer_id,
                'dispute_rejected',
                'Dispute Rejected',
                `Your dispute for "${purchase.beat_title}" was rejected. ${note || 'No valid reason found.'}`,
                purchaseId,
                'purchase'
              );
            } catch (notifErr) {
              console.error('Buyer notification failed:', notifErr.message);
            }

            // ✅ NOTIFY PRODUCER (funds released)
            try {
              await createNotification(
                purchase.producer_id,
                'dispute_rejected',
                'Dispute Dismissed - Funds Released',
                `Dispute for "${purchase.beat_title}" was dismissed. $${purchase.seller_earnings} is now available for withdrawal.`,
                purchaseId,
                'purchase'
              );
            } catch (notifErr) {
              console.error('Producer notification failed:', notifErr.message);
            }

            res.json({
              message: 'Dispute rejected. Funds released to producer.',
              purchase_id: purchaseId,
              action: 'rejected',
              amount_released: purchase.seller_earnings
            });
          }
        );
        return;
      }

      // ⚠️ ACTION: APPROVE
      if (action === 'approve') {
        if (purchase.refund_status === 'pending_resolution') {
          return res.status(400).json({ 
            error: 'Dispute already approved and awaiting producer resolution' 
          });
        }

        db.run(
          `UPDATE purchases
           SET refund_status = 'pending_resolution', admin_note = ?
           WHERE id = ?`,
          [note || 'Dispute approved - producer must resolve issue', purchaseId],
          async (err3) => {
            if (err3) {
              console.error('DISPUTE APPROVE ERROR:', err3.message);
              return res.status(500).json({ error: 'Failed to approve dispute' });
            }

            // ✅ NOTIFY PRODUCER (must fix)
            try {
              await createNotification(
                purchase.producer_id,
                'dispute_approved',
                '⚠️ Action Required: Dispute Approved',
                `A dispute for "${purchase.beat_title}" has been approved. Issue: ${purchase.flag_reason}. You must resolve this issue. $${purchase.seller_earnings} is on hold.`,
                purchaseId,
                'purchase'
              );
            } catch (notifErr) {
              console.error('Producer notification failed:', notifErr.message);
            }

            // ✅ NOTIFY BUYER (approved)
            try {
              await createNotification(
                purchase.buyer_id,
                'dispute_approved',
                'Dispute Approved',
                `Your dispute for "${purchase.beat_title}" has been approved. The producer has been notified to fix the issue.`,
                purchaseId,
                'purchase'
              );
            } catch (notifErr) {
              console.error('Buyer notification failed:', notifErr.message);
            }

            res.json({
              message: 'Dispute approved. Producer notified to fix the issue.',
              purchase_id: purchaseId,
              action: 'approved',
              status: 'pending_resolution',
              amount_held: purchase.seller_earnings,
              buyer_complaint: purchase.flag_reason
            });
          }
        );
        return;
      }

      // ✅ ACTION: RESOLVE
      if (action === 'resolve') {
        if (purchase.refund_status !== 'pending_resolution') {
          return res.status(400).json({ 
            error: 'This purchase is not in pending_resolution state. Approve the dispute first.' 
          });
        }

        db.run(
          `UPDATE purchases
           SET refund_status = 'none', flag_reason = NULL, hold_until = NULL, admin_note = ?
           WHERE id = ?`,
          [note || 'Issue resolved - funds released', purchaseId],
          async (err4) => {
            if (err4) {
              console.error('DISPUTE RESOLVE ERROR:', err4.message);
              return res.status(500).json({ error: 'Failed to resolve dispute' });
            }

            // ✅ NOTIFY PRODUCER (resolved - funds released)
            try {
              await createNotification(
                purchase.producer_id,
                'dispute_resolved',
                '✅ Dispute Resolved - Funds Released',
                `The dispute for "${purchase.beat_title}" has been resolved. $${purchase.seller_earnings} is now available for withdrawal.`,
                purchaseId,
                'purchase'
              );
            } catch (notifErr) {
              console.error('Producer notification failed:', notifErr.message);
            }

            // ✅ NOTIFY BUYER (resolved)
            try {
              await createNotification(
                purchase.buyer_id,
                'dispute_resolved',
                'Dispute Resolved',
                `The dispute for "${purchase.beat_title}" has been resolved. Thank you for your patience.`,
                purchaseId,
                'purchase'
              );
            } catch (notifErr) {
              console.error('Buyer notification failed:', notifErr.message);
            }

            res.json({
              message: 'Dispute resolved. Funds released to producer.',
              purchase_id: purchaseId,
              action: 'resolved',
              amount_released: purchase.seller_earnings
            });
          }
        );
        return;
      }
    }
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sales:
 *                   type: integer
 *                 gross_revenue:
 *                   type: number
 *                 total_commission:
 *                   type: number
 *                 total_producer_earnings:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
app.get('/api/admin/sales/summary', authenticateToken, requireAdmin, (req, res) => {
  const query = `
    SELECT 
      COUNT(p.id) AS total_sales,
      COALESCE(SUM(p.price), 0) AS gross_revenue,
      COALESCE(SUM(p.commission), 0) AS total_commission,
      COALESCE(SUM(p.seller_earnings), 0) AS total_producer_earnings
    FROM purchases p
    WHERE p.refund_status != 'refunded'
  `;

  db.get(query, [], (err, row) => {
    if (err) {
      console.error('SALES SUMMARY ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(row);
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_sales:
 *                   type: integer
 *                 gross_revenue:
 *                   type: number
 *                 total_commission:
 *                   type: number
 *                 total_producer_earnings:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access only
 *       500:
 *         description: Database error
 */
app.get('/api/admin/analytics', authenticateToken, requireAdmin, (req, res) => {

  const analyticsQuery = `
    SELECT
      COUNT(p.id) AS total_sales,
      COALESCE(SUM(p.price), 0) AS gross_revenue,
      COALESCE(SUM(p.commission), 0) AS total_commission,
      COALESCE(SUM(p.seller_earnings), 0) AS total_paid_to_producers,

      -- Total actually paid out (cash)
      (
        SELECT COALESCE(SUM(w.amount), 0)
        FROM withdrawals w
        WHERE w.status = 'paid'
      ) AS paid_out,

      -- Earnings not yet paid (includes blocked)
      COALESCE(SUM(
        CASE
          WHEN p.payout_status = 'unpaid'
            AND p.refund_status != 'refunded'
          THEN p.seller_earnings
          ELSE 0
        END
      ), 0) AS pending_payouts

    FROM purchases p
  `;

  db.get(analyticsQuery, [], (err, stats) => {
    if (err) {
      console.error('ANALYTICS ERROR:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      total_sales: stats.total_sales,
      gross_revenue: stats.gross_revenue,
      total_commission: stats.total_commission,
      total_paid_to_producers: stats.total_paid_to_producers,
      paid_out: stats.paid_out,
      pending_payouts: stats.pending_payouts
    });
  });
});


// ==========================================
// NOTIFICATIONS ROUTES
// ==========================================

// ==========================================
// GET NOTIFICATIONS (ALL USERS)
// ==========================================

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for logged-in user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT 
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
     LIMIT 50`,
    [userId],
    (err, notifications) => {
      if (err) {
        console.error('NOTIFICATIONS FETCH ERROR:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      // Count unread
      const unread = notifications.filter(n => n.is_read === 0).length;

      res.json({
        notifications,
        unread_count: unread
      });
    }
  );
});

// ==========================================
// 5. MARK NOTIFICATION AS READ
// ==========================================

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const notificationId = Number(req.params.id);
  const userId = req.user.id;

  db.run(
    `UPDATE notifications 
     SET is_read = 1 
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId],
    function (err) {
      if (err) {
        console.error('MARK READ ERROR:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ message: 'Notification marked as read' });
    }
  );
});

// ==========================================
// MARK ALL NOTIFICATIONS AS READ
// ==========================================

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
app.put('/api/notifications/read-all', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.run(
    `UPDATE notifications 
     SET is_read = 1 
     WHERE user_id = ? AND is_read = 0`,
    [userId],
    function (err) {
      if (err) {
        console.error('MARK ALL READ ERROR:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ 
        message: 'All notifications marked as read',
        count: this.changes
      });
    }
  );
});

// ==========================================
// DELETE NOTIFICATION
// ==========================================

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
app.delete('/api/notifications/:id', authenticateToken, (req, res) => {
  const notificationId = Number(req.params.id);
  const userId = req.user.id;

  db.run(
    `DELETE FROM notifications 
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId],
    function (err) {
      if (err) {
        console.error('DELETE NOTIFICATION ERROR:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ message: 'Notification deleted' });
    }
  );
});

// ==========================================
// GET UNREAD COUNT (FOR BADGE)
// ==========================================

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
app.get('/api/notifications/unread-count', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE user_id = ? AND is_read = 0`,
    [userId],
    (err, row) => {
      if (err) {
        console.error('UNREAD COUNT ERROR:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ unread_count: row.count });
    }
  );
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

