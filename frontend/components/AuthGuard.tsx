"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

/**
 * BULLETPROOF AUTH GUARD COMPONENT
 * 
 * Prevents any bypass attempts by:
 * 1. Checking session on mount
 * 2. Subscribing to session changes
 * 3. Instant redirect without flashing
 * 4. Proper loading states
 */

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;  // If true, requires authentication
  redirectTo?: string;     // Where to redirect if auth check fails
  allowedRoles?: string[]; // Optional: restrict by role
}

export function AuthGuard({ 
  children, 
  requireAuth = true,
  redirectTo = '/signin',
  allowedRoles = []
}: AuthGuardProps) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isPending) {
      return; // Wait for session check
    }

    const currentPath = window.location.pathname + window.location.search;

    // Check authentication requirement
    if (requireAuth && !session?.user) {
      // Not authenticated, redirect to signin with return URL
      const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(currentPath)}`;
      router.replace(redirectUrl);
      return;
    }

    // Check if authenticated user shouldn't be here (like auth pages)
    if (!requireAuth && session?.user) {
      // Authenticated user on auth page, redirect to dashboard
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      router.replace(redirect || '/home');
      return;
    }

    // Check role-based access
    if (requireAuth && session?.user && allowedRoles.length > 0) {
      const userRole = (session.user as any).role;
      if (!allowedRoles.includes(userRole)) {
        router.replace('/unauthorized');
        return;
      }
    }

    // All checks passed
    setIsAuthorized(true);
    setIsChecking(false);
  }, [session, isPending, requireAuth, redirectTo, allowedRoles, router]);

  // Show loading state while checking
  if (isPending || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Only render children if authorized
  if (!isAuthorized) {
    return null; // Redirect is happening
  }

  return <>{children}</>;
}

/**
 * HOC for page-level protection
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requireAuth?: boolean;
    redirectTo?: string;
    allowedRoles?: string[];
  }
) {
  return function ProtectedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

/**
 * Hook for manual auth checks
 */
export function useAuth() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const requireAuth = (redirectTo = '/signin') => {
    if (!isPending && !session?.user) {
      const currentPath = window.location.pathname + window.location.search;
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
      return false;
    }
    return true;
  };

  const logout = async () => {
    // Clear localStorage items
    localStorage.removeItem('user_auth');
    localStorage.removeItem('welcomeShown');
    await authClient.signOut();
    router.push('/home');
  };

  return {
    user: session?.user || null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    requireAuth,
    logout,
  };
}
