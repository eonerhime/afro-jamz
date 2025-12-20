import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDB } from '../db/index.js';

const SECRET_KEY = 'replace_with_env_secret';

export async function registerUser(req, res) {
  const { username, email, password, role } = req.body;

  if (!['buyer','producer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const db = await getDB();

  try {
    const result = await db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      username, email, hashedPassword, role
    );
    res.status(201).json({ id: result.lastID, username, email, role });
  } catch (err) {
    res.status(400).json({ error: 'Email or username already exists' });
  }
}

export async function loginUser(req, res) {
  const { email, password } = req.body;
  const db = await getDB();

  const user = await db.get('SELECT * FROM users WHERE email = ?', email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token, id: user.id, role: user.role });
}
