"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/session-context';
import { Loader2, Receipt, Clock, Users, MapPin, ShoppingCart, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OrderItem {
  orderItemId: string;
  menuItemName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemStatus: string;
  notes: string | null;
}

interface Order {
  orderId: string;
  orderStatus: string;
  orderNotes: string | null;
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  createdAt: string;
  items: OrderItem[];
}

interface SessionDetails {
  session: {
    sessionId: string;
    tableId: string | null;
    tableNumber: string | null;
    restaurantId: string;
    status: string;
    paymentStatus: string;
    startedAt: string;
    calculatedSubtotal: number;
    calculatedDiscount: number;
    calculatedGst: number;
    calculatedGrandTotal: number;
  };
  orders: Order[];
  summary: {
    totalOrders: number;
    totalItems: number;
    subtotal: number;
    discount: number;
    gst: number;
    grandTotal: number;
  };
}

export default function SessionSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const { session: contextSession } = useSession();
  
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const sessionId = sessionIdParam || contextSession?.sessionId;

  useEffect(() => {
    if (!sessionId) {
      setError('No active session found');
      setLoading(false);
      return;
    }

    fetchSessionDetails();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSessionDetails, 30000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      const response = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session details');
      }

      const data = await response.json();
      console.log('Session details:', data);

      if (data.success) {
        setSessionDetails(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch session');
      }
    } catch (error: any) {
      console.error('Error fetching session:', error);
      setError(error.message || 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (newStatus: 'unpaid' | 'partial' | 'paid') => {
    if (!sessionId) return;
    
    setUpdatingPayment(true);
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      const response = await fetch(`${BACKEND_URL}/api/sessions/update-payment-status/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ paymentStatus: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }

      const data = await response.json();
      if (data.success) {
        alert(`Payment status updated to ${newStatus}`);
        fetchSessionDetails(); // Refresh session data
      } else {
        throw new Error(data.message || 'Failed to update payment status');
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      alert(error.message || 'Failed to update payment status');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleCloseSession = async () => {
    if (!sessionId) return;
    
    // Check if payment is made before closing
    if (sessionDetails?.session.paymentStatus === 'unpaid') {
      if (!confirm('Payment is not yet received. Are you sure you want to close this session? Please update payment status first.')) {
        return;
      }
    }
    
    if (!confirm('Are you sure you want to close this session? This will unlock the table and make it available.')) {
      return;
    }

    setClosing(true);
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      const response = await fetch(`${BACKEND_URL}/api/sessions/close-session/${sessionId}`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to close session');
      }

      const data = await response.json();
      if (data.success) {
        alert('Session closed successfully. Table is now available.');
        localStorage.removeItem('activeSession');
        router.push('/explore');
      } else {
        throw new Error(data.message || 'Failed to close session');
      }
    } catch (error: any) {
      console.error('Error closing session:', error);
      alert(error.message || 'Failed to close session');
    } finally {
      setClosing(false);
    }
  };

  const formatPrice = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed':
        return 'bg-blue-100 text-blue-700';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-700';
      case 'served':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed':
        return <Clock className="w-4 h-4" />;
      case 'preparing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'served':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load session details'}</p>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  const { session, orders, summary } = sessionDetails;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Session Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {session.tableNumber ? `Table ${session.tableNumber}` : 'Takeaway Order'}
                </h1>
                <p className="text-sm text-gray-500">
                  Started {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                session.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {session.status.toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                session.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {session.paymentStatus.toUpperCase()}
              </span>
            </div>
          </div>

          {session.tableNumber && (
            <div className="flex items-center space-x-6 text-sm text-gray-600 pt-4 border-t">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                <span>Table {session.tableNumber}</span>
              </div>
              <div className="flex items-center">
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span>{summary.totalOrders} orders</span>
              </div>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                <span>{summary.totalItems} items</span>
              </div>
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Orders</h2>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders placed yet</p>
              <button
                onClick={() => router.push(`/restro/${session.restaurantId}/menu?session=${sessionId}`)}
                className="mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order, index) => (
                <div key={order.orderId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500">Order #{index + 1}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(order.orderStatus)}`}>
                        {getStatusIcon(order.orderStatus)}
                        <span>{order.orderStatus}</span>
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-3">
                    {order.items.map((item) => (
                      <div key={item.orderItemId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.menuItemName}</p>
                          <p className="text-sm text-gray-500">{item.variantName}</p>
                          {item.notes && (
                            <p className="text-xs text-gray-400 italic mt-1">Note: {item.notes}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm text-gray-600">x{item.quantity}</p>
                          <p className="font-medium text-gray-900">{formatPrice(item.totalPrice)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Total */}
                  <div className="pt-3 border-t space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatPrice(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST</span>
                      <span className="text-gray-900">{formatPrice(order.gst)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
                      <span>Total</span>
                      <span>{formatPrice(order.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session Total */}
        {orders.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Session Total</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatPrice(summary.subtotal)}</span>
              </div>
              
              {summary.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Total Discount</span>
                  <span className="font-medium">-{formatPrice(summary.discount)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-gray-600">
                <span>Total GST</span>
                <span className="font-medium">{formatPrice(summary.gst)}</span>
              </div>
              
              <div className="pt-3 border-t flex justify-between text-xl font-bold text-gray-900">
                <span>Grand Total</span>
                <span className="text-red-600">{formatPrice(summary.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Status Management */}
            {session.status === 'active' && (
              <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Payment Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    session.paymentStatus === 'paid' 
                      ? 'bg-green-100 text-green-700' 
                      : session.paymentStatus === 'partial'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {session.paymentStatus.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-xs text-gray-600 mb-3">
                  Update payment status after receiving payment from customer (offline)
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdatePaymentStatus('unpaid')}
                    disabled={updatingPayment || session.paymentStatus === 'unpaid'}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Unpaid
                  </button>
                  <button
                    onClick={() => handleUpdatePaymentStatus('partial')}
                    disabled={updatingPayment || session.paymentStatus === 'partial'}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Partial
                  </button>
                  <button
                    onClick={() => handleUpdatePaymentStatus('paid')}
                    disabled={updatingPayment || session.paymentStatus === 'paid'}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Paid
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => router.push(`/restro/${session.restaurantId}/menu?session=${sessionId}`)}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Add More Items
              </button>
              
              {session.status === 'active' && (
                <button
                  onClick={handleCloseSession}
                  disabled={closing}
                  className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {closing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Closing...
                    </>
                  ) : (
                    'Close Session & Unlock Table'
                  )}
                </button>
              )}
            </div>

            {session.status === 'active' && session.paymentStatus === 'unpaid' && (
              <p className="text-sm text-amber-600 text-center mt-4 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                ⚠️ Payment not received. Session can still be closed but update payment status first for better tracking.
              </p>
            )}

            {session.status === 'closed' && (
              <p className="text-sm text-gray-500 text-center mt-4">
                This session has been closed. Table is now available.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
