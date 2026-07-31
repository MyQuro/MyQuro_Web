# Table Session System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Backend Setup

1. **Start the backend server**
```bash
cd backend
npm run dev
```

Server runs on `https://api.myquro.com`

2. **API Endpoints Available**
- `POST /api/sessions/create-session` - Create new session
- `GET /api/sessions/validate-qr/:token` - Validate QR code
- `GET /api/sessions/session/:sessionId` - Get session details
- `GET /api/sessions/available-tables/:restaurantId` - List tables
- `PUT /api/sessions/close-session/:sessionId` - Close session
- `POST /api/orders/make-order` - Place order in session

### Frontend Setup

1. **Start the frontend**
```bash
cd frontend
npm run dev
```

Frontend runs on `https://myquro.com`

2. **Key Pages**
- `/qr/[token]` - QR scan landing page
- `/restro/[id]/select-table` - Manual table selection
- `/restro/[id]/menu?session=[sessionId]` - Menu with session
- `/session/[sessionId]` - Session summary dashboard

---

## 📱 User Scenarios

### Scenario 1: Customer Scans QR Code

**What Happens:**
1. Customer scans QR code at table
2. Lands on `/qr/abc123`
3. System validates QR token
4. Creates/joins table session
5. Redirects to restaurant menu
6. Session info saved in localStorage

**Code Flow:**
```
QR Scan → Validate Token → Create Session → Store Session → Menu Page
```

### Scenario 2: Walk-in Customer (No QR)

**What Happens:**
1. Customer opens restaurant page
2. Clicks "Select Table"
3. Views available tables
4. Selects Table 5
5. System creates session
6. Redirects to menu

**Code Flow:**
```
Restaurant Page → Select Table Page → Choose Table → Create Session → Menu
```

### Scenario 3: Takeaway Order (No Table)

**What Happens:**
1. Customer opens restaurant page
2. Clicks "Order for Takeaway"
3. System creates session without table
4. Redirects to menu

**Code Flow:**
```
Restaurant Page → Create Session (no table) → Menu
```

### Scenario 4: Multiple Orders in Session

**What Happens:**
1. Customer places first order (Appetizer)
2. Views session summary
3. Clicks "Add More Items"
4. Returns to menu
5. Places second order (Main Course)
6. Both orders tracked in same session

**Code Flow:**
```
Order 1 → Session Summary → Back to Menu → Order 2 → Session Summary (2 orders)
```

---

## 🎯 Testing the System

### Test 1: Create a Session via QR

```bash
# 1. Validate QR (should succeed)
curl https://api.myquro.com/api/sessions/validate-qr/test-qr-token-123

# 2. Create session
curl -X POST https://api.myquro.com/api/sessions/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "table_123",
    "restaurantId": "rest_456",
    "qrToken": "test-qr-token-123"
  }'
```

### Test 2: Place Order in Session

```bash
# Place order (replace session_xxx with actual session ID)
curl -X POST https://api.myquro.com/api/orders/make-order \
  -H "Content-Type: application/json" \
  -d '{
    "tableSessionId": "session_xxx",
    "restaurantId": "rest_456",
    "items": [
      {
        "menuItemId": "item_123",
        "menuItemVariantId": "variant_456",
        "quantity": 2
      }
    ]
  }'
```

### Test 3: View Session Details

```bash
# Get session summary (replace session_xxx)
curl https://api.myquro.com/api/sessions/session/session_xxx
```

### Test 4: Close Session

```bash
# Close session (replace session_xxx)
curl -X PUT https://api.myquro.com/api/sessions/close-session/session_xxx
```

---

## 🔑 Key Components

### Backend

**`session.routes.ts`**
- All session management endpoints
- QR validation logic
- Table availability checks
- Session closure handling

**`order.routes.ts`**
- Order placement with session linking
- Billing calculations
- Order status management

### Frontend

**`/lib/session-context.tsx`**
- Global session state management
- localStorage persistence
- Session refresh logic

**`/components/SessionBanner.tsx`**
- Shows active session indicator
- Quick access to session summary

**`/components/SessionCart.tsx`**
- Cart with session integration
- Place order with auto session linking

**`/app/qr/[token]/page.tsx`**
- QR code landing page
- Token validation
- Session creation
- Auto redirect to menu

**`/app/restro/[id]/select-table/page.tsx`**
- Manual table selection UI
- Available tables display
- Session creation on selection

**`/app/session/[sessionId]/page.tsx`**
- Complete session dashboard
- All orders display
- Real-time totals
- Close session functionality

---

## 💾 Data Flow

### Session Creation
```
User Action
    ↓
Frontend: Validate QR/Select Table
    ↓
API: POST /api/sessions/create-session
    ↓
Database: INSERT into table_session
Database: UPDATE tables SET status='occupied'
    ↓
Response: { sessionId, tableNumber, restaurantId }
    ↓
Frontend: Store in localStorage + SessionContext
    ↓
Redirect to Menu
```

### Order Placement
```
User: Add items to cart
    ↓
User: Click "Place Order"
    ↓
Frontend: Get sessionId from context
    ↓
API: POST /api/orders/make-order
    ↓
Database: INSERT into orders (with tableSessionId)
Database: INSERT into order_items
    ↓
Response: { orderId, grandTotal }
    ↓
Frontend: Redirect to /session/[sessionId]
    ↓
Display: All orders in session with totals
```

### Session Closure
```
User: Click "Close Session"
    ↓
API: PUT /api/sessions/close-session/:sessionId
    ↓
Database: UPDATE table_session SET status='closed'
Database: UPDATE tables SET status='available'
    ↓
Frontend: Clear localStorage
    ↓
Redirect to explore page
```

---

## 🎨 UI Components at a Glance

### SessionBanner (Top Bar)
```
┌─────────────────────────────────────────────┐
│ 🧾 Table 5 | Active Session  [View Session →] │
└─────────────────────────────────────────────┘
```

### SessionCart (Bottom Bar)
```
┌─────────────────────────────────────────────┐
│ 🛒 3 items | Total: ₹590.00  [Place Order →] │
└─────────────────────────────────────────────┘
```

### Session Summary Page
```
┌─────────────────────────────────────────┐
│ Table 5 - Active Session                │
│ Started 15 minutes ago                   │
├─────────────────────────────────────────┤
│ ORDER #1 - 10 mins ago - Served         │
│   • Butter Chicken (Full) x1 - ₹250     │
│   • Naan x2 - ₹80                       │
│   Total: ₹295                           │
├─────────────────────────────────────────┤
│ ORDER #2 - 2 mins ago - Preparing       │
│   • Biryani (Full) x1 - ₹300            │
│   Total: ₹318                           │
├─────────────────────────────────────────┤
│ SESSION TOTAL: ₹613.00                  │
│ [Add More Items] [Close Session]        │
└─────────────────────────────────────────┘
```

---

## 🐛 Common Issues & Solutions

### Issue: "No active session found"
**Solution:** Create a session by scanning QR or selecting a table

### Issue: Table already occupied
**Solution:** Choose a different table or wait for current session to close

### Issue: Session not persisting on reload
**Solution:** Check localStorage for 'activeSession' key

### Issue: Orders not showing in session
**Solution:** Ensure order was placed with correct tableSessionId

### Issue: Can't close session
**Solution:** Payment must be completed before closing (paymentStatus = 'paid')

---

## 📊 Session States

### Session Status
- `active` - Currently in use, can place orders
- `closed` - Completed and table available
- `cancelled` - Cancelled by staff/customer
- `payment_pending` - Awaiting payment

### Payment Status
- `unpaid` - No payment received
- `partial` - Partial payment made
- `paid` - Fully paid, can close session

### Order Status (within session)
- `placed` - Just ordered, kitchen not started
- `preparing` - Kitchen is preparing
- `served` - Delivered to table
- `cancelled` - Cancelled

---

## 🎓 Learning Path

1. **Start Simple**: Test QR flow with a single order
2. **Add Complexity**: Place multiple orders in same session
3. **Test Edge Cases**: Try without QR, test takeaway flow
4. **Monitor State**: Use React DevTools to watch session context
5. **Check Database**: Query tables to see session records

---

## 🚨 Important Notes

- **Session Persistence**: Uses localStorage, survives page reloads
- **Concurrent Sessions**: One active session per table at a time
- **Session Cleanup**: Close sessions to free tables
- **Price Format**: All prices in paise (divide by 100 for ₹)
- **Real-time**: Session summary auto-refreshes every 30 seconds

---

## 📞 Quick Reference

### Environment Variables
```env
# Frontend
NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com

# Backend
DATABASE_URL=postgresql://...
```

### LocalStorage Keys
```javascript
activeSession: {
  sessionId: string,
  restaurantId: string,
  tableId: string | null,
  tableNumber: string | null,
  timestamp: string
}
```

---

## ✨ Next Steps

1. Generate QR codes for all tables
2. Test complete flow from QR → Order → Payment → Close
3. Integrate payment gateway
4. Add staff notifications for new orders
5. Build restaurant dashboard for session monitoring

---

**Ready to go!** 🎉

Start by visiting `/qr/[your-qr-token]` or `/restro/[restaurant-id]/select-table`
