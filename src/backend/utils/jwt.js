import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/config.js';

export function issueJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      auth_provider: user.auth_provider
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
