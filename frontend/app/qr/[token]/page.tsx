"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function QRScanPage() {
  console.log('🔍 [QR PAGE] Component mounted');

  const params = useParams();
  const router = useRouter();
  const qrToken = params.token as string;
  const [status, setStatus] = useState<'loading' | 'auth_required' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Initializing QR scan...');
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  console.log('🔍 [QR PAGE] QR Token:', qrToken);
  console.log('🔍 [QR PAGE] Router:', router);

  // Use Better Auth session hook for proper authentication
  const { data: session, isPending: authPending, error: authError } = authClient.useSession();

  useEffect(() => {
    console.log('🔍 [QR PAGE] useEffect triggered, qrToken:', qrToken);

    const scanAndCreateSession = async () => {
      console.log('📱 [QR PAGE] Starting QR scan process...');

      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
        console.log('🌐 [QR PAGE] Backend URL:', BACKEND_URL);

        // Step 1: Validate QR token
        console.log('🔍 [QR PAGE] Validating QR token:', qrToken);
        const validateUrl = `${BACKEND_URL}/api/sessions/validate-qr/${qrToken}`;
        console.log('🌐 [QR PAGE] Validation URL:', validateUrl);

        const validateResponse = await fetch(validateUrl, {
          method: 'GET',
          credentials: 'include',
        });

        console.log('📡 [QR PAGE] Validation response status:', validateResponse.status);
        console.log('📡 [QR PAGE] Validation response headers:', Object.fromEntries(validateResponse.headers.entries()));

        if (!validateResponse.ok) {
          const errorData = await validateResponse.json();
          console.error('❌ [QR PAGE] Validation failed:', errorData);
          throw new Error(errorData.message || `HTTP ${validateResponse.status}: ${validateResponse.statusText}`);
        }

        const validateData = await validateResponse.json();
        console.log('✅ [QR PAGE] QR validation result:', validateData);

        if (!validateData.success) {
          console.error('❌ [QR PAGE] Validation unsuccessful:', validateData);
          throw new Error(validateData.message || 'Invalid QR code');
        }

        const { tableId, tableNumber, restaurantId, capacity } = validateData.data;
        console.log('📋 [QR PAGE] Table info:', { tableId, tableNumber, restaurantId, capacity });
        setTableInfo({ tableId, tableNumber, restaurantId, capacity });

        // Step 2: Create or join session
        setMessage(`Connecting to Table ${tableNumber}...`);
        console.log('🔗 [QR PAGE] Creating session for table:', tableId);

        // Get customer location for geofencing validation
        let latitude = null;
        let longitude = null;
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          console.log('📍 [QR PAGE] Customer coordinates obtained:', { latitude, longitude });
        } catch (locErr) {
          console.warn('📍 [QR PAGE] Could not obtain customer location:', locErr);
        }

        const sessionUrl = `${BACKEND_URL}/api/sessions/create-session`;
        console.log('🌐 [QR PAGE] Session creation URL:', sessionUrl);

        const sessionResponse = await fetch(sessionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            tableId,
            restaurantId,
            qrToken,
            latitude,
            longitude
          }),
        });

        console.log('📡 [QR PAGE] Session response status:', sessionResponse.status);

        const sessionData = await sessionResponse.json();
        console.log('📡 [QR PAGE] Session response:', sessionData);

        // Handle table occupied scenarios
        if (!sessionResponse.ok || !sessionData.success) {
          if (sessionData.code === 'TABLE_OCCUPIED' || sessionData.code === 'TABLE_OCCUPIED_AWAITING_PAYMENT') {
            console.log('🚫 [QR PAGE] Table occupied:', sessionData);
            setStatus('error');
            setMessage(sessionData.message || 'This table is currently occupied. Please ask staff to clear it for you.');
            return;
          }
          console.error('❌ [QR PAGE] Session creation failed:', sessionData);
          throw new Error(sessionData.message || 'Failed to create session');
        }

        const { sessionId } = sessionData;
        console.log('✅ [QR PAGE] Session created successfully:', sessionId);

        // Store session info in localStorage
        const sessionInfo = {
          sessionId,
          restaurantId,
          tableId,
          tableNumber,
          qrToken,
          timestamp: new Date().toISOString()
        };
        console.log('💾 [QR PAGE] Storing session info:', sessionInfo);
        localStorage.setItem('activeSession', JSON.stringify(sessionInfo));

        setStatus('success');
        setMessage(`Successfully connected to Table ${tableNumber}!`);

        // Redirect to restaurant menu after 1.5 seconds
        const redirectUrl = `/restro/${restaurantId}/menu?session=${sessionId}`;
        console.log('🔄 [QR PAGE] Redirecting to:', redirectUrl);
        setTimeout(() => {
          router.push(redirectUrl);
        }, 2500);

      } catch (error: any) {
        console.error('💥 [QR PAGE] QR scan error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to scan QR code');
      }
    };

    const checkAuthenticationAndScan = async () => {
      console.log('🔍 [QR PAGE] Starting authentication check...');

      // Wait for auth to complete
      if (authPending) {
        console.log('🔐 [QR PAGE] Auth still pending...');
        return;
      }

      // Check for auth errors
      if (authError) {
        console.error('🔐 [QR PAGE] Auth error:', authError);
        setStatus('auth_required');
        setMessage('Authentication error. Please sign in.');
        return;
      }

      // Check if user is authenticated
      if (!session?.user) {
        console.log('🔐 [QR PAGE] User not authenticated, showing auth prompt');
        setStatus('auth_required');
        setMessage('Please sign in to continue scanning QR codes');
        return;
      }

      console.log('🔐 [QR PAGE] User authenticated:', session.user.email);
      setIsAuthenticated(true);

      console.log('🔐 [QR PAGE] User authenticated, proceeding with QR scan');

      await scanAndCreateSession();
    };

    if (qrToken) {
      console.log('▶️ [QR PAGE] QR token present, starting process');
      checkAuthenticationAndScan();
    } else {
      console.log('⚠️ [QR PAGE] No QR token provided');
      setStatus('error');
      setMessage('No QR token provided');
    }
  }, [qrToken, session, authPending, authError, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050506] p-4 text-white relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d5b263]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-[#0c0c0e] rounded-3xl border border-zinc-800/80 shadow-2xl p-8 text-center relative z-10 backdrop-blur-xl">
        
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Loader2 className="w-16 h-16 text-[#d5b263] animate-spin" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Connecting...</h2>
            <p className="text-sm font-medium text-zinc-400">{message}</p>
          </>
        )}

        {status === 'auth_required' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-[#d5b263]" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Authentication Required</h2>
            <p className="text-sm font-medium text-zinc-400 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push(`/signin?redirect=${encodeURIComponent(window.location.pathname)}`)}
                className="w-full py-3.5 bg-[#d5b263] text-black font-black rounded-xl hover:bg-[#c4a152] transition-colors shadow-lg active:scale-95"
              >
                Sign In to Continue
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="w-full py-3.5 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors active:scale-95"
              >
                Create Account
              </button>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Connected!</h2>
            <p className="text-sm font-medium text-emerald-400/90 mb-4">{message}</p>
            {tableInfo && (
              <div className="mt-4 p-4 bg-[#050506] rounded-2xl border border-zinc-800/60">
                <p className="text-base font-black text-white">Table {tableInfo.tableNumber}</p>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">Capacity: {tableInfo.capacity} guests</p>
              </div>
            )}
            <p className="text-xs font-medium text-zinc-500 mt-5 animate-pulse">Redirecting to menu...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Unable to Connect</h2>
            <p className="text-sm font-medium text-zinc-400 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/explore')}
                className="w-full py-3.5 bg-[#d5b263] text-black font-black rounded-xl hover:bg-[#c4a152] transition-colors shadow-lg active:scale-95"
              >
                Browse Restaurants
              </button>
              <p className="text-xs font-medium text-zinc-500">
                Need help? Please speak with a staff member.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}