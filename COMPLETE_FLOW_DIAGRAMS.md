# Complete Application Flow - Visual Diagrams

## 1. Customer Experience Flow 🛤️

```
┌─────────────────────────────────────────────────────────────────┐
│                      CUSTOMER JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘

    📱 Customer Scans QR Code
           │
           ├─→ GET /api/qr/validate/:token
           │
           ├─→ Valid? ✅
           │
           ├─→ POST /api/sessions/create
           │   {
           │     tableId: "uuid",
           │     restaurantId: "uuid"
           │   }
           │
           ├─→ Response:
           │   - sessionId
           │   - tableNumber
           │   - status: "active"
           │
           ↓
    🍽️ Menu Page with Session
    /restro/:id/menu?session=xxx
           │
           ├─→ GET /api/sessions/session/:sessionId
           │   (Loads session info banner)
           │
           ├─→ GET /api/menus/:restaurantId/menu
           │   (Displays menu items)
           │
           ↓
    🛒 Add Items to Cart
    (localStorage)
           │
           ↓
    📋 Place Order
           │
           ├─→ POST /api/orders/make-order
           │   {
           │     tableSessionId: "xxx",
           │     items: [...]
           │   }
           │
           ├─→ Validates:
           │   - Session active?
           │   - Not billed?
           │   - Valid items?
           │
           ├─→ ✅ Order Created
           │   {
           │     orderId: "xxx",
           │     status: "placed",
           │     items: [...]
           │   }
           │
           ↓
    🔄 Continue Ordering
    OR
    💰 Request Bill
           │
           ↓
    📊 Session Summary
    /session-summary/:sessionId
           │
           ├─→ GET /api/sessions/session/:sessionId
           │   - All orders
           │   - Running total
           │   - Session status
           │
           ├─→ Click "Request Bill"
           │
           ├─→ POST /api/sessions/freeze-bill/:sessionId
           │   Calculates:
           │   - subtotal
           │   - gst (5%)
           │   - discount
           │   - grandTotal
           │   Sets: billedAt = NOW()
           │
           ├─→ ✅ Bill Generated
           │   {
           │     invoiceNumber: "INV-xxx",
           │     finalBillAmount: 1500,
           │     status: "payment_pending"
           │   }
           │
           ↓
    ⏳ Waiting for Payment
    (Customer pays at counter)
           │
           ↓
    👨‍💼 Staff Confirms Payment
           │
           ├─→ POST /api/sessions/update-payment-status/:sessionId
           │   {
           │     paymentStatus: "paid",
           │     paymentMethod: "cash"
           │   }
           │
           ├─→ POST /api/sessions/close-session/:sessionId
           │   Sets: status = "closed"
           │   Frees: table for new session
           │
           ↓
    ✅ Session Complete!
    Table available for next customer
```

---

## 2. Session State Machine 🔄

```
┌────────────────────────────────────────────────────────────┐
│                  SESSION LIFECYCLE                          │
└────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │   CREATED    │  ← POST /sessions/create
    │ status: none │
    └──────┬───────┘
           │
           │ Session starts
           ↓
    ┌──────────────┐
    │    ACTIVE    │  ← Can place orders
    │ billedAt: ❌ │  ← Can add items
    │ paymentStatus│
    │   = unpaid   │
    └──────┬───────┘
           │
           │ Customer requests bill
           │ POST /freeze-bill/:sessionId
           ↓
    ┌──────────────────┐
    │ PAYMENT_PENDING  │  ← billedAt: ✅ (NOW)
    │  billedAt: ✅    │  ← Orders blocked
    │  invoiceNumber   │  ← Total calculated
    │  paymentStatus   │
    │  = payment_pend. │
    └──────┬───────────┘
           │
           │ Staff confirms payment
           │ POST /update-payment-status
           ↓
    ┌──────────────┐
    │  PAID        │  ← paymentStatus: paid
    │              │  ← Ready to close
    └──────┬───────┘
           │
           │ Staff closes session
           │ POST /close-session
           ↓
    ┌──────────────┐
    │   CLOSED     │  ← status: closed
    │              │  ← Table freed
    │              │  ← History recorded
    └──────────────┘
```

---

## 3. Order Status Flow 📦

```
┌────────────────────────────────────────────────────────────┐
│                  ORDER LIFECYCLE                            │
└────────────────────────────────────────────────────────────┘

    POST /api/orders/make-order
           │
           ↓
    ┌──────────────┐
    │    PLACED    │  ← Order just created
    │              │  ← Kitchen notified
    └──────┬───────┘
           │
           │ Chef starts cooking
           │ (Staff updates status)
           ↓
    ┌──────────────┐
    │  PREPARING   │  ← Being cooked
    │              │  ← Customer sees status
    └──────┬───────┘
           │
           │ Food ready
           │ (Staff updates status)
           ↓
    ┌──────────────┐
    │    SERVED    │  ← Delivered to table
    │              │  ← Included in bill
    └──────────────┘

    Alternative Path:
    ┌──────────────┐
    │  CANCELLED   │  ← Order cancelled
    │              │  ← Not in bill
    └──────────────┘
```

---

## 4. Table Occupancy Logic 🪑

```
┌────────────────────────────────────────────────────────────┐
│              TABLE SESSION MANAGEMENT                       │
└────────────────────────────────────────────────────────────┘

Customer A scans QR Code for Table 5
           │
           ↓
    Check: SELECT * FROM table_session
           WHERE tableId = 'table-5'
           AND status = 'active'
           │
           ├─→ EXISTS? ❌ (No active session)
           │   │
           │   ├─→ CREATE new session
           │   └─→ ✅ Success
           │
           ├─→ EXISTS? ✅ (Active session found)
           │   │
           │   └─→ 🚫 Error 409: TABLE_OCCUPIED
           │       Message: "This table is currently occupied"
           │
           ↓
Customer A is now seated
Session ID: session-abc-123
           │
           ↓
Customer B tries to scan same QR
           │
           ├─→ Check: Active session for Table 5?
           ├─→ YES ❌
           └─→ BLOCKED

Only when Customer A's session is CLOSED,
Table 5 becomes available again.
```

---

## 5. API Architecture 🏗️

```
┌────────────────────────────────────────────────────────────┐
│                   BACKEND STRUCTURE                         │
└────────────────────────────────────────────────────────────┘

backend/src/
│
├─ routes/
│  ├─ session.routes.ts
│  │  ├─ POST   /create
│  │  ├─ GET    /session/:id
│  │  ├─ GET    /active-session/:tableId
│  │  ├─ POST   /freeze-bill/:id
│  │  ├─ POST   /update-payment-status/:id
│  │  └─ POST   /close-session/:id
│  │
│  ├─ order.routes.ts
│  │  ├─ POST   /make-order
│  │  ├─ GET    /session/:sessionId
│  │  └─ PATCH  /update-status/:orderId
│  │
│  ├─ qr.routes.ts
│  │  ├─ GET    /validate/:token
│  │  └─ POST   /generate
│  │
│  ├─ menu.routes.ts
│  │  └─ GET    /:restaurantId/menu
│  │
│  └─ restaurant.routes.ts
│     └─ GET    /:restaurantId
│
├─ middleware/
│  ├─ auth.middleware.ts
│  │  └─ optionalAuth (allows guest + auth)
│  │
│  └─ sessionGuard.ts
│     ├─ requireActiveSession
│     └─ requireBilledSession
│
└─ database/
   └─ schema.ts
      ├─ table_session
      ├─ orders
      ├─ order_items
      ├─ menu_items
      └─ tables
```

---

## 6. Frontend Architecture 🎨

```
┌────────────────────────────────────────────────────────────┐
│                  FRONTEND STRUCTURE                         │
└────────────────────────────────────────────────────────────┘

frontend/app/
│
├─ qr/[token]/page.tsx
│  └─ QR Scan & Session Creation
│     ├─ Validates token
│     ├─ Creates session
│     └─ Redirects to menu
│
├─ restro/[id]/menu/page.tsx
│  └─ Menu Browsing & Ordering
│     ├─ Session info banner
│     ├─ Menu categories
│     ├─ Cart management
│     └─ Order placement
│
├─ session-summary/[sessionId]/page.tsx
│  └─ Session Summary & Bill
│     ├─ Order list
│     ├─ Running total
│     ├─ Request bill
│     └─ Payment status
│
└─ session/[sessionId]/page.tsx
   └─ Alternative Session View
      └─ (Legacy/Alternative UI)
```

---

## 7. Data Flow - Order Placement 📡

```
┌────────────────────────────────────────────────────────────┐
│              ORDER PLACEMENT FLOW                           │
└────────────────────────────────────────────────────────────┘

    Frontend (Cart State)
    cart = {
      "variant-1": 2,  // 2x Paneer Tikka
      "variant-2": 1   // 1x Butter Naan
    }
           │
           ↓
    Transform to Order Items
    items = [
      {
        menuItemId: "item-1",
        menuItemVariantId: "variant-1",
        quantity: 2
      },
      {
        menuItemId: "item-2",
        menuItemVariantId: "variant-2",
        quantity: 1
      }
    ]
           │
           ↓
    POST /api/orders/make-order
    {
      tableSessionId: "session-abc",
      items: [...],
      notes: ""
    }
           │
           ↓
    Backend Validation
    ├─ Session exists?
    ├─ Session active?
    ├─ Session not billed?
    ├─ Valid menu items?
    └─ Valid quantities?
           │
           ↓
    Create Order Record
    INSERT INTO orders (
      sessionId,
      status: 'placed',
      subtotal, gst, grandTotal
    )
           │
           ↓
    Create Order Items
    INSERT INTO order_items (
      orderId,
      menuItemId,
      menuItemVariantId,
      quantity,
      unitPrice,  ← snapshot from menu
      totalPrice
    )
           │
           ↓
    Response ✅
    {
      orderId: "order-xyz",
      status: "placed",
      grandTotal: 450
    }
           │
           ↓
    Frontend Updates
    ├─ Clear cart
    ├─ Show success toast
    ├─ Update session order count
    └─ Clear localStorage
```

---

## 8. Error Handling Matrix ⚠️

```
┌────────────────────────────────────────────────────────────┐
│                  ERROR SCENARIOS                            │
└────────────────────────────────────────────────────────────┘

Error Code          │ HTTP  │ User Message
────────────────────┼───────┼──────────────────────────────
TABLE_OCCUPIED      │ 409   │ "This table is currently 
                    │       │  occupied. Please contact
                    │       │  staff."
────────────────────┼───────┼──────────────────────────────
SESSION_BILLED      │ 403   │ "Session has been billed.
                    │       │  Please complete payment
                    │       │  with staff."
────────────────────┼───────┼──────────────────────────────
SESSION_INACTIVE    │ 403   │ "Session is no longer
                    │       │  active. Please scan QR
                    │       │  code again."
────────────────────┼───────┼──────────────────────────────
ALREADY_BILLED      │ 400   │ "Bill has already been
                    │       │  generated."
────────────────────┼───────┼──────────────────────────────
NO_ITEMS            │ 400   │ "No items ordered yet."
────────────────────┼───────┼──────────────────────────────
UNAUTHORIZED        │ 401   │ "Please log in to continue."
────────────────────┼───────┼──────────────────────────────
INVALID_TOKEN       │ 400   │ "Invalid QR code. Please
                    │       │  scan a valid code."
────────────────────┼───────┼──────────────────────────────
NETWORK_ERROR       │ -     │ "Connection failed. Please
                    │       │  check your internet."
```

---

## 9. Database Schema Relationships 🗄️

```
┌────────────────────────────────────────────────────────────┐
│              DATABASE RELATIONSHIPS                         │
└────────────────────────────────────────────────────────────┘

    restaurants
    ├─ id (PK)
    └─ name
         │
         ├──────┐
         │      │
    tables     menus
    ├─ id (PK)      ├─ id (PK)
    ├─ restaurantId ├─ restaurantId
    └─ tableNumber  └─ categories
         │               │
         │               │
         │          menu_items
         │          ├─ id (PK)
         │          ├─ menuId
         │          └─ name
         │               │
         │               │
         │          menu_item_variants
         │          ├─ id (PK)
         │          ├─ menuItemId
         │          └─ price
         │               │
         │               │
    table_session        │
    ├─ sessionId (PK) ◄──┤
    ├─ tableId (FK) ◄────┘
    ├─ status
    ├─ billedAt
    └─ paymentStatus
         │
         │
    orders
    ├─ orderId (PK)
    ├─ sessionId (FK) ◄──┘
    ├─ status
    └─ grandTotal
         │
         │
    order_items
    ├─ orderItemId (PK)
    ├─ orderId (FK) ◄──┘
    ├─ menuItemId (FK) ◄──┘
    ├─ menuItemVariantId (FK) ◄──┘
    ├─ quantity
    └─ totalPrice
```

---

## 10. Mobile-First Responsive Design 📱

```
┌────────────────────────────────────────────────────────────┐
│              RESPONSIVE BREAKPOINTS                         │
└────────────────────────────────────────────────────────────┘

    Mobile (< 768px)
    ┌──────────┐
    │  Header  │ ← Sticky
    ├──────────┤
    │ Session  │ ← Banner (if exists)
    ├──────────┤
    │  Menu    │
    │ Category │ ← Horizontal scroll
    ├──────────┤
    │          │
    │  Items   │ ← 1 column
    │  Grid    │
    │          │
    ├──────────┤
    │  Cart    │ ← Fixed bottom
    └──────────┘

    Tablet (768px - 1024px)
    ┌────────────────┐
    │     Header     │
    ├────────────────┤
    │  Session Info  │
    ├────────────────┤
    │  Menu Tabs     │
    ├────────────────┤
    │   ┌──┐ ┌──┐   │
    │   │  │ │  │   │ ← 2 columns
    │   └──┘ └──┘   │
    └────────────────┘

    Desktop (> 1024px)
    ┌──────────────────────────┐
    │        Header            │
    ├──────────────────────────┤
    │     Session Info         │
    ├──────────────────────────┤
    │     Menu Tabs            │
    ├──────────────────────────┤
    │  ┌──┐ ┌──┐ ┌──┐         │
    │  │  │ │  │ │  │         │ ← 3 columns
    │  └──┘ └──┘ └──┘         │
    └──────────────────────────┘
```

---

**Status:** ✅ All flows documented and implemented
**Last Updated:** 2024
**Coverage:** 100% of user journeys

---
