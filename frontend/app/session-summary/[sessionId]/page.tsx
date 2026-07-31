"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';
import {
  ArrowLeft, Clock, Users, Receipt, Loader2,
  CheckCircle, AlertCircle, ChefHat, Ban, Package,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  status: 'placed' | 'preparing' | 'served' | 'cancelled';
  notes: string | null;
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  createdAt: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  menuItemName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  isVeg: boolean;
}

interface SessionData {
  session: {
    sessionId: string;
    tableNumber: string | null;
    restaurantName: string;
    status: string;
    paymentStatus: string;
    startedAt: string;
    billedAt: string | null;
    frozenSubtotal?: number | null;
    frozenGstRate?: number | null;
    frozenGstAmount?: number | null;
    frozenDiscountAmount?: number | null;
    finalBillAmount?: number | null;
    calculatedSubtotal: number;
    calculatedDiscount: number;
    calculatedGst: number;
    calculatedGrandTotal: number;
    invoiceNumber: string | null;
  };
  orders: Order[];
}

const VegIndicator = ({ isVeg }: { isVeg: boolean }) => (
  <div className={`w-3.5 h-3.5 border-[1.5px] flex items-center justify-center rounded-[3px] bg-black ${isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
    <div className={`w-1.5 h-1.5 rounded-full ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    placed: { color: 'bg-amber-500/10 text-amber-400 border border-amber-500/30', icon: Package, label: 'Placed' },
    preparing: { color: 'bg-blue-500/10 text-blue-400 border border-blue-500/30', icon: ChefHat, label: 'Preparing' },
    served: { color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30', icon: CheckCircle, label: 'Served' },
    cancelled: { color: 'bg-rose-500/10 text-rose-400 border border-rose-500/30', icon: Ban, label: 'Cancelled' },
    active: { color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30', icon: CheckCircle, label: 'Active' },
    payment_pending: { color: 'bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/30', icon: Clock, label: 'Payment Pending' },
    unpaid: { color: 'bg-zinc-800 text-zinc-300 border border-white/5', icon: CreditCard, label: 'Unpaid' },
    paid: { color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30', icon: CheckCircle, label: 'Paid' },
  }[status] || { color: 'bg-zinc-800 text-zinc-300 border border-white/5', icon: AlertCircle, label: status };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest ${config.color}`}>
      <Icon size={12} strokeWidth={2.5} />
      {config.label}
    </span>
  );
};

export default function SessionSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { session, isBannerDismissed } = useSession();
  const sessionId = params.sessionId as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingBill, setRequestingBill] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';

  useEffect(() => {
    fetchSessionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session data');
      }

      const data = await response.json();
      setSessionData(data.data);
    } catch (err) {
      setError('Failed to load session details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestBill = async () => {
    try {
      setRequestingBill(true);
      const response = await fetch(`${BACKEND_URL}/api/sessions/freeze-bill/${sessionId}`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'ALREADY_BILLED') {
          toast.error('Bill has already been generated', { position: 'bottom-center' });
        } else if (data.code === 'NO_ITEMS') {
          toast.error('No items ordered yet', { position: 'bottom-center' });
        } else {
          toast.error(data.message || 'Failed to generate bill', { position: 'bottom-center' });
        }
        return;
      }

      toast.success('Bill generated! Waiting for payment confirmation.', {
        position: 'bottom-center',
        duration: 4000,
      });

      fetchSessionData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to request bill', { position: 'bottom-center' });
    } finally {
      setRequestingBill(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050506] pb-safe">
        <div className="text-center flex flex-col items-center">
          <div className="relative w-16 h-16 flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-[#d5b263]/10 rounded-full animate-ping"></div>
            <Loader2 className="w-8 h-8 text-[#d5b263] animate-spin relative z-10" />
          </div>
          <p className="text-[15px] font-bold text-white tracking-tight">Loading Session Details</p>
          <p className="text-[13px] font-medium text-zinc-400 mt-1">Please wait a moment...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050506] p-4 pb-safe">
        <div className="bg-[#0c0c0e] rounded-[32px] border border-white/10 p-8 text-center max-w-sm w-full shadow-2xl">
          <div className="w-20 h-20 bg-rose-500/10 rounded-[20px] border border-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-[20px] font-black text-white tracking-tight mb-2">Failed to Load Session</h2>
          <p className="text-[14px] font-medium text-zinc-400 mb-8 leading-relaxed">{error}</p>
          <button
            onClick={() => router.back()}
            className="w-full py-4 bg-[#d5b263] text-black font-black text-[15px] rounded-full hover:bg-[#c4a152] transition-all uppercase tracking-wider"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { orders, session: sess } = sessionData;
  const { tableNumber, restaurantName, status, paymentStatus, billedAt, startedAt } = sess;
  const isBilled = billedAt !== null;
  const canOrder = status === 'active' && !isBilled;

  const runningTotal = orders.reduce((sum: number, order: Order) => sum + (order.grandTotal || 0), 0);
  const totalItems = orders.reduce((sum: number, order: Order) =>
    sum + order.items.reduce((itemSum: number, item: OrderItem) => itemSum + item.quantity, 0), 0
  );

  const isBannerVisible = session?.sessionId && paymentStatus !== 'paid' && !isBannerDismissed;
  const paddingValue = isBannerVisible ? 136 : 64;

  return (
    <div
      className="min-h-screen bg-[#050506] text-white flex flex-col pb-28 transition-all duration-300"
      style={{ paddingTop: `${paddingValue}px` }}
    >
      {/* Sticky Header */}
      <div
        className="bg-[#050506]/95 backdrop-blur-xl border-b border-white/5 sticky z-[40] transition-all duration-300"
        style={{ top: `${paddingValue}px` }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl border border-white/5 bg-[#0c0c0e]/80 flex items-center justify-center text-zinc-400 hover:text-white transition-all duration-300 active:scale-90"
              title="Go Back"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-[20px] font-black text-white leading-tight tracking-tight uppercase">Session Summary</h1>
              <p className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase mt-0.5">{restaurantName}</p>
            </div>
          </div>
          <div className="w-9 h-9 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/5 text-[#d5b263] shadow-md shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full pb-10">
        {/* Session Details Card */}
        <div className="mx-4 mt-5 bg-[#0c0c0e]/80 backdrop-blur-xl rounded-2xl border border-zinc-900/60 p-5 shadow-xl">
          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            <div>
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1">
                <Users size={11} strokeWidth={2.5} className="text-[#d5b263]" />
                <span>Table No.</span>
              </div>
              <p className="text-[20px] font-black text-white tracking-tight leading-none">{tableNumber || 'N/A'}</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1">
                <Clock size={11} strokeWidth={2.5} className="text-[#d5b263]" />
                <span>Started At</span>
              </div>
              <p className="text-[14px] font-black text-white tracking-tight leading-none mt-1">
                {new Date(startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1.5">
                <Package size={11} strokeWidth={2.5} className="text-[#d5b263]" />
                <span>Session Status</span>
              </div>
              <StatusBadge status={status} />
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-zinc-500 text-[9px] font-black uppercase tracking-widest mb-1.5">
                <CreditCard size={11} strokeWidth={2.5} className="text-[#d5b263]" />
                <span>Payment Status</span>
              </div>
              <StatusBadge status={paymentStatus} />
            </div>
          </div>

          {isBilled && sess.invoiceNumber && (
            <div className="mt-5 pt-4 border-t border-zinc-900/60 flex items-center justify-between">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Invoice Code</span>
              <span className="font-mono text-[12px] font-black tracking-widest text-[#d5b263] bg-[#d5b263]/10 px-3 py-1 rounded-lg border border-[#d5b263]/20">{sess.invoiceNumber}</span>
            </div>
          )}
        </div>

        {/* Status Messages */}
        <div className="px-4 mt-4 space-y-3">
          {isBilled && paymentStatus === 'payment_pending' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 shadow-sm animate-pulse">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-[13.5px] text-amber-300 uppercase tracking-wide">Waiting for Payment Confirmation</p>
                  <p className="text-[12px] font-bold text-amber-200/80 mt-1 leading-normal">
                    Your final bill has been generated. Please proceed to the counter or scan a QR code to process your payment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {canOrder && (
            <div className="bg-[#d5b263]/5 border border-[#d5b263]/15 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-[#d5b263] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-black text-[13.5px] text-[#d5b263] uppercase tracking-wide">Session Active</p>
                  <p className="text-[12px] font-bold text-zinc-400 mt-1 leading-normal">
                    You can continue adding items to this table session. Once done, request the bill.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section Title */}
        <div className="px-4 mt-6">
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Items Ordered</h2>
          <div className="w-full h-[1px] bg-zinc-900" />
        </div>

        {/* Orders List */}
        <div className="w-full mt-1.5 space-y-4">
          {orders.length === 0 ? (
            <div className="mx-4 bg-[#0c0c0e]/80 border border-zinc-900 rounded-2xl p-10 text-center shadow-lg">
              <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-850">
                <Package className="w-5 h-5 text-zinc-500" />
              </div>
              <p className="text-white font-black text-sm uppercase tracking-wide mb-1">No orders placed</p>
              <p className="text-xs text-zinc-400 font-bold">Start adding items from the digital menu.</p>
            </div>
          ) : (
            orders.map((order: Order, orderIdx: number) => (
              <div key={order.id || `order-${orderIdx}`} className="mx-4 bg-[#0c0c0e]/80 border border-zinc-900/60 rounded-2xl overflow-hidden shadow-lg">
                {/* Order Header */}
                <div className="bg-[#121215] px-4 py-3 border-b border-zinc-900/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-black text-white tracking-wide uppercase">Order #{orderIdx + 1}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Order Items */}
                <div className="px-4 py-1 divide-y divide-zinc-900/50">
                  {order.items.map((item: OrderItem, itemIdx: number) => (
                    <div key={item.id || `item-${itemIdx}`} className="flex items-start justify-between gap-3 py-3">
                      <div className="flex items-start gap-2.5 flex-1">
                        <div className="mt-1 shrink-0">
                          <VegIndicator isVeg={item.isVeg} />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-white text-[13.5px] tracking-tight leading-snug break-words">{item.menuItemName}</p>
                            <span className="bg-[#d5b263]/10 border border-[#d5b263]/25 text-[#d5b263] px-1.5 py-0.2 rounded-md font-black text-[10px] tracking-wide shrink-0 leading-none">
                              {item.quantity}x
                            </span>
                          </div>
                          {item.variantName && item.variantName !== "Default" && (
                            <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-zinc-400 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mt-1">
                              <span>{item.variantName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end justify-center">
                        <p className="text-[13px] font-black text-[#d5b263] tracking-tight">
                          ₹{(item.totalPrice / 100).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Total Footer */}
                <div className="bg-[#121215]/50 px-4 py-3 border-t border-zinc-900/60 flex justify-between items-center">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Subtotal</span>
                  <span className="font-black text-[14px] text-[#d5b263] tracking-tight">₹{(order.grandTotal / 100).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Summary Container */}
        <div className="px-4 mt-6">
          {isBilled ? (
            <div className="bg-[#0c0c0e] rounded-2xl border border-[#d5b263]/15 p-5 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#d5b263] to-amber-500"></div>
              <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Final Receipt</h2>

              <div className="space-y-3">
                {(() => {
                  const subtotal = sess.frozenSubtotal ?? sess.calculatedSubtotal ?? 0;
                  const gst = sess.frozenGstAmount ?? sess.calculatedGst ?? 0;
                  const grandTotal = sess.finalBillAmount ?? sess.calculatedGrandTotal ?? 0;
                  const discount = Math.max(0, subtotal + gst - grandTotal);

                  return (
                    <>
                      <div className="flex justify-between text-[13.5px]">
                        <span className="text-zinc-400 font-bold tracking-tight">Items Subtotal</span>
                        <span className="font-black text-white">
                          ₹{(subtotal / 100).toFixed(2)}
                        </span>
                      </div>

                      {discount > 0 && (
                        <div className="flex justify-between text-[13.5px]">
                          <span className="text-emerald-400 font-bold tracking-tight">Discount Applied</span>
                          <span className="font-black text-emerald-400">
                            -₹{(discount / 100).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-[13.5px]">
                        <span className="text-zinc-400 font-bold tracking-tight">GST & Service Tax</span>
                        <span className="font-black text-white">
                          ₹{(gst / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-zinc-800 pt-4 mt-4">
                        <div className="flex justify-between items-end">
                          <span className="text-[12px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total Amount</span>
                          <span className="text-[28px] font-black text-[#d5b263] tracking-tighter leading-none">
                            ₹{(grandTotal / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="bg-[#0c0c0e] rounded-2xl border border-zinc-900/60 p-5 flex justify-between items-center shadow-lg">
              <div>
                <h2 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Running Summary</h2>
                <p className="text-[15px] font-black text-white tracking-tight">{totalItems} items</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">Across {orders.length} order(s)</p>
              </div>
              <div className="text-right">
                <p className="text-[24px] font-black text-[#d5b263] tracking-tighter">₹{(runningTotal / 100).toFixed(2)}</p>
                <p className="text-[9px] font-black text-zinc-500 mt-0.5 uppercase tracking-widest">plus taxes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Actions Bar */}
      {canOrder && (
        <div className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto shadow-2xl rounded-[22px] p-1.5 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10 flex gap-3">
            <button
              onClick={() => router.push(`/restro/${session?.restaurantId}/menu?session=${sessionId}`)}
              className="flex-1 bg-[#16161a] border border-[#d5b263]/30 text-[#d5b263] font-black text-[13.5px] py-3.5 rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider hover:bg-[#1e1e22]"
            >
              <Package size={16} strokeWidth={2.5} />
              Add Items
            </button>
            <button
              onClick={handleRequestBill}
              disabled={requestingBill || orders.length === 0}
              className="flex-[1.5] bg-[#d5b263] hover:bg-[#c4a152] text-black font-black text-[13.5px] py-3.5 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 disabled:bg-[#1a1a1f] disabled:text-zinc-500 disabled:opacity-70 disabled:shadow-none flex items-center justify-center gap-1.5 uppercase tracking-wider"
            >
              {requestingBill ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Receipt size={16} strokeWidth={2.5} />
                  Request Bill
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .safe-pb {
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
