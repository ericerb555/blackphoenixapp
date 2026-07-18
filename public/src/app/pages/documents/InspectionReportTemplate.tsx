import { useState } from 'react';
import { DocSection, DocSubSection, DocCallout, P, Bold, PageBreak } from './DocComponents';

type Rating = 'good' | 'fair' | 'poor' | null;

interface InspectionItem {
  label: string;
  rating: Rating;
}

function RatingButton({ value, current, onChange }: { value: Rating; current: Rating; onChange: (v: Rating) => void }) {
  const styles: Record<string, string> = {
    good: current === 'good' ? 'bg-green-500 text-white border-green-500' : 'bg-transparent text-green-400 border-green-500/30 hover:border-green-500',
    fair: current === 'fair' ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-transparent text-yellow-400 border-yellow-500/30 hover:border-yellow-500',
    poor: current === 'poor' ? 'bg-red-500 text-white border-red-500' : 'bg-transparent text-red-400 border-red-500/30 hover:border-red-500',
  };
  const labels: Record<string, string> = { good: '✓ Good', fair: '⚠ Fair', poor: '✗ Poor' };
  return (
    <button
      onClick={() => onChange(current === value ? null : value)}
      className={`px-2 py-1 text-xs font-bold rounded border transition-all ${styles[value as string]}`}
    >
      {labels[value as string]}
    </button>
  );
}

function InspectionRow({ item, onChange }: { item: InspectionItem; onChange: (r: Rating) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#1E1E1E] last:border-0">
      <span className="text-sm text-gray-300 flex-1">{item.label}</span>
      <div className="flex gap-1.5 flex-shrink-0 ml-4 print:hidden">
        <RatingButton value="good" current={item.rating} onChange={onChange} />
        <RatingButton value="fair" current={item.rating} onChange={onChange} />
        <RatingButton value="poor" current={item.rating} onChange={onChange} />
      </div>
      <span className="hidden print:inline text-xs ml-4">
        {item.rating ? item.rating.toUpperCase() : '___'}
      </span>
    </div>
  );
}

function SectionBlock({ title, items, onUpdate }: { title: string; items: InspectionItem[]; onUpdate: (i: number, r: Rating) => void }) {
  return (
    <div className="mb-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-[#111] border-b border-[#2A2A2A]">
        <p className="font-bold text-gray-200 text-sm">{title}</p>
      </div>
      <div className="px-4">
        {items.map((item, i) => (
          <InspectionRow key={i} item={item} onChange={(r) => onUpdate(i, r)} />
        ))}
      </div>
    </div>
  );
}

const DEFAULT_ITEMS: Record<string, string[]> = {
  exterior: ["Foundation visible condition", "Siding / cladding", "Roof visible from ground", "Gutters and downspouts", "Windows (exterior)", "Exterior doors and frames", "Driveway and walkways", "Landscaping / drainage"],
  common: ["Hallways and stairwells", "Common laundry area", "Parking area", "Lobby / entry", "Mail area"],
  kitchen: ["Cabinets and hardware", "Countertops", "Sink and faucet", "Dishwasher", "Stove / oven", "Refrigerator", "Microwave", "Floor", "Ceiling and walls", "Outlets (GFCI at sink)", "Light fixtures"],
  bathroom: ["Toilet", "Sink and faucet", "Tub / shower", "Tile and grout", "Mirror", "Floor", "Ceiling and walls", "Exhaust fan", "GFCI outlet"],
  bedroom1: ["Floor", "Walls", "Ceiling", "Closet door and interior", "Windows and screens", "Outlets", "Door and hardware"],
  bedroom2: ["Floor", "Walls", "Ceiling", "Closet door and interior", "Windows and screens", "Outlets", "Door and hardware"],
  bedroom3: ["Floor", "Walls", "Ceiling", "Closet door and interior", "Windows and screens", "Outlets", "Door and hardware"],
  mechanical: ["Furnace / boiler", "Water heater", "Electrical panel", "Smoke detectors", "CO detectors", "Central AC or heat pump"],
};

function buildItems(keys: string[]): InspectionItem[] {
  return keys.map(label => ({ label, rating: null }));
}

export default function InspectionReportTemplate() {
  const [address, setAddress] = useState('');
  const [inspector, setInspector] = useState('');
  const [date, setDate] = useState('');

  const [sections, setSections] = useState<Record<string, InspectionItem[]>>({
    exterior: buildItems(DEFAULT_ITEMS.exterior),
    common: buildItems(DEFAULT_ITEMS.common),
    kitchen: buildItems(DEFAULT_ITEMS.kitchen),
    bathroom: buildItems(DEFAULT_ITEMS.bathroom),
    bedroom1: buildItems(DEFAULT_ITEMS.bedroom1),
    bedroom2: buildItems(DEFAULT_ITEMS.bedroom2),
    bedroom3: buildItems(DEFAULT_ITEMS.bedroom3),
    mechanical: buildItems(DEFAULT_ITEMS.mechanical),
  });

  const updateItem = (section: string, i: number, r: Rating) => {
    setSections(prev => {
      const updated = [...prev[section]];
      updated[i] = { ...updated[i], rating: r };
      return { ...prev, [section]: updated };
    });
  };

  const allItems = Object.values(sections).flat();
  const goodCount = allItems.filter(i => i.rating === 'good').length;
  const fairCount = allItems.filter(i => i.rating === 'fair').length;
  const poorCount = allItems.filter(i => i.rating === 'poor').length;
  const ratedCount = goodCount + fairCount + poorCount;
  const totalCount = allItems.length;

  return (
    <div>
      <DocSection id="instructions" title="Property Inspection Report" subtitle="Complete room-by-room condition assessment">
        <DocCallout type="info" title="How to Use This Form">
          Complete all fields below. Rate each item as Good, Fair, or Poor. Both landlord and tenant should be present. This report becomes a legal record when signed by both parties. For move-in reports, use this to establish baseline condition. For move-out, compare to the move-in report.
        </DocCallout>

        {/* Header inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 print:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Property Address</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St, Concord NH"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Inspector Name</label>
            <input
              value={inspector}
              onChange={e => setInspector(e.target.value)}
              placeholder="Inspector / Landlord Name"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Inspection Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60"
            />
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-3 my-6 sticky top-4 z-10">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3 text-center">
            <p className="text-xl font-black text-gray-400">{ratedCount}/{totalCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Rated</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-green-400">{goodCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Good</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-yellow-400">{fairCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Fair</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-red-400">{poorCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Poor</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="mb-6 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg transition print:hidden"
        >
          Print Report
        </button>
      </DocSection>

      <DocSection id="exterior" title="Exterior" subtitle="Outside inspection — walk the entire property perimeter">
        <SectionBlock title="Exterior Conditions" items={sections.exterior} onUpdate={(i, r) => updateItem('exterior', i, r)} />
      </DocSection>

      <DocSection id="common-areas" title="Common Areas" subtitle="Shared spaces inspection">
        <SectionBlock title="Common Areas" items={sections.common} onUpdate={(i, r) => updateItem('common', i, r)} />
      </DocSection>

      <PageBreak />

      <DocSection id="kitchen" title="Kitchen" subtitle="">
        <SectionBlock title="Kitchen" items={sections.kitchen} onUpdate={(i, r) => updateItem('kitchen', i, r)} />
      </DocSection>

      <DocSection id="bathroom" title="Bathroom" subtitle="">
        <SectionBlock title="Bathroom" items={sections.bathroom} onUpdate={(i, r) => updateItem('bathroom', i, r)} />
      </DocSection>

      <DocSection id="bedrooms" title="Bedrooms" subtitle="Repeat for each bedroom in the unit">
        <SectionBlock title="Bedroom 1" items={sections.bedroom1} onUpdate={(i, r) => updateItem('bedroom1', i, r)} />
        <SectionBlock title="Bedroom 2" items={sections.bedroom2} onUpdate={(i, r) => updateItem('bedroom2', i, r)} />
        <SectionBlock title="Bedroom 3" items={sections.bedroom3} onUpdate={(i, r) => updateItem('bedroom3', i, r)} />
      </DocSection>

      <DocSection id="mechanical" title="Mechanical & Safety Systems" subtitle="">
        <SectionBlock title="Mechanical" items={sections.mechanical} onUpdate={(i, r) => updateItem('mechanical', i, r)} />
        <DocCallout type="law" title="NH Smoke Detector Requirement">
          NH RSA 153:10-a requires working smoke detectors on each level and outside each sleeping area. Carbon monoxide detectors are required in any home with fossil fuel appliances or attached garage. Failure to provide working detectors is a violation of NH law.
        </DocCallout>
      </DocSection>

      <DocSection id="signatures" title="Signatures" subtitle="Both parties must sign to make this report official">
        <P>By signing below, both parties acknowledge that the conditions noted in this report accurately reflect the condition of the property at the time of inspection.</P>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Landlord / Agent</p>
            <div className="border-b border-gray-600 h-10 mb-2"></div>
            <p className="text-xs text-gray-500">Signature</p>
            <div className="border-b border-gray-600 h-8 mb-2 mt-4"></div>
            <p className="text-xs text-gray-500">Print Name</p>
            <div className="border-b border-gray-600 h-8 mb-2 mt-4"></div>
            <p className="text-xs text-gray-500">Date</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Tenant</p>
            <div className="border-b border-gray-600 h-10 mb-2"></div>
            <p className="text-xs text-gray-500">Signature</p>
            <div className="border-b border-gray-600 h-8 mb-2 mt-4"></div>
            <p className="text-xs text-gray-500">Print Name (please print clearly)</p>
            <div className="border-b border-gray-600 h-8 mb-2 mt-4"></div>
            <p className="text-xs text-gray-500">Date</p>
          </div>
        </div>
      </DocSection>
    </div>
  );
}
