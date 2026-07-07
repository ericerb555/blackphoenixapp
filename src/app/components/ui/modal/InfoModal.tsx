/**
 * Info Modal Component
 * 
 * A simple modal for displaying information with:
 * - Title and content
 * - Optional icon
 * - Single action button
 */

import { Info } from 'lucide-react';
import { Modal } from './Modal';
import { ModalHeader } from './ModalHeader';
import { ModalBody } from './ModalBody';
import { ModalFooter } from './ModalFooter';
import { LucideIcon } from 'lucide-react';

export interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  buttonText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function InfoModal({
  isOpen,
  onClose,
  title,
  children,
  icon = Info,
  buttonText = 'Got it',
  size = 'md'
}: InfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size={size}>
      <ModalHeader title={title} icon={icon} />
      <ModalBody>
        {children}
      </ModalBody>
      <ModalFooter
        onConfirm={onClose}
        confirmText={buttonText}
      />
    </Modal>
  );
}
