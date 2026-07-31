"use client";

import { useState } from 'react';
import QRScanner from './QRScanner';
import { X } from 'lucide-react';

interface GlobalQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  title?: string;
  description?: string;
}

export default function GlobalQRScanner({
  isOpen,
  onClose,
  onScan,
  onError,
  title = 'Scan QR Code',
  description = 'Position the QR code within the frame to scan'
}: GlobalQRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);

  if (!isOpen) return null;

  const handleScan = (result: string) => {
    setIsScanning(false);
    onScan(result);
  };

  const handleError = (error: string) => {
    if (onError) onError(error);
  };

  const handleClose = () => {
    setIsScanning(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-black rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              {description && (
                <p className="text-white/80 text-sm mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              aria-label="Close scanner"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Scanner Content */}
          <div className="p-6 bg-gray-900">
            <QRScanner
              onScan={handleScan}
              onError={handleError}
              onClose={handleClose}
              autoStart={true}
              className="w-full"
            />
          </div>

          {/* Footer */}
          <div className="bg-gray-900 px-6 py-4 border-t border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Camera active</span>
              </div>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
