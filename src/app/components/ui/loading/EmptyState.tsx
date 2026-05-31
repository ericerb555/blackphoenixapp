/**
 * EmptyState Component
 * 
 * A consistent empty state component for when there's no data to display.
 * 
 * @example
 * <EmptyState
 *   icon={<Users />}
 *   title="No users found"
 *   description="Get started by adding your first user"
 *   action={<PrimaryButton onClick={handleAdd}>Add User</PrimaryButton>}
 * />
 */

import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      <div className="text-gray-500 mb-4">
        {icon || <Inbox className="w-16 h-16" />}
      </div>
      <h3 className="text-xl font-semibold text-gray-300 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-400 text-center max-w-md mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
