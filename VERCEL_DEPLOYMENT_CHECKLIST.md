# 🚀 Vercel Deployment Checklist

## Backend Deployment (api.myquro.com)

### 1. Environment Variables
- [ ] `BETTER_AUTH_URL=https://api.myquro.com`
- [ ] `DATABASE_URL=[your-neon-connection-string]`
- [ ] `GOOGLE_CLIENT_ID=[your-google-oauth-client-id]`
- [ ] `GOOGLE_CLIENT_SECRET=[your-google-oauth-client-secret]`
- [ ] `CLIENT_URL=https://www.myquro.com`
- [ ] `BACKEND_URL=https://api.myquro.com`
- [ ] `NODE_ENV=production`

### 2. Domain Configuration
- [ ] Set custom domain `api.myquro.com` in Vercel
- [ ] Ensure SSL certificate is active
- [ ] Test health endpoint: `https://api.myquro.com/health`

## Frontend Deployment (www.myquro.com)

### 1. Environment Variables
- [ ] `NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com`
- [ ] `NEXT_PUBLIC_CLIENT_URL=https://www.myquro.com`

### 2. Domain Configuration
- [ ] Set custom domain `www.myquro.com` in Vercel
- [ ] Ensure SSL certificate is active

## Testing Steps

### 1. Health Check
```bash
curl https://api.myquro.com/health
```
Should return JSON with environment info.

### 2. Authentication Test
- Visit `https://www.myquro.com/signin`
- Try signing in with Google
- Check browser console for auth errors

### 3. API Connectivity
- After login, check if dashboard loads
- Verify WebSocket connection (should not show connection errors)

## Common Issues & Fixes

### Authentication Loop
- **Cause**: Backend URL mismatch or auth configuration
- **Fix**: Ensure `BETTER_AUTH_URL` is set correctly in backend

### WebSocket Connection Failed
- **Cause**: Backend not accessible or WebSocket not configured
- **Fix**: Check backend deployment and CORS settings

### Images Not Loading
- **Cause**: Next.js image optimization blocking external URLs
- **Fix**: Check `next.config.ts` remotePatterns configuration

### Database Connection Issues
- **Cause**: DATABASE_URL not set or incorrect
- **Fix**: Use Neon connection string with pooling enabled

## Redeployment Steps

1. Set all environment variables in Vercel dashboard
2. Redeploy backend first (`api.myquro.com`)
3. Test backend health endpoint
4. Redeploy frontend (`www.myquro.com`)
5. Test full authentication flow

## Monitoring

After deployment, monitor:
- Vercel function logs for backend errors
- Browser console for frontend errors
- Authentication success/failure rates