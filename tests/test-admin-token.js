import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'afrojamz-dev-secret';
const DB_PATH = './src/backend/db/sqlite.db';

const db = new sqlite3.Database(DB_PATH);

console.log('🔍 Checking admin user...\n');

// Check if admin exists
db.get('SELECT * FROM users WHERE role = "admin"', async (err, admin) => {
  if (err) {
    console.error('❌ Database error:', err.message);
    process.exit(1);
  }

  if (!admin) {
    console.log('⚠️  No admin user found. Creating one...');
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    db.run(
      `INSERT INTO users (email, password_hash, display_name, role, auth_provider, email_verified)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin@afrojamz.com', hashedPassword, 'Admin', 'admin', 'local', 1],
      function(err) {
        if (err) {
          console.error('❌ Error creating admin:', err.message);
          process.exit(1);
        }
        
        const newAdmin = {
          id: this.lastID,
          role: 'admin',
          auth_provider: 'local'
        };
        
        const token = jwt.sign(newAdmin, JWT_SECRET, { expiresIn: '7d' });
        
        console.log('✅ Admin user created!');
        console.log('\n📧 Email: admin@afrojamz.com');
        console.log('🔑 Password: admin123');
        console.log('\n🎟️  JWT Token (copy this):');
        console.log(token);
        console.log('\n📝 Use in Thunder Client:');
        console.log('Authorization: Bearer ' + token);
        
        db.close();
        process.exit(0);
      }
    );
  } else {
    console.log('✅ Admin user found!');
    console.log('\n👤 ID:', admin.id);
    console.log('📧 Email:', admin.email);
    console.log('👔 Role:', admin.role);
    console.log('🔐 Auth Provider:', admin.auth_provider);
    
    // Generate fresh token
    const token = jwt.sign(
      {
        id: admin.id,
        role: admin.role,
        auth_provider: admin.auth_provider
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('\n🎟️  Fresh JWT Token (copy this):');
    console.log(token);
    console.log('\n📝 Use in Thunder Client:');
    console.log('Authorization: Bearer ' + token);
    
    db.close();
    process.exit(0);
  }
});
