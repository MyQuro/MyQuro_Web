# Production Backend Environment Variables - CRITICAL

## ⚠️ URGENT: Vercel Backend Configuration

### Required Environment Variables

Set these in your Vercel backend project dashboard:

```bash
# Database
DATABASE_URL=postgresql://your-connection-string

# Better Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-minimum-32-characters
BETTER_AUTH_URL=https://api.myquro.com
CLIENT_URL=https://myquro.com

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Environment
NODE_ENV=production
PORT=4000
```

## Frontend Environment Variables

Set these in your Vercel frontend project dashboard:

```bash
# Backend URL - MUST match backend deployment
NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com

# Better Auth (if needed in frontend)
BETTER_AUTH_URL=https://api.myquro.com/api/auth
```

## Verification Checklist

After setting environment variables:

### Backend Verification

1. **Check Health Endpoint:**
   ```bash
   curl https://api.myquro.com/health
   ```
   
   Expected response:
   ```json
   {
     "ok": true,
     "timestamp": "...",
     "environment": "production",
     "authUrl": "https://api.myquro.com",
     "database": "configured"
   }
   ```

2. **Check CORS:**
   - Open browser console on `https://myquro.com`
   - Try to fetch: `fetch('https://api.myquro.com/health')`
   - Should succeed without CORS errors

3. **Check Auth Endpoint:**
   ```bash
   curl https://api.myquro.com/api/auth/session
   ```

### Frontend Verification

1. **Check Environment:**
   - Open browser console on `https://myquro.com`
   - Type: `window.location.hostname`
   - Should show: `myquro.com` or `www.myquro.com`

2. **Check Auth Client:**
   - Look for console log: `🔐 [AUTH CLIENT] Initializing auth client with:`
   - Should show: `baseURL: 'https://api.myquro.com/api/auth'`

3. **Check API Calls:**
   - Look for: `📡 [API] Request` logs
   - Should show requests to `https://api.myquro.com`

## Common Issues & Solutions

### Issue 1: CORS Errors

**Symptom:**
```
Access to fetch at 'https://api.myquro.com/...' from origin 'https://myquro.com' has been blocked by CORS policy
```

**Solution:**
- Verify `CLIENT_URL=https://myquro.com` in backend env vars
- Redeploy backend after setting env vars
- Check allowed origins in `backend/src/app.ts`

### Issue 2: WebSocket Connection Failed

**Symptom:**
```
WebSocket connection to 'wss://api.myquro.com/socket.io/' failed
```

**Solution:**
- Check if backend is running: `curl https://api.myquro.com/health`
- Verify WebSocket is enabled in production (fixed in this update)
- Check Vercel logs for WebSocket errors

### Issue 3: Session Cookie Not Setting

**Symptom:**
```
🔑 [MIDDLEWARE] Session check: { hasCookie: false }
```

**Solution:**
- Verify `BETTER_AUTH_URL=https://api.myquro.com` in backend
- Check cookie settings in Better Auth config
- Ensure `sameSite: 'none'` and `secure: true` in production
- Verify domain is `.myquro.com` for cross-subdomain cookies

### Issue 4: Authentication Works But Not Persisting

**Symptom:**
- Can sign in
- Session lost on page refresh

**Solution:**
- Check browser cookies: `document.cookie`
- Look for `better-auth.session_token=...`
- Verify `httpOnly: true` is not blocking client access
- Check cookie `domain` and `path` attributes

## Deployment Steps

### 1. Deploy Backend First

```bash
cd backend
git add .
git commit -m "fix: production CORS and WebSocket configuration"
git push origin main
```

In Vercel Backend Dashboard:
- Go to Settings → Environment Variables
- Add all required variables
- Redeploy

### 2. Verify Backend

```bash
# Test health
curl https://api.myquro.com/health

# Test auth endpoint
curl https://api.myquro.com/api/auth/session
```

### 3. Deploy Frontend

```bash
cd frontend
git add .
git commit -m "fix: production auth and API configuration"
git push origin main
```

In Vercel Frontend Dashboard:
- Go to Settings → Environment Variables
- Set `NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com`
- Redeploy

### 4. Test Production

1. Visit `https://myquro.com`
2. Open browser console
3. Check for logs:
   - `🛡️ [MIDDLEWARE]`
   - `📡 [API]`
   - `🔐 [AUTH]`
4. Try to sign in
5. Verify no CORS errors
6. Check session persists on refresh

## Monitoring

### Real-time Logs

**Frontend (Browser Console):**
- `🛡️` - Middleware logs
- `📡` - API requests
- `🔐` - Authentication
- `✅` - Success
- `❌` - Errors

**Backend (Vercel Logs):**
- `🚀` - Server start
- `🔌` - WebSocket
- `🌐` - CORS
- `⚠️` - Warnings
- `❌` - Errors

### Health Checks

Set up monitoring for:
- `https://api.myquro.com/health` - Should return 200
- `https://myquro.com` - Should load without errors

## Rollback Plan

If production is broken:

```bash
# Revert backend
cd backend
git revert HEAD
git push origin main

# Revert frontend
cd frontend
git revert HEAD
git push origin main
```

## Support Checklist

Before asking for help, verify:

- [ ] All environment variables are set in Vercel
- [ ] Backend health endpoint returns OK
- [ ] Frontend loads without 404 errors
- [ ] Browser console shows proper logs
- [ ] No CORS errors in Network tab
- [ ] Backend Vercel logs show no errors

---

**Last Updated:** January 10, 2026  
**Status:** CRITICAL FIX - Deploy immediately  
**Priority:** P0 - Production down
