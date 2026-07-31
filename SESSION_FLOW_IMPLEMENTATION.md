# Session-Based Order Flow - Implementation Guide

## Overview

This document describes the complete session-based ordering system that ensures proper table management, order tracking, and payment workflows.

## Core Principles

1. **One Table → One Active Session** - A table can only have one active session at a time
2. **Session = Bill Container** - All orders in a session are combined into a single bill
3. **Staff Authority** - Only restaurant staff can close sessions after payment confirmation
4. **State Enforcement** - Sessions have clear states that control what actions are allowed

## Session States

| State | Description | Allowed Actions |
|-------|-------------|----------------|
| `active` | Session is open, customers can order | Place orders, add items, view menu |
| `payment_pending` | Bill has been frozen, awaiting payment | View orders, wait for staff confirmation |
| `closed` | Payment confirmed, session ended | None (read-only) |
| `cancelled` | Session cancelled by staff | None |

## Payment States

| State | Description |
|-------|-------------|
| `unpaid` | No payment initiated |
| `payment_pending` | Bill frozen, awaiting payment |
| `paid` | Staff confirmed payment |
| `partial` | Partial payment received |

## Complete User Flow

### 1. Customer Scans QR Code

**Endpoint:** `GET /api/sessions/validate-qr/:token`

**What happens:**
- System validates QR token exists
- Checks if table is available
- Returns table and restaurant information

**Possible outcomes:**
- ✅ Success → Proceed to create session
- ❌ Invalid QR → Show error
- ❌ Table locked → Show error

---

### 2. Create Session

**Endpoint:** `POST /api/sessions/create-session`

**Request:**
```json
{
  "tableId": "string",
  "restaurantId": "string",
  "qrToken": "string"
}
```

**What happens:**
- Check if table already has an active session
- If yes → **BLOCK** with 409 status and message
- If no → Create new session and lock table

**Possible outcomes:**
- ✅ Success → Session created, redirect to menu
- ❌ `TABLE_OCCUPIED` → Show "Ask staff to clear table" message
- ❌ `TABLE_OCCUPIED_AWAITING_PAYMENT` → Show "Waiting for payment" message

**Important:** This prevents session hijacking and bill mixing.

---

### 3. Browse Menu & Add Items

**Endpoint:** `GET /api/menus/:restaurantId`

**What happens:**
- User browses menu
- Adds items to cart (client-side only)
- Cart stored in localStorage

**State check:** None (menu is always available)

---

### 4. Place Order

**Endpoint:** `POST /api/orders/make-order`

**Request:**
```json
{
  "tableSessionId": "string",
  "items": [
    {
      "menuItemId": "string",
      "menuItemVariantId": "string",
      "quantity": number,
      "itemNotes": "string"
    }
  ],
  "notes": "string"
}
```

**What happens:**
1. Validate session exists and is active
2. Check session is not billed (`billedAt === null`)
3. Check session status is `active`
4. Calculate order totals
5. Create order record
6. Create order items

**Possible outcomes:**
- ✅ Success → Order placed
- ❌ `SESSION_NOT_FOUND` → Session doesn't exist
- ❌ `SESSION_BILLED` → Bill already frozen, can't add more items
- ❌ `SESSION_INACTIVE` → Session closed or cancelled

**Error Handling:**
```typescript
if (errorData.code === 'SESSION_BILLED') {
  // Show: "Session has been billed. Please request payment from staff."
}
```

---

### 5. Continue Ordering (Multiple Orders in One Session)

**Key Feature:** Users can place multiple orders throughout their dining experience.

**Rules:**
- All orders belong to the same session
- All orders will be included in the final bill
- Orders can be placed until bill is frozen

**Example scenario:**
1. Customer orders appetizers → Order 1
2. 15 minutes later, orders main course → Order 2
3. After meal, orders dessert → Order 3
4. All 3 orders → Combined into one bill

---

### 6. View Session Summary

**Endpoint:** `GET /api/sessions/session/:sessionId`

**What happens:**
- Fetch all orders in the session
- Show all items with statuses
- Calculate running total
- Display table info

**Response includes:**
- All orders with items
- Order statuses (placed, preparing, served)
- Current totals
- Session status

---

### 7. Request Bill (Freeze Session)

**Endpoint:** `POST /api/sessions/freeze-bill/:sessionId`

**What happens:**
1. Validate session is active and not already billed
2. Calculate final totals from all orders
3. Apply any discounts
4. Calculate GST (5%)
5. Generate invoice number
6. Update session:
   - Set `billedAt` timestamp
   - Store frozen amounts
   - Change status to `payment_pending`

**Response:**
```json
{
  "success": true,
  "data": {
    "invoiceNumber": "INV-xxx",
    "subtotal": 50000,
    "discountAmount": 0,
    "taxableBase": 50000,
    "gstAmount": 2500,
    "finalBillAmount": 52500
  }
}
```

**Important:** After this point, NO new orders can be placed.

---

### 8. Payment Process

**Endpoint:** `PUT /api/sessions/update-payment-status/:sessionId`

**Request:**
```json
{
  "paymentStatus": "paid"
}
```

**Who can do this:** Restaurant staff/managers only

**What happens:**
- Staff confirms payment (cash, card, UPI, etc.)
- System updates payment status to `paid`

**Validation:**
- Session must be billed
- Only staff can mark as paid

---

### 9. Close Session

**Endpoint:** `POST /api/sessions/close-session/:sessionId`

**Who can do this:** Restaurant staff/managers only

**What happens:**
1. Verify user is staff
2. Check bill is frozen (`billedAt !== null`)
3. Check payment is confirmed (`paymentStatus === 'paid'`)
4. Close the session:
   - Set status to `closed`
   - Set `endedAt` timestamp
   - Unlock table
   - Unlock QR code

**Validation:**
```typescript
if (session.paymentStatus !== 'paid') {
  return error: "Cannot close - payment not confirmed"
}
```

**Result:** Table is now available for next customer.

---

## Edge Cases & Handling

### 1. Customer Leaves Without Paying

**Scenario:** Customer scans QR, orders, then leaves.

**Handling:**
- Session remains `active` with `billedAt = null`
- Staff dashboard shows "Abandoned session"
- Staff can:
  - Cancel the session
  - Force close
  - Chase payment

---

### 2. Double QR Scan (Race Condition)

**Scenario:** Two customers scan same QR code simultaneously.

**Handling:**
- Database transaction ensures only one session created
- Second request gets 409 `TABLE_OCCUPIED`
- User sees: "Table is occupied"

---

### 3. Menu Price Changes Mid-Session

**Scenario:** Restaurant changes menu prices while customer has active session.

**Handling:**
- Order items store price snapshot at order time
- Session stores frozen amounts at bill time
- Customer always pays the price they saw when ordering

---

### 4. Staff-Initiated Orders (No Customer Phone)

**Scenario:** Elderly customer or customer without phone.

**Flow:**
1. Staff selects table
2. Staff creates session manually
3. Staff adds items on behalf of customer
4. Same bill freeze and payment process
5. Staff closes session

**Same entities, same workflow** - no special case needed.

---

## API Error Codes

### Session Errors

| Code | Status | Meaning | User Action |
|------|--------|---------|-------------|
| `MISSING_SESSION_ID` | 400 | No session ID provided | Technical error |
| `SESSION_NOT_FOUND` | 404 | Session doesn't exist | Scan QR again |
| `SESSION_BILLED` | 400 | Bill already generated | Wait for payment |
| `SESSION_CLOSED` | 400 | Session ended | Scan new QR |
| `SESSION_INACTIVE` | 400 | Session not active | Scan QR again |
| `TABLE_OCCUPIED` | 409 | Table has active session | Ask staff |
| `TABLE_OCCUPIED_AWAITING_PAYMENT` | 409 | Bill generated, awaiting payment | Ask staff |

---

## Database Schema Key Fields

### `table_session`

```typescript
{
  id: string,
  tableId: string | null,
  restaurantId: string,
  qrToken: string | null,
  status: 'active' | 'payment_pending' | 'closed' | 'cancelled',
  paymentStatus: 'unpaid' | 'payment_pending' | 'paid' | 'partial',
  
  // Session timing
  startedAt: timestamp,
  endedAt: timestamp | null,
  billedAt: timestamp | null,
  
  // Bill amounts (in paise)
  subtotal: integer,
  discountAmount: integer,
  taxableBase: integer,
  gstRate: integer,
  gstAmount: integer,
  grandTotal: integer,
  
  // Frozen snapshot (set at billing)
  frozenSubtotal: integer | null,
  frozenTaxableAmount: integer | null,
  frozenGstAmount: integer | null,
  finalBillAmount: integer | null,
  
  invoiceNumber: string | null
}
```

---

## Frontend Integration

### 1. QR Scan Page

**File:** `frontend/app/qr/[token]/page.tsx`

**Flow:**
1. Validate QR token
2. Attempt to create session
3. Handle errors (show blocking message if occupied)
4. On success → redirect to menu

**Error handling:**
```typescript
if (sessionData.code === 'TABLE_OCCUPIED') {
  // Show permanent error, don't redirect
  setMessage("This table is occupied. Please ask staff to clear it.");
  return;
}
```

---

### 2. Menu Page

**File:** `frontend/app/restro/[id]/menu/page.tsx`

**Key features:**
- Read session ID from URL params
- Display cart
- Place orders with session validation
- Handle `SESSION_BILLED` error gracefully

**Error messages:**
```typescript
if (errorData.code === 'SESSION_BILLED') {
  toast.error('Bill has been generated. Please request payment from staff.');
}
```

---

### 3. Session Summary View

**Recommended:** Create a dedicated session view page

**Features:**
- Show all orders
- Show running total
- "Request Bill" button
- Order status tracking

---

## Testing Checklist

### Happy Path
- [ ] Customer scans QR → creates session → orders → bill → payment → close
- [ ] Multiple orders in one session
- [ ] Bill calculation correct
- [ ] Table unlocked after close

### Error Cases
- [ ] Double scan same QR → Second user blocked
- [ ] Order after bill frozen → Blocked
- [ ] Close without payment → Blocked
- [ ] Invalid session ID → Proper error

### Staff Workflows
- [ ] Staff can create session manually
- [ ] Staff can mark payment as paid
- [ ] Staff can close session
- [ ] Staff cannot close without payment

---

## Security Considerations

1. **Session Validation:** Always validate session before any action
2. **Staff Authority:** Verify user is staff before payment/close actions
3. **Price Tampering:** Use server-side price snapshots
4. **Session Hijacking:** Validate `qrToken` and `tableId` match

---

## Performance Considerations

1. **Indexes:** Ensure indexes on:
   - `table_session.tableId` + `status`
   - `orders.tableSessionId`
   - `order_items.tableSessionId`

2. **Caching:** Consider caching menu data

3. **Real-time Updates:** Use WebSockets for kitchen status updates (future enhancement)

---

## Future Enhancements

1. **Split Bills:** Allow multiple payment records per session
2. **Tips:** Add tip amount field
3. **Loyalty Points:** Integrate with customer profiles
4. **Feedback:** Post-meal rating system
5. **Analytics:** Session duration, average order value, etc.

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Update environment variables
- [ ] Test session creation flow
- [ ] Test error handling
- [ ] Test staff workflows
- [ ] Monitor error logs
- [ ] Set up alerts for abandoned sessions

---

## Support & Troubleshooting

### Common Issues

**Problem:** "Session not found" error
**Solution:** Session may have expired. Scan QR code again.

**Problem:** "Table occupied" message
**Solution:** Ask staff to close the previous session.

**Problem:** Orders not appearing
**Solution:** Check session ID matches. Verify orders belong to correct session.

---

## Conclusion

This session-based architecture ensures:
- ✅ No bill mixing between tables
- ✅ Clear payment workflow
- ✅ Staff control over table management
- ✅ Proper state enforcement
- ✅ Audit trail for all transactions

The system is production-ready and follows industry best practices for restaurant management systems.
