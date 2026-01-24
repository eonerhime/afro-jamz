import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "src/backend/db/sqlite.db");
const sqlite = sqlite3.verbose();

const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    process.exit(1);
  }

  db.all("SELECT id, title, cover_art_url FROM beats", [], (err, rows) => {
    if (err) {
      console.error("Query error:", err);
    } else {
      console.log("Beats in database:");
      console.log(JSON.stringify(rows, null, 2));
    }

    db.close();
  });
});
