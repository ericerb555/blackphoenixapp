import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'orange' | 'green' | 'blue' | 'amber' | 'red' | 'purple';
  loading?: boolean;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeLabel,
  icon, 
  trend,
  color = 'orange',
  loading = false,
  className = '' 
}: StatCardProps) {
  const colors = {
    orange: {
      bg: 'from-orange-600/20 to-orange-700/20',
      icon: 'text-orange-400',
      border: 'border-orange-500/20'
    },
    green: {
      bg: 'from-green-600/20 to-green-700/20',
      icon: 'text-green-400',
      border: 'border-green-500/20'
    },
    blue: {
      bg: 'from-blue-600/20 to-blue-700/20',
      icon: 'text-blue-400',
      border: 'border-blue-500/20'
    },
    amber: {
      bg: 'from-amber-600/20 to-amber-700/20',
      icon: 'text-amber-400',
      border: 'border-amber-500/20'
    },
    red: {
      bg: 'from-red-600/20 to-red-700/20',
      icon: 'text-red-400',
      border: 'border-red-500/20'
    },
    purple: {
      bg: 'from-purple-600/20 to-purple-700/20',
      icon: 'text-purple-400',
      border: 'border-purple-500/20'
    }
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (trend === 'down') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  };

  if (loading) {
    return (
      <div className={`bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A] ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-[#2A2A2A] rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-[#2A2A2A] rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-[#2A2A2A] rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]
      hover:border-orange-500/30 transition-all duration-200
      ${className}
    `}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
        </div>
        {icon && (
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color].bg} border ${colors[color].border}`}>
            <div className={colors[color].icon}>
              {icon}
            </div>
          </div>
        )}
      </div>
      
      {(change !== undefined || changeLabel) && (
        <div className="flex items-center gap-2">
          {change !== undefined && (
            <span className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border
              ${getTrendColor()}
            `}>
              {getTrendIcon()}
              {Math.abs(change)}%
            </span>
          )}
          {changeLabel && (
            <span className="text-xs text-gray-500">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
