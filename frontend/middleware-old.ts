import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl;
  const timestamp = new Date().toISOString();
  const env = process.env.NODE_ENV;

  // Handle www to non-www redirect FIRST
  const host = request.headers.get('host');
  if (host && host.startsWith('www.')) {
    const newUrl = new URL(request.url);
    newUrl.host = host.replace('www.', '');
    console.log('🌐 [MIDDLEWARE] Redirecting www to non-www:', {
      from: request.url,
      to: newUrl.toString()
    });
    return NextResponse.redirect(newUrl, 301);
  }

  console.log('🛡️ [MIDDLEWARE] Request:', {
    pathname,
    timestamp,
    env,
    origin: request.nextUrl.origin,
    hasSessionCookie: request.cookies.has('better-auth.session_token')
  });

  // Public routes that NEVER require authentication
  const publicRoutes = [
    '/',                           // Root (redirects to /home)
    '/home',                       // Home page
    '/about',                      // About page
    '/contact',                    // Contact page
    '/privacy',                    // Privacy policy
    '/terms',                      // Terms of service
    '/explore',                    // Restaurant exploration
    '/signin',                     // Sign in page
    '/signup',                     // Sign up page
    '/auth/callback',              // OAuth callback
    '/api/auth/check',             // Auth check endpoint
  ];

  // Check if route is public first
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  console.log('🛡️ [MIDDLEWARE] Route check:', {
    isPublic: isPublicRoute,
    pathname,
    matchedRoute: publicRoutes.find(route => pathname === route || pathname.startsWith(`${route}/`)) || 'none'
  });

  if (isPublicRoute) {
    console.log('✅ [MIDDLEWARE] Public route - allowing access without auth');
    return NextResponse.next(); // Allow access without auth
  }

  // ALL other routes require authentication (including QR pages)
  console.log('� [MIDDLEWARE] Protected route - checking authentication');

  // Check for Better Auth session cookie
  const sessionCookie = request.cookies.get('better-auth.session_token');
  console.log('🔑 [MIDDLEWARE] Session check:', {
    hasCookie: !!sessionCookie,
    cookieLength: sessionCookie?.value?.length || 0,
    cookieName: 'better-auth.session_token'
  });

  if (!sessionCookie) {
    console.error('❌ [MIDDLEWARE] No session - requires authentication', {
      pathname,
      willRedirect: pathname !== '/signin'
    });
    
    // Prevent redirect loops - don't redirect if already going to signin
    if (pathname === '/signin' || pathname.startsWith('/signin')) {
      console.log('⚠️ [MIDDLEWARE] Already on signin page - preventing redirect loop');
      return NextResponse.next();
    }
    
    // Redirect to signin with redirect parameter
    const signinUrl = new URL('/signin', request.nextUrl.origin);
    signinUrl.searchParams.set('redirect', pathname);
    console.log('➡️ [MIDDLEWARE] Redirecting to signin:', {
      from: pathname,
      to: signinUrl.toString()
    });
    return NextResponse.redirect(signinUrl);
  }

  console.log('✅ [MIDDLEWARE] Authenticated - allowing access to protected route');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - .well-known (for SSL verification, etc.)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|public/|.well-known).*)',
  ],
};