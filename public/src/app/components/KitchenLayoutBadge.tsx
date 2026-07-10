/**
 * Kitchen Layout Badge
 * 
 * Shows a badge indicating if a work request has kitchen layout analysis
 * Used in work request lists and dashboards
 */

import { ChefHat, CheckCircle } from 'lucide-react';

interface KitchenLayoutBadgeProps {
  hasKitchenLayout?: boolean;
  cabinetCount?: number;
  className?: string;
}

export function KitchenLayoutBadge({ 
  hasKitchenLayout = false, 
  cabinetCount = 0,
  className = '' 
}: KitchenLayoutBadgeProps) {
  if (!hasKitchenLayout) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-[#ea580c]/10 border border-[#ea580c]/30 rounded-lg ${className}`}>
      <ChefHat className="w-4 h-4 text-[#ea580c]" />
      <span className="text-sm font-semibold text-[#ea580c]">
        Kitchen Layout
      </span>
      {cabinetCount > 0 && (
        <>
          <span className="text-gray-500">•</span>
          <span className="text-sm text-gray-400">
            {cabinetCount} cabinets
          </span>
        </>
      )}
      <CheckCircle className="w-4 h-4 text-green-500" />
    </div>
  );
}

/**
 * Compact version for table rows
 */
export function KitchenLayoutBadgeCompact({ 
  hasKitchenLayout = false 
}: { hasKitchenLayout?: boolean }) {
  if (!hasKitchenLayout) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#ea580c]/10 border border-[#ea580c]/30 rounded">
      <ChefHat className="w-3 h-3 text-[#ea580c]" />
      <span className="text-xs font-semibold text-[#ea580c]">Kitchen</span>
    </div>
  );
}
