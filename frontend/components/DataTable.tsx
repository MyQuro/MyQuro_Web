"use client";

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Search } from 'lucide-react';

interface Column<T> {
  key: string;
  title: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: keyof T;
  striped?: boolean;
  hoverable?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  exportFilename?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  rowKey = 'id' as keyof T,
  striped = true,
  hoverable = true,
  searchable = false,
  exportable = false,
  exportFilename = 'data-export',
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return sortedData;

    const query = searchQuery.toLowerCase();
    return sortedData.filter(row => {
      return Object.values(row).some(value => 
        String(value).toLowerCase().includes(query)
      );
    });
  }, [sortedData, searchQuery]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    // Convert data to CSV
    const headers = columns.map(col => col.title).join(',');
    const rows = filteredData.map(row => 
      columns.map(col => {
        const value = row[col.key];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFilename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-red-600" />
      : <ChevronDown className="w-4 h-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="h-12 bg-gray-100"></div>
          {/* Rows skeleton */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-t border-gray-200 bg-white"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Controls */}
      {(searchable || exportable) && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search in table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          )}
          {exportable && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={`px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                  } ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.title}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-medium">{emptyMessage}</p>
                    {searchQuery && (
                      <p className="text-sm">Try adjusting your search query</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr
                  key={String(row[rowKey]) || index}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    ${striped && index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    ${hoverable ? 'hover:bg-red-50 transition-colors' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-6 py-4 text-sm text-gray-900 ${
                        column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with row count */}
      {filteredData.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Showing {filteredData.length} {filteredData.length === 1 ? 'entry' : 'entries'}
          {searchQuery && ` (filtered from ${data.length} total)`}
        </div>
      )}
    </div>
  );
}
