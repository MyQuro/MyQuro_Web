# Payment System Restructure - Implementation Summary

## Overview
Restructured the payment system to centralize payment requests in the billing page and use the payments database table. The SessionBanner now stays visible even when payment is requested, showing a modal instead.

---

## Changes Made

### 1. SessionBanner Component (`frontend/components/SessionBanner.tsx`)

**Fixed:**
- ✅ Removed duplicate state declarations for `sessionDetails` and `showPaymentModal`
- ✅ Removed duplicate `useEffect` for fetching session details
- ✅ Modal properly displays when payment is already requested

**Features:**
- SessionBanner remains visible even when payment is requested (billedAt is set)
- Shows a modal with "Payment Requested" message when user clicks "View Session"
- Modal has two actions:
  - "View My Session" - Navigate to session page anyway
  - "Close" - Dismiss the modal
- Fetches session details every 30 seconds to check for payment status updates

---

### 2. Backend API (`backend/src/routes/session.routes.ts`)

**New Endpoints:**

#### GET `/api/sessions/payment-requests/:restaurantId`
- **Purpose**: Fetch all sessions with pending payments for staff dashboard
- **Auth**: Requires authentication, staff/manager only
- **Returns**: Array of payment request objects with:
  - Session details (id, table number, QR token)
  - Billing information (amounts, GST, invoice number)
  - Timestamps (startedAt, billedAt)
  - Payment status

**Query Logic:**
```typescript
where(
  and(
    eq(tableSession.restaurantId, restaurantId),
    isNotNull(tableSession.billedAt),
    eq(tableSession.paymentStatus, "payment_pending")
  )
)
```

#### POST `/api/sessions/record-payment`
- **Purpose**: Record a payment in the payments table and update session
- **Auth**: Requires authentication, staff/manager only
- **Body Parameters:**
  - `sessionId` (required): Session to record payment for
  - `amount` (required): Amount in paise
  - `method` (required): 'cash' | 'upi' | 'card' | 'bank' | 'gateway'
  - `referenceNumber` (optional): Transaction reference for digital payments
- **Actions:**
  1. Validates session exists and is billed
  2. Creates payment record in `payments` table
  3. Updates session `paymentStatus` to "paid"
- **Returns**: Payment ID and confirmation

**Updated Imports:**
- Added `payments` schema import
- Added `isNotNull` from drizzle-orm
- Removed unused `isNull` import

---

### 3. Billing Dashboard (`frontend/app/dashboard/billing/page.tsx`)

**Complete Redesign:**

**Summary Cards Section:**
- **Pending Payments** - Count of payment requests
- **Total Amount** - Sum of all pending payments
- **Selected** - Currently selected table

**Payment Requests List:**
- Fetches data from `/api/sessions/payment-requests/:restaurantId` endpoint
- Displays each request with:
  - Table number in red gradient circle badge
  - Bill request timestamp
  - Final amount prominently displayed
  - Invoice number
  - Session start time
  - "Payment Pending" orange badge
- Clickable cards with red border highlight when selected
- Empty state with checkmark icon when no pending payments

**Payment Recording Panel:**
- Sticky sidebar that follows scroll
- Shows selected table details with:
  - Table number in gradient badge
  - Total amount due in large red text
- **Payment Form:**
  - Method dropdown with emojis:
    - 💵 Cash
    - 📱 UPI
    - 💳 Card
    - 🏦 Bank Transfer
    - 🌐 Payment Gateway
  - Reference number field (shown only for UPI/Bank/Gateway)
  - "Record Payment" green button
- Additional actions:
  - Print Bill button (placeholder)
- Empty state prompts to select a table

**Removed Features:**
- E-Bill email functionality (moved to separate flow)
- Customer name display (not in payment request data)

---

## Database Schema Usage

### Payments Table Structure
```typescript
{
  id: text (PK, nanoid)
  tableSessionId: text (FK → table_session.id)
  restaurantId: text (FK → restaurants.id)
  amount: integer (paise)
  method: 'cash' | 'upi' | 'card' | 'bank' | 'gateway'
  status: 'pending' | 'success' | 'failed' | 'refunded'
  referenceNumber: text (optional)
  paidByUserId: text (FK → auth_users.id)
  isRefund: boolean (default false)
  createdAt, updatedAt: timestamps
}
```

### Session Payment Status Flow
1. **active** - Customer ordering
2. Customer requests bill → **payment_pending** (billedAt set)
3. Staff records payment → **paid**
4. Staff closes session → **closed**

---

## Status Values

### Session Status
- `active` - Normal ordering state
- `payment_pending` - Bill requested, awaiting payment
- `closed` - Session completed

### Payment Status
- `payment_pending` - Bill frozen, payment requested
- `paid` - Payment recorded
- `unpaid` - Not yet billed

---

## User Experience Flow

### Customer Side:
1. Customer has active session, orders items
2. Customer requests bill from My Session page
3. SessionBanner stays visible but shows modal when clicked
4. Modal informs: "Bill Has Been Requested"
5. Modal shows: "Staff will assist you shortly"
6. Customer can still view session or close modal
7. No additional items can be ordered

### Staff Side:
1. Staff sees payment request appear in "Billing & Payments" page
2. Request shows table number, amount, and timestamps
3. Staff clicks on the request to select it
4. Staff selects payment method from dropdown
5. Staff enters reference number (if applicable)
6. Staff clicks "Record Payment"
7. Payment is recorded in database
8. Session status updates to "paid"
9. Request disappears from pending list
10. Staff can then close the session from another interface

---

## Key Files Modified

### Backend:
- `backend/src/routes/session.routes.ts` (+211 lines)
  - Added 2 new endpoints
  - Fixed field name from `startTime` to `startedAt`
  - Added payments table integration

### Frontend:
- `frontend/components/SessionBanner.tsx` (-31 lines)
  - Removed duplicate code
  - Modal already implemented
  - Refresh mechanism working

- `frontend/app/dashboard/billing/page.tsx` (+145 lines)
  - Complete redesign
  - New API integration
  - Modern UI with summary cards
  - Payment method selection
  - Reference number tracking

---

## Testing Checklist

### SessionBanner:
- [ ] Banner stays visible when payment requested
- [ ] Modal appears on click when billedAt is set
- [ ] Modal shows correct messaging
- [ ] "View My Session" navigates correctly
- [ ] "Close" dismisses modal
- [ ] Session details refresh every 30 seconds

### Billing Page:
- [ ] Payment requests load correctly
- [ ] Summary cards show accurate counts and totals
- [ ] Cards are clickable and show selection state
- [ ] Payment method dropdown works
- [ ] Reference number field appears for digital payments
- [ ] "Record Payment" button submits correctly
- [ ] Success toast appears
- [ ] List refreshes after payment recorded
- [ ] Empty state displays when no requests

### Backend API:
- [ ] `/payment-requests/:restaurantId` returns correct data
- [ ] Staff-only authorization works
- [ ] `/record-payment` creates payment record
- [ ] Session status updates to "paid"
- [ ] Reference numbers are stored correctly
- [ ] Error handling for invalid methods
- [ ] Error handling for already paid sessions

---

## Future Enhancements

### Potential Improvements:
1. **Real-time Updates**: Use WebSocket/SSE for instant payment status updates
2. **Print Bill**: Implement actual print functionality
3. **E-Bill Integration**: Re-add email bill feature with proper flow
4. **Payment History**: Show completed payments archive
5. **Split Payments**: Support partial payments and multiple methods
6. **Refunds**: Implement refund workflow using isRefund flag
7. **Payment Receipt**: Generate and send payment receipt to customer
8. **Analytics**: Payment method breakdown, average bill amounts
9. **Export**: Export payment data to CSV/Excel
10. **Notifications**: Alert staff when new payment request comes in

---

## Color Scheme Adherence

Following the red & white design system:

### Primary Red: `#D32F2F`
- Table number badges
- Selected card borders
- Amount due display
- Primary action buttons

### Red Gradients:
- `from-[#D32F2F] to-[#B71C1C]` - Table badges
- Consistent throughout billing interface

### Supporting Colors:
- **Orange** (`orange-600`, `orange-100`) - Pending payment badges
- **Green** (`green-600`, `green-700`) - Record payment button (success action)
- **Gray** - Neutral text and backgrounds

### Accessibility:
- High contrast ratios maintained
- Clear visual hierarchy
- Focus states preserved
- Semantic HTML used where possible

---

## API Reference

### Authentication
All endpoints require:
```typescript
credentials: 'include' // Send cookies
```

### Error Responses
```typescript
{
  success: false,
  message: string,
  code?: string // Error code for specific handling
}
```

### Success Responses
```typescript
{
  success: true,
  data: T,
  message?: string
}
```

---

## Environment Variables

Required in `.env`:
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com
```

Used for API calls from frontend to backend.

---

## Summary

✅ **Completed:**
- Removed payment-requests standalone page
- Integrated payment display into billing page
- Connected to payments database table
- SessionBanner stays visible with modal notification
- Added payment_pending status handling
- Built required APIs for fetching and recording payments
- Modern, clean UI following design system

🎯 **Result:**
A centralized, professional payment management system that staff can use efficiently while customers are informed about their payment status without losing context of their session.
