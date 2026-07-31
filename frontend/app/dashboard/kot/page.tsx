"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { ChefHat, Clock, Check, AlertCircle, Flame, Package, RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';

interface OrderItem {
  id: string;
  menuItemName: string;
  variantName: string;
  portionSize?: string;
  isVeg?: boolean;
  quantity: number;
  notes?: string | null;
  extras?: Array<{
    extraId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface KOTOrder {
  orderId: string;
  tableNumber: number;
  status: 'placed' | 'preparing' | 'served';
  createdAt: string;
  items: OrderItem[];
}

export default function KOTPage() {
  const { user, restaurant, isLoading: dashboardLoading } = useDashboard();
  const [orders, setOrders] = useState<KOTOrder[]>([]);
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'placed' | 'preparing'>('all');
  const [, setTick] = useState(0); // Force re-render every minute for timers

  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: Play kitchen notification sound
  const playKitchenNotification = useCallback(() => {
    try {
      console.log('🔊 Playing kitchen notification sound');
      const audio = new Audio('/notification.mp3');
      audio.volume = 1.0;
      audio.preload = 'auto';

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Failed to play kitchen notification sound:', error);
          setTimeout(() => {
            audio.play().catch(e => console.error('Fallback play failed:', e));
          }, 100);
        });
      }
    } catch (error) {
      console.error('Error creating kitchen notification audio:', error);
    }
  }, []);

  // Helper: Calculate elapsed time
  const getElapsedMinutes = (timestamp: string): number => {
    return Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000 / 60);
  };

  if (dashboardLoading || !user || !restaurant) {
    return <SkeletonLoader />;
  }

  // Helper: Get urgency color based on elapsed time
  const getUrgencyColor = (minutes: number): string => {
    if (minutes < 5) return 'text-green-400';
    if (minutes < 10) return 'text-yellow-400';
    if (minutes < 15) return 'text-orange-400';
    return 'text-red-400 animate-pulse';
  };

  const loadOrders = useCallback(async (showLoading = true) => {
    if (!restaurant) return;
    try {
      if (showLoading) setLoading(true);

      // Use server-side filtering to fetch only active orders
      const data: any = await apiClient.getRestaurantOrders(restaurant.id, {
        status: 'placed,preparing',
        limit: 100 // Fetch up to 100 active orders, which should be sufficient for KOT
      });

      const kitchenOrders = (data.orders || [])
        // Sort: placed first, then by time
        .sort((a: any, b: any) => {
          if (a.status === 'placed' && b.status !== 'placed') return -1;
          if (a.status !== 'placed' && b.status === 'placed') return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      // Deduplication: sound alert if there are genuinely new orders placed
      const previousOrderIds = new Set(orders.map(o => o.orderId));
      const newPlacedOrders = kitchenOrders.filter((order: KOTOrder) =>
        order.status === 'placed' && !previousOrderIds.has(order.orderId)
      );

      if (newPlacedOrders.length > 0 && !showLoading) {
        console.log('🆕 Kitchen: New placed orders detected:', newPlacedOrders.length);
        playKitchenNotification();
      }

      setOrders(kitchenOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to sync orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurant, orders, playKitchenNotification]);

  // Timer tick every minute to update elapsed times
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 60000); // Every 60 seconds
    return () => clearInterval(timer);
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!restaurant?.id) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ||
      (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')
        ? 'https://myquro-web.onrender.com'
        : 'http://localhost:4000');
    const socketUrl = backendUrl.replace(/^http/, 'ws');

    const cookies = document.cookie.split(';');
    let sessionToken = null;
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'better-auth.session_token' || name.endsWith('better-auth.session_token')) {
        sessionToken = value;
        break;
      }
    }

    socketRef.current = io(socketUrl, {
      auth: { sessionToken },
      withCredentials: true,
      transports: ['polling', 'websocket'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 Kitchen WebSocket connected');
      setIsConnected(true);
      socketRef.current?.emit('join-restaurant', restaurant.id);
    });

    socketRef.current.on('order-created', () => {
      console.log('📡 Order created event received in Kitchen');
      playKitchenNotification();
      loadOrders(false);
    });

    socketRef.current.on('order-updated', () => {
      console.log('📡 Order updated event received in Kitchen');
      loadOrders(false);
    });

    socketRef.current.on('disconnect', () => {
      console.log('🔌 Kitchen WebSocket disconnected');
      setIsConnected(false);
      // socket.io handles reconnection automatically via reconnection: true
    });

    socketRef.current.on('connect_error', (error: any) => {
      console.error('🔌 Kitchen WebSocket connection error:', error);
      setIsConnected(false);
    });
  }, [restaurant?.id, loadOrders, playKitchenNotification]);

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
      loadOrders();
      connectWebSocket();
      // Keep slow polling as a final fallback
      const interval = setInterval(() => loadOrders(false), 30000);
      return () => {
        clearInterval(interval);
        disconnectWebSocket();
      };
    } else {
      disconnectWebSocket();
    }
  }, [restaurant, connectWebSocket, disconnectWebSocket, loadOrders]);

  const handleStatusUpdate = async (orderId: string, newStatus: 'preparing' | 'served') => {
    if (updatingOrders[orderId]) return;

    setUpdatingOrders(prev => ({ ...prev, [orderId]: true }));

    try {
      await apiClient.updateOrderStatus(orderId, newStatus);
      toast.success(`Order ${newStatus === 'preparing' ? 'started cooking' : 'served'}!`);
      // Update UI state only after successful API call
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: newStatus } : o));
      loadOrders(false);
    } catch (error: any) {
      toast.error('Update failed');
    } finally {
      setUpdatingOrders(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders(false);
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const placedCount = orders.filter(o => o.status === 'placed').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <ChefHat className="w-16 h-16 text-orange-500 animate-bounce mx-auto mb-4" />
          <p className="text-white text-lg">Loading kitchen orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black flex items-center gap-3">
            <ChefHat className="w-10 h-10 text-orange-500" />
            Kitchen Display System
          </h1>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${isConnected
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
            >
              {isConnected ? (
                <>
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </div>
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} className="opacity-70" />
                  <span>Offline</span>
                </>
              )}
            </motion.div>
            <span className="text-gray-400 flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-500" />
              {placedCount} New Orders
            </span>
            <span className="text-gray-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-yellow-500" />
              {preparingCount} Cooking
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Buttons */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filter === 'all' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setFilter('placed')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filter === 'placed' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
            >
              New ({placedCount})
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filter === 'preparing' ? 'bg-yellow-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
            >
              Cooking ({preparingCount})
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center text-gray-500">
          <Package className="w-24 h-24 mb-4 opacity-50" />
          <p className="text-xl font-bold">No orders in queue</p>
          <p className="text-sm mt-2">Kitchen is clear! 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredOrders.map((order) => {
            const elapsedMinutes = getElapsedMinutes(order.createdAt);
            const urgencyColor = getUrgencyColor(elapsedMinutes);

            return (
              <div
                key={order.orderId}
                className={`rounded-2xl border-2 overflow-hidden transition-all ${order.status === 'placed'
                  ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/20'
                  : 'border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/20'
                  }`}
              >
                {/* KOT Header */}
                <div className={`p-4 ${order.status === 'placed' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-5xl font-black">T{order.tableNumber}</div>
                    <div className="text-right">
                      <div className={`text-3xl font-black ${urgencyColor}`}>
                        {elapsedMinutes}m
                      </div>
                      <div className="text-xs opacity-75 font-medium">Elapsed</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <div className="flex items-center gap-2">
                      {order.status === 'placed' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Flame className="w-4 h-4" />
                      )}
                      <span className="uppercase">{order.status}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 bg-gray-800 space-y-3">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-900 rounded-lg p-3 border border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {item.isVeg !== undefined && (
                            <div className={`w-5 h-5 border-2 flex items-center justify-center rounded shrink-0 mt-0.5 ${item.isVeg ? 'border-green-400' : 'border-red-400'}`}>
                              <div className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-green-400' : 'bg-red-400'}`} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black text-white leading-tight">{item.menuItemName}</h3>
                            <p className="text-sm text-gray-400 mt-0.5">
                              {item.variantName}
                              {item.portionSize && ` • ${item.portionSize}`}
                            </p>
                            {item.extras && item.extras.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.extras.map((extra, index) => (
                                  <p key={index} className="text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded inline-block border border-blue-500/30 mr-1">
                                    + {extra.quantity}x {extra.name}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-3xl font-black text-orange-400 shrink-0">×{item.quantity}</div>
                      </div>

                      {item.notes && (
                        <div className="mt-2 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-200 text-xs">
                          <span className="font-bold">Note:</span> {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="p-4 bg-gray-800 border-t border-gray-700">
                  {order.status === 'placed' && (
                    <button
                      onClick={() => handleStatusUpdate(order.orderId, 'preparing')}
                      disabled={updatingOrders[order.orderId]}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-60 text-white font-black py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg disabled:cursor-not-allowed"
                    >
                      {updatingOrders[order.orderId] ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          STARTING...
                        </>
                      ) : (
                        <>
                          <ChefHat className="w-6 h-6" />
                          START COOKING
                        </>
                      )}
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleStatusUpdate(order.orderId, 'served')}
                      disabled={updatingOrders[order.orderId]}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-60 text-white font-black py-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg disabled:cursor-not-allowed"
                    >
                      {updatingOrders[order.orderId] ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          SERVING...
                        </>
                      ) : (
                        <>
                          <Check className="w-6 h-6" />
                          READY TO SERVE
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Kitchen Orders...</p>
    </div>
  )
}
