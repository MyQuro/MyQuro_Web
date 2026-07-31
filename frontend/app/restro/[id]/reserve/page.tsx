"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Users, Calendar, CheckCircle,
  ChevronRight, ChevronLeft, Utensils,
  Armchair, Info, ChevronDown, CalendarDays,
  ShieldCheck, Zap, ArrowRight, MessageSquare
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  readonly params: { id: string } | Promise<{ id: string }>;
}

interface Restaurant {
  id: string;
  restaurantName: string;
  restaurantLogo: string;
  restaurantBanner: string;
  city: string;
  state: string;
}

interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  isAvailable: boolean;
  tags?: string[];
}

// Time slots generation (Mock)
const TIME_SLOTS = {
  Lunch: ["11:30", "12:00", "12:30", "13:00", "13:30", "14:00"],
  Dinner: ["17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"]
};

function SlideToBook({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  const [isConfirmed, setIsConfirmed] = useState(false);

  return (
    <div className={`relative h-14 w-full max-w-sm mx-auto bg-black/[0.05] rounded-full p-1 overflow-hidden select-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="absolute inset-0 flex items-center justify-center text-[15px] font-semibold text-[#86868B] tracking-tight pointer-events-none pr-8">
        {isConfirmed ? 'Processing...' : 'Slide to Book'}
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 260 }}
        dragElastic={0}
        dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 200) {
            setIsConfirmed(true);
            onConfirm();
          }
        }}
        className="relative z-10 w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#007AFF] shadow-sm cursor-grab active:cursor-grabbing group"
      >
        <ChevronRight className="w-6 h-6 group-active:scale-110 transition-transform" strokeWidth={2.5} />
      </motion.div>
      {isConfirmed && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          className="absolute inset-0 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-semibold"
        >
          Booking...
        </motion.div>
      )}
    </div>
  );
}

export default function ReservationForm({ params }: Props) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  // Wizard State
  const [step, setStep] = useState(1); // 1: Guests, 2: Date/Time, 3: Select Table, 4: Details/Confirm
  const [direction, setDirection] = useState(0); // For slide animations
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // error state removed as it was unused in current flow

  // Form Data
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState("");
  const [requests, setRequests] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");


  // Init
  useEffect(() => {
    const init = async () => {
      const resolved = await params;
      setRestaurantId(resolved.id);

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.myquro.com";
      try {
        const res = await fetch(`${BACKEND_URL}/api/restaurants/${resolved.id}`);
        if (res.ok) {
          const data = await res.json();
          setRestaurant(data.restaurant);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    init();
  }, [params]);

  // Helpers
  const nextStep = () => {
    setDirection(1);
    if (step === 1 && guests > 0) setStep(2);
    if (step === 2 && date && time) {
      setStep(3);
    }
    if (step === 3 && guestName && guestPhone) {
      setStep(4);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.myquro.com";

    try {
      const reservationId = `res_${Date.now()}`;
      const res = await fetch(`${BACKEND_URL}/api/reservations/${reservationId}/create`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId,
          numberOfGuests: guests,
          reservationTime: `${date}T${time}`,
          specialRequests: requests,
          guestName,
          guestPhone,
          guestEmail: guestEmail || undefined
        })
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        if (res.status === 401) {
          toast.error("Please login to make a reservation");
          router.push('/signin?redirect=' + window.location.pathname);
        } else {
          const data = await res.json();
          toast.error(data.message || "Failed to create reservation");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFB]">
        <div className="w-8 h-8 border-2 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin mb-4" />
        <p className="text-[13px] font-medium text-[#86868B] uppercase tracking-widest">Wait a moment</p>
      </div>
    );
  }

  if (submitted) return <SuccessView restaurant={restaurant} date={date} time={time} guests={guests} guestName={guestName} />;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  return (
    <main className="h-screen w-screen bg-[#F8F9FB] relative overflow-hidden font-sans selection:bg-blue-100/50 flex flex-col">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col pt-12 md:pt-16">
        {/* The Main Booking Card - Responsive Height */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white overflow-hidden relative flex flex-col flex-1 min-h-0 w-full h-full"
        >
          {/* Stepper Header - Compact */}
          <div className="pt-4 md:pt-5 pb-3 md:pb-4 px-6 md:px-10 border-b border-gray-50 shrink-0">
            <h2 className="text-[20px] sm:text-[24px] md:text-[28px] font-bold text-center text-[#1D1D1F] tracking-tight mb-0.5">
              {step === 1 ? 'Party Size' : step === 2 ? 'Schedule' : step === 3 ? 'Guest Details' : 'Almost There'}
            </h2>
            <p className="text-[12px] md:text-[14px] text-gray-400 text-center mb-3 md:mb-4 font-medium">
              {step === 1 ? 'How many people?' : step === 2 ? 'Pick your preferred slot' : step === 3 ? 'Who is this booking for?' : 'Review your details'}
            </p>

            {/* Visual Stepper Indicators - Compact */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-[10px] md:text-[12px] font-semibold">
              {[
                { id: 1, label: 'Size' },
                { id: 2, label: 'Schedule' },
                { id: 3, label: 'Details' },
                { id: 4, label: 'Confirm' }
              ].map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <div className={`flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full transition-all ${step === s.id ? 'bg-blue-50 text-[#007AFF]' : 'text-gray-300'}`}>
                    <span className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center text-[8px] md:text-[9px] ${step === s.id ? 'bg-[#007AFF] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {s.id}
                    </span>
                    <span className={step === s.id ? 'text-[#1D1D1F]' : 'hidden sm:inline-block'}>{s.label}</span>
                  </div>
                  {i < 3 && <div className="w-1.5 sm:w-3 md:w-6 h-[1px] bg-gray-100 mx-0.5" />}
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="p-6 md:p-10 flex-1 overflow-y-auto no-scrollbar">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
              >
                {step === 1 && (
                  <div className="space-y-6 py-2">
                    <div className="px-1">
                      <h3 className="text-[14px] font-bold text-[#86868B] uppercase tracking-widest mb-3">How many guests?</h3>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <button
                            key={num}
                            onClick={() => setGuests(num)}
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 font-bold text-[18px] sm:text-[20px] ${guests === num
                              ? 'bg-[#1D1D1F] text-white shadow-lg scale-110 z-10'
                              : 'bg-white border border-gray-100 text-[#1D1D1F] hover:border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-4 px-1">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-[#1D1D1F]">Large Party?</p>
                            <p className="text-[12px] text-gray-500">For 8+ guests</p>
                          </div>
                        </div>
                        <button className="text-[13px] font-semibold text-[#007AFF] px-4 py-1.5 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
                          Contact Us
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: DATE & TIME */}
                {step === 2 && (
                  <div className="space-y-8">
                    {/* Scrollable Date Scroller */}
                    <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-3 no-scrollbar scroll-smooth px-1">
                      {[...Array(7)].map((_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() + i);
                        const isoDate = d.toISOString().split('T')[0];
                        const isActive = date === isoDate;
                        return (
                          <button
                            key={i}
                            onClick={() => setDate(isoDate)}
                            className={`flex flex-col items-center justify-center min-w-[75px] sm:min-w-[90px] py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all duration-500 border-2 shrink-0 ${isActive
                              ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-xl shadow-blue-500/25 scale-105'
                              : 'bg-white border-gray-50 text-[#1D1D1F] hover:border-gray-100'
                              }`}
                          >
                            <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest mb-1 ${isActive ? 'text-white/60' : 'text-gray-300'}`}>
                              {d.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className="text-[20px] sm:text-[24px] font-black tracking-tighter leading-none">
                              {d.getDate()}
                            </span>
                            <span className={`text-[10px] sm:text-[11px] font-bold mt-1 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                              {d.toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Time Slots - Service Based */}
                    <div className="space-y-4 md:space-y-6">
                      {['Lunch Service', 'Dinner Service'].map((service) => (
                        <div key={service} className="space-y-3">
                          <div className="flex items-center justify-between px-2">
                            <h3 className="text-[12px] sm:text-[13px] font-black text-gray-300 uppercase tracking-widest">{service}</h3>
                            {service === 'Lunch Service' && (
                              <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-black rounded-full border border-green-100">
                                15% CORPORATE OFF
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            {['12:00', '12:30', '13:00', '13:30', '19:00', '19:30', '20:00', '20:30']
                              .filter(t => service === 'Lunch Service' ? parseInt(t) < 16 : parseInt(t) > 18)
                              .map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setTime(t)}
                                  className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-[13px] sm:text-[15px] font-black tracking-tight transition-all duration-300 border-2 ${time === t
                                    ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg shadow-blue-500/20'
                                    : 'bg-white border-gray-50 text-[#1D1D1F] hover:border-gray-100 hover:bg-gray-50/50'
                                    }`}
                                >
                                  {t}
                                </button>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#007AFF]/10 rounded-full flex items-center justify-center text-[#007AFF]">
                          <CheckCircle size={16} />
                        </div>
                        <p className="text-[14px] font-semibold text-blue-900 line-clamp-1">Lunch options are available earlier.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: GUEST DETAILS */}
                {step === 3 && (
                  <div className="space-y-5 py-2 max-w-sm mx-auto">
                    <div className="text-center space-y-0.5 mb-4">
                      <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-[#1D1D1F]">
                        Your Details
                      </h2>
                      <p className="text-[13px] text-[#86868B] font-medium">
                        Almost there! Just a few final details.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[16px] font-semibold text-[#1D1D1F] focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number *</label>
                        <input
                          type="tel"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[16px] font-semibold text-[#1D1D1F] focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email <span className="text-gray-400 font-normal">(Optional)</span></label>
                        <input
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-[16px] font-semibold text-[#1D1D1F] focus:bg-white focus:border-[#007AFF] focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: REVIEW & CONFIRM */}
                {step === 4 && (
                  <div className="space-y-12 py-4">
                    <div className="text-center space-y-2">
                      <h2 className="text-[34px] font-bold tracking-[-0.04em] text-[#1D1D1F]">
                        Confirm
                      </h2>
                      <p className="text-[17px] text-[#86868B] font-normal tracking-[-0.022em]">
                        Review your reservation.
                      </p>
                    </div>

                    {/* Summary Cards - Compact */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div onClick={() => setStep(1)} className="p-4 sm:p-5 md:p-6 bg-gray-50/50 rounded-[24px] md:rounded-[32px] border border-gray-100 hover:bg-white hover:border-[#007AFF]/20 transition-all cursor-pointer group hover:shadow-xl hover:shadow-blue-500/5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#007AFF] sm:mb-4 group-hover:scale-110 transition-transform shrink-0">
                          <Users size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <span className="block text-[10px] md:text-[11px] font-black text-gray-300 uppercase tracking-widest sm:mb-0.5">Guests</span>
                          <span className="text-[16px] md:text-[20px] font-black text-[#1D1D1F] tracking-tighter">{guests} People</span>
                        </div>
                      </div>

                      <div onClick={() => setStep(2)} className="p-4 sm:p-5 md:p-6 bg-gray-50/50 rounded-[24px] md:rounded-[32px] border border-gray-100 hover:bg-white hover:border-[#007AFF]/20 transition-all cursor-pointer group hover:shadow-xl hover:shadow-blue-500/5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#007AFF] sm:mb-4 group-hover:scale-110 transition-transform shrink-0">
                          <CalendarDays size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <span className="block text-[10px] md:text-[11px] font-black text-gray-300 uppercase tracking-widest sm:mb-0.5">Time</span>
                          <span className="text-[16px] md:text-[20px] font-black text-[#1D1D1F] tracking-tighter line-clamp-1">{time}</span>
                        </div>
                      </div>

                      <div onClick={() => setStep(3)} className="p-4 sm:p-5 md:p-6 bg-gray-50/50 rounded-[24px] md:rounded-[32px] border border-gray-100 hover:bg-white hover:border-[#007AFF]/20 transition-all cursor-pointer group hover:shadow-xl hover:shadow-blue-500/5 flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#007AFF] sm:mb-4 group-hover:scale-110 transition-transform shrink-0">
                          <Info size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <span className="block text-[10px] md:text-[11px] font-black text-gray-300 uppercase tracking-widest sm:mb-0.5">Contact</span>
                          <span className="text-[16px] md:text-[20px] font-black text-[#1D1D1F] tracking-tighter line-clamp-1">
                            {guestName.split(' ')[0] || 'Details'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[24px] md:rounded-[32px] border border-gray-100 overflow-hidden shadow-sm mt-4 sm:mt-6">
                      <div className="p-5 md:p-6 flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#007AFF] shrink-0">
                          <MessageSquare size={24} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                          <span className="block text-[10px] md:text-[11px] font-black text-gray-300 uppercase tracking-widest sm:mb-0.5">Special Notes</span>
                          <input
                            type="text"
                            value={requests}
                            onChange={(e) => setRequests(e.target.value)}
                            placeholder="Allergies, celebrations..."
                            className="w-full text-[15px] sm:text-[16px] md:text-[18px] font-bold text-[#1D1D1F] tracking-tight bg-transparent border-none p-0 focus:ring-0 placeholder:text-gray-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Fixed Card Footer - Compact */}
          <div className="px-6 md:px-10 py-4 sm:py-5 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between shrink-0">
            <button
              onClick={step === 1 ? () => router.push(`/restro/${restaurantId}`) : prevStep}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-[14px] sm:text-[15px] font-bold text-[#007AFF] hover:bg-blue-50 rounded-xl sm:rounded-2xl transition-all active:scale-95 flex items-center gap-2"
            >
              <ChevronLeft size={18} /> Back
            </button>

            {step === 4 ? (
              <SlideToBook onConfirm={handleSubmit} disabled={submitting} />
            ) : (
              <button
                onClick={nextStep}
                disabled={submitting || (step === 1 && guests === 0) || (step === 2 && (!date || !time)) || (step === 3 && (!guestName || !guestPhone))}
                className="px-6 sm:px-10 py-2.5 sm:py-3 bg-[#007AFF] text-white rounded-xl sm:rounded-2xl text-[14px] sm:text-[16px] font-black shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {submitting ? 'Please wait...' : 'Continue'}
                {!submitting && <ArrowRight size={20} strokeWidth={3} />}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}

interface SuccessProps {
  restaurant: Restaurant | null;
  date: string;
  time: string;
  guests: number;
  guestName: string;
}

function SuccessView({ restaurant, date, time, guests, guestName }: SuccessProps) {
  return (
    <main className="h-screen w-screen bg-[#F8F9FB] relative overflow-hidden font-sans selection:bg-blue-100/50 flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl bg-white rounded-[32px] md:rounded-[40px] shadow-[0_32px_80px_rgba(0,0,0,0.06)] border border-white/40 overflow-hidden flex flex-col p-6 sm:p-8 md:p-10 items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-[20px] sm:rounded-[28px] flex items-center justify-center mb-4 sm:mb-6 shadow-2xl shadow-green-500/10 border border-white"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-1 sm:space-y-2"
        >
          <h1 className="text-[28px] sm:text-[36px] font-black tracking-tighter text-[#1D1D1F] leading-[1]">
            Booking<br /><span className="text-[#007AFF]">Confirmed</span>
          </h1>
          <p className="text-[14px] sm:text-[16px] text-gray-400 max-w-[260px] sm:max-w-[300px] mx-auto leading-relaxed font-semibold">
            Your reservation at <span className="text-[#1D1D1F]">{restaurant?.restaurantName}</span> is all set!
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 py-6 sm:py-8 border-t border-b border-gray-50"
        >
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="block text-[10px] sm:text-[11px] font-black text-gray-300 uppercase tracking-widest">Date & Time</span>
            <span className="text-[18px] sm:text-[20px] font-black text-[#1D1D1F] tracking-tighter line-clamp-1">
              {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {time}
            </span>
          </div>

          <div className="space-y-0.5 text-center sm:text-left">
            <span className="block text-[10px] sm:text-[11px] font-black text-gray-300 uppercase tracking-widest">Party Size</span>
            <span className="text-[18px] sm:text-[20px] font-black text-[#1D1D1F] tracking-tighter">
              {guests} Members
            </span>
          </div>

          <div className="col-span-1 sm:col-span-2 space-y-0.5 flex items-center justify-between border-t border-gray-50 pt-4 sm:mt-4">
            <div className="text-left">
              <span className="block text-[10px] sm:text-[11px] font-black text-gray-300 uppercase tracking-widest">Reserved For</span>
              <span className="text-[20px] sm:text-[22px] font-black text-[#007AFF] tracking-tighter">{guestName}</span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#007AFF]">
              <Users size={24} strokeWidth={2.5} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full mt-8 sm:mt-10"
        >
          <Link href="/home" className="w-full sm:flex-1 h-12 sm:h-14 bg-[#1D1D1F] text-white rounded-[16px] sm:rounded-[20px] text-[15px] sm:text-[17px] font-black flex items-center justify-center active:scale-[0.98] transition-all shadow-xl shadow-black/10">
            Done
          </Link>
          <button className="w-full sm:w-auto h-12 sm:h-14 px-8 bg-white text-[#007AFF] rounded-[16px] sm:rounded-[20px] text-[15px] sm:text-[17px] font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg border border-gray-50">
            <Calendar size={20} strokeWidth={2.5} />
            Add to Calendar
          </button>
        </motion.div>
      </div>
    </main>
  );
}