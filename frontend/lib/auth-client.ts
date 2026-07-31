"use client";

import { createAuthClient } from "better-auth/react";

// Smart backend URL detection
const getBackendUrl = () => {
  // 1. Priority: Localhost detection (to avoid cross-origin issues when configured with IP)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If localhost or 127.0.0.1, use backend on port 8000
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return `http://${hostname}:8000`;
    }
  }

  // 2. Configured URL (e.g. from .env.local)
  const configured = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (configured) {
    return configured;
  }

  // 3. Other local network detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Handle local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalIp =
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      (hostname.startsWith('172.') && parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31);

    if (isLocalIp) {
      return `http://${hostname}:8000`;
    }

    // If running on Render, use the backend service URL
    if (hostname.includes('onrender.com')) {
      return 'https://api.myquro.com';
    }
  }

  // Default fallback
  return 'https://api.myquro.com';
};

const BACKEND_URL = getBackendUrl();

// CRITICAL: baseURL should be the root URL where auth endpoints are mounted
export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  fetchOptions: {
    credentials: "include",
  }
});

// Debug logging for development
if (typeof window !== 'undefined') {
  console.log('🔧 [Auth Client] Configuration:', {
    hostname: window.location.hostname,
    backendUrl: BACKEND_URL,
    envUrl: process.env.NEXT_PUBLIC_BACKEND_URL || '(not set)',
  });
}
