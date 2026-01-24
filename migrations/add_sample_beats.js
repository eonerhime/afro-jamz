import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({
  filename: "src/backend/db/sqlite.db",
  driver: sqlite3.Database,
});

console.log("Adding sample beats...\n");

// First, ensure we have a producer user
let producer = await db.get(
  "SELECT id FROM users WHERE role = 'producer' LIMIT 1",
);

if (!producer) {
  console.log("Creating sample producer...");
  const result = await db.run(
    "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
    ["sample_producer", "producer@afrojamz.com", "hashed_password", "producer"],
  );
  producer = { id: result.lastID };
  console.log(`Created producer with ID: ${producer.id}\n`);
}

// Insert or update the 3 sample beats
const beats = [
  {
    title: "Midnight Groove",
    genre: "Afrobeats",
    tempo: 120,
    duration: 180,
    preview_url: "/uploads/midnight-groove.mp3",
    full_url: "/uploads/midnight-groove.mp3",
    producer_id: producer.id,
  },
  {
    title: "Sunset Vibes",
    genre: "Amapiano",
    tempo: 113,
    duration: 165,
    preview_url: "/uploads/sunset-vibes.mp3",
    full_url: "/uploads/sunset-vibes.mp3",
    producer_id: producer.id,
  },
  {
    title: "Dance Fever",
    genre: "Afrobeats",
    tempo: 128,
    duration: 195,
    preview_url: "/uploads/dance-fever.mp3",
    full_url: "/uploads/dance-fever.mp3",
    producer_id: producer.id,
  },
];

for (const beat of beats) {
  // Check if beat already exists
  const existing = await db.get("SELECT id FROM beats WHERE title = ?", [
    beat.title,
  ]);

  if (existing) {
    // Update existing beat
    await db.run(
      `UPDATE beats SET 
        genre = ?, tempo = ?, duration = ?, preview_url = ?, full_url = ?, producer_id = ?
       WHERE title = ?`,
      [
        beat.genre,
        beat.tempo,
        beat.duration,
        beat.preview_url,
        beat.full_url,
        beat.producer_id,
        beat.title,
      ],
    );
    console.log(`✓ Updated: ${beat.title}`);
  } else {
    // Insert new beat
    await db.run(
      `INSERT INTO beats (title, genre, tempo, duration, preview_url, full_url, producer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        beat.title,
        beat.genre,
        beat.tempo,
        beat.duration,
        beat.preview_url,
        beat.full_url,
        beat.producer_id,
      ],
    );
    console.log(`✓ Created: ${beat.title}`);
  }
}

// Verify the beats
console.log("\nCurrent beats in database:");
const allBeats = await db.all(
  "SELECT id, title, genre, tempo, preview_url FROM beats",
);
console.table(allBeats);

await db.close();
console.log("\n✅ Migration complete!");
