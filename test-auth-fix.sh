#!/bin/bash

# Production Auth Fix - Testing Script
# This script helps verify the authentication fixes work correctly

echo "========================================="
echo "MyQuro Production Auth Fix - Test Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking if backend is running...${NC}"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health)

if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend is running (port 4000)${NC}"
else
    echo -e "${RED}❌ Backend is not running${NC}"
    echo "Please start backend with: cd backend && npm run dev"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Checking if frontend is running...${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$FRONTEND_STATUS" != "000" ]; then
    echo -e "${GREEN}✅ Frontend is running (port 3000)${NC}"
else
    echo -e "${RED}❌ Frontend is not running${NC}"
    echo "Please start frontend with: cd frontend && npm run dev"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Testing authentication flow...${NC}"

# Test 1: Root route
echo "Test 1: Root route (/) should redirect to /home"
curl -s -I http://localhost:3000/ | grep -i "location: /home" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Root route redirects correctly${NC}"
else
    echo -e "${RED}❌ Root route redirect failed${NC}"
fi

# Test 2: Home page
echo "Test 2: Home page should load without auth"
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/home)
if [ "$HOME_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Home page loads without auth${NC}"
else
    echo -e "${RED}❌ Home page failed (status: $HOME_STATUS)${NC}"
fi

# Test 3: Protected route
echo "Test 3: Dashboard should redirect to signin (without auth)"
DASHBOARD_STATUS=$(curl -s -L -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard)
if [ "$DASHBOARD_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Dashboard redirects properly${NC}"
else
    echo -e "${YELLOW}⚠️  Dashboard response: $DASHBOARD_STATUS (check manually)${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Checking browser console logs...${NC}"
echo "Please open http://localhost:3000 in your browser and check for:"
echo "  🛡️ [MIDDLEWARE] logs"
echo "  📡 [API] logs"
echo "  🔐 [AUTH] logs"
echo ""
echo -e "${GREEN}If you see these logs, the production debugging is working!${NC}"

echo ""
echo "========================================="
echo "Manual Testing Checklist:"
echo "========================================="
echo "[ ] Visit http://localhost:3000/ → redirects to /home"
echo "[ ] /home loads without authentication"
echo "[ ] /dashboard requires authentication"
echo "[ ] Sign in works correctly"
echo "[ ] No infinite redirect loops"
echo "[ ] Browser console shows proper logging"
echo ""
echo -e "${GREEN}Testing complete!${NC}"
