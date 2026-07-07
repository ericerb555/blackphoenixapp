/**
 * Modal Component Library
 * 
 * A comprehensive set of modal components for the enterprise application.
 * All modals follow the deep orange dark theme (#ea580c) design system.
 * 
 * ## Components
 * 
 * ### Base Components
 * - `Modal` - Base modal with overlay, positioning, and close handling
 * - `ModalHeader` - Consistent header with title, subtitle, and optional icon
 * - `ModalBody` - Scrollable content area with proper padding
 * - `ModalFooter` - Action buttons footer
 * 
 * ### Pre-built Modals
 * - `ConfirmModal` - Confirmation dialogs (default, danger, success variants)
 * - `FormModal` - Form submission modals with validation support
 * - `InfoModal` - Simple information display modals
 * 
 * ## Usage Examples
 * 
 * ### Basic Modal
 * ```tsx
 * import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
 * 
 * <Modal isOpen={isOpen} onClose={onClose} size="md">
 *   <ModalHeader title="My Modal" subtitle="Optional subtitle" />
 *   <ModalBody>
 *     <p>Modal content here</p>
 *   </ModalBody>
 *   <ModalFooter onCancel={onClose} onConfirm={handleConfirm} />
 * </Modal>
 * ```
 * 
 * ### Confirmation Modal
 * ```tsx
 * import { ConfirmModal } from '@/components/ui/modal';
 * 
 * <ConfirmModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item? This action cannot be undone."
 *   variant="danger"
 *   confirmText="Delete"
 * />
 * ```
 * 
 * ### Form Modal
 * ```tsx
 * import { FormModal } from '@/components/ui/modal';
 * import { TextInput } from '@/components/ui/input';
 * 
 * <FormModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onSubmit={handleSubmit}
 *   title="Add User"
 *   icon={User}
 *   isLoading={isLoading}
 * >
 *   <TextInput
 *     label="Name"
 *     value={name}
 *     onChange={setName}
 *     required
 *   />
 *   <TextInput
 *     label="Email"
 *     type="email"
 *     value={email}
 *     onChange={setEmail}
 *     required
 *   />
 * </FormModal>
 * ```
 * 
 * ## Features
 * 
 * - ✅ ESC key to close
 * - ✅ Click outside to close (configurable)
 * - ✅ Body scroll lock when open
 * - ✅ Responsive sizing (sm, md, lg, xl, full)
 * - ✅ Loading states
 * - ✅ Consistent styling with design system
 * - ✅ TypeScript support
 * - ✅ Accessible (ARIA labels, focus management)
 * 
 * ## Design System
 * 
 * All modals use:
 * - Background: #1A1A1A
 * - Borders: #2A2A2A
 * - Overlay: black/80
 * - Primary color: #ea580c (deep orange)
 * - Text colors: white, gray-400, gray-300
 */

// Base components
export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { ModalHeader } from './ModalHeader';
export type { ModalHeaderProps } from './ModalHeader';

export { ModalBody } from './ModalBody';
export type { ModalBodyProps } from './ModalBody';

export { ModalFooter } from './ModalFooter';
export type { ModalFooterProps } from './ModalFooter';

// Pre-built modals
export { ConfirmModal } from './ConfirmModal';
export type { ConfirmModalProps } from './ConfirmModal';

export { FormModal } from './FormModal';
export type { FormModalProps } from './FormModal';

export { InfoModal } from './InfoModal';
export type { InfoModalProps } from './InfoModal';
