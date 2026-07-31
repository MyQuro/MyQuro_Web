"use client";

import { useState, useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard-context';
import { apiClient } from '@/lib/api-client';
import { getRestaurantPermissions } from '@/lib/permissions';
import AccessDenied from '@/components/AccessDenied';
import { FileText, Download, Calendar, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  type: string;
  generatedAt: string;
  url: string; // Assuming backend returns a URL or we construct it
  status: 'pending' | 'completed' | 'failed';
  dateRange: {
    start: string;
    end: string;
  };
}

export default function ReportsPage() {
  const { restaurant, restaurantRole, isLoading: dashboardLoading } = useDashboard();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Permission check
  const permissions = restaurantRole ? getRestaurantPermissions(restaurantRole) : null;

  if (dashboardLoading || !restaurant) {
    return <SkeletonLoader />;
  }

  if (!permissions?.canViewReports) {
    return <AccessDenied requiredRole="Owner or Manager" message="You need owner or manager access to view reports" />;
  }

  // Generation form state
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (restaurant?.id) {
      fetchReports();
    }
  }, [restaurant?.id]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getReports(restaurant!.id);
      setReports(data as Report[]);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    try {
      setGenerating(true);
      await apiClient.generateReport(
        restaurant.id,
        reportType,
        new Date(dateRange.start).toISOString(),
        new Date(dateRange.end).toISOString()
      );
      toast.success('Report generation started');
      fetchReports(); // Refresh list
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId: string) => {
    try {
      await apiClient.downloadReport(reportId);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports Center</h1>
        <p className="text-gray-500">Generate and download detailed business reports</p>
      </div>

      {/* Generator Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Filter className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Generate New Report</h2>
        </div>

        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
            >
              <option value="sales">Sales Report</option>
              <option value="inventory">Inventory Report</option>
              <option value="staff">Staff Performance</option>
              <option value="reservations">Reservations Summary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              required
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              required
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </form>
      </div>

      {/* Recent Reports List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
          <button 
            onClick={fetchReports}
            className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No reports generated yet</h3>
            <p className="text-gray-500">Generate your first report using the form above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Report Type</th>
                  <th className="px-6 py-4">Date Range</th>
                  <th className="px-6 py-4">Generated On</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <FileText className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="font-medium text-gray-900 capitalize">{report.type} Report</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(report.dateRange.start).toLocaleDateString()} - {new Date(report.dateRange.end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(report.generatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${report.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          report.status === 'failed' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {report.status === 'completed' && (
                        <button
                          onClick={() => handleDownload(report.id)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="mt-3 text-sm text-gray-500 font-medium animate-pulse">Loading Reports...</p>
    </div>
  )
}
