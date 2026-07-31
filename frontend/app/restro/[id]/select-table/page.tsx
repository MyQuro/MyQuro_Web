"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Users, MapPin, CheckCircle } from 'lucide-react';

interface Table {
  tableId: string;
  tableNumber: string;
  capacity: number;
  status: string;
  location: string | null;
}

export default function TableSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurantId');
  
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!restaurantId) {
      setError('Restaurant ID is required');
      setLoading(false);
      return;
    }

    fetchAvailableTables();
  }, [restaurantId]);

  const fetchAvailableTables = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      const response = await fetch(`${BACKEND_URL}/api/sessions/available-tables/${restaurantId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available tables');
      }

      const data = await response.json();
      console.log('Available tables:', data);

      if (data.success) {
        setTables(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch tables');
      }
    } catch (error: any) {
      console.error('Error fetching tables:', error);
      setError(error.message || 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTable = async (tableId: string) => {
    setCreating(true);
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      
      // Create session for selected table
      const response = await fetch(`${BACKEND_URL}/api/sessions/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tableId,
          restaurantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      console.log('Session created:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to create session');
      }

      const { sessionId } = data;
      const selectedTableData = tables.find(t => t.tableId === tableId);

      // Store session info
      localStorage.setItem('activeSession', JSON.stringify({
        sessionId,
        restaurantId,
        tableId,
        tableNumber: selectedTableData?.tableNumber,
        timestamp: new Date().toISOString()
      }));

      // Redirect to menu
      router.push(`/restro/${restaurantId}/menu?session=${sessionId}`);
    } catch (error: any) {
      console.error('Error creating session:', error);
      alert(error.message || 'Failed to select table');
      setCreating(false);
    }
  };

  const handleWithoutTable = async () => {
    setCreating(true);
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.myquro.com';
      
      // Create session without table (takeaway/delivery)
      const response = await fetch(`${BACKEND_URL}/api/sessions/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          restaurantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      console.log('Session created:', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to create session');
      }

      const { sessionId } = data;

      // Store session info
      localStorage.setItem('activeSession', JSON.stringify({
        sessionId,
        restaurantId,
        tableId: null,
        tableNumber: null,
        timestamp: new Date().toISOString()
      }));

      // Redirect to menu
      router.push(`/restro/${restaurantId}/menu?session=${sessionId}`);
    } catch (error: any) {
      console.error('Error creating session:', error);
      alert(error.message || 'Failed to create order session');
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading available tables...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/explore')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Select a Table</h1>
          <p className="text-gray-600">Choose an available table to start your dining experience</p>
        </div>

        {tables.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tables Available</h3>
            <p className="text-gray-600 mb-6">All tables are currently occupied. Please try again later.</p>
            <button
              onClick={handleWithoutTable}
              disabled={creating}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Creating Order...
                </>
              ) : (
                'Order for Takeaway'
              )}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {tables.map((table) => (
                <button
                  key={table.tableId}
                  onClick={() => handleSelectTable(table.tableId)}
                  disabled={creating}
                  className={`bg-white rounded-xl shadow-md p-6 text-left transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedTable === table.tableId ? 'ring-2 ring-red-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold text-lg">{table.tableNumber}</span>
                    </div>
                    {table.status === 'available' && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Available
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Table {table.tableNumber}</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="text-sm">Capacity: {table.capacity} guests</span>
                    </div>
                    
                    {table.location && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="text-sm">{table.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {creating && selectedTable === table.tableId && (
                    <div className="mt-4 flex items-center text-red-600">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm">Creating session...</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <p className="text-gray-600 mb-4">Don't need a table?</p>
              <button
                onClick={handleWithoutTable}
                disabled={creating}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Creating Order...
                  </>
                ) : (
                  'Order for Takeaway / Delivery'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
