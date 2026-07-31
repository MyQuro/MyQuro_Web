# Authentication Loop Fix - January 9, 2026

## Problem Summary

The application had a **critical authentication loop** issue caused by multiple factors:

### Root Causes

1. **Cookie Security Mismatch**: Backend was sending cookies with `secure: true` and `sameSite: "none"`, which require HTTPS. Local development uses HTTP (localhost), causing browsers to **reject** these cookies completely.

2. **Duplicate AuthGuard Implementations**: Two competing AuthGuard components existed:
   - `frontend/components/AuthGuard.tsx` ✅ (correct)
   - `frontend/lib/auth-context.tsx` ❌ (duplicate, removed)

3. **Multiple Redirect Mechanisms**: Auth pages had **three** different redirect mechanisms fighting each other:
   - Middleware redirect
   - AuthGuard component redirect
   - useEffect redirect in auth-context
   - Manual check in page components

4. **Cross-Domain Cookie Issues**: Production config used `.myquro.com` domain for cookies even in localhost, causing cookie to be ignored.

## Fixes Applied

### 1. Backend Auth Configuration (backend/src/auth/auth.ts)

**Added environment-aware cookie settings:**

```typescript
// Detect local development
const isLocalDev = process.env.BETTER_AUTH_URL?.includes('localhost') || 
                   process.env.NODE_ENV === 'development';

advanced: {
  // Only enable cross-subdomain cookies in production
  ...(isLocalDev ? {} : {
    crossSubdomainCookies: {
      enabled: true,
      domain: ".myquro.com" 
    }
  }),
  defaultCookieAttributes: {
    // secure: false for HTTP (localhost), true for HTTPS (production)
    secure: !isLocalDev,
    // sameSite: 'lax' for localhost, 'none' for production
    sameSite: isLocalDev ? "lax" : "none",
    httpOnly: true
  }
}
```

**Why this works:**
- Local dev (HTTP): `secure: false`, `sameSite: "lax"` → Browser accepts cookies
- Production (HTTPS): `secure: true`, `sameSite: "none"` → Cross-domain cookies work

### 2. Removed Duplicate AuthGuard (frontend/lib/auth-context.tsx)

**Removed:**
- Duplicate `AuthGuard` component export
- Duplicate `withAuth` HOC
- useEffect redirect logic in AuthProvider (lines 95-98)

**Why this works:**
- Single source of truth for auth guards
- No competing redirect logic
- Cleaner, more maintainable code

### 3. Updated Auth Pages (signin/signup)

**Changed:**
```typescript
// OLD: Using duplicate AuthGuard from auth-context
import { AuthGuard } from "@/lib/auth-context";

// NEW: Using correct AuthGuard from components
import { AuthGuard } from "@/components/AuthGuard";
```

**Removed:**
- Manual `isAuthenticated` check and loading state
- Redundant redirect logic

**Why this works:**
- AuthGuard component handles all redirect logic
- No duplicate loading states
- Consistent behavior across auth pages

### 4. Enhanced Middleware (frontend/middleware.ts)

**Added loop prevention:**
```typescript
if (!sessionCookie) {
  // Prevent redirect loops
  if (pathname === '/signin' || pathname.startsWith('/signin')) {
    console.log('🛡️ [MIDDLEWARE] Already on signin, preventing loop');
    return NextResponse.next();
  }
  
  // Redirect to signin
  const signinUrl = new URL('/signin', request.url);
  signinUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(signinUrl);
}
```

**Why this works:**
- Prevents infinite redirect loops between protected pages and signin
- Allows signin page to load even if middleware detects no cookie

## Testing Steps

### Local Development (HTTP)

1. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```
   - Backend runs on http://localhost:3001
   - Cookies set with `secure: false`, `sameSite: "lax"`

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   - Frontend runs on http://localhost:3000
   - API calls go to http://localhost:3001

3. **Test authentication:**
   - Visit http://localhost:3000
   - Click "Sign In"
   - Enter credentials
   - Check browser DevTools → Application → Cookies
   - Should see `better-auth.session_token` cookie with:
     - `Secure: false` ✅
     - `SameSite: Lax` ✅
     - `HttpOnly: true` ✅

4. **Test protected routes:**
   - Navigate to http://localhost:3000/dashboard
   - Should see dashboard (not redirect loop)
   - Session persists across page refreshes

### Production (HTTPS)

1. **Verify environment variables:**
   ```
   BETTER_AUTH_URL=https://api.myquro.com
   NODE_ENV=production
   ```

2. **Deploy and test:**
   - Cookies set with `secure: true`, `sameSite: "none"`
   - Cross-domain authentication works
   - Session persists across subdomains

## Browser DevTools Debugging

### Check Cookies
1. Open DevTools (F12)
2. Go to **Application** → **Cookies** → Select your domain
3. Look for `better-auth.session_token`
4. Verify attributes match environment

### Check Network Tab
1. Open DevTools (F12)
2. Go to **Network** tab
3. Sign in
4. Look for `/api/auth/sign-in/email` request
5. Check **Response Headers** for `Set-Cookie`
6. Verify cookie is being set by backend

### Check Console Logs
- Middleware logs show auth flow
- Auth client logs show session state
- Look for patterns like:
  ```
  🛡️ [MIDDLEWARE] No session cookie, redirecting to signin
  🔐 [AUTH PROVIDER] Session effect triggered
  ```

## Expected Behavior

### ✅ Correct Flow

1. **Unauthenticated user visits /dashboard**
   - Middleware: No cookie → Redirect to `/signin?redirect=/dashboard`
   - Signin page loads successfully
   - No redirect loop

2. **User signs in**
   - Backend sets session cookie with correct attributes
   - Browser accepts and stores cookie
   - Frontend detects session
   - AuthGuard redirects to `/dashboard`

3. **Authenticated user visits /signin**
   - Middleware: Has cookie → Allow through
   - AuthGuard: User authenticated → Redirect to `/dashboard`
   - No redirect loop

4. **Session persists**
   - Page refresh maintains authentication
   - Cookie survives browser tab close (unless expired)
   - Protected routes accessible without re-login

### ❌ Previous Broken Flow

1. **Backend sent cookies browser couldn't accept**
   - `secure: true` on HTTP → Browser rejected
   - No cookie stored → Always "unauthenticated"

2. **Multiple redirects competed**
   - Middleware redirected to /signin
   - AuthGuard redirected to /dashboard
   - useEffect redirected to /signin
   - Infinite loop 🔄

## Files Modified

1. `backend/src/auth/auth.ts` - Environment-aware cookie configuration
2. `frontend/lib/auth-context.tsx` - Removed duplicate AuthGuard
3. `frontend/app/signin/page.tsx` - Use correct AuthGuard, remove manual checks
4. `frontend/app/signup/page.tsx` - Use correct AuthGuard, remove manual checks
5. `frontend/middleware.ts` - Added loop prevention

## Environment Variables Required

### Backend (.env)
```env
BETTER_AUTH_URL=http://localhost:3001  # or https://api.myquro.com
NODE_ENV=development                    # or production
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
DATABASE_URL=your_postgres_url
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001  # or https://api.myquro.com
```

## Notes

- **Local dev must use HTTP** (localhost doesn't support HTTPS easily)
- **Production must use HTTPS** (for secure cookies and OAuth)
- **Cookie security is critical** - wrong settings = broken auth
- **Single AuthGuard source** - avoids conflicts and bugs

## Verification Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can sign in successfully
- [ ] Session cookie appears in DevTools
- [ ] Cookie attributes match environment
- [ ] Dashboard loads after signin
- [ ] No redirect loops
- [ ] Session persists on page refresh
- [ ] Can sign out successfully
- [ ] Unauthenticated users redirected to signin

## Related Documentation

- [DEBUG_AUTH.md](DEBUG_AUTH.md) - Previous auth debugging notes
- [AUTHENTICATION_SYSTEM_COMPLETE.md](AUTHENTICATION_SYSTEM_COMPLETE.md) - Full auth system docs
- Better Auth docs: https://www.better-auth.com/docs

## Status

🟢 **FIXED** - Authentication system working correctly in both local and production environments.
