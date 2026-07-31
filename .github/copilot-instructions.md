# MyQuro Restaurant Platform - AI Agent Instructions

## Architecture Overview

**Full-stack restaurant management platform** with separate Next.js frontend and Express.js backend:

- **Frontend**: Next.js 16 with React 19, TypeScript, Tailwind CSS, mobile-first design
- **Backend**: Express.js with TypeScript, Drizzle ORM, PostgreSQL (Neon)
- **Auth**: Better Auth with Google OAuth and session-based authentication
- **State**: React Context + localStorage for session persistence

## Key Development Patterns

### 1. API Communication
```typescript
// Always use the centralized API client from lib/api-client.ts
import { apiClient } from '../lib/api-client';

// Example: Get user restaurant status
const status = await apiClient.getUserRestaurantStatus();
```

**Critical**: API client includes extensive localhost logging. Check browser console for detailed request/response data during development.

### 2. Authentication & Sessions
```typescript
// Use Better Auth client for auth state
const { data: session, isPending } = authClient.useSession();

// Use custom session context for table sessions
const { session: activeSession } = useSession();
```

**Session Management**: Table sessions auto-refresh every 30 seconds from database. Use `useSession()` context for QR-scanned table sessions.

### 3. Database Queries
```typescript
// Complex joins are common - always check existing patterns
const restaurants = await db
  .select({
    id: restaurants.id,
    name: restaurants.name,
    role: restaurantManagers.role, // Joined field
  })
  .from(restaurantManagers)
  .innerJoin(restaurants, eq(restaurantManagers.restaurantId, restaurants.id))
  .where(eq(restaurantManagers.userId, userId));
```

**Pattern**: Use Drizzle's select with object mapping for complex joins. Check `src/db/schema/` for table relationships.

### 4. Component Structure
```tsx
// Large components with complex state are normal
const [modalOpen, setModalOpen] = useState(false);
const [loading, setLoading] = useState(false);
const [data, setData] = useState<any[]>([]);

// Effects for data fetching
useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await apiClient.someEndpoint();
      setData(result);
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [dependencies]);
```

**UI Pattern**: Red/white color scheme, GSAP animations, mobile-first responsive design. Check `.github/instructions/must_follow_this_rule.instructions.md` for design system.

### 5. Route Protection
```typescript
// middleware.ts handles protected routes
const protectedRoutes = ['/order', '/reservation'];

// Components check auth state
if (!session?.user) return <div>Please sign in</div>;
```

**Auth Flow**: Better Auth session tokens stored in cookies. Middleware redirects unauthenticated users.

## Development Workflow

### Backend Development
```bash
cd backend
npm run dev                    # tsx src/server.ts
npm run drizzle:generate      # Generate migrations
npm run drizzle:migrate       # Run migrations
npm run drizzle:push          # Push schema changes
```

**Important**: Backend requires server restart for code changes (no hot reload).

### Frontend Development
```bash
cd frontend
npm run dev                   # Next.js dev server
npm run lint                  # ESLint check
```

**Hot Reload**: Frontend supports hot reload. Backend requires manual restart.

### Environment Setup
```bash
# Backend .env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://api.myquro.com
CLIENT_URL=https://myquro.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Frontend .env.local
NEXT_PUBLIC_BACKEND_URL=https://api.myquro.com
```

## Common Patterns & Conventions

### Error Handling
```typescript
try {
  const response = await apiClient.someCall();
  // Success handling
} catch (error) {
  console.error('Operation failed:', error);
  // User-friendly error display
}
```

### Loading States
```tsx
{loading ? (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
) : (
  // Content
)}
```

### Data Fetching
```typescript
// Always check for session before API calls
if (!session?.user) return;

// Use loading states for better UX
const [loading, setLoading] = useState(false);
```

### Role-Based Access
```typescript
// High-level roles
const isCustomer = userRole === 'customer';
const isAdmin = userRole === 'admin';
const isRestaurant = userRole === 'restaurant';

// Restaurant sub-roles (when userRole === 'restaurant')
const isOwner = restaurantRole === 'owner';
const isManager = restaurantRole === 'manager';
const isStaff = ['owner', 'manager', 'staff'].includes(restaurantRole);
const isKitchen = restaurantRole === 'kitchen';
```

## Key Files to Reference

- `backend/src/app.ts` - Route registration and middleware setup
- `backend/src/db/schema/` - Database schema definitions
- `frontend/lib/api-client.ts` - All API communication patterns
- `frontend/lib/session-context.tsx` - Session management
- `frontend/components/Navbar.tsx` - Complex component with auth/session logic
- `.github/instructions/must_follow_this_rule.instructions.md` - Design system and UI guidelines

## Testing & Debugging

- **API Testing**: Check browser Network tab and console for detailed request logging
- **Auth Issues**: Verify Better Auth session tokens in cookies
- **Database**: Use Drizzle Studio or direct SQL queries for data inspection
- **Session Debug**: Check localStorage for `activeSession` and browser console for session logs

## Deployment Notes

- **Backend**: Requires build step, environment variables for production DB
- **Frontend**: Next.js build outputs static files, requires backend URL configuration
- **Database**: PostgreSQL with migrations via Drizzle

## Additional Development Rules

### API Usage
- Always refer to the existing routes and APIs documented in [API.md](API.md).
- Use the existing APIs for all operations.
- If an API is missing, create a new one following the established patterns.

### User Roles
- **High-level roles**: customer, admin, restaurant
- **Restaurant sub-roles**: owner, manager, staff, kitchen
- Ensure role-based access control is implemented correctly in both frontend and backend.

### UI/UX Guidelines
- Always ensure UI/UX is proper, handling all edge cases.
- Design must be mobile-first and responsive according to screen size.
- UI/UX must be modern, minimal, and enhanced.

## MVP Feature List (v1.0)

### Customer/User Side
- Scan unique table QR to open the restaurant's digital menu.
- View categorized menu (Breakfast / Lunch / Dinner / Drinks / Desserts).
- Add items to cart and place orders directly from the web app.
- Choose payment method — UPI (PhonePe / GPay / Paytm, etc.) or Cash.
- Automatically receive a digital e-bill (PDF) after payment.
- Table reservation system — select date, time, and number of guests to book a table.
- View and track reservation status (Pending / Confirmed / Rejected).
- Apply available offers and discounts (e.g. Valentine's Day, Student Discount, Birthday offer).
- View past orders and bills in order history.
- See restaurant status (Open / Temporarily Closed).

### Restaurant / Manager Side
- Dashboard Overview — quick stats for today's orders, revenue, and table status.
- Live order management — accept, complete, or cancel customer orders in real-time.
- Menu management — add, edit, delete items with price, category, and availability toggles.
- Table availability tracking — mark tables as "Available," "Occupied," or "Reserved."
- Reservation dashboard — view and manage customer booking requests.
- e-Bill customization — apply discounts (e.g. student, birthday, custom %) before bill generation.
- Offer management — restaurants can freely create, edit, schedule, and publish offers or discounts (no admin approval required).
- Financial reporting system — auto-generated daily, weekly, and monthly income summaries.
- Downloadable reports — export income and order data as PDF/Excel.
- Business control toggle — turn restaurant visibility ON/OFF (shows "Currently Closed" to customers).
- Manual order creation — restaurant can place orders on behalf of customers who don't want to scan the QR.
- Apply discounts on request — managers can add custom discounts for specific situations (student, birthday, loyal customer, or any on‑request discount) before finalizing the bill.
- Order insights — view aggregate order patterns such as peak ordering hours, items most frequently ordered, and majorly used payment methods.

### Admin / MyQuro Panel
- Restaurant onboarding & approval — verify and activate new restaurant partners.
- QR code generator — create unique QR codes for each restaurant table.
- Central monitoring dashboard — oversee all orders, reservations, and payments across the network.
- Analytics & reporting — view aggregated financial and performance data for all restaurants.
- Restaurant controls — force-disable or suspend inactive/non-compliant restaurants.

### Core System Capabilities
- UPI payment integration with automatic bill verification.
- Automatic report generation from order data.
- Dynamic table & restaurant availability management.
- Offer scheduling & expiration logic.
- Secure user authentication for customers, managers, and admin.
- Cloud-hosted e-bills and receipts (downloadable anytime).
- Real-time order and reservation updates.
- Aggregate analytics engine — auto-calculates payment method distribution, order volume trends, and customer ordering behavior.</content>
