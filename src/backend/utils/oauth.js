import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3001/auth/google/callback",
);

export async function getOAuthProfile(provider, code) {
  if (provider === "google") {
    try {
      const { tokens } = await googleClient.getToken(code);
      googleClient.setCredentials(tokens);

      const ticket = await googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      return {
        email: payload.email,
        name: payload.name,
        providerId: payload.sub,
        emailVerified: payload.email_verified,
      };
    } catch (error) {
      console.error("Google OAuth error:", error);
      throw new Error("Failed to authenticate with Google");
    }
  }

  if (provider === "github") {
    // TODO: Implement GitHub OAuth
    return {
      email: "user@github.com",
      name: "Jane Smith",
      providerId: "github-0987654321",
    };
  }

  throw new Error("Unsupported OAuth provider");
}

export function getGoogleAuthUrl(role) {
  const scopes = ["email", "profile"];

  const url = googleClient.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: role, // Pass role through OAuth flow
  });

  return url;
}
