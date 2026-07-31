# Render Environment Variables Template

## Backend Service (myquro-backend)

### Required Variables
```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://[username]:[password]@[host]/[database]?sslmode=require
BETTER_AUTH_SECRET=[generate-32-character-random-string]
BETTER_AUTH_URL=https://api.myquro.com
CLIENT_URL=https://myquro.com
GOOGLE_CLIENT_ID=[your-google-oauth-client-id]
GOOGLE_CLIENT_SECRET=[your-google-oauth-client-secret]
```

## Frontend Service (myquro-frontend)

### Required Variables
```
NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com
```

## How to Generate Secrets

### BETTER_AUTH_SECRET
Generate a secure 32-character random string:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[System.Web.Security.Membership]::GeneratePassword(32, 0)
```

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://myquro-backend.onrender.com/api/auth/callback/google`
6. Copy Client ID and Client Secret

### Neon Database Setup
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string
4. Ensure SSL mode is set to `require`

## Post-Deployment Updates

After deployment, update these variables with actual Render URLs:
- `BETTER_AUTH_URL`: Replace with your backend service URL
- `CLIENT_URL`: Replace with your frontend service URL
- `NEXT_PUBLIC_BACKEND_URL`: Replace with your backend service URL