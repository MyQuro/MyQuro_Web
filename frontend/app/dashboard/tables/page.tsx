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
          <h1 className="text-2xl font-bold text-gray-900">Floor Plan</h1>
          <p className="text-sm text-gray-500 mt-1">Manage physical tables and visibility</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setRefreshing(true); loadTables(true); }}
            className={`p-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all ${refreshing ? 'animate-spin' : ''}`}
            aria-label="Refresh tables"
            title="Refresh tables"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => {
              setEditingTable(null);
              setForm({ tableNumber: (tables.length + 1).toString(), capacity: '4' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-transform active:scale-95"
          >
            <Plus size={20} />
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
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Armchair className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">No tables found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your filters or add a new table.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className={`
                group relative rounded-2xl p-5 border-2 transition-all duration-300 hover:shadow-lg hover:scale-105
                ${!table.isActive
                  ? 'bg-gray-100 border-gray-300 text-gray-500'
                  : table.liveStatus === 'available'
                    ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-200'
                    : table.liveStatus === 'occupied'
                      ? 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-200'
                      : 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-200'
                }
              `}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <span className={`text-xs font-bold uppercase tracking-wider ${!table.isActive ? 'text-gray-400' : 'text-white/80'
                    }`}>Table</span>
                  <span className={`text-3xl font-black ${!table.isActive ? 'text-gray-500' : 'text-white'
                    }`}>{table.tableNumber}</span>
                </div>

                {table.isActive ? (
                  <div className={`
                    w-3 h-3 rounded-full border border-white/50
                    ${table.liveStatus === 'occupied' ? 'bg-red-300 animate-pulse' :
                      table.liveStatus === 'reserved' ? 'bg-orange-300' : 'bg-green-300'}
                  `} title={table.liveStatus} />
                ) : (
                  <span className="text-[10px] font-black uppercase bg-gray-200 text-gray-500 px-2 py-1 rounded">Disabled</span>
                )}
              </div>

              {/* Details */}
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${!table.isActive
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-white/20 text-white border border-white/30'
                  }`}>
                  <Users size={12} />
                  <span>{table.capacity} Seats</span>
                </div>
                {table.isActive && (
                  <span className={`text-xs font-bold uppercase ${table.liveStatus === 'occupied' ? 'text-white' :
                    table.liveStatus === 'reserved' ? 'text-white' : 'text-white'
                    }`}>
                    {table.liveStatus}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/20">
                {/* QR Button */}
                <button
                  onClick={() => handleDownloadQR(table)}
                  disabled={!table.isActive}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors ${!table.isActive
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                    }`}
                  title="Download QR"
                >
                  <QrCode size={16} /> <span className="hidden sm:inline">QR</span>
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => { setEditingTable(table); setForm({ tableNumber: table.tableNumber.toString(), capacity: table.capacity.toString() }); setShowModal(true); }}
                  className={`p-2 rounded-lg transition-colors ${!table.isActive
                    ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                    : 'text-white hover:bg-white/20 border border-white/30'
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
                    ? 'text-white bg-white/20 hover:bg-white/30 border border-white/30'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                    }`}
                  title={table.isActive ? "Deactivate Table" : "Activate Table"}
                >
                  <Power size={16} />
                </button>

                {/* Delete Button (Hidden if Active to prevent accidents, or keep consistent) */}
                <button
                  onClick={() => handleDelete(table.id)}
                  className={`p-2 rounded-lg transition-colors ${!table.isActive
                    ? 'text-gray-300 hover:text-red-600 hover:bg-red-50'
                    : 'text-white/70 hover:text-white hover:bg-white/20 border border-white/30'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {editingTable ? 'Edit Table Details' : 'Add New Table'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="table-number" className="text-xs font-bold text-gray-500 uppercase">Table Number</label>
                <input
                  id="table-number"
                  type="number"
                  autoFocus
                  required
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none font-medium text-lg"
                  value={form.tableNumber}
                  onChange={e => setForm({ ...form, tableNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="table-capacity" className="text-xs font-bold text-gray-500 uppercase">Seating Capacity</label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, capacity: Math.max(1, parseInt(form.capacity || '2') - 1).toString() })}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <div className="w-20 h-12 bg-red-50 border-2 border-red-200 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold text-red-700">{form.capacity || '2'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, capacity: (parseInt(form.capacity || '2') + 1).toString() })}
                    className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xl flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-gray-700 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
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
    blue: active ? 'bg-blue-600 text-white shadow-blue-200' : 'hover:bg-blue-50 text-blue-600',
    green: active ? 'bg-green-600 text-white shadow-green-200' : 'hover:bg-green-50 text-green-600',
    red: active ? 'bg-red-600 text-white shadow-red-200' : 'hover:bg-red-50 text-red-600',
    orange: active ? 'bg-orange-500 text-white shadow-orange-200' : 'hover:bg-orange-50 text-orange-600',
    gray: active ? 'bg-gray-700 text-white shadow-gray-400' : 'hover:bg-gray-100 text-gray-500',
  };

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden group
        ${active ? 'border-transparent shadow-lg scale-[1.02]' : 'bg-white border-gray-100 hover:border-gray-200'}
        ${colors[color]}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-3xl font-black ${active ? 'text-white' : 'text-gray-900'}`}>
          {count}
        </span>
        <Icon size={20} className={`opacity-80 ${active ? 'text-white' : ''}`} />
      </div>
      <span className={`text-xs font-bold uppercase tracking-wider ${active ? 'text-white/90' : 'text-gray-500'}`}>
        {label}
      </span>
    </button>
  );
};

function TablesSkeleton() {
  return (
    <div className="space-y-8 p-4 animate-pulse">
      <div className="h-12 bg-gray-200 rounded-xl w-1/3"></div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
      </div>
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-40 bg-gray-200 rounded-2xl"></div>)}
      </div>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="bg-red-50 p-6 rounded-full mb-4"><Users className="w-10 h-10 text-red-500" /></div>
      <h2 className="text-xl font-bold text-gray-900">Tables Restricted</h2>
      <p className="text-gray-500 mt-2">Contact your manager to access floor plan settings.</p>
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
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Tables...</p>
    </div>
  )
}