"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import GlobalQRScanner from '@/components/GlobalQRScanner';
import { useQRScanner } from '@/hooks/useQRScanner';
import { QrCode, CheckCircle, XCircle } from 'lucide-react';

export default function QRScannerDemo() {
  const [result, setResult] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const {
    isOpen,
    openScanner,
    closeScanner,
    handleScan,
    handleError,
    lastScanResult,
    error,
  } = useQRScanner({
    onScan: (result) => {
      console.log('✅ QR Code Scanned:', result);
      setResult(result);
      setStatus('success');
      
      // Process the QR code here
      // Example: redirect, fetch data, etc.
    },
    onError: (error) => {
      console.error('❌ QR Scan Error:', error);
      setStatus('error');
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <QrCode className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Global QR Scanner
          </h1>
          <p className="text-gray-600 text-lg">
            Click the button below to open the QR scanner modal
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Scan Button */}
          <Button
            onClick={openScanner}
            className="w-full py-6 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105"
          >
            <QrCode className="w-6 h-6 mr-3" />
            Open QR Scanner
          </Button>

          {/* Status Display */}
          {status !== 'idle' && (
            <div className={`p-6 rounded-xl border-2 ${
              status === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-4">
                {status === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${
                    status === 'success' ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {status === 'success' ? 'Scan Successful!' : 'Scan Error'}
                  </h3>
                  {status === 'success' && result && (
                    <div className="space-y-2">
                      <p className="text-sm text-green-800">
                        QR Code Content:
                      </p>
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <code className="text-sm text-gray-800 break-all">
                          {result}
                        </code>
                      </div>
                    </div>
                  )}
                  {status === 'error' && error && (
                    <p className="text-sm text-red-800">{error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Features List */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Features:</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Always uses back camera (environment facing)</span>
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Auto-start scanning when opened</span>
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Flashlight support for low-light conditions</span>
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Multiple camera switching support</span>
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Responsive and mobile-optimized</span>
              </li>
            </ul>
          </div>

          {/* Usage Example */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Usage Example:</h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-green-400">
{`import GlobalQRScanner from '@/components/GlobalQRScanner';
import { useQRScanner } from '@/hooks/useQRScanner';

function MyComponent() {
  const {
    isOpen,
    openScanner,
    closeScanner,
    handleScan,
    handleError
  } = useQRScanner({
    onScan: (result) => {
      console.log('Scanned:', result);
      // Handle the QR code result
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  return (
    <>
      <button onClick={openScanner}>
        Scan QR Code
      </button>

      <GlobalQRScanner
        isOpen={isOpen}
        onClose={closeScanner}
        onScan={handleScan}
        onError={handleError}
      />
    </>
  );
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Global QR Scanner Modal */}
      <GlobalQRScanner
        isOpen={isOpen}
        onClose={closeScanner}
        onScan={handleScan}
        onError={handleError}
        title="Scan QR Code"
        description="Position the QR code within the frame to scan"
      />
    </div>
  );
}
