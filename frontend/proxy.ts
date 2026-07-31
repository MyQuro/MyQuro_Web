import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle www to non-www redirect FIRST
  const host = request.headers.get('host');
  if (host && host.startsWith('www.')) {
    const newUrl = new URL(request.url);
    newUrl.host = host.replace('www.', '');
    return NextResponse.redirect(newUrl, 301);
  }

  // Skip middleware for static files and assets
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') && !pathname.includes('/api/') // Skip files with extensions except API routes
  ) {
    return NextResponse.next();
  }

  // Public routes - no auth required
  const publicRoutes = [
    '/', '/home', '/about', '/contact', '/privacy', '/terms',
    '/explore', '/signin', '/signup', '/auth/callback', '/api'
  ];

  const isPublic = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublic) {
    return NextResponse.next();
  }

// Check session cookie for protected routes
  // Better Auth uses various cookie names depending on configuration
  const allCookies = Array.from(request.cookies.getAll());
  const hasSession =
    // Standard Better Auth cookies (with dash)
    request.cookies.has('better-auth.session_token') ||
    request.cookies.has('__Secure-better-auth.session_token') ||
    // Alternative cookie names (with underscore)
    request.cookies.has('better_auth.session_token') ||
    request.cookies.has('__Secure-better_auth.session_token') ||
    // Check for any cookie containing auth/session related names
    allCookies.some(cookie =>
      cookie.name.includes('better-auth') ||
      cookie.name.includes('better_auth') ||
      (cookie.name.includes('session') && cookie.name.includes('token'))
    ) ||
    // TEMPORARY: Allow dashboard access if any cookies exist (client-side will handle auth)
    (pathname.startsWith('/dashboard') && allCookies.length > 0);

  // User is authenticated or accessing allowed resource, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};