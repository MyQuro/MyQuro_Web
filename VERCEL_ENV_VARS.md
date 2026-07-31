# MyQuro Environment Variables for Vercel

## Backend Environment Variables (api.myquro.com project)
# Copy these into Vercel Dashboard → Backend Project → Settings → Environment Variables

BETTER_AUTH_URL=https://api.myquro.com
DATABASE_URL=postgresql://[your-username]:[your-password]@[your-host]/[your-database]?sslmode=require
GOOGLE_CLIENT_ID=[your-google-oauth-client-id]
GOOGLE_CLIENT_SECRET=[your-google-oauth-client-secret]
CLIENT_URL=https://www.myquro.com
BACKEND_URL=https://api.myquro.com
NODE_ENV=production

## Frontend Environment Variables (www.myquro.com project)
# Copy these into Vercel Dashboard → Frontend Project → Settings → Environment Variables

NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com
NEXT_PUBLIC_CLIENT_URL=https://www.myquro.com

## How to Set in Vercel:
1. Go to Vercel Dashboard
2. Select your project (backend or frontend)
3. Go to Settings → Environment Variables
4. Add each variable one by one
5. Click "Save" for each variable
6. Redeploy the project

## Important Notes:
- Replace [your-...] placeholders with actual values
- DATABASE_URL should be your Neon PostgreSQL connection string
- Google OAuth credentials from Google Cloud Console
- After setting variables, redeploy both projects
- Test with the diagnostic script: ./check-production.sh