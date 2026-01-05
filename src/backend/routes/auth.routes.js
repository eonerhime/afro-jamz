import express from 'express';
import { handleOAuthCallback, loginUser, registerUser } from '../services/auth.service.js';
import { getOAuthProfile } from '../utils/oauth.js';

const router = express.Router();

// Local auth
router.post('/register', registerUser);
router.post('/login', loginUser);

// OAuth callback
router.get('/oauth/:provider/callback', async (req, res) => {
  const provider = req.params.provider;
  const code = req.query.code;
  const role = req.query.role; // "buyer" or "producer", passed from frontend

  if (!role || !['buyer', 'producer'].includes(role)) {
    return res.status(400).json({ error: 'Role is required for OAuth signup' });
  }

  try {
    const profile = await getOAuthProfile(provider, code);
    await handleOAuthCallback(provider, profile, role, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
