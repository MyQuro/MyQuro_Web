# Table Session System - Visual Flow Diagrams

## 🎯 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER ENTRY POINTS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐           │
│  │  QR Code     │   │  Manual      │   │  Takeaway    │           │
│  │  Scan        │   │  Table       │   │  Direct      │           │
│  │  (Camera)    │   │  Selection   │   │  Order       │           │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘           │
│         │                  │                   │                    │
│         └──────────────────┴───────────────────┘                    │
│                            │                                        │
│                            ▼                                        │
│                   ┌────────────────┐                               │
│                   │ CREATE/JOIN    │                               │
│                   │ SESSION        │                               │
│                   └────────┬───────┘                               │
│                            │                                        │
│                            ▼                                        │
│                   ┌────────────────┐                               │
│                   │ BROWSE MENU    │◄──────┐                       │
│                   │ & ADD ITEMS    │       │                       │
│                   └────────┬───────┘       │                       │
│                            │               │                       │
│                            ▼               │                       │
│                   ┌────────────────┐       │                       │
│                   │ PLACE ORDER    │       │                       │
│                   └────────┬───────┘       │                       │
│                            │               │                       │
│                            ▼               │                       │
│                   ┌────────────────┐       │                       │
│                   │ SESSION        │       │                       │
│                   │ SUMMARY        ├───────┘ Add More Items        │
│                   └────────┬───────┘                               │
│                            │                                        │
│                            ▼                                        │
│                   ┌────────────────┐                               │
│                   │ PAYMENT &      │                               │
│                   │ CLOSE SESSION  │                               │
│                   └────────────────┘                               │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 QR Code Scan Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        QR CODE SCAN FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

Customer                   Frontend                Backend              Database
   │                          │                       │                    │
   │  Scans QR Code          │                       │                    │
   ├────────────────────────►│                       │                    │
   │                          │                       │                    │
   │                          │ GET /validate-qr/:token                   │
   │                          ├──────────────────────►│                    │
   │                          │                       │                    │
   │                          │                       │ SELECT table_qr   │
   │                          │                       ├───────────────────►│
   │                          │                       │                    │
   │                          │                       │ table data         │
   │                          │                       │◄───────────────────┤
   │                          │                       │                    │
   │                          │  {success, tableData} │                    │
   │                          │◄──────────────────────┤                    │
   │                          │                       │                    │
   │                          │ POST /create-session  │                    │
   │                          ├──────────────────────►│                    │
   │                          │  {tableId, restId}    │                    │
   │                          │                       │                    │
   │                          │                       │ INSERT table_session
   │                          │                       ├───────────────────►│
   │                          │                       │                    │
   │                          │                       │ UPDATE tables      │
   │                          │                       │ SET status='occupied'
   │                          │                       ├───────────────────►│
   │                          │                       │                    │
   │                          │  {sessionId}          │                    │
   │                          │◄──────────────────────┤                    │
   │                          │                       │                    │
   │ [Store in localStorage]  │                       │                    │
   │◄─────────────────────────┤                       │                    │
   │                          │                       │                    │
   │ [Redirect to Menu]       │                       │                    │
   │◄─────────────────────────┤                       │                    │
   │                          │                       │                    │
```

---

## 🛒 Order Placement Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       ORDER PLACEMENT FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

Customer              SessionCart            Backend              Database
   │                      │                     │                    │
   │  Browse Menu        │                     │                    │
   │  Add Items          │                     │                    │
   ├────────────────────►│                     │                    │
   │                      │  [Cart: 3 items]   │                    │
   │                      │                     │                    │
   │  Click "Place Order"│                     │                    │
   ├────────────────────►│                     │                    │
   │                      │                     │                    │
   │                      │ Get sessionId      │                    │
   │                      │ from context       │                    │
   │                      │                     │                    │
   │                      │ POST /make-order   │                    │
   │                      ├────────────────────►│                    │
   │                      │ {sessionId, items} │                    │
   │                      │                     │                    │
   │                      │                     │ Fetch variant prices
   │                      │                     ├───────────────────►│
   │                      │                     │                    │
   │                      │                     │ Calculate billing  │
   │                      │                     │ (subtotal, GST)    │
   │                      │                     │                    │
   │                      │                     │ INSERT orders      │
   │                      │                     ├───────────────────►│
   │                      │                     │                    │
   │                      │                     │ INSERT order_items │
   │                      │                     ├───────────────────►│
   │                      │                     │                    │
   │                      │   {orderId, total} │                    │
   │                      │◄────────────────────┤                    │
   │                      │                     │                    │
   │  [Success Toast]    │                     │                    │
   │◄─────────────────────┤                     │                    │
   │                      │                     │                    │
   │  [Redirect to Session Summary]            │                    │
   │◄──────────────────────────────────────────┤                    │
   │                      │                     │                    │
```

---

## 📊 Session Summary Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SESSION SUMMARY FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

Customer              Summary Page          Backend              Database
   │                      │                     │                    │
   │  View Session       │                     │                    │
   ├────────────────────►│                     │                    │
   │                      │                     │                    │
   │                      │ GET /session/:id   │                    │
   │                      ├────────────────────►│                    │
   │                      │                     │                    │
   │                      │                     │ SELECT session     │
   │                      │                     ├───────────────────►│
   │                      │                     │                    │
   │                      │                     │ SELECT orders      │
   │                      │                     │ WHERE session_id   │
   │                      │                     ├───────────────────►│
   │                      │                     │                    │
   │                      │                     │ SELECT order_items │
   │                      │                     │ JOIN variants      │
   │                      │                     ├───────────────────►│
   │                      │                     │                    │
   │                      │  {session, orders,  │                    │
   │                      │   items, totals}    │                    │
   │                      │◄────────────────────┤                    │
   │                      │                     │                    │
   │  Display:           │                     │                    │
   │  • Table Number     │                     │                    │
   │  • All Orders       │                     │                    │
   │  • All Items        │                     │                    │
   │  • Running Total    │                     │                    │
   │◄─────────────────────┤                     │                    │
   │                      │                     │                    │
   │  [Auto-refresh every 30s]                 │                    │
   │                      │                     │                    │
```

---

## 🔚 Session Closure Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SESSION CLOSURE FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

Customer              Summary Page          Backend              Database
   │                      │                     │                    │
   │  Click "Close       │                     │                    │
   │  Session"           │                     │                    │
   ├────────────────────►│                     │                    │
   │                      │                     │                    │
   │  [Confirmation Dialog]                    │                    │
   │◄─────────────────────┤                     │                    │
   │                      │                     │                    │
   │  Confirm            │                     │                    │
   ├────────────────────►│                     │                    │
   │                      │                     │                    │
   │                      │ PUT /close-session │                    │
   │                      ├────────────────────►│                    │
   │                      │                     │                    │
   │                      │                     │ UPDATE table_session
   │                      │                     │ SET status='closed'
   │                      │                     │ SET ended_at=NOW()
   │                      │                     ├───────────────────►│
   │                      │                     │                    │
   │                      │                     │ UPDATE tables      │
   │                      │                     │ SET status='available'
   │                      │                     ├───────────────────►│
   │                      │                     │                    │
   │                      │  {success}         │                    │
   │                      │◄────────────────────┤                    │
   │                      │                     │                    │
   │  [Clear localStorage]                     │                    │
   │◄─────────────────────┤                     │                    │
   │                      │                     │                    │
   │  [Redirect to Explore]                    │                    │
   │◄──────────────────────────────────────────┤                    │
   │                      │                     │                    │
```

---

## 🗂️ Database Relationships

```
┌────────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                                 │
└────────────────────────────────────────────────────────────────────────┘

┌──────────────┐           ┌──────────────┐
│ restaurants  │           │   tables     │
├──────────────┤           ├──────────────┤
│ id (PK)      │◄──────────┤ id (PK)      │
│ name         │           │ restaurant_id│
│ address      │           │ table_number │
│ ...          │           │ capacity     │
└──────────────┘           │ status       │
                           │ location     │
                           └──────┬───────┘
                                  │
                                  │ 1:1
                                  │
                           ┌──────▼───────┐
                           │  table_qr    │
                           ├──────────────┤
                           │ id (PK)      │
                           │ table_id     │
                           │ qr_token (UK)│
                           │ is_locked    │
                           └──────┬───────┘
                                  │
                                  │ 1:many
                                  │
                           ┌──────▼──────────┐
                           │ table_session   │
                           ├─────────────────┤
                           │ id (PK)         │
                           │ table_id        │
                           │ restaurant_id   │
                           │ qr_token        │
                           │ status          │
                           │ payment_status  │
                           │ started_at      │
                           │ ended_at        │
                           └──────┬──────────┘
                                  │
                                  │ 1:many
                                  │
                           ┌──────▼──────────┐
                           │    orders       │
                           ├─────────────────┤
                           │ id (PK)         │
                           │ table_session_id│
                           │ restaurant_id   │
                           │ status          │
                           │ subtotal        │
                           │ discount        │
                           │ gst             │
                           │ grand_total     │
                           └──────┬──────────┘
                                  │
                                  │ 1:many
                                  │
                           ┌──────▼──────────┐
                           │  order_items    │
                           ├─────────────────┤
                           │ id (PK)         │
                           │ order_id        │
                           │ menu_item_id    │
                           │ variant_id      │
                           │ quantity        │
                           │ unit_price      │
                           │ total_price     │
                           │ status          │
                           └─────────────────┘
```

---

## 🎨 Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND COMPONENT TREE                            │
└────────────────────────────────────────────────────────────────────────┘

app/
│
├── layout.tsx
│   └── SessionProvider (Context)
│       └── LayoutContent
│           ├── Navbar
│           ├── SessionBanner (Active session indicator)
│           └── {children}
│
├── qr/[token]/page.tsx
│   ├── QR Validation Logic
│   ├── Session Creation
│   └── Redirect to Menu
│
├── restro/[id]/
│   │
│   ├── select-table/page.tsx
│   │   ├── Available Tables List
│   │   ├── Table Selection Cards
│   │   ├── Takeaway Option Button
│   │   └── Session Creation
│   │
│   └── menu/page.tsx
│       ├── Menu Categories
│       ├── Menu Items Grid
│       ├── Cart State
│       └── SessionCart Component
│           ├── Cart Items Display
│           ├── Session Info Badge
│           ├── Total Calculator
│           └── Place Order Button
│
└── session/[sessionId]/page.tsx
    ├── Session Header
    │   ├── Table Number
    │   ├── Session Status
    │   └── Payment Status
    │
    ├── Orders List
    │   └── For each order:
    │       ├── Order Status
    │       ├── Order Items
    │       └── Order Total
    │
    ├── Session Total Summary
    │   ├── Total Subtotal
    │   ├── Total Discount
    │   ├── Total GST
    │   └── Grand Total
    │
    └── Actions
        ├── Add More Items Button
        └── Close Session Button
```

---

## 🔐 Session State Management

```
┌────────────────────────────────────────────────────────────────────────┐
│                      SESSION STATE FLOW                                 │
└────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────┐
                        │  SessionContext │
                        │  (Global State) │
                        └────────┬────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
         ┌────────▼────────┐    │    ┌────────▼────────┐
         │  localStorage   │    │    │   React State   │
         │  (Persistence)  │    │    │   (Runtime)     │
         └─────────────────┘    │    └─────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
           ┌────────▼────────┐    ┌────────▼────────┐
           │  QR Scan Page   │    │   Menu Page     │
           │  SessionBanner  │    │   SessionCart   │
           │  Table Select   │    │   Summary Page  │
           └─────────────────┘    └─────────────────┘

Session Data Structure:
{
  sessionId: string,
  restaurantId: string,
  tableId: string | null,
  tableNumber: string | null,
  qrToken: string | null,
  timestamp: string
}

Operations:
• setSession(data)  - Update session
• clearSession()    - Remove session
• refreshSession()  - Reload from backend
```

---

## 📱 Responsive Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                         MOBILE VIEW (< 768px)                           │
└────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┐
│        Navbar (Fixed)         │
├───────────────────────────────┤
│    SessionBanner (Active)     │
├───────────────────────────────┤
│                               │
│                               │
│     Page Content              │
│     (Scrollable)              │
│                               │
│                               │
│                               │
├───────────────────────────────┤
│   SessionCart (Fixed Bottom)  │
│   🛒 3 items | [Place Order]  │
└───────────────────────────────┘


┌────────────────────────────────────────────────────────────────────────┐
│                        DESKTOP VIEW (> 768px)                           │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                      Navbar (Fixed)                                     │
├────────────────────────────────────────────────────────────────────────┤
│              SessionBanner (Active - Dismissible)                       │
├─────────────────────────────┬──────────────────────────────────────────┤
│                             │                                          │
│   Menu Categories           │   Menu Items Grid                        │
│   (Sticky Sidebar)          │   (3-4 columns)                         │
│                             │                                          │
│   • Appetizers              │   ┌───────┐ ┌───────┐ ┌───────┐        │
│   • Main Course             │   │ Item  │ │ Item  │ │ Item  │        │
│   • Desserts                │   │       │ │       │ │       │        │
│   • Beverages               │   └───────┘ └───────┘ └───────┘        │
│                             │                                          │
└─────────────────────────────┴──────────────────────────────────────────┘
│             SessionCart (Fixed Bottom - Full Width)                    │
│   🛒 3 items | Total: ₹590.00 | [Place Order →]                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Real-time Updates

```
┌────────────────────────────────────────────────────────────────────────┐
│                     REAL-TIME UPDATE FLOW                               │
└────────────────────────────────────────────────────────────────────────┘

Session Summary Page:

    ┌─────────────────┐
    │  Page Loads     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Fetch Session   │
    │ GET /session/:id│
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Display Data    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Start Interval  │
    │ (30 seconds)    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Re-fetch Session│────┐
    └────────┬────────┘    │
             │             │
             ▼             │
    ┌─────────────────┐    │
    │ Update UI       │    │
    └────────┬────────┘    │
             │             │
             └─────────────┘
             Loop continues...

Updates include:
• Order status changes (placed → preparing → served)
• New orders added
• Payment status
• Session totals
```

---

## 🎯 Success Metrics

```
Session Lifecycle Metrics:

┌────────────────────┐
│ QR Scan            │ 100 scans/day
├────────────────────┤
│ ↓ 95% success      │
├────────────────────┤
│ Session Created    │ 95 sessions/day
├────────────────────┤
│ ↓ 90% conversion   │
├────────────────────┤
│ First Order Placed │ 85 orders/day
├────────────────────┤
│ ↓ 40% add more     │
├────────────────────┤
│ Additional Orders  │ 34 orders/day
├────────────────────┤
│ ↓ 100% completion  │
├────────────────────┤
│ Session Closed     │ 95 closures/day
└────────────────────┘

Avg Session Duration: 45 minutes
Avg Orders per Session: 2.4
Avg Items per Order: 3.2
Avg Session Value: ₹850
```

---

**Visual Flow Documentation Complete** ✨
