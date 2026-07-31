"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/lib/dashboard-context';
import {
  History,
  DollarSign,
  Clock,
  Receipt,
  ShoppingBag,
  Users,
  Calendar,
  Search,
  Filter,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
  Package
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { BillPrinter } from '@/lib/print-bill';
import { BillData } from '@/lib/thermal-printer';
import { formatPrice, getRelativeTime } from '@/lib/utils';
import { getRestaurantPermissions } from '@/lib/permissions';
import AccessDenied from '@/components/AccessDenied';
import toast from 'react-hot-toast';

interface PastOrder {
  id: string;
  sessionId: string;
  sessionTableId: string;
  sessionTableNumber: number;
  sessionRestaurantId: string;
  sessionRestaurantName: string;
  sessionRestaurantAddress: string | null;
  sessionRestaurantPhone: string | null;
  sessionStartedAt: string;
  sessionEndedAt: string | null;
  sessionBilledAt: string | null;
  sessionInvoiceNumber: string | null;
  sessionFinalBillAmount: number;
  sessionDiscountAmount: number;
  sessionGstAmount: number;
  sessionSubtotal: number;
  sessionDiscountPercentage: number;
  sessionDiscountReason: string | null;
  status: string;
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  createdAt: string;
  updatedAt: string;
  placedByUserId: string | null;
  placedByName: string;
  notes: string | null;
  items: Array<{
    id: string;
    menuItemId: string;
    menuItemName: string;
    variantId: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    status: string;
    notes: string | null;
    createdAt: string;
    extras?: Array<{
      extraId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }>;
  itemCount: number;
}

export default function PastOrdersPage() {
  const router = useRouter();
  const { user, restaurant, restaurantRole, isLoading: dashboardLoading } = useDashboard();
  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [permissions, setPermissions] = useState<any>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const ordersPerPage = 10;

  useEffect(() => {
    if (restaurant && restaurantRole) {
      loadPermissions();
      loadOrders();
    }
  }, [restaurant, restaurantRole]);

  const loadPermissions = async () => {
    if (!restaurantRole) return;
    try {
      const perms = getRestaurantPermissions(restaurantRole);
      setPermissions(perms);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const loadOrders = async () => {
    if (!restaurant) return;
    try {
      setLoading(true);
      const data = await apiClient.getPastSessionOrders();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to load past orders:', error);
      toast.error('Failed to load past orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on search term
  const filteredOrders = orders.filter(order =>
    order.sessionTableNumber?.toString().includes(searchTerm.toLowerCase()) ||
    order.sessionInvoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.placedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.items.some(item => item.menuItemName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);

  const handlePrintOrder = async (order: PastOrder) => {
    try {
      const orderDate = new Date(order.createdAt);
      const billData: BillData = {
        restaurantName: order.sessionRestaurantName,
        restaurantAddress: order.sessionRestaurantAddress || '',
        restaurantPhone: order.sessionRestaurantPhone || '',
        fssaiLicenseNumber: restaurant?.fssaiLicenseNumber || undefined,
        invoiceNumber: order.sessionInvoiceNumber || `ORDER-${order.id.slice(-8)}`,
        tableNumber: order.sessionTableNumber,
        date: orderDate.toLocaleDateString(),
        time: orderDate.toLocaleTimeString(),
        items: order.items.map((item: any) => ({
          name: item.menuItemName,
          variant: item.variantName || undefined,
          quantity: item.quantity,
          price: item.unitPrice / 100,
          total: item.totalPrice / 100,
        })),
        subtotal: order.subtotal / 100,
        discount: order.discount / 100,
        tax: order.gst / 100,
        grandTotal: order.grandTotal / 100,
      };

      const printer = new BillPrinter();
      await printer.print(billData, { method: 'pdf' });
      toast.success('Order printed successfully');
    } catch (error) {
      console.error('Failed to print order:', error);
      toast.error('Failed to print order');
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (dashboardLoading || !permissions) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!permissions.canViewSessions) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-red-600" />
            Past Orders
          </h1>
          <p className="text-gray-600 mt-1">View all completed orders from past sessions</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/past-sessions')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <History className="h-4 w-4" />
          View Sessions
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders by table, invoice, customer, or items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : paginatedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms' : 'No completed orders yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedOrders.map((order) => (
              <div key={order.id} className="p-6">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-gray-900">
                        Order #{order.id.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>Table {order.sessionTableNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{getRelativeTime(order.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {order.status}
                    </span>
                    <button
                      onClick={() => handlePrintOrder(order)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                    <button
                      onClick={() => toggleOrderExpansion(order.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      {expandedOrder === order.id ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Items</p>
                    <p className="font-medium">{order.itemCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="font-medium">{formatPrice(order.subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-medium text-red-600">{formatPrice(order.grandTotal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Placed by</p>
                    <p className="font-medium">{order.placedByName}</p>
                  </div>
                </div>

                {/* Order Items (Expandable) */}
                {expandedOrder === order.id && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{item.menuItemName}</span>
                              {item.variantName && (
                                <span className="text-sm text-gray-600">({item.variantName})</span>
                              )}
                              <span className="text-sm text-gray-600">×{item.quantity}</span>
                            </div>                            {item.extras && item.extras.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.extras.map((extra, index) => (
                                  <p key={index} className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block border border-blue-100 mr-1">
                                    + {extra.quantity}x {extra.name}
                                  </p>
                                ))}
                              </div>
                            )}                            {item.notes && (
                              <p className="text-sm text-gray-600 mt-1">Note: {item.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatPrice(item.totalPrice)}</p>
                            <p className="text-sm text-gray-600">{formatPrice(item.unitPrice)} each</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Notes */}
                    {order.notes && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(startIndex + ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}