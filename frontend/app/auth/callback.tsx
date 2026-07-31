"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Get the redirect URL that was stored before OAuth
    const redirectUrl = sessionStorage.getItem('auth_redirect') || '/home';
    
    // Clear the stored redirect
    sessionStorage.removeItem('auth_redirect');
    
    // Set auth flag (for legacy compatibility)
    localStorage.setItem('user_auth', 'true');
    
    // Redirect to the intended page
    router.push(redirectUrl);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Processing authentication...</p>
      </div>
    </div>
  );
}
