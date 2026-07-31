"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "../../../lib/api-client";

interface Props {
  params: { sessionId: string } | Promise<{ sessionId: string }>;
}

export default function ReviewPage({ params }: Props) {
  const [sessionId, setSessionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = (params && typeof (params as any).then === 'function') ? await (params as any) : params;
      setSessionId(resolvedParams?.sessionId || "");
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!sessionId) return;

    const checkReviewStatus = async () => {
      try {
        setLoading(true);

        // Check if session exists and get session data
        const sessionResponse = await apiClient.getSessionById(sessionId) as any;
        if (sessionResponse.success) {
          setSessionData(sessionResponse.session);
        } else {
          setError("Session not found");
          return;
        }

        // Check if user has already reviewed this session
        const reviewResponse = await apiClient.getSessionReviews(sessionId) as any;
        if (reviewResponse.success && reviewResponse.reviews && reviewResponse.reviews.length > 0) {
          setAlreadyReviewed(true);
        }
      } catch (err) {
        console.error("Error checking review status:", err);
        setError("Failed to load session information");
      } finally {
        setLoading(false);
      }
    };

    checkReviewStatus();
  }, [sessionId]);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await apiClient.submitSessionReview(sessionId, {
        rating,
        reviewText: reviewText.trim() || undefined
      }) as any;

      if (response.success) {
        setSubmitted(true);
      } else {
        setError(response.message || "Failed to submit review");
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      setError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }).map((_, i) => {
      const starValue = i + 1;
      const filled = starValue <= (hoverRating || rating);

      return (
        <button
          key={i}
          type="button"
          onClick={() => setRating(starValue)}
          onMouseEnter={() => setHoverRating(starValue)}
          onMouseLeave={() => setHoverRating(0)}
          className="focus:outline-none"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        </button>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Review Already Submitted</h1>
          <p className="text-gray-600 mb-6">
            Thank you! You've already submitted a review for this dining session.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const showGooglePrompt = (rating === 4 || rating === 5) && sessionData?.googleReviewUrl;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full mx-auto px-6 py-8 bg-white rounded-3xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6 text-sm">
            Your review has been submitted successfully. We appreciate your feedback!
          </p>

          {showGooglePrompt && (
            <div className="mb-6 p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-left space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">High Rating!</span>
              </div>
              <h2 className="text-sm font-extrabold text-gray-900">Support us on Google!</h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                Since you had a great experience, could you take 30 seconds to share your review on Google? It helps our restaurant grow!
              </p>
              <a
                href={sessionData.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-md transition-opacity"
              >
                <Star className="w-4 h-4 fill-white text-white" />
                Write a Google Review
              </a>
            </div>
          )}

          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-800 transition-colors font-bold text-sm shadow-sm"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Rate Your Experience</h1>
          <p className="text-gray-600">
            Help us improve by sharing your feedback about your recent visit
          </p>
        </div>

        {/* Session Info */}
        {sessionData && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {sessionData.restaurantName}
            </h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Table: {sessionData.tableNumber}</p>
              <p>Date: {new Date(sessionData.createdAt).toLocaleDateString()}</p>
              <p>Time: {new Date(sessionData.createdAt).toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {/* Review Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {/* Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How would you rate your overall experience?
            </label>
            <div className="flex justify-center space-x-1">
              {renderStars()}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-gray-600 mt-2">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Review Text */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Share your thoughts (optional)
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell us about your experience, what you liked, or how we can improve..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {reviewText.length}/500 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmitReview}
            disabled={submitting || rating === 0}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </div>
            ) : (
              "Submit Review"
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Powered by MyQuro</p>
        </div>
      </div>
    </div>
  );
}