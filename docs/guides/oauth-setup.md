# OAuth Setup Guide - Afro Jamz

## Overview
OAuth integration is now complete in both frontend and backend. Users can sign in/register with their Google account.

## Architecture

### OAuth Flow
1. User clicks "Continue with Google" on login/register page
2. Frontend redirects to backend: `/auth/oauth/google?role=buyer`
3. Backend generates Google OAuth URL and redirects user to Google
4. User signs in with Google account
5. Google redirects back to backend: `/auth/oauth/google/callback?code=xxx&state=role`
6. Backend exchanges code for user profile
7. Backend creates/updates user in database
8. Backend generates JWT token
9. Backend redirects to frontend: `/oauth/callback?token=xxx&user=xxx`
10. Frontend stores token and redirects to appropriate dashboard

### Components

#### Backend
- **utils/oauth.js**: Google OAuth2Client configuration, token exchange
- **routes/auth.routes.js**: OAuth initiation and callback endpoints
- **services/auth.service.js**: OAuth user creation/update logic

#### Frontend
- **components/GoogleOAuthButton.jsx**: Reusable OAuth button
- **pages/OAuthCallbackPage.jsx**: Handles OAuth redirect and login
- **context/AuthContext.jsx**: `loginWithToken` method for OAuth login
- **pages/LoginPage.jsx**: Includes OAuth button
- **pages/RegisterPage.jsx**: Includes OAuth button with role selection

## Google Cloud Console Setup

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name: "Afro Jamz" (or similar)
4. Click "Create"

### Step 2: Enable Google+ API
1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" (unless you have a Google Workspace)
3. Click "Create"
4. Fill in required fields:
   - **App name**: Afro Jamz
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. **Scopes**: Click "Add or Remove Scopes"
   - Add: `openid`, `email`, `profile`
   - Click "Update"
7. Click "Save and Continue"
8. **Test users** (for development):
   - Add your email and any test accounts
   - Click "Save and Continue"
9. Review and click "Back to Dashboard"

### Step 4: Create OAuth Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. **Application type**: Web application
4. **Name**: Afro Jamz Web Client
5. **Authorized JavaScript origins**:
   - http://localhost:3001
   - http://localhost:5173
6. **Authorized redirect URIs**:
   - http://localhost:3001/auth/oauth/google/callback
7. Click "Create"
8. **Copy the Client ID and Client Secret** (you'll need these for .env)

### Step 5: Update Environment Variables

#### Backend (.env)
```bash
# OAuth - Google
GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/oauth/google/callback

# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:5173
```

#### Frontend (src/frontend/.env)
```bash
# Backend API URL
VITE_API_URL=http://localhost:3001
```

### Step 6: Restart Servers
After updating .env files:

```bash
# Restart backend
npm run dev

# Restart frontend (in new terminal)
cd src/frontend
npm run dev
```

## Testing OAuth Flow

### Test Login Flow
1. Navigate to http://localhost:5173/login
2. Click "Or continue with Google" button
3. Select Google account (or enter credentials)
4. Grant permissions
5. You should be redirected to buyer dashboard
6. Check that you're logged in (token in localStorage)

### Test Register Flow
1. Navigate to http://localhost:5173/register
2. Select role (buyer or producer)
3. Click "Sign up with Google" button
4. Sign in with Google
5. You should be redirected to appropriate dashboard (producer or buyer)
6. Check that account was created in database

### Verify in Database
```sql
-- Check that OAuth user was created
SELECT id, email, username, role, google_id 
FROM users 
WHERE google_id IS NOT NULL;
```

## Troubleshooting

### "redirect_uri_mismatch" error
- Ensure the redirect URI in Google Console exactly matches: `http://localhost:3001/auth/oauth/google/callback`
- No trailing slashes
- Match the protocol (http vs https)
- Match the port number

### "invalid_client" error
- Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Ensure .env file is in the root directory
- Restart the backend server after changing .env

### User not redirected after OAuth
- Check browser console for errors
- Verify FRONTEND_URL in backend .env is correct
- Check that /oauth/callback route exists in frontend App.jsx

### Token not stored in frontend
- Check that loginWithToken is being called in OAuthCallbackPage
- Verify localStorage is enabled in browser
- Check browser console for errors

### Google OAuth button not showing
- Verify GoogleOAuthButton component is imported
- Check that component is included in JSX
- Inspect browser console for import errors

## Security Notes

### Production Considerations
1. **HTTPS Required**: Google OAuth requires HTTPS in production
2. **Update Redirect URIs**: Add production domain to Google Console
3. **Environment Variables**: Use secure secret management (AWS Secrets Manager, etc.)
4. **CORS Configuration**: Update backend CORS to allow production frontend
5. **OAuth Consent Screen**: Submit for verification if needed

### Current Limitations
- Only supports Google OAuth (can add GitHub, Apple later)
- No account linking (if user signs up with email, can't link Google later)
- No OAuth token refresh (users must re-authenticate when JWT expires)

## Future Enhancements
- [ ] Add GitHub OAuth provider
- [ ] Add Apple OAuth provider
- [ ] Account linking (connect multiple OAuth providers to one account)
- [ ] OAuth token refresh
- [ ] Profile picture from OAuth provider
- [ ] Email verification bypass for OAuth users

## API Endpoints

### Initiate OAuth
```
GET /auth/oauth/:provider?role=buyer
```
Redirects to OAuth provider (Google). Include role query parameter.

### OAuth Callback
```
GET /auth/oauth/:provider/callback?code=xxx&state=role
```
Handles OAuth callback from provider. Creates/updates user and redirects to frontend with token.

### Frontend OAuth Callback
```
GET /oauth/callback?token=xxx&user=xxx
```
Frontend route that receives token and user data, stores in localStorage, and redirects to dashboard.

## Files Modified

### Backend
- `src/backend/utils/oauth.js` - Google OAuth implementation
- `src/backend/routes/auth.routes.js` - OAuth routes
- `src/backend/services/auth.service.js` - OAuth user handling
- `.env` - OAuth credentials and frontend URL

### Frontend
- `src/frontend/src/App.jsx` - Added OAuth callback route
- `src/frontend/src/pages/LoginPage.jsx` - Added OAuth button
- `src/frontend/src/pages/RegisterPage.jsx` - Added OAuth button
- `src/frontend/src/pages/OAuthCallbackPage.jsx` - Created
- `src/frontend/src/components/GoogleOAuthButton.jsx` - Created
- `src/frontend/src/context/AuthContext.jsx` - Added loginWithToken
- `src/frontend/.env` - API URL configuration
