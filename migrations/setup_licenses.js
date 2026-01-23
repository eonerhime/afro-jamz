import sqlite3 from 'sqlite3';
import path from 'path';

const sqlite = sqlite3.verbose();
const dbPath = path.join(path.resolve(), 'src', 'backend', 'db', 'sqlite.db');
const db = new sqlite.Database(dbPath);

console.log('🎵 Setting up licenses...');

db.serialize(() => {
  
  // Step 1: Check if licenses already exist
  db.get('SELECT COUNT(*) AS count FROM licenses', [], (err, row) => {
    if (err) {
      console.error('❌ Error:', err.message);
      db.close();
      return;
    }

    if (row.count > 0) {
      console.log(`⚠️  Found ${row.count} existing licenses.`);
      console.log('Skipping license creation to avoid duplicates.');
      console.log('To reset licenses, manually delete them first.');
      db.close();
      return;
    }

    // Step 2: Insert licenses only if table is empty
    console.log('✅ Licenses table is empty. Inserting standard licenses...');
    
    const licenses = [
      {
        name: 'MP3 Lease',
        description: 'Basic non-exclusive license for personal or limited commercial use',
        usage_rights: 'Up to 2,000 audio streams. Up to 1 music video (up to 100K views). Non-profit performances allowed. MP3 file format. Must credit producer.'
      },
      {
        name: 'WAV Lease',
        description: 'Premium non-exclusive license with higher quality and more distribution',
        usage_rights: 'Up to 10,000 audio streams. Up to 2 music videos (up to 500K views each). Radio play allowed. Paid performances allowed. WAV file format. Must credit producer.'
      },
      {
        name: 'Trackout Lease',
        description: 'Professional non-exclusive license with separated audio stems',
        usage_rights: 'Up to 50,000 audio streams. Up to 5 music videos (up to 2M views each). Radio play allowed. Paid performances allowed. WAV + Individual stems/tracks. Must credit producer.'
      },
      {
        name: 'Unlimited Lease',
        description: 'Non-exclusive license with unlimited distribution rights',
        usage_rights: 'Unlimited audio streams. Unlimited music videos. Radio, TV, and film allowed. Paid performances allowed. WAV + stems. Must credit producer. License never expires.'
      },
      {
        name: 'Exclusive Rights',
        description: 'Full ownership with complete creative and commercial control',
        usage_rights: 'Complete ownership of the beat. Producer removes beat from marketplace. Unlimited usage across all platforms. No producer credit required. All files included (WAV, stems, MIDI if available). Copyright transferred to buyer.'
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO licenses (name, description, usage_rights)
      VALUES (?, ?, ?)
    `);

    licenses.forEach((license, index) => {
      stmt.run(license.name, license.description, license.usage_rights, (err) => {
        if (err) {
          console.error(`❌ Error inserting ${license.name}:`, err.message);
        } else {
          console.log(`✅ Inserted: ${license.name}`);
        }

        // Close DB after last insert
        if (index === licenses.length - 1) {
          stmt.finalize(() => {
            console.log('\n🎉 All licenses created successfully!');
            
            // Verify
            db.all('SELECT id, name FROM licenses ORDER BY id', [], (err, rows) => {
              if (!err) {
                console.log('\n📋 Current licenses:');
                rows.forEach(r => console.log(`  ${r.id}. ${r.name}`));
              }
              db.close();
            });
          });
        }
      });
    });
  });
});