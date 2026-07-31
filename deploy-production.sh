#!/bin/bash

# CRITICAL: Production Deployment Script
# This script helps deploy the backend and frontend fixes to production

echo "========================================="
echo "🚨 CRITICAL: Production Deployment"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: This will deploy to PRODUCTION${NC}"
echo ""
echo "This script will:"
echo "1. Build and verify backend"
echo "2. Build and verify frontend"
echo "3. Guide you through Vercel deployment"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 1: Building Backend${NC}"
echo -e "${BLUE}=========================================${NC}"

cd backend || exit 1

echo "Running TypeScript build..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend build successful${NC}"
else
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Step 2: Building Frontend${NC}"
echo -e "${BLUE}=========================================${NC}"

cd frontend || exit 1

echo "Running Next.js build..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ All Builds Successful!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}Deployment Instructions${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo ""

echo -e "${BLUE}BACKEND DEPLOYMENT:${NC}"
echo ""
echo "1. Commit and push backend changes:"
echo "   cd backend"
echo "   git add ."
echo "   git commit -m 'fix: production CORS and WebSocket for myquro.com'"
echo "   git push origin main"
echo ""
echo "2. Go to Vercel Backend Dashboard:"
echo "   https://vercel.com/[your-team]/[backend-project]"
echo ""
echo "3. Verify these environment variables are set:"
echo "   DATABASE_URL=postgresql://..."
echo "   BETTER_AUTH_SECRET=..."
echo "   BETTER_AUTH_URL=https://api.myquro.com"
echo "   CLIENT_URL=https://myquro.com"
echo "   NODE_ENV=production"
echo ""
echo "4. Wait for deployment to complete"
echo ""
echo "5. Test backend:"
echo "   curl https://api.myquro.com/health"
echo ""

echo -e "${BLUE}FRONTEND DEPLOYMENT:${NC}"
echo ""
echo "1. Commit and push frontend changes:"
echo "   cd frontend"
echo "   git add ."
echo "   git commit -m 'fix: production auth and middleware for myquro.com'"
echo "   git push origin main"
echo ""
echo "2. Go to Vercel Frontend Dashboard:"
echo "   https://vercel.com/[your-team]/[frontend-project]"
echo ""
echo "3. Verify environment variable:"
echo "   NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com"
echo ""
echo "4. Wait for deployment to complete"
echo ""
echo "5. Test frontend:"
echo "   Open: https://myquro.com"
echo "   Check browser console for logs"
echo ""

echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}Post-Deployment Verification${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo ""

echo "After deploying, verify:"
echo ""
echo "✓ Backend health: https://api.myquro.com/health"
echo "✓ Frontend loads: https://myquro.com"
echo "✓ No CORS errors in browser console"
echo "✓ Authentication works"
echo "✓ WebSocket connects"
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Files Modified:${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Backend:"
echo "  • backend/src/app.ts (CORS configuration)"
echo "  • backend/src/server.ts (WebSocket for production)"
echo ""
echo "Frontend:"
echo "  • frontend/middleware.ts (root route fix)"
echo "  • frontend/lib/api-client.ts (production logging)"
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Quick Deployment Commands:${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo "# Commit all changes"
echo "git add ."
echo "git commit -m 'fix: production CORS, WebSocket, and auth for myquro.com'"
echo "git push origin main"
echo ""
echo "Then check Vercel dashboards for deployment status"
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment preparation complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
