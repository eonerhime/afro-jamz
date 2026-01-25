import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../src/backend/db/sqlite.db");
const sqlite = sqlite3.verbose();

const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    process.exit(1);
  }

  console.log("Connected to SQLite database");

  // Add cover_art_url column to beats table
  db.run(`ALTER TABLE beats ADD COLUMN cover_art_url TEXT;`, (err) => {
    if (err) {
      if (err.message.includes("duplicate column name")) {
        console.log("✅ Column cover_art_url already exists");
      } else {
        console.error("❌ Error adding cover_art_url column:", err);
        db.close();
        process.exit(1);
      }
    } else {
      console.log("✅ Successfully added cover_art_url column to beats table");
    }

    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err);
      } else {
        console.log("Database connection closed");
      }
    });
  });
});
