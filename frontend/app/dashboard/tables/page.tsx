"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import {
  QrCode, Plus, Edit2, Trash2, Users,
  RefreshCw, Armchair,
  CheckCircle2, XCircle, Clock, Power
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getRestaurantPermissions } from '@/lib/permissions';
import toast from 'react-hot-toast';

// --- Types ---
interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  liveStatus: 'available' | 'occupied' | 'reserved';
  isActive: boolean;
  qrCode?: string;
}

type FilterStatus = 'all' | 'available' | 'occupied' | 'reserved' | 'inactive';

export default function TablesPage() {
  const { restaurant, restaurantRole, isLoading: dashboardLoading } = useDashboard();
  // const { isConnected } = useWebSocket(); // WebSocket disabled
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [form, setForm] = useState({ tableNumber: '', capacity: '' });

  // Permission check (after all hooks)
  const permissions = restaurantRole ? getRestaurantPermissions(restaurantRole) : null;

  // --- Data Loading Logic ---

  const loadTables = useCallback(async (isRefresh = false) => {
    if (!restaurant) return;
    try {
      if (!isRefresh) setLoading(true);
      const data = await apiClient.getTables(restaurant.id) as { tables: Table[] };
      const sorted = (data.tables || []).sort((a: Table, b: Table) => a.tableNumber - b.tableNumber);
      setTables(sorted);
    } catch {
      toast.error('Failed to sync tables');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurant]);

  useEffect(() => {
    if (restaurant) loadTables();
    const interval = setInterval(() => loadTables(true), 30000);
    return () => clearInterval(interval);
  }, [restaurant, loadTables]);

  // WebSocket event listeners for real-time updates - DISABLED
  // useEffect(() => {
  //   if (!socket || !restaurant) return;

  //   const handleOrderCreated = (data: any) => {
  //     console.log('🆕 ORDER CREATED (TABLES):', data);
  //     if (data.restaurantId === restaurant.id) {
  //       // Table status might change when orders are placed
  //       setTimeout(() => loadTables(true), 1000);
  //     }
  //   };

  //   const handlePaymentRecorded = (data: any) => {
  //     console.log('💰 PAYMENT RECORDED (TABLES):', data);
  //     if (data.restaurantId === restaurant.id) {
  //       // Table might become available after payment
  //       setTimeout(() => loadTables(true), 1000);
  //     }
  //   };

  //   // WebSocket disabled - event listeners removed
  //   // socket.on('order-created', handleOrderCreated);
  //   // socket.on('payment-recorded', handlePaymentRecorded);

  //   return () => {
  //     // WebSocket disabled - no cleanup needed
  //     // socket.off('order-created', handleOrderCreated);
  //     // socket.off('payment-recorded', handlePaymentRecorded);
  //   };
  // }, [restaurant, loadTables]);

  // Derived State
  const stats = useMemo(() => ({
    total: tables.length,
    available: tables.filter(t => t.isActive && t.liveStatus === 'available').length,
    occupied: tables.filter(t => t.isActive && t.liveStatus === 'occupied').length,
    reserved: tables.filter(t => t.isActive && t.liveStatus === 'reserved').length,
    inactive: tables.filter(t => !t.isActive).length,
  }), [tables]);

  const filteredTables = useMemo(() => {
    if (filter === 'all') return tables;
    if (filter === 'inactive') return tables.filter(t => !t.isActive);
    return tables.filter(t => t.isActive && t.liveStatus === filter);
  }, [tables, filter]);

  // Permission check - early return after all hooks
  if (!permissions?.canManageTables) {
    return <AccessDenied />;
  }

  // --- Handlers ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    const payload = {
      tableNumber: Number.parseInt(form.tableNumber, 10),
      capacity: Number.parseInt(form.capacity, 10),
      isActive: true // Default to active on create
    };

    // Reference to rollback state if API fails
    const previousTables = [...tables];

    if (editingTable) {
      // Optimistic update for edit
      setTables(prev =>
        prev.map(t =>
          t.id === editingTable.id
            ? { ...t, tableNumber: payload.tableNumber, capacity: payload.capacity }
            : t
        ).sort((a, b) => a.tableNumber - b.tableNumber)
      );
      toast.success(`Table ${payload.tableNumber} updated (saving...)`);
      setShowModal(false);

      try {
        await apiClient.updateTable(editingTable.id, payload);
      } catch (error) {
        setTables(previousTables); // rollback
        toast.error(error instanceof Error ? error.message : 'Operation failed');
      }
    } else {
      // Optimistic update for creation
      const tempId = `temp-${Date.now()}`;
      const newTable: Table = {
        id: tempId,
        tableNumber: payload.tableNumber,
        capacity: payload.capacity,
        liveStatus: 'available',
        isActive: true,
      };

      setTables(prev =>
        [...prev, newTable].sort((a, b) => a.tableNumber - b.tableNumber)
      );
      toast.success(`Table ${payload.tableNumber} created`);
      setShowModal(false);

      try {
        await apiClient.createTable(restaurant.id, payload);
      } catch (error) {
        setTables(previousTables); // rollback
        toast.error(error instanceof Error ? error.message : 'Operation failed');
      }
    }

    // Reset Form
    setEditingTable(null);
    setForm({ tableNumber: '', capacity: '' });

    // Background sync to ensure we get real DB IDs and accurate states
    loadTables(true);
  };

  // Toggle Activation Status
  const handleToggleActive = async (table: Table) => {
    const newState = !table.isActive;

    // Optimistic Update
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, isActive: newState } : t));

    try {
      await apiClient.updateTable(table.id, { isActive: newState });
      toast.success(`Table ${table.tableNumber} ${newState ? 'activated' : 'deactivated'}`);
    } catch {
      // Revert on fail
      setTables(prev => prev.map(t => t.id === table.id ? { ...t, isActive: !newState } : t));
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (tableId: string) => {
    if (!confirm('Permanently delete this table?')) return;

    // Optimistic Delete
    const previousTables = [...tables];
    setTables(prev => prev.filter(t => t.id !== tableId));
    toast.success('Table deleted');

    try {
      await apiClient.deleteTable(tableId);
      loadTables(true); // Background sync
    } catch {
      setTables(previousTables); // Rollback
      toast.error('Failed to delete');
    }
  };

  const handleDownloadQR = async (table: Table) => {
    if (!table.isActive) return toast.error("Enable table to generate QR");

    try {
      const data = await apiClient.generateQRCode(table.id) as { qrImageBase64: string };

      // Create canvas for composite image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 600;
      canvas.height = 800;

      // Load images with error handling
      const qrImage = new Image();
      const logoImage = new Image();

      qrImage.src = data.qrImageBase64;

      // Load logo with fallback
      const loadLogo = new Promise<void>((resolve) => {
        logoImage.onload = () => resolve();
        logoImage.onerror = () => resolve(); // Continue without logo
        logoImage.src = '/logo.png';
      });

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          qrImage.onload = () => resolve();
          qrImage.onerror = () => reject(new Error('Failed to load QR code'));
        }),
        loadLogo
      ]);

      // Modern gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.1, '#f8fafc');
      gradient.addColorStop(0.9, '#f1f5f9');
      gradient.addColorStop(1, '#ffffff');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Draw logo at top center (only if loaded) - USE NATURAL ASPECT RATIO
      let currentY = 60;
      if (logoImage.complete && logoImage.naturalWidth > 0) {
        // Calculate logo size maintaining aspect ratio, max width 200px
        const maxLogoWidth = 200;
        const aspectRatio = logoImage.naturalWidth / logoImage.naturalHeight;
        const logoWidth = Math.min(maxLogoWidth, logoImage.naturalWidth);
        const logoHeight = logoWidth / aspectRatio;

        const logoX = (canvas.width - logoWidth) / 2;
        ctx.drawImage(logoImage, logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 20;
      }

      // MYQURO text
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MYQURO', canvas.width / 2, currentY + 20);

      // Table number
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Table ${table.tableNumber}`, canvas.width / 2, currentY + 60);

      // QR Code (centered)
      const qrSize = 300;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = currentY + 100;
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // Add QR code border
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 10);

      // Instruction text at bottom
      ctx.fillStyle = '#64748b';
      ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Visit myquro.com and scan this QR code', canvas.width / 2, qrY + qrSize + 60);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '400 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('to start your dining experience', canvas.width / 2, qrY + qrSize + 85);

      // Add restaurant name at bottom
      ctx.fillStyle = '#1e293b';
      ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(restaurant?.restaurantName || '', canvas.width / 2, canvas.height - 40);

      // Download the composite image
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${restaurant?.restaurantName}-Table-${table.tableNumber}-QR.png`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(link.href);
          toast.success('Enhanced QR Code downloaded');
        }
      }, 'image/png');

    } catch (error) {
      console.error('QR generation error:', error);
      toast.error('Failed to generate QR');
    }
  };

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  if (loading) return <TablesSkeleton />;

  return (
    <div className="space-y-8 pb-20">

      {/* 1. Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider">Floor Plan</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage physical tables and visibility</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setRefreshing(true); loadTables(true); }}
            className="p-2.5 bg-[#0c0c0e]/80 border border-white/5 text-zinc-400 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
            aria-label="Refresh tables"
            title="Refresh tables"
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              setEditingTable(null);
              setForm({ tableNumber: (tables.length + 1).toString(), capacity: '4' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#d5b263] text-black rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#c4a152] transition-all active:scale-95 shadow-md shadow-[#d5b263]/10"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Table</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* 2. Status Filters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <FilterCard label="All Tables" count={stats.total} active={filter === 'all'} onClick={() => setFilter('all')} color="blue" icon={Armchair} />
        <FilterCard label="Available" count={stats.available} active={filter === 'available'} onClick={() => setFilter('available')} color="green" icon={CheckCircle2} />
        <FilterCard label="Occupied" count={stats.occupied} active={filter === 'occupied'} onClick={() => setFilter('occupied')} color="red" icon={XCircle} />
        <FilterCard label="Reserved" count={stats.reserved} active={filter === 'reserved'} onClick={() => setFilter('reserved')} color="orange" icon={Clock} />
        <FilterCard label="Inactive" count={stats.inactive} active={filter === 'inactive'} onClick={() => setFilter('inactive')} color="gray" icon={Power} />
      </div>

      {/* 3. Tables Grid */}
      {filteredTables.length === 0 ? (
        <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-3xl p-12 text-center">
          <Armchair className="w-16 h-16 text-zinc-650 mx-auto mb-4" />
          <h3 className="text-lg font-black text-white uppercase tracking-wider">No tables found</h3>
          <p className="text-zinc-400 mt-1 text-sm font-medium">Try adjusting your filters or add a new table.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className={`
                group relative rounded-[24px] p-5 border transition-all duration-300 hover:shadow-2xl hover:scale-[1.03]
                ${!table.isActive
                  ? 'bg-zinc-950/40 border-white/5 text-zinc-550'
                  : table.liveStatus === 'available'
                    ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400 hover:border-emerald-500/30'
                    : table.liveStatus === 'occupied'
                      ? 'bg-rose-950/20 border-rose-900/30 text-rose-450 hover:border-rose-500/30'
                      : 'bg-amber-950/20 border-amber-900/30 text-amber-400 hover:border-amber-500/30'
                }
              `}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${!table.isActive ? 'text-zinc-600' : 'text-zinc-400'}`}>Table</span>
                  <span className={`text-3xl font-black ${!table.isActive ? 'text-zinc-650' : 'text-white'}`}>{table.tableNumber}</span>
                </div>

                {table.isActive ? (
                  <div className={`
                    w-2.5 h-2.5 rounded-full border border-white/10
                    ${table.liveStatus === 'occupied' ? 'bg-rose-500 animate-pulse' :
                      table.liveStatus === 'reserved' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}
                  `} title={table.liveStatus} />
                ) : (
                  <span className="text-[9px] font-black uppercase bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-white/5">Disabled</span>
                )}
              </div>

              {/* Details */}
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${!table.isActive
                  ? 'bg-zinc-900/50 text-zinc-500 border border-white/5'
                  : 'bg-white/5 text-zinc-300 border border-white/5'
                  }`}>
                  <Users size={12} className="text-[#d5b263]" />
                  <span>{table.capacity} Seats</span>
                </div>
                {table.isActive && (
                  <span className={`text-[10px] font-black uppercase tracking-wider ${table.liveStatus === 'occupied' ? 'text-rose-450' :
                    table.liveStatus === 'reserved' ? 'text-amber-450' : 'text-emerald-450'
                    }`}>
                    {table.liveStatus}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                {/* QR Button */}
                <button
                  onClick={() => handleDownloadQR(table)}
                  disabled={!table.isActive}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors ${!table.isActive
                    ? 'bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/5'
                    }`}
                  title="Download QR"
                >
                  <QrCode size={16} /> <span className="hidden sm:inline">QR</span>
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => { setEditingTable(table); setForm({ tableNumber: table.tableNumber.toString(), capacity: table.capacity.toString() }); setShowModal(true); }}
                  className={`p-2 rounded-lg transition-colors ${!table.isActive
                    ? 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                    : 'text-zinc-300 hover:bg-white/5 border border-white/5'
                    }`}
                  aria-label={`Edit table ${table.tableNumber}`}
                  title={`Edit table ${table.tableNumber}`}
                >
                  <Edit2 size={16} />
                </button>

                {/* Activate/Deactivate Toggle */}
                <button
                  onClick={() => handleToggleActive(table)}
                  className={`p-2 rounded-lg transition-colors ${table.isActive
                    ? 'text-zinc-300 bg-white/5 hover:bg-white/10 border border-white/5'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-850'
                    }`}
                  title={table.isActive ? "Deactivate Table" : "Activate Table"}
                >
                  <Power size={16} />
                </button>

                {/* Delete Button (Hidden if Active to prevent accidents, or keep consistent) */}
                <button
                  onClick={() => handleDelete(table.id)}
                  className={`p-2 rounded-lg transition-colors ${!table.isActive
                    ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                    : 'text-zinc-400 hover:text-red-450 hover:bg-red-500/10 border border-white/5'
                    }`}
                  title="Delete Permanently"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">
              {editingTable ? 'Edit Table Details' : 'Add New Table'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="table-number" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Table Number</label>
                <input
                  id="table-number"
                  type="number"
                  autoFocus
                  required
                  min="1"
                  className="w-full px-4 py-3 rounded-xl bg-black/45 border border-zinc-800 focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 outline-none font-bold text-white text-lg"
                  value={form.tableNumber}
                  onChange={e => setForm({ ...form, tableNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="table-capacity" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Seating Capacity</label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, capacity: Math.max(1, parseInt(form.capacity || '2') - 1).toString() })}
                    className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xl flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <div className="w-20 h-12 bg-[#d5b263]/10 border border-[#d5b263]/25 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-black text-[#d5b263]">{form.capacity || '2'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, capacity: (parseInt(form.capacity || '2') + 1).toString() })}
                    className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xl flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-zinc-450 hover:text-white font-black uppercase tracking-wider text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#d5b263] text-black font-black uppercase tracking-wider text-xs rounded-xl hover:bg-[#c4a152] transition-colors shadow-lg shadow-[#d5b263]/10"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Sub-Components ---

interface FilterCardProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: 'blue' | 'green' | 'red' | 'orange' | 'gray';
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const FilterCard = ({ label, count, active, onClick, color, icon: Icon }: FilterCardProps) => {
  const colors: Record<string, string> = {
    blue: active ? 'bg-[#d5b263] text-black border-[#d5b263] shadow-lg shadow-[#d5b263]/10' : 'bg-[#0c0c0e]/80 border-white/5 hover:border-zinc-800 text-zinc-400',
    green: active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[#0c0c0e]/80 border-white/5 hover:border-zinc-800 text-zinc-400',
    red: active ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' : 'bg-[#0c0c0e]/80 border-white/5 hover:border-zinc-800 text-zinc-400',
    orange: active ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-[#0c0c0e]/80 border-white/5 hover:border-zinc-800 text-zinc-400',
    gray: active ? 'bg-zinc-900 text-zinc-400 border border-zinc-800' : 'bg-[#0c0c0e]/80 border-white/5 hover:border-zinc-800 text-zinc-400',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden group
        ${active ? 'border-transparent shadow-lg scale-[1.02]' : 'bg-[#0c0c0e]/80 border-white/5 hover:border-zinc-800'}
        ${colors[color]}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-3xl font-black ${active && color === 'blue' ? 'text-black' : 'text-white'}`}>
          {count}
        </span>
        <Icon size={20} className={`opacity-80 ${active && color === 'blue' ? 'text-black' : ''}`} />
      </div>
      <span className={`text-[10px] font-black uppercase tracking-wider ${active && color === 'blue' ? 'text-black/85' : 'text-zinc-500'}`}>
        {label}
      </span>
    </button>
  );
};

function TablesSkeleton() {
  return (
    <div className="space-y-8 p-4 animate-pulse">
      <div className="h-12 bg-zinc-900 rounded-xl w-1/3"></div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-zinc-900 rounded-xl"></div>)}
      </div>
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-40 bg-zinc-900 rounded-2xl"></div>)}
      </div>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-full mb-4"><Users className="w-10 h-10 text-red-450" /></div>
      <h2 className="text-xl font-black text-white uppercase tracking-wider">Tables Restricted</h2>
      <p className="text-zinc-400 text-sm font-medium mt-2">Contact your manager to access floor plan settings.</p>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-zinc-900 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#d5b263] border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-sm text-zinc-400 font-bold uppercase tracking-widest animate-pulse">Loading Tables...</p>
    </div>
  )
}