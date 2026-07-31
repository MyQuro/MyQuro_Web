# Testing the Reservation System - Quick Guide

## Current Status
✅ Backend restarted with new permission code  
✅ Frontend permissions updated for staff  
⏳ Awaiting user testing

---

## How to Test Staff Reservation Access

### 1. Login as Staff
- URL: `https://myquro.com`
- Email: `test@staff.com`
- This user is a **staff member** for restaurant `pfgA53ox0V95Y1UmhKoH5`

### 2. Navigate to Dashboard
- After login, go to: `https://myquro.com/dashboard`
- You should see the dashboard (not redirected to `/apply-for-restro`)

### 3. Go to Reservations
- Click **"Reservations"** in the sidebar
- URL should be: `https://myquro.com/dashboard/reservations`

### 4. Verify Access
**You should see:**
- ✅ Reservations list (if any exist)
- ✅ Filter buttons (All / Pending / Confirmed / Rejected)
- ✅ Statistics cards (Pending / Confirmed / Available Tables / Rejected)
- ✅ Action buttons:
  - Green "Confirm" button
  - Blue "Assign Table" button  
  - Red "Reject" (X) button
  - Status dropdown

**You should NOT see:**
- ❌ "You do not have permission" error
- ❌ 403 error
- ❌ Empty page with no controls

---

## Expected Backend Logs

When you access reservations page, backend should show:

```
📋 GET RESTAURANT RESERVATIONS - START: {
  restaurantId: 'pfgA53ox0V95Y1UmhKoH5',
  userId: 'lAowFdPsnyp2O6Xf1sLUHtiEZFCyOZoB',
  hasUser: true
}
🔐 Checking permissions for user: lAowFdPsnyp2O6Xf1sLUHtiEZFCyOZoB restaurant: pfgA53ox0V95Y1UmhKoH5
🔐 Permission check result: true    ← ✅ Should be TRUE now
✅ Permission granted              ← ✅ Should see this
📡 Fetching reservations from database...
✅ Database query complete - Found: X reservations
```

**If you see:**
```
🔐 Permission check result: false
❌ No permission - 403
```
Then the backend code didn't reload properly - restart again.

---

## Testing Actions

### Test 1: View Reservations
1. Go to reservations page
2. Check if any reservations exist
3. Verify you can see guest details

### Test 2: Confirm Reservation
1. If there's a pending reservation, click **"Confirm"**
2. Should see success toast: "Reservation confirmed! Guest will be notified."
3. Reservation should move to "Confirmed Bookings" section
4. Status should change from "Pending" to "Confirmed"

### Test 3: Assign Table
1. Click **"Assign Table"** on a pending reservation
2. Modal should open
3. Select a table from dropdown
4. Click **"Confirm & Assign"**
5. Should see: "Table assigned and reservation confirmed!"
6. Reservation should show table number

### Test 4: Reject Reservation
1. Click the red **X** button on a pending reservation
2. Confirmation dialog: "Are you sure you want to REJECT...?"
3. Click OK
4. Should see: "Reservation rejected"
5. Status should change to "Rejected"

### Test 5: Change Status
1. Use the status dropdown on any reservation
2. Select different status (e.g., "Completed")
3. Confirmation dialog appears
4. Click OK
5. Status updates immediately

---

## Troubleshooting

### Issue: Still getting "403 - No permission"
**Solution:**
1. Stop backend: `Ctrl+C` in backend terminal
2. Restart: `cd backend; npm run dev`
3. Wait for "Backend running on https://api.myquro.com"
4. Refresh browser: `Ctrl+Shift+R`

### Issue: Buttons not showing
**Solution:**
1. Check browser console for errors
2. Verify frontend is running: `https://myquro.com`
3. Hard refresh: `Ctrl+Shift+R`
4. Check permissions in browser dev tools:
   ```javascript
   // Open console and run:
   localStorage.getItem('user')
   // Should show staff role
   ```

### Issue: Empty reservation list
**Solution:**
This is normal if no reservations exist. Create a test reservation:
1. Logout from staff account
2. Login as a customer (or create new customer account)
3. Go to a restaurant page
4. Make a reservation
5. Logout and login back as staff
6. Check reservations page

---

## Quick Backend Restart Command

```powershell
# Stop all Node processes
Get-Process | Where-Object { $_.Path -like "*node.exe*" } | ForEach-Object { Stop-Process -Id $_.Id -Force }

# Restart backend
cd backend
npm run dev
```

---

## Files Changed

### Backend
- ✅ `backend/src/routes/reservation.routes.ts`
  - Line 9: Added `isRestaurantOwnerManagerOrStaff` import
  - Line 375: Updated permission check for view reservations
  - Line 217: Updated permission check for assign table
  - Line 501: Updated permission check for reject
  - Line 584: Updated permission check for status update

### Frontend
- ✅ `frontend/lib/permissions.ts`
  - Line 88: Changed `canManageReservations: false` → `true` for staff role

---

## Success Criteria

✅ Staff user can access dashboard  
✅ Staff user can view reservations page  
✅ Staff user can see all reservations  
✅ Staff user can confirm reservations  
✅ Staff user can assign tables  
✅ Staff user can reject reservations  
✅ Staff user can change reservation status  
✅ No 403 errors in console  
✅ Action buttons are visible and functional  

---

## Next Steps After Testing

If everything works:
1. Test with actual customer reservations
2. Verify notifications are sent
3. Check table status updates correctly
4. Test all status transitions
5. Deploy to production when ready

---

**Last Updated:** December 31, 2024  
**Backend Status:** ✅ Running on port 4000  
**Frontend Status:** ✅ Running on port 3000 (assumed)
