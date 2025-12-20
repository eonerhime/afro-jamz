import express from 'express';
import { registerUser, loginUser } from '../services/auth.service.js';

const router = express.Router();

// POST /auth/register
router.post('/register', registerUser);

// POST /auth/login
router.post('/login', loginUser);

export default router;
