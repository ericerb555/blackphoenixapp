/**
 * IconButton Component
 * 
 * Icon-only button for compact actions
 * Supports tooltips via title attribute
 * 
 * @example
 * <IconButton icon={<Edit />} onClick={handleEdit} tooltip="Edit" />
 * 
 * @example
 * <IconButton icon={<Trash />} onClick={handleDelete} variant="danger" size="sm" />
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps {
  /** Icon to display (Lucide React icon) */
  icon: React.ReactNode;
  
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Loading state */
  loading?: boolean;
  
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  
  /** Tooltip text (shows on hover) */
  tooltip?: string;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
}

const getSizeClasses = (size: IconButtonProps['size']): string => {
  switch (size) {
    case 'sm':
      return 'p-1.5 rounded-lg';
    case 'md':
      return 'p-2 rounded-lg';
    case 'lg':
      return 'p-3 rounded-xl';
    default:
      return 'p-2 rounded-lg';
  }
};

const getIconSize = (size: IconButtonProps['size']): string => {
  switch (size) {
    case 'sm':
      return 'w-3 h-3';
    case 'md':
      return 'w-4 h-4';
    case 'lg':
      return 'w-5 h-5';
    default:
      return 'w-4 h-4';
  }
};

const getVariantClasses = (variant: IconButtonProps['variant']): string => {
  switch (variant) {
    case 'primary':
      return 'bg-orange-600 hover:bg-orange-700 text-white';
    case 'secondary':
      return 'bg-zinc-800 hover:bg-zinc-700 text-white';
    case 'ghost':
      return 'bg-transparent hover:bg-zinc-800 text-white';
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 text-white';
    default:
      return 'bg-zinc-800 hover:bg-zinc-700 text-white';
  }
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  disabled = false,
  loading = false,
  size = 'md',
  variant = 'secondary',
  tooltip,
  className = '',
  type = 'button',
}) => {
  const isDisabled = disabled || loading;

  const baseClasses = 'transition-all duration-200 flex items-center justify-center';
  const sizeClasses = getSizeClasses(size);
  const variantClasses = getVariantClasses(variant);
  const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const iconSizeClasses = getIconSize(size);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      title={tooltip}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
    >
      {loading ? (
        <Loader2 className={`${iconSizeClasses} animate-spin`} />
      ) : (
        <span className={iconSizeClasses}>{icon}</span>
      )}
    </button>
  );
};

export default IconButton;
