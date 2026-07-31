"use client";

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/session-context';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Clock,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  ChefHat,
  Package,
  CreditCard,
  RefreshCw,
  Home
} from 'lucide-react';
import { formatPrice, getRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';

interface OrderItem {
  orderItemId: string;
  menuItemName: string;
  itemName: string;
  variantName: string;
  portionSize?: string;
  isVeg?: boolean;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
  extras?: Array<{
    extraId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface Order {
  orderId: string;
  orderStatus: string;
  createdAt: string;
  items: OrderItem[];
  subtotal: number;
}

interface SessionDetails {
  session: {
    sessionId: string;
    tableNumber: number;
    restaurantName: string;
    status: 'active' | 'payment_pending' | 'closed';
    paymentStatus: 'unpaid' | 'paid';
    startedAt: string;
    billedAt?: string | null;
    calculatedSubtotal: number;
    calculatedExtrasTotal?: number;
    calculatedBaseSubtotal?: number;
    calculatedDiscount: number;
    calculatedGst: number;
    calculatedGrandTotal: number;
    frozenSubtotal?: number | null;
    frozenExtrasTotal?: number | null;
    frozenGstRate?: number | null;
    frozenGstAmount?: number | null;
    frozenDiscountAmount?: number | null;
    finalBillAmount?: number | null;
    grandTotal?: number | null;
  };
  orders: Order[];
  appliedOffers?: Array<{
    id: string;
    discountType: string;
    discountName: string;
    discountValue: number;
    discountSourceId?: string;
  }>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'placed': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'preparing': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'served': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'cancelled': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    default: return 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'placed': return <Clock className="w-4 h-4 text-amber-400" />;
    case 'preparing': return <ChefHat className="w-4 h-4 text-blue-400" />;
    case 'served': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'cancelled': return <AlertCircle className="w-4 h-4 text-rose-400" />;
    default: return <Package className="w-4 h-4 text-zinc-400" />;
  }
};

interface RestaurantDetails {
  id: string;
  restaurantName: string;
  defaultGstPercentage?: string | null;
}

export default function MySessionPage() {
  const { session, isBannerDismissed } = useSession();
  const router = useRouter();
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showBillConfirmation, setShowBillConfirmation] = useState(false);
  const [requestingBill, setRequestingBill] = useState(false);

  useEffect(() => {
    if (!session?.sessionId) {
      setError('No active session found');
      setLoading(false);
      return;
    }

    loadSessionDetails();

    const interval = setInterval(() => loadSessionDetails(false), 15000);
    return () => clearInterval(interval);
  }, [session?.sessionId]);

  useEffect(() => {
    if (session?.restaurantId) {
      fetchRestaurantDetails();
    }
  }, [session?.restaurantId]);

  const fetchRestaurantDetails = async () => {
    if (!session?.restaurantId) return;

    try {
      const data: any = await apiClient.getRestaurant(session.restaurantId);
      setRestaurant(data.restaurant || data);
    } catch (error) {
      console.error('Failed to fetch restaurant details:', error);
    }
  };

  const loadSessionDetails = async (showLoading = true) => {
    if (!session?.sessionId) return;

    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);

      const data: any = await apiClient.getTableSession(session.sessionId);

      if (data.success) {
        setSessionDetails(data.data as any);
        setError('');
      } else {
        throw new Error('Failed to load session');
      }
    } catch (error: any) {
      console.error('Error loading session:', error);
      setError(error.message || 'Failed to load session');
      toast.error('Failed to sync session');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRequestBill = async () => {
    if (!session?.sessionId) return;

    setRequestingBill(true);

    try {
      await apiClient.freezeBill(session.sessionId);

      toast.success('Bill requested! Staff will bring it shortly.', {
        duration: 4000,
      });
      setShowBillConfirmation(false);
      loadSessionDetails(false);
    } catch (error: any) {
      console.error('Error requesting bill:', error);
      toast.error(error.message || 'Failed to request bill. Please try again.');
    } finally {
      setRequestingBill(false);
    }
  };

  const handleBackToMenu = () => {
    if (!session?.restaurantId) return;

    if (sessionDetails?.session.billedAt) {
      toast.error('Cannot add more items. Bill has been requested.', {
        duration: 4000,
      });
      return;
    }

    router.push(`/restro/${session.restaurantId}/menu?session=${session.sessionId}`);
  };

  const handleGoHome = () => {
    router.push('/home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050506] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#d5b263] animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 font-bold">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionDetails) {
    return (
      <div className="min-h-screen bg-[#050506] flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-[#0c0c0e] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <AlertCircle className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">No Active Session</h2>
          <p className="text-zinc-400 mb-6">{error || 'You don\'t have an active dining session.'}</p>
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-[#d5b263] text-black rounded-xl font-black hover:bg-[#c4a152] transition-colors inline-flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const { session: sess, orders } = sessionDetails;
  const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
  const isPaid = sess.paymentStatus === 'paid';
  const isBilled = !!sess.billedAt;

  const isBannerVisible = session?.sessionId && sess.paymentStatus !== 'paid' && !isBannerDismissed;
  const paddingValue = isBannerVisible ? 136 : 64;

  return (
    <div
      className="min-h-screen bg-[#050506] text-white flex flex-col pb-28 transition-all duration-300"
      style={{ paddingTop: `${paddingValue}px` }}
    >
      {/* Header */}
      <header
        className="bg-[#050506]/95 backdrop-blur-xl border-b border-white/5 sticky z-[40] shadow-md transition-all duration-300"
        style={{ top: `${paddingValue}px` }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleGoHome}
                className="w-9 h-9 rounded-xl border border-white/5 bg-[#0c0c0e]/80 flex items-center justify-center text-zinc-400 hover:text-white transition-all duration-300 active:scale-90"
                title="Home"
              >
                <Home size={16} strokeWidth={2.5} />
              </button>
              <div>
                <h1 className="text-[20px] font-black text-white leading-tight uppercase tracking-tight">Active Session</h1>
                <p className="text-[11px] font-bold text-zinc-450 tracking-wider uppercase mt-0.5">{sess.restaurantName}</p>
              </div>
            </div>
            <button
              onClick={() => loadSessionDetails(false)}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl border border-white/5 bg-[#0c0c0e]/80 flex items-center justify-center text-zinc-400 hover:text-white transition-all duration-300 active:scale-90"
              title="Sync Session"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#d5b263]' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm overflow-x-auto scrollbar-hide pb-1 -mb-1">
            <div className="flex items-center gap-1.5 bg-[#d5b263]/10 border border-[#d5b263]/25 text-[#d5b263] px-3.5 py-1.5 rounded-xl font-black text-[10px] tracking-wider uppercase shadow-inner whitespace-nowrap">
              <MapPin className="w-3.5 h-3.5 text-[#d5b263]" />
              <span>Table {sess.tableNumber}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#d5b263]/10 border border-[#d5b263]/25 text-[#d5b263] px-3.5 py-1.5 rounded-xl font-bold text-[10px] tracking-wider uppercase whitespace-nowrap">
              <Clock className="w-3.5 h-3.5  text-[#d5b263]" />
              <span>{getRelativeTime(sess.startedAt)}</span>
            </div>
            {isPaid ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3.5 py-1.5 rounded-xl font-black text-[10px] tracking-wider uppercase border border-emerald-500/30 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Paid</span>
              </div>
            ) : isBilled ? (
              <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3.5 py-1.5 rounded-xl font-black text-[10px] tracking-wider uppercase border border-amber-500/30 whitespace-nowrap">
                <Receipt className="w-3.5 h-3.5" />
                <span>Billed</span>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-12 w-full">
        {/* Orders Section */}
        <section>
          <div className="px-1 mb-4 flex items-center justify-between">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5 text-[#d5b263]" />
              Table Orders ({orders.length})
            </h2>
            <div className="flex-1 h-[1px] bg-zinc-900 ml-4" />
          </div>

          {orders.length === 0 ? (
            <div className="bg-[#0c0c0e]/80 rounded-2xl border border-zinc-900 p-12 text-center shadow-lg">
              <Package className="w-12 h-12 text-zinc-650 mx-auto mb-4" />
              <p className="text-white font-black text-sm uppercase tracking-wide mb-1">No orders placed yet</p>
              <p className="text-xs text-zinc-400 font-bold mb-4">You have an active session but haven't sent any food to the kitchen yet.</p>
              <button
                onClick={handleBackToMenu}
                className="px-6 py-3 bg-[#d5b263] text-black rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#c4a152] transition-colors shadow-lg active:scale-95"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, orderIdx) => (
                <div key={order.orderId} className="bg-[#0c0c0e]/80 rounded-2xl border border-zinc-900/60 overflow-hidden shadow-xl animate-in fade-in duration-300">
                  {/* Order Header */}
                  <div className="p-4 border-b border-zinc-900/80 flex items-center justify-between bg-[#121215]/50">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-black text-white uppercase tracking-wide">Order #{orderIdx + 1}</span>
                      <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(order.orderStatus)} flex items-center gap-1`}>
                        {getStatusIcon(order.orderStatus)}
                        {order.orderStatus}
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{getRelativeTime(order.createdAt)}</span>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 divide-y divide-zinc-900/50">
                    {order.items.map((item) => (
                      <div key={item.orderItemId} className="flex items-start justify-between gap-3 py-3.5 first:pt-1 last:pb-1">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {item.isVeg !== undefined && (
                            <div className="mt-1 shrink-0">
                              <div className={`w-3.5 h-3.5 border-[1.5px] flex items-center justify-center rounded bg-black ${item.isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              </div>
                            </div>
                          )}
                           <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-white leading-tight text-[14px] mb-0.5">{item.menuItemName || item.itemName}</h4>
                              <span className="bg-[#d5b263]/10 border border-[#d5b263]/25 text-[#d5b263] px-1.5 py-0.2 rounded-md font-black text-[10px] tracking-wide shrink-0 leading-none">
                                {item.quantity}x
                              </span>
                            </div>
                            
                            {(item.variantName || item.portionSize) && (
                              <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-zinc-400 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mt-1">
                                <span>{item.variantName || 'Regular'}</span>
                                {item.portionSize && (
                                  <>
                                    <span className="opacity-40">•</span>
                                    <span className="text-zinc-500">{item.portionSize}</span>
                                  </>
                                )}
                              </div>
                            )}
                            {item.extras && item.extras.length > 0 && (
                              <div className="mt-2.5 space-y-1.5 bg-[#16161a]/60 rounded-xl p-3 border border-white/5">
                                {item.extras.map((extra: any) => (
                                  <div key={`${item.orderItemId}-${extra.extraId}`} className="flex justify-between items-center text-[10px] text-zinc-400">
                                    <span className="font-medium text-zinc-350">+ {extra.name}</span>
                                    <span className="text-zinc-500 flex items-center gap-1.5 font-bold">
                                      <span>×{extra.quantity}</span>
                                      <span className="font-black text-[#d5b263]">{formatPrice(extra.totalPrice)}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {item.notes && (
                              <p className="text-xs font-bold text-amber-300/90 mt-2 bg-amber-500/5 rounded-lg p-2 leading-relaxed border border-amber-500/15">
                                Note: {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end justify-center">
                          <div className="text-[14px] font-black text-[#d5b263]">{formatPrice(item.totalPrice)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Total Footer */}
                  <div className="bg-[#121215]/30 px-4 py-3.5 border-t border-zinc-900/60 flex justify-between items-center">
                    <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest">Order Subtotal</span>
                    <span className="font-black text-[14px] text-[#d5b263] tracking-tight">{formatPrice(order.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bill Summary */}
        {orders.length > 0 && (
          <section>
            <div className="px-1 mb-4 flex items-center justify-between">
              <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-[#d5b263]" />
                Summary Stats & Breakdown
              </h2>
              <div className="flex-1 h-[1px] bg-zinc-900 ml-4" />
            </div>

            <div className="bg-[#0c0c0e]/80 rounded-2xl border border-zinc-900/60 overflow-hidden shadow-2xl p-5 space-y-5">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 pb-5 border-b border-zinc-900/60">
                <div className="bg-[#121215]/50 border border-zinc-900 rounded-xl p-3 text-center">
                  <div className="text-2xl font-black text-white">{orders.length}</div>
                  <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Orders</div>
                </div>
                <div className="bg-[#121215]/50 border border-zinc-900 rounded-xl p-3 text-center">
                  <div className="text-2xl font-black text-white">{totalItems}</div>
                  <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-1">Items</div>
                </div>
              </div>

              {/* Bill Breakdown */}
              <div className="space-y-2.5 px-1">
                {(() => {
                  const subtotal = sess.frozenSubtotal ?? sess.calculatedSubtotal ?? 0;
                  const gst = sess.frozenGstAmount ?? sess.calculatedGst ?? 0;
                  const grandTotal = sess.finalBillAmount ?? sess.calculatedGrandTotal ?? 0;
                  const effectiveDiscount = Math.max(0, subtotal + gst - grandTotal);

                  return (
                    <>
                      <div className="flex justify-between items-center text-[13px] text-zinc-400">
                        <span className="font-bold">Items Subtotal</span>
                        <span className="font-black text-white">{formatPrice(sess.frozenSubtotal ?? sess.calculatedBaseSubtotal ?? sess.calculatedSubtotal)}</span>
                      </div>

                      {(sess.frozenExtrasTotal || sess.calculatedExtrasTotal) ? (
                        <div className="flex justify-between items-center text-[13px] text-zinc-400">
                          <span className="font-bold">Add-on Extras</span>
                          <span className="font-black text-white">{formatPrice(sess.frozenExtrasTotal ?? sess.calculatedExtrasTotal ?? 0)}</span>
                        </div>
                      ) : null}

                      <div className="flex justify-between items-center text-[13px] text-zinc-400">
                        <span className="font-bold">GST & Services {sess.frozenGstRate ? `(${sess.frozenGstRate}%)` : ''}</span>
                        <span className="font-black text-white">{formatPrice(gst)}</span>
                      </div>

                      {effectiveDiscount > 0 && (
                        <div className="flex justify-between items-center text-[13px] text-emerald-400">
                          <div>
                            <span className="font-bold">Offers Discount</span>
                            {sessionDetails?.appliedOffers && sessionDetails.appliedOffers.length > 0 && (
                              <div className="text-[10px] text-emerald-400/90 mt-0.5">
                                {sessionDetails.appliedOffers.map(o => o.discountName).join(', ')}
                              </div>
                            )}
                          </div>
                          <span className="font-black">-{formatPrice(effectiveDiscount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-4 mt-2 border-t border-dashed border-zinc-800">
                        <span className="text-[14px] font-black text-white uppercase tracking-wider">Total Amount</span>
                        <span className="text-[26px] font-black tracking-tight text-[#d5b263]">{formatPrice(grandTotal)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Payment Status Blocks */}
              <div className="pt-1">
                {isPaid ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <p className="font-black text-emerald-450 text-[15px] uppercase tracking-wide leading-none">Payment Complete</p>
                    <p className="text-[11px] text-emerald-400/80 font-bold tracking-wider uppercase">Thank you for dining with us!</p>
                  </div>
                ) : isBilled ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center flex flex-col items-center justify-center gap-1.5 animate-pulse">
                    <CreditCard className="w-6 h-6 text-amber-400" />
                    <p className="font-black text-amber-400 text-[15px] uppercase tracking-wide leading-none">Bill Frozen & Generated</p>
                    <p className="text-[11px] text-amber-450 font-bold tracking-wider uppercase">Please proceed to payment counter</p>
                  </div>
                ) : (
                  <div className="bg-[#121215]/50 border border-zinc-900 rounded-xl p-3.5 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#d5b263] shrink-0" />
                    <p className="text-[11.5px] font-bold text-zinc-400 leading-snug">
                      Your final bill will be generated by the staff when you request checkout.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sticky Bottom actions Pill */}
      <div className="fixed bottom-6 left-0 right-0 px-4 z-[45] pointer-events-none">
        <div className="max-w-4xl mx-auto flex gap-3 pointer-events-auto shadow-2xl rounded-[22px] p-1.5 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/10">
          <button
            onClick={handleBackToMenu}
            disabled={isPaid || isBilled}
            className="flex-1 py-3.5 bg-[#16161a] text-[#d5b263] rounded-xl font-black hover:bg-[#1e1e22] transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-[#d5b263]/30 flex items-center justify-center gap-1.5 uppercase text-xs tracking-wider"
          >
            <Package className="w-4 h-4" strokeWidth={2.5} />
            {isPaid ? 'Session Closed' : isBilled ? 'Bill Requested' : 'Add Items'}
          </button>

          {!isPaid && !isBilled && orders.length > 0 && (
            <button
              onClick={() => setShowBillConfirmation(true)}
              className="flex-[1.5] py-3.5 bg-[#d5b263] text-black rounded-xl font-black hover:bg-[#c4a152] transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-1.5 uppercase text-xs tracking-wider shadow-[#d5b263]/10"
            >
              <Receipt className="w-4 h-4" strokeWidth={2.5} />
              Request Bill
            </button>
          )}
        </div>
      </div>

      {/* Bill Request Confirmation Modal */}
      {showBillConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowBillConfirmation(false)}
        >
          <div
            className="bg-[#0c0c0e]/95 backdrop-blur-2xl border border-zinc-800/80 rounded-t-[32px] sm:rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="pt-6 pb-3 flex flex-col items-center">
              <div className="w-12 h-12 bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-xl flex items-center justify-center mb-3 text-[#d5b263] shadow-inner">
                <Receipt className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Request Bill?</h2>
              <p className="text-zinc-400 text-center mt-2 px-8 font-bold text-xs leading-normal">
                Once requested, the kitchen session freezes and you won't be able to add more items.
              </p>
            </div>

            {/* Modal Body */}
            <div className="px-5 pb-5">
              <div className="bg-[#121215]/50 border border-zinc-900 rounded-xl p-4 space-y-2.5 text-xs">
                {(() => {
                  const gstPercentage = restaurant?.defaultGstPercentage ? Number.parseFloat(restaurant.defaultGstPercentage) : 18;
                  const subtotal = sess.calculatedSubtotal;
                  const discount = sess.calculatedDiscount;
                  const gstAmount = Math.round((subtotal * gstPercentage) / 100);
                  const grandTotal = Math.max(0, subtotal + gstAmount - discount);

                  return (
                    <>
                      <div className="flex justify-between items-center text-zinc-400 font-bold">
                        <span>Items Subtotal</span>
                        <span className="text-white font-black">{formatPrice(sess.calculatedBaseSubtotal ?? sess.calculatedSubtotal)}</span>
                      </div>
                      {(sess.calculatedExtrasTotal ?? 0) > 0 && (
                        <div className="flex justify-between items-center text-zinc-400 font-bold">
                          <span>Add-on Extras</span>
                          <span className="text-white font-black">{formatPrice(sess.calculatedExtrasTotal ?? 0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-zinc-400 font-bold">
                        <span>GST ({gstPercentage}%)</span>
                        <span className="text-white font-black">{formatPrice(gstAmount)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between items-center text-emerald-400 font-bold">
                          <div>
                            <span>Offers Discount</span>
                            {sessionDetails?.appliedOffers && sessionDetails.appliedOffers.length > 0 && (
                              <div className="text-[10px] text-emerald-400/90 mt-0.5">
                                {sessionDetails.appliedOffers.map(o => o.discountName).join(', ')}
                              </div>
                            )}
                          </div>
                          <span>-{formatPrice(discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-3 mt-1 border-t border-zinc-800">
                        <span className="text-white font-black text-[13px]">Grand Total</span>
                        <span className="font-black text-[#d5b263] text-base">{formatPrice(grandTotal)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#121215]/80 border-t border-zinc-900 flex flex-col gap-2">
              <button
                onClick={handleRequestBill}
                disabled={requestingBill}
                className="w-full py-3.5 bg-[#d5b263] hover:bg-[#c4a152] text-black rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-[#d5b263]/10"
              >
                {requestingBill ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    Processing...
                  </>
                ) : (
                  'Yes, Bring my bill'
                )}
              </button>
              <button
                onClick={() => setShowBillConfirmation(false)}
                disabled={requestingBill}
                className="w-full py-3.5 bg-transparent text-zinc-400 hover:text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                No, Keep ordering
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
