# Table Session Management System - Complete Documentation

## System Overview

This is a comprehensive table session management system that enables:
- QR code scanning for automatic table selection
- Manual table selection for walk-in customers
- Session-based ordering with multiple orders per session
- Real-time session tracking and management
- Complete order history per session
- Session closure and table availability management

## Architecture

### Backend Components
1. **Session Routes** (`/api/sessions/*`)
   - QR validation
   - Session creation/management
   - Table availability
   - Session closure

2. **Order Routes** (`/api/orders/*`)
   - Order placement within sessions
   - Order status management
   - Order history retrieval

### Frontend Components
1. **QR Scan Page** (`/qr/[token]`)
2. **Table Selection Page** (`/restro/[id]/select-table`)
3. **Session Summary Page** (`/session/[sessionId]`)
4. **Session Context Provider** (Global state management)
5. **Session Banner** (Active session indicator)
6. **Session Cart** (Order placement component)

---

## API Endpoints

### 1. Validate QR Token
**GET** `/api/sessions/validate-qr/:token`

Validates a QR code token and returns table/restaurant information.

**Response:**
```json
{
  "success": true,
  "data": {
    "qrToken": "abc123",
    "tableId": "table_123",
    "tableNumber": "5",
    "capacity": 4,
    "restaurantId": "rest_456"
  }
}
```

**Error Responses:**
- 404: Invalid QR code
- 403: QR code is locked
- 409: Table is occupied

---

### 2. Create Session
**POST** `/api/sessions/create-session`

Creates a new table session or joins an existing active session.

**Request Body:**
```json
{
  "tableId": "table_123",
  "restaurantId": "rest_456",
  "qrToken": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_789",
  "message": "Session created successfully",
  "data": {
    "id": "session_789",
    "tableId": "table_123",
    "restaurantId": "rest_456",
    "status": "active",
    "paymentStatus": "unpaid",
    "startedAt": "2025-12-28T10:00:00Z"
  }
}
```

**Notes:**
- If `tableId` is not provided, creates a takeaway/delivery session
- If an active session exists for the table, returns existing session
- Automatically sets table status to "occupied"

---

### 3. Get Session Details
**GET** `/api/sessions/session/:sessionId`

Retrieves complete session details including all orders and items.

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "session_789",
      "tableId": "table_123",
      "tableNumber": "5",
      "restaurantId": "rest_456",
      "status": "active",
      "paymentStatus": "unpaid",
      "startedAt": "2025-12-28T10:00:00Z",
      "calculatedSubtotal": 50000,
      "calculatedDiscount": 0,
      "calculatedGst": 9000,
      "calculatedGrandTotal": 59000
    },
    "orders": [
      {
        "orderId": "order_111",
        "orderStatus": "placed",
        "subtotal": 25000,
        "discount": 0,
        "gst": 4500,
        "grandTotal": 29500,
        "createdAt": "2025-12-28T10:05:00Z",
        "items": [
          {
            "orderItemId": "item_222",
            "menuItemName": "Butter Chicken",
            "variantName": "Full",
            "quantity": 1,
            "unitPrice": 25000,
            "totalPrice": 25000,
            "itemStatus": "placed"
          }
        ]
      }
    ],
    "summary": {
      "totalOrders": 2,
      "totalItems": 5,
      "subtotal": 50000,
      "discount": 0,
      "gst": 9000,
      "grandTotal": 59000
    }
  }
}
```

**Notes:**
- All prices in paise (₹1 = 100 paise)
- Includes real-time calculated totals across all orders
- Returns complete order history with items

---

### 4. Get Active Session
**GET** `/api/sessions/active-session/:restaurantId?tableId=xxx`

Finds an active session for a restaurant or specific table.

**Query Parameters:**
- `tableId` (optional): Filter by specific table

**Response:**
```json
{
  "success": true,
  "sessionId": "session_789",
  "data": {
    "sessionId": "session_789",
    "tableId": "table_123",
    "tableNumber": "5",
    "status": "active",
    "startedAt": "2025-12-28T10:00:00Z"
  }
}
```

**Response (No Active Session):**
```json
{
  "success": true,
  "sessionId": null,
  "message": "No active session found"
}
```

---

### 5. Get Available Tables
**GET** `/api/sessions/available-tables/:restaurantId`

Returns all available (unoccupied) tables for a restaurant.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "tableId": "table_123",
      "tableNumber": "5",
      "capacity": 4,
      "status": "available",
      "location": "Window Side"
    },
    {
      "tableId": "table_124",
      "tableNumber": "6",
      "capacity": 6,
      "status": "available",
      "location": "Garden Area"
    }
  ]
}
```

---

### 6. Close Session
**PUT** `/api/sessions/close-session/:sessionId`

Closes an active session and makes the table available.

**Response:**
```json
{
  "success": true,
  "message": "Session closed successfully"
}
```

**Side Effects:**
- Sets session status to "closed"
- Sets session endedAt timestamp
- Updates table status to "available"

---

### 7. Place Order (with Session)
**POST** `/api/orders/make-order`

Places a new order within a session.

**Request Body:**
```json
{
  "tableSessionId": "session_789",
  "restaurantId": "rest_456",
  "items": [
    {
      "menuItemId": "item_123",
      "menuItemVariantId": "variant_456",
      "quantity": 2,
      "notes": "Extra spicy"
    }
  ],
  "notes": "Please serve together"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order_111",
  "message": "Order placed successfully",
  "data": {
    "id": "order_111",
    "tableSessionId": "session_789",
    "restaurantId": "rest_456",
    "status": "placed",
    "subtotal": 50000,
    "discount": 0,
    "gst": 9000,
    "grandTotal": 59000,
    "items": [...]
  }
}
```

**Notes:**
- Automatically calculates prices from variant data
- Applies billing calculations (GST, discounts)
- Associates order with session
- Multiple orders can be placed in the same session

---

## User Flows

### Flow 1: QR Code Scan → Order

1. Customer scans QR code on table
2. Redirected to `/qr/[token]`
3. System validates QR token
4. System creates/joins table session
5. Session info stored in localStorage
6. Redirected to `/restro/[id]/menu?session=[sessionId]`
7. Customer browses menu and adds items to cart
8. Customer clicks "Place Order"
9. Order created within session
10. Redirected to `/session/[sessionId]` to view order status

### Flow 2: Manual Table Selection → Order

1. Customer visits restaurant page
2. Clicks "Select Table" or visits `/restro/[id]/select-table`
3. System shows available tables
4. Customer selects a table
5. System creates session for selected table
6. Redirected to menu with session context
7. Continue as Flow 1 from step 7

### Flow 3: Takeaway/Delivery (No Table)

1. Customer visits restaurant page
2. Selects "Order for Takeaway"
3. System creates session without table
4. Redirected to menu
5. Continue as Flow 1 from step 7

### Flow 4: Multiple Orders in Session

1. Customer has active session (from any flow above)
2. Customer places first order
3. Redirected to session summary page
4. Customer clicks "Add More Items"
5. Returned to menu with session context
6. Customer adds more items
7. Places another order (2nd, 3rd, etc.)
8. All orders tracked in same session

### Flow 5: Session Closure

1. Customer views session summary
2. All orders visible with real-time status
3. Customer requests bill/payment
4. After payment confirmed, clicks "Close Session"
5. System closes session
6. Table becomes available
7. Customer redirected to explore page

---

## Frontend Components

### SessionContext
Global state management for active sessions.

**Usage:**
```tsx
import { useSession } from '@/lib/session-context';

function MyComponent() {
  const { session, setSession, clearSession, refreshSession } = useSession();
  
  // session contains:
  // - sessionId
  // - restaurantId
  // - tableId
  // - tableNumber
  // - timestamp
}
```

### SessionBanner
Shows active session indicator across the app.

**Features:**
- Displays table number or "Active Order Session"
- Quick link to view session details
- Dismissible

### SessionCart
Cart component with session integration.

**Features:**
- Shows cart items and total
- Displays active session info
- "Place Order" button
- Redirects to table selection if no session
- Auto-assigns order to current session

---

## Database Schema

### table_session
```sql
CREATE TABLE table_session (
  id TEXT PRIMARY KEY,
  table_id TEXT REFERENCES tables(id),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  qr_token TEXT REFERENCES table_qr(qr_token),
  status TEXT NOT NULL DEFAULT 'active', -- active, closed, cancelled, payment_pending
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid, paid, partial
  created_by_user_id TEXT REFERENCES auth_users(id),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP,
  discount_percentage INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### orders (with session)
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  table_session_id TEXT REFERENCES table_session(id),
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
  placed_by_user_id TEXT REFERENCES auth_users(id),
  status TEXT NOT NULL DEFAULT 'placed', -- placed, preparing, served, cancelled
  subtotal INTEGER,
  discount INTEGER,
  gst INTEGER,
  grand_total INTEGER,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## Key Features

### ✅ Session Management
- Create sessions via QR or manual selection
- Multiple orders within single session
- Session status tracking (active/closed)
- Auto table occupation management

### ✅ QR Code Integration
- QR validation and table mapping
- Auto session creation on scan
- Locked QR code handling
- Occupied table detection

### ✅ Order Management
- Session-based ordering
- Multiple orders per session
- Real-time order status
- Complete order history

### ✅ Table Management
- Available table listing
- Table selection UI
- Capacity and location info
- Status synchronization

### ✅ Billing & Payments
- Per-order billing calculations
- Session-wide total aggregation
- GST and discount handling
- Payment status tracking

### ✅ User Experience
- Global session context
- Active session indicator
- Session summary dashboard
- Seamless table-to-takeaway flow

---

## Testing the System

### Test QR Flow
1. Create a QR code for a table in the database
2. Access `/qr/[token]` with the QR token
3. Verify session creation and redirect to menu
4. Place an order and verify it's linked to session

### Test Manual Selection
1. Visit `/restro/[restaurantId]/select-table?restaurantId=[id]`
2. Select an available table
3. Verify session creation
4. Place order and check session linkage

### Test Multiple Orders
1. Create a session (any method)
2. Place first order
3. View session summary
4. Return to menu and place second order
5. Verify both orders appear in session summary

### Test Session Closure
1. Have an active session with orders
2. Visit session summary page
3. Close the session
4. Verify table becomes available
5. Verify session status changed to "closed"

---

## Production Checklist

- [ ] QR codes generated for all tables
- [ ] Table data populated with correct capacity/location
- [ ] Session timeout handling implemented
- [ ] Payment integration connected
- [ ] Session closure notifications to staff
- [ ] Analytics tracking for session metrics
- [ ] Error handling for concurrent sessions
- [ ] Session recovery on page reload
- [ ] Cleanup of abandoned sessions
- [ ] Staff dashboard for session monitoring

---

## Support & Troubleshooting

### Session Not Creating
- Check table availability status
- Verify QR token exists in database
- Confirm restaurant ID is valid
- Check backend logs for errors

### Orders Not Linking to Session
- Verify sessionId is present in request
- Check session status is "active"
- Ensure order creation includes tableSessionId

### Table Not Becoming Available
- Check session closure endpoint
- Verify session.tableId is populated
- Check for database constraint issues

---

**System Status:** ✅ Fully Implemented
**Last Updated:** December 28, 2025
**Version:** 1.0.0
