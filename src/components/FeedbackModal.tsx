import React, { useState } from 'react';
import { X, Star, MessageSquare } from 'lucide-react';
import { api } from '../services/api';

interface FeedbackModalProps {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  eventId,
  eventTitle,
  onClose,
  onSuccess
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please write a brief feedback comment.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.submitFeedback(eventId, rating, comment);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Rate Event Experience</h3>
              <p className="text-xs text-slate-500 truncate max-w-[260px]">{eventTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Star Selector */}
          <div className="text-center space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              How would you rate this event?
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 text-amber-400 hover:scale-125 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating ?? rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-amber-600">
              {rating === 5 && 'Outstanding & Exceptional'}
              {rating === 4 && 'Very Good'}
              {rating === 3 && 'Average'}
              {rating === 2 && 'Needs Improvement'}
              {rating === 1 && 'Disappointing'}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Your Review / Feedback
            </label>
            <textarea
              rows={4}
              required
              placeholder="What did you like most? How was the speaker quality, organization, and accessibility?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
