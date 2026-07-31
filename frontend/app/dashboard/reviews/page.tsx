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
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200 p-6 col-span-1 md:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-sm font-medium text-gray-600 mb-1">Overall Rating</h2>
              <div className="flex items-baseline gap-2">
                <div className="flex items-center gap-2">
                  <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                  <span className="text-5xl font-black text-gray-900">{avgRating}</span>
                </div>
                <span className="text-gray-500 text-sm">/ 5.0</span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Based on <span className="font-bold text-gray-900">{totalReviews}</span> customer reviews
          </div>
        </div>

        {/* Total Reviews */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reviews</p>
              <p className="text-2xl font-bold text-gray-900">{totalReviews}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      {Object.keys(ratingCounts).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-gray-600" />
            Rating Distribution
          </h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = ratingCounts[rating] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium text-gray-700">{rating}</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews List Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Customer Feedback</h2>
        {totalPages > 1 && (
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reviews yet</p>
          <p className="text-sm text-gray-400 mt-1">Reviews will appear here once customers start rating their experience</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors">
              {/* Rating Stars */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= review.rating
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  review.rating >= 4 ? 'bg-green-100 text-green-700' :
                  review.rating === 3 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
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
                <p className="text-gray-700 leading-relaxed mb-4 bg-gray-50 rounded-lg p-4 border border-gray-100">
                  &ldquo;{review.reviewText}&rdquo;
                </p>
              )}

              {/* User & Date */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="font-medium text-gray-900">
                    {review.userName || review.userEmail?.split('@')[0] || 'Anonymous Customer'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="w-4 h-4" />
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
        <div className="flex justify-center items-center gap-3 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    w-10 h-10 rounded-lg text-sm font-medium transition-colors
                    ${page === pageNum 
                      ? 'bg-red-600 text-white' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
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
            className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
