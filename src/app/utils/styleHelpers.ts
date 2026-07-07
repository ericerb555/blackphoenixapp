/**
 * Style Helper Functions
 * 
 * Shared utilities for consistent styling across the app
 */

export const COLOR_MAP: { [key: string]: string } = {
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

/**
 * Get RGB color value for glow effects
 */
export function getColorGlow(color: string): string {
  // Extract base color from Tailwind class like "text-purple-400"
  const match = color.match(/(?:text|bg|border)-(\w+)-\d+/);
  const colorName = match ? match[1] : color;
  return COLOR_MAP[colorName] || COLOR_MAP.orange;
}

/**
 * Apply glow effect to an element
 */
export function applyGlowEffect(
  element: HTMLElement,
  color: string,
  intensity: 'low' | 'medium' | 'high' = 'medium'
) {
  const rgbColor = getColorGlow(color);
  const intensityMap = {
    low: { inner: 0.2, outer: 0.1 },
    medium: { inner: 0.4, outer: 0.2 },
    high: { inner: 0.6, outer: 0.3 }
  };
  const { inner, outer } = intensityMap[intensity];
  element.style.boxShadow = `0 0 30px rgba(${rgbColor}, ${inner}), 0 0 60px rgba(${rgbColor}, ${outer})`;
}

/**
 * Remove glow effect from an element
 */
export function removeGlowEffect(element: HTMLElement) {
  element.style.boxShadow = 'none';
}

/**
 * Get status colors for badges and indicators
 */
export function getStatusColor(status: 'active' | 'inactive' | 'pending' | 'success' | 'error' | 'warning' | 'info') {
  const statusMap = {
    active: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    inactive: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    success: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    warning: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    info: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' }
  };
  return statusMap[status];
}

/**
 * Standard page header with gradient icon
 */
export function getPageHeaderConfig(title: string, description: string, icon: any, iconGradient: { from: string; to: string }) {
  return {
    title,
    description,
    icon,
    iconGradient
  };
}

/**
 * Standard stat card configuration
 */
export interface StatCardConfig {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  borderColor: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
}
