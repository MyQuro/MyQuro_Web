"use client";

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { Users, DollarSign, Clock, CheckCircle, XCircle, CreditCard, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatPrice, getRelativeTime } from '@/lib/utils';
import { useWebSocket } from '@/lib/websocket-context';
import toast from 'react-hot-toast';

interface SessionOrder {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  itemCount: number;
}

interface ActiveSession {
  sessionId: string;
  tableNumber: number;
  createdAt: string;
  billedAt?: string | null;
  totalAmount: number;
  orders: SessionOrder[];
}

// Helper: Calculate session duration
const getSessionDuration = (startTime: string): string => {
  const minutes = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${minutes}m`;
};

export default function SessionsPage() {
  const { user, restaurant, isLoading: dashboardLoading } = useDashboard();
  const { socket, isConnected, joinRestaurant } = useWebSocket();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  const loadSessions = async () => {
    if (!restaurant) return;
    try {
      setLoading(true);
      const data: any = await apiClient.getActiveSessions(restaurant.id);
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant) {
      loadSessions();
      const interval = setInterval(loadSessions, 60000); // Refresh every 60s as fallback (WebSocket handles real-time)
      return () => clearInterval(interval);
    }
  }, [restaurant]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!restaurant || !socket || !isConnected) return;

    console.log('🔌 Setting up WebSocket for sessions');

    // Join restaurant room for real-time updates
    joinRestaurant(restaurant.id);

    const handlePaymentRecorded = (data: any) => {
      console.log('💰 PAYMENT RECORDED:', data);
      if (data.restaurantId === restaurant.id) {
        toast.success(`Payment completed for Table ${data.tableNumber}!`);
        loadSessions(); // Refresh sessions to show updated status
      }
    };

    const handleOrderCreated = (data: any) => {
      console.log('🆕 ORDER CREATED (SESSIONS):', data);
      if (data.restaurantId === restaurant.id) {
        // Could update session totals here if needed
        // For now, just refresh to show updated order counts
        setTimeout(() => loadSessions(), 1000);
      }
    };

    socket.on('payment-recorded', handlePaymentRecorded);
    socket.on('order-created', handleOrderCreated);

    return () => {
      console.log('🧹 Cleaning up WebSocket listeners for sessions');
      socket.off('payment-recorded', handlePaymentRecorded);
      socket.off('order-created', handleOrderCreated);
    };
  }, [restaurant, socket, isConnected, joinRestaurant]);

  const handleMarkPaymentComplete = async (sessionId: string) => {
    if (!confirm('Confirm payment has been received?')) return;

    setProcessingPayment(sessionId);
    try {
      await apiClient.markPaymentComplete(sessionId);
      toast.success('Payment marked as complete!');
      loadSessions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const pendingSessions = sessions.filter(s => !s.billedAt);
  const billedSessions = sessions.filter(s => s.billedAt);

  if (dashboardLoading || !user || !restaurant) {
    return <SkeletonLoader />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d5b263] mx-auto mb-4"></div>
          <p className="text-zinc-500 font-medium">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-6 md:px-8 pt-6 pb-6 md:pb-8 mb-6 relative z-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#d5b263]/10 border border-[#d5b263]/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#d5b263]" strokeWidth={2.5} />
              </div>
              Active Sessions
            </h1>
            <p className="text-sm font-bold text-zinc-500 mt-2">
              <span className="text-white font-black">{pendingSessions.length}</span> Dining •{' '}
              <span className="text-[#d5b263] font-black">{billedSessions.length}</span> Awaiting Payment
            </p>
          </div>

          <button
            onClick={loadSessions}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-zinc-900/40 rounded-xl hover:bg-zinc-800 hover:text-white transition-all font-bold text-sm text-zinc-400 active:scale-95"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2.5} />
            Refresh
          </button>
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900/10 rounded-3xl border-2 border-dashed border-zinc-800/60">
          <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-850">
            <Users className="w-10 h-10 text-[#d5b263]" strokeWidth={2.5} />
          </div>
          <h3 className="text-xl font-black text-white mb-1 tracking-tight">No Active Sessions</h3>
          <p className="text-zinc-500 text-sm font-medium">All tables are currently available and waiting for guests.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Bills Section */}
          {billedSessions.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#d5b263]/10 rounded-xl border border-[#d5b263]/20">
                  <AlertTriangle className="w-5 h-5 text-[#d5b263]" strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">Awaiting Payment ({billedSessions.length})</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {billedSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="bg-[#0c0c0e] border border-[#d5b263]/20 rounded-3xl overflow-hidden transition-all duration-300 group flex flex-col hover:-translate-y-1"
                  >
                    {/* Session Header */}
                    <div className="bg-gradient-to-br from-[#d5b263]/10 to-[#d5b263]/5 p-6 border-b border-[#d5b263]/15">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-[10px] font-black uppercase text-[#d5b263] tracking-widest mb-1">Table</div>
                          <div className="text-4xl font-black text-white tracking-tight leading-none">#{session.tableNumber}</div>
                        </div>
                        <div className="bg-[#d5b263]/10 border border-[#d5b263]/20 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                          <DollarSign className="w-6 h-6 text-[#d5b263]" strokeWidth={2.5} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
                        <div className="flex items-center gap-1.5 bg-zinc-950/40 px-2 py-1 rounded-lg border border-zinc-900/40">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          {getRelativeTime(session.createdAt)}
                        </div>
                        <div className="bg-[#d5b263]/10 text-[#d5b263] px-2 py-1 rounded-lg border border-[#d5b263]/20 font-black">
                          {getSessionDuration(session.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Session Details */}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="space-y-4 mb-6 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Orders</span>
                          <span className="text-lg font-black text-white bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-850">{session.orders.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Items</span>
                          <span className="text-lg font-black text-white bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-850">
                            {session.orders.reduce((sum, o) => sum + o.itemCount, 0)}
                          </span>
                        </div>

                        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-4"></div>

                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#d5b263]" /> Total Billed
                          </span>
                        </div>
                        <div className="text-3xl font-black text-[#d5b263] tracking-tight">
                          {formatPrice(session.totalAmount)}
                        </div>

                        {session.billedAt && (
                          <div className="mt-4 text-[11px] font-bold text-[#d5b263] bg-[#d5b263]/10 rounded-xl p-2.5 border border-[#d5b263]/20 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 opacity-70" />
                            Bill Generated: {getRelativeTime(session.billedAt)}
                          </div>
                        )}
                      </div>

                      {/* Payment Button */}
                      <button
                        onClick={() => handleMarkPaymentComplete(session.sessionId)}
                        disabled={processingPayment === session.sessionId}
                        className="w-full bg-gradient-to-r from-[#d5b263] to-[#bfa052] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest active:scale-95 group/btn"
                      >
                        {processingPayment === session.sessionId ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin opacity-70" strokeWidth={2.5} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 group-hover/btn:scale-110 transition-transform" strokeWidth={2.5} />
                            Confirm Payment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active Sessions Section */}
          {pendingSessions.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-850">
                  <Users className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">Dining Now ({pendingSessions.length})</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pendingSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="bg-[#0c0c0e] border border-zinc-900/40 rounded-3xl overflow-hidden transition-all duration-300 group flex flex-col hover:-translate-y-1"
                  >
                    {/* Session Header */}
                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 border-b border-zinc-900/40">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1">Table</div>
                          <div className="text-4xl font-black text-white tracking-tight leading-none">#{session.tableNumber}</div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-850 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                          <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
                        <div className="flex items-center gap-1.5 bg-zinc-950/40 px-2 py-1 rounded-lg border border-zinc-900/40">
                          <Clock className="w-3.5 h-3.5 text-zinc-600" />
                          {getRelativeTime(session.createdAt)}
                        </div>
                        <div className="bg-zinc-900 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-850">
                          {getSessionDuration(session.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Session Details */}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="space-y-4 mb-6 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Orders</span>
                          <span className="text-lg font-black text-white bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-850">{session.orders.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Items</span>
                          <span className="text-lg font-black text-white bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-850">
                            {session.orders.reduce((sum, o) => sum + o.itemCount, 0)}
                          </span>
                        </div>

                        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-4"></div>

                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Running Total</span>
                          <span className="text-2xl font-black text-white tracking-tight">
                            {formatPrice(session.totalAmount)}
                          </span>
                        </div>

                        {/* Order Status Pills */}
                        {session.orders.length > 0 && (
                          <div className="pt-2">
                            <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2 border-t border-zinc-900/40 pt-4">Order Statuses:</div>
                            <div className="flex flex-wrap gap-1.5">
                              {session.orders.map((order) => (
                                <div
                                  key={order.orderId}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                    order.status === 'placed' ? 'bg-[#d5b263]/10 text-[#d5b263] border-[#d5b263]/25' :
                                    order.status === 'preparing' ? 'bg-zinc-900 text-zinc-400 border-zinc-850' :
                                    order.status === 'served' ? 'bg-zinc-900/50 text-zinc-500 border-zinc-900' :
                                    'bg-zinc-900/30 text-zinc-600 border-zinc-900'
                                  }`}
                                >
                                  {order.status}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-2xl bg-zinc-900 animate-pulse"></div>
        <div className="absolute inset-0 border-[3px] border-[#d5b263]/20 rounded-2xl"></div>
        <div className="absolute inset-0 border-[3px] border-[#d5b263] border-t-transparent rounded-2xl animate-spin"></div>
      </div>
      <p className="text-sm font-black text-zinc-500 uppercase tracking-widest animate-pulse">Loading Sessions</p>
    </div>
  )
}
