"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';
import { Calendar, Clock, Users, MapPin, XCircle, Loader2, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';

interface Reservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  numberOfGuests: number;
  reservationTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected' | 'completed';
  specialRequests?: string;
  createdAt: string;
}

export default function MyReservationsPage() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.push('/signin?redirect=/reservation/my');
      return;
    }
    loadReservations();
  }, [session, isPending]);

  const loadReservations = async () => {
    try {
      const data: any = await apiClient.getMyReservations();
      setReservations(data.reservations || []);
    } catch (error) {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (reservationId: string, restaurantId: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      await apiClient.cancelReservation(reservationId, restaurantId);
      toast.success('Reservation cancelled');
      loadReservations();
    } catch (error) {
      toast.error('Failed to cancel reservation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReservations = reservations.filter(r => {
    const reservationDate = new Date(r.reservationTime);
    const now = new Date();
    
    if (filter === 'upcoming') {
      return reservationDate >= now && (r.status === 'pending' || r.status === 'confirmed');
    } else {
      return reservationDate < now || r.status === 'cancelled' || r.status === 'rejected' || r.status === 'completed';
    }
  });

  if (loading || isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reservations</h1>
          <p className="text-gray-500">View and manage your table reservations</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              filter === 'upcoming' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              filter === 'past' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            Past
          </button>
        </div>

        {/* Reservations List */}
        {filteredReservations.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No {filter} Reservations
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'upcoming' 
                ? 'Book a table at your favorite restaurant' 
                : 'Your past reservations will appear here'}
            </p>
            {filter === 'upcoming' && (
              <Link
                href="/explore"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                Browse Restaurants
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link 
                        href={`/restro/${reservation.restaurantId}`}
                        className="text-xl font-bold text-gray-900 hover:text-red-600 transition-colors"
                      >
                        {reservation.restaurantName}
                      </Link>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(reservation.status)}`}>
                        {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 text-gray-600">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span>{formatDateTime(reservation.reservationTime)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Users className="w-5 h-5 text-gray-400" />
                      <span>{reservation.numberOfGuests} {reservation.numberOfGuests === 1 ? 'Guest' : 'Guests'}</span>
                    </div>
                  </div>

                  {reservation.specialRequests && (
                    <div className="p-3 bg-gray-50 rounded-lg mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Special Requests:</span> {reservation.specialRequests}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                    <div className="flex gap-3 pt-4 border-t">
                      <Link
                        href={`/restro/${reservation.restaurantId}/menu`}
                        className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 px-4 rounded-xl transition-colors"
                      >
                        View Menu
                      </Link>
                      <button
                        onClick={() => handleCancelReservation(reservation.id, reservation.restaurantId)}
                        className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-xl transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
