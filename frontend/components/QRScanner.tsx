"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Loader2, Flashlight, FlashlightOff, X, RotateCcw, CameraOff, Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  className?: string;
  autoStart?: boolean;
}

// Simple beep sound synthesizer (No external assets required)
const playScanSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export default function QRScanner({
  onScan,
  onError,
  onClose,
  className = '',
  autoStart = true,
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (codeReaderRef.current) {
        // Just stop decoding, don't kill the stream yet if we want to restart
        // But for this use case, we usually redirect immediately
        codeReaderRef.current = null;
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
  }, [stream]);

  const startDecoding = async (mediaStream: MediaStream) => {
    if (!videoRef.current) return;

    setIsScanning(true);
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    // Attach stream to video element manually for better control
    videoRef.current.srcObject = mediaStream;

    // Set video constraints for better scanning
    const videoTrack = mediaStream.getVideoTracks()[0];
    if (videoTrack) {
      await videoTrack.applyConstraints({
        advanced: [
          { focusMode: 'continuous' },
          { exposureMode: 'continuous' }
        ] as any
      });
    }

    try {
        await codeReader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (result, err) => {
                if (result) {
                    playScanSound(); // BEEP!
                    onScan(result.getText());
                    stopScanning();
                }
            }
        );
    } catch (error) {
        console.error(error);
    }
  };

  // Initialize
  useEffect(() => {
    const initCamera = async () => {
      try {
        // Try back camera first
        let constraints: MediaStreamConstraints = {
          video: { facingMode: 'environment' }
        };

        let mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        // Check if we got the back camera
        const videoTrack = mediaStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        if (settings.facingMode !== 'environment') {
          // If not back camera, stop and try again with any camera
          mediaStream.getTracks().forEach(track => track.stop());
          constraints = { video: true };
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        }

        setStream(mediaStream);
        setHasPermission(true);

        // Start scanning logic
        if (autoStart && videoRef.current) {
          startDecoding(mediaStream);
        }
      } catch (err) {
        console.error("Camera Error:", err);
        setHasPermission(false);
        if (onError) onError("Unable to access camera. Please check permissions and try again.");
      }
    };

    initCamera();

    return () => stopScanning();
  }, []);

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    
    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchEnabled }] as any
        });
        setTorchEnabled(!torchEnabled);
      } catch (e) {
        console.error("Torch error", e);
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const codeReader = new BrowserMultiFormatReader();
      const result = await codeReader.decodeFromImageUrl(URL.createObjectURL(file));
      if (result) {
        playScanSound();
        onScan(result.getText());
        setShowUpload(false);
      }
    } catch (error) {
      console.error("Image scan error:", error);
      if (onError) onError("No QR code found in image");
    }
  };

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-black text-white p-6 text-center">
        <CameraOff className="w-12 h-12 mb-4 text-gray-500" />
        <h3 className="text-lg font-bold mb-2">Camera Access Required</h3>
        <p className="text-gray-400 text-sm mb-6">Please enable camera permissions in your browser settings.</p>
        <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm">
            Refresh Page
        </button>
      </div>
    );
  }

  if (hasPermission === null) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden ${className}`}>
      {/* Video Feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Dark Overlay with Transparent Cutout */}
      <div className="absolute inset-0 bg-black/40">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-72 sm:h-72">
            
            {/* Pulsing Background */}
            <div className="absolute inset-0 bg-blue-500/20 rounded-3xl animate-pulse" />
            
            {/* Cutout Border/Corners */}
            <div className="absolute inset-0 border-2 border-white/60 rounded-3xl shadow-lg" />
            
            {/* Animated Laser Line */}
            {isScanning && (
                <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_20px_rgba(59,130,246,1)] animate-scan-laser rounded-full" />
            )}

            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-xl animate-pulse" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-xl animate-pulse" />
        </div>
        
        <p className="absolute top-[65%] left-0 right-0 text-center text-white/90 text-sm font-medium tracking-wide">
            Position QR code within the frame
        </p>
        <p className="absolute top-[70%] left-0 right-0 text-center text-white/70 text-xs">
            Scanning automatically when detected
        </p>
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20">
         <button onClick={onClose} className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all">
            <X size={24} />
         </button>
         
         <div className="flex gap-2">
           <button 
             onClick={() => setShowUpload(!showUpload)}
             className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all"
           >
             <Camera size={24} />
           </button>
           
           <button 
             onClick={toggleTorch}
             className={`p-3 backdrop-blur-md rounded-full transition-all ${torchEnabled ? 'bg-white text-black' : 'bg-black/20 text-white hover:bg-black/40'}`}
           >
             {torchEnabled ? <FlashlightOff size={24} /> : <Flashlight size={24} />}
           </button>
         </div>
      </div>

      {/* Upload Overlay */}
      {showUpload && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-center mb-4">Upload QR Image</h3>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-red-500 transition-colors"
            />
            <button 
              onClick={() => setShowUpload(false)}
              className="w-full mt-4 bg-gray-200 text-gray-800 py-2 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scan-laser {
            0% { top: 10%; opacity: 0; transform: scaleX(0.8); }
            10% { opacity: 1; transform: scaleX(1); }
            90% { opacity: 1; transform: scaleX(1); }
            100% { top: 90%; opacity: 0; transform: scaleX(0.8); }
        }
        .animate-scan-laser {
            animation: scan-laser 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}