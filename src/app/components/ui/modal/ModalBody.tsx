/**
 * Modal Body Component
 * 
 * Provides a scrollable content area for modals with:
 * - Proper padding
 * - Overflow handling
 * - Consistent spacing
 */

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function ModalBody({ children, className = '', noPadding = false }: ModalBodyProps) {
  return (
    <div className={`flex-1 overflow-y-auto ${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
}
