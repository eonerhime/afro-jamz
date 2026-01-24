import sqlite3 from "sqlite3";
import { open } from "sqlite";

console.log("Opening database...");
const db = await open({
  filename: "./db/sqlite.db",
  driver: sqlite3.Database,
});

// Check current data
console.log("\nCurrent beats:");
const currentBeats = await db.all(
  "SELECT id, title, preview_url, full_url FROM beats",
);
console.table(currentBeats);

// Update audio paths for the 3 beats by ID
console.log("\nUpdating beats...");
const result1 = await db.run(
  "UPDATE beats SET preview_url = ?, full_url = ? WHERE id = ?",
  ["/uploads/midnight-groove.mp3", "/uploads/midnight-groove.mp3", 1],
);
console.log(`Updated beat 1: ${result1.changes} rows changed`);

const result2 = await db.run(
  "UPDATE beats SET preview_url = ?, full_url = ? WHERE id = ?",
  ["/uploads/sunset-vibes.mp3", "/uploads/sunset-vibes.mp3", 2],
);
console.log(`Updated beat 2: ${result2.changes} rows changed`);

const result3 = await db.run(
  "UPDATE beats SET preview_url = ?, full_url = ? WHERE id = ?",
  ["/uploads/dance-fever.mp3", "/uploads/dance-fever.mp3", 3],
);
console.log(`Updated beat 3: ${result3.changes} rows changed`);

// Verify updates
const beats = await db.all("SELECT id, title, preview_url FROM beats");
console.log("Updated beats:");
console.table(beats);

await db.close();
