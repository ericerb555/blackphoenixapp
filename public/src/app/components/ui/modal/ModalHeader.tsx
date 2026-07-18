/**
 * Modal Header Component
 * 
 * Provides a consistent header for modals with:
 * - Title and optional subtitle
 * - Optional icon
 * - Consistent spacing and styling
 */

import { LucideIcon } from 'lucide-react';

export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
}

export function ModalHeader({ title, subtitle, icon: Icon, className = '' }: ModalHeaderProps) {
  return (
    <div className={`flex items-start gap-4 p-6 border-b border-[#2A2A2A] ${className}`}>
      {Icon && (
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
      <div className="flex-1 pr-10">
        <h2 className="text-2xl font-bold text-white mb-1">
          {title}
        </h2>
        {subtitle && (
          <p className="text-gray-400 text-sm">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
