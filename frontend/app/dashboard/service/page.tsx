"use client";

import { useState, useEffect, useMemo } from "react";
import { useDashboard, getPermissions } from "@/lib/dashboard-context";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Users,
  Bell,
  ChefHat,
  Package,
  Phone,
} from "lucide-react";
import { useWebSocket } from "@/lib/websocket-context";

// --- Types ---
interface Order {
  id: string;
  tableSessionId: string;
  tableNumber?: number;
  status: OrderStatus;
  createdAt: string;
  totalAmount: number;
  notes?: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  menuItemName: string;
  variantName: string;
  portionSize?: string;
  foodType?: string;
  isVeg?: boolean;
  quantity: number;
  price: number;
  totalPrice: number;
  notes?: string | null;
  status?: string;
  extras?: Array<{
    extraId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface TableInfo {
  id: string;
  tableNumber: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  sessionId?: string;
  sessionStarted?: string;
  pendingOrders: number;
  readyOrders: number;
  servedOrders: number;
  totalOrders: number;
  orders: Order[];
}

type OrderStatus = 'placed' | 'preparing' | 'ready' | 'served' | 'cancelled';
type FilterView = 'all' | 'ready' | 'active' | 'completed';

// --- Helper Functions ---
const formatPrice = (amount: number) => `₹${(amount / 100).toFixed(2)}`;
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

// --- Components ---

// Status Badge
const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const styles = {
    placed: "bg-blue-950/40 text-blue-400 border-blue-900/30",
    preparing: "bg-orange-950/40 text-orange-400 border-orange-900/30",
    ready: "bg-green-950/40 text-green-400 border-green-900/30 animate-pulse-slow ring-2 ring-green-900/20",
    served: "bg-zinc-950 text-zinc-400 border-zinc-850",
    cancelled: "bg-red-950/40 text-red-400 border-red-900/30",
  };

  const icons = {
    placed: <Clock size={14} />,
    preparing: <ChefHat size={14} />,
    ready: <Bell size={14} />,
    served: <CheckCircle2 size={14} />,
    cancelled: <XCircle size={14} />,
  };

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>
      {icons[status]}
      <span className="uppercase tracking-wide">{status}</span>
    </span>
  );
};

// Table Status Badge
const TableStatusBadge = ({ status, orderCount }: { status: string; orderCount: number }) => {
  const styles = {
    available: "bg-zinc-950 text-zinc-400 border-zinc-850",
    occupied: "bg-blue-950/40 text-blue-400 border-blue-900/30",
    reserved: "bg-purple-950/40 text-purple-400 border-purple-900/30",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles] || styles.available}`}>
      {capitalize(status)} {orderCount > 0 && `• ${orderCount} orders`}
    </span>
  );
};

export default function ServicePage() {
  const { user, restaurant, isLoading: dashboardLoading } = useDashboard();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterView, setFilterView] = useState<FilterView>('ready');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'orders' | 'tables'>('orders');

  const permissions = user ? getPermissions(user.role) : null;

  const { socket, joinRestaurant } = useWebSocket();

  // Helper: Play voice and sound alerts when order is ready to serve
  const playReadyNotification = (tableNumber?: number) => {
    try {
      // 1. Play the alert bell
      const audio = new Audio('/notification.mp3');
      audio.volume = 1.0;
      audio.preload = 'auto';
      audio.play().catch(error => {
        console.error('Failed to play ready notification sound:', error);
      });

      // 2. Play the Text-to-Speech alert after 0.5s
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        setTimeout(() => {
          const tableText = tableNumber ? `for table number ${tableNumber}` : "";
          const speechText = `Attention staff. Order is ready to serve ${tableText}.`;
          console.log(`🗣️ Speaking alert: "${speechText}"`);
          const utterance = new SpeechSynthesisUtterance(speechText);
          utterance.volume = 1.0;
          utterance.rate = 0.95; // Slightly slower for clarity
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        }, 500);
      }
    } catch (e) {
      console.error('Error creating ready notification alert:', e);
    }
  };

  // --- Data Loading ---
  const loadData = async (showLoading = true) => {
    if (!restaurant) return;

    try {
      if (showLoading) setLoading(true);

      // Load orders and tables in parallel
      const [ordersData, tablesData]: any = await Promise.all([
        apiClient.getRestaurantOrders(restaurant.id, { limit: 500 }),
        apiClient.getTables(restaurant.id),
      ]);

      // Sort orders: ready first, then preparing, placed
      const sorted = (ordersData.orders || []).sort((a: Order, b: Order) => {
        const priority = { ready: 4, preparing: 3, placed: 2, served: 1, cancelled: 0 };
        return priority[b.status] - priority[a.status] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      // Polling fallback to check if any order transitioned to 'ready'
      setOrders(prev => {
        if (prev.length > 0) {
          sorted.forEach((newOrder: Order) => {
            const oldOrder = prev.find(o => o.id === newOrder.id);
            if (newOrder.status === 'ready' && (!oldOrder || oldOrder.status !== 'ready')) {
              console.log(`🔔 [Table Service] Polling fallback detected order ${newOrder.id} is ready!`);
              playReadyNotification(newOrder.tableNumber);
            }
          });
        }
        return sorted;
      });

      setTables(tablesData.tables || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to sync data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Connect to restaurant WebSocket room
  useEffect(() => {
    if (restaurant?.id) {
      joinRestaurant(restaurant.id);
    }
  }, [restaurant?.id, joinRestaurant]);

  // WebSocket real-time event listeners
  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdated = (data: any) => {
      console.log("⚡ [Table Service] WebSocket order-updated received:", data);
      
      const orderId = data.orderId || data.id;
      const newStatus = data.status;

      setOrders(prev => {
        const existingOrder = prev.find(o => o.id === orderId);
        // Transition to 'ready' state triggers alarm
        if (existingOrder && existingOrder.status !== 'ready' && newStatus === 'ready') {
          console.log(`🔔 [Table Service] WebSocket order ${orderId} is ready!`);
          playReadyNotification(existingOrder.tableNumber);
        }
        return prev.map(o => o.id === orderId ? { ...o, status: newStatus as OrderStatus } : o);
      });

      loadData(false);
    };

    const handleOrderCreated = (data: any) => {
      console.log("⚡ [Table Service] WebSocket order-created received:", data);
      loadData(false);
    };

    socket.on('order-updated', handleOrderUpdated);
    socket.on('order-created', handleOrderCreated);

    return () => {
      socket.off('order-updated', handleOrderUpdated);
      socket.off('order-created', handleOrderCreated);
    };
  }, [socket, restaurant?.id]);

  useEffect(() => {
    if (restaurant) {
      loadData();
      const interval = setInterval(() => loadData(false), 30000); // Auto-refresh every 30s
      return () => clearInterval(interval);
    }
  }, [restaurant]);

  // --- Actions ---
  const handleServeOrder = async (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'served' as OrderStatus } : o));

    try {
      await apiClient.updateOrderStatus(orderId, 'served');
      toast.success('Order marked as served!');
    } catch (error: any) {
      toast.error('Failed to update status');
      loadData(false);
    }
  };

  // --- Computed Data ---
  const tableInfoMap = useMemo(() => {
    const map = new Map<string, TableInfo>();

    // Initialize with table data
    tables.forEach(table => {
      map.set(table.id, {
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status || 'available',
        pendingOrders: 0,
        readyOrders: 0,
        servedOrders: 0,
        totalOrders: 0,
        orders: [],
      });
    });

    // Aggregate orders by table
    orders.forEach(order => {
      if (!order.tableNumber) return;

      const table = tables.find(t => t.tableNumber === order.tableNumber);
      if (!table) return;

      const tableInfo = map.get(table.id);
      if (!tableInfo) return;

      tableInfo.orders.push(order);
      tableInfo.totalOrders++;

      if (order.status === 'ready') tableInfo.readyOrders++;
      else if (order.status === 'placed' || order.status === 'preparing') tableInfo.pendingOrders++;
      else if (order.status === 'served') tableInfo.servedOrders++;

      if (!tableInfo.sessionId && order.tableSessionId) {
        tableInfo.sessionId = order.tableSessionId;
        tableInfo.sessionStarted = order.createdAt;
      }
    });

    return map;
  }, [orders, tables]);

  const tablesWithOrders = useMemo(() => {
    return Array.from(tableInfoMap.values())
      .filter(table => table.totalOrders > 0)
      .sort((a, b) => b.readyOrders - a.readyOrders || b.totalOrders - a.totalOrders);
  }, [tableInfoMap]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesView =
        filterView === 'all' ||
        (filterView === 'ready' && o.status === 'ready') ||
        (filterView === 'active' && (o.status === 'placed' || o.status === 'preparing' || o.status === 'ready')) ||
        (filterView === 'completed' && o.status === 'served');

      const matchesSearch =
        (o.tableNumber?.toString() || '').includes(searchQuery) ||
        o.items.some(i => i.menuItemName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        o.tableSessionId.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesView && matchesSearch;
    });
  }, [orders, filterView, searchQuery]);

  const metrics = useMemo(() => ({
    ready: orders.filter(o => o.status === 'ready').length,
    active: orders.filter(o => ['placed', 'preparing', 'ready'].includes(o.status)).length,
    served: orders.filter(o => o.status === 'served').length,
    total: orders.length,
  }), [orders]);

  // Console logging for debugging
  console.log("🍽️ SERVICE PAGE RENDER:", {
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    restaurant: restaurant ? { id: restaurant.id, name: restaurant.restaurantName } : null,
    dashboardLoading,
    hasRestaurant: !!restaurant,
    restaurantId: restaurant?.id,
    permissions: permissions ? Object.keys(permissions) : null
  });

  // Loading check - wait for dashboard data to load
  if (dashboardLoading || !user || !restaurant) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d5b263] mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading service dashboard...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center bg-black">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#d5b263] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-3 text-sm text-zinc-500 font-medium animate-pulse">Loading Service...</p>
      </div>
    );
  }

  if (!permissions?.canViewOrders) {
    return <div className="p-8 text-center text-zinc-500 bg-black">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-black pb-20 text-white">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-xl border-b border-zinc-900 px-4 py-4 md:px-8 transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Utensils className="w-6 h-6 text-[#d5b263]" />
              Table Service
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" title="Live"></span>
            </h1>
            <p className="text-sm font-medium text-zinc-500 mt-1">
              <span className="text-green-500 font-bold">{metrics.ready} Ready</span> • {metrics.active} Active • {metrics.served} Served
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-[#d5b263] transition-colors" />
              <input
                type="text"
                placeholder="Search table or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-zinc-950 hover:bg-zinc-900 focus:bg-zinc-900 text-white border border-zinc-850 text-sm font-medium focus:border-[#d5b263] rounded-xl transition-all outline-none shadow-sm focus:shadow-md"
              />
            </div>

            <div className="h-8 w-px bg-zinc-800 hidden sm:block mx-1"></div>

            {/* View Segments (Apple style) */}
            <div className="relative flex items-center bg-zinc-950 p-1 rounded-xl shadow-inner border border-zinc-900">
              <button
                onClick={() => setViewMode('tables')}
                className={`relative z-10 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 flex-1 sm:flex-none ${viewMode === 'tables' ? 'text-black font-black' : 'text-zinc-400 hover:text-white'}`}
                title="View by Tables"
              >
                <Users size={16} strokeWidth={2.5} />
                <span>Tables</span>
              </button>
              <button
                onClick={() => setViewMode('orders')}
                className={`relative z-10 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 flex-1 sm:flex-none ${viewMode === 'orders' ? 'text-black font-black' : 'text-zinc-400 hover:text-white'}`}
                title="View by Orders"
              >
                <Package size={16} strokeWidth={2.5} />
                <span>Orders</span>
              </button>

              {/* Sliding background indicator */}
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#d5b263] rounded-lg shadow-sm transition-transform duration-300 left-1 ${viewMode === 'orders' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
              ></div>
            </div>

            <div className="h-8 w-px bg-zinc-800 hidden sm:block mx-1"></div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setRefreshing(true); loadData(false); }}
              disabled={refreshing}
              className={`p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all duration-200 border border-zinc-800 shadow-sm ${refreshing ? 'animate-spin text-blue-500' : ''}`}
            >
              <RefreshCw size={18} />
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 custom-scrollbar mask-fade-right px-1">
          {(['ready', 'active', 'completed', 'all'] as FilterView[]).map((view) => (
            <button
              key={view}
              onClick={() => setFilterView(view)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 border shadow-sm flex items-center gap-2 ${filterView === view
                ? view === 'ready' ? 'bg-green-950/40 text-green-400 border-green-900/30'
                  : 'bg-[#d5b263] text-black border-[#d5b263]'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700'
                }`}
            >
              {view === 'ready' && <Bell size={14} className={filterView === view ? 'animate-pulse' : ''} />}
              {capitalize(view)}
              {view !== 'all' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${filterView === view ? 'bg-white/20 text-white' : 'bg-zinc-950 text-zinc-400 border border-zinc-850/50'
                  }`}>
                  {view === 'ready' ? metrics.ready : view === 'active' ? metrics.active : metrics.served}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-8">
        {viewMode === 'tables' ? (
          // Table View
          <div className="space-y-6">
            {tablesWithOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-900/10 rounded-3xl border border-dashed border-zinc-800/80">
                <div className="bg-zinc-950 p-6 rounded-full mb-4 border border-zinc-850"><Users size={48} className="text-zinc-500" /></div>
                <h3 className="text-xl font-black tracking-tight text-white">No active tables</h3>
                <p className="font-medium mt-1 text-zinc-650">Tables with orders will appear here</p>
              </div>
            ) : (
              <AnimatePresence>
                {tablesWithOrders.map(table => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={table.id} 
                    className="bg-[#0c0c0e] rounded-2xl border border-zinc-800/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    {/* Table Header */}
                    <div className="p-5 bg-zinc-950/50 flex flex-wrap justify-between items-center gap-4 relative overflow-hidden">
                      {/* Subtle accent line */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${table.readyOrders > 0 ? 'bg-green-500' : table.pendingOrders > 0 ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                      
                      <div className="flex items-center gap-5 pl-2">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transform transition-transform hover:scale-105 ${
                          table.readyOrders > 0 ? 'bg-green-950/40 text-green-400 border border-green-900/30' : 
                          table.pendingOrders > 0 ? 'bg-orange-950/40 text-orange-400 border border-orange-900/30' : 
                          'bg-blue-950/40 text-blue-400 border-blue-900/30'
                        }`}>
                          <div className="text-center">
                            <div className="text-2xl font-black leading-none">{table.tableNumber}</div>
                            <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1 text-zinc-400">{table.capacity} pax</div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white tracking-tight">Table {table.tableNumber}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-zinc-450 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-850">
                              {table.totalOrders} {table.totalOrders === 1 ? 'Order' : 'Orders'}
                            </span>
                            <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1">
                              <Clock size={12} /> {getRelativeTime(table.sessionStarted!)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {table.readyOrders > 0 && (
                          <div className="px-3 py-1.5 bg-green-950/40 text-green-400 rounded-lg border border-green-900/30 font-bold flex items-center gap-1.5 text-sm shadow-sm">
                            <Bell size={14} className="animate-pulse" />
                            {table.readyOrders} Ready
                          </div>
                        )}
                        {table.pendingOrders > 0 && (
                          <div className="px-3 py-1.5 bg-orange-950/40 text-orange-400 rounded-lg border border-orange-200/30 font-bold flex items-center gap-1.5 text-sm shadow-sm">
                            <ChefHat size={14} />
                            {table.pendingOrders} Cooking
                          </div>
                        )}
                        <button
                          onClick={() => router.push(`/session/${table.sessionId}`)}
                          className="px-4 py-2 bg-[#d5b263] text-black rounded-xl hover:bg-[#bfa052] hover:shadow-md transition-all flex items-center gap-2 text-sm font-black active:scale-95 ml-2"
                        >
                          View Session <ExternalLink size={14} />
                        </button>
                      </div>
                    </div>
                    {/* Orders for this Table */}
                    <div className="p-5 bg-black/40">
                      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <AnimatePresence>
                          {table.orders.map((order: Order) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              key={order.id}
                              onClick={() => setSelectedOrder(order)}
                              className={`relative bg-[#0c0c0e]/80 backdrop-blur-xl rounded-[20px] transition-all duration-300 cursor-pointer flex flex-col overflow-hidden border group ${
                                order.status === 'ready' ? 'border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.05)]' : 
                                order.status === 'preparing' ? 'border-orange-500/30 shadow-[0_8px_32px_rgba(249,115,22,0.06)]' : 
                                order.status === 'placed' ? 'border-blue-500/30 shadow-[0_8px_32px_rgba(59,130,246,0.05)]' : 'border-white/5'
                                }`}
                            >
                              {/* Glowing status accent bar */}
                              <div className={`h-1 w-full absolute top-0 left-0 z-20 ${
                                order.status === 'ready' ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                                order.status === 'preparing' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                                order.status === 'placed' ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-zinc-800'
                              }`}></div>

                              {/* Ambient glow */}
                              <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-[60px] pointer-events-none transition-all duration-500 opacity-20 group-hover:opacity-40 ${
                                order.status === 'ready' ? 'bg-emerald-500' :
                                order.status === 'preparing' ? 'bg-orange-500' :
                                order.status === 'placed' ? 'bg-blue-500' : 'bg-zinc-800'
                              }`}></div>
                              <div className="p-4 border-b border-dashed border-zinc-800 flex justify-between items-start bg-zinc-950/40 z-10 relative">
                                <div>
                                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">#{order.id.slice(-6)}</p>
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-550 mt-1">
                                    <Clock size={12} className="text-[#d5b263]" />
                                    {getRelativeTime(order.createdAt)}
                                  </div>
                                </div>
                                <StatusBadge status={order.status} />
                              </div>

                              <div className="p-4 flex-1 bg-[#0c0c0e]/30 relative z-10 space-y-3">
                                {order.items.slice(0, 3).map((item, i) => (
                                  <div key={i} className="flex items-start gap-3 text-sm">
                                    {item.isVeg !== undefined && (
                                      <div className={`mt-0.5 w-3.5 h-3.5 border flex items-center justify-center rounded-[2px] flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0 leading-tight">
                                      <span className="font-medium text-zinc-300 block truncate">
                                        <span className="font-black tracking-tight text-[#d5b263]">{item.quantity}x</span> {item.menuItemName}
                                      </span>
                                      {item.extras && item.extras.length > 0 && (
                                        <span className="text-[10px] font-bold text-blue-400 bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-900/30 mt-1 inline-block">
                                          + {item.extras.reduce((sum, extra) => sum + extra.quantity, 0)} extras
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <div className="text-xs font-bold text-center text-[#d5b263] bg-[#d5b263]/10 py-1.5 rounded-md mt-2">
                                    + {order.items.length - 3} more items
                                  </div>
                                )}
                              </div>

                              {order.notes && (
                                <div className="px-4 pb-4 bg-[#0c0c0e]/30 relative z-10">
                                  <div className="p-2.5 bg-yellow-950/30 text-yellow-400 text-[11px] font-medium rounded-lg border border-yellow-900/30 flex gap-2 shadow-inner">
                                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-yellow-600" />
                                    <span className="line-clamp-2 leading-tight">"{order.notes}"</span>
                                  </div>
                                </div>
                              )}

                              {order.status === 'ready' && permissions?.canUpdateOrderStatus && (
                                <div className="p-2 bg-zinc-950/80 border-t border-zinc-850 z-10 relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleServeOrder(order.id);
                                    }}
                                    className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-green-700"
                                  >
                                    <CheckCircle2 size={16} /> Mark Served
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    </div>

                  </motion.div>
              ))}
              </AnimatePresence>
            )}
          </div>
        ) : (
          // Orders View
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredOrders.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-900/10 rounded-3xl border border-dashed border-zinc-800/80">
                  <div className="bg-zinc-950 p-6 rounded-full mb-4 border border-zinc-850"><Package size={48} className="text-zinc-500" /></div>
                  <h3 className="text-xl font-black tracking-tight text-white">No orders found</h3>
                  <p className="font-medium mt-1 text-zinc-650">Orders will appear here when ready</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`relative bg-[#0c0c0e]/80 backdrop-blur-xl rounded-[24px] transition-all duration-300 cursor-pointer flex flex-col overflow-hidden border group ${
                      order.status === 'ready' ? 'border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.05)] ring-1 ring-emerald-500/10' : 
                      order.status === 'preparing' ? 'border-orange-500/30 shadow-[0_8px_32px_rgba(249,115,22,0.06)]' : 
                      order.status === 'placed' ? 'border-blue-500/30 shadow-[0_8px_32px_rgba(59,130,246,0.05)]' : 'border-white/5'
                      }`}
                  >
                    {/* Glowing status accent bar */}
                    <div className={`h-1 w-full absolute top-0 left-0 z-20 ${
                      order.status === 'ready' ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                      order.status === 'preparing' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                      order.status === 'placed' ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-zinc-800'
                    }`}></div>

                    {/* Ambient glow */}
                    <div className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-[80px] pointer-events-none transition-all duration-500 opacity-20 group-hover:opacity-40 ${
                      order.status === 'ready' ? 'bg-emerald-500' :
                      order.status === 'preparing' ? 'bg-orange-500' :
                      order.status === 'placed' ? 'bg-blue-500' : 'bg-zinc-800'
                    }`}></div>
                    {/* Card Header (Swiggy Receipt Style) */}
                    <div className="p-4 border-b border-dashed border-zinc-850 bg-zinc-950/30 group-hover:bg-zinc-900/20 transition-colors flex justify-between items-start z-10 relative">
                      <div>
                        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                          {order.tableNumber ? `Table ${order.tableNumber}` : 'Direct Order'}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 mt-1 uppercase tracking-widest">
                          <Clock size={12} className="text-[#d5b263]" />
                          {getRelativeTime(order.createdAt)} • #{order.id.slice(-4)}
                        </div>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>

                    {/* Items List */}
                    <div className="p-4 flex-1 bg-[#0c0c0e]/10 z-10 relative space-y-4">
                      {order.items.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          {item.isVeg !== undefined && (
                            <div className={`mt-0.5 w-4 h-4 border-[1.5px] flex items-center justify-center rounded-[3px] flex-shrink-0 ${item.isVeg ? 'border-green-600 bg-green-950/10' : 'border-red-600 bg-red-950/10'}`}>
                              <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 leading-tight">
                            <span className="text-zinc-200 font-medium block truncate">
                               <span className="font-black tracking-tight text-[#d5b263]">{item.quantity}x</span> {item.menuItemName}
                            </span>
                            {item.variantName !== "Default" && <span className="text-zinc-500 text-[11px] font-bold mt-0.5 block">{item.variantName}</span>}
                            {item.extras && item.extras.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {item.extras.map((extra, index) => (
                                  <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-950/40 text-blue-400 border border-blue-900/30">
                                    + {extra.quantity}x {extra.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-white font-black whitespace-nowrap mt-0.5">{formatPrice(item.totalPrice)}</span>
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="text-xs font-bold text-center text-blue-400 bg-blue-950/40 border border-blue-900/30 hover:bg-blue-900/20 py-2 rounded-lg mt-2 cursor-pointer transition-colors">
                          + {order.items.length - 4} more items
                        </div>
                      )}
                    </div>

                    {order.notes && (
                      <div className="px-4 pb-4 bg-[#0c0c0e]/10 z-10 relative">
                        <div className="p-3 bg-yellow-950/30 text-yellow-400 text-xs font-medium rounded-lg border border-yellow-900/30 flex gap-2 shadow-inner">
                          <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-yellow-600" />
                          <span className="line-clamp-2 leading-relaxed italic">"{order.notes}"</span>
                        </div>
                      </div>
                    )}

                    {/* Card Footer */}
                    <div className="p-4 border-t border-zinc-850 mt-auto bg-zinc-950/40 group-hover:bg-zinc-900/40 transition-colors z-10 relative">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Bill</span>
                        <span className="text-xl font-black text-white tracking-tight">{formatPrice(order.totalAmount)}</span>
                      </div>

                      {order.status === 'ready' && permissions?.canUpdateOrderStatus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleServeOrder(order.id);
                          }}
                          className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-bold shadow-sm hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 hover:bg-green-700 hover:-translate-y-0.5"
                        >
                          <CheckCircle2 size={18} /> Mark as Served
                        </button>
                      )}

                      {order.status === 'served' && (
                        <button className="w-full bg-zinc-950 border border-zinc-850 text-zinc-650 py-3 rounded-xl text-sm font-bold cursor-not-allowed flex items-center justify-center gap-2 shadow-inner">
                          <CheckCircle2 size={18} /> Served
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0c0c0e] w-full max-w-lg rounded-[28px] border border-zinc-800 shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-850 flex justify-between items-start bg-zinc-950/80 z-20">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    {selectedOrder.tableNumber ? `Table ${selectedOrder.tableNumber}` : 'Direct Order'}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge status={selectedOrder.status} />
                    <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest">• #{selectedOrder.id.slice(-6)}</span>
                    <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest">• {getRelativeTime(selectedOrder.createdAt)}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-full transition-colors active:scale-95">
                  <XCircle className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-black/40">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 pl-1">Items to Serve</h3>
                <div className="space-y-4">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-900 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4 flex-1">
                          {item.isVeg !== undefined && (
                            <div className={`w-5 h-5 border-[2px] flex items-center justify-center rounded-[4px] flex-shrink-0 ${item.isVeg ? 'border-green-600 bg-green-950/10' : 'border-red-600 bg-red-950/10'}`}>
                              <div className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                            </div>
                          )}
                          <div className="w-12 h-12 bg-zinc-900 text-[#d5b263] rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0 shadow-sm">
                            {item.quantity}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-white text-lg tracking-tight leading-tight">{item.menuItemName}</p>
                            {item.variantName !== "Default" && <p className="text-sm font-semibold text-zinc-500 mt-0.5">{item.variantName}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="bg-zinc-900/60 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-500 font-medium">Base Price</span>
                          <span className="font-bold text-zinc-350">{formatPrice(item.price)}</span>
                        </div>

                        {item.extras && item.extras.length > 0 && (
                          <div className="space-y-1.5 pt-1.5 border-t border-zinc-800">
                            {item.extras.map((extra, index) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-[11px] font-bold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-900/30">
                                  + {extra.quantity}x {extra.name}
                                </span>
                                <span className="font-bold text-zinc-350">{formatPrice(extra.totalPrice)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2 mt-2 border-t border-zinc-800">
                          <span className="font-bold text-white">Item Total</span>
                          <span className="font-black text-white text-lg tracking-tight">{formatPrice(item.totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedOrder.notes && (
                  <div className="mt-8">
                    <h3 className="text-xs font-bold text-zinc-550 uppercase tracking-widest mb-3 pl-1">Special Notes</h3>
                    <div className="p-4 bg-yellow-950/30 text-yellow-400 rounded-2xl text-sm font-medium border border-yellow-900/30 italic shadow-inner flex gap-3">
                      <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-yellow-600" />
                      <span className="leading-relaxed">"{selectedOrder.notes}"</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-850 bg-zinc-950/80 z-20 flex flex-col gap-4">
                <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-2xl border border-zinc-850">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Total Bill</span>
                  <span className="text-3xl font-black text-white tracking-tight">{formatPrice(selectedOrder.totalAmount)}</span>
                </div>

                {selectedOrder.status === 'ready' && permissions?.canUpdateOrderStatus && (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleServeOrder(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="w-full py-3.5 rounded-xl bg-green-600 text-white font-black text-lg shadow-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 hover:bg-green-700"
                  >
                    <CheckCircle2 size={20} /> Mark as Served
                  </motion.button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      router.push(`/session/${selectedOrder.tableSessionId}`);
                    }}
                    className="py-3 rounded-xl border-2 border-zinc-800 text-zinc-300 font-bold hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2 active:scale-95"
                  >
                    View Session <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="py-3 rounded-xl bg-zinc-900 border border-zinc-850 text-white font-bold hover:bg-zinc-800 hover:shadow-md transition-all active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
