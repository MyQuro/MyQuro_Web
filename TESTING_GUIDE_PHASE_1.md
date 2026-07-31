# 🧪 TESTING GUIDE - QR-Only Ordering System

## Quick Start Testing

### 1. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

---

## 🎯 Test Scenarios

### ✅ TEST 1: QR Scan Flow (Happy Path)

**Steps:**
1. Open browser: `https://myquro.com`
2. Navigate to "Explore Restaurants"
3. Select any restaurant
4. **EXPECTED**: You'll see "Scan QR to Order" overlay blocking menu
5. Click "Scan QR Code" button
6. **EXPECTED**: Camera opens (allow permissions)
7. Scan QR code (or manually go to `/qr/{token}`)
8. **EXPECTED**: Redirects to menu with session
9. **EXPECTED**: Navbar shows "Table X - Active Session"
10. Add items to cart
11. **EXPECTED**: Cart works, can place order
12. ✅ **PASS** if order places successfully with tableId + sessionId

**Test URL:**
```
https://myquro.com/qr/[your-qr-token-here]
```

---

### ❌ TEST 2: Direct Menu Access (Blocked Path)

**Steps:**
1. Open browser: `https://myquro.com`
2. Manually type: `https://myquro.com/restro/[restaurant-id]/menu`
3. **EXPECTED**: Menu loads but fullscreen overlay appears
4. **EXPECTED**: "Scan QR to Order" message shown
5. Try clicking on menu items
6. **EXPECTED**: Nothing happens - interactions blocked
7. Click + button on any item
8. **EXPECTED**: Toast error: "Please scan the QR code on your table"
9. Click "Place Order" (if cart somehow has items)
10. **EXPECTED**: Toast error + QR scanner opens
11. ✅ **PASS** if ordering is completely blocked

---

### 🔄 TEST 3: Session Persistence on Refresh

**Steps:**
1. Complete TEST 1 (scan QR, get valid session)
2. Add 3 items to cart
3. Note the table number shown in navbar
4. Press `F5` or refresh page
5. **EXPECTED**: Page reloads
6. **EXPECTED**: Session automatically restored
7. **EXPECTED**: Navbar still shows "Table X - Active Session"
8. **EXPECTED**: Cart still has 3 items
9. **EXPECTED**: Can add more items and place order
10. ✅ **PASS** if session persists seamlessly

**Check localStorage:**
```javascript
// Open DevTools Console
localStorage.getItem('activeSession')
// Should show: {"sessionId":"...","tableId":"...","tableNumber":"5",...}
```

---

### 🔙 TEST 4: Back Navigation

**Steps:**
1. Complete TEST 1 (scan QR, active session)
2. Click "Back" button in browser
3. Navigate forward to menu again
4. **EXPECTED**: URL params might be lost
5. **EXPECTED**: Session still works (restored from localStorage)
6. **EXPECTED**: Navbar shows session info
7. **EXPECTED**: Can continue ordering
8. ✅ **PASS** if session survives navigation

---

### ⏰ TEST 5: Expired Session Handling

**Steps:**
1. Scan QR and get active session
2. Open DevTools → Application → localStorage
3. Find `activeSession` key
4. Edit the `timestamp` to 10 hours ago:
   ```json
   {
     "sessionId": "...",
     "timestamp": "2025-12-29T00:00:00Z"  // Old date
   }
   ```
5. Refresh page
6. **EXPECTED**: Session validation fails
7. **EXPECTED**: localStorage cleared
8. **EXPECTED**: "Scan QR to Order" overlay shown
9. ✅ **PASS** if expired sessions are rejected

---

### 🏪 TEST 6: Cross-Restaurant Session

**Steps:**
1. Scan QR for Restaurant A (get session)
2. **EXPECTED**: Navbar shows "Table 5" for Restaurant A
3. Navigate to Restaurant B's menu: `/restro/[restaurant-b-id]/menu`
4. **EXPECTED**: Restaurant A's session not applied
5. **EXPECTED**: "Scan QR to Order" overlay shown
6. **EXPECTED**: Must scan Restaurant B's QR to order
7. ✅ **PASS** if sessions are restaurant-specific

---

### 👨‍🍳 TEST 7: Dashboard Order Status Update

**Steps:**
1. Login as restaurant owner/staff
2. Navigate to Dashboard → KOT (Kitchen Display)
3. Place an order from customer side (complete TEST 1)
4. **EXPECTED**: Order appears in KOT with "New" status
5. Click "START COOKING" button
6. **EXPECTED**: Status changes to "Cooking"
7. **EXPECTED**: Toast: "Order started cooking!"
8. Click "READY TO SERVE" button
9. **EXPECTED**: Status changes to "Served"
10. **EXPECTED**: Order removed from KOT queue
11. ✅ **PASS** if status updates work

---

## 🐛 Known Issues to Test For

### Issue 1: QR Scanner Not Opening
**Symptom**: Click "Scan QR" but camera doesn't open  
**Check**: Browser camera permissions granted?  
**Fix**: Go to Settings → Privacy → Camera → Allow localhost

### Issue 2: Session Not Restoring
**Symptom**: Refresh page, session lost  
**Check**: localStorage not cleared?  
**Debug**:
```javascript
console.log(localStorage.getItem('activeSession'));
```

### Issue 3: 403 Error on Order Place
**Symptom**: Order placement fails with 403  
**Check**: Is session still active in backend?  
**Debug**: Check backend logs for session validation

---

## 📱 Mobile Testing

### iOS Safari
1. Open Safari on iPhone
2. Navigate to `http://[your-computer-ip]:3000`
3. Allow camera permissions when prompted
4. Test QR scanner with physical QR code
5. Verify touch interactions work

### Android Chrome
1. Open Chrome on Android
2. Navigate to `http://[your-computer-ip]:3000`
3. Allow camera permissions
4. Test QR scanner
5. Verify back button behavior

---

## 🔍 Developer Tools Checks

### Console Logs to Look For
```
[Session] Restoring from URL params: {sessionId: "...", tableId: "..."}
[Session] Using context session: abc-123
[Session] No valid session found
[QR] Scanned token: xyz-789
[API] GET /api/sessions/session/abc-123
```

### Network Tab
- Check `/api/sessions/session/:id` returns `200 OK`
- Verify `status: "active"` in response
- Check `/api/orders/make-order` includes `tableSessionId`

### localStorage Inspector
```javascript
// Should exist after QR scan
activeSession: {
  "sessionId": "uuid-here",
  "restaurantId": "uuid-here", 
  "tableId": "uuid-here",
  "tableNumber": "5",
  "timestamp": "2025-12-30T..."
}

// Should exist after adding to cart
cart_[restaurantId]: {
  "variant-id-1": 2,
  "variant-id-2": 1
}
```

---

## ✅ Acceptance Criteria

**Phase 1 is COMPLETE when:**

- [ ] Cannot order without scanning QR code ✅
- [ ] Direct menu access shows blocking overlay ✅
- [ ] Session persists across page refresh ✅
- [ ] Session persists across back/forward navigation ✅
- [ ] Expired sessions are auto-cleared ✅
- [ ] Navbar shows active table number ✅
- [ ] Cart requires valid session ✅
- [ ] Order placement requires valid session ✅
- [ ] Dashboard staff can update order status ✅
- [ ] No orders with `table: null` possible ✅

---

## 🚨 Emergency Rollback

If critical issues found:

```bash
# Revert menu page changes
git checkout HEAD~1 frontend/app/restro/[id]/menu/page.tsx

# Revert navbar changes
git checkout HEAD~1 frontend/components/Navbar.tsx

# Restart frontend
cd frontend
npm run dev
```

---

## 📊 Success Metrics

**Track these metrics post-deployment:**

- **QR Scan Rate**: % of orders with valid sessionId
- **Orphan Orders**: Count of orders with `table: null` (should be 0)
- **Session Drop Rate**: % of sessions lost during dining
- **Order Completion**: % of sessions that place at least 1 order
- **Staff Efficiency**: Time from order placed → served

**Target Goals:**
- QR Scan Rate: 100%
- Orphan Orders: 0
- Session Drop Rate: <2%
- Order Completion: >85%
- Staff Efficiency: <15 min average

---

*Last Updated: December 30, 2025*  
*Status: Ready for Testing* ✅
