"use client";

import { useState, useCallback } from 'react';

export interface UseQRScannerOptions {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

export function useQRScanner({ onScan, onError }: UseQRScannerOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openScanner = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const closeScanner = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleScan = useCallback((result: string) => {
    setLastScanResult(result);
    setError(null);
    setIsOpen(false);
    onScan(result);
  }, [onScan]);

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    if (onError) onError(errorMsg);
  }, [onError]);

  return {
    isOpen,
    openScanner,
    closeScanner,
    handleScan,
    handleError,
    lastScanResult,
    error,
  };
}
