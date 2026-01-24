import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, "../src/backend/db/sqlite.db");
const db = new Database(dbPath);

console.log("🔄 Adding currency support to purchases table...");

try {
  // Add currency column (default USD for existing purchases)
  db.exec(`
    ALTER TABLE purchases ADD COLUMN currency TEXT DEFAULT 'USD';
  `);
  console.log("✅ Added currency column");

  // Add display_amount column (amount in user's selected currency)
  db.exec(`
    ALTER TABLE purchases ADD COLUMN display_amount REAL;
  `);
  console.log("✅ Added display_amount column");

  // Update existing purchases to have display_amount = price (USD)
  db.exec(`
    UPDATE purchases SET display_amount = price WHERE display_amount IS NULL;
  `);
  console.log("✅ Updated existing purchases with display amounts");

  console.log("✨ Migration completed successfully!");
} catch (error) {
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
} finally {
  db.close();
}
