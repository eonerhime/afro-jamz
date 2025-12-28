export function requireProducer(req, res, next) {
  if (!req.user || req.user.role !== 'producer') {
    return res.status(403).json({ error: 'Producer access required' });
  }
  next();
}
