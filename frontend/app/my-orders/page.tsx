"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';
import {
   ChevronLeft,
   Calendar,
   Clock,
   MapPin,
   CheckCircle2,
   Package,
   ChevronRight,
   IndianRupee,
   Store,
   ArrowUpRight,
   Utensils,
   Search,
   X,
   SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface Order {
   sessionId: string;
   restaurantId: string;
   restaurantName: string;
   restaurantLogo: string | null;
   restaurantCity: string | null;
   tableNumber: string;
   startedAt: string;
   closedAt: string | null;
   paymentStatus: string;
   finalBillAmount: number;
   grandTotal: number;
   status: string;
   itemsCount: number;
   totalPaid: number;
   paymentMethod: string | null;
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

const EmptyState = () => (
   <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0c0c0e] rounded-[2rem] border border-zinc-800/80 shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-12 text-center max-w-4xl mx-auto"
   >
      <div className="flex justify-center mb-8">
         <img
            src="/illus/chef-cooking.png"
            alt="Chef cooking"
            className="w-64 h-auto grayscale opacity-80"
         />
      </div>
      <h3 className="text-3xl font-black text-white mb-2 tracking-tight">No Order Yet</h3>
      <p className="text-zinc-650 mb-8 max-w-xs mx-auto font-medium">
         Start ordering from your favorite restaurants!
      </p>
      <Link
         href="/explore"
         className="inline-block bg-[#d5b263] hover:bg-[#bfa052] text-black px-10 py-3.5 rounded-2xl font-bold shadow-[0_10px_20px_-5px_rgba(213,178,99,0.3)] transition-all hover:-translate-y-1 active:scale-95"
      >
         Browse Restaurant
      </Link>
   </motion.div>
);

const StatusBadge = ({ status, paymentStatus }: { status: string, paymentStatus: string }) => {
   const isPaid = paymentStatus === 'paid';
   return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border capitalize shadow-sm ${isPaid ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' : 'bg-amber-950/40 text-amber-400 border-amber-900/30'}`}>
         <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
         {isPaid ? 'Completed' : 'Pending'}
      </span>
   );
};

// --- Main Component ---

export default function MyOrdersPage() {
   const router = useRouter();
   const { data: session, isPending } = authClient.useSession();
   const [orders, setOrders] = useState<Order[]>([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending'>('all');

   useEffect(() => {
      if (!isPending && !session?.user) {
         router.push('/signin?redirect=/my-orders');
         return;
      }
      if (session?.user) loadOrders();
   }, [session, isPending, router]);

   const loadOrders = async () => {
      try {
         setLoading(true);
         const response = await apiClient.getMyOrders();
         setOrders(response.orders || []);
      } catch (error: any) {
         console.error('Failed to load orders:', error);
         toast.error('Could not fetch order history');
      } finally {
         setLoading(false);
      }
   };

   const filteredOrders = useMemo(() => {
      if (activeTab === 'all') return orders;
      if (activeTab === 'completed') return orders.filter(o => o.paymentStatus === 'paid');
      if (activeTab === 'pending') return orders.filter(o => o.paymentStatus !== 'paid');
      return orders;
   }, [orders, activeTab]);

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
                     <Package className="w-3 h-3 text-black" />
                  </span>
                  <span className="text-[#d5b263] text-xs font-bold uppercase tracking-wider">My Orders</span>
               </div>
            </motion.div>

            {/* Header Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 items-end">
               <div className="lg:col-span-6 text-center md:text-left">
                  <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.1] mb-2 tracking-tight">
                     Manage Your<br />
                     <span className="text-[#d5b263]">Orders</span>
                  </h1>
               </div>
               <div className="lg:col-span-6 border-l-0 lg:border-l lg:border-zinc-800 lg:pl-12 py-2">
                  <p className="text-zinc-400 text-base md:text-lg font-medium leading-relaxed max-w-2xl">
                     Our comprehensive platform equips restaurants with powerful digital tools that streamline operations, enhance customer engagement, and help them thrive confidently in today's fast-evolving industry.
                  </p>
               </div>
            </div>

            {/* Tab Navigation (Optional integration if active orders exist) */}
            {orders.length > 0 && (
               <div className="flex justify-center mb-12">
                  <div className="bg-zinc-950 p-2 rounded-[2rem] border border-zinc-800/80 shadow-2xl flex flex-wrap justify-center gap-2">
                     {(["all", "completed", "pending"] as const).map((tab) => (
                        <button
                           key={tab}
                           onClick={() => setActiveTab(tab)}
                           className={`px-10 py-3 rounded-[1.5rem] text-sm font-bold transition-all duration-300 ${activeTab === tab
                              ? "bg-[#d5b263] text-black shadow-[0_10px_20px_-5px_rgba(213,178,99,0.35)]"
                              : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                              }`}
                        >
                           {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                  </div>
               </div>
            )}

            {/* Content Area */}
            <div className="max-w-5xl mx-auto">
               {loading ? (
                  <div className="flex flex-col gap-6 animate-pulse">
                     {[1, 2].map(i => (
                        <div key={i} className="h-48 bg-zinc-900/30 border border-zinc-800/60 rounded-[2rem]" />
                     ))}
                  </div>
               ) : orders.length === 0 ? (
                  <EmptyState />
               ) : (
                  <AnimatePresence mode="popLayout">
                     <motion.div className="space-y-6">
                        {filteredOrders.map((order, idx) => (
                           <motion.div
                              key={order.sessionId}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ delay: idx * 0.05 }}
                           >
                              <Link
                                 href={`/my-orders/${order.sessionId}`}
                                 className="group bg-[#0c0c0e] rounded-[2rem] border border-zinc-800/80 p-6 flex flex-col md:flex-row gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-all duration-500 relative"
                              >
                                 <div className="flex-1 flex gap-5">
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center shrink-0">
                                       {order.restaurantLogo ? (
                                          <img src={order.restaurantLogo} alt="Logo" className="w-full h-full object-cover rounded-2xl grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100" />
                                       ) : (
                                          <Store className="w-8 h-8 text-zinc-500" />
                                       )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-start mb-2">
                                          <h3 className="text-xl font-bold text-white truncate group-hover:text-[#d5b263] transition-colors">
                                             {order.restaurantName}
                                          </h3>
                                          <StatusBadge status={order.status} paymentStatus={order.paymentStatus} />
                                       </div>
                                       <div className="flex flex-wrap gap-4 text-sm text-zinc-600">
                                          <div className="flex items-center gap-1.5">
                                             <Calendar className="w-4 h-4 text-[#d5b263]" />
                                             <span>{new Date(order.closedAt || order.startedAt).toLocaleDateString()}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                             <Package className="w-4 h-4 text-[#d5b263]" />
                                             <span>{order.itemsCount} Items</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 font-bold text-white">
                                             <IndianRupee className="w-4 h-4 text-[#d5b263]" />
                                             <span>{((order.finalBillAmount || order.grandTotal) / 100).toFixed(2)}</span>
                                          </div>
                                       </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end">
                                     <div className="w-12 h-12 rounded-full bg-zinc-950 flex items-center justify-center border border-zinc-850 group-hover:bg-[#d5b263] group-hover:text-black text-[#d5b263] transition-all duration-300 shadow-sm">
                                        <ArrowUpRight className="w-6 h-6" />
                                     </div>
                                  </div>
                              </Link>
                           </motion.div>
                        ))}
                     </motion.div>
                  </AnimatePresence>
               )}
            </div>
         </div>
      </main>
   );
}