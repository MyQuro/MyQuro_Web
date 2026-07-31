# Payment System Flow Diagrams

## 1. Customer Experience Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    CUSTOMER SIDE                              │
└──────────────────────────────────────────────────────────────┘

┌─────────────┐
│ Scan QR     │
│ at Table    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Create Session      │
│ status: "active"    │
│ SessionBanner: 🟢   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Browse Menu &       │
│ Place Orders        │
│ (Multiple Orders OK)│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Click "Request Bill"        │
│ in My Session Page          │
└──────┬──────────────────────┘
       │
       ▼
┌───────────────────────────────────────┐
│ Bill Frozen 🔒                        │
│ ✓ billedAt timestamp set              │
│ ✓ status → "payment_pending"          │
│ ✓ paymentStatus → "payment_pending"   │
│ ✓ finalBillAmount calculated          │
│ ✓ GST applied                         │
│ ✓ Invoice number generated            │
│ ✗ Cannot order more items             │
└──────┬────────────────────────────────┘
       │
       ▼
┌────────────────────────────────┐
│ SessionBanner Still Visible 👀 │
│ But shows Modal on Click:      │
│                                │
│ ┌──────────────────────────┐  │
│ │ Payment Requested 💳      │  │
│ │                          │  │
│ │ Bill has been requested  │  │
│ │ Staff will assist shortly│  │
│ │                          │  │
│ │ [View My Session] [Close]│  │
│ └──────────────────────────┘  │
└────────┬───────────────────────┘
         │
         │ 🕐 Wait for Staff...
         │
         ▼
┌────────────────────────────┐
│ Payment Processed by Staff │
│ paymentStatus → "paid"     │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ SessionBanner Updates      │
│ Modal No Longer Shows      │
│ Session Complete ✅        │
└────────────────────────────┘
```

---

## 2. Staff Experience Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     STAFF SIDE                                │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│ Staff Logged In         │
│ Dashboard Open          │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Navigate to                     │
│ "Billing & Payments" Page       │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ View Summary Cards:                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │Pending: 3│ │Total: ₹3K│ │Selected: │ │
│ │Tables    │ │Amount    │ │None      │ │
│ └──────────┘ └──────────┘ └──────────┘ │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ See Payment Requests List:               │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Table 5    ₹1,250  [Payment Pending]│ │
│ │ Invoice: INV-123   11:45 AM        │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Table 8    ₹850    [Payment Pending]│ │
│ │ Invoice: INV-124   11:50 AM        │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ Table 12   ₹1,500  [Payment Pending]│ │
│ │ Invoice: INV-125   11:55 AM        │  │
│ └────────────────────────────────────┘  │
└──────┬───────────────────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Click on Table 5 Request   │
└────────┬───────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Payment Panel Opens (Sidebar):              │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Table 5                             │   │
│  │ ₹1,250.00                           │   │
│  │ Amount Due                          │   │
│  │                                     │   │
│  │ Payment Method:                     │   │
│  │ [💵 Cash            ▼]              │   │
│  │                                     │   │
│  │ [Record Payment]                    │   │
│  │                                     │   │
│  │ [Print Bill]                        │   │
│  └─────────────────────────────────────┘   │
└────────┬────────────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Staff Asks Customer:       │
│ "How would you like        │
│  to pay?"                  │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Customer: "UPI"            │
└────────┬───────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│ Staff Updates Form:                         │
│                                             │
│  Payment Method: [📱 UPI            ▼]     │
│  Reference Number: [UTR123456789   ]       │
│                                             │
│  [Record Payment] ← Click                  │
└────────┬────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Backend API Call:                        │
│ POST /api/sessions/record-payment        │
│                                          │
│ Body: {                                  │
│   sessionId: "session_xyz"               │
│   amount: 125000  // paise              │
│   method: "upi"                          │
│   referenceNumber: "UTR123456789"        │
│ }                                        │
└────────┬─────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Database Operations:                       │
│                                            │
│ 1. Create payment record:                 │
│    INSERT INTO payments (                 │
│      id: "payment_abc"                    │
│      tableSessionId: "session_xyz"        │
│      amount: 125000                       │
│      method: "upi"                        │
│      status: "success"                    │
│      referenceNumber: "UTR123456789"      │
│      paidByUserId: "staff_user_id"        │
│    )                                      │
│                                            │
│ 2. Update session:                        │
│    UPDATE table_session                   │
│    SET paymentStatus = "paid"             │
│    WHERE id = "session_xyz"               │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Success Response ✅        │
│ Toast: "Payment recorded   │
│        successfully!"      │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Request Disappears from    │
│ Pending List               │
│                            │
│ List Refreshes             │
│ Automatically              │
└────────────────────────────┘
```

---

## 3. Database State Transitions

```
┌─────────────────────────────────────────────────────────────┐
│              TABLE_SESSION RECORD LIFECYCLE                  │
└─────────────────────────────────────────────────────────────┘

Initial State:
┌──────────────────────────────────────┐
│ table_session                        │
├──────────────────────────────────────┤
│ id: session_123                      │
│ status: "active"                     │
│ paymentStatus: "unpaid"              │
│ billedAt: null                       │
│ finalBillAmount: null                │
│ startedAt: 2024-01-15 10:30:00      │
│ endedAt: null                        │
└──────────────────────────────────────┘
              │
              │ Customer requests bill
              ▼
After Bill Request:
┌──────────────────────────────────────┐
│ table_session                        │
├──────────────────────────────────────┤
│ id: session_123                      │
│ status: "payment_pending" ✏️         │
│ paymentStatus: "payment_pending" ✏️  │
│ billedAt: 2024-01-15 11:45:00 ✏️    │
│ finalBillAmount: 125000 ✏️          │
│ subtotal: 119000 ✏️                 │
│ gstAmount: 6000 ✏️                  │
│ invoiceNumber: "INV-xxx" ✏️         │
│ startedAt: 2024-01-15 10:30:00      │
│ endedAt: null                        │
└──────────────────────────────────────┘
              │
              │ Staff records payment
              ▼
After Payment Recorded:
┌──────────────────────────────────────┐
│ table_session                        │
├──────────────────────────────────────┤
│ id: session_123                      │
│ status: "payment_pending"            │
│ paymentStatus: "paid" ✏️             │
│ billedAt: 2024-01-15 11:45:00       │
│ finalBillAmount: 125000              │
│ startedAt: 2024-01-15 10:30:00      │
│ endedAt: null                        │
└──────────────────────────────────────┘
              +
┌──────────────────────────────────────┐
│ payments (NEW RECORD)                │
├──────────────────────────────────────┤
│ id: payment_abc                      │
│ tableSessionId: session_123          │
│ restaurantId: rest_xyz               │
│ amount: 125000                       │
│ method: "upi"                        │
│ status: "success"                    │
│ referenceNumber: "UTR123456789"      │
│ paidByUserId: staff_user_id          │
│ createdAt: 2024-01-15 11:50:00      │
└──────────────────────────────────────┘
              │
              │ Staff closes session
              ▼
After Session Closed:
┌──────────────────────────────────────┐
│ table_session                        │
├──────────────────────────────────────┤
│ id: session_123                      │
│ status: "closed" ✏️                  │
│ paymentStatus: "paid"                │
│ billedAt: 2024-01-15 11:45:00       │
│ finalBillAmount: 125000              │
│ startedAt: 2024-01-15 10:30:00      │
│ endedAt: 2024-01-15 11:55:00 ✏️     │
└──────────────────────────────────────┘
              +
┌──────────────────────────────────────┐
│ tables                               │
├──────────────────────────────────────┤
│ id: table_5                          │
│ liveStatus: "available" ✏️           │
│ currentSessionId: null ✏️            │
└──────────────────────────────────────┘
```

---

## 4. API Communication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│ Customer │         │  Staff   │         │ Backend  │
│ Browser  │         │ Browser  │         │   API    │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │ 1. Click "Request Bill"                │
     ├────────────────────────────────────────►│
     │    POST /freeze-bill/:sessionId        │
     │                    │                    │
     │◄───────────────────────────────────────┤
     │    { success: true, billedAt: ... }    │
     │                    │                    │
     │ 2. SessionBanner polls every 30s       │
     ├────────────────────────────────────────►│
     │    GET /session/:sessionId             │
     │                    │                    │
     │◄───────────────────────────────────────┤
     │    { billedAt: "...", paymentStatus }  │
     │                    │                    │
     │                    │ 3. Load Billing Page
     │                    ├────────────────────►│
     │                    │ GET /payment-requests/:restaurantId
     │                    │                    │
     │                    │◄───────────────────┤
     │                    │ { data: [ ... ] }  │
     │                    │                    │
     │                    │ 4. Record Payment  │
     │                    ├────────────────────►│
     │                    │ POST /record-payment
     │                    │ {                  │
     │                    │   sessionId,       │
     │                    │   amount,          │
     │                    │   method: "upi"    │
     │                    │ }                  │
     │                    │                    │
     │                    │◄───────────────────┤
     │                    │ { success: true }  │
     │                    │                    │
     │ 5. SessionBanner refresh detects       │
     ├────────────────────────────────────────►│
     │    GET /session/:sessionId             │
     │                    │                    │
     │◄───────────────────────────────────────┤
     │    { paymentStatus: "paid" }           │
     │                    │                    │
     │ 6. Modal no longer shows               │
     │                    │                    │
```

---

## 5. Component Hierarchy

```
┌───────────────────────────────────────────────────────┐
│                     App Layout                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │              SessionProvider                    │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │         Session Context                    │  │  │
│  │  │  - session data                           │  │  │
│  │  │  - sessionId, tableNumber, qrToken        │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │            SessionBanner (always visible)       │  │
│  │  - Polls session every 30s                     │  │
│  │  - Shows modal if billedAt exists              │  │
│  │  - Green gradient, pulse animation             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │          Dashboard Layout (staff only)          │  │
│  │  ┌───────────────────────────────────────────┐  │  │
│  │  │          Billing & Payments Page          │  │  │
│  │  │  ┌─────────────────────────────────────┐  │  │  │
│  │  │  │      Summary Cards Component        │  │  │  │
│  │  │  │  - Pending count                    │  │  │  │
│  │  │  │  - Total amount                     │  │  │  │
│  │  │  │  - Selected table                   │  │  │  │
│  │  │  └─────────────────────────────────────┘  │  │  │
│  │  │                                           │  │  │
│  │  │  ┌─────────────────────────────────────┐  │  │  │
│  │  │  │   Payment Requests List             │  │  │  │
│  │  │  │  - Map through requests array       │  │  │  │
│  │  │  │  - Clickable cards                  │  │  │  │
│  │  │  │  - Red border when selected         │  │  │  │
│  │  │  └─────────────────────────────────────┘  │  │  │
│  │  │                                           │  │  │
│  │  │  ┌─────────────────────────────────────┐  │  │  │
│  │  │  │   Payment Recording Panel           │  │  │  │
│  │  │  │  - Payment method dropdown          │  │  │  │
│  │  │  │  - Reference number input           │  │  │  │
│  │  │  │  - Record payment button            │  │  │  │
│  │  │  │  - Print bill button                │  │  │  │
│  │  │  └─────────────────────────────────────┘  │  │  │
│  │  └───────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

---

## 6. Error Handling Flow

```
┌─────────────────────────────────────────────────────┐
│              Error Scenarios & Handling              │
└─────────────────────────────────────────────────────┘

Scenario 1: Session Not Billed
────────────────────────────────
Request: POST /record-payment
Condition: session.billedAt === null
Response: {
  success: false,
  message: "Session not billed yet",
  code: "NOT_BILLED"
}
UI Action: Show error toast
          Don't allow payment recording

Scenario 2: Already Paid
─────────────────────────
Request: POST /record-payment
Condition: session.paymentStatus === "paid"
Response: {
  success: false,
  message: "Payment already completed",
  code: "ALREADY_PAID"
}
UI Action: Show error toast
          Remove from list
          Refresh data

Scenario 3: Invalid Payment Method
───────────────────────────────────
Request: POST /record-payment
Condition: method not in ['cash', 'upi', 'card', 'bank', 'gateway']
Response: {
  success: false,
  message: "Invalid payment method..."
}
UI Action: Show error toast
          Keep form open
          Highlight field

Scenario 4: Not Authorized
───────────────────────────
Request: Any payment endpoint
Condition: !req.user || !hasAccess
Response: {
  success: false,
  message: "Access denied",
  code: "UNAUTHORIZED"
}
UI Action: Redirect to login
          Show "Not authorized" message

Scenario 5: Network Error
──────────────────────────
Request: Any API call
Condition: fetch() fails
UI Action: Show error toast
          Retry button
          Keep form data
          Don't clear selection
```

---

## 7. Testing Checklist Flow

```
┌─────────────────────────────────────────────────────┐
│              Complete Test Scenario                  │
└─────────────────────────────────────────────────────┘

Pre-requisites:
✓ Backend running on port 4000
✓ Frontend running on port 3000
✓ Database migrated and seeded
✓ Staff user logged in
✓ Test restaurant exists

Step-by-Step:
┌───┬──────────────────────────────────────┬──────────┐
│ # │ Action                               │ Expected │
├───┼──────────────────────────────────────┼──────────┤
│ 1 │ Scan QR code (customer)              │ ✓ Pass   │
│   │ - Should create session              │          │
│   │ - SessionBanner appears at top       │          │
│   │ - Status: "active"                   │          │
├───┼──────────────────────────────────────┼──────────┤
│ 2 │ Order items                          │ ✓ Pass   │
│   │ - Add 3-4 items to cart             │          │
│   │ - Place order                        │          │
│   │ - Items appear in My Session         │          │
├───┼──────────────────────────────────────┼──────────┤
│ 3 │ Click "Request Bill"                 │ ✓ Pass   │
│   │ - Confirmation modal appears         │          │
│   │ - Shows GST breakdown                │          │
│   │ - Shows final amount                 │          │
├───┼──────────────────────────────────────┼──────────┤
│ 4 │ Confirm bill request                 │ ✓ Pass   │
│   │ - billedAt timestamp set             │          │
│   │ - Status → "payment_pending"         │          │
│   │ - Success message shown              │          │
├───┼──────────────────────────────────────┼──────────┤
│ 5 │ Try to order more items              │ ✓ Pass   │
│   │ - Menu page blocked                  │          │
│   │ - Shows "Bill requested" message     │          │
│   │ - Cannot add to cart                 │          │
├───┼──────────────────────────────────────┼──────────┤
│ 6 │ Click SessionBanner                  │ ✓ Pass   │
│   │ - Modal appears                      │          │
│   │ - Shows "Payment Requested"          │          │
│   │ - Shows warning message              │          │
│   │ - Two buttons present                │          │
├───┼──────────────────────────────────────┼──────────┤
│ 7 │ Wait 30 seconds                      │ ✓ Pass   │
│   │ - SessionBanner refreshes            │          │
│   │ - Data updates automatically         │          │
│   │ - No page reload needed              │          │
├───┼──────────────────────────────────────┼──────────┤
│ 8 │ Staff: Go to Billing page            │ ✓ Pass   │
│   │ - See payment request                │          │
│   │ - Summary cards show count           │          │
│   │ - Amount displayed correctly         │          │
├───┼──────────────────────────────────────┼──────────┤
│ 9 │ Staff: Click on request              │ ✓ Pass   │
│   │ - Card highlighted in red            │          │
│   │ - Sidebar panel appears              │          │
│   │ - Shows table and amount             │          │
├───┼──────────────────────────────────────┼──────────┤
│10 │ Staff: Select payment method         │ ✓ Pass   │
│   │ - Dropdown opens                     │          │
│   │ - All methods listed                 │          │
│   │ - Select "UPI"                       │          │
├───┼──────────────────────────────────────┼──────────┤
│11 │ Staff: Enter reference number        │ ✓ Pass   │
│   │ - Field appears for UPI              │          │
│   │ - Type "UTR123456789"                │          │
│   │ - Validation works                   │          │
├───┼──────────────────────────────────────┼──────────┤
│12 │ Staff: Click "Record Payment"        │ ✓ Pass   │
│   │ - Loading state shown                │          │
│   │ - API call made                      │          │
│   │ - Success toast appears              │          │
├───┼──────────────────────────────────────┼──────────┤
│13 │ Check database                       │ ✓ Pass   │
│   │ - Payment record created             │          │
│   │ - Session paymentStatus = "paid"     │          │
│   │ - Amount matches                     │          │
│   │ - Method = "upi"                     │          │
│   │ - Reference saved                    │          │
├───┼──────────────────────────────────────┼──────────┤
│14 │ Staff: Billing page updates          │ ✓ Pass   │
│   │ - Request removed from list          │          │
│   │ - Summary cards update               │          │
│   │ - Count decreases by 1               │          │
├───┼──────────────────────────────────────┼──────────┤
│15 │ Customer: SessionBanner updates      │ ✓ Pass   │
│   │ - Modal no longer shows              │          │
│   │ - Can view session normally          │          │
│   │ - Payment confirmed                  │          │
└───┴──────────────────────────────────────┴──────────┘

All Tests Passed? → System Working Correctly! ✅
```

This visual documentation helps everyone understand exactly how the payment system works from every angle!
