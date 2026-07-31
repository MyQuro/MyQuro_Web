"use client";

import dynamic from 'next/dynamic';
import { SessionProvider } from '@/lib/session-context';
import { WebSocketProvider } from '@/lib/websocket-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LayoutContent from './LayoutContent';

// Dynamically import AuthProvider to avoid SSR issues
const AuthProvider = dynamic(() => import('@/lib/auth-context').then(mod => ({ default: mod.AuthProvider })), {
  ssr: false,
  loading: () => null
});

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SessionProvider>
          <WebSocketProvider>
            <LayoutContent>{children}</LayoutContent>
          </WebSocketProvider>
        </SessionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}