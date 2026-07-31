"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import {
  AlertTriangle, RefreshCw, CheckCircle2, XCircle,
  Table as TableIcon, Search, X, History, Clock
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface Table {
  id: string;
  tableNumber: number;
  liveStatus: 'available' | 'occupied' | 'reserved';
  capacity: number;
  isActive: boolean;
}

export default function ResetTablesPage() {
  const { restaurant, isLoading: dashboardLoading } = useDashboard();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'reserved'>('all');
  const [resetHistory, setResetHistory] = useState<Array<{
    tableNumber: number;
    timestamp: Date;
    status: 'success' | 'failed';
  }>>([]);

  useEffect(() => {
    if (restaurant) {
      loadTables();
    }
  }, [restaurant]);

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  const loadTables = async () => {
    if (!restaurant) return;
    try {
      setLoading(true);
      const tablesData: any = await apiClient.getTables(restaurant.id);
      setTables(tablesData.tables || []);
    } catch (error) {
      console.error('Error loading tables:', error);
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleResetTable = async (table: Table) => {
    const confirmMessage = `⚠️ RESET TABLE ${table.tableNumber}\n\nThis will:\n• Close all active sessions\n• Unlock table and QR\n• Clear occupied status\n\nContinue?`;

    if (!confirm(confirmMessage)) return;

    setResetting(table.id);
    try {
      await apiClient.resetTable(table.id);

      // Add to history
      setResetHistory(prev => [{
        tableNumber: table.tableNumber,
        timestamp: new Date(),
        status: 'success' as const
      }, ...prev].slice(0, 10));

      toast.success(`Table ${table.tableNumber} reset successfully!`, {
        icon: '✅',
        duration: 3000
      });

      // Reload tables
      await loadTables();
    } catch (error: any) {
      setResetHistory(prev => [{
        tableNumber: table.tableNumber,
        timestamp: new Date(),
        status: 'failed' as const
      }, ...prev].slice(0, 10));

      toast.error(error.message || `Failed to reset Table ${table.tableNumber}`);
    } finally {
      setResetting(null);
    }
  };

  const handleResetAll = async () => {
    const problematicTables = tables.filter(t =>
      t.liveStatus === 'occupied' || t.liveStatus === 'reserved'
    );

    if (problematicTables.length === 0) {
      toast.error('No tables need resetting');
      return;
    }

    const confirmMessage = `🚨 EMERGENCY RESET ALL\n\nThis will reset ${problematicTables.length} tables:\n${problematicTables.map(t => `• Table ${t.tableNumber}`).join('\n')}\n\nThis action cannot be undone!\n\nContinue?`;

    if (!confirm(confirmMessage)) return;

    let successCount = 0;
    let failCount = 0;

    const resetPromises = problematicTables.map(async (table) => {
      try {
        await apiClient.resetTable(table.id);

        setResetHistory(prev => [{
          tableNumber: table.tableNumber,
          timestamp: new Date(),
          status: 'success' as const
        }, ...prev]);
        return { success: true };
      } catch (error) {
        setResetHistory(prev => [{
          tableNumber: table.tableNumber,
          timestamp: new Date(),
          status: 'failed' as const
        }, ...prev]);
        return { success: false };
      }
    });

    const results = await Promise.all(resetPromises);
    successCount = results.filter(r => r.success).length;
    failCount = results.filter(r => !r.success).length;

    setResetHistory(prev => prev.slice(0, 20));

    if (successCount > 0) {
      toast.success(`Successfully reset ${successCount} tables!`, {
        icon: '✅',
        duration: 4000
      });
    }

    if (failCount > 0) {
      toast.error(`Failed to reset ${failCount} tables`, {
        duration: 4000
      });
    }

    await loadTables();
  };

  const filteredTables = tables.filter(table => {
    // Filter by status
    if (filterStatus !== 'all' && table.liveStatus !== filterStatus) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      return table.tableNumber.toString().includes(searchQuery);
    }

    return true;
  });

  const occupiedCount = tables.filter(t => t.liveStatus === 'occupied').length;
  const reservedCount = tables.filter(t => t.liveStatus === 'reserved').length;
  const availableCount = tables.filter(t => t.liveStatus === 'available').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d5b263] mx-auto mb-4"></div>
          <p className="text-zinc-500 font-medium">Loading tables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-6 md:px-8 pt-6 pb-6 mb-8 relative z-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-500" strokeWidth={2.5} />
              </div>
              Emergency Table Management
            </h1>
            <p className="text-sm font-bold text-zinc-500 mt-2">Force reset stuck or problematic tables to restore normal operations</p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-[#0c0c0e] border border-amber-500/20 rounded-3xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-500" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-white tracking-tight text-lg mb-1">CAUTION: Destructive Action</h3>
              <p className="text-zinc-400 text-sm font-medium mb-3">
                Resetting a table is an emergency action that will immediately:
              </p>
              <ul className="text-zinc-400 text-sm space-y-2">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Close all active customer sessions</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Unlock the table and attached QR codes</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Clear occupied and reserved statuses</li>
              </ul>
              <p className="text-amber-400 text-sm mt-4 font-bold bg-amber-500/10 inline-block px-3 py-1.5 rounded-xl border border-amber-500/20">
                Only use this when tables are stuck or sessions cannot be closed normally.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-[#0c0c0e] rounded-3xl border border-zinc-900/40 p-6 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-850">
                <TableIcon className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Tables</p>
            <p className="text-3xl font-black text-white tracking-tight">{tables.length}</p>
          </div>

          <div className="bg-[#0c0c0e] rounded-3xl border border-zinc-900/40 p-6 hover:-translate-y-1 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-[#d5b263]/10 rounded-2xl border border-[#d5b263]/20">
                <CheckCircle2 className="w-6 h-6 text-[#d5b263]" strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Available</p>
            <p className="text-3xl font-black text-[#d5b263] tracking-tight">{availableCount}</p>
          </div>

          <div className="bg-[#0c0c0e] rounded-3xl border border-zinc-900/40 p-6 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            {occupiedCount > 0 && <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500/60"></div>}
            <div className="flex items-center justify-between mb-2">
              <div className={`p-3 rounded-2xl border ${occupiedCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-900 border-zinc-850'}`}>
                <XCircle className={`w-6 h-6 ${occupiedCount > 0 ? 'text-red-400' : 'text-zinc-500'}`} strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Occupied</p>
            <p className={`text-3xl font-black tracking-tight ${occupiedCount > 0 ? 'text-red-400' : 'text-white'}`}>{occupiedCount}</p>
          </div>

          <div className="bg-[#0c0c0e] rounded-3xl border border-zinc-900/40 p-6 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            {reservedCount > 0 && <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500/60"></div>}
            <div className="flex items-center justify-between mb-2">
              <div className={`p-3 rounded-2xl border ${reservedCount > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-zinc-900 border-zinc-850'}`}>
                <AlertTriangle className={`w-6 h-6 ${reservedCount > 0 ? 'text-amber-400' : 'text-zinc-500'}`} strokeWidth={2.5} />
              </div>
            </div>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Reserved</p>
            <p className={`text-3xl font-black tracking-tight ${reservedCount > 0 ? 'text-amber-400' : 'text-white'}`}>{reservedCount}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#0c0c0e] rounded-3xl border border-zinc-900/40 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Search by table number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl focus:ring-2 focus:ring-[#d5b263]/20 focus:border-[#d5b263]/40 outline-none transition-all font-medium placeholder:text-zinc-600 text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white bg-zinc-800 p-1 rounded-full border border-zinc-700 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter */}
            <div className="flex gap-1.5 bg-[#050506] p-1.5 rounded-2xl border border-zinc-800/60">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
                  filterStatus === 'all'
                    ? 'bg-[#121215] text-white border border-zinc-800/80 shadow-sm'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                All Tables
              </button>
              <button
                onClick={() => setFilterStatus('occupied')}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${
                  filterStatus === 'occupied'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${filterStatus === 'occupied' ? 'bg-red-500' : 'bg-zinc-600'}`}></div>
                Occupied
              </button>
              <button
                onClick={() => setFilterStatus('reserved')}
                className={`px-5 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${
                  filterStatus === 'reserved'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${filterStatus === 'reserved' ? 'bg-amber-500' : 'bg-zinc-600'}`}></div>
                Reserved
              </button>
            </div>
          </div>

          {/* Reset All Button */}
          {(occupiedCount > 0 || reservedCount > 0) && (
            <button
              onClick={handleResetAll}
              disabled={resetting !== null}
              className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <AlertTriangle className="w-5 h-5 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              WARNING: Reset All ({occupiedCount + reservedCount} Tables)
            </button>
          )}
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-5 mb-8">
          {filteredTables.map(table => (
            <button
              key={table.id}
              onClick={() => handleResetTable(table)}
              disabled={resetting === table.id || table.liveStatus === 'available'}
              className={`aspect-square rounded-3xl border flex flex-col items-center justify-center gap-3 p-4 transition-all duration-300 relative overflow-hidden group
                ${
                  table.liveStatus === 'available'
                    ? 'bg-zinc-900/30 border-zinc-900/40 opacity-50 cursor-not-allowed'
                    : table.liveStatus === 'occupied'
                      ? 'bg-[#0c0c0e] border-red-500/25 hover:border-red-500/50 hover:-translate-y-1'
                      : 'bg-[#0c0c0e] border-amber-500/25 hover:border-amber-500/50 hover:-translate-y-1'
                } ${resetting === table.id ? 'opacity-50 cursor-wait' : ''}`}
            >
              {resetting === table.id ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" strokeWidth={2.5} />
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Resetting</span>
                </div>
              ) : (
                <>
                  {/* Status Indicator */}
                  <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ring-4 ${
                    table.liveStatus === 'available'
                      ? 'bg-zinc-600 ring-zinc-900'
                      : table.liveStatus === 'occupied'
                        ? 'bg-red-500 ring-red-950'
                        : 'bg-amber-500 ring-amber-950'
                  }`} />

                  {/* Table Number */}
                  <div className="text-center">
                    <span className={`text-4xl font-black tracking-tight block leading-none mb-1
                         ${
                          table.liveStatus === 'available' ? 'text-zinc-600'
                          : table.liveStatus === 'occupied' ? 'text-red-400'
                          : 'text-amber-400'
                        }
                     `}>
                      {table.tableNumber}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md inline-block ${
                         table.liveStatus === 'available' ? 'bg-zinc-900/60 text-zinc-600'
                         : table.liveStatus === 'occupied' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                         : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {table.liveStatus}
                    </span>
                  </div>

                  {/* Reset Action Hint (Hover) */}
                  {(table.liveStatus === 'occupied' || table.liveStatus === 'reserved') && (
                    <div className="absolute inset-x-0 bottom-0 py-2 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-1">
                        Click to reset <RefreshCw className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </>
              )}
            </button>
          ))}
        </div>

        {filteredTables.length === 0 && (
          <div className="text-center py-16 bg-[#0c0c0e] rounded-3xl border border-zinc-900/40">
            <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-850">
              <TableIcon className="w-10 h-10 text-zinc-500" />
            </div>
            <p className="text-white font-black tracking-tight text-xl mb-1">No tables found</p>
            <p className="text-zinc-500 text-sm">We couldn&apos;t find any tables matching your filters.</p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
                className="mt-6 px-6 py-2 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors border border-zinc-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Reset History */}
        {resetHistory.length > 0 && (
          <div className="bg-[#0c0c0e] rounded-3xl border border-zinc-900/40 p-6 lg:p-8 relative overflow-hidden mt-8">
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-3 bg-zinc-900 border border-zinc-850 rounded-2xl">
                <History className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Recent Reset History</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Log of emergency actions</p>
              </div>
            </div>
            <div className="space-y-3 relative z-10">
              {resetHistory.map((record, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:-translate-y-0.5 ${
                    record.status === 'success'
                      ? 'bg-[#d5b263]/5 border-[#d5b263]/15'
                      : 'bg-red-500/5 border-red-500/15'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl border ${
                      record.status === 'success'
                        ? 'bg-[#d5b263]/10 border-[#d5b263]/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}>
                      {record.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-[#d5b263]" strokeWidth={2.5} />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" strokeWidth={2.5} />
                      )}
                    </div>
                    <div>
                      <span className="font-black text-white block text-lg leading-none mb-1">
                        Table {record.tableNumber}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                        record.status === 'success'
                          ? 'bg-[#d5b263]/10 text-[#d5b263]'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-850">
                    <Clock className="w-4 h-4 text-zinc-600" />
                    {record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 rounded-2xl bg-zinc-900 animate-pulse"></div>
        <div className="absolute inset-0 border-[3px] border-[#d5b263]/20 rounded-2xl"></div>
        <div className="absolute inset-0 border-[3px] border-[#d5b263] border-t-transparent rounded-2xl animate-spin"></div>
      </div>
      <p className="text-sm font-black text-zinc-500 uppercase tracking-widest animate-pulse">Loading Tables</p>
    </div>
  )
}
