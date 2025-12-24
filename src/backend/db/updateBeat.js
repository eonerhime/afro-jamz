import sqlite3 from 'sqlite3';
const sqlite = sqlite3.verbose();
import path from 'path';

const dbPath = path.join(path.resolve(), 'src', 'backend', 'db', 'sqlite.db');
const db = new sqlite.Database(dbPath);

db.run(
  "UPDATE beats SET full_url = ?, preview_url = ? WHERE id = ?",
  ['afro-groove.mp3', 'preview.mp3', 4],
  function(err) {
    if (err) return console.error(err.message);
    console.log(`Beat updated successfully, rows affected: ${this.changes}`);
    db.close();
  }
);
