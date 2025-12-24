import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function getDB() {
  return open({
    filename: './src/backend/db/sqlite.db',
    driver: sqlite3.Database
  });
}

// Purchase check helper function
export function hasPurchased(userId, beatId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 1 FROM purchases WHERE buyer_id = ? AND beat_id = ?`,
      [userId, beatId],
      (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      }
    );
  });
}
