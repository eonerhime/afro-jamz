import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../src/backend/db/sqlite.db');

console.log('🧹 Cleaning database for testing...');
console.log(`Database: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
});

// Disable foreign keys temporarily
db.serialize(() => {
  db.run('PRAGMA foreign_keys = OFF');

  // Delete all data (except licenses)
  const tables = [
    'notifications',
    'disputes',
    'withdrawals',
    'purchases',
    'producer_indemnity',
    'payment_methods',
    'beat_variances',
    'beat_licenses',
    'beats',
    'users'
  ];

  tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, (err) => {
      if (err) {
        console.error(`❌ Error deleting from ${table}:`, err.message);
      } else {
        console.log(`✅ Cleaned ${table} table`);
      }
    });
  });

  // Reset autoincrement counters
  const resetSequence = tables.map(t => `'${t}'`).join(',');
  db.run(`DELETE FROM sqlite_sequence WHERE name IN (${resetSequence})`, (err) => {
    if (err) {
      console.error('❌ Error resetting sequences:', err.message);
    } else {
      console.log('✅ Reset autoincrement counters');
    }
  });

  // Re-enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Verify cleanup
  console.log('\n📊 Verification:');
  
  db.all(`
    SELECT 
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM beats) AS beats,
      (SELECT COUNT(*) FROM beat_licenses) AS beat_licenses,
      (SELECT COUNT(*) FROM beat_variances) AS beat_variances,
      (SELECT COUNT(*) FROM licenses) AS licenses,
      (SELECT COUNT(*) FROM producer_indemnity) AS producer_indemnity,
      (SELECT COUNT(*) FROM purchases) AS purchases,
      (SELECT COUNT(*) FROM payment_methods) AS payment_methods,
      (SELECT COUNT(*) FROM disputes) AS disputes
  `, (err, rows) => {
    if (err) {
      console.error('❌ Error verifying cleanup:', err.message);
    } else {
      const counts = rows[0];
      console.log(`Users: ${counts.users}`);
      console.log(`Beats: ${counts.beats}`);
      console.log(`Beat Licenses: ${counts.beat_licenses}`);
      console.log(`Beat Variances: ${counts.beat_variances}`);
      console.log(`Licenses: ${counts.licenses} (should be 5)`);
      console.log(`Producer Indemnity: ${counts.producer_indemnity}`);
      console.log(`Purchases: ${counts.purchases}`);
      console.log(`Payment Methods: ${counts.payment_methods}`);
      console.log(`Disputes: ${counts.disputes}`);
      console.log(`Withdrawals: ${counts.withdrawals}`);

      if (counts.licenses !== 5) {
        console.warn('\n⚠️  WARNING: Expected 5 licenses, found ' + counts.licenses);
        console.warn('Run migrations to restore default licenses.');
      }
    }

    db.close(() => {
      console.log('\n✅ Database cleanup complete!');
      console.log('You can now run Thunder Client tests.\n');
    });
  });
});
