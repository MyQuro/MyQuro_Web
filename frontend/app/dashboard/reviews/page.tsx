"use client";

import { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Calendar, TrendingUp, Award } from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-context';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  reviewText: string | null;
  createdAt: string;
  sessionId: string;
  userName: string | null;
  userEmail: string | null;
}

interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    pages: number;
    total: number;
  };
}

function SkeletonLoader() {
  return (
    <div className="space-y-6 pb-20 animate-pulse">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="h-16 bg-gray-100 rounded"></div>
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { restaurant, isLoading: dashboardLoading } = useDashboard();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (restaurant?.id) {
      fetchReviews();
    }
  }, [restaurant, page]);

  const fetchReviews = async () => {
    if (!restaurant?.id) return;
    try {
      setLoading(true);
      const result = await apiClient.getRestaurantReviews(restaurant.id, page, 20) as ReviewsResponse;
      setReviews(result.reviews);
      setTotalPages(result.pagination.pages);
      setTotalReviews(result.pagination.total);
    } catch (error) {
      toast.error('Failed to load reviews');
      console.error('Reviews fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (dashboardLoading) {
    return <SkeletonLoader />;
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500">Restaurant not found</p>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingCounts = reviews.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return (
    <div className="space-y-6 pb-20">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Rating */}
        <div className="bg-[#d5b263]/5 rounded-3xl border border-[#d5b263]/25 p-6 col-span-1 md:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xs font-black text-zinc-455 uppercase tracking-widest mb-2">Overall Rating</h2>
              <div className="flex items-baseline gap-2">
                <div className="flex items-center gap-2">
                  <Star className="w-8 h-8 text-[#d5b263] fill-[#d5b263]" />
                  <span className="text-5xl font-black text-white">{avgRating}</span>
                </div>
                <span className="text-zinc-500 text-sm font-semibold">/ 5.0</span>
              </div>
            </div>
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 shadow-sm">
              <TrendingUp className="w-6 h-6 text-emerald-450" />
            </div>
          </div>
          <div className="text-sm text-zinc-400 font-medium">
            Based on <span className="font-bold text-white">{totalReviews}</span> customer reviews
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-[#0c0c0e]/80 border border-white/5 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#d5b263]/10 rounded-2xl flex items-center justify-center border border-[#d5b263]/20">
              <MessageSquare className="w-5 h-5 text-[#d5b263]" />
            </div>
            <div>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Total Reviews</p>
              <p className="text-3xl font-black text-white mt-1">{totalReviews}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      {Object.keys(ratingCounts).length > 0 && (
        <div className="bg-[#0c0c0e]/80 border border-white/5 backdrop-blur-md rounded-3xl p-6">
          <h3 className="font-black text-white text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#d5b263]" />
            Rating Distribution
          </h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = ratingCounts[rating] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16 select-none">
                    <span className="text-sm font-bold text-zinc-300">{rating}</span>
                    <Star className="w-4 h-4 text-[#d5b263] fill-[#d5b263]" />
                  </div>
                  <div className="flex-1 h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-[#d5b263] rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-zinc-450 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews List Header */}
      <div className="flex items-center justify-between pt-4">
        <h2 className="text-lg font-black text-white uppercase tracking-wider">Customer Feedback</h2>
        {totalPages > 1 && (
          <span className="text-xs font-black text-zinc-450 uppercase tracking-wider">
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#0c0c0e]/80 border border-white/5 rounded-3xl p-6 animate-pulse">
              <div className="h-5 bg-zinc-900 rounded w-32 mb-3"></div>
              <div className="h-4 bg-zinc-900 rounded w-full mb-2"></div>
              <div className="h-4 bg-zinc-900 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-[#0c0c0e]/80 border border-white/5 rounded-3xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-zinc-650 mx-auto mb-3" />
          <p className="text-white font-black uppercase tracking-wider text-sm">No reviews yet</p>
          <p className="text-xs text-zinc-400 mt-1 font-medium">Reviews will appear here once customers start rating their experience</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-[#0c0c0e]/80 border border-white/5 rounded-3xl p-6 hover:border-[#d5b263]/25 hover:shadow-2xl transition-all duration-300">
              {/* Rating Stars */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= review.rating
                          ? 'text-[#d5b263] fill-[#d5b263]'
                          : 'text-zinc-650'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                  review.rating === 5 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  review.rating === 4 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  review.rating === 3 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-rose-500/10 text-rose-450 border-rose-500/20'
                }`}>
                  {review.rating === 5 ? 'Excellent' :
                   review.rating === 4 ? 'Good' :
                   review.rating === 3 ? 'Average' :
                   review.rating === 2 ? 'Below Average' :
                   'Poor'}
                </span>
              </div>

              {/* Review Text */}
              {review.reviewText && (
                <p className="text-sm font-medium text-zinc-200 leading-relaxed mb-4 bg-black/40 rounded-2xl p-4 border border-white/5">
                  &ldquo;{review.reviewText}&rdquo;
                </p>
              )}

              {/* User & Date */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-zinc-400">
                  <div className="w-8 h-8 bg-zinc-950 rounded-full flex items-center justify-center border border-white/5">
                    <User className="w-4 h-4 text-zinc-500" />
                  </div>
                  <span className="font-bold text-zinc-300">
                    {review.userName || review.userEmail?.split('@')[0] || 'Anonymous Customer'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                  <Calendar className="w-3.5 h-3.5 text-[#d5b263]" />
                  <span>{new Date(review.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex justify-center items-center gap-3 pt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`
                    w-10 h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                    ${page === pageNum 
                      ? 'bg-[#d5b263] text-black shadow-md shadow-[#d5b263]/10' 
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
