"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar, Users, Clock, Utensils, AlertCircle,
  CheckCircle2, XCircle, MapPin, ChevronRight, X,
  Phone, Mail, User, Info
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface Reservation {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  restaurantBanner?: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  numberOfGuests: number;
  reservationTime: string;
  tableId?: string;
  tableNumber?: string;
  specialRequests?: string;
  status: "pending" | "confirmed" | "cancelled" | "rejected" | "completed";
  createdAt: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

// --- Helper Components ---

const GeometricBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-[0.03] text-zinc-800">
      <defs>
        <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
          <path d="M25 0 L50 14.4 L50 29 L25 43.4 L0 29 L0 14.4 Z" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hexagons)" />
    </svg>
    <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#d5b263]/5 to-transparent" />
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    pending: "bg-amber-950/40 text-amber-400 border-amber-900/30",
    confirmed: "bg-emerald-950/40 text-emerald-400 border-emerald-900/30",
    cancelled: "bg-rose-950/40 text-rose-400 border-rose-900/30",
    rejected: "bg-red-950/40 text-red-400 border-red-900/30",
    completed: "bg-blue-950/40 text-blue-400 border-blue-900/30",
  };

  const key = status as keyof typeof styles;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border capitalize shadow-sm ${styles[key] || styles.pending}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${key === 'pending' ? 'bg-amber-500' : key === 'confirmed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {status}
    </span>
  );
};

const ReservationCard = ({ res }: { res: Reservation }) => {
  const date = new Date(res.reservationTime).toLocaleDateString("en-US", { day: '2-digit', month: 'short', year: 'numeric' });
  const time = new Date(res.reservationTime).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0c0c0e] rounded-[2rem] overflow-hidden border border-zinc-800/80 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-500 mb-6 group"
    >
      <div className="flex flex-col lg:flex-row">
        {/* Image Section */}
        <div className="lg:w-1/3 h-56 lg:h-auto relative overflow-hidden">
          <img
            src={res.restaurantBanner || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80"}
            alt={res.restaurantName}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0 opacity-85 group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        </div>

        {/* Info Section */}
        <div className="lg:w-2/3 p-6 lg:p-8 relative">
          <div className="absolute top-6 right-6 lg:top-8 lg:right-8">
            <StatusBadge status={res.status} />
          </div>

          <div className="mb-6 pr-20">
            <h3 className="text-2xl font-bold text-white mb-2 truncate group-hover:text-[#d5b263] transition-colors">
              {res.restaurantName || "CVS Cafe"}
            </h3>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-zinc-600 text-sm">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#d5b263]" />
                <span className="leading-tight">{res.restaurantAddress || "HB/16, CITY CENTRE SEC 4, OPPOSITE MITHELA ACADEMY, Bokaro Steel City Sec- 04, Chas (Bokaro Sadar)"}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600 text-sm">
                <Phone className="w-4 h-4 shrink-0 text-[#d5b263]" />
                <span>{res.restaurantPhone || "7483932298"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
            {/* User Info */}
            <div className="space-y-2 border-l-2 border-zinc-800 pl-4">
              <div className="flex items-center gap-2 text-white">
                <User className="w-4 h-4 text-[#d5b263]" />
                <span className="text-sm font-bold uppercase tracking-wide">Booked By : <span className="text-zinc-600 font-medium normal-case">{res.guestName || "Saniya"}</span></span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600 text-sm pl-6">
                <Mail className="w-4 h-4 text-[#d5b263]" />
                <span className="truncate">{res.guestEmail || "Saniya13205@gmail.com"}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600 text-sm pl-6">
                <Phone className="w-4 h-4 text-[#d5b263]" />
                <span>{res.guestPhone || "7483932298"}</span>
              </div>
            </div>

            {/* Reservation Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-700 text-sm">
                  <Calendar className="w-4 h-4 text-[#d5b263]" />
                  <span className="font-semibold">{date}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 text-sm">
                  <Users className="w-4 h-4 text-[#d5b263]" />
                  <span className="font-semibold">{res.numberOfGuests} Guests</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-zinc-700 text-sm">
                  <Clock className="w-4 h-4 text-[#d5b263]" />
                  <span className="font-semibold">{time}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-700 text-sm">
                  <MapPin className="w-4 h-4 text-[#d5b263]" />
                  <span className="font-semibold">Table {res.tableNumber || "RS1"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main Component ---

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "past" | "cancelled">("all");

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.myquro.com";
      const res = await fetch(`${BACKEND_URL}/api/reservations/my`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      } else {
        setReservations([
          {
            id: "1",
            restaurantId: "1",
            restaurantName: "CVS Cafe",
            guestName: "Saniya",
            guestEmail: "Saniya13205@gmail.com",
            guestPhone: "7483932298",
            numberOfGuests: 4,
            reservationTime: "2026-03-06T19:30:00",
            status: "confirmed",
            tableNumber: "2",
            createdAt: new Date().toISOString()
          },
          {
            id: "2",
            restaurantId: "2",
            restaurantName: "Cafe Coffee Day",
            guestName: "Saniya",
            guestEmail: "Saniya13205@gmail.com",
            guestPhone: "7483932298",
            numberOfGuests: 2,
            reservationTime: "2026-03-07T15:30:00",
            status: "pending",
            createdAt: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = useMemo(() => {
    if (activeTab === "all") return reservations;
    if (activeTab === "upcoming") return reservations.filter(r => ["pending", "confirmed"].includes(r.status));
    if (activeTab === "past") return reservations.filter(r => r.status === "completed");
    if (activeTab === "cancelled") return reservations.filter(r => ["cancelled", "rejected"].includes(r.status));
    return reservations;
  }, [reservations, activeTab]);

  return (
    <main className="min-h-screen relative font-inter bg-black text-white overflow-x-hidden">
      <GeometricBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">

        {/* Top Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center md:justify-start mb-6"
        >
          <div className="bg-[#d5b263]/10 border border-[#d5b263]/25 px-4 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
            <span className="w-4 h-4 bg-[#d5b263] rounded-md flex items-center justify-center">
              <Utensils className="w-3 h-3 text-black" />
            </span>
            <span className="text-[#d5b263] text-xs font-bold uppercase tracking-wider">My Reservations</span>
          </div>
        </motion.div>

        {/* Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-end">
          <div className="lg:col-span-6 text-center md:text-left">
            <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.1] mb-2 tracking-tight">
              Manage Your<br />
              <span className="text-[#d5b263]">Reservations</span>
            </h1>
          </div>
          <div className="lg:col-span-6 border-l-0 lg:border-l lg:border-zinc-800 lg:pl-12 py-2">
            <p className="text-zinc-400 text-base md:text-lg font-medium leading-relaxed max-w-2xl">
              Our comprehensive platform equips restaurants with powerful digital tools that streamline operations, enhance customer engagement, and help them thrive confidently in today's fast-evolving industry.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-zinc-950 p-2 rounded-[2rem] border border-zinc-800/80 shadow-2xl flex flex-wrap justify-center gap-2">
            {(["all", "upcoming", "past", "cancelled"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-10 py-3 rounded-[1.5rem] text-sm font-bold transition-all duration-300 ${activeTab === tab
                  ? "bg-[#d5b263] text-black shadow-[0_10px_20px_-5px_rgba(213,178,99,0.35)]"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                  }`}
              >
                {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Content */}
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex flex-col gap-6 animate-pulse">
              {[1, 2].map(i => (
                <div key={i} className="h-64 bg-zinc-900/30 border border-zinc-800/60 rounded-[2rem]" />
              ))}
            </div>
          ) : filteredReservations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/80 shadow-sm"
            >
              <div className="w-20 h-20 bg-zinc-950/60 border border-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-zinc-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">No Reservations Found</h3>
              <p className="text-zinc-400 mb-8 max-w-xs mx-auto font-medium">
                You haven't made any reservations yet. Discover top-rated restaurants and book your table now.
              </p>
              <Link
                href="/explore"
                className="inline-block bg-[#d5b263] hover:bg-[#bfa052] text-black px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-[#d5b263]/20 transition-transform hover:-translate-y-0.5"
              >
                Explore Restaurants
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((res) => (
                <ReservationCard key={res.id} res={res} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}