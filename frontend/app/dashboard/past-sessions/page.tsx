"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  FileSpreadsheet,
  Settings,
  AlertCircle,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Award,
  CheckCircle2
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { BillPrinter } from '@/lib/print-bill';
import { BillData } from '@/lib/thermal-printer';
import { formatPrice, getRelativeTime } from '@/lib/utils';
import { getRestaurantPermissions } from '@/lib/permissions';
import AccessDenied from '@/components/AccessDenied';
import toast from 'react-hot-toast';

interface PastSession {
  id: string;
  tableId: string;
  tableNumber: number;
  restaurantId: string;
  status: string;
  paymentStatus: string;
  startedAt: string;
  endedAt: string | null;
  billedAt: string | null;
  invoiceNumber: string | null;
  finalBillAmount: number;
  finalAmount: number;
  discountAmount: number;
  gstAmount: number;
  subtotal: number;
  createdByUserId: string | null;
  createdByName: string | null;
  discountPercentage: number;
  discountReason: string | null;
  orderCount: number;
  totalItems: number;
}

export default function PastSessionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, restaurant, restaurantRole, isLoading: dashboardLoading } = useDashboard();
  const [sessions, setSessions] = useState<PastSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'kot' | 'qr'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [permissions, setPermissions] = useState<any>(null);

  const sessionId = searchParams.get('sessionId');
  const orderId = searchParams.get('orderId');

  const sessionsPerPage = 10;

  useEffect(() => {
    if (restaurant && restaurantRole) {
      loadPermissions();
      loadSessions();
    }
  }, [restaurant, restaurantRole, currentPage]);

  const loadPermissions = async () => {
    if (!restaurantRole) return;
    try {
      const perms = getRestaurantPermissions(restaurantRole);
      setPermissions(perms);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const loadSessions = async () => {
    if (!restaurant) return;
    try {
      setLoading(true);
      const data = await apiClient.getPastSessions(restaurant.id, {
        page: currentPage,
        limit: sessionsPerPage
      });
      if (data.success) {
        setSessions(data.sessions);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalSessions(data.pagination.total);
        }
      }
    } catch (error) {
      console.error('Failed to load past sessions:', error);
      toast.error('Failed to load past sessions');
    } finally {
      setLoading(false);
    }
  };

  // Filter sessions based on search term and active tab (client-side filter of current page)
  const filteredSessions = sessions.filter(session => {
    // 1. Tab Filter
    if (activeTab === 'kot' && session.tableNumber != null) return false;
    if (activeTab === 'qr' && session.tableNumber == null) return false;

    // 2. Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        session.tableNumber?.toString().includes(term) ||
        session.invoiceNumber?.toLowerCase().includes(term) ||
        session.id.toLowerCase().includes(term) ||
        session.createdByName?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Since we use server-side pagination, the sessions array already contains only the current page (or filtered subset)
  const paginatedSessions = filteredSessions;
  const startIndex = (currentPage - 1) * sessionsPerPage;

  const handleViewSession = (sessionId: string) => {
    router.push(`/dashboard/past-sessions?sessionId=${sessionId}`);
  };

  const handleViewOrder = (sessionId: string, orderId: string) => {
    router.push(`/dashboard/past-sessions?sessionId=${sessionId}&orderId=${orderId}`);
  };

  const handleBackToSessions = () => {
    router.push('/dashboard/past-sessions');
  };

  if (dashboardLoading || !permissions) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d5b263]"></div>
      </div>
    );
  }

  if (!permissions.canViewSessions) {
    return <AccessDenied />;
  }

  // If viewing a specific session or order, show detailed view
  if (sessionId) {
    return <SessionDetailView
      sessionId={sessionId}
      orderId={orderId}
      onBack={handleBackToSessions}
      onViewOrder={handleViewOrder}
    />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 -mx-6 -mt-6 px-6 pt-6 pb-6 mb-8 relative z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#d5b263]/10 border border-[#d5b263]/20 flex items-center justify-center">
              <History className="w-6 h-6 text-[#d5b263]" strokeWidth={2.5} />
            </div>
            Past Sessions
          </h1>
          <p className="text-sm font-bold text-zinc-500 mt-2">View completed dining sessions and their detailed histories</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#d5b263]/10 rounded-2xl border border-[#d5b263]/20">
              <Receipt className="h-6 w-6 text-[#d5b263]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Total Sessions</p>
              <p className="text-2xl font-black text-white tracking-tight leading-none">{filteredSessions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#d5b263]/10 rounded-2xl border border-[#d5b263]/20">
              <DollarSign className="h-6 w-6 text-[#d5b263]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Total Revenue</p>
              <p className="text-2xl font-black text-[#d5b263] tracking-tight leading-none">
                {formatPrice(filteredSessions.reduce((sum, s) => sum + (s.finalAmount || s.finalBillAmount), 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/40">
              <ShoppingBag className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Total Orders</p>
              <p className="text-2xl font-black text-white tracking-tight leading-none">
                {filteredSessions.reduce((sum, s) => sum + Number(s.orderCount), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/40">
              <Users className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Avg. per Session</p>
              <p className="text-2xl font-black text-white tracking-tight leading-none">
                {filteredSessions.length > 0
                  ? formatPrice(filteredSessions.reduce((sum, s) => sum + (s.finalAmount || s.finalBillAmount), 0) / filteredSessions.length)
                  : formatPrice(0)
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-[#050506] p-1.5 rounded-2xl border border-zinc-900/40 w-fit mt-4">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'all'
              ? 'bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20'
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          Overall
        </button>
        <button
          onClick={() => setActiveTab('kot')}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'kot'
              ? 'bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20'
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          KOT Orders
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'qr'
              ? 'bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20'
              : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          QR Scan Tables
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-[#0c0c0e] p-4 rounded-2xl border border-zinc-900/40 mt-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by table number, customer name, invoice, or session ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[#050506] border border-zinc-800/60 rounded-xl focus:ring-2 focus:ring-[#d5b263]/20 focus:border-[#d5b263]/40 transition-all outline-none font-medium text-white placeholder:text-zinc-650"
            />
          </div>
          <button
            onClick={loadSessions}
            className="w-full md:w-auto px-6 py-3 bg-[#121215] text-zinc-300 font-bold rounded-xl hover:bg-zinc-800 hover:text-white active:scale-95 transition-all flex items-center justify-center gap-2 border border-zinc-800/60"
          >
            <Filter className="h-4 w-4" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-[#0c0c0e] rounded-3xl border border-zinc-900/40 overflow-hidden mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#d5b263] border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        ) : paginatedSessions.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-[#050506] rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800/60">
              <History className="h-10 w-10 text-[#d5b263]" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 tracking-tight">No past sessions found</h3>
            <p className="text-zinc-500 font-medium">Completed dining sessions will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#050506] border-b border-zinc-900/60">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Table
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Invoice
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Date &amp; Time
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Orders
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {paginatedSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="inline-flex items-center justify-center px-4 py-1.5 bg-[#050506] border border-zinc-800/60 rounded-full">
                          <span className="text-sm font-black text-white">
                            Table {session.tableNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#050506] flex items-center justify-center shrink-0 border border-zinc-800/60">
                            <Users className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">
                              {session.createdByName || 'Walk-in Customer'}
                            </div>
                            <div className="text-xs text-zinc-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              ID: {session.id.slice(-6)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-mono font-medium text-zinc-400">
                          {session.invoiceNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-white">
                          {new Date(session.billedAt || session.startedAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(session.billedAt || session.startedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-bold text-white">
                          {session.orderCount} <span className="text-zinc-500 font-normal">orders</span>
                        </div>
                        <div className="text-xs text-zinc-500 font-medium mt-0.5">
                          {session.totalItems} items
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-black text-[#d5b263] bg-[#d5b263]/10 px-3 py-1.5 rounded-lg inline-block border border-[#d5b263]/20">
                          {formatPrice(session.finalAmount || session.finalBillAmount)}
                        </div>
                        {session.discountAmount > 0 && (
                          <div className="text-xs font-bold text-zinc-500 mt-1 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            {formatPrice(session.discountAmount)} off
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleViewSession(session.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#d5b263]/10 border border-[#d5b263]/25 text-[#d5b263] hover:bg-[#d5b263]/20 font-bold rounded-xl transition-all mx-auto"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-zinc-900/40 px-6 py-4 border-t border-zinc-900/40 flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-500">
                  Showing <span className="font-bold text-white">{startIndex + 1}</span> to <span className="font-bold text-white">{Math.min(startIndex + paginatedSessions.length, totalSessions)}</span> of <span className="font-bold text-white">{totalSessions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-zinc-800 rounded-xl text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 hover:text-white transition-all bg-zinc-900"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-white">
                    {currentPage} <span className="text-zinc-500 font-medium">/ {totalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-zinc-800 rounded-xl text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 hover:text-white transition-all bg-zinc-900"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Session Detail View Component
function SessionDetailView({
  sessionId,
  orderId,
  onBack,
  onViewOrder
}: {
  sessionId: string;
  orderId: string | null;
  onBack: () => void;
  onViewOrder: (sessionId: string, orderId: string) => void;
}) {
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSessionDetails();
  }, [sessionId]);

  const loadSessionDetails = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPastSessionDetails(sessionId);
      if (data.success) {
        setSessionData(data);
      }
    } catch (error) {
      console.error('Failed to load session details:', error);
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBill = async () => {
    if (!sessionData) return;

    try {
      const { session, orders, payments } = sessionData;

      // For older sessions where GST was calculated on the pre-discount subtotal,
      // we need to dynamically calculate the correct GST on the post-discount amount.
      // For past sessions, we use the recorded GST amount.
      // If we need to show the rate, we calculate it from the recorded GST relative to the subtotal.
      const effectiveGstRate = session.subtotal > 0 ? Math.round((session.gstAmount / session.subtotal) * 100) : 0;
      const correctedGstAmountPaise = session.gstAmount;

      // Prepare bill data for printing
      const billData: BillData = {
        restaurantName: session.restaurantName,
        restaurantAddress: session.restaurantAddress || undefined,
        restaurantPhone: session.restaurantPhone || undefined,
        fssaiLicenseNumber: session.fssaiLicenseNumber || undefined,
        invoiceNumber: session.invoiceNumber || `INV-${session.id.substring(0, 8)}`,
        tableNumber: session.tableNumber,
        date: new Date(session.billedAt || session.startedAt).toLocaleDateString(),
        time: new Date(session.billedAt || session.startedAt).toLocaleTimeString(),
        items: orders.flatMap((order: any) =>
          order.items.map((item: any) => ({
            name: item.menuItemName,
            variant: item.variantName || undefined,
            quantity: item.quantity,
            price: item.unitPrice / 100,
            total: item.totalPrice / 100,
          }))
        ),
        subtotal: session.subtotal / 100,
        tax: correctedGstAmountPaise / 100,
        cgst: (correctedGstAmountPaise / 2) / 100,
        sgst: (correctedGstAmountPaise / 2) / 100,
        taxPercentage: effectiveGstRate,
        taxableAmount: session.subtotal / 100,
        discount: session.discountAmount / 100,
        grandTotal: session.finalBillAmount / 100,
        paymentMethod: payments.length > 0 ? payments[0].method : undefined,
      };

      const printer = new BillPrinter();
      await printer.print(billData, { method: 'pdf' });

      toast.success('Bill printed successfully!');
    } catch (error) {
      console.error('Failed to print bill:', error);
      toast.error('Failed to print bill. Please try again.');
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Session not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Back to Sessions
        </button>
      </div>
    );
  }

  const { session, orders, payments, summary } = sessionData;

  // If viewing a specific order, show order detail view
  if (orderId) {
    return <OrderDetailView
      sessionId={sessionId}
      orderId={orderId}
      sessionData={session}
      onBack={() => onViewOrder(sessionId, '')}
    />;
  }

  return (
    <div className="space-y-6">
      {/* Session Header/Back */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mt-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 hover:bg-gray-100 bg-gray-50 border border-gray-200 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Table {session.tableNumber}
              </h1>
              <div className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider border border-green-200">
                Completed
              </div>
            </div>
            <p className="text-gray-500 font-medium font-mono text-sm mt-1">{session.invoiceNumber || `INV-${session.id.slice(0, 8).toUpperCase()}`}</p>
          </div>
        </div>
        <button
          onClick={handlePrintBill}
          className="px-6 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <Printer className="h-5 w-5" />
          Print Final Bill
        </button>
      </div>

      {/* Session Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 tracking-tight">Timeline</h3>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-gray-500 font-medium text-sm">Started</span>
              <span className="font-bold text-gray-900 text-sm">{new Date(session.startedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-gray-500 font-medium text-sm">Billed</span>
              <span className="font-bold text-gray-900 text-sm">{session.billedAt ? new Date(session.billedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium text-sm">Duration</span>
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-sm border border-blue-100">
                {session.endedAt
                  ? `${Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / (1000 * 60))} mins`
                  : 'Ongoing'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900 tracking-tight">Order Summary</h3>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-gray-500 font-medium text-sm">Total Orders</span>
              <span className="font-bold text-gray-900">{summary.totalOrders}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
              <span className="text-gray-500 font-medium text-sm">Total Items</span>
              <span className="font-bold text-gray-900">{summary.totalItems}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium text-sm">Subtotal</span>
              <span className="font-black text-gray-900 text-lg">{formatPrice(session.subtotal)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-6 rounded-3xl border border-green-200/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl -mr-16 -mt-16 opacity-40 pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center border border-green-300 border-b-[3px]">
              <DollarSign className="w-5 h-5 text-green-700" />
            </div>
            <h3 className="font-bold text-green-900 tracking-tight">Payment Details</h3>
          </div>
          <div className="space-y-3 mt-4 relative z-10">
            {session.discountAmount > 0 && (
              <div className="flex justify-between items-center pb-2 border-b border-green-200/50">
                <span className="text-green-800/80 font-medium text-sm">Discount</span>
                <span className="font-bold text-red-600 bg-red-50/80 px-2 py-0.5 rounded-md text-sm border border-red-100">-{formatPrice(session.discountAmount)}</span>
              </div>
            )}
            {(() => {
              // We show the recorded GST from the session.
              return (
                <div className="flex justify-between items-center pb-2 border-b border-green-200/50">
                  <span className="text-green-800/80 font-medium text-sm">Taxes (GST)</span>
                  <span className="font-bold text-green-900 text-sm">{formatPrice(session.gstAmount)}</span>
                </div>
              );
            })()}
            <div className="flex justify-between items-center pt-1">
              <span className="text-green-900 font-bold uppercase tracking-wider text-xs">Final Amount</span>
              <span className="font-black text-green-700 text-3xl tracking-tight">{formatPrice(session.finalAmount || session.finalBillAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-gray-400" />
            Order History
          </h3>
          <div className="bg-white px-3 py-1 rounded-full border border-gray-200 text-xs font-bold text-gray-600 shadow-sm">
            {orders.length} Orders
          </div>
        </div>
        <div className="divide-y divide-gray-100/80">
          {orders.map((order: any, index: number) => {
            const isExpanded = expandedOrders.has(order.id);
            return (
              <div key={order.id} className="transition-colors group">
                <div
                  className={`p-5 cursor-pointer hover:bg-gray-50/80 transition-all ${isExpanded ? 'bg-gray-50/50' : ''}`}
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex items-center gap-5">
                      <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200 shrink-0 font-black text-gray-500 shadow-inner">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-gray-900 tracking-wide font-mono text-sm max-w-[120px] truncate">ORD-{order.id.slice(-6).toUpperCase()}</p>
                          <span className="text-xs font-bold bg-white border border-gray-200 px-2.5 py-0.5 rounded-md text-gray-600 shadow-sm">
                            {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {order.placedByName && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {order.placedByName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-5">
                      <div>
                        <p className="font-black text-gray-900 text-lg tracking-tight bg-gray-100/50 px-3 py-1 rounded-xl border border-gray-100 inline-block">
                          {formatPrice(order.grandTotal)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewOrder(sessionId, order.id);
                          }}
                          className="hidden md:flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <Printer className="w-4 h-4" />
                          Receipt
                        </button>
                        <div className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-gray-200 text-gray-900' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-900'}`}>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-6 pt-2 bg-gray-50/50 border-t border-dashed border-gray-200 shadow-inner">
                    <div className="pl-[60px] pr-4">
                      <div className="space-y-3">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center font-black text-orange-600 shrink-0 mt-0.5">
                              {item.quantity}x
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h5 className="font-bold text-gray-900 text-base">{item.menuItemName}</h5>
                                  {item.variantName && (
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 text-xs font-bold rounded-md">
                                      {item.variantName}
                                    </span>
                                  )}
                                  <p className="text-sm font-medium text-gray-500 mt-2">@ {formatPrice(item.unitPrice)} each</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-gray-900">{formatPrice(item.totalPrice)}</p>
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-md">
                                    {item.status}
                                  </span>
                                </div>
                              </div>

                              {/* Order Extras */}
                              {item.extras && item.extras.length > 0 && (
                                <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <Award className="w-3 h-3" />
                                    Add-ons
                                  </p>
                                  <div className="space-y-2">
                                    {item.extras.map((extra: any) => (
                                      <div key={extra.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-500 font-medium">×{extra.quantity}</span>
                                          <span className="text-gray-700 font-bold">{extra.name}</span>
                                        </div>
                                        <span className="text-gray-900 font-black">{formatPrice(extra.price * extra.quantity)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => onViewOrder(sessionId, order.id)}
                        className="md:hidden w-full mt-4 flex items-center justify-center gap-2 bg-white border-2 border-red-100 text-red-600 font-bold py-3 rounded-xl active:scale-95 transition-all shadow-sm"
                      >
                        <Printer className="w-4 h-4" />
                        View Receipt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payments */}
      {payments.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-6">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              Transactions
            </h3>
            <div className="bg-white px-3 py-1 rounded-full border border-gray-200 text-xs font-bold text-gray-600 shadow-sm">
              {payments.length} Payment{payments.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {payments.map((payment: any) => (
              <div key={payment.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center border border-green-100 shadow-inner group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 capitalize text-lg flex items-center gap-2">
                      {payment.method}
                      <span className="inline-block px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-[10px] font-black uppercase tracking-wider rounded-md">
                        {payment.status}
                      </span>
                    </p>
                    <div className="text-sm font-medium text-gray-500 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(payment.createdAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {payment.processedByName && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {payment.processedByName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-green-700 text-xl tracking-tight bg-green-50 px-3 py-1.5 rounded-xl border border-green-100/50">
                    +{formatPrice(payment.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Order Detail View Component
function OrderDetailView({
  sessionId,
  orderId,
  sessionData,
  onBack
}: {
  sessionId: string;
  orderId: string;
  sessionData: any;
  onBack: () => void;
}) {
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderDetails();
  }, [sessionId, orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPastSessionOrderDetails(sessionId, orderId);
      if (data.success) {
        setOrderData(data.order);
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!orderData || !sessionData) return;

    try {
      // Prepare receipt data for printing
      const receiptData: BillData = {
        restaurantName: sessionData.restaurantName,
        restaurantAddress: sessionData.restaurantAddress,
        restaurantPhone: sessionData.restaurantPhone,
        fssaiLicenseNumber: sessionData.fssaiLicenseNumber,
        invoiceNumber: `ORDER-${orderData.id.slice(-8)}`,
        tableNumber: orderData.tableNumber,
        date: new Date(orderData.createdAt).toLocaleDateString(),
        time: new Date(orderData.createdAt).toLocaleTimeString(),
        items: orderData.items.map((item: any) => ({
          name: item.menuItemName,
          variant: item.variantName || undefined,
          quantity: item.quantity,
          price: item.unitPrice / 100,
          total: item.totalPrice / 100,
        })),
        subtotal: orderData.subtotal / 100,
        tax: orderData.gst / 100,
        discount: orderData.discount / 100,
        grandTotal: orderData.grandTotal / 100,
      };

      const printer = new BillPrinter();
      await printer.print(receiptData, { method: 'pdf' });

      toast.success('Receipt printed successfully!');
    } catch (error) {
      console.error('Failed to print receipt:', error);
      toast.error('Failed to print receipt. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Order not found</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Back to Session
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Order Details
            </h1>
            <p className="text-gray-600">
              Order #{orderData.id.slice(-8)} • Table {orderData.tableNumber}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrintReceipt}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </button>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Order Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono">{orderData.id.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="capitalize">{orderData.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span>{new Date(orderData.createdAt).toLocaleString()}</span>
            </div>
            {orderData.placedByName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Placed by:</span>
                <span>{orderData.placedByName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Items:</span>
              <span>{orderData.itemCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatPrice(orderData.subtotal)}</span>
            </div>
            {orderData.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount:</span>
                <span className="text-green-600">-{formatPrice(orderData.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">GST:</span>
              <span>{formatPrice(orderData.gst)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Total:</span>
              <span className="text-green-600">{formatPrice(orderData.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Order Items ({orderData.items.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {orderData.items.map((item: any) => (
            <div key={item.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.menuItemName}</h4>
                  {item.variantName && (
                    <p className="text-sm text-gray-600">Variant: {item.variantName}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                    <span className="text-sm text-gray-600">{formatPrice(item.unitPrice)} each</span>
                  </div>
                  {/* Order Extras */}
                  {item.extras && item.extras.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Extras:</p>
                      <div className="space-y-1">
                        {item.extras.map((extra: any) => (
                          <div key={extra.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">{extra.name}</span>
                              <span className="text-gray-500">×{extra.quantity}</span>
                            </div>
                            <span className="text-gray-700 font-medium">{formatPrice(extra.price * extra.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatPrice(item.totalPrice)}</p>
                  <p className="text-sm text-gray-600 capitalize">{item.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {orderData.notes && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Order Notes</h3>
          <p className="text-gray-700">{orderData.notes}</p>
        </div>
      )}
    </div>
  );
}