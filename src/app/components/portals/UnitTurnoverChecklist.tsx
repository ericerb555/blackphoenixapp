import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ClipboardCheck, LoaderCircle, Wrench, CheckSquare, Square,
  ChevronDown, ChevronRight, RotateCcw,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Property { id: string; name?: string; address?: string; }

// Detailed, categorized unit-turnover scope. Landlord checks the items they want done.
const TURNOVER_SCOPE: { category: string; items: string[] }[] = [
  { category: 'General & Inspection', items: [
    'Full walkthrough & condition documentation (photos)',
    'Test all light switches & outlets',
    'Test smoke & carbon monoxide detectors (replace batteries)',
    'Check & replace HVAC filters',
    'Inspect for water damage / leaks',
    'Inspect for signs of pests / schedule pest control',
    'Verify all keys, mailbox keys & remotes present / re-key locks',
    'Check window locks & operation',
  ]},
  { category: 'Cleaning', items: [
    'Deep clean entire unit',
    'Clean & sanitize all bathrooms',
    'Degrease & clean kitchen (cabinets, counters, backsplash)',
    'Clean inside/outside of all appliances',
    'Clean interior windows, tracks & sills',
    'Clean baseboards, trim & doors',
    'Clean light fixtures & ceiling fans',
    'Clean air vents & registers',
    'Steam clean carpets',
    'Mop & polish hard floors',
    'Remove all trash & debris',
  ]},
  { category: 'Paint & Walls', items: [
    'Patch nail holes & drywall damage',
    'Touch-up paint as needed',
    'Full repaint of unit (walls & ceilings)',
    'Paint trim, doors & baseboards',
    'Remove wallpaper / adhesive residue',
    'Caulk gaps at trim & corners',
  ]},
  { category: 'Flooring', items: [
    'Inspect flooring for damage',
    'Replace damaged carpet / sections',
    'Repair/replace vinyl or laminate planks',
    'Refinish hardwood floors',
    'Replace/repair floor transitions & thresholds',
    'Re-grout / re-caulk tile floors',
  ]},
  { category: 'Kitchen', items: [
    'Test & clean refrigerator (defrost, replace filter)',
    'Test & clean oven/range & hood',
    'Test & clean dishwasher',
    'Test & clean microwave',
    'Inspect & repair cabinets / drawers / hardware',
    'Check under-sink plumbing for leaks',
    'Replace/repair faucet & sprayer',
    'Re-caulk sink & countertops',
    'Replace worn countertops (if needed)',
  ]},
  { category: 'Bathrooms', items: [
    'Test toilet operation, replace flapper/fill valve',
    'Re-caulk tub / shower / toilet base',
    'Clean/replace showerhead & aerators',
    'Inspect & repair vanity / cabinet',
    'Check exhaust fan operation',
    'Replace toilet seat',
    'Reseal grout in tub/shower surround',
    'Check for mold & remediate',
  ]},
  { category: 'Plumbing', items: [
    'Check all faucets for leaks & pressure',
    'Test water heater & set temperature',
    'Inspect shut-off valves',
    'Clear slow drains',
    'Check washer hookups & hoses',
  ]},
  { category: 'Electrical & HVAC', items: [
    'Replace all burnt-out bulbs (standardize)',
    'Test GFCI outlets',
    'Replace worn outlets & switch plates',
    'Service HVAC / test heat & A/C',
    'Test thermostat & replace if needed',
    'Check breaker panel labeling',
  ]},
  { category: 'Doors, Windows & Hardware', items: [
    'Adjust/repair sticking doors',
    'Replace damaged door hardware & stops',
    'Repair/replace window screens',
    'Replace weather-stripping',
    'Lubricate hinges & tracks',
    'Replace blinds / window coverings',
  ]},
  { category: 'Safety & Compliance', items: [
    'Verify smoke/CO detectors meet code',
    'Fire extinguisher present & charged',
    'Handrails secure',
    'Egress windows operable',
    'Address any lead/asbestos concerns',
  ]},
  { category: 'Exterior / Common (if applicable)', items: [
    'Clean entry / porch / patio',
    'Check exterior lighting',
    'Landscaping / yard cleanup',
    'Power-wash exterior surfaces',
    'Inspect gutters & downspouts',
    'Check parking / assigned spot',
  ]},
];

const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];

export default function UnitTurnoverChecklist({ session, properties = [], onCreated }: { session: any; properties?: Property[]; onCreated?: () => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [propertyId, setPropertyId] = useState('');
  const [unit, setUnit] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  const key = (cat: string, item: string) => `${cat}::${item}`;

  const selectedItems = useMemo(() => {
    const out: { category: string; label: string }[] = [];
    for (const group of TURNOVER_SCOPE) for (const item of group.items) if (checked[key(group.category, item)]) out.push({ category: group.category, label: item });
    return out;
  }, [checked]);

  const toggleItem = (cat: string, item: string) => setChecked(c => ({ ...c, [key(cat, item)]: !c[key(cat, item)] }));
  const toggleCategory = (group: { category: string; items: string[] }) => {
    const allOn = group.items.every(i => checked[key(group.category, i)]);
    setChecked(c => { const n = { ...c }; for (const i of group.items) n[key(group.category, i)] = !allOn; return n; });
  };
  const clearAll = () => setChecked({});

  const property = properties.find(p => p.id === propertyId);

  const createRequest = async () => {
    if (!authHeaders) { toast.error('Sign in first.'); return; }
    if (selectedItems.length === 0) { toast.error('Check at least one item to include.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/landlord/turnover-request`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId, propertyName: property?.name || '', address: property?.address || '',
          unit, priority, notes, items: selectedItems,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to create the work request.');
      toast.success(`Turnover work request created with ${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'}.`);
      clearAll(); setUnit(''); setNotes(''); setPriority('medium');
      onCreated?.();
    } catch (error: any) { toast.error(error?.message || 'Unable to create the work request.'); }
    finally { setSaving(false); }
  };

  const field = 'w-full rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500';
  const label = 'block text-xs font-semibold text-gray-400 mb-1.5';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-teal-400" /> Unit Turnover Checklist</h3>
          <p className="mt-1 text-sm text-gray-400">Check the items you want done, then attach the scope to a maintenance work request.</p>
        </div>
        <button onClick={clearAll} className="inline-flex items-center gap-2 rounded-lg border border-[#3a3a3a] px-3 py-2 text-sm font-semibold text-gray-300 transition hover:text-white"><RotateCcw className="h-4 w-4" /> Reset</button>
      </div>

      {/* Target details */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-teal-500/25 bg-[#151515] p-5 sm:grid-cols-3">
        <div>
          <label className={label}>Property</label>
          <select value={propertyId} onChange={e => setPropertyId(e.target.value)} className={field}>
            <option value="">— Select a property —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name || p.address || 'Property'}</option>)}
          </select>
        </div>
        <div><label className={label}>Unit</label><input value={unit} onChange={e => setUnit(e.target.value)} placeholder="e.g. 2B" className={field} /></div>
        <div>
          <label className={label}>Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} className={field}>{PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-3">
        {TURNOVER_SCOPE.map(group => {
          const isCollapsed = collapsed[group.category];
          const selCount = group.items.filter(i => checked[key(group.category, i)]).length;
          const allOn = selCount === group.items.length;
          return (
            <div key={group.category} className="overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <button onClick={() => setCollapsed(c => ({ ...c, [group.category]: !c[group.category] }))} className="flex min-w-0 items-center gap-2 text-left">
                  {isCollapsed ? <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-500" />}
                  <span className="truncate font-bold text-white">{group.category}</span>
                  {selCount > 0 && <span className="flex-shrink-0 rounded-full bg-teal-500/15 px-2 py-0.5 text-[11px] font-bold text-teal-300">{selCount}</span>}
                </button>
                <button onClick={() => toggleCategory(group)} className="flex-shrink-0 text-xs font-bold text-teal-300 transition hover:text-teal-200">{allOn ? 'Clear' : 'Select all'}</button>
              </div>
              {!isCollapsed && (
                <div className="grid grid-cols-1 gap-px bg-[#2A2A2A] sm:grid-cols-2">
                  {group.items.map(item => {
                    const on = checked[key(group.category, item)];
                    return (
                      <button key={item} onClick={() => toggleItem(group.category, item)} className={`flex items-start gap-2.5 bg-[#1A1A1A] px-4 py-3 text-left text-sm transition hover:bg-[#202020] ${on ? 'text-white' : 'text-gray-300'}`}>
                        {on ? <CheckSquare className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-400" /> : <Square className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600" />}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Notes + submit (sticky footer) */}
      <div className="rounded-xl border border-teal-500/25 bg-[#151515] p-5 space-y-3">
        <div><label className={label}>Additional notes for the crew (optional)</label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Access instructions, deadline, materials, etc." className={`${field} resize-none`} /></div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-400"><span className="font-bold text-white">{selectedItems.length}</span> item{selectedItems.length === 1 ? '' : 's'} selected</p>
          <button onClick={createRequest} disabled={saving || selectedItems.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Creating…</> : <><Wrench className="h-4 w-4" /> Create work request</>}
          </button>
        </div>
      </div>
    </div>
  );
}
