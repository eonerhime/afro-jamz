import jwt from 'jsonwebtoken';

// Producer authentication
export function requireProducer(req, res, next) {
  if (req.user.role !== 'producer') {
    return res.status(403).json({ error: 'Producer access only' });
  }
  next();
}

// Admin authentication
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
}

export function requireBuyer(req, res, next) {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ error: 'Buyer access required' });
  }
  next();
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
