"use client";

import { useState, useEffect } from 'react';
import { SplashScreen } from '../components/SplashScreen';

interface SplashScreenWrapperProps {
  children: React.ReactNode;
}

export default function SplashScreenWrapper({ children }: SplashScreenWrapperProps) {
  const [showSplash, setShowSplash] = useState(() => {
    // Check if user has seen splash before on initial render
    if (typeof window !== 'undefined') {
      const hasSeenSplash = localStorage.getItem('myquro-splash-seen');
      return !hasSeenSplash;
    }
    return false;
  });

  useEffect(() => {
    // Mark as seen after showing splash
    if (showSplash && typeof window !== 'undefined') {
      localStorage.setItem('myquro-splash-seen', 'true');
    }
  }, [showSplash]);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {children}
    </>
  );
}