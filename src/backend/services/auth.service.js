import bcrypt from 'bcrypt';
import { getDB } from '../db/index.js';
import { issueJWT } from '../utils/jwt.js';

export async function registerUser(req, res) {
  const { email, password, displayName, role, accept_indemnity } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role required' });
  }

  if (!['buyer', 'producer'].includes(role)) {
    return res.status(400).json({ error: 'Role must be buyer or producer' });
  }

  if (role === 'producer' && accept_indemnity !== true) {
    return res.status(400).json({ error: 'Producers must accept indemnity terms' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const db = getDB();

    db.run(
      `INSERT INTO users (email, password_hash, display_name, role, auth_provider, email_verified)
       VALUES (?, ?, ?, ?, 'local', 0)`,
      [email, hashedPassword, displayName, role],
      function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: err.message });
        }

        const user = {
          id: this.lastID,
          role,
          auth_provider: 'local'
        };

        // Insert indemnity for producers
        if (role === 'producer') {
          db.run(
            `INSERT INTO producer_indemnity (producer_id, agreed, agreed_at, version)
             VALUES (?, 1, CURRENT_TIMESTAMP, 'v1.0')`,
            [user.id]
          );
        }

        // Issue token
        const token = issueJWT(user);

        res.status(201).json({ token });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body;
  const db = getDB();

  db.get(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    async (err, user) => {
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = issueJWT(user);
      res.json({ token });
    }
  );
}

export async function handleOAuthCallback(provider, profile, role, res) {
  const { email, name, providerId } = profile;
  const db = getDB();

  // 1️⃣ Check for existing user by email or OAuth ID
  db.get(
    `SELECT * FROM users WHERE email = ? OR oauth_provider_id = ?`,
    [email, providerId],
    async (err, user) => {
      if (err) return res.status(500).json({ error: err.message });

      let userId;
      let isNewProducer = false;

      if (!user) {
        // 2️⃣ User does not exist → create
        db.run(
          `INSERT INTO users (email, display_name, role, auth_provider, oauth_provider_id, email_verified)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [email, name, role, provider, providerId],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });

            userId = this.lastID;

            if (role === 'producer') {
              // Producer indemnity must be handled AFTER OAuth login
              isNewProducer = true;
            }

            const token = issueJWT({
              id: userId,
              role,
              auth_provider: provider
            });

            res.json({ token, indemnityRequired: isNewProducer });
          }
        );
      } else {
        // 3️⃣ Existing user → update OAuth ID if missing
        if (!user.oauth_provider_id) {
          db.run(
            `UPDATE users SET oauth_provider_id = ? WHERE id = ?`,
            [providerId, user.id]
          );
        }

        const token = issueJWT({
          id: user.id,
          role: user.role,
          auth_provider: provider
        });

        // Check if existing producer has accepted indemnity
        if (user.role === 'producer') {
          db.get(
            `SELECT * FROM producer_indemnity WHERE producer_id = ?`,
            [user.id],
            (err, indemnity) => {
              if (err) return res.status(500).json({ error: err.message });

              res.json({
                token,
                indemnityRequired: !indemnity
              });
            }
          );
        } else {
          res.json({ token });
        }
      }
    }
  );
}