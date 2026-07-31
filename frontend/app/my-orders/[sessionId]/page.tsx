"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';
import {
   ChevronLeft,
   Receipt,
   Calendar,
   Clock,
   MapPin,
   Tag,
   Star,
   CheckCircle2,
   CreditCard,
   Sparkles,
   Award,
   Share2,
   MoreVertical,
   Phone,
   HelpCircle,
   Utensils,
   Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateInvoicePDF } from '@/lib/invoice-pdf';

// --- Types ---
interface OrderDetail {
   session: {
      sessionId: string;
      restaurantId: string;
      restaurantName: string;
      restaurantLogo: string | null;
      restaurantBanner: string | null;
      restaurantCity: string;
      restaurantAddress: string;
      restaurantFssai?: string | null;
      tableNumber: string;
      startedAt: string;
      closedAt: string | null;
      billedAt: string | null;
      paymentStatus: string;
      finalBillAmount: number;
      grandTotal: number;
      subtotal: number;
      discountAmount: number;
      gstAmount: number;
      status: string;
      createdByUserId: string;
      creatorName: string | null;
      creatorEmail: string;
      creatorImage: string | null;
   };
   items: Array<{
      orderItemId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      notes: string | null;
      status: string;
      itemName: string;
      itemDescription: string | null;
      itemImage: string | null;
      isVeg: boolean;
      variantName: string | null;
      variantSize: string | null;
      extras: Array<{
         extraId: string;
         name: string;
         quantity: number;
         unitPrice: number;
         totalPrice: number;
      }>;
   }>;
   payments: Array<{
      id: string;
      tableSessionId: string;
      amount: number;
      method: string;
      status: string;
      transactionId: string | null;
      createdAt: string;
      updatedAt: string;
   }>;
   discounts: Array<{
      id: string;
      sessionId: string;
      discountType: string;
      discountValue: number;
      discountAmount: number;
      voucherId: string | null;
      createdAt: string;
   }>;
   hasReview: boolean;
   review: {
      id: string;
      sessionId: string;
      userId: string;
      restaurantId: string;
      rating: number;
      reviewText: string | null;
      createdAt: string;
      updatedAt: string;
   } | null;
}

export default function OrderDetailPage() {
   const router = useRouter();
   const params = useParams();
   const sessionId = params.sessionId as string;
   const { data: session } = authClient.useSession();

   const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
   const [loading, setLoading] = useState(true);
   const [showReviewModal, setShowReviewModal] = useState(false);
   const [rating, setRating] = useState(0);
   const [reviewText, setReviewText] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const [scrolled, setScrolled] = useState(false);
   const [downloadingPDF, setDownloadingPDF] = useState(false);

   // --- Effects ---
   useEffect(() => {
      if (session?.user) loadOrderDetail();
   }, [session, sessionId]);

   useEffect(() => {
      const handleScroll = () => setScrolled(window.scrollY > 20);
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
   }, []);

   // --- Logic ---
   const loadOrderDetail = async () => {
      try {
         setLoading(true);
         const response = await apiClient.getOrderDetails(sessionId);
         setOrderDetail(response.order);
      } catch (error: any) {
         console.error('Failed to load order details:', error);
         toast.error('Failed to load order details');
      } finally {
         setLoading(false);
      }
   };

   const handleSubmitReview = async () => {
      if (rating === 0) return toast.error('Please select a rating');
      try {
         setSubmitting(true);
         await apiClient.submitReview(
            sessionId,
            orderDetail!.session.restaurantId,
            rating,
            reviewText || undefined
         );
         toast.success('Review submitted successfully!');
         setShowReviewModal(false);
         await loadOrderDetail();
      } catch (error: any) {
         toast.error(error.message || 'Failed to submit review');
      } finally {
         setSubmitting(false);
      }
   };

   const handleDownloadPDF = async () => {
      if (!orderDetail) return;

      try {
         setDownloadingPDF(true);
         await generateInvoicePDF(orderDetail);
         toast.success('Invoice downloaded successfully!');
      } catch (error: any) {
         console.error('Failed to generate PDF:', error);
         toast.error('Failed to download invoice');
      } finally {
         setDownloadingPDF(false);
      }
   };

   // --- Formatters ---
   const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
   const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
   const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount / 100);

   if (loading) return <OrderSkeleton />;

   if (!orderDetail) {
      return (
         <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-white">
            <Receipt className="w-16 h-16 text-zinc-600 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Order not found</h2>
            <button onClick={() => router.push('/my-orders')} className="text-[#d5b263] font-bold hover:underline">Back to orders</button>
         </div>
      );
   }

   const { session: sessionData, items, payments, discounts, hasReview, review } = orderDetail;

   return (
      <div className="min-h-screen bg-black font-sans pb-24 text-white">

         {/* 1. Sticky Transparent/Blurred Header */}
         <header className={`fixed top-20 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-zinc-900 shadow-sm py-2' : 'bg-transparent py-4'}`}>
            <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
               <button
                  onClick={() => router.push('/my-orders')}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${scrolled ? 'bg-zinc-900 border border-zinc-800 text-white hover:text-[#d5b263]' : 'bg-black/40 text-white backdrop-blur-md border border-zinc-850 hover:border-zinc-800'}`}
               >
                  <ChevronLeft size={20} />
               </button>
               <h1 className={`text-lg font-bold text-white transition-opacity ${scrolled ? 'opacity-100' : 'opacity-0'}`}>Order Summary</h1>
               <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${scrolled ? 'bg-zinc-900 border border-zinc-800 text-white hover:text-[#d5b263]' : 'bg-black/40 text-white backdrop-blur-md border border-zinc-850 hover:border-zinc-800'}`}>
                  <Share2 size={18} />
               </button>
            </div>
         </header>

         {/* 2. Hero Section (Banner) */}
         <div className="relative h-64 w-full bg-zinc-950">
            {sessionData.restaurantBanner ? (
               <img src={sessionData.restaurantBanner} alt="Banner" className="w-full h-full object-cover grayscale opacity-60" />
            ) : (
               <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                  <Receipt size={48} className="text-zinc-800" />
               </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
         </div>

         <main className="max-w-2xl mx-auto px-4 -mt-20 relative z-10 space-y-6">

            {/* 3. Main Status Card */}
            <div className="bg-zinc-900/40 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-zinc-800/80 animate-in slide-in-from-bottom-8">
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <h1 className="text-2xl font-black text-white leading-tight mb-1">{sessionData.restaurantName}</h1>
                     <p className="text-sm text-zinc-400 font-medium flex items-center gap-1">
                        <MapPin size={12} className="text-[#d5b263]" /> {sessionData.restaurantAddress}
                     </p>
                  </div>
                  {sessionData.restaurantLogo && (
                     <img src={sessionData.restaurantLogo} alt="Logo" className="w-12 h-12 rounded-xl object-cover border border-zinc-850 shadow-sm grayscale opacity-80" />
                  )}
               </div>

               <div className="flex gap-2 mb-6">
                  <div className="px-3 py-1 bg-emerald-950/40 text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-900/30">
                     <CheckCircle2 size={12} /> Completed
                  </div>
                  <div className="px-3 py-1 bg-zinc-950 text-zinc-400 rounded-full text-xs font-bold flex items-center gap-1.5 border border-zinc-850">
                     Table {sessionData.tableNumber}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-zinc-800/80">
                  <div>
                     <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Order Date</p>
                     <div className="flex items-center gap-1.5 text-zinc-300 font-semibold text-sm">
                        <Calendar size={14} className="text-zinc-500" />
                        {formatDate(sessionData.closedAt || sessionData.startedAt)}
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Amount Paid</p>
                     <div className="text-lg font-black text-white">
                        {formatCurrency(sessionData.finalBillAmount)}
                     </div>
                  </div>
               </div>
            </div>

            {/* 4. Order Items List (With Images) */}
            <div>
               <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2">Items Ordered</h3>
               <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
                  {items.map((item, idx) => (
                     <div key={item.orderItemId} className={`flex gap-4 p-4 ${idx !== items.length - 1 ? 'border-b border-zinc-850' : ''}`}>

                        {/* Image Column */}
                        <div className="flex-shrink-0">
                           {item.itemImage ? (
                              <img
                                 src={item.itemImage}
                                 alt={item.itemName}
                                 className="w-16 h-16 rounded-xl object-cover bg-zinc-950 border border-zinc-850"
                              />
                           ) : (
                              <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-center">
                                 <Utensils className="text-zinc-600" size={20} />
                              </div>
                           )}
                        </div>

                        {/* Info Column */}
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-1">
                              <div className="flex items-start gap-2">
                                 {/* Veg Indicator */}
                                 <div className={`mt-1 w-3 h-3 border-[1px] rounded-[3px] flex items-center justify-center flex-shrink-0 ${item.isVeg ? 'border-green-650' : 'border-red-650'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-650'}`} />
                                 </div>
                                 <h4 className="font-bold text-white text-sm leading-snug">{item.itemName}</h4>
                              </div>
                              <span className="font-semibold text-zinc-300 text-sm whitespace-nowrap ml-2">{formatCurrency(item.totalPrice)}</span>
                           </div>

                           <div className="pl-5">
                              <p className="text-xs text-zinc-400 font-medium mb-1">
                                 {item.variantName || 'Regular'} {item.variantSize && `• ${item.variantSize}`} • x{item.quantity}
                              </p>
                              {item.extras && item.extras.length > 0 && (
                                 <div className="mb-2">
                                    <p className="text-xs text-zinc-500 font-medium mb-1">Extras:</p>
                                    <div className="space-y-1">
                                       {item.extras.map((extra, extraIdx) => (
                                          <div key={extraIdx} className="flex justify-between items-center text-xs text-zinc-400">
                                             <span>• {extra.name} x{extra.quantity}</span>
                                             <span>{formatCurrency(extra.totalPrice)}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}
                              {item.notes && <p className="text-xs text-zinc-500 italic">"{item.notes}"</p>}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* 5. Bill Summary (Receipt Style) */}
            <div>
               <div className="flex justify-between items-center mb-3 px-2">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Bill Summary</h3>
                  <button
                     onClick={handleDownloadPDF}
                     disabled={downloadingPDF}
                     className="flex items-center gap-2 bg-[#d5b263] text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#bfa052] disabled:bg-zinc-800 disabled:text-zinc-600 transition-all shadow-lg shadow-[#d5b263]/10 active:scale-95"
                  >
                     <Download size={14} />
                     {downloadingPDF ? 'Downloading...' : 'Download Invoice'}
                  </button>
               </div>
               <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] relative overflow-hidden">
                  <div className="space-y-3 text-sm">
                     <div className="flex justify-between text-zinc-400">
                        <span>Item Total</span>
                        <span>{formatCurrency(sessionData.subtotal)}</span>
                     </div>
                     {sessionData.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-400 font-medium">
                           <span className="flex items-center gap-1"><Sparkles size={12} /> Savings</span>
                           <span>-{formatCurrency(sessionData.discountAmount)}</span>
                        </div>
                     )}
                     {sessionData.gstAmount > 0 && (
                        <div className="flex justify-between text-zinc-400">
                           <span>Taxes & Charges</span>
                           <span>{formatCurrency(sessionData.gstAmount)}</span>
                        </div>
                     )}

                     {/* Dashed Separator */}
                     <div className="border-t border-dashed border-zinc-800/80 my-4" />

                     <div className="flex justify-between items-center">
                        <span className="font-bold text-white text-base">Grand Total</span>
                        <span className="font-black text-xl text-[#d5b263]">{formatCurrency(sessionData.finalBillAmount)}</span>
                     </div>
                  </div>

                  {/* Payment Method Pill */}
                  {payments.length > 0 && (
                     <div className="mt-4 pt-4 border-t border-zinc-850 flex items-center justify-between">
                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Paid Via</span>
                        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-850">
                           <CreditCard size={14} className="text-[#d5b263]" />
                           <span className="text-xs font-bold text-zinc-300 uppercase">{payments[0].method}</span>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* 6. Rating Section */}
            <div className="pb-8">
               {hasReview && review ? (
                  <div className="bg-gradient-to-br from-[#d5b263]/10 to-[#d5b263]/5 rounded-3xl p-5 border border-[#d5b263]/20">
                     <div className="flex items-center gap-2 mb-3">
                        <div className="bg-[#d5b263]/25 text-[#d5b263] p-2 rounded-full">
                           <Star size={16} fill="currentColor" />
                        </div>
                        <span className="font-bold text-[#d5b263]">You rated this</span>
                     </div>
                     <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map(s => (
                           <Star key={s} size={16} className={s <= review.rating ? "text-[#d5b263] fill-[#d5b263]" : "text-zinc-800"} />
                        ))}
                     </div>
                     {review.reviewText && <p className="text-sm text-zinc-300 italic">"{review.reviewText}"</p>}
                  </div>
               ) : (
                  <button
                     onClick={() => setShowReviewModal(true)}
                     className="w-full bg-[#d5b263] text-black py-4 rounded-2xl font-bold shadow-lg shadow-[#d5b263]/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                     <Star size={18} /> Rate Your Experience
                  </button>
               )}
            </div>

            {/* 7. Need Help Footer */}
            <div className="flex flex-col items-center gap-2 pb-8">
               <a 
                  href="tel:9472710075"
                  className="text-sm text-[#d5b263] font-bold flex items-center gap-2 hover:text-[#bfa052] bg-[#d5b263]/10 border border-[#d5b263]/25 px-5 py-2.5 rounded-full transition-colors active:scale-95 shadow-sm"
               >
                  <Phone size={14} className="animate-bounce" /> Emergency SOS / Support: 9472710075
               </a>
            </div>

         </main>

         {/* Review Modal */}
         {showReviewModal && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowReviewModal(false)}>
               <div className="bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-zinc-800/80 shadow-2xl animate-in slide-in-from-bottom-full duration-300" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden" />
                  <div className="text-center mb-8">
                     <h3 className="text-xl font-black text-white mb-2">How was {sessionData.restaurantName}?</h3>
                     <p className="text-zinc-400 text-sm">Your feedback helps them improve.</p>
                  </div>
                  <div className="flex justify-center gap-3 mb-8">
                     {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setRating(star)} className="group p-1 transition-transform hover:-translate-y-1 active:scale-90">
                           <Star size={40} strokeWidth={1.5} className={`${star <= rating ? 'text-[#d5b263] fill-[#d5b263] drop-shadow-sm' : 'text-zinc-800'} transition-colors`} />
                        </button>
                     ))}
                  </div>
                  <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Write a note (optional)..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 focus:outline-none focus:ring-2 focus:ring-[#d5b263]/20 focus:border-[#d5b263] text-white resize-none text-sm" rows={3} />
                  <div className="flex gap-3">
                     <button onClick={() => setShowReviewModal(false)} className="flex-1 py-3.5 rounded-xl font-bold text-zinc-350 bg-zinc-800 hover:bg-zinc-750 transition-colors">Cancel</button>
                     <button onClick={handleSubmitReview} disabled={submitting || rating === 0} className="flex-1 py-3.5 rounded-xl font-bold text-black bg-[#d5b263] hover:bg-[#bfa052] disabled:bg-zinc-800 disabled:text-zinc-600 transition-all shadow-lg shadow-[#d5b263]/10">{submitting ? 'Submitting...' : 'Submit Review'}</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

// --- Skeleton Loader ---
function OrderSkeleton() {
   return (
      <div className="min-h-screen bg-black text-white">
         <div className="h-64 bg-zinc-950 animate-pulse w-full border-b border-zinc-900" />
         <div className="max-w-2xl mx-auto px-4 -mt-20 relative z-10 space-y-6">
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-6 h-48 shadow-sm animate-pulse" />
            <div className="h-4 w-32 bg-zinc-900 rounded animate-pulse" />
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl h-64 shadow-sm animate-pulse" />
            <div className="h-4 w-32 bg-zinc-900 rounded animate-pulse" />
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl h-40 shadow-sm animate-pulse" />
         </div>
      </div>
   )
}