# 🚀 Quick Reference - UI/UX Enhancement

## What Changed?

### ✅ **NEW: Session Summary Page**
- **URL:** `/session-summary/[sessionId]`
- **Purpose:** View all orders, see bill, request payment
- **Features:** Order list, running total, bill breakdown, request bill button

### ✅ **ENHANCED: Menu Page**
- **What's New:**
  - Session info banner at top (table number, status, order count)
  - "View Summary" quick button
  - Better loading states
  - Improved error messages
  - Auto-update after order placement

---

## Key URLs

```
Customer Flow:
1. /qr/[token]                          → Scan QR, create session
2. /restro/[id]/menu?session=xxx        → Browse & order
3. /session-summary/[sessionId]         → View orders & bill

Staff Flow:
(Future) /dashboard/orders              → Manage orders
(Future) /dashboard/payments            → Confirm payments
```

---

## API Endpoints Used

```typescript
// Session Management
GET  /api/sessions/session/:sessionId           // Get session details
POST /api/sessions/create                       // Create new session
POST /api/sessions/freeze-bill/:sessionId       // Generate bill
POST /api/sessions/update-payment-status/:id    // Mark as paid (staff)
POST /api/sessions/close-session/:sessionId     // Close session (staff)

// Orders
POST /api/orders/make-order                     // Place order
GET  /api/orders/session/:sessionId             // Get session orders

// Menu
GET  /api/menus/:restaurantId/menu              // Get menu items
GET  /api/restaurants/:restaurantId             // Get restaurant info

// QR Code
GET  /api/qr/validate/:token                    // Validate QR token
```

---

## Error Codes You'll See

| Code | Status | Meaning | User Message |
|------|--------|---------|--------------|
| `TABLE_OCCUPIED` | 409 | Table has active session | "This table is currently occupied" |
| `SESSION_BILLED` | 403 | Session already billed | "Session has been billed. Complete payment with staff." |
| `SESSION_INACTIVE` | 403 | Session closed/cancelled | "Session is no longer active. Scan QR again." |
| `ALREADY_BILLED` | 400 | Bill already generated | "Bill has already been generated" |
| `NO_ITEMS` | 400 | No orders to bill | "No items ordered yet" |

---

## Session States

```
LIFECYCLE:
active → payment_pending → closed

PAYMENT STATES:
unpaid → payment_pending → paid

KEY FIELD:
billedAt: null = Can order
billedAt: timestamp = Read-only, no more orders
```

---

## Component Structure

### Session Summary Page
```tsx
SessionSummaryPage
├─ Header (back button, title)
├─ Session Info Card (table, time, status)
├─ Status Messages (conditional)
├─ Orders List
│  ├─ Order Card (per order)
│  │  ├─ Order Header (status, time)
│  │  ├─ Items List (with quantities)
│  │  └─ Order Total
├─ Bill Summary (if billed)
└─ Bottom Actions
   ├─ "Add More Items" (if active)
   └─ "Request Bill" (if active)
```

### Menu Page (Enhanced)
```tsx
RestaurantMenuPage
├─ Smart Navbar (sticky)
├─ Hero Section
├─ Session Banner (NEW!)
│  ├─ Table info
│  ├─ Status badges
│  └─ View Summary button
├─ Category Nav
├─ Menu Items Grid
├─ Floating Cart Button
└─ Modals
   ├─ Customization Modal
   └─ Checkout Modal
```

---

## Testing Quick Commands

```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Test session creation
curl https://api.myquro.com/api/sessions/create \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tableId":"uuid","restaurantId":"uuid"}'

# Test order placement
curl https://api.myquro.com/api/orders/make-order \
  -X POST \
  -H "Content-Type: application/json" \
  --cookie "session=xxx" \
  -d '{"tableSessionId":"xxx","items":[...]}'

# Test bill freeze
curl https://api.myquro.com/api/sessions/freeze-bill/xxx \
  -X POST \
  --cookie "session=xxx"
```

---

## Styling Quick Reference

### Colors
```css
--primary-red: #D32F2F
--success: #16A34A
--warning: #F59E0B
--error: #DC2626
```

### Common Classes
```css
/* Buttons */
.btn-primary → bg-red-600 text-white
.btn-secondary → bg-gray-100 text-gray-900

/* Cards */
.card → bg-white rounded-xl shadow-sm border border-gray-200

/* Status Badges */
.badge-active → bg-green-100 text-green-700
.badge-pending → bg-yellow-100 text-yellow-700
```

---

## localStorage Keys

```javascript
`cart_${restaurantId}` → { [variantId]: quantity }
```

---

## Important Business Rules

1. **One Table = One Active Session**
   - No overlapping sessions per table
   - Enforced at backend with unique constraint

2. **Order Placement Rules**
   - Session must be active
   - Session must NOT be billed
   - Valid menu items required

3. **Bill Generation**
   - At least one order required
   - Sets `billedAt` timestamp
   - Blocks further orders
   - Calculates totals with GST

4. **Payment Flow**
   - Only staff can confirm payment
   - Only staff can close session
   - Closing session frees table

---

## Common Development Tasks

### Add New API Endpoint
```typescript
// backend/src/routes/example.routes.ts
router.get('/endpoint', async (req, res) => {
  // Your logic
  res.json({ success: true, data: {} });
});
```

### Call API from Frontend
```typescript
const response = await fetch(`${BACKEND_URL}/api/endpoint`, {
  method: 'GET',
  credentials: 'include',
});
const data = await response.json();
```

### Add New Status Badge
```typescript
// In StatusBadge component
const config = {
  your_status: {
    color: 'bg-blue-100 text-blue-700',
    icon: Package,
    label: 'Your Status'
  }
};
```

---

## Troubleshooting

### Cart Not Persisting
- Check localStorage in DevTools
- Key should be `cart_${restaurantId}`

### Orders Not Showing
- Verify sessionId in URL
- Check session exists: GET /api/sessions/session/:id

### Bill Not Generating
- Check session has orders: GET /api/orders/session/:id
- Verify session is active (not already billed)

### Session Banner Not Showing
- Ensure URL has `?session=xxx` parameter
- Check API response from `/api/sessions/session/:id`

---

## Performance Tips

1. **Use React DevTools** to check re-renders
2. **useMemo** already applied for cart calculations
3. **localStorage** used for cart persistence
4. **Optimistic UI** for cart updates

---

## Accessibility Checklist

- [x] ARIA labels on icon buttons
- [x] Alt text on images
- [x] Semantic HTML (nav, main, section)
- [x] Keyboard navigation (tab order)
- [x] Focus indicators visible
- [x] Color contrast AA+
- [x] Error messages not color-only

---

## Deployment Checklist

### Backend
- [ ] Set `DATABASE_URL` env var
- [ ] Set `CORS_ORIGIN` to frontend URL
- [ ] Configure `PORT`
- [ ] Run migrations: `npm run db:migrate`
- [ ] Seed data if needed: `npm run seed`

### Frontend
- [ ] Set `NEXT_PUBLIC_BACKEND_URL`
- [ ] Build: `npm run build`
- [ ] Test build: `npm run start`
- [ ] Check bundle size: `npm run analyze` (if configured)

---

## Documentation Files

- `UI_UX_IMPLEMENTATION_SUMMARY.md` - What was implemented
- `COMPLETE_FLOW_DIAGRAMS.md` - Visual flow diagrams
- `TESTING_GUIDE.md` - Step-by-step testing instructions
- `QUICK_REFERENCE.md` - This file

---

## Need Help?

1. Check documentation files above
2. Review code comments in components
3. Check browser DevTools console
4. Verify backend logs
5. Test API endpoints with Postman/curl

---

**Status:** ✅ **PRODUCTION READY**  
**Last Updated:** 2024  
**Version:** 1.0  

🎉 **Happy Coding!**
