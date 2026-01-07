// migrations/complete_migration.js
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlite = sqlite3.verbose();
const dbPath = path.join(path.resolve(), 'src', 'backend', 'db', 'sqlite.db');

console.log('🔧 Starting database migration...');
console.log('DB Path:', dbPath);

const db = new sqlite.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

db.serialize(() => {
  
  // ==========================================
  // 0. CLEANUP ANY LEFTOVER TEMP TABLES
  // ==========================================
  console.log('\n🧹 Cleaning up any leftover temp tables...');
  
  const cleanupTables = ['users_temp', 'licenses_temp', 'users_new', 'licenses_new'];
  
  cleanupTables.forEach(table => {
    db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
      if (err) {
        console.error(`⚠️  Error dropping ${table}:`, err.message);
      } else {
        console.log(`✅ Cleaned up ${table} (if existed)`);
      }
    });
  });

  // Wait a bit for cleanup to complete
  setTimeout(() => {
    continueMigration();
  }, 500);
});

function continueMigration() {
  console.log('\n🚀 Starting main migration...');
  
  db.serialize(() => {
  
  // ==========================================
  // 1. UPDATE USERS TABLE
  // ==========================================
  console.log('\n📋 Updating users table...');
  
  const userColumns = [
    "ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'",
    "ALTER TABLE users ADD COLUMN oauth_provider_id TEXT",
    "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0"
  ];

  userColumns.forEach(sql => {
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('⚠️  User column error:', err.message);
      } else {
        console.log('✅', sql.substring(0, 60) + '...');
      }
    });
  });

  // Allow NULL password_hash for OAuth users (check if migration needed)
  db.get("PRAGMA table_info(users)", [], (err, row) => {
    if (err) {
      console.error('❌ Error checking users schema:', err.message);
      return;
    }

    // Check if password_hash is nullable
    db.all("PRAGMA table_info(users)", [], (err, columns) => {
      const passwordCol = columns.find(c => c.name === 'password_hash');
      
      if (passwordCol && passwordCol.notnull === 1) {
        console.log('🔄 Migrating users table to allow NULL passwords...');
        
        // Drop existing temp table if it exists
        db.run('DROP TABLE IF EXISTS users_temp', (err) => {
          if (err) console.error('⚠️  Error dropping temp table:', err.message);
          
          db.run(`
            CREATE TABLE users_temp (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT,
              display_name TEXT,
              role TEXT NOT NULL CHECK (role IN ('buyer', 'producer', 'admin')),
              auth_provider TEXT DEFAULT 'local',
              oauth_provider_id TEXT,
              email_verified INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) {
              console.error('❌ Error creating temp users table:', err.message);
              return;
            }

            // Copy data
            db.run(`
              INSERT INTO users_temp (id, email, password_hash, display_name, role, auth_provider, oauth_provider_id, email_verified, created_at, updated_at)
              SELECT id, email, password_hash, display_name, role, 
                     COALESCE(auth_provider, 'local'), 
                     oauth_provider_id, 
                     COALESCE(email_verified, 0), 
                     created_at, updated_at 
              FROM users
            `, (err) => {
              if (err) {
                console.error('❌ Error copying users data:', err.message);
                return;
              }

              // Drop old table
              db.run('DROP TABLE users', (err) => {
                if (err) {
                  console.error('❌ Error dropping old users table:', err.message);
                  return;
                }

                // Rename temp table
                db.run('ALTER TABLE users_temp RENAME TO users', (err) => {
                  if (err) {
                    console.error('❌ Error renaming users table:', err.message);
                  } else {
                    console.log('✅ Users table restructured (NULL passwords allowed)');
                  }
                });
              });
            });
          });
        });
      } else {
        console.log('✅ Users table already allows NULL passwords');
      }
    });
  });

  // ==========================================
  // 2. UPDATE BEATS TABLE
  // ==========================================
  console.log('\n📋 Updating beats table...');
  
  const beatColumns = [
    "ALTER TABLE beats ADD COLUMN key TEXT",
    "ALTER TABLE beats ADD COLUMN bpm INTEGER",
    "ALTER TABLE beats ADD COLUMN cover_art_url TEXT",
    "ALTER TABLE beats ADD COLUMN tags TEXT",
    "ALTER TABLE beats ADD COLUMN is_active INTEGER DEFAULT 1",
    "ALTER TABLE beats ADD COLUMN status TEXT DEFAULT 'enabled'",
    "ALTER TABLE beats ADD COLUMN dispute_status TEXT DEFAULT 'clean'",
    "ALTER TABLE beats ADD COLUMN moderation_status TEXT DEFAULT 'clean'"
  ];

  beatColumns.forEach(sql => {
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('⚠️  Beat column error:', err.message);
      } else {
        console.log('✅', sql.substring(0, 60) + '...');
      }
    });
  });

  // ==========================================
  // 3. UPDATE PURCHASES TABLE
  // ==========================================
  console.log('\n📋 Updating purchases table...');
  
  const purchaseColumns = [
    "ALTER TABLE purchases ADD COLUMN payout_status TEXT DEFAULT 'unpaid'",
    "ALTER TABLE purchases ADD COLUMN paid_at DATETIME",
    "ALTER TABLE purchases ADD COLUMN withdrawal_id INTEGER",
    "ALTER TABLE purchases ADD COLUMN eligible_for_withdrawal INTEGER DEFAULT 0",
    "ALTER TABLE purchases ADD COLUMN hold_until DATETIME",
    "ALTER TABLE purchases ADD COLUMN refund_status TEXT DEFAULT 'none'",
    "ALTER TABLE purchases ADD COLUMN refunded_at DATETIME",
    "ALTER TABLE purchases ADD COLUMN seller_earnings REAL DEFAULT 0",
    "ALTER TABLE purchases ADD COLUMN flag_reason TEXT",
    "ALTER TABLE purchases ADD COLUMN admin_note TEXT"
  ];

  purchaseColumns.forEach(sql => {
    db.run(sql, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('⚠️  Purchase column error:', err.message);
      } else {
        console.log('✅', sql.substring(0, 60) + '...');
      }
    });
  });

  // ==========================================
  // 4. CREATE WITHDRAWALS TABLE
  // ==========================================
  console.log('\n📋 Creating withdrawals table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'paid', 'blocked', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producer_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.log('⚠️  Withdrawals table already exists');
    } else {
      console.log('✅ Withdrawals table created');
    }
  });

  // ==========================================
  // 5. CREATE PRODUCER INDEMNITY TABLE
  // ==========================================
  console.log('\n📋 Creating producer_indemnity table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS producer_indemnity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producer_id INTEGER NOT NULL,
      agreed INTEGER DEFAULT 0,
      version TEXT NOT NULL,
      agreed_at DATETIME,
      FOREIGN KEY (producer_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.log('⚠️  Producer indemnity table already exists');
    } else {
      console.log('✅ Producer indemnity table created');
    }
  });

  // ==========================================
  // 6. FIX LICENSES TABLE (Global Templates)
  // ==========================================
  console.log('\n📋 Fixing licenses table...');
  
  // Check if licenses table needs restructuring
  db.all("PRAGMA table_info(licenses)", [], (err, columns) => {
    if (err) {
      console.error('❌ Error checking licenses schema:', err.message);
      return;
    }

    const hasBeatId = columns.some(c => c.name === 'beat_id');
    
    if (hasBeatId) {
      console.log('🔄 Migrating licenses table (removing beat_id)...');
      
      db.run('DROP TABLE IF EXISTS licenses_temp', (err) => {
        if (err) console.error('⚠️  Error dropping temp table:', err.message);
        
        db.run(`
          CREATE TABLE licenses_temp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            usage_rights TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating temp licenses table:', err.message);
            return;
          }

          // Copy distinct licenses (remove duplicates)
          db.run(`
            INSERT OR IGNORE INTO licenses_temp (name, description, usage_rights)
            SELECT DISTINCT name, description, usage_rights FROM licenses
          `, (err) => {
            if (err) {
              console.error('❌ Error copying licenses data:', err.message);
              return;
            }

            db.run('DROP TABLE licenses', (err) => {
              if (err) {
                console.error('❌ Error dropping old licenses table:', err.message);
                return;
              }

              db.run('ALTER TABLE licenses_temp RENAME TO licenses', (err) => {
                if (err) {
                  console.error('❌ Error renaming licenses table:', err.message);
                } else {
                  console.log('✅ Licenses table restructured');
                }
              });
            });
          });
        });
      });
    } else {
      console.log('✅ Licenses table already correct structure');
    }
  });

  // ==========================================
  // 7. CREATE BEAT_LICENSES TABLE
  // ==========================================
  console.log('\n📋 Creating beat_licenses junction table...');
  
  db.run(`
    CREATE TABLE IF NOT EXISTS beat_licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beat_id INTEGER NOT NULL,
      license_id INTEGER NOT NULL,
      price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beat_id) REFERENCES beats(id) ON DELETE CASCADE,
      FOREIGN KEY (license_id) REFERENCES licenses(id),
      UNIQUE(beat_id, license_id)
    )
  `, (err) => {
    if (err) {
      console.log('⚠️  Beat licenses table already exists');
    } else {
      console.log('✅ Beat licenses table created');
    }
  });

  // ==========================================
  // 8. SEED DEFAULT LICENSES
  // ==========================================
  console.log('\n📋 Seeding default licenses...');
  
  const defaultLicenses = [
    {
      name: 'Basic',
      description: 'For personal use, non-commercial projects',
      usage_rights: 'Up to 5,000 streams, non-profit use only'
    },
    {
      name: 'Premium',
      description: 'For commercial use, unlimited streams',
      usage_rights: 'Unlimited streams, commercial use, music videos allowed'
    },
    {
      name: 'Exclusive',
      description: 'Full ownership and exclusive rights',
      usage_rights: 'Complete ownership, remove beat from marketplace, all distribution rights'
    }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO licenses (name, description, usage_rights)
    VALUES (?, ?, ?)
  `);

  defaultLicenses.forEach(license => {
    stmt.run(license.name, license.description, license.usage_rights);
  });

  stmt.finalize(() => {
    console.log('✅ Default licenses seeded');
  });

  // ==========================================
  // 9. CREATE ADMIN USER
  // ==========================================
  console.log('\n📋 Creating admin user...');
  
  import('bcryptjs').then((bcrypt) => {
    const bcryptLib = bcrypt.default;
    const adminPassword = 'Admin@2024'; // Change this!
    
    bcryptLib.hash(adminPassword, 10, (err, hash) => {
      if (err) {
        console.error('❌ Error hashing admin password:', err);
        return;
      }

      db.run(`
        INSERT OR IGNORE INTO users (email, password_hash, display_name, role, auth_provider, email_verified)
        VALUES ('admin@afrojamz.com', ?, 'Admin', 'admin', 'local', 1)
      `, [hash], function(err) {
        if (err) {
          console.log('⚠️  Admin user may already exist:', err.message);
        } else if (this.changes > 0) {
          console.log('✅ Admin user created');
          console.log('   📧 Email: admin@afrojamz.com');
          console.log('   🔐 Password: Admin@2024');
          console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
        } else {
          console.log('ℹ️  Admin user already exists');
        }
      });
    });
  });

  // ==========================================
  // 10. VERIFICATION
  // ==========================================
  setTimeout(() => {
    console.log('\n🔍 Verifying migration...');
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error('❌ Verification error:', err);
      } else {
        console.log('\n📊 Current tables:');
        tables.forEach(t => console.log('  -', t.name));
      }
      
      db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message);
        } else {
          console.log('\n✅ Migration complete! Database closed.');
          console.log('\n🚀 Next steps:');
          console.log('   1. Restart your server');
          console.log('   2. Test the /api/producer/withdrawals endpoint');
          console.log('   3. Change the admin password!');
        }
        process.exit(0);
      });
    });
  }, 2000);
  
  }); // End of db.serialize in continueMigration
} // End of continueMigration function