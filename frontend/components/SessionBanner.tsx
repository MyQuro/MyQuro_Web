"use client";

import { useSession } from '@/lib/session-context';
import { Receipt, X, ArrowRight, Sparkles, Clock, AlertCircle, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SessionBanner() {
  const { session, isBannerDismissed, setBannerDismissed } = useSession();
  const router = useRouter();
  const [pulse, setPulse] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    // Pulse animation every 3 seconds
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch session details to check if bill is requested
  useEffect(() => {
    const fetchSessionDetails = async () => {
      if (!session?.sessionId) return;

      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
        const response = await fetch(`${BACKEND_URL}/api/sessions/${session.sessionId}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setSessionDetails(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch session details:', error);
      }
    };

    if (session?.sessionId) {
      fetchSessionDetails();
      // Refresh every 30 seconds
      const interval = setInterval(fetchSessionDetails, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.sessionId]);

  // Hide banner if no session OR if payment is completed OR banner is manually dismissed
  if (!session || isBannerDismissed || sessionDetails?.session?.paymentStatus === 'paid') {
    return null;
  }

  const handleViewSession = () => {
    // Check if payment is requested (but not yet paid)
    if (sessionDetails?.session?.billedAt && sessionDetails?.session?.paymentStatus !== 'paid') {
      setShowPaymentModal(true);
      return;
    }
    router.push('/my-session');
  };

  const handleDismiss = () => {
    setBannerDismissed(true);
  };

  return (
    <div className="bg-[#0c0c0e] text-white border-b border-white/5 shadow-xl animate-in slide-in-from-top duration-500 relative z-[60] h-[72px] flex flex-col justify-center">

      <div className="relative max-w-2xl mx-auto px-4 py-3 sm:py-3.5 w-full">
        <div className="flex items-center justify-between gap-3">
          {/* Left Section - Icon + Info */}
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            {/* Minimal Icon Container */}
            <div className={`relative w-10 h-10 bg-[#16161a] rounded-[14px] flex items-center justify-center shrink-0 border border-white/10 ${pulse ? 'shadow-[0_0_15px_rgba(213,178,99,0.2)]' : ''
              } transition-shadow duration-300`}>
              <Receipt className="w-5 h-5 text-[#d5b263]" strokeWidth={2} />
              <div className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d5b263] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#d5b263]"></span>
              </div>
            </div>

            {/* Session Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-black text-[15px] sm:text-base text-white tracking-wide truncate">
                  {session.tableNumber ? `Table ${session.tableNumber}` : 'Active Session'}
                </p>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-[#d5b263]/10 rounded-full border border-[#d5b263]/30 shrink-0">
                  <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-[#d5b263] uppercase">Dining In</span>
                </div>
              </div>
              <p className="text-[12px] text-zinc-300 font-medium truncate">
                Tap to view your orders & bill
              </p>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Session Button */}
            <button
              onClick={handleViewSession}
              className="group relative flex items-center gap-1.5 px-4 py-2 bg-[#d5b263] text-black hover:bg-[#c4a152] rounded-xl transition-all duration-200 shadow-md active:scale-95 font-black text-[13px] overflow-hidden"
            >
              <span className="relative z-10">View</span>
              <ArrowRight className="w-3.5 h-3.5 relative z-10 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
            </button>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors active:scale-95 ml-1"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>


      {/* Payment Pending Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-[#050506] border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="relative p-6 pt-8 bg-gradient-to-br from-[#0c0c0e] to-[#050506] border-b border-white/5 flex flex-col items-center">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute right-6 top-6 p-2.5 bg-white/5 border border-white/10 rounded-full text-zinc-400 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                <X size={16} strokeWidth={2.5} />
              </button>

              <div className="w-16 h-16 bg-gradient-to-br from-[#d5b263]/20 to-[#d5b263]/5 rounded-[20px] flex items-center justify-center mb-4 border border-[#d5b263]/20 shadow-inner">
                <CreditCard className="w-8 h-8 text-[#d5b263] drop-shadow-[0_0_12px_rgba(213,178,99,0.5)]" />
              </div>
              <h2 className="text-[22px] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-zinc-400 tracking-tight leading-none drop-shadow-sm">Payment Requested</h2>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 bg-[#050506]">
              <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col items-center">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <AlertCircle className="w-8 h-8 text-[#d5b263] mb-3 drop-shadow-[0_0_8px_rgba(213,178,99,0.3)]" />
                <p className="text-white font-black text-[15px] text-center mb-2 uppercase tracking-wide">
                  Bill Has Been Requested
                </p>
                <p className="text-zinc-400 text-xs text-center leading-relaxed font-medium">
                  Your billing session has been frozen. Please wait for our restaurant staff to process and confirm your payment.
                </p>
              </div>

              <div className="bg-[#0c0c0e]/50 border border-white/5 rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-zinc-400">
                <Clock className="w-4 h-4 text-[#d5b263]" />
                <span>Staff will assist you shortly</span>
              </div>

              <p className="text-zinc-500 text-[11px] font-bold text-center tracking-wide uppercase">
                No additional items can be ordered at this time.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0c0c0e] border-t border-white/5 flex flex-col gap-2">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  router.push('/my-session');
                }}
                className="w-full relative group overflow-hidden h-12 rounded-[14px] transition-transform active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-[#d5b263] shadow-lg"></div>
                <div className="relative h-full flex items-center justify-center font-black text-black text-xs uppercase tracking-wider">
                  View My Session
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
