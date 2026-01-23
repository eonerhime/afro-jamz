import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(path.resolve(), "src", "backend", "db", "sqlite.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
    process.exit(1);
  }
  console.log("Connected to afrojamz database");
});

// Add is_active column to licenses table
db.serialize(() => {
  console.log("Adding is_active column to licenses table...");

  db.run(
    `ALTER TABLE licenses ADD COLUMN is_active BOOLEAN DEFAULT 1`,
    (err) => {
      if (err) {
        if (err.message.includes("duplicate column name")) {
          console.log("✓ Column is_active already exists");
        } else {
          console.error("Error adding is_active column:", err.message);
          process.exit(1);
        }
      } else {
        console.log("✓ Added is_active column to licenses table");
      }
    },
  );

  // Set all existing licenses to active
  db.run(`UPDATE licenses SET is_active = 1 WHERE is_active IS NULL`, (err) => {
    if (err) {
      console.error("Error updating existing licenses:", err.message);
    } else {
      console.log("✓ Set all existing licenses to active");
    }
  });
});

db.close((err) => {
  if (err) {
    console.error("Error closing database:", err.message);
    process.exit(1);
  }
  console.log("\nMigration completed successfully!");
});
