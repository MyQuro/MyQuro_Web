"use client";

import { useEffect, useState } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Calendar, DollarSign, TrendingUp,
  Clock, Users, ChevronRight, Store,
  RefreshCw, WifiIcon, ChefHat, Power, Plus, QrCode, CheckCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatPrice, formatDateTime, getRelativeTime, capitalize } from '@/lib/utils';
import toast from 'react-hot-toast';
import { DashboardHeader } from '@/components/DashboardHeader';
import { AuthGuard } from '@/components/AuthGuard';
import { motion } from 'framer-motion';

interface Stats {
  todayOrders: number;
  activeReservations: number;
  occupiedTables: number;
  todayRevenue: number;
  todayNetRevenue: number;
  todayDiscount: number;
  pendingOrders: number;
}

interface RecentOrder {
  id: string;
  sessionId: string;
  tableNumber: number;
  status: string;
  createdAt: string;
  totalAmount: number;
  itemCount: number;
}

interface UpcomingReservation {
  id: string;
  guestName: string;
  numberOfGuests: number;
  reservationTime: string;
  status: string;
}

export default function DashboardPage() {
  console.log('📊 [DASHBOARD PAGE] Component mounted');

  const { user, restaurant, isLoading: dashboardLoading } = useDashboard();
  const router = useRouter();

  console.log('📊 [DASHBOARD PAGE] Dashboard context:', { user, restaurant, dashboardLoading });

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<UpcomingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantOpen, setRestaurantOpen] = useState<boolean | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      setAcceptingInvite(true);
      const res = await apiClient.acceptCompanyInvite(inviteId) as any;
      toast.success(res.message || "Invitation accepted!");
      if (res.finalized) {
        // Reload dashboard to see new role/company status if applicable
        window.location.reload();
      } else {
        setPendingInvites(prev => prev.filter(inv => inv.inviteId !== inviteId));
      }
    } catch (error) {
      toast.error("Failed to accept invitation");
    } finally {
      setAcceptingInvite(false);
    }
  };

  const toggleRestaurantStatus = async () => {
    if (!restaurant || statusLoading) return;

    const newStatus = !restaurantOpen;
    setStatusLoading(true);

    // Optimistic update for immediate UI feedback
    setRestaurantOpen(newStatus);

    try {
      console.log('🔄 [DASHBOARD PAGE] Toggling restaurant status to:', newStatus);
      if (newStatus) {
        await apiClient.openRestaurant(restaurant.id);
      } else {
        await apiClient.closeRestaurant(restaurant.id);
      }
      toast.success(`Restaurant ${newStatus ? 'opened' : 'closed'} successfully`);
    } catch (error) {
      console.error('❌ [DASHBOARD PAGE] Failed to toggle restaurant status:', error);
      // Revert optimistic update on error
      setRestaurantOpen(!newStatus);
      toast.error('Failed to update restaurant status. Please try again.');
    } finally {
      setStatusLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const loadDashboardData = async () => {
    console.log('📊 [DASHBOARD PAGE] Loading dashboard data for restaurant:', restaurant?.id);

    if (!restaurant) {
      console.log('⚠️ [DASHBOARD PAGE] No restaurant available, skipping data load');
      return;
    }

    console.log('📊 [DASHBOARD PAGE] Starting data fetch...');
    setLoading(true);

    try {
      console.log('🌐 [DASHBOARD PAGE] Making API calls...');
      const [statsRes, ordersRes, reservationsRes, statusRes, sessionsRes, invitesRes] = await Promise.all([
        apiClient.getDashboardStats(restaurant.id).catch((err) => {
          console.error('❌ [DASHBOARD PAGE] Stats API failed:', err);
          return null;
        }),
        apiClient.getRestaurantOrders(restaurant.id).catch((err) => {
          console.error('❌ [DASHBOARD PAGE] Orders API failed:', err);
          return { orders: [] };
        }),
        apiClient.getRestaurantReservations(restaurant.id).catch((err) => {
          console.error('❌ [DASHBOARD PAGE] Reservations API failed:', err);
          return { reservations: [] };
        }),
        apiClient.getRestaurantStatus(restaurant.id).catch((err) => {
          console.error('❌ [DASHBOARD PAGE] Status API failed:', err);
          return null;
        }),
        apiClient.getPastSessions(restaurant.id).catch((err) => {
          console.error('❌ [DASHBOARD PAGE] Sessions API failed:', err);
          return { sessions: [] };
        }),
        apiClient.getRestaurantCompanyInvites(restaurant.id).catch((err) => {
          console.error('❌ [DASHBOARD PAGE] Company Invites API failed:', err);
          return { invites: [] };
        }),
      ]);

      setPendingInvites((invitesRes as any)?.invites || []);

      console.log('📊 [DASHBOARD PAGE] API responses received:', {
        statsRes,
        ordersCount: (ordersRes as any)?.orders?.length || 0,
        reservationsCount: (reservationsRes as any)?.reservations?.length || 0,
        sessionsCount: (sessionsRes as any)?.sessions?.length || 0,
        statusRes,
        invitesCount: (invitesRes as any)?.invites?.length || 0
      });

      const statsObj = statsRes as any || {};
      const allOrders = Array.isArray((ordersRes as any)?.orders) ? (ordersRes as any).orders : Array.isArray(ordersRes) ? ordersRes : [];
      const allSessions = Array.isArray((sessionsRes as any)?.sessions) ? (sessionsRes as any).sessions : Array.isArray(sessionsRes) ? sessionsRes : [];

      console.log('📊 [DASHBOARD PAGE] Processing orders and sessions data...');
      const todayOrdersCount = allOrders.filter((o: any) => {
        const d = new Date(o.createdAt);
        return d.toDateString() === new Date().toDateString();
      }).length;

      // Calculate revenue from today's sessions using finalAmount (after all discounts)
      const computedRevenue = allSessions
        .filter((s: any) => {
          const billedDate = s.billedAt ? new Date(s.billedAt) : null;
          return billedDate && billedDate.toDateString() === new Date().toDateString();
        })
        .reduce((sum: number, s: any) => sum + (Number(s.finalAmount) || 0), 0);

      const pendingOrdersCount = allOrders.filter((o: any) =>
        o.status === 'pending' || o.status === 'preparing'
      ).length;

      console.log('📊 [DASHBOARD PAGE] Computed stats:', {
        todayOrdersCount,
        computedRevenue,
        pendingOrdersCount,
        allOrdersCount: allOrders.length,
        allSessionsCount: allSessions.length
      });

      setStats({
        todayOrders: statsObj.todayOrders ?? todayOrdersCount,
        activeReservations: statsObj.activeReservations ?? 0,
        occupiedTables: statsObj.occupiedTables ?? 0,
        todayRevenue: statsObj.todayRevenue ?? computedRevenue,
        todayNetRevenue: statsObj.todayNetRevenue ?? computedRevenue,
        todayDiscount: statsObj.todayDiscount ?? 0,
        pendingOrders: pendingOrdersCount,
      });

      const todayOrders = allOrders.filter((o: any) => {
        const d = new Date(o.createdAt);
        return d.toDateString() === new Date().toDateString();
      });

      setRecentOrders(todayOrders.slice(0, 5));

      const allReservations = (Array.isArray((reservationsRes as any)?.reservations)
        ? (reservationsRes as any).reservations : Array.isArray(reservationsRes) ? reservationsRes : [])
        .filter((res: any) => new Date(res.reservationTime) > new Date());
      setUpcomingReservations(allReservations.slice(0, 5));

      if (statusRes && typeof (statusRes as any).isOpen === 'boolean') {
        setRestaurantOpen((statusRes as any).isOpen);
      } else if (restaurant.isOpen !== undefined) {
        setRestaurantOpen(restaurant.isOpen);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant && !dashboardLoading) {
      loadDashboardData();
    }
  }, [restaurant, dashboardLoading]);

  if (dashboardLoading || !user || !restaurant) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#08080a] text-white">
        <DashboardHeader
          title={`${getGreeting()}, ${user?.name?.split(' ')[0] || 'Chef'}!`}
          subtitle={`${restaurant.restaurantName} • ${formatDateTime(new Date())}`}
          onRefresh={loadDashboardData}
        />

        <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Group Invitation Banner */}
          {pendingInvites.length > 0 && (
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-3xl p-8 text-white shadow-xl shadow-red-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
                <Store size={160} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30">
                      Action Required
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-red-100">
                      <Clock size={12} />
                      Pending Request
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight underline decoration-white/30 underline-offset-4">
                    Join "{pendingInvites[0].companyName}" Group?
                  </h2>
                  <p className="text-red-50 font-medium max-w-xl">
                    You've been invited to group your restaurant under a single brand management.
                    This will allow shared analytics and easier multi-outlet management.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAcceptInvite(pendingInvites[0].inviteId)}
                    disabled={acceptingInvite}
                    className="bg-white text-red-600 px-8 py-4 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {acceptingInvite ? (
                      <div className="w-5 h-5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <CheckCircle size={20} strokeWidth={3} />
                    )}
                    ACCEPT JOIN REQUEST
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Restaurant Status Banner */}
          <div className="bg-[#0c0c0e] rounded-2xl border border-zinc-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${restaurantOpen ? 'bg-green-950/40 text-green-400 border border-green-900/30' : 'bg-red-950/40 text-red-400 border border-red-900/30'
                }`}>
                {restaurantOpen ? <WifiIcon className="w-6 h-6" /> : <Store className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {restaurantOpen ? 'Restaurant is Live' : 'Restaurant is Offline'}
                </h3>
                <p className="text-sm text-zinc-550 font-medium">
                  {restaurantOpen ? 'You are accepting new orders' : 'Orders are currently paused'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleRestaurantStatus}
              disabled={statusLoading}
              className={`
                relative px-6 py-3 rounded-xl font-black text-sm text-black shadow-lg transition-all
                transform hover:scale-105 active:scale-95 flex items-center gap-2
                ${restaurantOpen
                  ? 'bg-[#d5b263] hover:bg-[#bfa052]'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }
                ${statusLoading ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {statusLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Power className="w-5 h-5" />
              )}
              <span>{restaurantOpen ? 'GO OFFLINE' : 'GO ONLINE'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Today's Orders"
              value={stats?.todayOrders ?? 0}
              icon={ShoppingBag}
              variant="blue"
              trend="+12%"
              loading={loading}
            />
            <StatCard
              title="Active Reservations"
              value={stats?.activeReservations ?? 0}
              icon={Calendar}
              variant="purple"
              loading={loading}
            />
            <StatCard
              title="Occupied Tables"
              value={stats?.occupiedTables ?? 0}
              icon={Users}
              variant="orange"
              loading={loading}
            />
            <StatCard
              title="Today's Revenue"
              value={formatPrice(stats?.todayNetRevenue ?? 0)}
              subValue={stats?.todayDiscount ? `Gross: ${formatPrice(stats.todayRevenue)}` : undefined}
              icon={DollarSign}
              variant="green"
              trend="+8%"
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Orders - Spans 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Live Orders</h3>
                <Link href="/dashboard/orders" className="text-sm font-bold text-[#d5b263] hover:text-[#bfa052] flex items-center gap-1 bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-lg transition-colors">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="bg-[#0c0c0e] rounded-2xl border border-zinc-800 divide-y divide-zinc-900 overflow-hidden">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="p-6 animate-pulse flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-900 rounded-xl"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-zinc-900 rounded w-1/3"></div>
                        <div className="h-3 bg-zinc-900 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))
                ) : recentOrders.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="w-8 h-8 text-zinc-500" />
                    </div>
                    <h4 className="text-white font-bold mb-1">No orders yet</h4>
                    <p className="text-zinc-500 text-sm">New orders will appear here instantly</p>
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => router.push(`/past-sessions?sessionId=${order.sessionId}&orderId=${order.id}`)}
                      className="p-5 hover:bg-zinc-950 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={`
                            w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                            ${order.status === 'pending' ? 'bg-yellow-950/40 text-yellow-400 border border-yellow-900/30' :
                              order.status === 'preparing' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' :
                                order.status === 'completed' ? 'bg-green-950/40 text-green-400 border border-green-900/30' :
                                  'bg-zinc-900 text-zinc-400 border border-zinc-800'
                            }
                          `}>
                            <ChefHat className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-white">Table {order.tableNumber}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${order.status === 'pending' ? 'bg-yellow-950/40 text-yellow-400 border-yellow-900/30' :
                                order.status === 'preparing' ? 'bg-blue-950/40 text-blue-400 border-blue-900/30' :
                                  order.status === 'completed' ? 'bg-green-950/40 text-green-400 border-green-900/30' :
                                    'bg-zinc-900 text-zinc-400 border-zinc-800'
                                }`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#d5b263]" />
                              {getRelativeTime(order.createdAt)} • {order.itemCount} items
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{formatPrice(order.totalAmount)}</p>
                          <ChevronRight className="w-5 h-5 text-zinc-500 ml-auto mt-1 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Quick Actions & Reservations */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-white">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <QuickAction href="/dashboard/new-order" icon={Plus} label="New Order" variant="blue" />
                  <QuickAction href="/dashboard/orders" icon={Clock} label="Pending" badge={stats?.pendingOrders} variant="yellow" />
                  <QuickAction href="/dashboard/reservations" icon={Calendar} label="Bookings" badge={stats?.activeReservations} variant="purple" />
                  <QuickAction href="/dashboard/tables" icon={QrCode} label="QR Codes" variant="orange" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Upcoming</h3>
                  <Link href="/dashboard/reservations" className="text-xs font-bold text-[#d5b263] hover:text-[#bfa052]">
                    View All
                  </Link>
                </div>
                <div className="bg-[#0c0c0e] rounded-2xl border border-zinc-800 p-2 space-y-1">
                  {upcomingReservations.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-zinc-500 font-medium">No upcoming reservations</p>
                    </div>
                  ) : (
                    upcomingReservations.map((res) => (
                      <div key={res.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-950 transition-colors cursor-pointer">
                        <div className="flex flex-col items-center bg-red-950/40 border border-red-900/30 rounded-lg px-2.5 py-1.5 min-w-[50px]">
                          <span className="text-[10px] font-bold text-red-400 uppercase">
                            {new Date(res.reservationTime).toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-lg font-black text-red-400 leading-none">
                            {new Date(res.reservationTime).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{res.guestName}</p>
                          <p className="text-xs text-zinc-550 font-medium">{res.numberOfGuests} guests • {new Date(res.reservationTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function StatCard({ title, value, subValue, icon: Icon, variant, trend, loading }: any) {
  const variants: any = {
    blue: { text: 'text-[#d5b263]', iconBg: 'bg-[#d5b263]/10 border border-[#d5b263]/20' },
    purple: { text: 'text-[#d5b263]', iconBg: 'bg-[#d5b263]/10 border border-[#d5b263]/20' },
    orange: { text: 'text-[#d5b263]', iconBg: 'bg-[#d5b263]/10 border border-[#d5b263]/20' },
    green: { text: 'text-[#d5b263]', iconBg: 'bg-[#d5b263]/10 border border-[#d5b263]/20' },
  };

  const style = variants[variant] || variants.blue;

  if (loading) {
    return (
      <div className="bg-[#0c0c0e] rounded-2xl border border-zinc-900/40 p-6 animate-pulse">
        <div className="h-10 w-10 bg-zinc-900 rounded-xl mb-4"></div>
        <div className="h-8 bg-zinc-900 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-zinc-900 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#0c0c0e] rounded-2xl hover:shadow-md transition-all duration-300 border border-zinc-900/40 p-6 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${style.iconBg} ${style.text} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="px-2.5 py-1 rounded-full bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/25 text-xs font-bold flex items-center gap-1 shadow-sm">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-zinc-500 mb-1">{title}</p>
        <h3 className="text-3xl font-black text-white tracking-tight">{value}</h3>
        {subValue && (
          <p className="text-xs font-medium text-zinc-400 mt-1">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, badge, variant }: any) {
  const variants: any = {
    blue: 'bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20',
    yellow: 'bg-zinc-900 text-[#d5b263] border border-zinc-850',
    purple: 'bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20',
    orange: 'bg-zinc-900 text-[#d5b263] border border-zinc-850',
  };

  return (
    <Link
      href={href}
      className={`
        relative overflow-hidden rounded-2xl p-4 flex flex-col items-center justify-center gap-3 text-center
        bg-[#0c0c0e] border border-zinc-900/40 shadow-sm hover:shadow-lg transition-all duration-300 group
      `}
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-2 right-2 bg-red-650 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center shadow-sm z-10">
          {badge}
        </span>
      )}

      <div className={`
        w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transform group-hover:-translate-y-1 transition-transform duration-300
        ${variants[variant] || variants.blue}
      `}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-sm font-bold text-zinc-400 group-hover:text-[#d5b263] transition-colors">{label}</span>
    </Link>
  );
}
