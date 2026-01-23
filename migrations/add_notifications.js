import sqlite3 from 'sqlite3';
import path from 'path';

const sqlite = sqlite3.verbose();
const dbPath = path.join(path.resolve(), 'src', 'backend', 'db', 'sqlite.db');
const db = new sqlite.Database(dbPath);

console.log('📬 Creating notifications table...');

db.run(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reference_id INTEGER,
    reference_type TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`, (err) => {
  if (err) {
    console.error('❌ Error:', err.message);
  } else {
    console.log('✅ Notifications table created');
  }
  db.close();
});