/**
 * Modal Footer Component
 * 
 * Provides a consistent footer for modals with:
 * - Action buttons
 * - Optional cancel button
 * - Consistent spacing and layout
 */

import { PrimaryButton } from '../button/PrimaryButton';
import { SecondaryButton } from '../button/SecondaryButton';

export interface ModalFooterProps {
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'danger';
}

export function ModalFooter({
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  isLoading = false,
  disabled = false,
  children,
  className = '',
  variant = 'default'
}: ModalFooterProps) {
  if (children) {
    return (
      <div className={`flex items-center justify-end gap-3 p-6 border-t border-[#2A2A2A] bg-[#0F0F0F] ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-end gap-3 p-6 border-t border-[#2A2A2A] bg-[#0F0F0F] ${className}`}>
      {onCancel && (
        <SecondaryButton
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelText}
        </SecondaryButton>
      )}
      {onConfirm && (
        <PrimaryButton
          onClick={onConfirm}
          disabled={disabled}
          isLoading={isLoading}
          variant={variant === 'danger' ? 'danger' : 'primary'}
        >
          {confirmText}
        </PrimaryButton>
      )}
    </div>
  );
}
