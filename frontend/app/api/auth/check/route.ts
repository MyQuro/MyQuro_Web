import { NextRequest, NextResponse } from 'next/server';
import { authClient } from '@/lib/auth-client';

export async function GET(request: NextRequest) {
  console.log('🔐 [AUTH CHECK API] Checking authentication status');

  try {
    // Check for session cookie
    const sessionCookie = request.cookies.get('better-auth.session_token');
    console.log('🔐 [AUTH CHECK API] Session cookie present:', !!sessionCookie);

    if (!sessionCookie) {
      console.log('🔐 [AUTH CHECK API] No session cookie found');
      return NextResponse.json({
        authenticated: false,
        message: 'No session found'
      });
    }

    // Try to get session from Better Auth
    const session = await authClient.getSession({
      fetchOptions: {
        headers: {
          cookie: `better-auth.session_token=${sessionCookie.value}`
        }
      }
    });

    console.log('🔐 [AUTH CHECK API] Session result:', {
      hasSession: !!session,
      sessionData: session,
      userId: (session as any)?.user?.id || (session as any)?.data?.user?.id,
      email: (session as any)?.user?.email || (session as any)?.data?.user?.email
    });

    // Check if session exists and has user data
    const sessionData = (session as any)?.data || session;
    const user = sessionData?.user;

    if (user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    } else {
      console.log('🔐 [AUTH CHECK API] Session validation failed - no user data');
      return NextResponse.json({
        authenticated: false,
        message: 'Invalid session'
      });
    }

  } catch (error: any) {
    console.error('🔐 [AUTH CHECK API] Error:', error);
    return NextResponse.json({
      authenticated: false,
      message: 'Authentication check failed',
      error: error.message
    }, { status: 500 });
  }
}