#!/bin/bash
# MyQuro Production Diagnostic Script
# Run this to check if your production deployment is working

echo "🔍 MyQuro Production Diagnostic"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test backend health
echo -e "\n1. Testing Backend Health..."
echo "   URL: https://api.myquro.com/health"
health_response=$(curl -s -w "HTTPSTATUS:%{http_code}" https://api.myquro.com/health)
health_body=$(echo $health_response | sed 's/HTTPSTATUS.*//')
health_code=$(echo $health_response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$health_code" = "200" ]; then
    echo -e "${GREEN}✅ Backend health OK${NC}"
    echo "   Response: $health_body"
else
    echo -e "${RED}❌ Backend health FAILED (HTTP $health_code)${NC}"
fi

# Test auth endpoint
echo -e "\n2. Testing Auth Endpoint..."
echo "   URL: https://api.myquro.com/api/auth/sign-in/google"
auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -I https://api.myquro.com/api/auth/sign-in/google)
auth_code=$(echo $auth_response | grep "HTTPSTATUS" | sed 's/.*HTTPSTATUS://' | tr -d '\n')

if [ "$auth_code" = "200" ] || [ "$auth_code" = "302" ]; then
    echo -e "${GREEN}✅ Auth endpoint OK${NC}"
else
    echo -e "${RED}❌ Auth endpoint FAILED (HTTP $auth_code)${NC}"
fi

# Test frontend
echo -e "\n3. Testing Frontend..."
echo "   URL: https://www.myquro.com"
frontend_response=$(curl -s -w "HTTPSTATUS:%{http_code}" -I https://www.myquro.com)
frontend_code=$(echo $frontend_response | grep "HTTPSTATUS" | sed 's/.*HTTPSTATUS://' | tr -d '\n')

if [ "$frontend_code" = "200" ]; then
    echo -e "${GREEN}✅ Frontend OK${NC}"
else
    echo -e "${RED}❌ Frontend FAILED (HTTP $frontend_code)${NC}"
fi

# Summary
echo -e "\n📊 Summary:"
if [ "$health_code" = "200" ] && ([ "$auth_code" = "200" ] || [ "$auth_code" = "302" ]) && [ "$frontend_code" = "200" ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    echo -e "${GREEN}🎉 Your MyQuro production deployment should be working.${NC}"
else
    echo -e "${RED}❌ Issues detected. Check environment variables in Vercel.${NC}"
    echo -e "${YELLOW}💡 Common fixes:${NC}"
    echo "   - Set BETTER_AUTH_URL=https://api.myquro.com in backend"
    echo "   - Set NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com in frontend"
    echo "   - Ensure DATABASE_URL is set in backend"
    echo "   - Redeploy both projects after setting variables"
fi

echo -e "\n🔗 Useful links:"
echo "   Vercel Dashboard: https://vercel.com/dashboard"
echo "   Backend Health: https://api.myquro.com/health"
echo "   Frontend: https://www.myquro.com"