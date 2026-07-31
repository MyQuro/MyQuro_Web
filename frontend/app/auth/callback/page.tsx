"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { redirectAfterAuth } = useAuth();

  useEffect(() => {
    // Handle OAuth callback
    const handleCallback = async () => {
      console.log('🔐 [AUTH CALLBACK] Starting callback handling');
      console.log('🔐 [AUTH CALLBACK] Current URL:', window.location.href);
      console.log('🔐 [AUTH CALLBACK] Search params:', Object.fromEntries(searchParams.entries()));
      console.log('🔐 [AUTH CALLBACK] User agent:', navigator.userAgent);
      console.log('🔐 [AUTH CALLBACK] Is iOS:', /iPad|iPhone|iPod/.test(navigator.userAgent));
      console.log('🔐 [AUTH CALLBACK] Cookies:', document.cookie);

      try {
        // Wait for session to be established - longer wait for mobile devices
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const waitTime = isMobile ? 3000 : 2000;
        
        console.log(`🔐 [AUTH CALLBACK] Waiting ${waitTime}ms for session establishment (mobile: ${isMobile})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        console.log('🔐 [AUTH CALLBACK] Wait completed');

        // Get redirect URL from query params
        const redirectUrl = searchParams.get('redirect') || '/home';
        console.log('🔐 [AUTH CALLBACK] Redirect URL from params:', redirectUrl);

        // Check if we have any auth-related cookies (basic check)
        const hasAuthCookies = document.cookie.includes('better-auth') || document.cookie.includes('session');
        console.log('🔐 [AUTH CALLBACK] Has auth cookies:', hasAuthCookies);

        console.log('🔐 [AUTH CALLBACK] Redirecting to:', redirectUrl);

        // Use direct router navigation
        router.replace(redirectUrl);
        console.log('🔐 [AUTH CALLBACK] Router.replace called');
      } catch (error) {
        console.error('🔐 [AUTH CALLBACK] Auth callback error:', error);
        router.replace('/signin?error=auth_callback_failed');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}