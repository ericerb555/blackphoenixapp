/**
 * The design workspace rail.
 *
 * Replaces the left-hand buttons from the old Figma prototype, which were
 * mockups — clicking one went black because there was nothing behind it. Every
 * entry here goes somewhere that exists and works.
 *
 * That is the rule this component enforces: nothing is listed until it is
 * built. A rail advertising a tool that is not there is worse than a short
 * rail, because someone plans a job around it.
 */
import { Hammer, ArrowDownRight, Building2, ScanLine, FileSignature, Package, Layers } from 'lucide-react';

export interface WorkspaceLink {
  id: string;
  label: string;
  hint: string;
  icon: any;
  route: string;
}

export const DESIGN_TOOLS: WorkspaceLink[] = [
  { id: 'deck-designer', label: 'Deck designer', hint: '3D, framing and plan from one model', icon: Hammer, route: 'deck-designer' },
  { id: 'stairs', label: 'Stair calculator', hint: 'Risers, run and stringer cuts on site', icon: ArrowDownRight, route: 'stair-calculator' },
  { id: 'permits', label: 'Permits & zoning', hint: 'Town requirements and submission log', icon: Building2, route: 'permit-tracker' },
  { id: 'variances', label: 'Zoning variance', hint: 'Draft and file a variance application', icon: FileSignature, route: 'variances' },
  { id: 'scanner', label: 'Document scanner', hint: 'Print-accurate scans for town filing', icon: ScanLine, route: 'document-scanner' },
  { id: 'blueprints', label: 'Blueprint analyser', hint: 'Read an existing drawing', icon: Layers, route: 'blueprint-analyzer' },
  { id: 'materials', label: 'Materials hub', hint: 'Pricing and suppliers', icon: Package, route: 'materials-hub' },
];

export default function DesignWorkspaceNav({ current }: { current: string }) {
  const go = (route: string) => {
    // The app exposes its router here; fall back to a normal link so the rail
    // still works if that is ever absent.
    const nav = (window as any).__navigateApp;
    if (typeof nav === 'function') nav(route);
    else window.location.assign(`/${route}`);
  };

  return (
    <nav className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 px-2 py-1.5">Design workspace</p>
      <div className="space-y-0.5">
        {DESIGN_TOOLS.map(t => {
          const Icon = t.icon;
          const active = t.id === current;
          return (
            <button key={t.id} onClick={() => !active && go(t.route)}
              aria-current={active ? 'page' : undefined}
              className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition ${
                active ? 'bg-[#ea580c] text-white' : 'text-gray-300 hover:bg-white/5'
              }`}>
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? '' : 'text-[#ea580c]'}`} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{t.label}</span>
                <span className={`block text-[11px] leading-tight ${active ? 'text-white/80' : 'text-gray-500'}`}>
                  {t.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
