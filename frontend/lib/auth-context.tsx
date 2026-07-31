"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from './auth-client';

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  redirectAfterAuth: (redirectUrl?: string) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth pages that should redirect authenticated users (excluding callback)
const AUTH_PAGES = ['/signin', '/signup', '/login', '/register'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Using refetch to manually trigger session updates
  const { data: session, isPending, refetch } = authClient.useSession();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage to avoid flash of logged-out state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('user_auth');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
          setIsLoading(false); // Optimistically set loading to false
        } catch (e) {
          console.error("Failed to parse cached auth", e);
        }
      }
    }
  }, []);

  console.log('🔐 [AUTH] AuthProvider initialized:', {
    pathname,
    hasSession: !!session,
    isPending,
    user: user,
    userId: user?.id,
    userRole: user?.role,
    isLoading
  });

  // Convert Better Auth session to our User type
  useEffect(() => {
    if (session?.user) {
      const userData = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || undefined,
        image: session.user.image || undefined,
        role: (session.user as any).role || 'customer',
      };

      // Update state and cache
      setUser(userData);
      localStorage.setItem('user_auth', JSON.stringify(userData));

      setIsLoading(false);
    } else if (!isPending) {
      // Only clear user if we are sure there is no session (isPending is false)
      // This prevents clearing the optimistic user while fetching

      // Check if we previously had a user (optimistic) but now session is null
      // This means the session is invalid/expired
      if (session === null) {
        setUser(null);
        localStorage.removeItem('user_auth');
      }
      setIsLoading(false);
    }
    // If isPending is true, we simply wait. We don't set isLoading(true) here 
    // because we might already have the optimistic user.
  }, [session, isPending]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('🔐 [AUTH PROVIDER] Starting login process for:', email);

    try {
      setIsLoading(true);
      console.log('🔐 [AUTH PROVIDER] Calling authClient.signIn.email...');

      const response = await authClient.signIn.email({
        email,
        password,
      });

      const { error, data } = response || {};

      if (error) {
        console.error('🔐 [AUTH PROVIDER] Login failed:', error);
        return { success: false, error: error.message || 'Login failed' };
      }

      console.log('🔐 [AUTH PROVIDER] Login successful - data:', data);

      // If we have user data immediately, update state
      if (data?.user) {
        console.log('🔐 [AUTH PROVIDER] Setting user state from login response');
        const userData = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name || undefined,
          image: data.user.image || undefined,
          role: (data.user as any).role || 'customer',
        };
        setUser(userData);
        localStorage.setItem('user_auth', JSON.stringify(userData));
        setIsLoading(false);
      } else {
        console.log('🔐 [AUTH PROVIDER] No user data in response, fetching session...');
        // Force a session refresh to update UI immediately if data wasn't returned
        await refreshSession();
      }

      return { success: true };
    } catch (err) {
      console.error('🔐 [AUTH PROVIDER] Login exception:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Login failed'
      };
    } finally {
      // If we didn't set user state above (e.g. error or waiting for refresh), ensure loading is off
      // But if we successfully set user, isLoading is already false.
      // We should check if we are still loading to avoid overwriting successful state? 
      // Actually safe to set false here as long as we don't unset user.
      if (!user) { // Only force false if we haven't set a user yet? 
        // simplistic approach: just set false. 
        setIsLoading(false);
      }
      console.log('🔐 [AUTH PROVIDER] Login process completed');
    }
  };

  const loginWithGoogle = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Store current redirect URL for after OAuth completion
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect') || '/home';
      sessionStorage.setItem('auth_redirect', redirectUrl);

      await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectUrl)}`,
      });
    } catch (error) {
      console.error('Google login error:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Signup failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      console.log('🔐 [LOGOUT] Starting logout process...');

      // Clear all client-side storage first
      localStorage.removeItem('user_auth');
      localStorage.removeItem('welcomeShown');
      sessionStorage.clear();

      // Aggressively clear all cookies
      const clearAllCookies = () => {
        const cookies = document.cookie.split(";");
        const paths = ["/", "/dashboard", "/api", "/auth", "/order", "/restro", "/session", "/admin"];
        const domains = ["", window.location.hostname, `.${window.location.hostname}`];

        // Clear existing cookies
        cookies.forEach(cookie => {
          const cookieName = cookie.split("=")[0].trim();
          paths.forEach(path => {
            domains.forEach(domain => {
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain};`;
              document.cookie = `${cookieName}=; max-age=0; path=${path}; domain=${domain};`;
            });
          });
        });

        // Clear common auth-related cookies
        const authCookies = [
          "better-auth.session_token", "better-auth.callback-url",
          "__Secure-better-auth.session_token", "__Host-better-auth.callback-url",
          "session-token", "auth-token", "activeSession"
        ];

        authCookies.forEach(cookieName => {
          paths.forEach(path => {
            domains.forEach(domain => {
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain};`;
              document.cookie = `${cookieName}=; max-age=0; path=${path}; domain=${domain};`;
            });
          });
        });
      };

      clearAllCookies();

      // Sign out from Better Auth (clears server-side session)
      await authClient.signOut();

      // Clear local state
      setUser(null);

      console.log('🔐 [LOGOUT] Logout completed, redirecting to home...');

      // Force a hard redirect to clear any cached state
      window.location.href = '/home';
    } catch (error) {
      console.error('🔐 [LOGOUT] Logout error:', error);
      // Even if signOut fails, clear storage and redirect
      localStorage.removeItem('user_auth');
      localStorage.removeItem('welcomeShown');
      sessionStorage.clear();
      setUser(null);
      window.location.href = '/home';
    }
  };

  const redirectAfterAuth = (redirectUrl?: string): void => {
    // Get redirect URL from multiple sources
    const storedRedirect = sessionStorage.getItem('auth_redirect');
    const urlParams = new URLSearchParams(window.location.search);
    const urlRedirect = urlParams.get('redirect');

    const finalRedirect = redirectUrl || storedRedirect || urlRedirect || '/home';

    // Clean up stored redirect
    sessionStorage.removeItem('auth_redirect');

    router.replace(finalRedirect);
  };

  const refreshSession = async (): Promise<void> => {
    try {
      console.log('🔄 [AUTH PROVIDER] Manually refreshing session...');
      if (refetch) {
        const result = await refetch() as any;
        console.log('✅ [AUTH PROVIDER] Session refresh result:', {
          hasData: !!result?.data,
          user: result?.data?.user,
          session: result?.data?.session
        });

        if (result?.data?.user) {
          // START: Manually update local state if refetch doesn't trigger useEffect automatically
          const userData = {
            id: result.data.user.id,
            email: result.data.user.email,
            name: result.data.user.name || undefined,
            image: result.data.user.image || undefined,
            role: (result.data.user as any).role || 'customer',
          };
          setUser(userData);
          localStorage.setItem('user_auth', JSON.stringify(userData));
          setIsLoading(false);
          // END
        }
      } else {
        // Fallback if refetch is not available (though it should be with better-auth/react)
        // This might happen if the client is not fully initialized
        console.warn('⚠️ [AUTH PROVIDER] refetch function not available');
      }
    } catch (error) {
      console.error('❌ [AUTH PROVIDER] Failed to refresh session:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    signup,
    logout,
    redirectAfterAuth,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  console.log('🔐 [USE AUTH] Hook called:', {
    hasUser: !!context.user,
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'server-side'
  });
  return context;
}