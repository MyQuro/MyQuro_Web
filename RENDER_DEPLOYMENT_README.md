# Render Deployment Configuration

## 🚀 Quick Deploy with render.json

This project includes a `render.json` configuration file for seamless deployment to Render.com.

### Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Ensure your code is pushed to GitHub
3. **Database**: Set up Neon PostgreSQL database
4. **Google OAuth**: Configure Google OAuth credentials

### Deployment Steps

#### 1. Connect Repository to Render

1. Go to [render.com](https://render.com) and sign in
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository (`myquro-paisa-speaks`)
4. Render will automatically detect the `render.json` file

#### 2. Configure Services

Render will create two services based on the `render.json`:

**Backend Service (myquro-backend):**
- **Type**: Web Service
- **Environment**: Node.js
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `backend/`

**Frontend Service (myquro-frontend):**
- **Type**: Web Service
- **Environment**: Node.js
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `frontend/`

#### 3. Set Environment Variables

**For Backend Service:**
```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://[your-neon-connection-string]
BETTER_AUTH_SECRET=[32-character-random-string]
BETTER_AUTH_URL=https://myquro-backend.onrender.com
CLIENT_URL=https://myquro-frontend.onrender.com
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
```

**For Frontend Service:**
```
NEXT_PUBLIC_BACKEND_URL=https://myquro-backend.onrender.com
```

#### 4. Deploy

1. Click **"Create Blueprint"**
2. Render will build and deploy both services
3. Backend deploys first, then frontend
4. Monitor deployment logs for any issues

### Post-Deployment Configuration

#### 1. Update Domain URLs

After deployment, update the backend environment variables with the actual URLs:

- `BETTER_AUTH_URL`: `https://myquro-backend.onrender.com`
- `CLIENT_URL`: `https://myquro-frontend.onrender.com`

#### 2. Custom Domain (Optional)

1. Go to service settings
2. Add custom domain (e.g., `myquro.com`)
3. Update DNS records as instructed
4. Update environment variables with custom domain

#### 3. Database Migration

Ensure your database schema is up to date:

```bash
# Run migrations (locally or via Render shell)
cd backend
npm run drizzle:migrate
```

### Health Checks

**Backend Health Check:**
```bash
curl https://myquro-backend.onrender.com/health
```

Expected response:
```json
{
  "ok": true,
  "timestamp": "2026-01-XX...",
  "environment": "production",
  "websocket": "enabled"
}
```

### Troubleshooting

#### Build Failures
- Check build logs in Render dashboard
- Ensure all dependencies are listed in `package.json`
- Verify Node.js version compatibility

#### Runtime Errors
- Check environment variables are set correctly
- Verify database connection string
- Check CORS configuration for WebSocket

#### WebSocket Issues
- Ensure backend URL is accessible
- Check firewall settings
- Verify WebSocket port configuration

### Auto-Deploy

The configuration enables:
- ✅ **Auto-deploy** on git push to main branch
- ✅ **Pull request previews** for frontend
- ✅ **Health checks** for backend monitoring

### Cost Optimization

**Free Tier Limits:**
- 750 hours/month per service
- Auto-sleep after 15 minutes of inactivity

**Scaling:**
- Upgrade to paid plans for 24/7 availability
- Configure instance types based on traffic

### Security Notes

- ✅ Environment variables are encrypted
- ✅ HTTPS enabled by default
- ✅ WebSocket connections are authenticated
- ✅ Database connections use SSL

---

## 🎯 Deployment Checklist

- [ ] Render account created
- [ ] GitHub repository connected
- [ ] Neon database configured
- [ ] Google OAuth credentials ready
- [ ] Environment variables prepared
- [ ] Blueprint deployed successfully
- [ ] Health checks passing
- [ ] WebSocket connections working
- [ ] Custom domain configured (optional)
- [ ] Database migrations completed