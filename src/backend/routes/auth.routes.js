import express from "express";
import {
  handleOAuthCallback,
  loginUser,
  registerUser,
} from "../services/auth.service.js";
import { getOAuthProfile, getGoogleAuthUrl } from "../utils/oauth.js";

const router = express.Router();

// Local auth
router.post("/register", registerUser);
router.post("/login", loginUser);

// OAuth initiation
router.get("/oauth/:provider", (req, res) => {
  const { provider } = req.params;
  const { role } = req.query;

  if (!role || !["buyer", "producer"].includes(role)) {
    return res.status(400).json({ error: "Role is required for OAuth" });
  }

  if (provider === "google") {
    const authUrl = getGoogleAuthUrl(role);
    return res.redirect(authUrl);
  }

  res.status(400).json({ error: "Unsupported OAuth provider" });
});

// OAuth callback
router.get("/oauth/:provider/callback", async (req, res) => {
  const provider = req.params.provider;
  const code = req.query.code;
  const role = req.query.state; // Role is passed back via OAuth state

  if (!role || !["buyer", "producer"].includes(role)) {
    return res.status(400).json({ error: "Role is required for OAuth signup" });
  }

  try {
    const profile = await getOAuthProfile(provider, code);
    const { token, user } = await handleOAuthCallback(provider, profile, role);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(
      `${frontendUrl}/oauth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`,
    );
  } catch (err) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(
      `${frontendUrl}/login?error=${encodeURIComponent(err.message)}`,
    );
  }
});

export default router;
