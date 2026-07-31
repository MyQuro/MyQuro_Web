"use client";

import { useEffect, useState, useMemo } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import {
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  Users,
  Table,
  UserCheck,
  CreditCard,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Clock,
  Calendar,
  TrendingDown,
  History,
  DollarSign,
  Receipt
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { getRestaurantPermissions } from '@/lib/permissions';
import AccessDenied from '@/components/AccessDenied';
import toast from 'react-hot-toast';

// --- Chart Components ---
const BarChart = ({ data, valueKey, labelKey, color = "bg-red-500", height = "h-48" }: any) => {
  const maxValue = Math.max(...data.map((d: any) => d[valueKey]), 1);

  return (
    <div className={`flex items-end gap-2 ${height} w-full pt-6`}>
      {data.map((item: any, i: number) => (
        <div key={i} className="flex flex-col items-center gap-2 group">
          <div className="relative w-full flex justify-center">
            <div
              className={`w-full max-w-[40px] rounded-t-md ${color} opacity-80 group-hover:opacity-100 transition-all duration-300`}
              style={{ height: `${(item[valueKey] / maxValue) * 100}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {item[valueKey]}
              </div>
            </div>
          </div>
          <span className="text-xs text-gray-500 truncate w-full text-center">{item[labelKey]}</span>
        </div>
      ))}
    </div>
  );
};

const CustomPieChart = ({ data, valueKey, labelKey, colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"] }: any) => {
  const total = data.reduce((sum: number, item: any) => sum + item[valueKey], 0);
  if (total === 0) return <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No data</div>;

  let currentAngle = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {data.map((item: any, i: number) => {
            const percentage = (item[valueKey] / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            // Calculate SVG path
            const r = 40;
            const cx = 50;
            const cy = 50;

            const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
            const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
            const x2 = cx + r * Math.cos(((startAngle + angle) * Math.PI) / 180);
            const y2 = cy + r * Math.sin(((startAngle + angle) * Math.PI) / 180);

            const largeArcFlag = angle > 180 ? 1 : 0;

            // Handle single item case (full circle)
            if (data.length === 1) {
              return <circle key={i} cx="50" cy="50" r="40" fill={`var(--color-${colors[0].replace('bg-', '')})`} className={colors[0]} />;
            }

            return (
              <path
                key={i}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                fill={`var(--color-${colors[i % colors.length].replace('bg-', '')})`}
                className={colors[i % colors.length]}
              />
            );
          })}
        </svg>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-40">
        {data.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`}></div>
            <span className="text-sm text-gray-600 truncate">{item[labelKey]}</span>
            <span className="text-sm font-medium text-gray-900 ml-auto">
              {((item[valueKey] / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DualMetricChart = ({ data, primaryKey, secondaryKey, labelKey, primaryColor = "bg-blue-500", secondaryColor = "bg-green-500" }: any) => {
  const maxPrimary = Math.max(...data.map((d: any) => d[primaryKey]), 1);
  const maxSecondary = Math.max(...data.map((d: any) => d[secondaryKey]), 1);

  return (
    <div className="flex items-end gap-3 h-48 w-full pt-6">
      {data.map((item: any, i: number) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="relative w-full flex justify-center gap-1">
            {/* Secondary bar (background) */}
            <div
              className={`w-3 rounded-t-sm ${secondaryColor} opacity-60`}
              style={{ height: `${(item[secondaryKey] / maxSecondary) * 100}%` }}
            />
            {/* Primary bar (foreground) */}
            <div
              className={`w-3 rounded-t-sm ${primaryColor} opacity-80 group-hover:opacity-100 transition-all duration-300`}
              style={{ height: `${(item[primaryKey] / maxPrimary) * 100}%` }}
            />
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              {item[primaryKey]} / {item[secondaryKey]}
            </div>
          </div>
          <span className="text-xs text-gray-500 truncate w-full text-center">{item[labelKey]}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const { restaurant, restaurantRole, isLoading: dashboardLoading } = useDashboard();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week'); // week, month, year, all

  // Raw Data
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawSessions, setRawSessions] = useState<any[]>([]);
  const [rawPayments, setRawPayments] = useState<any[]>([]);

  // Permission check
  const permissions = restaurantRole ? getRestaurantPermissions(restaurantRole) : null;

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch ALL orders, sessions and payments. We will filter client-side for analytics.
      const [ordersRes, sessionsRes, paymentsRes] = await Promise.all([
        apiClient.getRestaurantOrders(restaurant!.id, { limit: 5000 }).catch(() => ({ orders: [] })),
        apiClient.getPastSessions(restaurant!.id, { limit: 5000 }).catch(() => ({ sessions: [] })),
        apiClient.getPaymentMethodAnalytics(restaurant!.id, period).catch(() => ({ payments: [] }))
      ]);

      const orders = Array.isArray((ordersRes as any)?.orders) ? (ordersRes as any).orders : [];
      const sessions = Array.isArray((sessionsRes as any)?.sessions) ? (sessionsRes as any).sessions : [];
      const paymentsData = (paymentsRes as any)?.payments || (paymentsRes as any)?.paymentMethods || [];

      setRawOrders(orders);
      setRawSessions(sessions);
      setRawPayments(paymentsData);

    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant?.id) {
      loadData();
    }
  }, [restaurant?.id, period]);

  // --- Client-Side Analytics Processing ---
  const analytics = useMemo(() => {
    if (!rawOrders.length && !rawSessions.length && !rawPayments.length) return null;

    const now = new Date();
    const cutoff = new Date();

    // 1. Filter by Period (only if we have sessions)
    let filteredSessions: any[] = [];
    if (rawSessions.length > 0) {
      if (period === 'week') cutoff.setDate(now.getDate() - 7);
      if (period === 'month') cutoff.setDate(now.getDate() - 30);
      if (period === 'year') cutoff.setDate(now.getDate() - 365);
      if (period === 'all') cutoff.setFullYear(2000); // All time

      filteredSessions = rawSessions.filter((s: any) => {
        const d = new Date(s.billedAt || s.createdAt);
        return d >= cutoff && s.paymentStatus === 'paid' && s.status === 'closed';
      });
    }

    // 2. Sales Metrics (using sessions finalAmount/finalBillAmount - after all discounts)
    const totalRevenue = filteredSessions.reduce((sum, s) => sum + (Number(s.finalAmount) || Number(s.finalBillAmount) || 0), 0);
    const totalDiscounts = filteredSessions.reduce((sum, s) => sum + (Number(s.discountAmount) || 0), 0);
    const originalRevenue = filteredSessions.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
    const totalOrders = filteredSessions.reduce((sum, s) => sum + (Number(s.orderCount) || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageDiscountPerOrder = totalOrders > 0 ? totalDiscounts / totalOrders : 0;
    const discountPercentage = originalRevenue > 0 ? (totalDiscounts / originalRevenue) * 100 : 0;

    // 3. Daily Sales Trend (using sessions finalAmount)
    const salesByDate = new Map<string, number>();
    const discountsByDate = new Map<string, number>();
    filteredSessions.forEach(s => {
      const date = new Date(s.billedAt || s.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
      const revenue = Number(s.finalAmount) || Number(s.finalBillAmount) || 0;
      const discount = Number(s.discountAmount) || 0;
      salesByDate.set(date, (salesByDate.get(date) || 0) + revenue);
      discountsByDate.set(date, (discountsByDate.get(date) || 0) + discount);
    });
    const dailySales = Array.from(salesByDate.entries())
      .map(([date, amount]) => ({
        date,
        totalAmount: amount,
        discountAmount: discountsByDate.get(date) || 0,
        originalAmount: amount + (discountsByDate.get(date) || 0)
      }))
      .slice(-10);

    // 4. Top Items with Revenue (from orders belonging to filtered sessions)
    const sessionIds = new Set(filteredSessions.map(s => s.id));
    const filteredOrders = rawOrders.filter((o: any) => sessionIds.has(o.tableSessionId));

    const itemStats = new Map<string, { quantity: number; revenue: number; orders: number }>();
    filteredOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const name = item.menuItemName || 'Unknown Item';
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          const existing = itemStats.get(name) || { quantity: 0, revenue: 0, orders: 0 };
          itemStats.set(name, {
            quantity: existing.quantity + qty,
            revenue: existing.revenue + (price * qty),
            orders: existing.orders + 1
          });
        });
      }
    });
    const topItems = Array.from(itemStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 5. Payment Methods Analysis - Use API data directly
    const paymentMethods = rawPayments;

    // 6. Table Analytics (using sessions data)
    const tableStatsMap = new Map<string, { orders: number; revenue: number; customers: Set<string>; avgOrder: number; utilization: number; tableNumber: string }>();
    filteredSessions.forEach(s => {
      const tableId = s.tableId || 'Unknown Table';
      const amount = Number(s.finalAmount) || Number(s.finalBillAmount) || 0;
      const userId = s.createdByUserId || `guest_${s.id}`;
      const tableNumber = s.tableNumber || tableId;

      const existing = tableStatsMap.get(tableId) || { orders: 0, revenue: 0, customers: new Set(), avgOrder: 0, utilization: 0, tableNumber };
      existing.orders += Number(s.orderCount) || 0;
      existing.revenue += amount;
      existing.customers.add(userId);
      tableStatsMap.set(tableId, existing);
    });

    const tableAnalytics = Array.from(tableStatsMap.entries())
      .map(([tableId, stats]) => ({
        tableId,
        tableNumber: stats.tableNumber,
        orders: stats.orders,
        revenue: stats.revenue,
        customers: stats.customers.size,
        avgOrder: stats.revenue / stats.orders,
        utilization: totalOrders > 0 ? (stats.orders / totalOrders) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // 7. Customer Analytics (using sessions data)
    const customerOrderHistory = new Map<string, { sessions: any[]; totalSpent: number; totalDiscounts: number; firstOrder: Date; lastOrder: Date; customerName: string }>();
    filteredSessions.forEach(s => {
      const userId = s.createdByUserId || `guest_${s.id}`;
      const amount = Number(s.finalAmount) || 0;
      const discount = Number(s.discountAmount) || 0;
      const sessionDate = new Date(s.billedAt || s.createdAt);

      // For now, use userId as customer name since we don't have user details in sessions
      const customerName = `Customer ${userId.slice(-4)}`;

      const existing = customerOrderHistory.get(userId) || {
        sessions: [] as any[],
        totalSpent: 0,
        totalDiscounts: 0,
        firstOrder: sessionDate,
        lastOrder: sessionDate,
        customerName
      };

      existing.sessions.push(s);
      existing.totalSpent += amount;
      existing.totalDiscounts += discount;
      existing.firstOrder = sessionDate < existing.firstOrder ? sessionDate : existing.firstOrder;
      existing.lastOrder = sessionDate > existing.lastOrder ? sessionDate : existing.lastOrder;
      customerOrderHistory.set(userId, existing);
    });

    const customerAnalytics = Array.from(customerOrderHistory.entries())
      .map(([userId, history]) => ({
        userId,
        customerName: history.customerName,
        totalOrders: history.sessions.length,
        totalSpent: history.totalSpent,
        totalDiscounts: history.totalDiscounts,
        avgOrderValue: history.totalSpent / history.sessions.length,
        avgDiscountPerOrder: history.totalDiscounts / history.sessions.length,
        firstOrder: history.firstOrder,
        lastOrder: history.lastOrder,
        daysSinceFirstOrder: Math.floor((now.getTime() - history.firstOrder.getTime()) / (1000 * 60 * 60 * 24)),
        isNewCustomer: history.sessions.length === 1
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent);

    // Customer Segmentation
    const newCustomers = customerAnalytics.filter(c => c.isNewCustomer).length;
    const returningCustomers = customerAnalytics.filter(c => !c.isNewCustomer).length;
    const highValueCustomers = customerAnalytics.filter(c => c.totalSpent > averageOrderValue * 2);
    const avgCustomerLifetimeValue = customerAnalytics.reduce((sum, c) => sum + c.totalSpent, 0) / customerAnalytics.length;

    // 8. Order Value Distribution
    const orderValueRanges = [
      { range: '₹0-100', min: 0, max: 100, count: 0, revenue: 0 },
      { range: '₹101-300', min: 101, max: 300, count: 0, revenue: 0 },
      { range: '₹301-500', min: 301, max: 500, count: 0, revenue: 0 },
      { range: '₹501-1000', min: 501, max: 1000, count: 0, revenue: 0 },
      { range: '₹1001+', min: 1001, max: Infinity, count: 0, revenue: 0 }
    ];

    filteredOrders.forEach(o => {
      const amount = Number(o.totalAmount) || 0;
      const range = orderValueRanges.find(r => amount >= r.min && amount <= r.max);
      if (range) {
        range.count += 1;
        range.revenue += amount;
      }
    });

    // 9. Peak Hours Analysis
    const hours = new Array(24).fill(0);
    const hourlyRevenue = new Array(24).fill(0);
    filteredOrders.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      const amount = Number(o.totalAmount) || 0;
      hours[h]++;
      hourlyRevenue[h] += amount;
    });

    const hourlyDistribution = hours.map((count, hour) => ({
      hour,
      orderCount: count,
      revenue: hourlyRevenue[hour],
      avgOrderValue: count > 0 ? hourlyRevenue[hour] / count : 0
    }));

    const peakHour = hourlyDistribution.reduce((max, curr) => curr.orderCount > max.orderCount ? curr : max);
    const peakRevenueHour = hourlyDistribution.reduce((max, curr) => curr.revenue > max.revenue ? curr : max);

    // 10. Categories Performance
    const categoryStats = new Map<string, { items: number; revenue: number; orders: number; avgPrice: number }>();
    filteredOrders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const category = item.category || item.menuItemCategory || 'Uncategorized';
          const price = Number(item.price) || 0;
          const qty = Number(item.quantity) || 1;

          const existing = categoryStats.get(category) || { items: 0, revenue: 0, orders: 0, avgPrice: 0 };
          existing.items += qty;
          existing.revenue += (price * qty);
          existing.orders += 1;
          categoryStats.set(category, existing);
        });
      }
    });

    const categories = Array.from(categoryStats.entries())
      .map(([name, stats]) => ({
        name,
        items: stats.items,
        revenue: stats.revenue,
        orders: stats.orders,
        avgPrice: stats.revenue / stats.items,
        contribution: totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // 11. Performance Insights
    const insights = {
      bestPerformingHour: peakHour,
      highestRevenueHour: peakRevenueHour,
      mostPopularTable: tableAnalytics[0],
      topPaymentMethod: paymentMethods[0],
      customerRetentionRate: returningCustomers / (newCustomers + returningCustomers) * 100,
      avgOrdersPerCustomer: totalOrders / customerAnalytics.length,
      revenuePerCustomer: totalRevenue / customerAnalytics.length,
      tableEfficiency: tableAnalytics.length > 0 ? tableAnalytics.reduce((sum, t) => sum + t.utilization, 0) / tableAnalytics.length : 0,
      // Discount insights
      totalDiscounts,
      discountPercentage,
      averageDiscountPerOrder,
      originalRevenue
    };

    console.log('📊 [ANALYTICS] Final analytics object:', {
      sales: { totalRevenue, totalDiscounts, originalRevenue, discountPercentage, totalOrders, averageOrderValue, averageDiscountPerOrder, dailySales },
      items: { topItems },
      payments: { paymentMethods },
      tables: { tableAnalytics, insights },
      customers: {
        totalCustomers: customerAnalytics.length,
        newCustomers,
        returningCustomers,
        highValueCustomers: highValueCustomers.length,
        avgLifetimeValue: avgCustomerLifetimeValue,
        customerAnalytics: customerAnalytics // Show ALL customers
      },
      orderValueDistribution: orderValueRanges,
      peak: { hourlyDistribution, peakHour: peakHour.hour, insights },
      categories,
      performance: insights
    });

    return {
      sales: { totalRevenue, totalDiscounts, originalRevenue, discountPercentage, totalOrders, averageOrderValue, averageDiscountPerOrder, dailySales, totalSessions: filteredSessions.length },
      items: { topItems },
      payments: { paymentMethods },
      tables: { tableAnalytics, insights },
      customers: {
        totalCustomers: customerAnalytics.length,
        newCustomers,
        returningCustomers,
        highValueCustomers: highValueCustomers.length,
        avgLifetimeValue: avgCustomerLifetimeValue,
        customerAnalytics: customerAnalytics // Show ALL customers
      },
      orderValueDistribution: orderValueRanges,
      peak: { hourlyDistribution, peakHour: peakHour.hour, insights },
      categories,
      performance: insights
    };
  }, [rawOrders, rawSessions, rawPayments, period]);

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  if (!permissions?.canViewAnalytics) {
    return <AccessDenied requiredRole="Owner or Manager" message="You need owner or manager access to view analytics" />;
  }

  if (loading && !rawOrders.length) {
    return <div className="p-8 text-center">Loading comprehensive analytics...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black backdrop-blur-xl p-6 md:p-8 border-b border-gray-100 shrink-0 supports-[backdrop-filter]:bg-black relative -mx-6 -mt-6 rounded-b-3xl shadow-sm z-10 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-red-600" />
            Advanced Business Intelligence
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-2">Deep insights into your restaurant&apos;s performance, customer behavior, and operational efficiency</p>
        </div>

        <div className="flex bg-[#050506] p-1.5 rounded-2xl border border-zinc-900/40">
          {[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'year', label: 'Year' },
            { value: 'all', label: 'All Time' }
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                period === p.value
                  ? 'bg-[#d5b263]/10 text-[#d5b263] border border-[#d5b263]/20'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Simple Stats Cards (from Past Sessions) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/40">
              <Receipt className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Total Sessions</p>
              <p className="text-2xl font-black text-white tracking-tight leading-none">{analytics?.sales?.totalSessions || 0}</p>
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
                {formatPrice(analytics?.sales.totalRevenue || 0)}
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
                {analytics?.sales.totalOrders || 0}
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
                {(analytics?.sales?.totalSessions || 0) > 0
                  ? formatPrice((analytics?.sales.totalRevenue || 0) / (analytics?.sales?.totalSessions || 1))
                  : formatPrice(0)
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-br from-[#d5b263]/15 via-[#0c0c0e] to-[#0c0c0e] p-8 rounded-[2rem] border border-[#d5b263]/25 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d5b263] rounded-full blur-3xl -mr-32 -mt-32 opacity-10 pointer-events-none"></div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#d5b263]/10 flex items-center justify-center backdrop-blur-sm border border-[#d5b263]/20">
            <Target className="w-6 h-6 text-[#d5b263]" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Executive Summary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
          <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800/80 hover:bg-zinc-800/20 transition-all">
            <div className="text-3xl font-black tracking-tight mb-1 text-white">{formatPrice(analytics?.performance?.revenuePerCustomer || 0)}</div>
            <div className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Revenue per Customer</div>
          </div>
          <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800/80 hover:bg-zinc-800/20 transition-all">
            <div className="text-3xl font-black tracking-tight mb-1 text-white">{analytics?.performance?.customerRetentionRate?.toFixed(1) || 0}%</div>
            <div className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Customer Retention</div>
          </div>
          <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800/80 hover:bg-zinc-800/20 transition-all">
            <div className="text-3xl font-black tracking-tight mb-1 text-white">{analytics?.performance?.tableEfficiency?.toFixed(1) || 0}%</div>
            <div className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Table Efficiency</div>
          </div>
          <div className="bg-black/40 p-6 rounded-2xl border border-zinc-800/80 hover:bg-zinc-800/20 transition-all">
            <div className="text-3xl font-black tracking-tight mb-1 text-white">{analytics?.performance?.bestPerformingHour?.hour || 0}:00</div>
            <div className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Peak Hour</div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/60 text-[#d5b263]">
              <IndianRupee className="w-6 h-6 text-[#d5b263]" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Total Revenue</span>
          </div>
          <div className="text-3xl font-black text-[#d5b263] tracking-tight leading-none mb-2">
            {formatPrice(analytics?.sales.totalRevenue || 0)}
          </div>
          <div className="text-xs font-bold text-green-400 flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1 rounded-lg inline-flex border border-green-500/20">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>in selected period</span>
          </div>
        </div>

        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/60 text-red-400">
              <Award className="w-6 h-6 text-red-400" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Total Discounts</span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight leading-none mb-2">
            {formatPrice(analytics?.sales.totalDiscounts || 0)}
          </div>
          <div className="text-xs font-bold text-red-400 flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-lg inline-flex border border-red-500/20">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>{analytics?.sales.discountPercentage?.toFixed(1) || 0}% of revenue</span>
          </div>
        </div>

        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/60 text-white">
              <ShoppingBag className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Total Orders</span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight leading-none mb-2">
            {analytics?.sales.totalOrders || 0}
          </div>
          <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg inline-flex border border-zinc-800/60">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Avg. {formatPrice(analytics?.sales.averageOrderValue || 0)}</span>
          </div>
        </div>

        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/60 text-white">
              <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Active Customers</span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight leading-none mb-2">
            {analytics?.customers.totalCustomers || 0}
          </div>
          <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg inline-flex border border-zinc-800/60">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{analytics?.customers.newCustomers || 0} new, {analytics?.customers.returningCustomers || 0} ret.</span>
          </div>
        </div>

        <div className="bg-[#0c0c0e] p-6 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800/60 text-white">
              <Table className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Top Table</span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight leading-none mb-2 mt-6">
            {analytics?.tables.tableAnalytics?.[0]?.tableNumber || 'N/A'}
          </div>
          <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg inline-flex border border-zinc-800/60">
            <Award className="w-3.5 h-3.5" />
            <span>{formatPrice(analytics?.tables.tableAnalytics?.[0]?.revenue || 0)}</span>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Payment Methods Deep Analysis */}
        <div className="xl:col-span-1 bg-[#0c0c0e] p-8 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800/40 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Payment Methods</h3>
          </div>
          {analytics?.payments?.paymentMethods?.length ? (
            <div className="space-y-4">
              {analytics?.payments?.paymentMethods?.map((method: any, i: number) => {
                return (
                  <div key={i} className="p-5 bg-black/40 rounded-2xl border border-zinc-900/40">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-white capitalize tracking-wide">{method.method}</span>
                      <span className="text-sm font-black text-[#d5b263] bg-[#d5b263]/10 px-2 py-1 rounded-md border border-[#d5b263]/20">{method.percentage?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="space-y-2 text-sm font-medium text-zinc-550">
                      <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                        <span>Revenue:</span>
                        <span className="font-black text-white">{formatPrice(method.revenue || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2 pt-1">
                        <span>Transactions:</span>
                        <span className="font-bold text-white">{method.count || 0}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2 pt-1">
                        <span>Avg Transaction:</span>
                        <span className="font-bold text-white">{formatPrice(method.avgOrder || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span>Unique Customers:</span>
                        <span className="font-bold text-white">{method.customers || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-zinc-500">
              <CreditCard className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">No payment data available</p>
              <p className="text-xs mt-1">Payment methods will appear here once transactions are recorded</p>
            </div>
          )}
        </div>

        {/* Revenue Trend & Top Items */}
        <div className="xl:col-span-2 space-y-6">
          {/* Revenue Trend */}
          <div className="bg-[#0c0c0e] p-8 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800/40 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#d5b263]" strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">Revenue Trend</h3>
              </div>
            </div>
            {analytics?.sales?.dailySales?.length ? (
              <div className="h-64">
                <BarChart
                  data={analytics?.sales?.dailySales}
                  valueKey="totalAmount"
                  labelKey="date"
                  color="bg-[#d5b263]"
                />
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-zinc-500">
                <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No revenue data available</p>
              </div>
            )}
          </div>

          {/* Discount Analysis */}
          <div className="bg-[#0c0c0e] p-8 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800/40 flex items-center justify-center">
                <Award className="w-5 h-5 text-red-400" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Discount Analysis</h3>
            </div>
            {analytics?.sales?.totalDiscounts > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <div className="text-center p-6 bg-red-500/5 rounded-2xl border border-red-500/15 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl font-black text-red-400 tracking-tight mb-1">{formatPrice(analytics?.sales?.totalDiscounts || 0)}</div>
                    <div className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Total Discounts Given</div>
                  </div>
                  <div className="text-center p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl font-black text-[#d5b263] tracking-tight mb-1">{analytics?.sales?.discountPercentage?.toFixed(1) || '0.0'}%</div>
                    <div className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Discount Rate</div>
                  </div>
                </div>
                <div className="text-center p-6 bg-green-500/5 rounded-2xl border border-green-500/15 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-3xl font-black text-green-400 tracking-tight mb-1">{formatPrice(analytics?.sales?.originalRevenue || 0)}</div>
                  <div className="text-xs font-bold text-zinc-550 uppercase tracking-widest">Original Revenue (before discounts)</div>
                </div>
                <div className="h-64 mt-8">
                  <DualMetricChart
                    data={analytics?.sales?.dailySales?.filter(d => d.discountAmount > 0) || []}
                    primaryKey="originalAmount"
                    secondaryKey="discountAmount"
                    labelKey="date"
                    primaryColor="bg-zinc-800"
                    secondaryColor="bg-red-500/80"
                  />
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <Award className="w-12 h-12 mb-3 opacity-50 mx-auto" />
                  <p className="text-sm font-medium">No discounts applied</p>
                  <p className="text-xs mt-1">Discount information will appear here once discounts are offered</p>
                </div>
              </div>
            )}
          </div>

          {/* Top Performing Items */}
          <div className="bg-[#0c0c0e] p-8 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800/40 flex items-center justify-center">
                <Award className="w-5 h-5 text-[#d5b263]" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Top Performing Items</h3>
            </div>
            {analytics?.items?.topItems?.length ? (
              <div className="space-y-3">
                {analytics?.items?.topItems?.slice(0, 8)?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-[#050506] rounded-2xl border border-zinc-900/40">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black
                    ${i === 0 ? 'bg-[#d5b263]/20 text-[#d5b263] border border-[#d5b263]/30' :
                          i === 1 ? 'bg-zinc-800/40 text-zinc-300 border border-zinc-700/60' :
                            i === 2 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-[#121215] text-zinc-500 border border-zinc-800/60'}`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-white block">{item.name}</span>
                        <div className="text-xs font-medium text-zinc-500">{item.orders} orders</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-[#d5b263]">{formatPrice(item.revenue)}</div>
                      <div className="text-xs font-medium text-zinc-500">{item.quantity} units</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-zinc-500 font-bold">No item data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Table Performance & Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table Performance Analytics */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <Table className="w-5 h-5 text-orange-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Table Performance</h3>
          </div>
          {analytics?.tables?.tableAnalytics?.length ? (
            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {analytics?.tables?.tableAnalytics?.map((table: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black
                  ${i === 0 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-white text-gray-500 border border-gray-200 shadow-sm'
                      }`}>
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">Table {table.tableNumber}</span>
                      <div className="text-xs font-medium text-gray-500">{table.customers} customers</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-gray-900">{formatPrice(table.revenue)}</div>
                    <div className="text-xs font-medium text-gray-500">{table.orders} orders</div>
                    <div className="text-xs font-bold text-orange-600 mt-0.5 bg-orange-50 px-1.5 py-0.5 rounded inline-block">{table.utilization.toFixed(1)}% util.</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 font-bold">No table data available</div>
          )}
        </div>

        {/* Customer Segmentation */}
        <div className="bg-[#0c0c0e] p-8 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800/40 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#d5b263]" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Customer Segmentation</h3>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="p-5 bg-[#d5b263]/5 rounded-2xl border border-[#d5b263]/15 text-center">
                <div className="text-3xl font-black text-[#d5b263] tracking-tight mb-1">{analytics?.customers.newCustomers || 0}</div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">New Customers</div>
              </div>
              <div className="p-5 bg-black/40 rounded-2xl border border-zinc-900/40 text-center">
                <div className="text-3xl font-black text-white tracking-tight mb-1">{analytics?.customers.returningCustomers || 0}</div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Returning Customers</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-[#050506] rounded-2xl border border-zinc-900/40">
                <span className="text-sm font-medium text-zinc-500">Avg Lifetime Value</span>
                <span className="font-black text-white">{formatPrice(analytics?.customers.avgLifetimeValue || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#050506] rounded-2xl border border-zinc-900/40">
                <span className="text-sm font-medium text-zinc-500">High-Value Customers</span>
                <span className="font-black text-white">{analytics?.customers.highValueCustomers || 0}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-[#050506] rounded-2xl border border-zinc-900/40">
                <span className="text-sm font-medium text-zinc-500">Retention Rate</span>
                <span className="font-black text-[#d5b263] bg-[#d5b263]/10 px-2 py-0.5 rounded-md border border-[#d5b263]/20">{analytics?.performance?.customerRetentionRate?.toFixed(1) || 0}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Intelligence */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Hourly Performance */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Hourly Performance</h3>
          </div>
          {analytics?.peak.hourlyDistribution.some((d: any) => d.orderCount > 0) ? (
            <div className="space-y-5">
              <div className="text-center p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="text-2xl font-black text-indigo-600 tracking-tight mb-0.5">{analytics.performance.bestPerformingHour.hour}:00</div>
                <div className="text-xs font-bold text-indigo-800/60 uppercase tracking-widest">Peak Hour</div>
              </div>
              <BarChart
                data={analytics.peak.hourlyDistribution.filter((_, i) => i >= 8 && i <= 23).slice(0, 8)}
                valueKey="orderCount"
                labelKey="hour"
                color="bg-indigo-500"
                height="h-32"
              />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-500 font-bold">No hourly data available</div>
          )}
        </div>

        {/* Categories Performance */}
        <div className="bg-[#0c0c0e] p-8 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800/40 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#d5b263]" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Menu Categories</h3>
          </div>
          {analytics?.categories.length ? (
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
              {analytics.categories.map((category: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#050506] rounded-2xl border border-zinc-900/40">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black
                  ${i < 3 ? 'bg-[#d5b263]/20 text-[#d5b263] border border-[#d5b263]/30' : 'bg-[#121215] text-zinc-500 border border-zinc-800/60'
                      }`}>
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-white block">{category.name}</span>
                      <div className="text-xs font-medium text-zinc-500">{category.orders} orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#d5b263]">{formatPrice(category.revenue)}</div>
                    <div className="text-xs font-medium text-zinc-500">{category.items} sold</div>
                    <div className="text-xs font-bold text-zinc-500 mt-0.5 bg-[#121215] px-1.5 py-0.5 rounded inline-block border border-zinc-850">{category.contribution.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-500 font-bold">No category data available</div>
          )}
        </div>

        {/* Category Performance Pie */}
        <div className="bg-[#0c0c0e] p-8 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#d5b263]/10 border border-[#d5b263]/20 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-[#d5b263]" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Category Sales</h3>
          </div>
          {analytics?.categories.length ? (
            <div className="space-y-3">
              {analytics.categories.slice(0, 6).map((category: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3.5 bg-[#050506] rounded-2xl border border-zinc-900/40">
                  <div className="flex items-center gap-4">
                    <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black
                  ${i === 0 ? 'bg-[#d5b263]/20 text-[#d5b263] border border-[#d5b263]/30' : 'bg-[#121215] text-zinc-500 border border-zinc-800/60'
                      }`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-bold text-white">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#d5b263]">{formatPrice(category.revenue)}</div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{category.contribution.toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-500 font-bold">No category data available</div>
          )}
        </div>
      </div>

      {/* Comprehensive Data Overview - ALL */}
      <div className="bg-gradient-to-br from-[#d5b263]/15 via-[#0c0c0e] to-[#0c0c0e] p-8 rounded-[2rem] border border-[#d5b263]/25 text-white relative overflow-hidden mt-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d5b263] rounded-full blur-3xl -mr-32 -mt-32 opacity-10 pointer-events-none"></div>
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="p-3 bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-2xl">
            <BarChart3 className="w-6 h-6 text-[#d5b263]" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">System Data Overview</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-black/40 p-6 rounded-3xl border border-zinc-800/80 hover:bg-zinc-800/20 transition-all">
            <h3 className="text-xs font-bold text-[#d5b263] uppercase tracking-widest mb-3">All Customers</h3>
            <div className="text-4xl font-black mb-1 text-white">{analytics?.customers?.totalCustomers || 0}</div>
            <div className="text-xs font-semibold text-zinc-500">Total unique customer profiles</div>
          </div>

          <div className="bg-black/40 p-6 rounded-3xl border border-zinc-800/80 hover:bg-zinc-800/20 transition-all">
            <h3 className="text-xs font-bold text-[#d5b263] uppercase tracking-widest mb-3">Active Tables</h3>
            <div className="text-4xl font-black mb-1 text-white">{analytics?.tables?.tableAnalytics?.length || 0}</div>
            <div className="text-xs font-semibold text-zinc-500">Monitored dining spaces</div>
          </div>

          <div className="bg-black/40 p-6 rounded-3xl border border-zinc-800/80 hover:bg-zinc-800/20 transition-all">
            <h3 className="text-xs font-bold text-[#d5b263] uppercase tracking-widest mb-3">Menu Categories</h3>
            <div className="text-4xl font-black mb-1 text-white">{analytics?.categories?.length || 0}</div>
            <div className="text-xs font-semibold text-zinc-500">Active product classifications</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Top Customers */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Top Customers</h3>
          </div>
          {analytics?.customers.customerAnalytics.length ? (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
              {analytics.customers.customerAnalytics.map((customer: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black
                    ${i < 3 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-500 border border-gray-200 shadow-sm'
                      }`}>
                      {i + 1}
                    </span>
                    <div>
                      <span className="text-sm font-bold text-gray-900 block">{customer.customerName}</span>
                      <div className="text-xs font-medium text-gray-500">{customer.totalOrders} orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#d5b263]">{formatPrice(customer.totalSpent)}</div>
                    <div className="text-xs font-bold text-zinc-550 mt-0.5 bg-[#121215] px-1.5 py-0.5 rounded inline-block border border-zinc-800/60">Avg {formatPrice(customer.avgOrderValue)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-500 font-bold">No customer data available</div>
          )}
        </div>

        {/* Business Intelligence Insights */}
        <div className="bg-[#0c0c0e] p-8 rounded-3xl border border-zinc-900/40 hover:border-zinc-800/60 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800/40 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">Business Intelligence</h3>
          </div>
          <div className="space-y-5">
            <div className="p-5 bg-[#d5b263]/5 rounded-2xl border border-[#d5b263]/15 hover:bg-[#d5b263]/10 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-[#d5b263]/10 border border-[#d5b263]/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-[#d5b263]" strokeWidth={3} />
                </div>
                <span className="text-sm font-black text-white tracking-tight">Revenue Insights</span>
              </div>
              <div className="text-sm text-zinc-400 font-medium">
                Highest revenue hour:{' '}
                <span className="font-black bg-[#d5b263]/10 border border-[#d5b263]/20 px-2 py-0.5 rounded-md text-[#d5b263] ml-1">
                  {analytics?.performance?.highestRevenueHour?.hour || 0}:00
                </span>{' '}
                <span className="text-zinc-500 font-bold">({formatPrice(analytics?.performance?.highestRevenueHour?.revenue || 0)})</span>
              </div>
            </div>

            <div className="p-5 bg-black/40 rounded-2xl border border-zinc-900/40 hover:bg-[#121215]/80 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-zinc-950 border border-zinc-800/60 rounded-lg">
                  <Target className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <span className="text-sm font-black text-white tracking-tight">Performance Metrics</span>
              </div>
              <div className="text-sm text-zinc-400 font-medium space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50">
                  <span>Table efficiency:</span>
                  <span className="font-black bg-[#121215] border border-zinc-800/60 px-2 py-0.5 rounded-md text-white">
                    {analytics?.performance?.tableEfficiency?.toFixed(1) || 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span>Orders / customer:</span>
                  <span className="font-black bg-[#121215] border border-zinc-800/60 px-2 py-0.5 rounded-md text-white">
                    {analytics?.performance?.avgOrdersPerCustomer?.toFixed(1) || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-black/40 rounded-2xl border border-zinc-900/40 hover:bg-[#121215]/80 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-zinc-950 border border-zinc-800/60 rounded-lg">
                  <Award className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <span className="text-sm font-black text-white tracking-tight">System Performers</span>
              </div>
              <div className="text-sm text-zinc-400 font-medium space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800/50">
                  <span>Top payment method:</span>
                  <span className="font-black bg-[#121215] border border-zinc-800/60 px-2 py-0.5 rounded-md text-white capitalize">
                    {analytics?.performance?.topPaymentMethod?.method || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span>Most active table:</span>
                  <span className="font-black bg-[#d5b263]/10 border border-[#d5b263]/20 px-2 py-0.5 rounded-md text-[#d5b263] uppercase">
                    T-{analytics?.performance?.mostPopularTable?.tableNumber || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Analytics...</p>
    </div>
  )
}
