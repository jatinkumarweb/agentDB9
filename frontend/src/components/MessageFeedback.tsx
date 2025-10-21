'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp, Minus } from 'lucide-react';

export type FeedbackType = 'negative' | 'neutral' | 'positive' | null;

interface MessageFeedbackProps {
  messageId: string;
  initialFeedback?: FeedbackType;
  onFeedbackChange: (messageId: string, feedback: FeedbackType) => Promise<void>;
  disabled?: boolean;
}

export default function MessageFeedback({
  messageId,
  initialFeedback = null,
  onFeedbackChange,
  disabled = false
}: MessageFeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackType>(initialFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (newFeedback: FeedbackType) => {
    if (isSubmitting || disabled) return;

    // Toggle off if clicking the same feedback
    const finalFeedback = feedback === newFeedback ? null : newFeedback;
    
    setIsSubmitting(true);
    try {
      await onFeedbackChange(messageId, finalFeedback);
      setFeedback(finalFeedback);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonBaseClass = "p-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const activeClass = "shadow-sm scale-110";

  return (
    <div className="flex items-center space-x-1 mt-2 pt-2 border-t border-white border-opacity-20">
      <span className="text-xs opacity-60 mr-1">Rate:</span>
      
      {/* Negative Feedback */}
      <button
        onClick={() => handleFeedback('negative')}
        disabled={isSubmitting || disabled}
        className={`${buttonBaseClass} ${
          feedback === 'negative'
            ? `bg-red-500 bg-opacity-20 text-red-600 ${activeClass}`
            : 'hover:bg-red-500 hover:bg-opacity-10 text-gray-600 hover:text-red-600'
        }`}
        title="Unacceptable - This response is incorrect or unhelpful"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>

      {/* Neutral Feedback */}
      <button
        onClick={() => handleFeedback('neutral')}
        disabled={isSubmitting || disabled}
        className={`${buttonBaseClass} ${
          feedback === 'neutral'
            ? `bg-yellow-500 bg-opacity-20 text-yellow-600 ${activeClass}`
            : 'hover:bg-yellow-500 hover:bg-opacity-10 text-gray-600 hover:text-yellow-600'
        }`}
        title="Okay - This response is acceptable but could be better"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {/* Positive Feedback */}
      <button
        onClick={() => handleFeedback('positive')}
        disabled={isSubmitting || disabled}
        className={`${buttonBaseClass} ${
          feedback === 'positive'
            ? `bg-green-500 bg-opacity-20 text-green-600 ${activeClass}`
            : 'hover:bg-green-500 hover:bg-opacity-10 text-gray-600 hover:text-green-600'
        }`}
        title="Expected - This response is exactly what I needed"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>

      {isSubmitting && (
        <div className="ml-2">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
        </div>
      )}
    </div>
  );
}
