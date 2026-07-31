"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/lib/dashboard-context';
import {
  ShoppingCart, AlertTriangle, RefreshCw, Users, ShoppingBag
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { useWebSocket } from '@/lib/websocket-context';
import toast from 'react-hot-toast';

interface Table {
  id: string;
  tableNumber: number;
  liveStatus: 'available' | 'occupied' | 'reserved';
  capacity: number;
  activeSession?: {
    id: string;
    orderCount: number;
    isBilled: boolean;
  };
}

interface SessionOrder {
  id: string;
  status: string;
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
  placedByUserId: string | null;
  placedByName: string | null;
  notes: string | null;
  items: Array<{
    orderId: string;
    menuItemId: string;
    menuItemName: string;
    variantId: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    status: string;
    notes: string | null;
  }>;
  itemCount: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const { restaurant, isLoading: dashboardLoading } = useDashboard();
  const { isConnected } = useWebSocket();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [sessionOrders, setSessionOrders] = useState<SessionOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (restaurant) {
      loadData();
    }
  }, [restaurant]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!restaurant) return;

    const handleOrderCreated = (data: any) => {
      console.log('🆕 ORDER CREATED (NEW ORDER):', data);
      if (data.restaurantId === restaurant.id) {
        // Table status might change when new orders are placed
        setTimeout(() => loadData(), 1000);
      }
    };

    const handlePaymentRecorded = (data: any) => {
      console.log('💰 PAYMENT RECORDED (NEW ORDER):', data);
      if (data.restaurantId === restaurant.id) {
        // Table might become available after payment
        setTimeout(() => loadData(), 1000);
      }
    };

    // WebSocket disabled - event listeners removed
    // socket.on('order-created', handleOrderCreated);
    // socket.on('payment-recorded', handlePaymentRecorded);

    return () => {
      // WebSocket disabled - no cleanup needed
      // socket.off('order-created', handleOrderCreated);
      // socket.off('payment-recorded', handlePaymentRecorded);
    };
  }, [restaurant]);

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  const loadData = async () => {
    if (!restaurant) return;
    try {
      setLoading(true);
      const tablesData: any = await apiClient.getTables(restaurant.id);
      setTables(tablesData.tables || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionOrders = async (sessionId: string) => {
    try {
      setLoadingOrders(true);
      const response = await apiClient.getPastSessionDetails(sessionId);
      if (response.success && response.orders) {
        setSessionOrders(response.orders);
      } else {
        setSessionOrders([]);
      }
    } catch (error) {
      console.error('Error loading session orders:', error);
      setSessionOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleResetTable = async (tableId: string) => {
    if (!confirm('⚠️ EMERGENCY RESET: This will close all active sessions, unlock table and QR. Continue?')) return;

    setResetting(tableId);
    try {
      await apiClient.resetTable(tableId);
      toast.success('Table reset successfully!');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset table');
    } finally {
      setResetting(null);
    }
  };

  const availableTables = tables.filter(t => t.liveStatus === 'available');
  const occupiedTables = tables.filter(t => t.liveStatus === 'occupied');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D32F2F] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <ShoppingCart className="w-10 h-10 text-blue-600" />
              New Order
            </h1>
            <p className="text-sm font-medium text-gray-500 mt-2">Select an available table to begin a new session</p>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {tables.map(table => (
              <button
                key={table.id}
                onClick={async () => {
                  // Show confirmation modal for occupied tables
                  if (table.liveStatus === 'occupied' && table.activeSession) {
                    setSelectedTable(table);
                    setJoinModalOpen(true);
                    // Load session orders
                    loadSessionOrders(table.activeSession.id);
                    return;
                  }

                  // Create session for available/reserved tables
                  try {
                    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
                    const response = await fetch(`${BACKEND_URL}/api/sessions/manual-start`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        tableId: table.id,
                        restaurantId: restaurant!.id,
                      }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      if (data.success) {
                        toast.success('Session created for Table ' + table.tableNumber);
                        router.push(`/dashboard/new-order/menu?sessionId=${data.data.sessionId}&tableId=${table.id}&tableNumber=${table.tableNumber}`);
                      }
                    } else {
                      toast.error('Failed to create session');
                    }
                  } catch (error) {
                    toast.error('Failed to create session');
                  }
                }}
                className={`relative aspect-square rounded-3xl border-2 font-black transition-all duration-300 hover:-translate-y-1 flex flex-col items-center justify-center gap-3 p-4 overflow-hidden group ${table.liveStatus === 'available'
                  ? 'bg-white border-green-200 hover:border-green-400 shadow-sm hover:shadow-xl text-gray-900 ring-2 ring-transparent hover:ring-green-100'
                  : table.liveStatus === 'occupied'
                    ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-500 text-white shadow-md hover:shadow-xl hover:shadow-red-200'
                    : 'bg-gradient-to-br from-orange-400 to-orange-500 border-orange-400 text-white shadow-md hover:shadow-xl hover:shadow-orange-200'
                  }`}
              >
                {/* Available State Decoration (Subtle animated outline on hover) */}
                {table.liveStatus === 'available' && (
                  <div className="absolute inset-0 border-2 border-green-500 rounded-3xl opacity-0 group-hover:opacity-100 scale-105 group-hover:scale-100 transition-all duration-300"></div>
                )}

                {/* Status Badge */}
                <div className={`absolute top-4 right-4 w-3 h-3 rounded-full shadow-sm ${table.liveStatus === 'available'
                  ? 'bg-green-500'
                  : table.liveStatus === 'occupied'
                    ? 'bg-red-300 animate-pulse'
                    : 'bg-orange-200'
                  }`} />

                {/* Active Session Indicator for Occupied Tables */}
                {table.liveStatus === 'occupied' && table.activeSession && (
                  <div className="absolute top-3 left-3 bg-black/20 backdrop-blur-md text-white border border-white/20 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{table.activeSession.orderCount}</span>
                  </div>
                )}

                {/* Table Number */}
                <div className={`text-5xl font-black tracking-tighter ${table.liveStatus === 'available' ? 'text-gray-800 group-hover:text-green-600 transition-colors' : 'text-white'}`}>
                  {table.tableNumber}
                </div>

                {/* Capacity */}
                <div className={`flex items-center gap-1.5 text-sm font-bold bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full ${table.liveStatus === 'available' ? 'text-gray-500 bg-gray-100' : 'text-white border border-white/20'
                  }`}>
                  <Users className="w-4 h-4" />
                  <span>{table.capacity} Pax</span>
                </div>
              </button>
            ))}
          </div>

          {tables.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200 mt-8">
              <div className="bg-gray-50 p-6 rounded-full mb-4"><AlertTriangle className="w-12 h-12 text-gray-300" /></div>
              <h3 className="text-xl font-black tracking-tight text-gray-500">No tables configured</h3>
              <p className="font-medium mt-1">Please add tables to your restaurant first</p>
            </div>
          )}

          {/* Legend */}
          <div className="mt-10 bg-white rounded-3xl shadow-sm border border-gray-100/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="font-bold text-gray-900 tracking-tight">Table Overview</h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              <div className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl">
                <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm shadow-green-200"></div>
                <span className="text-sm font-bold text-gray-700">Available <span className="text-gray-400 ml-1">({availableTables.length})</span></span>
              </div>
              <div className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl">
                <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm shadow-red-200"></div>
                <span className="text-sm font-bold text-gray-700">Occupied <span className="text-gray-400 ml-1">({occupiedTables.length})</span></span>
              </div>
              <div className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl">
                <div className="w-3 h-3 bg-orange-500 rounded-full shadow-sm shadow-orange-200"></div>
                <span className="text-sm font-bold text-gray-700">Reserved <span className="text-gray-400 ml-1">({tables.filter(t => t.liveStatus === 'reserved').length})</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Reset Section */}
        {/* {occupiedTables.length > 0 && (
          <div className="mt-8 bg-red-50 border-2 border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
              <div>
                <h2 className="text-xl font-black text-red-900">Emergency Table Reset</h2>
                <p className="text-sm text-red-700">Reset stuck or problematic tables</p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {occupiedTables.map(table => (
                <button
                  key={table.id}
                  onClick={() => handleResetTable(table.id)}
                  disabled={resetting === table.id}
                  className="aspect-square rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black text-lg transition-colors flex flex-col items-center justify-center shadow-md"
                >
                  {resetting === table.id ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <span className="text-xs">T</span>
                      <span>{table.tableNumber}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )} */}
      </div>

      {/* Join Session Confirmation Modal */}
      {joinModalOpen && selectedTable && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[scale-in_0.2s_ease-out]">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white text-center relative">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <ShoppingBag className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
                  <ShoppingBag className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black tracking-tight mb-1">
                  Active Session
                </h3>
                <p className="text-blue-100 font-medium text-sm">
                  Table <span className="font-bold text-white px-1.5 py-0.5 bg-white/20 rounded-md mx-1">{selectedTable.tableNumber}</span> has an active order
                </p>
              </div>
            </div>

            <div className="p-6">
              {selectedTable.activeSession && (
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Current Orders</span>
                    <span className="text-2xl font-black text-gray-900">{selectedTable.activeSession.orderCount}</span>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-2xl p-4 border border-gray-100/50">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Bill Status</span>
                    <span className={`text-lg font-black flex items-center gap-1.5 ${selectedTable.activeSession.isBilled ? 'text-red-500' : 'text-green-500'}`}>
                      {selectedTable.activeSession.isBilled ? 'Billed' : 'Active'}
                    </span>
                  </div>
                </div>
              )}

              {/* Orders List */}
              {selectedTable.activeSession && (
                <div className="mb-6 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-500" />
                    Order History
                  </h4>

                  {loadingOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : sessionOrders.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm font-medium text-gray-500">No previous orders</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessionOrders.map((order, orderIndex) => (
                        <div key={order.id} className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm">
                          <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">
                                #{orderIndex + 1}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${order.status === 'completed' ? 'bg-green-50 text-green-600 border border-green-100' :
                                order.status === 'preparing' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                  order.status === 'pending' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                    'bg-gray-50 text-gray-600 border border-gray-100'
                                }`}>
                                {order.status}
                              </span>
                            </div>
                            <span className="text-sm font-black text-gray-900">
                              {formatPrice(order.grandTotal)}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {order.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex justify-between items-start text-sm">
                                <div className="flex gap-2">
                                  <span className="font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-xs h-fit">
                                    {item.quantity}x
                                  </span>
                                  <div>
                                    <p className="font-semibold text-gray-900 leading-none mt-1">{item.menuItemName}</p>
                                    {item.variantName && (
                                      <p className="text-xs font-medium text-gray-500 mt-0.5">{item.variantName}</p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-gray-600 font-bold text-xs mt-1">
                                  {formatPrice(item.totalPrice)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <div className="mt-3 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 p-2.5 rounded-xl">
                              <span className="font-bold flex items-center gap-1 mb-0.5"><AlertTriangle size={12} /> Notes</span>
                              {order.notes}
                            </div>
                          )}

                          <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                            <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {order.placedByName && (
                              <span>By {order.placedByName}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTable.activeSession?.isBilled ? (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
                  <p className="text-sm text-red-600 font-bold text-center flex items-center justify-center gap-2">
                    <AlertTriangle size={16} /> Bill Generated. No new orders allowed.
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-500 mb-6 text-center">
                  Add more items to this existing table session.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setJoinModalOpen(false);
                    setSelectedTable(null);
                    setSessionOrders([]);
                  }}
                  className="flex-1 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                {!selectedTable.activeSession?.isBilled && (
                  <button
                    onClick={async () => {
                      try {
                        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
                        const response = await fetch(`${BACKEND_URL}/api/sessions/manual-start`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          credentials: 'include',
                          body: JSON.stringify({
                            tableId: selectedTable.id,
                            restaurantId: restaurant!.id,
                          }),
                        });

                        if (response.ok) {
                          const data = await response.json();
                          if (data.success) {
                            toast.success('Joined session for Table ' + selectedTable.tableNumber);
                            router.push(`/dashboard/new-order/menu?sessionId=${data.data.sessionId}&tableId=${selectedTable.id}&tableNumber=${selectedTable.tableNumber}`);
                          }
                        } else {
                          toast.error('Failed to join session');
                        }
                      } catch (error) {
                        toast.error('Failed to join session');
                      }
                      setJoinModalOpen(false);
                      setSelectedTable(null);
                      setSessionOrders([]);
                    }}
                    className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95"
                  >
                    Join Session
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Tables...</p>
    </div>
  )
}