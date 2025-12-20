import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';

import { authenticateToken } from './middleware/auth.middleware.js';
import { JWT_SECRET } from './config/env.js';


const sqlite = sqlite3.verbose();

const app = express();
const PORT = process.env.PORT || 3001;


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

// Routes
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

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role } });
  });
});

// Get beats (public)
app.get('/api/beats', (req, res) => {
  const { search, genre, tempo, producer } = req.query;
  let query = 'SELECT b.*, u.display_name as producer_name FROM beats b JOIN users u ON b.producer_id = u.id WHERE 1=1';
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

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
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

