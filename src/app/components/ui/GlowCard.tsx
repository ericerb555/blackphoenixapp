/**
 * GlowCard Component
 * 
 * Reusable card component with dynamic color glow effect on hover
 * Used throughout the app for consistent styling
 */

import { ReactNode, CSSProperties } from 'react';

interface GlowCardProps {
  children: ReactNode;
  glowColor?: string; // RGB string like "251, 146, 60" or color name
  className?: string;
  onClick?: () => void;
  borderColor?: string;
  hoverScale?: boolean;
}

const COLOR_MAP: { [key: string]: string } = {
  purple: '168, 85, 247',
  orange: '251, 146, 60',
  red: '248, 113, 113',
  fuchsia: '232, 121, 249',
  blue: '96, 165, 250',
  emerald: '52, 211, 153',
  cyan: '34, 211, 238',
  green: '74, 222, 128',
  amber: '251, 191, 36',
  yellow: '250, 204, 21',
  violet: '167, 139, 250',
  indigo: '129, 140, 248',
  teal: '45, 212, 191',
  rose: '251, 113, 133',
  lime: '163, 230, 53',
  pink: '244, 114, 182',
  slate: '148, 163, 184',
  gray: '156, 163, 175',
  zinc: '161, 161, 170',
};

export function GlowCard({
  children,
  glowColor = 'orange',
  className = '',
  onClick,
  borderColor = 'border-[#2A2A2A]',
  hoverScale = true
}: GlowCardProps) {
  // Convert color name to RGB if needed
  const rgbColor = COLOR_MAP[glowColor] || glowColor;

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = `0 0 30px rgba(${rgbColor}, 0.4), 0 0 60px rgba(${rgbColor}, 0.2)`;
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div
      className={`bg-[#0A0A0A] border ${borderColor} rounded-xl transition-all duration-300 group ${
        hoverScale ? 'hover:scale-[1.02]' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        boxShadow: 'none',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * GlowButton Component
 * 
 * Reusable button with glow effect matching the CRM Management style
 */

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  gradient?: {
    from: string;
    via: string;
    to: string;
  };
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function GlowButton({
  children,
  onClick,
  variant = 'primary',
  gradient,
  icon,
  active = false,
  disabled = false,
  fullWidth = false,
  className = ''
}: GlowButtonProps) {
  const gradients = {
    primary: { from: 'orange-500', via: 'red-500', to: 'orange-600', shadow: 'orange-500' },
    secondary: { from: 'blue-500', via: 'cyan-500', to: 'blue-600', shadow: 'blue-500' },
    success: { from: 'green-500', via: 'emerald-500', to: 'green-600', shadow: 'green-500' },
    danger: { from: 'red-500', via: 'pink-500', to: 'red-600', shadow: 'red-500' },
    warning: { from: 'yellow-500', via: 'amber-500', to: 'yellow-600', shadow: 'yellow-500' },
    info: { from: 'cyan-500', via: 'blue-500', to: 'cyan-600', shadow: 'cyan-500' }
  };

  const currentGradient = gradient || gradients[variant];
  const { from, via, to, shadow } = gradient 
    ? { ...gradient, shadow: gradient.from.split('-')[0] }
    : gradients[variant];

  if (active) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${fullWidth ? 'w-full' : ''} flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 bg-gradient-to-r from-${from} via-${via} to-${to} text-white shadow-2xl shadow-${shadow}/50 scale-105 border-2 border-${from.split('-')[0]}-400/50 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        {icon && <div className="p-2 rounded-lg bg-white/20">{icon}</div>}
        <div className="flex-1 text-left font-bold">{children}</div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? 'w-full' : ''} flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 bg-gradient-to-r from-${from}/10 to-${to}/10 text-gray-300 hover:from-${from}/20 hover:to-${to}/20 hover:text-white border-2 border-${from.split('-')[0]}-500/30 hover:border-${from.split('-')[0]}-400/50 hover:shadow-lg hover:shadow-${shadow}/30 hover:scale-102 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {icon && <div className={`p-2 rounded-lg bg-${from.split('-')[0]}-500/20`}>{icon}</div>}
      <div className="flex-1 text-left font-bold">{children}</div>
    </button>
  );
}
