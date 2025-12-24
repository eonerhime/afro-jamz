import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export function authenticateToken(req, res, next) {
  console.log('--- AUTH MIDDLEWARE HIT ---');

  const authHeader = req.headers.authorization;

  console.log('Authorization header:', authHeader);

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Token decoded:', decoded);
    req.user = decoded;
    next();
  });
}

// Optional Auth
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header) {
    req.user = null;
    return next();
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch {
    req.user = null;
    next();
  }
}
