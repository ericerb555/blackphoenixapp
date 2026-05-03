/**
 * SecondaryButton Component
 * 
 * Secondary action button with gray theme
 * Used for cancel, back, and other non-primary actions
 * 
 * @example
 * <SecondaryButton onClick={handleCancel}>
 *   Cancel
 * </SecondaryButton>
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

const getSizeClasses = (size: SecondaryButtonProps['size']): string => {
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

const getIconSize = (size: SecondaryButtonProps['size']): string => {
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

const getVariantClasses = (variant: SecondaryButtonProps['variant']): string => {
  switch (variant) {
    case 'outline':
      return 'bg-transparent border-2 border-zinc-700 text-white hover:bg-zinc-800';
    case 'ghost':
      return 'bg-transparent text-white hover:bg-zinc-800';
    case 'default':
    default:
      return 'bg-zinc-800 text-white hover:bg-zinc-700';
  }
};

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
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
  variant = 'default',
}) => {
  const isDisabled = disabled || loading;

  const baseClasses = 'font-medium transition-all duration-200 flex items-center justify-center gap-2';
  const sizeClasses = getSizeClasses(size);
  const variantClasses = getVariantClasses(variant);
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
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClasses} ${disabledClasses} ${className}`}
    >
      {iconPosition === 'left' && renderIcon()}
      <span>{children}</span>
      {iconPosition === 'right' && !loading && renderIcon()}
    </button>
  );
};

export default SecondaryButton;