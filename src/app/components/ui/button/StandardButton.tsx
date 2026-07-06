/**
 * Standard Button Component
 * 
 * This is the standardized button design used across the application.
 * Based on the CRM Management specialized CRM button style.
 * 
 * Features:
 * - Gradient backgrounds with hover effects
 * - Border animations
 * - Shadow effects
 * - Scale on hover
 * - Active/selected state
 * - Icon support
 * - Multiple color schemes
 * 
 * Usage:
 * ```tsx
 * <StandardButton 
 *   onClick={() => console.log('clicked')}
 *   color="blue"
 *   icon={<Building2 className="w-5 h-5" />}
 *   label="My Button"
 *   description="Button description"
 *   active={false}
 * />
 * ```
 */

import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface StandardButtonProps {
  onClick?: () => void;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal' | 'pink' | 'yellow';
  icon?: ReactNode;
  label: string;
  description?: string;
  active?: boolean;
  badge?: string;
  showChevron?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function StandardButton({
  onClick,
  color = 'blue',
  icon,
  label,
  description,
  active = false,
  badge,
  showChevron = true,
  disabled = false,
  className = '',
  size = 'md',
  fullWidth = true,
  type = 'button'
}: StandardButtonProps) {
  
  // Color configurations
  const colorConfigs = {
    blue: {
      active: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white shadow-2xl shadow-blue-500/50 scale-105 border-2 border-blue-400/50',
      inactive: 'bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-gray-300 hover:from-blue-600/20 hover:to-cyan-600/20 hover:text-white border-2 border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-102',
      iconBg: active ? 'bg-white/20' : 'bg-blue-500/20'
    },
    purple: {
      active: 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 text-white shadow-2xl shadow-purple-500/50 scale-105 border-2 border-purple-400/50',
      inactive: 'bg-gradient-to-r from-purple-600/10 to-pink-600/10 text-gray-300 hover:from-purple-600/20 hover:to-pink-600/20 hover:text-white border-2 border-purple-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-102',
      iconBg: active ? 'bg-white/20' : 'bg-purple-500/20'
    },
    green: {
      active: 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white shadow-2xl shadow-green-500/50 scale-105 border-2 border-green-400/50',
      inactive: 'bg-gradient-to-r from-green-600/10 to-emerald-600/10 text-gray-300 hover:from-green-600/20 hover:to-emerald-600/20 hover:text-white border-2 border-green-500/30 hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/30 hover:scale-102',
      iconBg: active ? 'bg-white/20' : 'bg-green-500/20'
    },
    orange: {
      active: 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white shadow-2xl shadow-orange-500/50 scale-105 border-2 border-orange-400/50',
      inactive: 'bg-gradient-to-r from-orange-600/10 to-red-600/10 text-gray-300 hover:from-orange-600/20 hover:to-red-600/20 hover:text-white border-2 border-orange-500/30 hover:border-orange-400/50 hover:shadow-lg hover:shadow-orange-500/30 hover:scale-102',
      iconBg: active ? 'bg-white/20' : 'bg-orange-500/20'
    },
    red: {
      active: 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-white shadow-2xl shadow-red-500/50 scale-105 border-2 border-red-400/50',
      inactive: 'bg-gradient-to-r from-red-600/10 to-rose-600/10 text-gray-300 hover:from-red-600/20 hover:to-rose-600/20 hover:text-white border-2 border-red-500/30 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/30 hover:scale-102',
      iconBg: active ? 'bg-white/20' : 'bg-red-500/20'
    },
    teal: {
      active: 'bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-white shadow-2xl shadow-teal-500/50 scale-105 border-2 border-teal-400/50',
      inactive: 'bg-gradient-to-r from-teal-600/10 to-cyan-600/10 text-gray-300 hover:from-teal-600/20 hover:to-cyan-600/20 hover:text-white border-2 border-teal-500/30 hover:border-teal-400/50 hover:shadow-lg hover:shadow-teal-500/30 hover:scale-102',
      iconBg: active ? 'bg-white/20' : 'bg-teal-500/20'
    },
    pink: {
      active: 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white shadow-2xl shadow-pink-500/50 scale-105 border-2 border-pink-400/50',
      inactive: 'bg-gradient-to-r from-pink-600/10 to-rose-600/10 text-gray-300 hover:from-pink-600/20 hover:to-rose-600/20 hover:text-white border-2 border-pink-500/30 hover:border-pink-400/50 hover:shadow-lg hover:shadow-pink-500/30 hover:scale-102',
      iconBg: active ? 'bg-white/20' : 'bg-pink-500/20'
    },
    yellow: {
      active: 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-white shadow-2xl shadow-yellow-500/50 scale-105 border-2 border-yellow-400/50',
      inactive: 'bg-gradient-to-r from-yellow-600/10 to-amber-600/10 text-gray-300 hover:from-yellow-600/20 hover:to-amber-600/20 hover:text-white border-2 border-yellow-500/30 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-500/30 hover:scale-102',
      iconBg: active ? 'bg-white/20' : 'bg-yellow-500/20'
    }
  };

  // Size configurations
  const sizeConfigs = {
    sm: {
      button: 'px-3 py-2',
      icon: 'p-1.5',
      text: 'text-xs',
      description: 'text-[10px]'
    },
    md: {
      button: 'px-4 py-3',
      icon: 'p-2',
      text: 'text-sm',
      description: 'text-xs'
    },
    lg: {
      button: 'px-5 py-4',
      icon: 'p-2.5',
      text: 'text-base',
      description: 'text-sm'
    }
  };

  const colors = colorConfigs[color];
  const sizes = sizeConfigs[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${fullWidth ? 'w-full' : ''}
        flex items-center gap-3 
        ${sizes.button}
        rounded-xl 
        transition-all duration-300
        ${active ? colors.active : colors.inactive}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {icon && (
        <div className={`${sizes.icon} rounded-lg ${colors.iconBg}`}>
          {icon}
        </div>
      )}
      
      <div className="flex-1 text-left">
        <div className={`${sizes.text} font-bold flex items-center gap-2`}>
          {label}
          {active && <span className="text-xs">✨</span>}
          {badge && (
            <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-bold">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <div className={`${sizes.description} opacity-90`}>{description}</div>
        )}
      </div>
      
      {showChevron && (
        <ChevronRight className="w-5 h-5" />
      )}
    </button>
  );
}

/**
 * Compact Standard Button (no description, inline layout)
 * Perfect for action buttons like "Add", "Edit", "Delete"
 */
interface CompactStandardButtonProps {
  onClick?: () => void;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal' | 'pink' | 'yellow';
  icon?: ReactNode;
  label: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
}

export function CompactStandardButton({
  onClick,
  color = 'blue',
  icon,
  label,
  disabled = false,
  className = '',
  size = 'md',
  type = 'button'
}: CompactStandardButtonProps) {
  
  const colorConfigs = {
    blue: 'bg-gradient-to-r from-blue-600/10 to-cyan-600/10 text-gray-300 hover:from-blue-600/20 hover:to-cyan-600/20 hover:text-white border-2 border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-102',
    purple: 'bg-gradient-to-r from-purple-600/10 to-pink-600/10 text-gray-300 hover:from-purple-600/20 hover:to-pink-600/20 hover:text-white border-2 border-purple-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-102',
    green: 'bg-gradient-to-r from-green-600/10 to-emerald-600/10 text-gray-300 hover:from-green-600/20 hover:to-emerald-600/20 hover:text-white border-2 border-green-500/30 hover:border-green-400/50 hover:shadow-lg hover:shadow-green-500/30 hover:scale-102',
    orange: 'bg-gradient-to-r from-orange-600/10 to-red-600/10 text-gray-300 hover:from-orange-600/20 hover:to-red-600/20 hover:text-white border-2 border-orange-500/30 hover:border-orange-400/50 hover:shadow-lg hover:shadow-orange-500/30 hover:scale-102',
    red: 'bg-gradient-to-r from-red-600/10 to-rose-600/10 text-gray-300 hover:from-red-600/20 hover:to-rose-600/20 hover:text-white border-2 border-red-500/30 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/30 hover:scale-102',
    teal: 'bg-gradient-to-r from-teal-600/10 to-cyan-600/10 text-gray-300 hover:from-teal-600/20 hover:to-cyan-600/20 hover:text-white border-2 border-teal-500/30 hover:border-teal-400/50 hover:shadow-lg hover:shadow-teal-500/30 hover:scale-102',
    pink: 'bg-gradient-to-r from-pink-600/10 to-rose-600/10 text-gray-300 hover:from-pink-600/20 hover:to-rose-600/20 hover:text-white border-2 border-pink-500/30 hover:border-pink-400/50 hover:shadow-lg hover:shadow-pink-500/30 hover:scale-102',
    yellow: 'bg-gradient-to-r from-yellow-600/10 to-amber-600/10 text-gray-300 hover:from-yellow-600/20 hover:to-amber-600/20 hover:text-white border-2 border-yellow-500/30 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-500/30 hover:scale-102'
  };

  const sizeConfigs = {
    sm: 'px-2 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2
        ${sizeConfigs[size]}
        rounded-xl
        font-bold
        transition-all duration-300
        ${colorConfigs[color]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
