"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, ChefHat, CheckCircle2,
  AlertCircle, RefreshCw,
  Utensils, History, LayoutGrid, Columns,
  Maximize2, Minimize2, Timer, Flame,
  Wifi, WifiOff, Zap, Receipt, Loader2
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useDashboard } from '@/lib/dashboard-context';
import toast from 'react-hot-toast';
import { canUserViewOrders } from '@/lib/permissions';
import { differenceInMinutes, differenceInSeconds } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

// --- Utility Functions ---

// Fallback notification using Web Audio API (kitchen-style alert)
const playFallbackNotification = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Create a more urgent kitchen-style sound
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
  } catch (e) {
    console.log('Audio not supported');
    // Final fallback: console bell
    console.log('\u0007');
  }
};
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
  isVeg?: boolean;
  quantity: number;
  price: number;
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

type OrderStatus = 'placed' | 'preparing' | 'ready' | 'served' | 'cancelled';
type ViewMode = 'kanban' | 'grid' | 'list';

// --- Components ---

// 1. Connection Status Indicator
const ConnectionStatus = ({ isConnected }: { isConnected: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors shadow-sm ${isConnected
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
        : 'bg-red-50 text-red-700 border border-red-200/50'
        }`}>
      {isConnected ? (
        <>
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span>Live</span>
        </>
      ) : (
        <>
          <WifiOff size={14} className="opacity-70" />
          <span>Offline</span>
        </>
      )}
    </motion.div>
  );
};

// 2. Order Timer Component
const OrderTimer = ({ createdAt, status }: { createdAt: string, status: OrderStatus }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const diff = differenceInSeconds(new Date(), new Date(createdAt));
      setElapsed(diff);
    };

    // Update immediately
    updateTimer();

    // For active orders, update every second
    if (!['served', 'cancelled', 'ready'].includes(status)) {
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [createdAt, status]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  // Urgency Colors - Adjusted for aesthetics
  let colorClass = "text-gray-500 bg-gray-50 border-gray-100";
  if (status !== 'served' && status !== 'cancelled') {
    if (minutes >= 20) colorClass = "text-white bg-red-600 border-red-600 animate-pulse shadow-md shadow-red-500/20"; // Critical
    else if (minutes >= 10) colorClass = "text-orange-700 bg-orange-50 border-orange-200 shadow-sm"; // Warning
    else if (minutes >= 5) colorClass = "text-amber-700 bg-amber-50 border-amber-200"; // Attention
    else colorClass = "text-emerald-700 bg-emerald-50 border-emerald-100"; // Normal
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition-colors duration-300 ${colorClass}`}>
      <Timer size={14} className={minutes >= 20 ? 'text-white/80' : 'opacity-70'} />
      <span className="tracking-tight">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

// 3. Kitchen Card Component - Swiggy Ticket Style
const KitchenCard = ({
  order,
  onUpdateStatus,
  isUpdating = false,
  compact = false
}: {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  isUpdating?: boolean;
  compact?: boolean;
}) => {
  const isLate = differenceInMinutes(new Date(), new Date(order.createdAt)) > 15;
  const isVeryLate = differenceInMinutes(new Date(), new Date(order.createdAt)) > 20;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`
      relative bg-[#0c0c0e]/90 backdrop-blur-xl rounded-[24px] transition-all duration-300 overflow-hidden flex flex-col border group
      ${order.status === 'placed' ? 'border-blue-500/20 shadow-[0_8px_32px_rgba(59,130,246,0.05)]' :
        order.status === 'preparing' ? 'border-orange-500/20 shadow-[0_8px_32px_rgba(249,115,22,0.08)]' :
        'border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.05)]'}
      ${isVeryLate && order.status !== 'ready' ? 'ring-2 ring-red-500/50 border-red-500/30' : ''}
    `}>
      {/* Ambient background glow */}
      <div className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-[80px] pointer-events-none transition-all duration-500 opacity-20 group-hover:opacity-45 ${
        order.status === 'placed' ? 'bg-blue-500' :
        order.status === 'preparing' ? 'bg-orange-500' :
        'bg-emerald-500'
      }`}></div>

      {/* Top Status Color Bar */}
      <div className={`h-1 w-full relative z-10 ${
        order.status === 'placed' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
        order.status === 'preparing' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
        'bg-gradient-to-r from-emerald-500 to-green-500'
      }`}></div>

      {/* Priority Indicator */}
      {isVeryLate && order.status !== 'ready' && (
        <div className="absolute top-3 right-3 z-20">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-sm shadow-rose-500/10"
          >
            <AlertCircle size={10} strokeWidth={3} />
            URGENT
          </motion.div>
        </div>
      )}

      {/* Header - Receipt Style */}
      <div className={`p-4 flex justify-between items-start ${compact ? 'pb-2' : 'pb-3 border-b border-zinc-850 mx-2'}`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border
              ${order.status === 'placed' ? 'bg-blue-950/40 text-blue-400 border-blue-900/30 shadow-sm' :
                order.status === 'preparing' ? 'bg-orange-950/40 text-orange-400 border-orange-900/30 shadow-sm' :
                  'bg-emerald-950/40 text-emerald-400 border-emerald-900/30 shadow-sm'}
            `}>
              {(order.tableNumber !== null && order.tableNumber !== undefined) ? `T${order.tableNumber}` : 'D'}
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight leading-none mb-1">
                {(order.tableNumber !== null && order.tableNumber !== undefined) ? `Table ${order.tableNumber}` : 'Direct'}
              </h3>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">ID: {order.id.slice(-4)}</span>
            </div>
          </div>
        </div>
        {!compact && <OrderTimer createdAt={order.createdAt} status={order.status} />}
        {compact && (
          <div className="text-xs text-zinc-400 font-bold flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-850 shadow-sm">
            <Clock size={12} className="opacity-70" /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {!compact && (
        <div className="px-5 pb-1 pt-2 flex items-center justify-between text-xs font-bold text-zinc-500 tracking-wide">
          <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>{order.items.length} Item{order.items.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Items List */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[280px] custom-scrollbar">
        <ul className="space-y-4">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-4 group/item">
              {/* Quantity Highlight */}
              <div className="pt-0.5 shrink-0 flex items-center justify-center mt-0.5">
                <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-black border
                  ${item.quantity > 1
                    ? 'bg-red-950/40 text-red-400 border-red-900/30 shadow-sm'
                    : 'bg-zinc-950 text-zinc-300 border-zinc-850 shadow-sm'}`}
                >
                  {item.quantity}
                </span>
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <span className={`font-bold text-white leading-snug tracking-tight ${compact ? 'text-sm' : 'text-[15px]'}`}>
                    {item.menuItemName}
                  </span>
                  {item.isVeg !== undefined && (
                    <div className="pt-1.5 shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-zinc-900 shadow-sm ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                  )}
                </div>

                {(item.variantName || item.portionSize) && (
                  <p className="text-xs font-bold text-zinc-500 mt-0.5 uppercase tracking-wider">
                    {item.variantName} {item.portionSize && `• ${item.portionSize}`}
                  </p>
                )}

                {item.notes && (
                  <p className="text-xs text-orange-400 bg-orange-950/40 px-2 py-1.5 rounded-lg mt-2 inline-flex items-center gap-1.5 font-bold border border-orange-900/30 shadow-sm">
                    <AlertCircle size={12} className="shrink-0" />
                    "{item.notes}"
                  </p>
                )}

                {item.extras && item.extras.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.extras.map((extra, index) => (
                      <span key={index} className="text-[10px] font-bold text-zinc-450 bg-zinc-950 border border-zinc-850 shadow-sm px-2 py-0.5 rounded-md uppercase tracking-widest">
                        + {extra.quantity > 1 ? `${extra.quantity} ` : ''}{extra.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {order.notes && (
          <div className="mt-5 p-3.5 bg-yellow-950/40 border border-yellow-900/30 rounded-xl text-xs text-yellow-400 font-medium flex gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-yellow-600" />
            <span className="leading-relaxed"><strong className="text-yellow-500 block font-black mb-0.5 tracking-wide text-xs">ORDER NOTE</strong>{order.notes}</span>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-4 bg-zinc-950/40 border-t border-zinc-850 mt-auto">
        {order.status === 'placed' && (
          <motion.button
            whileHover={isUpdating ? {} : { scale: 1.02 }}
            whileTap={isUpdating ? {} : { scale: 0.98 }}
            onClick={() => onUpdateStatus(order.id, 'preparing')}
            disabled={isUpdating}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg shadow-orange-500/20 text-white rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> STARTING...
              </>
            ) : (
              <>
                <Flame size={18} strokeWidth={2.5} /> START COOKING
              </>
            )}
          </motion.button>
        )}

        {order.status === 'preparing' && (
          <motion.button
            whileHover={isUpdating ? {} : { scale: 1.02 }}
            whileTap={isUpdating ? {} : { scale: 0.98 }}
            onClick={() => onUpdateStatus(order.id, 'ready')}
            disabled={isUpdating}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20 text-white rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> MARKING READY...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} strokeWidth={2.5} /> MARK READY
              </>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default function OrdersPage() {
  const { user, restaurant, isLoading: dashboardLoading } = useDashboard();
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [compactMode, setCompactMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log('🍽️ ORDERS PAGE RENDER:', {
    hasUser: !!user,
    hasRestaurant: !!restaurant,
    userRole: user?.role,
    restaurantId: restaurant?.id,
    restaurantName: restaurant?.restaurantName,
    dashboardLoading,
    pageLoading: loading,
    ordersCount: orders.length,
    viewMode,
    compactMode,
    showHistory
  });

  // Play kitchen notification sound instantly
  const playKitchenNotification = useCallback(() => {
    try {
      console.log('🔊 Playing kitchen notification sound');
      const audio = new Audio('/notification.mp3');
      audio.volume = 1.0; // Maximum volume
      audio.preload = 'auto';

      // Create audio context to bypass autoplay restrictions
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Force play with error handling
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🔊 Notification sound played successfully');
          })
          .catch(error => {
            console.error('Failed to play kitchen notification sound:', error);
            // Fallback: try to play again after a short delay
            setTimeout(() => {
              audio.play().catch(e => console.error('Fallback play failed:', e));
            }, 100);
          });
      }
    } catch (error) {
      console.error('Error creating kitchen notification audio:', error);
    }
  }, []);

  // --- Data Loading ---
  const loadOrders = useCallback(async (showLoader = true) => {
    if (!restaurant) return;
    try {
      if (showLoader) setLoading(true);
      const data: any = await apiClient.getRestaurantOrders(restaurant.id, {
        limit: 100,
        status: 'placed,preparing,ready'
      });

      // Sort by urgency (oldest first for kitchen)
      const sorted = (data.orders || []).sort((a: Order, b: Order) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Check for new "placed" orders and play sound
      const previousOrderIds = new Set(orders.map(o => o.id));
      const newPlacedOrders = sorted.filter((order: Order) =>
        order.status === 'placed' && !previousOrderIds.has(order.id)
      );

      if (newPlacedOrders.length > 0) {
        console.log('🆕 New placed orders detected:', newPlacedOrders.length);
        playKitchenNotification();
      }

      setOrders(sorted);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to sync orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurant, orders, playKitchenNotification]);

  // WebSocket connection functions
  const connectWebSocket = useCallback(() => {
    // Enable WebSocket for both development and production (now supported on Render)
    if (!restaurant?.id) {
      console.log('🔌 No restaurant ID available for WebSocket connection');
      setIsConnected(false);
      return;
    }

    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ||
      (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')
        ? 'https://myquro-web.onrender.com'
        : 'http://localhost:4000');
    // Convert HTTP/HTTPS to WS/WSS
    const socketUrl = backendUrl.replace(/^http/, 'ws');

    console.log('🔌 Connecting to WebSocket:', socketUrl);

    // Extract and log session token
    const cookies = document.cookie.split(';');
    let sessionToken = null;
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'better-auth.session_token' || name.endsWith('better-auth.session_token')) {
        sessionToken = value;
        break;
      }
    }

    console.log('🔌 [Orders Page WebSocket] All cookies:', document.cookie);
    console.log('🔌 [Orders Page WebSocket] Extracted session token:', sessionToken ? `${sessionToken.substring(0, 10)}...` : 'null');
    console.log('🔌 [Orders Page WebSocket] Current domain:', typeof window !== 'undefined' ? window.location.hostname : 'unknown');

    socketRef.current = io(socketUrl, {
      auth: {
        sessionToken: sessionToken
      },
      withCredentials: true,
      transports: ['polling', 'websocket'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Orders WebSocket connected successfully');
      setIsConnected(true);
      // Join restaurant room
      socketRef.current?.emit('join-restaurant', restaurant.id);
    });

    socketRef.current.on('joined-room', (data: any) => {
      console.log('🔌 Joined restaurant room:', data.restaurantId);
    });

    // Listen for order events - play sound instantly for placed orders
    socketRef.current.on('order-created', (data: any) => {
      console.log('📡 Order created event received in Orders:', data);
      console.log('📡 Order created at:', new Date(data.createdAt).toLocaleString());
      // Play sound immediately for new placed orders
      playKitchenNotification();
      // Refresh orders immediately
      loadOrders(false);
    });

    socketRef.current.on('order-updated', (data: any) => {
      console.log('📡 Order updated event received in Orders:', data);
      // Refresh orders immediately for any status updates
      loadOrders(false);
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Orders WebSocket disconnected');
      setIsConnected(false);
      // socket.io handles reconnection automatically via reconnection: true
    });

    socketRef.current.on('connect_error', (error: any) => {
      console.error('🔌 Orders WebSocket connection error:', error);
      setIsConnected(false);
    });
  }, [restaurant?.id]);

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (restaurant) {
      // Enable WebSocket for both development and production (now supported on Render)
      console.log('🔌 Enabling WebSocket for real-time updates');

      // Load initial orders
      loadOrders();

      // Connect WebSocket
      connectWebSocket();

      // Keep polling as fallback (less frequent for reliability)
      const interval = setInterval(() => loadOrders(false), 30000); // Poll every 30s as fallback

      return () => {
        clearInterval(interval);
        disconnectWebSocket();
      };
    } else {
      disconnectWebSocket();
    }
  }, [restaurant]);

  // --- Actions ---
  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (updatingOrders[orderId]) return;

    setUpdatingOrders(prev => ({ ...prev, [orderId]: true }));

    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      toast.success(`Order marked as ${newStatus}`);
      // Update UI state only after successful API call
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setUpdatingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // --- Filtering ---
  const activeOrders = orders.filter(o => ['placed', 'preparing', 'ready'].includes(o.status));
  const historyOrders = orders.filter(o => ['served', 'cancelled'].includes(o.status));

  // Kanban Columns
  const columns = {
    new: activeOrders.filter(o => o.status === 'placed'),
    cooking: activeOrders.filter(o => o.status === 'preparing'),
    ready: activeOrders.filter(o => o.status === 'ready'),
  };

  if (loading && !orders.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#d5b263] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-sm text-zinc-500 font-bold animate-pulse tracking-wide">SYNCING TICKETS...</p>
      </div>
    );
  }

  if (dashboardLoading || !user || !restaurant) {
    return <div className="h-full bg-black animate-pulse"></div>;
  }

  if (!user || !canUserViewOrders(user)) {
    return <div className="p-8 text-center text-zinc-500 font-bold">Access Denied</div>;
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-black overflow-hidden -mt-2">

      {/* 1. KDS Header - Apple Style Glassmorphism */}
      <header className="bg-black/90 backdrop-blur-xl border-b border-zinc-900 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 z-20 supports-[backdrop-filter]:bg-black/70 relative">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1 flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-[#d5b263]" />
              Kitchen Display
            </h1>
            <div className="mt-2">
              <ConnectionStatus isConnected={isConnected} />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-900">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-xl shadow-sm border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-sm font-bold text-zinc-300">{columns.new.length} New</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-xl shadow-sm border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span className="text-sm font-bold text-zinc-300">{columns.cooking.length} Cooking</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* iOS-Style Segmented Controls */}
          <div className="flex bg-zinc-950 p-1 rounded-2xl relative border border-zinc-900 shadow-inner">
            <button
              onClick={() => setViewMode('kanban')}
              className={`relative z-10 px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${viewMode === 'kanban' ? 'text-black shadow-sm bg-[#d5b263]' : 'text-zinc-400 hover:text-white'}`}
              title="Kanban View"
            >
              <Columns size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`relative z-10 px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${viewMode === 'list' ? 'text-black shadow-sm bg-[#d5b263]' : 'text-zinc-400 hover:text-white'}`}
              title="List View"
            >
              <Utensils size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <div className="h-8 w-px bg-zinc-800 mx-1 hidden md:block"></div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCompactMode(!compactMode)}
              className={`p-2.5 rounded-xl transition-all duration-200 border ${compactMode ? 'bg-[#d5b263] text-black border-[#d5b263] shadow-md' : 'bg-zinc-900 text-zinc-450 hover:bg-zinc-800 hover:text-white border-zinc-800 shadow-sm'}`}
              title="Toggle Compact Mode"
            >
              {compactMode ? <Maximize2 size={18} strokeWidth={2.5} /> : <Minimize2 size={18} strokeWidth={2.5} />}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2.5 rounded-xl transition-all duration-200 border ${showHistory ? 'bg-[#d5b263] text-black border-[#d5b263] shadow-md' : 'bg-zinc-900 text-zinc-450 hover:bg-zinc-800 hover:text-white border-zinc-800 shadow-sm'}`}
              title="History"
            >
              <History size={18} strokeWidth={2.5} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setRefreshing(true); loadOrders(false); }}
              className={`p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm text-zinc-450 hover:bg-zinc-800 hover:text-white transition-all duration-200 ${refreshing ? 'animate-spin text-blue-500' : ''}`}
              title="Refresh Queue"
            >
              <RefreshCw size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-black">
        {showHistory ? (
          // History View
          <div className="h-full overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <h2 className="text-xl font-black text-white mb-6 tracking-tight">Completed Orders (Last 24h)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {historyOrders.map(order => (
                <div key={order.id} className="bg-zinc-900/40 p-5 rounded-3xl border border-zinc-800/80 shadow-sm transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border
                        ${order.status === 'served' ? 'bg-zinc-950 text-zinc-300 border-zinc-850 shadow-sm' : 'bg-red-950/40 text-red-400 border-red-900/30 shadow-sm'}
                      `}>
                        {(order.tableNumber !== null && order.tableNumber !== undefined) ? `T${order.tableNumber}` : 'D'}
                      </div>
                      <div>
                        <span className="font-black text-lg text-white leading-none block">Table {order.tableNumber || 'Direct'}</span>
                        <span className="block text-xs font-bold text-zinc-500 mt-0.5 uppercase tracking-widest">ID: {order.id.slice(-4)}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg border ${order.status === 'served' ? 'bg-zinc-950 text-zinc-300 border-zinc-850' : 'bg-red-950/40 text-red-400 border-red-900/30'}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-zinc-500 mb-4 pb-4 border-b border-zinc-850 flex items-center gap-2">
                    <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.items.length} Items
                  </p>
                  <ul className="text-sm space-y-2.5 line-clamp-3">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`w-5 h-5 flex items-center justify-center rounded border text-xs font-black shrink-0 mt-0.5
                           ${item.quantity > 1 ? 'bg-red-950/40 text-red-400 border-red-900/30' : 'bg-zinc-950 text-zinc-400 border-zinc-850'}`}
                        >
                           {item.quantity}
                        </span>
                        <span className="font-bold text-zinc-300 leading-snug">{item.menuItemName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {historyOrders.length === 0 && (
                <div className="col-span-full py-16 text-center text-zinc-500 font-bold bg-zinc-900/10 rounded-3xl border border-dashed border-zinc-800/80">
                  <History size={48} className="mx-auto mb-4 opacity-20 text-[#d5b263]" />
                  No order history found for today.
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'list' ? (
          // List View - Clean Apple-style table
          <div className="h-full overflow-y-auto p-6 md:p-8 custom-scrollbar bg-black">
            <div className="max-w-7xl mx-auto rounded-3xl overflow-hidden border border-zinc-800/80 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-850">
                      <th className="px-6 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Order ID</th>
                      <th className="px-6 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Table</th>
                      <th className="px-6 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Items</th>
                      <th className="px-6 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 bg-zinc-900/10">
                    <AnimatePresence>
                      {activeOrders.map((order, index) => (
                        <motion.tr
                          key={order.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-5 text-sm font-bold text-zinc-500 uppercase tracking-wider">
                            #{order.id.slice(-6)}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[15px] border shadow-sm
                                ${order.status === 'placed' ? 'bg-blue-950/40 text-blue-400 border-blue-900/30' :
                                  order.status === 'preparing' ? 'bg-orange-950/40 text-orange-400 border-orange-900/30' :
                                    'bg-emerald-950/40 text-emerald-400 border-emerald-900/30'}
                              `}>
                                {(order.tableNumber !== null && order.tableNumber !== undefined) ? `T${order.tableNumber}` : 'D'}
                              </div>
                              <span className="font-black text-white tracking-tight text-lg">
                                {(order.tableNumber !== null && order.tableNumber !== undefined) ? `Table ${order.tableNumber}` : 'Direct'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-widest border uppercase shadow-sm ${order.status === 'placed' ? 'bg-blue-950/40 text-blue-400 border-blue-900/30' :
                              order.status === 'preparing' ? 'bg-orange-950/40 text-orange-400 border-orange-900/30' :
                                order.status === 'ready' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' :
                                  'bg-zinc-950 text-zinc-400 border-zinc-850'
                              }`}>
                              <span className={`w-2 h-2 rounded-full ${order.status === 'placed' ? 'bg-blue-500' :
                                order.status === 'preparing' ? 'bg-orange-500' :
                                  order.status === 'ready' ? 'bg-emerald-500' :
                                    'bg-zinc-500'
                                }`}></span>
                              {order.status}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm text-zinc-350 font-bold">
                            <div className="max-w-xs space-y-1">
                              {order.items.slice(0, 2).map((item, i) => (
                                <div key={i} className="flex items-center gap-2 truncate">
                                  <span className={`w-5 h-5 flex items-center justify-center rounded border text-xs font-black shrink-0
                                    ${item.quantity > 1 ? 'bg-red-950/40 text-red-400 border-red-900/30' : 'bg-zinc-950 text-zinc-400 border-zinc-850'}`}
                                  >
                                    {item.quantity}
                                  </span>
                                  <span>{item.menuItemName}</span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-xs text-[#d5b263] font-black mt-2 inline-block px-2 py-0.5 bg-[#d5b263]/10 rounded hidden">
                                  +{order.items.length - 2} MORE ITEMS
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <OrderTimer createdAt={order.createdAt} status={order.status} />
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                    {activeOrders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center text-zinc-500 font-medium">
                          <div className="flex flex-col items-center gap-2">
                            <Utensils size={32} className="opacity-20 mb-2 text-[#d5b263]" />
                            <p>No active orders</p>
                            <p className="text-xs text-zinc-650">Waiting for new tickets...</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : viewMode === 'kanban' ? (
          // Kanban View - Ticket Columns
          <div className="h-full flex overflow-x-auto p-4 gap-6 snap-x custom-scrollbar bg-black">
            {/* Column 1: New Orders */}
            <div className="flex-1 min-w-[340px] max-w-[420px] flex flex-col snap-center">
              <div className="pb-3 px-1 sticky top-0 bg-black z-10 flex justify-between items-center border-b border-zinc-900/50 mb-4">
                <h2 className="font-black text-white text-lg flex items-center gap-2 tracking-tight">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                  NEW ORDERS
                </h2>
                <span className="bg-zinc-900 px-2.5 py-0.5 rounded-full text-xs font-black text-white border border-zinc-800 shadow-sm">
                  {columns.new.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-20 space-y-4">
                <AnimatePresence>
                  {columns.new.map(order => (
                    <KitchenCard key={order.id} order={order} onUpdateStatus={handleStatusUpdate} isUpdating={updatingOrders[order.id]} compact={compactMode} />
                  ))}
                </AnimatePresence>
                {columns.new.length === 0 && (
                  <div className="h-32 rounded-3xl border-2 border-dashed border-zinc-800/80 flex items-center justify-center text-zinc-600 font-bold mt-2">
                    Empty Queue
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Cooking */}
            <div className="flex-1 min-w-[340px] max-w-[420px] flex flex-col snap-center">
              <div className="pb-3 px-1 sticky top-0 bg-black z-10 flex justify-between items-center border-b border-zinc-900/50 mb-4">
                <h2 className="font-black text-white text-lg flex items-center gap-2 tracking-tight">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse"></span>
                  PREPARING
                </h2>
                <span className="bg-zinc-900 px-2.5 py-0.5 rounded-full text-xs font-black text-white border border-zinc-800 shadow-sm">
                  {columns.cooking.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-20 space-y-4">
                <AnimatePresence>
                  {columns.cooking.map(order => (
                    <KitchenCard key={order.id} order={order} onUpdateStatus={handleStatusUpdate} isUpdating={updatingOrders[order.id]} compact={compactMode} />
                  ))}
                </AnimatePresence>
                {columns.cooking.length === 0 && (
                  <div className="h-32 rounded-3xl border-2 border-dashed border-zinc-800/80 flex items-center justify-center text-zinc-600 font-bold mt-2">
                    No active prep
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Ready */}
            <div className="flex-1 min-w-[340px] max-w-[420px] flex flex-col snap-center">
              <div className="pb-3 px-1 sticky top-0 bg-black z-10 flex justify-between items-center border-b border-zinc-900/50 mb-4">
                <h2 className="font-black text-white text-lg flex items-center gap-2 tracking-tight">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                  READY TO SERVE
                </h2>
                <span className="bg-zinc-900 px-2.5 py-0.5 rounded-full text-xs font-black text-white border border-zinc-800 shadow-sm">
                  {columns.ready.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-20 space-y-4">
                <AnimatePresence>
                  {columns.ready.map(order => (
                    <KitchenCard key={order.id} order={order} onUpdateStatus={handleStatusUpdate} isUpdating={updatingOrders[order.id]} compact={compactMode} />
                  ))}
                </AnimatePresence>
                {columns.ready.length === 0 && (
                  <div className="h-32 rounded-3xl border-2 border-dashed border-zinc-800/80 flex items-center justify-center text-zinc-600 font-bold mt-2">
                    All clear
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Grid View
          <div className="h-full overflow-y-auto p-6 md:p-8 custom-scrollbar bg-black">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white tracking-tight">All Active Tickets</h2>
              <div className="flex items-center gap-4 text-sm font-bold bg-zinc-900 px-4 py-2 rounded-xl shadow-sm border border-zinc-800/80">
                <span className="text-zinc-400">Total: {activeOrders.length}</span>
                <div className="w-px h-4 bg-zinc-800"></div>
                <span className="text-red-500 flex items-center gap-1"><AlertCircle size={14} /> {activeOrders.filter(o => differenceInMinutes(new Date(), new Date(o.createdAt)) > 20).length} Urgent</span>
              </div>
            </div>

            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
            >
              <AnimatePresence>
                {activeOrders
                  // Sort by most urgent first for grid view
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map(order => (
                    <KitchenCard key={order.id} order={order} onUpdateStatus={handleStatusUpdate} isUpdating={updatingOrders[order.id]} compact={compactMode} />
                  ))}
              </AnimatePresence>
            </motion.div>

            {activeOrders.length === 0 && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/10 rounded-3xl border border-dashed border-zinc-800/80">
                <Utensils size={48} className="opacity-20 mb-4 text-[#d5b263]" />
                <p className="text-xl font-black tracking-tight text-white">No Active Tickets</p>
                <p className="font-medium mt-1 text-zinc-650">Take a breather, chef!</p>
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center bg-black">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#d5b263] border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-sm text-zinc-400 font-medium animate-pulse">Loading Orders...</p>
    </div>
  )
}
