"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, Clock, Download, Filter, Search, Bell, Store, ChevronDown } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-context';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => Promise<void>;
  showFilters?: boolean;
  onFilterClick?: () => void;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  showExport?: boolean;
  onExport?: () => void;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  title,
  subtitle,
  onRefresh,
  showFilters,
  onFilterClick,
  showSearch,
  onSearch,
  showExport,
  onExport,
  actions,
}: DashboardHeaderProps) {
  const { allRestaurants, restaurant, switchRestaurant } = useDashboard();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-update last refresh time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="bg-[#0C0C0E]/90 backdrop-blur-md border-none sticky top-0 z-30 shadow-sm text-white">
      {/* Main Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                {title}
              </h1>

              {allRestaurants.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSwitcher(!showSwitcher)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#d5b263]/10 text-[#d5b263] rounded-xl hover:bg-[#d5b263]/25 transition-all font-bold text-xs border border-[#d5b263]/20"
                  >
                    <Store size={14} />
                    <span className="truncate max-w-[120px]">{restaurant?.restaurantName || 'Switch'}</span>
                    <ChevronDown size={14} className={`transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
                  </button>

                  {showSwitcher && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSwitcher(false)}
                      />
                      <div className="absolute top-full left-0 mt-2 w-64 bg-[#0c0c0e]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-900/40 z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-4 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-950/40 mb-1">
                          My Restaurants
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {allRestaurants.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => {
                                switchRestaurant(r.id);
                                setShowSwitcher(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900/60 transition-colors text-left ${r.id === restaurant?.id ? 'bg-[#d5b263]/10 border-r-4 border-[#d5b263]' : ''
                                }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.id === restaurant?.id ? 'bg-[#d5b263] text-black' : 'bg-zinc-900 text-zinc-400'
                                }`}>
                                <Store size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${r.id === restaurant?.id ? 'text-[#d5b263]' : 'text-zinc-350'}`}>
                                  {r.restaurantName}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{r.city}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {subtitle}
              </p>
            )}
          </div>

          {/* Controls Section */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Refresh Button */}
            {onRefresh && (
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}

            {/* Filter Button */}
            {showFilters && (
              <Button
                onClick={onFilterClick}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
            )}

            {/* Export Button */}
            {showExport && (
              <Button
                onClick={onExport}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}

            {/* Custom Actions */}
            {actions}
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar - Shows data freshness */}
      <div className="px-4 sm:px-6 lg:px-8 py-2 bg-transparent border-t border-zinc-950/20">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span>Last refreshed: {getRelativeTime(lastRefresh)}</span>
          </div>
          <div className="hidden sm:block text-zinc-550">
            {formatDateTime(new Date())}
          </div>
        </div>
      </div>
    </div>
  );
}
