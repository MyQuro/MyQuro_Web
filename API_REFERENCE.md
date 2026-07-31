# API Integration Quick Reference

## Customer-Facing Endpoints (Implemented in Frontend)

### Restaurant Discovery
```typescript
// Get all restaurants
apiClient.getAllRestaurants()

// Get specific restaurant
apiClient.getRestaurant(restaurantId)

// Get restaurant status
apiClient.getRestaurantStatus(restaurantId)

// Get public menu
apiClient.getPublicMenu(restaurantId)
```

### QR & Sessions
```typescript
// QR scan handled by backend redirect
// GET /api/qr/scan/:qrToken
// Creates session and redirects to menu

// Get table session details
apiClient.getTableSession(sessionId)
```

### Ordering
```typescript
// Place order
apiClient.placeOrder({
  tableSessionId: string,
  notes?: string,
  items: [{
    menuItemId: string,
    menuItemVariantId: string,
    quantity: number,
    itemNotes?: string
  }]
})

// Get session orders
apiClient.getSessionOrders(tableSessionId)

// Cancel order
apiClient.cancelOrder(orderId)

// Update order items (add/remove/modify)
apiClient.updateOrderItems(orderId, items)
```

### Billing & Payment
```typescript
// Get current total
apiClient.getSessionTotal(tableSessionId)

// Get final amount with tax & discount
apiClient.getFinalAmount(tableSessionId, discountPercentage, taxRate)

// Generate final bill
apiClient.generateFinalBill(tableSessionId, {
  restaurantId: string,
  discountPercentage: number,
  taxRate: number
})

// Record payment
apiClient.recordSessionPayment(tableSessionId, {
  amount: number,  // in paise
  method: 'cash' | 'card' | 'upi',
  referenceNumber?: string
})
```

### Reservations
```typescript
// Create reservation
apiClient.createReservation(reservationId, {
  restaurantId: string,
  numberOfGuests: number,
  reservationTime: string,  // ISO date
  specialRequests?: string
})

// Get my reservations
apiClient.getMyReservations()

// Get reservation details
apiClient.getReservation(reservationId)

// Cancel reservation
apiClient.cancelReservation(reservationId, restaurantId)
```

### User Orders
```typescript
// Get user's past orders
apiClient.getUserOrders(userId)
```

---

## Restaurant Management Endpoints

### Dashboard
```typescript
// Get dashboard stats
apiClient.getDashboardStats(restaurantId)
```

### Restaurant Profile
```typescript
// Get my restaurant
apiClient.getMyRestaurant()

// Get my role
apiClient.getMyRestaurantRole(restaurantId)

// Update restaurant
apiClient.updateRestaurant(restaurantId, data)

// Open/Close restaurant
apiClient.openRestaurant(restaurantId)
apiClient.closeRestaurant(restaurantId)
```

### Menu Management
```typescript
// Categories
apiClient.getCategories(restaurantId)
apiClient.createCategory(restaurantId, data)
apiClient.updateCategory(categoryId, data)
apiClient.deleteCategory(categoryId)

// Menu Items
apiClient.getMenuItems(restaurantId)
apiClient.createMenuItem(restaurantId, data)
apiClient.updateMenuItem(itemId, data)
apiClient.deleteMenuItem(itemId)

// Variants
apiClient.createVariant(restaurantId, itemId, data)
apiClient.updateVariant(restaurantId, itemId, variantId, data)
apiClient.deleteVariant(restaurantId, itemId, variantId)
```

### Tables & QR
```typescript
// Tables
apiClient.getTables(restaurantId)
apiClient.createTable(restaurantId, data)
apiClient.updateTable(tableId, data)
apiClient.deleteTable(tableId)

// QR Codes
apiClient.generateQR(tableId)

// Sessions
apiClient.getTableSession(sessionId)
apiClient.getActiveSessions(restaurantId)
apiClient.closeTableSession(sessionId)
```

### Order Management
```typescript
// Get restaurant orders
apiClient.getRestaurantOrders(restaurantId)

// Update order status
apiClient.updateOrderStatus(orderId, status)

// Manual order (POS)
apiClient.createManualOrder({
  restaurantId: string,
  tableSessionId: string,
  customerId?: string,
  items: [],
  notes?: string
})
```

### Reservations (Staff)
```typescript
// Get restaurant reservations
apiClient.getRestaurantReservations(restaurantId)

// Assign table to reservation
apiClient.assignTableToReservation(reservationId, tableId)

// Reject reservation
apiClient.rejectReservation(reservationId, restaurantId)
```

### Staff Management
```typescript
// Invite staff
apiClient.inviteStaff(restaurantId, {
  invitedEmail: string,
  role: 'manager' | 'staff'
})

// Get staff invites
apiClient.getStaffInvites(restaurantId)

// Accept invite (staff side)
apiClient.acceptStaffInvite(inviteToken)

// Get my invites
apiClient.getMyInvites()
```

### Offers
```typescript
// Get offers
apiClient.getOffers(restaurantId)

// Create offer
apiClient.createOffer(restaurantId, {
  title: string,
  description: string,
  discountPercentage: number,
  validFrom: string,
  validUntil: string,
  isActive: boolean
})

// Update offer
apiClient.updateOffer(offerId, data)

// Delete offer
apiClient.deleteOffer(offerId)

// Toggle active status
apiClient.toggleOfferActive(offerId)
```

### Analytics
```typescript
// Sales analytics
apiClient.getSalesAnalytics(restaurantId, startDate?, endDate?)

// Item analytics
apiClient.getItemAnalytics(restaurantId, startDate?, endDate?)

// Peak hours
apiClient.getPeakHoursAnalytics(restaurantId, startDate?, endDate?)
```

### Reports
```typescript
// Generate report
apiClient.generateReport(restaurantId, type, startDate, endDate)

// Get reports
apiClient.getReports(restaurantId)

// Download report
apiClient.downloadReport(reportId)
```

### Billing (Staff)
```typescript
// Get total amount
apiClient.getSessionTotal(tableSessionId)

// Generate bill
apiClient.generateBill(tableSessionId, data)

// Send E-bill
apiClient.sendEBill(billId, email)
```

### Payments (Staff)
```typescript
// Record payment
apiClient.recordPayment(tableSessionId, {
  amount: number,
  method: string,
  referenceNumber?: string
})
```

---

## Admin Endpoints (Optional)

```typescript
// Get admin stats
apiClient.getAdminStats()

// Get all restaurants
apiClient.getAdminRestaurants()

// Approve restaurant
apiClient.approveRestaurant(id)

// Reject restaurant
apiClient.rejectRestaurant(id)
```

---

## Usage Examples

### Example 1: Complete Order Flow
```typescript
// 1. QR Scan (automatic redirect)
// User scans QR, backend creates session

// 2. Load menu
const menu = await apiClient.getPublicMenu(restaurantId);

// 3. Place order
const order = await apiClient.placeOrder({
  tableSessionId: sessionId,
  notes: "Extra spicy",
  items: [
    {
      menuItemId: "item-123",
      menuItemVariantId: "variant-456",
      quantity: 2,
      itemNotes: "No onions"
    }
  ]
});

// 4. Track orders
const orders = await apiClient.getSessionOrders(sessionId);

// 5. Request bill
const bill = await apiClient.generateFinalBill(sessionId, {
  restaurantId: restaurantId,
  discountPercentage: 0,
  taxRate: 0
});

// 6. Pay
const payment = await apiClient.recordSessionPayment(sessionId, {
  amount: bill.grandTotal,
  method: 'upi',
  referenceNumber: 'UPI123456'
});
```

### Example 2: Make Reservation
```typescript
const reservation = await apiClient.createReservation(nanoid(), {
  restaurantId: "rest-123",
  numberOfGuests: 4,
  reservationTime: "2025-12-25T19:00:00Z",
  specialRequests: "Window seat please"
});
```

### Example 3: Staff Takes Order (POS)
```typescript
const manualOrder = await apiClient.createManualOrder({
  restaurantId: "rest-123",
  tableSessionId: "session-456",
  items: [
    {
      menuItemId: "item-789",
      menuItemVariantId: "variant-012",
      quantity: 1
    }
  ],
  notes: "Customer special request"
});
```

---

## Error Handling

All API calls return promises and should be wrapped in try-catch:

```typescript
try {
  const result = await apiClient.placeOrder(orderData);
  toast.success('Order placed!');
} catch (error: any) {
  console.error('Order failed:', error);
  toast.error(error.message || 'Failed to place order');
}
```

---

## Price Format

**Important**: All prices in the API are in **paise** (1 Rupee = 100 paise)

```typescript
// Store price in paise
const priceInPaise = 25000; // ₹250.00

// Display price
const displayPrice = formatPrice(priceInPaise); // "₹250.00"

// Helper function
function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}
```

---

## Authentication

All authenticated endpoints automatically include credentials:

```typescript
// API client automatically handles auth
private async request(endpoint: string, options: RequestInit = {}) {
  return fetch(`${this.baseUrl}${endpoint}`, {
    ...options,
    credentials: 'include',  // Includes cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
```

---

## Session Storage

Active table sessions are stored in localStorage:

```typescript
// Store session
localStorage.setItem('activeSession', JSON.stringify({
  sessionId: 'session-123',
  restaurantId: 'rest-456',
  tableId: 'table-789',
  timestamp: new Date().toISOString()
}));

// Retrieve session
const session = JSON.parse(localStorage.getItem('activeSession') || '{}');

// Clear session
localStorage.removeItem('activeSession');
```

---

## Status Enums

### Order Status
- `placed` - Order just placed
- `preparing` - Kitchen is preparing
- `served` - Delivered to table
- `cancelled` - Order cancelled

### Session Status
- `active` - Session open for orders
- `payment_pending` - Bill requested
- `closed` - Payment complete

### Payment Status
- `unpaid` - No payment yet
- `partial` - Some payment received
- `paid` - Fully paid

### Reservation Status
- `pending` - Awaiting confirmation
- `confirmed` - Restaurant confirmed
- `cancelled` - Customer cancelled
- `rejected` - Restaurant rejected
- `completed` - Visit completed
