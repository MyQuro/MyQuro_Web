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
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-450 border-rose-500/20';
      case 'rejected': return 'bg-rose-500/10 text-rose-450 border-rose-500/20';
      case 'completed': return 'bg-zinc-900 text-zinc-400 border border-zinc-800';
      default: return 'bg-zinc-900 text-zinc-400 border border-zinc-800';
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
      <div className="min-h-screen flex items-center justify-center bg-[#050506]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#d5b263] animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050506] text-white">
      {/* Header */}
      <header className="bg-[#0c0c0e]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">My Reservations</h1>
          <p className="text-zinc-400 text-sm font-medium">View and manage your table reservations</p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-colors ${
              filter === 'upcoming' 
                ? 'bg-[#d5b263] text-black shadow-md shadow-[#d5b263]/10' 
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-colors ${
              filter === 'past' 
                ? 'bg-[#d5b263] text-black shadow-md shadow-[#d5b263]/10' 
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            Past
          </button>
        </div>

        {/* Reservations List */}
        {filteredReservations.length === 0 ? (
          <div className="bg-[#0c0c0e]/80 backdrop-blur-xl rounded-3xl border border-white/5 p-12 text-center">
            <UtensilsCrossed className="w-16 h-16 text-zinc-650 mx-auto mb-4" />
            <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide">
              No {filter} Reservations
            </h3>
            <p className="text-zinc-400 text-sm font-medium mb-6">
              {filter === 'upcoming' 
                ? 'Book a table at your favorite restaurant' 
                : 'Your past reservations will appear here'}
            </p>
            {filter === 'upcoming' && (
              <Link
                href="/explore"
                className="inline-block bg-[#d5b263] hover:bg-[#c4a152] text-black font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-md shadow-[#d5b263]/10 active:scale-95"
              >
                Browse Restaurants
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReservations.map((reservation) => (
              <div key={reservation.id} className="bg-[#0c0c0e]/80 backdrop-blur-xl rounded-3xl border border-white/5 overflow-hidden hover:border-[#d5b263]/25 hover:shadow-2xl transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link 
                        href={`/restro/${reservation.restaurantId}`}
                        className="text-xl font-bold text-white hover:text-[#d5b263] transition-colors"
                      >
                        {reservation.restaurantName}
                      </Link>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor(reservation.status)}`}>
                        {reservation.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-3 text-zinc-400 font-medium">
                      <Calendar className="w-5 h-5 text-[#d5b263]" />
                      <span>{formatDateTime(reservation.reservationTime)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 font-medium">
                      <Users className="w-5 h-5 text-[#d5b263]" />
                      <span>{reservation.numberOfGuests} {reservation.numberOfGuests === 1 ? 'Guest' : 'Guests'}</span>
                    </div>
                  </div>

                  {reservation.specialRequests && (
                    <div className="p-3 bg-[#050506]/65 border border-white/5 rounded-xl mb-4">
                      <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                        <span className="font-bold text-zinc-500 uppercase tracking-wide mr-1">Special Requests:</span> {reservation.specialRequests}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                    <div className="flex gap-3 pt-4 border-t border-white/5">
                      <Link
                        href={`/restro/${reservation.restaurantId}/menu`}
                        className="flex-1 text-center bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white text-zinc-300 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all"
                      >
                        View Menu
                      </Link>
                      <button
                        onClick={() => handleCancelReservation(reservation.id, reservation.restaurantId)}
                        className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-colors active:scale-95"
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
