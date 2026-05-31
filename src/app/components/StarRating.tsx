/**
 * StarRating Component
 * 
 * Reusable star rating display and input component
 */

import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  readonly = false,
  onChange,
  showValue = false,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (value: number) => {
    if (!readonly && onChange) {
      onChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;
        const isHalf = !isFilled && starValue - 0.5 <= rating;

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(starValue)}
            disabled={readonly}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                isFilled
                  ? 'fill-[#ea580c] text-[#ea580c]'
                  : isHalf
                  ? 'fill-[#ea580c]/50 text-[#ea580c]'
                  : 'fill-none text-gray-600'
              }`}
            />
          </button>
        );
      })}
      {showValue && (
        <span className="ml-2 text-sm text-gray-400">
          {rating.toFixed(1)} / {maxRating}
        </span>
      )}
    </div>
  );
}

export default StarRating;
