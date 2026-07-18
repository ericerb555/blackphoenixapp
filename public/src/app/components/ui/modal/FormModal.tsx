/**
 * Form Modal Component
 * 
 * A pre-built modal for forms with:
 * - Form wrapper
 * - Submit and cancel handling
 * - Loading states
 * - Validation support
 */

import { FormEvent } from 'react';
import { Modal } from './Modal';
import { ModalHeader } from './ModalHeader';
import { ModalBody } from './ModalBody';
import { ModalFooter } from './ModalFooter';
import { LucideIcon } from 'lucide-react';

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  subtitle,
  icon,
  submitText = 'Save',
  cancelText = 'Cancel',
  isLoading = false,
  disabled = false,
  size = 'md',
  children
}: FormModalProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={size} closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <ModalHeader title={title} subtitle={subtitle} icon={icon} />
        <ModalBody>
          {children}
        </ModalBody>
        <ModalFooter
          onCancel={onClose}
          cancelText={cancelText}
          confirmText={submitText}
          isLoading={isLoading}
          disabled={disabled}
        />
      </form>
    </Modal>
  );
}
