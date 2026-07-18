/**
 * Confirmation Modal Component
 * 
 * A pre-built modal for confirmation dialogs with:
 * - Title and message
 * - Confirm and cancel buttons
 * - Optional danger variant for destructive actions
 * - Icon support
 */

import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { ModalHeader } from './ModalHeader';
import { ModalBody } from './ModalBody';
import { ModalFooter } from './ModalFooter';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'success';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false
}: ConfirmModalProps) {
  const icons = {
    default: AlertCircle,
    danger: AlertTriangle,
    success: CheckCircle
  };

  const Icon = icons[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={title} icon={Icon} />
      <ModalBody>
        <p className="text-gray-300 leading-relaxed">
          {message}
        </p>
      </ModalBody>
      <ModalFooter
        onCancel={onClose}
        onConfirm={onConfirm}
        cancelText={cancelText}
        confirmText={confirmText}
        variant={variant === 'danger' ? 'danger' : 'default'}
        isLoading={isLoading}
      />
    </Modal>
  );
}
