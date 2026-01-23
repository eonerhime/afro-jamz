import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../src/backend/db/sqlite.db");
const db = new Database(dbPath);

console.log("🔄 Starting migration: update_disputes_notifications");

try {
  db.exec("BEGIN TRANSACTION");

  // Check if disputes table exists and get its columns
  const disputesInfo = db.prepare("PRAGMA table_info(disputes)").all();
  const disputesColumns = disputesInfo.map((col) => col.name);

  if (disputesColumns.length === 0) {
    // Table doesn't exist, create it
    console.log("Creating disputes table...");
    db.exec(`
      CREATE TABLE disputes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL,
        raised_by INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'under_review', 'resolved', 'rejected')),
        admin_response TEXT,
        producer_response TEXT,
        resolution TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id),
        FOREIGN KEY (raised_by) REFERENCES users(id)
      )
    `);
    console.log("✅ Disputes table created");
  } else {
    // Table exists, add missing columns
    if (!disputesColumns.includes("admin_response")) {
      console.log("Adding admin_response column to disputes...");
      db.exec("ALTER TABLE disputes ADD COLUMN admin_response TEXT");
      console.log("✅ Added admin_response column");
    }

    if (!disputesColumns.includes("producer_response")) {
      console.log("Adding producer_response column to disputes...");
      db.exec("ALTER TABLE disputes ADD COLUMN producer_response TEXT");
      console.log("✅ Added producer_response column");
    }

    // Note: Cannot modify CHECK constraints in SQLite without recreating table
    // Existing status values should still work
    console.log(
      "ℹ️  Disputes table status check constraint cannot be updated (SQLite limitation)",
    );
  }

  // Check notifications table
  const notificationsInfo = db
    .prepare("PRAGMA table_info(notifications)")
    .all();
  const notificationsColumns = notificationsInfo.map((col) => col.name);

  if (notificationsColumns.length === 0) {
    // Table doesn't exist, create it
    console.log("Creating notifications table...");
    db.exec(`
      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        reference_id INTEGER,
        reference_type TEXT,
        is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log("✅ Notifications table created");
  } else {
    // Handle column name changes (read -> is_read, related_* -> reference_*)
    if (
      notificationsColumns.includes("read") &&
      !notificationsColumns.includes("is_read")
    ) {
      console.log("Renaming read column to is_read...");
      // SQLite doesn't support RENAME COLUMN before version 3.25.0
      // Need to recreate table
      db.exec(`
        CREATE TABLE notifications_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          reference_id INTEGER,
          reference_type TEXT,
          is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Copy data, mapping old column names
      const hasRelatedId = notificationsColumns.includes("related_id");
      const hasRelatedType = notificationsColumns.includes("related_type");

      if (hasRelatedId && hasRelatedType) {
        db.exec(`
          INSERT INTO notifications_new (id, user_id, type, title, message, reference_id, reference_type, is_read, created_at)
          SELECT id, user_id, type, title, message, related_id, related_type, read, created_at
          FROM notifications
        `);
      } else {
        db.exec(`
          INSERT INTO notifications_new (id, user_id, type, title, message, is_read, created_at)
          SELECT id, user_id, type, title, message, read, created_at
          FROM notifications
        `);
      }

      db.exec("DROP TABLE notifications");
      db.exec("ALTER TABLE notifications_new RENAME TO notifications");
      console.log("✅ Notifications table updated");
    } else if (
      notificationsColumns.includes("related_id") &&
      !notificationsColumns.includes("reference_id")
    ) {
      console.log("Renaming related_* columns to reference_*...");
      db.exec(`
        CREATE TABLE notifications_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          reference_id INTEGER,
          reference_type TEXT,
          is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      const isReadCol = notificationsColumns.includes("is_read")
        ? "is_read"
        : "read";
      db.exec(`
        INSERT INTO notifications_new (id, user_id, type, title, message, reference_id, reference_type, is_read, created_at)
        SELECT id, user_id, type, title, message, related_id, related_type, ${isReadCol}, created_at
        FROM notifications
      `);

      db.exec("DROP TABLE notifications");
      db.exec("ALTER TABLE notifications_new RENAME TO notifications");
      console.log("✅ Notifications table updated");
    } else {
      console.log("ℹ️  Notifications table already up to date");
    }
  }

  db.exec("COMMIT");
  console.log("✅ Migration completed successfully");
} catch (error) {
  db.exec("ROLLBACK");
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
} finally {
  db.close();
}
