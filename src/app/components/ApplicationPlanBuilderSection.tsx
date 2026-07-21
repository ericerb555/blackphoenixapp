/**
 * ApplicationPlanBuilderSection
 *
 * A self-contained, optional "build your maintenance plan with AI" section that
 * drops into any application / registration flow. It's collapsed by default so it
 * never gets in the way of the core application, and expands to reveal the full
 * AI-powered PlanBuilderTab. Applicants can attach a plan preference to their
 * application for review — completely optional.
 */

import { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import PlanBuilderTab, { type ApplicationPlanDraft } from './portals/PlanBuilderTab';

type PortalType =
  | 'customer' | 'vendor' | 'subcontractor' | 'advertiser' | 'investor'
  | 'employee' | 'property_manager' | 'landlord' | 'condo_manager';

interface ApplicationPlanBuilderSectionProps {
  portalType: PortalType;
  ownerName?: string;
  /** Start expanded instead of collapsed. */
  defaultOpen?: boolean;
  /** Saves an optional plan preference into the application payload. */
  onPlanDraftChange?: (draft: ApplicationPlanDraft | null) => void;
}

export default function ApplicationPlanBuilderSection({
  portalType,
  ownerName,
  defaultOpen = false,
  onPlanDraftChange,
}: ApplicationPlanBuilderSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-600/10 via-[#0d0d0d] to-[#0a0a0a] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-orange-400" />
          </span>
          <span>
            <span className="block text-white font-semibold">Add a maintenance plan with AI</span>
            <span className="block text-xs text-gray-400">
              Optional — describe your needs and attach a custom plan preference for review.
            </span>
          </span>
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-orange-500/20 p-5">
          <PlanBuilderTab portalType={portalType} ownerName={ownerName} onPlanDraftChange={onPlanDraftChange} />
        </div>
      )}
    </div>
  );
}
