/**
 * DangerButton Component
 * 
 * Destructive action button with red theme
 * Used for delete, remove, reject, and other destructive operations
 * 
 * @example
 * <DangerButton onClick={handleDelete} loading={deleting}>
 *   Delete Item
 * </DangerButton>
 * 
 * @example
 * <DangerButton icon={<Trash />} iconPosition="left" size="sm">
 *   Remove
 * </DangerButton>
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface DangerButtonProps {
  /** Button content */
  children: React.ReactNode;
  
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Loading state - shows spinner and disables button */
  loading?: boolean;
  
  /** Button size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  /** Optional icon (Lucide React icon) */
  icon?: React.ReactNode;
  
  /** Icon position */
  iconPosition?: 'left' | 'right';
  
  /** Full width button */
  fullWidth?: boolean;
  
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  
  /** Additional CSS classes */
  className?: string;
  
  /** Form ID for submit buttons */
  form?: string;
}

/**
 * Get size-specific classes
 */
const getSizeClasses = (size: DangerButtonProps['size']): string => {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-sm rounded-lg';
    case 'md':
      return 'px-4 py-2 text-sm rounded-lg';
    case 'lg':
      return 'px-6 py-3 text-base rounded-xl';
    case 'xl':
      return 'px-8 py-4 text-lg rounded-xl';
    default:
      return 'px-4 py-2 text-sm rounded-lg';
  }
};

/**
 * Get icon size classes
 */
const getIconSize = (size: DangerButtonProps['size']): string => {
  switch (size) {
    case 'sm':
      return 'w-3 h-3';
    case 'md':
      return 'w-4 h-4';
    case 'lg':
      return 'w-5 h-5';
    case 'xl':
      return 'w-6 h-6';
    default:
      return 'w-4 h-4';
  }
};

export const DangerButton: React.FC<DangerButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  type = 'button',
  className = '',
  form,
}) => {
  const isDisabled = disabled || loading;

  const baseClasses = 'bg-red-600 hover:bg-red-700 text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm';
  const sizeClasses = getSizeClasses(size);
  const widthClasses = fullWidth ? 'w-full' : '';
  const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const iconSizeClasses = getIconSize(size);

  const renderIcon = () => {
    if (loading) {
      return <Loader2 className={`${iconSizeClasses} animate-spin`} />;
    }
    if (icon) {
      // Check if icon is a React component (function/class) or element
      if (typeof icon === 'function') {
        const IconComponent = icon as React.ComponentType<any>;
        return <IconComponent className={iconSizeClasses} />;
      }
      // If it's already a React element, clone it with size classes
      if (React.isValidElement(icon)) {
        return React.cloneElement(icon as React.ReactElement<any>, {
          className: `${iconSizeClasses} ${(icon as any).props?.className || ''}`
        });
      }
      // Fallback: wrap in span
      return <span className={iconSizeClasses}>{icon}</span>;
    }
    return null;
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      form={form}
      className={`${baseClasses} ${sizeClasses} ${widthClasses} ${disabledClasses} ${className}`}
    >
      {iconPosition === 'left' && renderIcon()}
      <span>{children}</span>
      {iconPosition === 'right' && !loading && renderIcon()}
    </button>
  );
};

export default DangerButton;