# Quick Start Guide - New Payment System

## For Staff/Restaurant Owners

### How to Handle Payment Requests

1. **Navigate to Billing & Payments**
   - Click "Billing & Payments" in the sidebar
   - You'll see all pending payment requests

2. **View Pending Payments**
   - Top cards show:
     - Number of pending payments
     - Total amount waiting
     - Currently selected table
   - Each request shows:
     - Table number
     - Bill amount
     - When bill was requested
     - Invoice number

3. **Record a Payment**
   - Click on the payment request card
   - Select payment method from dropdown:
     - 💵 Cash
     - 📱 UPI
     - 💳 Card
     - 🏦 Bank Transfer
     - 🌐 Payment Gateway
   - If using UPI/Bank/Gateway, enter reference number
   - Click "Record Payment"
   - ✅ Done! Payment is recorded and session updates

4. **What Happens After Recording**
   - Payment record is created in database
   - Session status updates to "paid"
   - Request disappears from pending list
   - Customer's SessionBanner no longer shows modal

---

## For Customers

### What You'll See

1. **Active Session**
   - Green SessionBanner at top of screen
   - Shows "Table X - LIVE"
   - Click to view your orders

2. **After Requesting Bill**
   - SessionBanner stays visible
   - But clicking it shows a modal:
     - "Payment Requested"
     - "Bill Has Been Requested"
     - "Staff will assist you shortly"
   - You can:
     - View your session anyway (click "View My Session")
     - Close the modal (click "Close")

3. **Important**
   - You cannot order more items after requesting bill
   - Wait for staff to process your payment
   - SessionBanner will update automatically once paid

---

## API Endpoints Reference

### Get Payment Requests
```typescript
GET /api/sessions/payment-requests/:restaurantId

// Response
{
  success: true,
  data: [
    {
      sessionId: "session_123",
      tableNumber: 5,
      startedAt: "2024-01-15T10:30:00Z",
      billedAt: "2024-01-15T11:45:00Z",
      finalBillAmount: 125000, // in paise (₹1250.00)
      grandTotal: 125000,
      invoiceNumber: "INV-1234567890",
      paymentStatus: "payment_pending",
      status: "payment_pending"
    }
  ]
}
```

### Record Payment
```typescript
POST /api/sessions/record-payment

// Body
{
  "sessionId": "session_123",
  "amount": 125000, // in paise
  "method": "upi", // or "cash", "card", "bank", "gateway"
  "referenceNumber": "UTR123456789" // optional
}

// Response
{
  success: true,
  message: "Payment recorded successfully",
  data: {
    paymentId: "payment_abc",
    sessionId: "session_123",
    amount: 125000,
    method: "upi",
    status: "success"
  }
}
```

---

## Database Tables Involved

### payments
- Stores individual payment records
- Linked to table_session
- Tracks payment method and reference numbers

### table_session
- `paymentStatus` field:
  - `unpaid` - Not billed yet
  - `payment_pending` - Bill requested, awaiting payment
  - `paid` - Payment recorded
- `billedAt` timestamp marks when bill was requested

---

## Troubleshooting

### Payment Request Not Showing
- Check if bill was actually requested (billedAt should be set)
- Verify paymentStatus is "payment_pending"
- Check if you're logged in as staff
- Refresh the page

### Cannot Record Payment
- Verify session has billedAt set (bill was requested)
- Check if payment was already recorded
- Ensure you have staff/manager permissions
- Try refreshing and selecting the table again

### SessionBanner Not Showing Modal
- Wait for next 30-second refresh cycle
- Check if billedAt is actually set in database
- Try clicking "View Session" button again

---

## Status Flow

```
┌─────────────────────────────────────────────────────┐
│                   Customer Journey                   │
└─────────────────────────────────────────────────────┘

1. [Active Session]
   ↓ Customer orders items
   
2. [Active Session]
   ↓ Customer clicks "Request Bill"
   
3. [Payment Pending] ← billedAt timestamp set
   ↓ SessionBanner shows modal
   ↓ Request appears in Billing page
   
4. [Payment Pending]
   ↓ Staff records payment
   
5. [Paid] ← paymentStatus = "paid"
   ↓ Request removed from Billing page
   ↓ SessionBanner no longer shows modal
   
6. [Closed] ← Staff closes session
   ↓ Table becomes available
```

---

## Best Practices

### For Staff:
1. ✅ Check billing page regularly for new requests
2. ✅ Verify amount with customer before recording
3. ✅ Always select correct payment method
4. ✅ Enter reference numbers for digital payments
5. ✅ Print bill if customer requests (button available)

### For Development:
1. ✅ Always use amount in paise (multiply rupees × 100)
2. ✅ Validate payment method from allowed list
3. ✅ Check billedAt before allowing payment recording
4. ✅ Verify staff permissions before payment operations
5. ✅ Log all payment operations for audit trail

---

## Future Features

Planned enhancements:
- 🔔 Real-time notifications when payment requested
- 📧 Automatic e-bill sending after payment
- 📊 Payment analytics dashboard
- 💰 Split payment support
- 🔄 Refund workflow
- 📱 Customer payment via app
- 🧾 Digital receipt generation

---

## Support

For issues or questions:
1. Check [PAYMENT_RESTRUCTURE_SUMMARY.md](./PAYMENT_RESTRUCTURE_SUMMARY.md) for detailed technical documentation
2. Review API logs for error messages
3. Verify database schema matches expected structure
4. Check browser console for frontend errors

---

## Key Benefits

### Before:
- ❌ Separate payment-requests page
- ❌ SessionBanner disappeared when payment requested
- ❌ No integration with payments table
- ❌ Manual payment tracking

### After:
- ✅ Centralized billing & payments page
- ✅ SessionBanner always visible with modal
- ✅ Full payments table integration
- ✅ Automated payment recording
- ✅ Better UX for both staff and customers
- ✅ Complete audit trail in database
