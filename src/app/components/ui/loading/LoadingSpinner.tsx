/**
 * LoadingSpinner Component
 * 
 * A consistent loading spinner component with various sizes and styles.
 * Matches the deep orange dark theme.
 * 
 * @example
 * <LoadingSpinner size="lg" text="Loading data..." />
 * <LoadingSpinner size="sm" inline />
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  inline?: boolean;
  color?: 'primary' | 'white' | 'gray';
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  text,
  inline = false,
  color = 'primary',
  className = '',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    primary: 'text-[#ea580c]',
    white: 'text-white',
    gray: 'text-gray-400',
  };

  const spinner = (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`} />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          {text && <p className="text-gray-300 text-sm">{text}</p>}
        </div>
      </div>
    );
  }

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2">
        {spinner}
        {text && <span className="text-gray-300 text-sm">{text}</span>}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      {spinner}
      {text && <p className="text-gray-300 text-sm">{text}</p>}
    </div>
  );
}
