"use client";

import { useEffect, useState, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import {
  Calendar, Users, Clock, X, AlertCircle, Phone, Mail,
  MessageSquare, CheckCircle2, XCircle, Armchair, RefreshCw,
  ChevronRight, ArrowRight, ExternalLink, Info, Plus
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { formatDateTime, formatDate, formatTime, capitalize } from '@/lib/utils';
import { getPermissions } from '@/lib/permissions';
import toast from 'react-hot-toast';
import { useWebSocket } from '@/lib/websocket-context';
import { motion, AnimatePresence } from 'framer-motion';

interface Reservation {
  id: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  numberOfGuests: number;
  reservationTime: string;
  reservationEndTime?: string | null;
  reservationDate?: string;
  occasion?: string | null;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
  tableId?: string;
  createdAt?: string;
}

interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  liveStatus: 'available' | 'occupied' | 'reserved';
}

interface ReservationFormData {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  numberOfGuests: number;
  occasion: string;
  reservationDate: string;
  reservationStartTime: string;
  reservationEndTime: string;
  specialRequests: string;
}

export default function ReservationsPage() {
  const { user, restaurant, isLoading: dashboardLoading } = useDashboard();
  const { socket, isConnected, joinRestaurant } = useWebSocket();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [viewReservation, setViewReservation] = useState<Reservation | null>(null);
  const [assignTableId, setAssignTableId] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');

  // Create Manual Reservation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ReservationFormData>({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    numberOfGuests: 2,
    occasion: '',
    reservationDate: new Date().toISOString().split('T')[0],
    reservationStartTime: '19:00',
    reservationEndTime: '21:00',
    specialRequests: ''
  });

  // Disabled since we use WebSocket
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  console.log('🎯 RESERVATIONS PAGE RENDER:', {
    hasUser: !!user,
    hasRestaurant: !!restaurant,
    restaurantId: restaurant?.id,
    reservationsCount: reservations.length,
    tablesCount: tables.length,
    loading,
    filter,
    lastUpdated: lastUpdated?.toLocaleTimeString()
  });

  const loadData = useCallback(async () => {
    if (!restaurant) {
      console.log('⚠️ loadData called but no restaurant');
      return;
    }

    try {
      console.log('🚀 Starting loadData for restaurant:', restaurant.id);
      setLoading(true);

      console.log('📡 Making API calls...');
      const [reservationsData, tablesData] = await Promise.all([
        apiClient.getRestaurantReservations(restaurant.id),
        apiClient.getTables(restaurant.id),
      ]) as [{ reservations: Reservation[] }, { tables: Table[] }];

      console.log('✅ API Response - Reservations:', {
        data: reservationsData,
        hasReservations: !!reservationsData?.reservations,
        reservationsArray: reservationsData?.reservations,
        arrayLength: reservationsData?.reservations?.length || 0
      });

      console.log('✅ API Response - Tables:', {
        data: tablesData,
        hasTables: !!tablesData?.tables,
        tablesArray: tablesData?.tables,
        arrayLength: tablesData?.tables?.length || 0
      });

      const resList: Reservation[] = reservationsData.reservations || [];
      console.log('📊 Processing reservations list:', {
        rawList: resList,
        count: resList.length,
        firstItem: resList[0]
      });

      resList.sort((a, b) =>
        new Date(a.reservationTime).getTime() - new Date(b.reservationTime).getTime()
      );

      console.log('📊 After sorting:', resList.length, 'reservations');

      setReservations(resList);
      setTables(tablesData.tables || []);
      setLastUpdated(new Date());

      console.log('✅ State updated - Reservations:', resList.length, 'Tables:', (tablesData.tables || []).length);
    } catch (error) {
      console.error('❌ Error loading reservations:', error);
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
      console.log('🏁 loadData complete');
    }
  }, [restaurant]);

  useEffect(() => {
    console.log('🔄 RESERVATIONS PAGE: useEffect triggered', {
      restaurant: restaurant?.id,
      dashboardLoading,
      hasUser: !!user
    });

    if (restaurant && !dashboardLoading) {
      console.log('🔄 RESERVATIONS PAGE: Loading data for restaurant:', restaurant.id);
      loadData();
    } else if (!restaurant && !dashboardLoading) {
      console.log('⚠️ RESERVATIONS PAGE: No restaurant available yet');
      setLoading(false);
    }
  }, [restaurant, dashboardLoading, loadData, user]);

  // WebSocket setup for real-time updates
  useEffect(() => {
    if (!restaurant || !socket || !isConnected) return;

    console.log('🔌 Setting up WebSocket for reservations');

    // Join restaurant room for real-time updates
    joinRestaurant(restaurant.id);

    // Listen for reservation updates
    const handleReservationUpdate = (data: { type: string; reservationId: string; status: Reservation['status'] }) => {
      console.log('📡 Received reservation update:', data);
      if (data.type === 'status-change') {
        // Update the specific reservation in the list
        setReservations(prev => prev.map(res =>
          res.id === data.reservationId
            ? { ...res, status: data.status }
            : res
        ));
        setLastUpdated(new Date());
        toast.success(`Reservation status updated to ${data.status}`);
      }
    };

    socket.on('reservation-updated', handleReservationUpdate);

    return () => {
      console.log('🧹 Cleaning up WebSocket listeners');
      socket.off('reservation-updated', handleReservationUpdate);
    };
  }, [restaurant, socket, isConnected, joinRestaurant]);

  const permissions = user ? getPermissions(user.role) : null;



  if (dashboardLoading || !user || !restaurant) {
    console.log('⏳ RESERVATIONS PAGE: Showing skeleton loader', {
      dashboardLoading,
      hasUser: !!user,
      hasRestaurant: !!restaurant
    });
    return <SkeletonLoader />;
  }


  const handleConfirm = async (reservationId: string) => {
    console.log('🎯 handleConfirm called:', { reservationId, hasRestaurant: !!restaurant });

    if (!restaurant) {
      console.log('⚠️ No restaurant - aborting');
      return;
    }

    console.log('💬 Showing confirmation dialog');
    if (!confirm('Confirm this reservation? The guest will be notified.')) {
      console.log('❌ User cancelled confirmation');
      return;
    }

    console.log('⏳ Setting processing ID:', reservationId);
    setProcessingId(reservationId);

    try {
      console.log('✅ CONFIRMING reservation:', {
        reservationId,
        restaurantId: restaurant.id,
        payload: { restaurantId: restaurant.id, status: 'confirmed' }
      });

      // Update reservation status to confirmed
      const result = await apiClient.assignTableToReservation(reservationId, {
        restaurantId: restaurant.id,
        status: 'confirmed'
      });

      console.log('✅ Confirmation successful:', result);
      toast.success('Reservation confirmed! Guest will be notified.');

      console.log('🔄 Reloading data...');
      await loadData();
      console.log('✅ Data reload complete');
    } catch (error) {
      console.error('❌ Error confirming reservation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to confirm reservation');
    } finally {
      console.log('🏁 Clearing processing ID');
      setProcessingId(null);
    }
  };

  const handleAssignTable = async () => {
    console.log('🪑 handleAssignTable called:', {
      hasRestaurant: !!restaurant,
      hasSelectedReservation: !!selectedReservation,
      hasAssignTableId: !!assignTableId,
      restaurantId: restaurant?.id,
      reservationId: selectedReservation?.id,
      tableId: assignTableId
    });

    if (!restaurant || !selectedReservation || !assignTableId) {
      console.log('⚠️ Missing required data - aborting');
      return;
    }

    console.log('⏳ Setting processing ID:', selectedReservation.id);
    setProcessingId(selectedReservation.id);

    try {
      console.log('🪑 ASSIGNING TABLE:', {
        reservationId: selectedReservation.id,
        tableId: assignTableId,
        restaurantId: restaurant.id,
        payload: {
          tableId: assignTableId,
          restaurantId: restaurant.id,
          status: 'confirmed'
        }
      });

      const result = await apiClient.assignTableToReservation(selectedReservation.id, {
        tableId: assignTableId,
        restaurantId: restaurant.id,
        status: 'confirmed'
      });

      console.log('✅ Table assignment successful:', result);
      toast.success('Table assigned and reservation confirmed!');

      console.log('🔄 Clearing modal state');
      setSelectedReservation(null);
      setAssignTableId('');

      console.log('🔄 Reloading data...');
      await loadData();
      console.log('✅ Data reload complete');
    } catch (error) {
      console.error('❌ Error assigning table:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign table');
    } finally {
      console.log('🏁 Clearing processing ID');
      setProcessingId(null);
    }
  };

  const handleReject = async (reservationId: string) => {
    if (!restaurant) return;

    if (!confirm('⚠️ Are you sure you want to REJECT this reservation? The guest will be notified.')) return;

    setProcessingId(reservationId);
    try {
      if (process.env.NODE_ENV !== 'production' || window.location.hostname === 'localhost') {
        console.log('❌ REJECTING reservation:', reservationId);
      }

      await apiClient.rejectReservation(reservationId, restaurant.id);
      toast.success('Reservation rejected');
      loadData();
    } catch (error) {
      console.error('❌ Error rejecting reservation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject reservation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = async (reservationId: string, newStatus: string) => {
    console.log('🔄 handleStatusChange called:', {
      reservationId,
      newStatus,
      hasRestaurant: !!restaurant,
      restaurantId: restaurant?.id
    });

    if (!restaurant) {
      console.log('⚠️ No restaurant - aborting');
      return;
    }

    const statusMessages: Record<string, string> = {
      confirmed: 'confirm this reservation',
      pending: 'move this reservation back to pending',
      rejected: 'reject this reservation',
      completed: 'mark this reservation as completed',
      cancelled: 'cancel this reservation'
    };

    console.log('💬 Showing confirmation dialog:', statusMessages[newStatus]);
    if (!confirm(`Are you sure you want to ${statusMessages[newStatus]}? The guest will be notified.`)) {
      console.log('❌ User cancelled status change');
      return;
    }

    console.log('⏳ Setting processing ID:', reservationId);
    setProcessingId(reservationId);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      const url = `${BACKEND_URL}/api/reservations/${reservationId}/status`;
      const payload = {
        restaurantId: restaurant.id,
        status: newStatus
      };

      console.log('🔄 CHANGING STATUS - Request details:', {
        reservationId,
        newStatus,
        url,
        payload,
        method: 'PATCH'
      });

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      console.log('📡 Response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Response not OK:', errorData);
        throw new Error(errorData.message || 'Failed to update status');
      }

      const result = await response.json();
      console.log('✅ Status change successful:', result);

      toast.success(`Reservation status updated to ${newStatus}`);

      console.log('🔄 Reloading data...');
      await loadData();
      console.log('✅ Data reload complete');
    } catch (error) {
      console.error('❌ Error updating status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      console.log('🏁 Clearing processing ID');
      setProcessingId(null);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    // Validate mandatory fields
    if (!formData.guestName || !formData.guestPhone || !formData.guestEmail || !formData.numberOfGuests || !formData.occasion || !formData.reservationDate || !formData.reservationStartTime || !formData.reservationEndTime) {
      toast.error('Please fill in all mandatory fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const reservationId = typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      const reservationTime = new Date(`${formData.reservationDate}T${formData.reservationStartTime}`).toISOString();
      const reservationEndTime = new Date(`${formData.reservationDate}T${formData.reservationEndTime}`).toISOString();

      await apiClient.createReservation(reservationId, {
        restaurantId: restaurant.id,
        numberOfGuests: Number(formData.numberOfGuests),
        reservationTime,
        reservationEndTime,
        occasion: formData.occasion,
        specialRequests: formData.specialRequests,
        guestName: formData.guestName,
        guestPhone: formData.guestPhone,
        guestEmail: formData.guestEmail
      });

      toast.success('Reservation created successfully!');
      setShowCreateModal(false);
      setFormData({
        guestName: '',
        guestPhone: '',
        guestEmail: '',
        numberOfGuests: 2,
        occasion: '',
        reservationDate: new Date().toISOString().split('T')[0],
        reservationStartTime: '19:00',
        reservationEndTime: '21:00',
        specialRequests: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D32F2F] mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading reservations...</p>
        </div>
      </div>
    );
  }

  if (!permissions?.canViewReservations) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don&apos;t have permission to view reservations</p>
      </div>
    );
  }

  const filteredReservations = filter === 'all'
    ? reservations
    : reservations.filter(r => r.status === filter);

  console.log('🔍 Filtered Reservations:', {
    filter,
    totalReservations: reservations.length,
    filteredCount: filteredReservations.length,
    allStatuses: reservations.map(r => r.status)
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const pendingReservations = filteredReservations.filter(r => r.status === 'pending');
  const confirmedReservations = filteredReservations.filter(r => {
    const isConfirmed = r.status === 'confirmed';
    const isTodayOrFuture = new Date(r.reservationTime) >= todayStart;
    return isConfirmed && isTodayOrFuture;
  });
  const pastReservations = filteredReservations.filter(r =>
    r.status === 'completed' ||
    r.status === 'rejected' ||
    r.status === 'cancelled' ||
    (r.status === 'confirmed' && new Date(r.reservationTime) < todayStart)
  );

  console.log('📈 Categorized Reservations:', {
    pending: pendingReservations.length,
    confirmed: confirmedReservations.length,
    past: pastReservations.length
  });

  const availableTables = tables.filter(t => t.liveStatus === 'available');
  console.log('🪑 Available Tables:', availableTables.length);


  return (
    <div className="space-y-8 pb-32 max-w-[1600px] mx-auto">
      {/* HEADER SECTION - Swiggy Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#D32F2F]">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Reservations</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Booking <span className="text-gray-400">Ledger</span>
          </h1>
          <p className="text-gray-500 font-medium">Manage and track all your restaurant bookings in real-time.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[#D32F2F] text-white rounded-2xl font-black text-sm hover:bg-[#B71C1C] transition-all shadow-[0_8px_20px_rgba(211,47,47,0.25)] hover:shadow-[0_12px_25px_rgba(211,47,47,0.35)] active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" strokeWidth={3} /> New Booking
          </button>

          <div className="h-10 w-[1px] bg-gray-200 mx-2 hidden md:block" />

          <button
            onClick={() => loadData()}
            className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-600 hover:text-gray-900 shadow-sm transition-all active:scale-95 group"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </button>

          <div className="h-10 w-[1px] bg-gray-200 mx-2 hidden md:block" />

          <div className="flex items-center gap-1 bg-white p-1.5 rounded-[20px] border border-gray-200 shadow-sm">
            {(['all', 'pending', 'confirmed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-6 py-2 rounded-[14px] text-sm font-bold transition-all ${filter === t
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'text-gray-500 hover:bg-gray-50'
                  }`}
              >
                {capitalize(t)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STATS TILES - Vibrant Zomato/Swiggy Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Pending', count: reservations.filter(r => r.status === 'pending').length, color: 'orange', icon: Clock },
          { label: 'Confirmed', count: reservations.filter(r => {
            return r.status === 'confirmed' && new Date(r.reservationTime) >= todayStart;
          }).length, color: 'emerald', icon: CheckCircle2 },
          { label: 'Available Tables', count: availableTables.length, color: 'blue', icon: Armchair },
          { label: 'Rejected', count: reservations.filter(r => r.status === 'rejected').length, color: 'rose', icon: XCircle },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all group overflow-hidden relative"
          >
            {/* Background Decor */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-bl-[100px] -mr-6 -mt-6 transition-transform group-hover:scale-110`} />

            <div className="flex items-center gap-5 relative">
              <div className={`w-14 h-14 bg-${stat.color}-50 flex items-center justify-center rounded-2xl text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-7 h-7" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.count}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* RESERVATION LISTINGS */}
      <div className="space-y-12">
        {/* Pending Section */}
        {pendingReservations.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-orange-500 rounded-full" />
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Pending Approval</h2>
                <div className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-black uppercase border border-orange-100">
                  {pendingReservations.length} new
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {pendingReservations.map((reservation) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={reservation.id}
                    className="bg-white rounded-[32px] border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all p-6 group flex flex-col relative"
                  >
                    {/* Status Dot */}
                    <div className="absolute top-6 right-6 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />

                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500 font-black text-xl border border-gray-100">
                        {reservation.guestName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-gray-900 truncate group-hover:text-[#D32F2F] transition-colors">
                          {reservation.guestName}
                        </h3>
                        <p className="text-sm font-medium text-gray-400 mt-0.5">{reservation.guestPhone || 'No contact info'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-[#F8F9FA] p-4 rounded-2xl border border-gray-100/50">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Entry Time</span>
                        </div>
                        <p className="text-sm font-black text-gray-900">{formatTime(reservation.reservationTime)}</p>
                        <p className="text-[11px] font-bold text-gray-400">{formatDate(reservation.reservationTime)}</p>
                      </div>
                      <div className="bg-[#F8F9FA] p-4 rounded-2xl border border-gray-100/50">
                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Party Size</span>
                        </div>
                        <p className="text-sm font-black text-gray-900">{reservation.numberOfGuests} People</p>
                        <p className="text-[11px] font-bold text-blue-500 uppercase tracking-tight">Confirmed Group</p>
                      </div>
                    </div>

                    {reservation.specialRequests && (
                      <div className="mb-6 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <MessageSquare className="w-8 h-8 rotate-12" />
                        </div>
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1 opacity-70 flex items-center gap-1.5">
                          <Info className="w-3 h-3" /> Special Request
                        </p>
                        <p className="text-sm text-blue-900 font-medium leading-relaxed italic line-clamp-2">&quot;{reservation.specialRequests}&quot;</p>
                      </div>
                    )}

                    <div className="mt-auto space-y-3">
                      <button
                        onClick={() => handleConfirm(reservation.id)}
                        disabled={processingId === reservation.id}
                        className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                      >
                        {processingId === reservation.id ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>Confirm Booking <ChevronRight className="w-5 h-5" strokeWidth={3} /></>
                        )}
                      </button>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setAssignTableId('');
                          }}
                          className="h-12 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-[0.98]"
                        >
                          <Armchair className="w-4 h-4" /> Pick Table
                        </button>
                        <button
                          onClick={() => handleReject(reservation.id)}
                          className="h-12 bg-white border border-gray-200 text-rose-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-50 transition-all active:scale-[0.98]"
                        >
                          <X className="w-4 h-4" /> Decline
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setViewReservation(reservation)}
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-bottom-4 transition-all bg-gray-900 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5 z-10"
                    >
                      View Full File <ArrowRight className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Confirmed Section */}
        {confirmedReservations.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Confirmed Bookings</h2>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase border border-emerald-100">
                  {confirmedReservations.length} total
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {confirmedReservations.map((reservation) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={reservation.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all p-5 flex flex-col group relative"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-black text-gray-900 truncate">
                          {reservation.guestName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tight">Confirmed</span>
                          {reservation.tableId && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tight">
                              Table {tables.find(t => t.id === reservation.tableId)?.tableNumber || 'Assigned'}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setViewReservation(reservation)}
                        className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-50 flex items-center justify-center rounded-xl text-gray-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{formatTime(reservation.reservationTime)}</p>
                          <p className="text-[10px] font-bold text-gray-400">Today</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-50 flex items-center justify-center rounded-xl text-gray-400">
                          <Users className="w-4 h-4" strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{reservation.numberOfGuests} People</p>
                          <p className="text-[10px] font-bold text-gray-400">Regular Seating</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleStatusChange(reservation.id, 'completed')}
                        className="h-10 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all"
                      >
                        Arrived
                      </button>
                      <button
                        onClick={() => setViewReservation(reservation)}
                        className="h-10 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all"
                      >
                        Details
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>


      {/* Past Reservations - Compact List */}
      {pastReservations.length > 0 && (
        <div className="space-y-6 mt-12">
          <div className="flex items-center gap-3 px-1">
            <div className="w-2 h-6 bg-gray-300 rounded-full" />
            <h2 className="text-xl font-black text-gray-900 tracking-tight">History</h2>
          </div>
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {pastReservations.slice(0, 8).map((reservation) => (
              <div key={reservation.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-white transition-colors border border-transparent group-hover:border-gray-100">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{reservation.guestName}</p>
                    <p className="text-xs font-medium text-gray-400 flex items-center gap-2">
                      {formatDateTime(reservation.reservationTime)} • {reservation.numberOfGuests} guests
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current opacity-60 ${reservation.status === 'completed' ? 'text-emerald-600' : 'text-rose-500'
                    }`}>
                    {reservation.status}
                  </span>
                  <button
                    onClick={() => setViewReservation(reservation)}
                    className="p-2 text-gray-300 hover:text-gray-900"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State - High End */}
      {filteredReservations.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 px-6 bg-white rounded-[48px] border border-dashed border-gray-200 mt-8"
        >
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative">
            <Calendar className="w-10 h-10 text-gray-200" />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
              <X className="w-4 h-4 text-gray-300" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">No {filter !== 'all' ? filter : ''} bookings</h3>
          <p className="text-gray-400 font-medium mt-1 max-w-[280px] text-center">
            {filter === 'all'
              ? "We&apos;ll notify you here as soon as a customer makes a reservation."
              : `You don&apos;t have any ${filter} reservations at this time.`}
          </p>
        </motion.div>
      )}

      {/* Assign Table Modal - Swiggy Modern */}
      <AnimatePresence>
        {selectedReservation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReservation(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 flex items-center justify-center rounded-2xl text-blue-600">
                      <Armchair className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 tracking-tight">Assign Table</h2>
                      <p className="text-sm font-bold text-gray-400">{selectedReservation.guestName}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedReservation(null)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Guests</p>
                      <p className="text-lg font-black text-gray-900">{selectedReservation.numberOfGuests} People</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Time</p>
                      <p className="text-lg font-black text-gray-900">{formatTime(selectedReservation.reservationTime)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Available Tables</label>
                    <select
                      value={assignTableId}
                      onChange={(e) => setAssignTableId(e.target.value)}
                      className="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-900 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select a table...</option>
                      {availableTables.map(table => (
                        <option key={table.id} value={table.id}>
                          Table {table.tableNumber} (Capacity: {table.capacity})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pb-4">
                  <button
                    onClick={handleAssignTable}
                    disabled={!assignTableId || processingId === selectedReservation.id}
                    className="h-16 bg-blue-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processingId === selectedReservation.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Assign & Confirm <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedReservation(null)}
                    className="h-12 text-gray-400 font-bold hover:text-gray-900 transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Details Modal - Premium File Style */}
      <AnimatePresence>
        {viewReservation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewReservation(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-[24px] flex items-center justify-center text-gray-900 font-black text-2xl border border-gray-100">
                      {viewReservation.guestName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 tracking-tight">{viewReservation.guestName}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-current ${viewReservation.status === 'confirmed' ? 'text-emerald-600' : 'text-orange-500'
                          }`}>
                          {viewReservation.status}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs font-bold text-gray-400">ID: {viewReservation.id.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setViewReservation(null)} className="p-3 hover:bg-gray-50 rounded-full transition-colors border border-gray-100">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Contact Details</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-xl text-gray-400"><Phone className="w-4 h-4" /></div>
                          <p className="text-sm font-bold text-gray-900">{viewReservation.guestPhone || 'No phone provided'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-xl text-gray-400"><Mail className="w-4 h-4" /></div>
                          <p className="text-sm font-bold text-gray-900 truncate max-w-[180px]">{viewReservation.guestEmail || 'No email provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Booking Stats</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-xl text-gray-400"><Users className="w-4 h-4" /></div>
                          <p className="text-sm font-bold text-gray-900">{viewReservation.numberOfGuests} Guests</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 flex items-center justify-center rounded-xl text-gray-400"><Clock className="w-4 h-4" /></div>
                          <p className="text-sm font-bold text-gray-900">{formatDateTime(viewReservation.reservationTime)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {viewReservation.specialRequests && (
                  <div className="mb-10 bg-gray-50 p-6 rounded-[32px] border border-gray-100 italic text-gray-600 text-sm leading-relaxed">
                    <div className="flex items-center gap-2 mb-2 not-italic">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Special Requests</span>
                    </div>
                    &quot;{viewReservation.specialRequests}&quot;
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  {viewReservation.status === 'pending' && (
                    <button
                      onClick={() => {
                        handleConfirm(viewReservation.id);
                        setViewReservation(null);
                      }}
                      className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                    >
                      Confirm Booking
                    </button>
                  )}

                  {(!viewReservation.tableId || viewReservation.status === 'pending') && (
                    <button
                      onClick={() => {
                        setViewReservation(null);
                        setSelectedReservation(viewReservation);
                      }}
                      className="flex-1 h-14 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-gray-500/20 hover:bg-black transition-all active:scale-[0.98]"
                    >
                      Assign Table
                    </button>
                  )}

                  <div className="flex flex-1 gap-3">
                    <select
                      value={viewReservation.status}
                      onChange={(e) => {
                        handleStatusChange(viewReservation.id, e.target.value);
                        setViewReservation(null);
                      }}
                      className="flex-1 h-14 px-4 bg-white border border-gray-200 rounded-2xl font-bold text-sm outline-none transition-all"
                    >
                      <option value="pending">⏳ Pending</option>
                      <option value="confirmed">✅ Confirmed</option>
                      <option value="completed">🎉 Completed</option>
                      <option value="rejected">❌ Rejected</option>
                      <option value="cancelled">🚫 Cancelled</option>
                    </select>

                    <button
                      onClick={() => setViewReservation(null)}
                      className="h-14 px-6 bg-gray-50 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Reservation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowCreateModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-[40px] shadow-2xl border border-gray-100 scrollbar-hide"
            >
              <div className="sticky top-0 bg-white/90 backdrop-blur-lg z-10 p-8 pb-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">Manual Booking</h2>
                  <p className="text-sm font-bold text-gray-400 mt-1">Create a new walk-in or phone reservation</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="p-3 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateReservation} className="p-8 pt-6 space-y-8">
                {/* Customer Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" /> Customer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formData.guestName}
                        onChange={e => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
                        placeholder="John Doe"
                        className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-400 placeholder:font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone Number <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        required
                        value={formData.guestPhone}
                        onChange={e => setFormData(prev => ({ ...prev, guestPhone: e.target.value }))}
                        placeholder="+1 (555) 000-0000"
                        className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-400 placeholder:font-medium"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        required
                        value={formData.guestEmail}
                        onChange={e => setFormData(prev => ({ ...prev, guestEmail: e.target.value }))}
                        placeholder="john@example.com"
                        className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-400 placeholder:font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-100" />

                {/* Reservation Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" /> Booking Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Number of Guests <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        required
                        value={formData.numberOfGuests}
                        onChange={e => setFormData(prev => ({ ...prev, numberOfGuests: parseInt(e.target.value) || 1 }))}
                        className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Occasion Type <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={formData.occasion}
                        onChange={e => setFormData(prev => ({ ...prev, occasion: e.target.value }))}
                        className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Select Occasion</option>
                        <option value="Birthday">Birthday</option>
                        <option value="Anniversary">Anniversary</option>
                        <option value="Marriage">Marriage</option>
                        <option value="Business Meeting">Business Meeting</option>
                        <option value="Other">Other / General</option>
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Reservation Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.reservationDate}
                        onChange={e => setFormData(prev => ({ ...prev, reservationDate: e.target.value }))}
                        className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Start Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        required
                        value={formData.reservationStartTime}
                        onChange={e => setFormData(prev => ({ ...prev, reservationStartTime: e.target.value }))}
                        className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">End Time <span className="text-red-500">*</span></label>
                      <input
                        type="time"
                        required
                        value={formData.reservationEndTime}
                        onChange={e => setFormData(prev => ({ ...prev, reservationEndTime: e.target.value }))}
                        className="w-full h-14 px-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-blue-500 focus:bg-white outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-100" />

                {/* Optional Requirements */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" /> Special Requests <span className="text-gray-400 font-bold text-xs normal-case tracking-normal ml-2">(Optional)</span>
                  </h3>
                  <textarea
                    value={formData.specialRequests}
                    onChange={e => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                    placeholder="E.g., Window seating preferred, allergies, decorations required..."
                    rows={3}
                    className="w-full p-5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:border-purple-500 focus:bg-white outline-none transition-all placeholder:text-gray-400 placeholder:font-medium resize-none"
                  />
                </div>

                <div className="sticky bottom-0 bg-white pt-4 pb-2 mt-8 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmitting}
                    className="flex-1 h-14 bg-gray-50 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] h-14 bg-[#D32F2F] text-white rounded-2xl font-black text-sm shadow-xl shadow-red-500/20 hover:bg-[#B71C1C] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Save Reservation'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
}

function SkeletonLoader() {
  return (
    <div className="min-h-screen space-y-8 flex flex-col p-6 animate-pulse">
      <div className="flex justify-between items-end mb-8">
        <div className="space-y-4 w-1/3">
          <div className="h-6 w-32 bg-gray-200 rounded-full" />
          <div className="h-12 w-full bg-gray-200 rounded-2xl" />
        </div>
        <div className="h-12 w-48 bg-gray-200 rounded-2xl" />
      </div>
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-[32px]" />)}
      </div>
      <div className="space-y-4">
        <div className="h-40 bg-gray-50 rounded-[32px]" />
        <div className="h-40 bg-gray-50 rounded-[32px]" />
      </div>
    </div>
  )
}
