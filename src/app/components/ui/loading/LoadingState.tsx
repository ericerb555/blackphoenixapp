/**
 * LoadingState Component
 * 
 * A versatile loading state component with multiple variants:
 * - Spinner with text
 * - Skeleton loading
 * - Card skeleton
 * - Table skeleton
 * 
 * @example
 * <LoadingState variant="spinner" text="Loading users..." />
 * <LoadingState variant="skeleton" lines={5} />
 * <LoadingState variant="card-grid" count={6} />
 */

import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

export interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'card' | 'card-grid' | 'table';
  text?: string;
  lines?: number;
  count?: number;
  className?: string;
}

export function LoadingState({
  variant = 'spinner',
  text = 'Loading...',
  lines = 3,
  count = 3,
  className = '',
}: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="lg" text={text} />
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className="h-4 bg-[#2A2A2A] rounded animate-pulse"
            style={{ width: `${Math.random() * 30 + 70}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 ${className}`}>
        <div className="space-y-4">
          <div className="h-6 bg-[#2A2A2A] rounded animate-pulse w-1/3" />
          <div className="h-4 bg-[#2A2A2A] rounded animate-pulse w-full" />
          <div className="h-4 bg-[#2A2A2A] rounded animate-pulse w-5/6" />
          <div className="h-4 bg-[#2A2A2A] rounded animate-pulse w-4/6" />
        </div>
      </div>
    );
  }

  if (variant === 'card-grid') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="space-y-4">
              <div className="h-6 bg-[#2A2A2A] rounded animate-pulse w-2/3" />
              <div className="h-4 bg-[#2A2A2A] rounded animate-pulse w-full" />
              <div className="h-4 bg-[#2A2A2A] rounded animate-pulse w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden ${className}`}>
        <div className="bg-[#0A0A0A] border-b border-[#2A2A2A] p-4">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-4 bg-[#2A2A2A] rounded animate-pulse w-24" />
            ))}
          </div>
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="flex gap-4">
              {Array.from({ length: 4 }).map((_, cellIndex) => (
                <div key={cellIndex} className="h-4 bg-[#2A2A2A] rounded animate-pulse w-24" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
