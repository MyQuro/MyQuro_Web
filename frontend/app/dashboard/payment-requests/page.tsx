"use client";

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  RefreshCw,
  DollarSign,
  Loader2
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getRelativeTime, formatPrice } from '@/lib/utils';
import { useWebSocket } from '@/lib/websocket-context';
import toast from 'react-hot-toast';

interface PaymentRequest {
  sessionId: string;
  tableNumber: number;
  restaurantName: string;
  status: 'active' | 'payment_pending' | 'closed';
  paymentStatus: 'unpaid' | 'paid';
  billedAt: string | null;
  calculatedGrandTotal: number;
  totalOrders: number;
  totalItems: number;
  startedAt: string;
}

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'online', label: 'Online Payment' },
];

export default function PaymentRequestsPage() {
  const { user, restaurant, isLoading: dashboardLoading } = useDashboard();
  const { socket, isConnected } = useWebSocket();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingSession, setProcessingSession] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string>('upi');
  const [sessions, setSessions] = useState<PaymentRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('pending');
  const [selectedSession, setSelectedSession] = useState<PaymentRequest | null>(null);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (restaurant) {
      loadSessions();
    }
  }, [restaurant]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!restaurant || !socket || !isConnected) return;

    // Join restaurant room
    socket.emit('join-restaurant', restaurant.id);

    const handlePaymentRecorded = (data: any) => {
      console.log('💰 PAYMENT RECORDED (PAYMENT REQUESTS):', data);
      if (data.restaurantId === restaurant.id) {
        toast.success(`Payment confirmed for Table ${data.tableNumber || 'N/A'}!`);
        loadSessions(false); // Refresh to show updated payment status
      }
    };

    const handleOrderCreated = (data: any) => {
      console.log('🆕 ORDER CREATED (PAYMENT REQUESTS):', data);
      if (data.restaurantId === restaurant.id) {
        // New orders might affect payment requests
        setTimeout(() => loadSessions(false), 1000);
      }
    };

    const handleBillingUpdated = (data: any) => {
      console.log('🧾 BILLING UPDATED (PAYMENT REQUESTS):', data);
      if (data.restaurantId === restaurant.id) {
        loadSessions(false);
      }
    };

    socket.on('payment-recorded', handlePaymentRecorded);
    socket.on('order-created', handleOrderCreated);
    socket.on('billing:updated', handleBillingUpdated);

    return () => {
      socket.off('payment-recorded', handlePaymentRecorded);
      socket.off('order-created', handleOrderCreated);
      socket.off('billing:updated', handleBillingUpdated);
    };
  }, [restaurant]);

  if (dashboardLoading || !user || !restaurant) {
    return <SkeletonLoader />;
  }

  const loadSessions = async (showLoading = true) => {
    if (!restaurant) return;
    try {
      if (showLoading) setLoading(true);
      const data: any = await apiClient.getRestaurantOrders(restaurant.id);

      // Group orders by session and calculate totals
      const sessionMap = new Map<string, PaymentRequest>();

      (data.orders || []).forEach((order: any) => {
        if (!order.tableSessionId) return;

        const sessionId = order.tableSessionId;
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            sessionId: sessionId,
            tableNumber: order.tableNumber || 0,
            restaurantName: restaurant.restaurantName || '',
            status: order.sessionStatus || 'active',
            paymentStatus: order.paymentStatus || 'unpaid',
            billedAt: order.billedAt || null,
            calculatedGrandTotal: 0,
            totalOrders: 0,
            totalItems: 0,
            startedAt: order.createdAt,
          });
        }

        const session = sessionMap.get(sessionId)!;
        session.totalOrders += 1;
        session.totalItems += order.items?.length || 0;
        session.calculatedGrandTotal += order.totalPrice || 0;
      });

      const sessionsArray = Array.from(sessionMap.values())
        .filter(s => s.billedAt || s.status === 'payment_pending') // Only show billed sessions
        .sort((a, b) => {
          // Unpaid first, then by time
          if (a.paymentStatus === 'unpaid' && b.paymentStatus !== 'unpaid') return -1;
          if (a.paymentStatus !== 'unpaid' && b.paymentStatus === 'unpaid') return 1;
          return new Date(b.billedAt || b.startedAt).getTime() - new Date(a.billedAt || a.startedAt).getTime();
        });

      setSessions(sessionsArray);
    } catch (error) {
      console.error('Error loading payment requests:', error);
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (restaurant) {
      loadSessions();
      const interval = setInterval(() => loadSessions(false), 15000); // Refresh every 15s
      return () => clearInterval(interval);
    }
  }, [restaurant]);

  const handleMarkAsPaid = async () => {
    if (!selectedSession || !restaurant) return;

    setProcessing(true);
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      const response = await fetch(`${BACKEND_URL}/api/sessions/${selectedSession.sessionId}/mark-paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          paymentMethod: paymentMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as paid');
      }

      toast.success(`Payment confirmed for Table ${selectedSession.tableNumber}!`);
      setSelectedSession(null);
      loadSessions(false);
    } catch (error) {
      console.error('Error marking payment:', error);
      toast.error('Failed to confirm payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSessions(false);
  };

  const filteredSessions = filter === 'all'
    ? sessions
    : sessions.filter(s => filter === 'pending' ? s.paymentStatus === 'unpaid' : s.paymentStatus === 'paid');

  const pendingCount = sessions.filter(s => s.paymentStatus === 'unpaid').length;
  const paidCount = sessions.filter(s => s.paymentStatus === 'paid').length;
  const totalRevenue = sessions
    .filter(s => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.calculatedGrandTotal, 0);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-[#D32F2F] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading payment requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <CreditCard className="w-10 h-10 text-blue-600" />
              Payment Requests
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-2">
              {pendingCount} Pending • {paidCount} Completed Today
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh payment requests"
            className={`p-3 bg-white border border-gray-200 rounded-xl shadow-sm transition-colors ${refreshing ? 'opacity-60 cursor-wait bg-gray-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-gray-100/60 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Pending Payments</p>
                <div className="text-4xl font-black text-gray-900 tracking-tight">{pendingCount}</div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200 text-white">
                <AlertCircle className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100/60 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Completed Today</p>
                <div className="text-4xl font-black text-gray-900 tracking-tight">{paidCount}</div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 text-white">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100/60 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Total Revenue</p>
                <div className="text-4xl font-black text-gray-900 tracking-tight">{formatPrice(totalRevenue)}</div>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 text-white">
                <DollarSign className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm max-w-lg">
          <button
            onClick={() => setFilter('pending')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all ${filter === 'pending' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all ${filter === 'paid' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            Paid ({paidCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
          >
            All ({sessions.length})
          </button>
        </div>
      </header>

      {/* Payment Requests List */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center max-w-2xl mx-auto mt-12">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <Receipt className="w-12 h-12 text-gray-300" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">No Payment Requests</h3>
          <p className="text-gray-500 font-medium">
            {filter === 'pending' ? 'All caught up! No pending payments at the moment.' : 'No payment requests found for this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSessions.map((session) => (
            <div
              key={session.sessionId}
              className={`bg-white rounded-3xl border-2 overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${session.paymentStatus === 'unpaid'
                  ? 'border-orange-200 shadow-orange-100/50'
                  : 'border-transparent shadow-gray-200/50'
                }`}
            >
              {/* Card Header */}
              <div className={`p-5 ${session.paymentStatus === 'unpaid'
                  ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                  : 'bg-gradient-to-br from-green-500 to-green-600'
                } text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-5xl font-black tracking-tighter drop-shadow-sm leading-none">T{session.tableNumber}</div>
                    <div className={`p-2.5 rounded-2xl backdrop-blur-md shadow-sm ${session.paymentStatus === 'unpaid' ? 'bg-white/20' : 'bg-white/20'
                      }`}>
                      {session.paymentStatus === 'unpaid' ? (
                        <AlertCircle className="w-6 h-6 text-white" />
                      ) : (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-bold bg-black/10 inline-flex px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    <Clock className="w-4 h-4" />
                    {session.billedAt ? getRelativeTime(session.billedAt) : getRelativeTime(session.startedAt)}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-5">
                {/* Session Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <div className="text-2xl font-black text-gray-900 tracking-tight">{session.totalOrders}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Orders</div>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <div className="text-2xl font-black text-gray-900 tracking-tight">{session.totalItems}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">Items</div>
                  </div>
                </div>

                {/* Total Amount */}
                <div className="bg-gray-900 rounded-2xl p-5 text-center shadow-lg shadow-gray-900/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -mr-8 -mt-8"></div>
                  <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Due</div>
                    <div className="text-3xl font-black text-white tracking-tight">
                      {formatPrice(session.calculatedGrandTotal)}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                {session.paymentStatus === 'paid' && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-black text-green-700 tracking-tight">Payment Complete</p>
                  </div>
                )}

                {/* Action Button */}
                {session.paymentStatus === 'unpaid' && (
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black py-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    Proceed to Pay
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black tracking-tight mb-1">Record Payment</h2>
                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm text-sm font-bold">
                  Table {selectedSession.tableNumber}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Amount */}
              <div className="text-center py-4 border-b border-gray-100">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Due</div>
                <div className="text-5xl font-black text-gray-900 tracking-tighter">
                  {formatPrice(selectedSession.calculatedGrandTotal)}
                </div>
              </div>

              {/* Payment Mode Dropdown */}
              <div>
                <label htmlFor="payment-mode-select" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Confirm Payment Mode
                </label>
                <div className="relative">
                  <select
                    id="payment-mode-select"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none outline-none shadow-sm cursor-pointer"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                </div>
              </div>

              {/* Session Details */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Orders Count</span>
                  <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">{selectedSession.totalOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Total Items</span>
                  <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">{selectedSession.totalItems}</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-gray-500 font-medium">Duration</span>
                  <span className="font-bold text-gray-900">{getRelativeTime(selectedSession.startedAt)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSelectedSession(null)}
                disabled={processing}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={processing}
                className="flex-[2] py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Mark as Paid
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Payment Requests...</p>
    </div>
  )
}
