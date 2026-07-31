"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRScanner from '../../components/QRScanner';
import { Keyboard, ArrowRight } from 'lucide-react';

export default function QRScanPage() {
  const router = useRouter();
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const processToken = (result: string) => {
    let token = result;

    // Logic to clean up URL
    if (result.includes('/qr/')) {
      const parts = result.split('/qr/');
      token = parts[parts.length - 1].split('?')[0];
    } else if (result.startsWith('qr/')) {
      token = result.substring(3).split('?')[0];
    }

    // Clean slashes if any
    if (token.includes('/')) {
      const urlParts = token.split('/');
      for (let i = urlParts.length - 1; i >= 0; i--) {
        const part = urlParts[i];
        if (part && part.match(/^[A-Za-z0-9_-]+$/)) {
          token = part;
          break;
        }
      }
    }

    console.log("Navigating to:", token);
    router.push(`/qr/${token}`);
  };

  return (
    <div className="fixed inset-0 pt-20 bg-black flex flex-col">
      
      {/* 1. Full Screen Scanner */}
      <div className="flex-1 relative">
        <QRScanner 
            onScan={processToken} 
            onClose={() => router.back()} 
            className="h-full"
        />
      </div>

      {/* 2. Bottom Action Bar (Floating) */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center z-30">
         <button 
            onClick={() => setShowManualInput(true)}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-white/20 transition-all shadow-lg"
         >
            <Keyboard size={18} />
            Enter Code Manually
         </button>
      </div>

      {/* 3. Manual Input Modal (Bottom Sheet style) */}
      {showManualInput && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setShowManualInput(false)} />
            
            <div className="bg-white w-full max-w-md rounded-t-3xl p-6 relative animate-in slide-in-from-bottom duration-300">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                
                <h3 className="text-lg font-bold text-gray-900 mb-2">Enter QR Code</h3>
                <p className="text-gray-500 text-sm mb-6">Type the code found below the QR image.</p>
                
                <div className="flex gap-3">
                    <input 
                        type="text" 
                        placeholder="e.g. TBL-123"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all uppercase"
                        autoFocus
                    />
                    <button 
                        disabled={!manualCode}
                        onClick={() => processToken(manualCode)}
                        className="bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 text-white w-14 rounded-xl flex items-center justify-center transition-all hover:bg-blue-700 active:scale-95"
                    >
                        <ArrowRight size={24} />
                    </button>
                </div>
                
                <button 
                    onClick={() => setShowManualInput(false)}
                    className="w-full mt-4 py-3 text-gray-500 font-medium text-sm hover:text-gray-800"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}
    </div>
  );
}