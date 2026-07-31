"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './api-client';

interface SessionData {
  sessionId: string;
  restaurantId: string;
  tableId: string | null;
  tableNumber: string | null;
  qrToken?: string;
  timestamp: string;
}

interface SessionContextType {
  session: SessionData | null;
  setSession: (session: SessionData | null) => void;
  clearSession: () => void;
  refreshSession: () => Promise<void>;
  isLoading: boolean;
  isBannerDismissed: boolean;
  setBannerDismissed: (value: boolean) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSessionState] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    // Only load session if we have a valid auth session
    // This prevents API calls when user is not authenticated
    const hasAuthCookie = document.cookie.includes('better-auth.session_token');
    if (hasAuthCookie) {
      loadSession();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh session from DB every 30 seconds
  useEffect(() => {
    if (!session?.sessionId) return;

    const interval = setInterval(() => {
      refreshSessionFromDB();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session?.sessionId]);

  const loadSession = async () => {
    try {
      // Try to get active session from API
      const response = await apiClient.getUserActiveSession();

      if (response.success && response.hasActiveSession && response.session) {
        const apiSession = response.session;

        // Convert API session format to our local format
        const sessionData: SessionData = {
          sessionId: apiSession.sessionId,
          restaurantId: apiSession.restaurantId,
          tableId: apiSession.tableId,
          tableNumber: apiSession.tableNumber,
          qrToken: apiSession.qrToken || undefined,
          timestamp: apiSession.startedAt,
        };

        setSessionState(sessionData);
      }
    } catch (error) {
      // Don't log API errors as they might be expected (user not logged in)
      // Just silently fail and continue without session
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('Session loading failed (non-blocking):', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const setSession = (newSession: SessionData | null) => {
    setSessionState(newSession);
    // No longer storing in localStorage - sessions are fetched live from API
  };

  const clearSession = () => {
    setSessionState(null);
    // Redirect to orders page after session closure
    router.push('/my-orders');
  };

  const refreshSessionFromDB = async () => {
    if (!session?.sessionId) return;

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      const response = await fetch(`${BACKEND_URL}/api/sessions/${session.sessionId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        // Session not found or error, clear it
        clearSession();
        return;
      }

      const data = await response.json();
      if (data.success && data.data.session) {
        const dbSession = data.data.session;

        // If session is closed or payment is completed, clear local session
        if (dbSession.status === 'closed' || dbSession.paymentStatus === 'paid') {
          clearSession();
          return;
        }

        // If session is still active, keep it (don't update to avoid re-renders)
        // The timestamp update is not needed as components fetch fresh data directly
      } else {
        // Session doesn't exist anymore
        clearSession();
      }
    } catch (error) {
      console.error('Error refreshing session from DB:', error);
    }
  };

  const refreshSession = async () => {
    // Public API for manual refresh
    await refreshSessionFromDB();
  };

  return (
    <SessionContext.Provider value={{
      session, setSession, clearSession, refreshSession, isLoading,
      isBannerDismissed, setBannerDismissed
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
