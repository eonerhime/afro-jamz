import sqlite3 from 'sqlite3';
import path from 'path';

const sqlite = sqlite3.verbose();

const dbPath = path.join(path.resolve(), 'src', 'backend', 'db', 'sqlite.db');
console.log('DB path:', dbPath);

const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.all('SELECT * FROM users', (err, rows) => {
  if (err) {
    console.error('Query error:', err.message);
  } else {
    console.log('Users table contents:', rows);
  }
  db.close();
});
