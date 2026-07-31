# QR Code & Table Session Flow Documentation

## 🎯 Complete User Journey

### Phase 1: QR Generation (Restaurant Dashboard)
```
Dashboard → Tables → Generate QR
↓
QR Code Created with Frontend URL: /qr/{token}
↓
QR Code displayed/printed for table
```

### Phase 2: Customer Scans QR
```
Customer scans QR → Opens: https://myquro.com/qr/{token}
↓
Frontend validates token → Calls: POST /api/sessions/create-session
↓
Backend creates session → Auto-locks table (status: 'occupied')
↓
Customer redirected to: /session/{sessionId}
```

### Phase 3: Ordering Phase
```
Customer views menu in session
↓
Places order #1 → POST /api/orders/create-order
↓
Places order #2 → POST /api/orders/create-order
↓
... (can order multiple times during same session)
```

### Phase 4: Payment Phase (Offline)
```
Customer requests bill → Staff calculates total
↓
Customer pays cash/card → Staff verifies payment
↓
Staff updates status: PUT /api/sessions/update-payment-status/{sessionId}
  Body: { paymentStatus: 'paid' }
↓
Payment badge updates in UI: 🟢 Paid
```

### Phase 5: Session Closure
```
Staff clicks "Close Session & Unlock Table"
↓
Backend validates:
  - Payment status (warns if unpaid, allows with confirmation)
  - Session exists and is active
↓
Backend updates:
  - session.status = 'closed'
  - session.paymentStatus = 'paid'
  - table.status = 'available'
↓
Table unlocked and ready for next customer
```

---

## 🔧 Technical Implementation

### 1. QR Code Generation
**File**: `backend/src/routes/restaurant-tables.routes.ts` (Lines 267-285)

```typescript
// Generate QR with frontend URL
const frontendUrl = process.env.CLIENT_URL || 'https://myquro.com';
const scanUrl = `${frontendUrl}/qr/${qrToken}`;

const qrImageBase64 = await QRCode.toDataURL(scanUrl, {
  width: 400,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' }
});
```

**Key Features**:
- Uses `CLIENT_URL` environment variable
- Defaults to `https://myquro.com` for development
- QR size: 400x400px with 2-unit margin
- Returns base64 image with token and table metadata

---

### 2. Table Auto-Locking
**File**: `backend/src/routes/session.routes.ts` (Lines 136-164)

```typescript
// Auto-lock table when session created
if (tableId) {
  await db.update(tables).set({ 
    status: "occupied",
    updatedAt: new Date()
  }).where(eq(tables.id, tableId));
  
  console.log(`Table ${tableId} locked (status: occupied)`);
}
```

**Triggers**:
- POST `/api/sessions/create-session`
- After successful QR token validation
- Before session creation completes

---

### 3. Payment Status Management
**File**: `backend/src/routes/session.routes.ts` (Lines 475-533)

```typescript
// PUT /api/sessions/update-payment-status/:sessionId
router.put('/update-payment-status/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { paymentStatus } = req.body;

  // Validate payment status
  if (!['unpaid', 'partial', 'paid'].includes(paymentStatus)) {
    return res.status(400).json({ error: 'Invalid payment status' });
  }

  // Check session exists and is active
  const session = await db.query.tableSession.findFirst({
    where: eq(tableSession.id, sessionId)
  });

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status === 'closed') {
    return res.status(400).json({ 
      error: 'Cannot update payment status of closed session' 
    });
  }

  // Update payment status
  await db.update(tableSession).set({
    paymentStatus,
    updatedAt: new Date()
  }).where(eq(tableSession.id, sessionId));

  res.json({
    success: true,
    message: 'Payment status updated successfully',
    data: { sessionId, paymentStatus }
  });
});
```

**Payment States**:
- 🔴 **Unpaid**: Default state (customer hasn't paid)
- 🟡 **Partial**: Customer paid part of the bill
- 🟢 **Paid**: Customer paid full amount

---

### 4. Session Closure & Table Unlocking
**File**: `backend/src/routes/session.routes.ts` (Lines 403-458)

```typescript
// Enhanced close-session with payment validation
router.put('/close-session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { paymentStatus } = req.body; // Accept payment status

  const session = await db.query.tableSession.findFirst({
    where: eq(tableSession.id, sessionId)
  });

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Warn if trying to close unpaid session
  if (paymentStatus === 'unpaid') {
    return res.status(400).json({
      error: 'Cannot close session with unpaid status',
      message: 'Please update payment status before closing'
    });
  }

  // Update session status
  await db.update(tableSession).set({
    status: 'closed',
    paymentStatus: paymentStatus || session.paymentStatus,
    updatedAt: new Date()
  }).where(eq(tableSession.id, sessionId));

  // Unlock table
  if (session.tableId) {
    await db.update(tables).set({
      status: 'available',
      updatedAt: new Date()
    }).where(eq(tables.id, session.tableId));
    
    console.log(`Table ${session.tableId} unlocked (status: available)`);
  }

  res.json({
    success: true,
    message: 'Session closed and table unlocked successfully'
  });
});
```

**Validation Rules**:
- ✅ Cannot close with status 'unpaid' (returns 400 error)
- ✅ Updates both session status and payment status
- ✅ Auto-unlocks associated table
- ✅ Logs table unlock for audit trail

---

## 🎨 Frontend UI Components

### Payment Status Panel
**File**: `frontend/app/session/[sessionId]/page.tsx` (Lines 414-455)

```tsx
{session.status === 'active' && (
  <div className="border-2 border-purple-200 rounded-lg p-6">
    <h2 className="text-xl font-semibold mb-4">Payment Status Management</h2>
    
    {/* Current Status Badge */}
    <div className="mb-4">
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
        session.paymentStatus === 'paid' 
          ? 'bg-green-100 text-green-800'
          : session.paymentStatus === 'partial'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800'
      }`}>
        {session.paymentStatus === 'paid' ? '🟢 Paid' 
          : session.paymentStatus === 'partial' ? '🟡 Partial' 
          : '🔴 Unpaid'}
      </span>
    </div>

    {/* Update Buttons */}
    <div className="flex gap-3">
      <button
        onClick={() => handleUpdatePaymentStatus('unpaid')}
        disabled={session.paymentStatus === 'unpaid' || updatingPayment}
        className="bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        Mark Unpaid
      </button>
      
      <button
        onClick={() => handleUpdatePaymentStatus('partial')}
        disabled={session.paymentStatus === 'partial' || updatingPayment}
        className="bg-yellow-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        Mark Partial
      </button>
      
      <button
        onClick={() => handleUpdatePaymentStatus('paid')}
        disabled={session.paymentStatus === 'paid' || updatingPayment}
        className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        Mark Paid
      </button>
    </div>
  </div>
)}
```

### Close Session Button
**File**: `frontend/app/session/[sessionId]/page.tsx` (Lines 467-489)

```tsx
<button
  onClick={handleCloseSession}
  disabled={closingSession}
  className="w-full bg-gray-900 text-white py-3 rounded-lg"
>
  {closingSession ? 'Closing...' : 'Close Session & Unlock Table'}
</button>

{/* Warning if unpaid */}
{session.status === 'active' && session.paymentStatus === 'unpaid' && (
  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
    <p className="text-red-800 text-sm">
      ⚠️ Payment status is unpaid. Please update before closing.
    </p>
  </div>
)}
```

---

## 🔄 Complete API Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     QR SCAN & SESSION FLOW                   │
└─────────────────────────────────────────────────────────────┘

1. Generate QR
   POST /api/tables/generate-qr
   ↓
   Returns: QR image (base64) + token + frontend URL

2. Customer Scans QR
   Frontend: /qr/{token}
   ↓
   POST /api/sessions/create-session
   Body: { qrToken, customerName?, phoneNumber? }
   ↓
   - Validates token
   - Creates session
   - Locks table (status: 'occupied')
   ↓
   Returns: { sessionId, tableNumber }
   ↓
   Redirect: /session/{sessionId}

3. Customer Orders (Multiple Times)
   POST /api/orders/create-order
   Body: { sessionId, items: [...] }
   ↓
   Creates order linked to session
   ↓
   Returns: { orderId, orderNumber, total }

4. Staff Updates Payment
   PUT /api/sessions/update-payment-status/{sessionId}
   Body: { paymentStatus: 'paid' | 'partial' | 'unpaid' }
   ↓
   Updates session.paymentStatus
   ↓
   Returns: { success: true }

5. Staff Closes Session
   PUT /api/sessions/close-session/{sessionId}
   Body: { paymentStatus: 'paid' }
   ↓
   - Validates payment status (warns if unpaid)
   - Updates session.status = 'closed'
   - Updates table.status = 'available'
   ↓
   Returns: { success: true, message: 'Table unlocked' }
```

---

## 📊 Database Schema

### Table: `table_session`
```sql
CREATE TABLE table_session (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  table_id TEXT NOT NULL,
  customer_name TEXT,
  phone_number TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'closed'
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid' | 'partial' | 'paid'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (table_id) REFERENCES tables(id)
);
```

### Table: `tables`
```sql
CREATE TABLE tables (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  table_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available', -- 'available' | 'occupied' | 'reserved'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);
```

### Table: `table_qr`
```sql
CREATE TABLE table_qr (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  qr_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES tables(id)
);
```

---

## 🔐 Environment Variables

```env
# Backend (.env)
PORT=4000
CLIENT_URL=https://myquro.com
BACKEND_URL=https://api.myquro.com

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.myquro.com/api
```

---

## ✅ Testing Checklist

### Manual Testing Flow
1. **QR Generation**
   - [ ] Login as restaurant owner
   - [ ] Navigate to Dashboard → Tables
   - [ ] Click "Generate QR" for a table
   - [ ] Verify QR code displays with frontend URL
   - [ ] Verify table number shows in response

2. **QR Scanning & Session Creation**
   - [ ] Scan QR code or manually visit `/qr/{token}`
   - [ ] Verify session creation prompt appears
   - [ ] Enter customer name (optional)
   - [ ] Click "Start Session"
   - [ ] Verify redirect to `/session/{sessionId}`
   - [ ] Verify table status changed to 'occupied' in dashboard

3. **Ordering**
   - [ ] Browse menu in session view
   - [ ] Add items to cart
   - [ ] Place order #1
   - [ ] Verify order appears in session summary
   - [ ] Place order #2 (same session)
   - [ ] Verify both orders show in summary
   - [ ] Verify running total updates

4. **Payment Management**
   - [ ] Verify payment status shows as "🔴 Unpaid"
   - [ ] Click "Mark Partial"
   - [ ] Verify status changes to "🟡 Partial"
   - [ ] Click "Mark Paid"
   - [ ] Verify status changes to "🟢 Paid"
   - [ ] Verify disabled state on current status button

5. **Session Closure**
   - [ ] With status "Paid", click "Close Session & Unlock Table"
   - [ ] Verify success message appears
   - [ ] Verify redirect to confirmation page
   - [ ] Check table status in dashboard (should be 'available')
   - [ ] Try to reopen session (should fail - closed sessions read-only)

6. **Edge Cases**
   - [ ] Try closing session with 'unpaid' status (should show warning)
   - [ ] Try updating payment on closed session (should fail)
   - [ ] Try scanning expired QR token (should show error)
   - [ ] Try creating session with invalid token (should fail)
   - [ ] Try closing non-existent session (should fail)

---

## 🚀 Deployment Considerations

### Production Checklist
- [ ] Set `CLIENT_URL` to production frontend domain
- [ ] Set `BACKEND_URL` to production API domain
- [ ] Configure QR code expiration strategy
- [ ] Implement QR code regeneration for security
- [ ] Add rate limiting to session creation endpoint
- [ ] Add analytics tracking for QR scans
- [ ] Implement session timeout (auto-close after X hours)
- [ ] Add notification system for staff (new sessions)
- [ ] Implement table occupation time tracking
- [ ] Add session history/archive functionality

### Security Considerations
- ✅ QR tokens are unique and stored in database
- ✅ Tokens validated before session creation
- ✅ Session IDs are unique nanoids
- ⚠️ Consider adding token expiration (24 hours)
- ⚠️ Consider adding max sessions per table
- ⚠️ Consider adding session cooldown period

---

## 📈 Future Enhancements

### Phase 2 Features
- [ ] Add payment amount tracking (not just status)
- [ ] Add tip amount field
- [ ] Add payment method field (cash/card/UPI)
- [ ] Add split bill functionality
- [ ] Add discount/promo code support
- [ ] Add tax calculation breakdown
- [ ] Add receipt generation (PDF)
- [ ] Add email receipt to customer
- [ ] Add SMS notifications for order status
- [ ] Add real-time session updates (WebSocket)

### Analytics Features
- [ ] Track average session duration
- [ ] Track table turnover rate
- [ ] Track payment completion time
- [ ] Track orders per session
- [ ] Track revenue per table
- [ ] Track peak hours by table usage

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **No QR Expiration**: QR tokens don't expire automatically
2. **No Session Timeout**: Sessions don't auto-close after X hours
3. **No Payment Amount**: Only tracks status, not actual amounts
4. **No Receipt**: No PDF/email receipt generation
5. **No Real-time Updates**: Staff must refresh to see new orders

### Planned Fixes
- Add cron job for QR token cleanup
- Add session auto-close after 4 hours of inactivity
- Add `totalAmount` and `paidAmount` fields to session
- Integrate receipt generation library
- Add WebSocket for real-time updates

---

## 📞 Support & Troubleshooting

### Common Issues

**QR Code Not Scanning**
- Verify `CLIENT_URL` is set correctly
- Check QR code image quality (should be 400x400)
- Test with multiple QR scanner apps

**Table Not Locking**
- Check database constraints
- Verify `tableId` is passed to create-session
- Check server logs for SQL errors

**Payment Status Not Updating**
- Verify session is 'active' (not 'closed')
- Check network requests in browser DevTools
- Verify backend endpoint is reachable

**Session Won't Close**
- Verify payment status is not 'unpaid'
- Check if session exists and is active
- Verify table relationship exists

---

## 📚 Additional Resources

- [QRCode.js Documentation](https://github.com/soldair/node-qrcode)
- [Drizzle ORM Queries](https://orm.drizzle.team/docs/select)
- [Next.js Routing](https://nextjs.org/docs/app/building-your-application/routing)
- [REST API Best Practices](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)

---

**Last Updated**: 2025-01-27  
**Version**: 1.0  
**Author**: Development Team
