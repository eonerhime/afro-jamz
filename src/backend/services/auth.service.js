import bcrypt from "bcrypt";
import { getDB } from "../db/index.js";
import { issueJWT } from "../utils/jwt.js";

export async function registerUser(req, res) {
  const { email, password, displayName, role, accept_indemnity } = req.body;

  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "Email, password, and role required" });
  }

  if (!["buyer", "producer"].includes(role)) {
    return res.status(400).json({ error: "Role must be buyer or producer" });
  }

  if (role === "producer" && accept_indemnity !== true) {
    return res
      .status(400)
      .json({ error: "Producers must accept indemnity terms" });
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
          if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({ error: "Email already exists" });
          }
          return res.status(500).json({ error: err.message });
        }

        const user = {
          id: this.lastID,
          role,
          auth_provider: "local",
        };

        // Insert indemnity for producers
        if (role === "producer") {
          db.run(
            `INSERT INTO producer_indemnity (producer_id, agreed, agreed_at, version)
             VALUES (?, 1, CURRENT_TIMESTAMP, 'v1.0')`,
            [user.id],
          );
        }

        // Issue token
        const token = issueJWT(user);

        res.status(201).json({ token });
      },
    );
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body;
  const db = getDB();

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = issueJWT(user);
    res.json({ token });
  });
}

export async function handleOAuthCallback(provider, profile, role) {
  const { email, name, providerId, emailVerified } = profile;
  const db = getDB();

  return new Promise((resolve, reject) => {
    // 1️⃣ Check for existing user by email or OAuth ID
    db.get(
      `SELECT * FROM users WHERE email = ? OR oauth_provider_id = ?`,
      [email, providerId],
      async (err, user) => {
        if (err) return reject(new Error(err.message));

        let userId;
        let userRole;

        if (!user) {
          // 2️⃣ User does not exist → create
          db.run(
            `INSERT INTO users (email, username, role, auth_provider, oauth_provider_id, email_verified)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              email,
              name || email.split("@")[0],
              role,
              provider,
              providerId,
              emailVerified ? 1 : 0,
            ],
            function (err) {
              if (err) return reject(new Error(err.message));

              userId = this.lastID;
              userRole = role;

              const token = issueJWT({
                id: userId,
                role: userRole,
                auth_provider: provider,
              });

              resolve({
                token,
                user: {
                  id: userId,
                  email,
                  username: name || email.split("@")[0],
                  role: userRole,
                  auth_provider: provider,
                },
              });
            },
          );
        } else {
          // 3️⃣ Existing user → update OAuth ID if missing
          if (!user.oauth_provider_id) {
            db.run(`UPDATE users SET oauth_provider_id = ? WHERE id = ?`, [
              providerId,
              user.id,
            ]);
          }

          const token = issueJWT({
            id: user.id,
            role: user.role,
            auth_provider: provider,
          });

          resolve({
            token,
            user: {
              id: user.id,
              email: user.email,
              username: user.username,
              role: user.role,
              auth_provider: provider,
            },
          });
        }
      },
    );
  });
}
