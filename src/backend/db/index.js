import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global database instance
let db = null;

// Initialize database connection synchronously (callback-based for compatibility)
export function initializeDB() {
  if (db) return db;

  const sqlite = sqlite3.verbose();
  const dbPath = path.join(path.resolve(), 'src', 'backend', 'db', 'sqlite.db');

  db = new sqlite.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to SQLite database.', dbPath);
      
      // Enable foreign key constraints
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (!err) console.log('✅ Foreign keys enabled');
      });
    }
  });

  return db;
}

// Export database instance
export function getDB() {
  if (!db) {
    initializeDB();
  }
  return db;
}

// Purchase check helper function
export function hasPurchased(userId, beatId) {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.get(
      `SELECT 1 FROM purchases WHERE buyer_id = ? AND beat_id = ?`,
      [userId, beatId],
      (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      }
    );
  });
}
