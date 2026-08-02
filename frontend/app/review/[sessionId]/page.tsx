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
          className="focus:outline-none transition-transform hover:scale-110 active:scale-95 duration-100 p-1"
        >
          <Star
            className={`w-10 h-10 transition-colors ${
              filled ? 'fill-[#d5b263] text-[#d5b263]' : 'text-zinc-650'
            }`}
          />
        </button>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050506] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#d5b263]" />
          <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading review page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050506] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-full w-fit mx-auto mb-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Error</h1>
          <p className="text-zinc-400 text-sm font-medium mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#d5b263] hover:bg-[#c4a152] text-black font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-md shadow-[#d5b263]/10"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-screen bg-[#050506] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-full w-fit mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Review Already Submitted</h1>
          <p className="text-zinc-400 text-sm font-medium mb-6">
            Thank you! You've already submitted a review for this dining session.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-[#d5b263] hover:bg-[#c4a152] text-black font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all shadow-md shadow-[#d5b263]/10"
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
      <div className="min-h-screen bg-[#050506] flex items-center justify-center px-4">
        <div className="text-center max-w-md w-full mx-auto px-6 py-8 bg-[#0c0c0e]/85 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-full w-fit mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Thank You!</h1>
          <p className="text-zinc-450 mb-6 text-xs font-semibold">
            Your review has been submitted successfully. We appreciate your feedback!
          </p>

          {showGooglePrompt && (
            <div className="mb-6 p-5 bg-[#d5b263]/5 border border-[#d5b263]/20 rounded-2xl text-left space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#d5b263] text-[#d5b263]" />
                  ))}
                </div>
                <span className="text-[10px] font-black text-[#d5b263] uppercase tracking-wider">High Rating!</span>
              </div>
              <h2 className="text-sm font-black text-white">Support us on Google!</h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                Since you had a great experience, could you take 30 seconds to share your review on Google? It helps our restaurant grow!
              </p>
              <a
                href={sessionData.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 bg-[#d5b263] hover:bg-[#c4a152] text-black font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                <Star className="w-4 h-4 fill-black text-black" />
                Write a Google Review
              </a>
            </div>
          )}

          <button
            onClick={() => router.push('/')}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-black text-xs uppercase tracking-wider py-3.5 rounded-xl hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050506] text-white py-12 bg-hexagons relative">
      <div className="max-w-xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white uppercase tracking-wider mb-2">Rate Your Experience</h1>
          <p className="text-zinc-450 text-sm font-semibold">
            Help us improve by sharing your feedback about your recent visit
          </p>
        </div>

        {/* Session Info */}
        {sessionData && (
          <div className="bg-[#0c0c0e]/85 backdrop-blur-xl rounded-3xl border border-white/5 p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-3">
              {sessionData.restaurantName}
            </h2>
            <div className="text-xs text-zinc-400 space-y-1.5 font-medium">
              <p><span className="text-zinc-600 font-bold uppercase tracking-wider mr-1">Table:</span> {sessionData.tableNumber}</p>
              <p><span className="text-zinc-600 font-bold uppercase tracking-wider mr-1">Date:</span> {new Date(sessionData.createdAt).toLocaleDateString()}</p>
              <p><span className="text-zinc-600 font-bold uppercase tracking-wider mr-1">Time:</span> {new Date(sessionData.createdAt).toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {/* Review Form */}
        <div className="bg-[#0c0c0e]/85 backdrop-blur-xl rounded-3xl border border-white/5 p-6">
          {/* Rating */}
          <div className="mb-6">
            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 text-center">
              How would you rate your overall experience?
            </label>
            <div className="flex justify-center space-x-2">
              {renderStars()}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm font-black text-[#d5b263] uppercase tracking-wider mt-3">
                {rating === 1 && "Poor 😞"}
                {rating === 2 && "Fair 😐"}
                {rating === 3 && "Good 🙂"}
                {rating === 4 && "Very Good 😃"}
                {rating === 5 && "Excellent 😍"}
              </p>
            )}
          </div>

          {/* Review Text */}
          <div className="mb-6">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
              Share your thoughts (optional)
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell us about your experience, what you liked, or how we can improve..."
              className="w-full px-4 py-3 bg-black/40 border border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#d5b263]/40 focus:border-[#d5b263]/40 text-white placeholder-zinc-550 resize-none text-sm font-medium leading-relaxed"
              rows={4}
              maxLength={500}
            />
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-wide mt-1.5 text-right">
              {reviewText.length}/500 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs text-red-400 font-bold">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmitReview}
            disabled={submitting || rating === 0}
            className="w-full bg-[#d5b263] text-black py-4 px-4 rounded-xl hover:bg-[#c4a152] disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 disabled:cursor-not-allowed border border-transparent transition-all font-black text-xs uppercase tracking-wider shadow-lg shadow-[#d5b263]/5 active:scale-[0.98]"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Review...
              </div>
            ) : (
              "Submit Review"
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-[10px] font-black text-zinc-650 uppercase tracking-widest">
          <p>Powered by MyQuro</p>
        </div>
      </div>
      <style jsx>{`
        .bg-hexagons {
          background-color: #050506;
          background-image: url('/hexagons.png');
          background-repeat: no-repeat;
          background-position: top center;
          background-size: 1400px auto;
        }
      `}</style>
    </div>
  );
}