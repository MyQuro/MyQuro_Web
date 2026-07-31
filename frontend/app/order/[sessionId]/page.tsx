"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { 
  ArrowLeft, Plus, Clock, CheckCircle, XCircle, 
  AlertCircle, Loader2, Receipt, UtensilsCrossed,
  MoreVertical, RefreshCcw
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatPrice, formatTime } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  status: 'placed' | 'preparing' | 'served' | 'cancelled';
  notes?: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  menuItemName: string;
  variantName: string;
  quantity: number;
  unitPriceSnapshot: number;
  totalPrice: number;
  itemNotes?: string;
  extras?: Array<{
    extraId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface TableSession {
  id: string;
  tableNumber: number;
  restaurantId: string;
  restaurantName: string;
  status: 'active' | 'payment_pending' | 'closed';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  createdAt: string;
}

export default function ActiveOrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string || searchParams?.get('session');
  
  const [session, setSession] = useState<TableSession | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadSessionData, 30000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const loadSessionData = async (showLoader = true) => {
    try {
      if (!sessionId) {
        toast.error('Invalid session ID');
        router.push('/home');
        return;
      }

      if (showLoader) setLoading(true);
      else setRefreshing(true);

      const [sessionData, ordersData, totalData] = await Promise.all([
        apiClient.getTableSession(sessionId),
        apiClient.getSessionOrders(sessionId),
        apiClient.getSessionTotal(sessionId)
      ]);

      setSession(sessionData as any);
      setOrders((ordersData as any).orders || []);
      setTotalAmount((totalData as any).totalAmount || 0);
    } catch (error: any) {
      console.error('Failed to load session:', error);
      toast.error(error.message || 'Failed to load session');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await apiClient.cancelOrder(orderId);
      toast.success('Order cancelled');
      loadSessionData(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    }
  };

  const handleRequestBill = () => {
    if (orders.length === 0) {
      toast.error('No orders to bill');
      return;
    }
    router.push(`/order/${sessionId}/payment`);
  };

  const handleAddMore = () => {
    if (session) {
      router.push(`/restro/${session.restaurantId}/menu?session=${sessionId}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'served': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed': return <Clock className="w-4 h-4" />;
      case 'preparing': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'served': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-600 mb-6">The order session you're looking for doesn't exist or has been closed.</p>
          <Link 
            href="/explore"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
          >
            Browse Restaurants
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <button
              onClick={() => loadSessionData(false)}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCcw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{session.restaurantName}</h1>
              <p className="text-gray-500">Table {session.tableNumber}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Session Status</div>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                session.status === 'active' ? 'bg-green-100 text-green-800' :
                session.status === 'payment_pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {session.status === 'active' ? 'Active' : session.status === 'payment_pending' ? 'Payment Pending' : 'Closed'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* Orders */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-500 mb-6">Start by adding items from the menu</p>
            <button
              onClick={handleAddMore}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border overflow-hidden">
                {/* Order Header */}
                <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500">#{order.orderNumber}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatTime(order.createdAt)}
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4 space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.menuItemName}</h4>
                        <p className="text-sm text-gray-500">{item.variantName}</p>
                        {item.extras && item.extras.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.extras.map((extra, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  + {extra.name} ×{extra.quantity}
                                </span>
                                <span className="text-xs text-gray-500">{formatPrice(extra.totalPrice)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {item.itemNotes && (
                          <p className="text-xs text-gray-400 mt-1">Note: {item.itemNotes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatPrice(item.totalPrice)}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}

                  {order.notes && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-500">Order note: {order.notes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {order.status === 'placed' && (
                  <div className="p-4 bg-gray-50 border-t">
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Cancel Order
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Total Summary */}
        {orders.length > 0 && (
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold text-gray-900">Current Total</span>
              <span className="text-2xl font-bold text-gray-900">{formatPrice(totalAmount)}</span>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleAddMore}
                disabled={session.status !== 'active'}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 px-4 rounded-xl border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Add More Items
              </button>
              
              <button
                onClick={handleRequestBill}
                disabled={session.paymentStatus === 'paid' || orders.some(o => o.status === 'placed' || o.status === 'preparing')}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Receipt className="w-5 h-5" />
                Request Bill & Pay
              </button>
            </div>

            {orders.some(o => o.status === 'placed' || o.status === 'preparing') && (
              <p className="text-xs text-gray-500 text-center mt-3">
                Please wait for all orders to be served before requesting the bill
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
