# Vercel Environment Variables Setup

## Frontend Environment Variables (Vercel Dashboard)
Set these in your Vercel project settings under "Environment Variables":

### Production Environment Variables:
```
NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com
NEXT_PUBLIC_CLIENT_URL=https://www.myquro.com
```

## Backend Environment Variables (Vercel Dashboard)
Set these in your backend Vercel project settings:

### Production Environment Variables:
```
BETTER_AUTH_URL=https://api.myquro.com
DATABASE_URL=postgresql://[your-neon-connection-string]
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
CLIENT_URL=https://www.myquro.com
BACKEND_URL=https://api.myquro.com
NODE_ENV=production
```

### Important Notes:
1. Make sure the backend is deployed to `api.myquro.com` domain in Vercel
2. The frontend should be deployed to `www.myquro.com` or `myquro.com`
3. Database URL should be the connection string from Neon (with pooling if available)
4. After setting environment variables, redeploy both frontend and backend