import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, "../src/backend/db/afrojamz.db"));

console.log("📋 Adding default_price column to licenses table...\n");

try {
  // Add default_price column to licenses table
  console.log("Altering licenses table...");
  db.exec(`
    ALTER TABLE licenses ADD COLUMN default_price REAL NOT NULL DEFAULT 0 CHECK(default_price >= 0)
  `);
  console.log("✅ default_price column added\n");

  // Update existing licenses with default prices
  console.log("Setting default prices for existing licenses...");

  const defaultPrices = {
    Basic: 29.99,
    Premium: 99.99,
    Exclusive: 499.99,
  };

  const updateStmt = db.prepare(
    `UPDATE licenses SET default_price = ? WHERE name = ?`,
  );

  Object.entries(defaultPrices).forEach(([name, price]) => {
    const result = updateStmt.run(price, name);
    if (result.changes > 0) {
      console.log(`  ✓ Set ${name}: $${price}`);
    }
  });

  console.log("\n✅ Migration completed successfully!");
} catch (error) {
  if (error.message.includes("duplicate column name")) {
    console.log("⚠️  Column default_price already exists, skipping...");
  } else {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
} finally {
  db.close();
}
