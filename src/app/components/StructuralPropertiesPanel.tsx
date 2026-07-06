import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';

interface StructuralPropertiesPanelProps {
  selectedElement: any;
  onPropertyChange: (property: string, value: any) => void;
}

export function StructuralPropertiesPanel({ selectedElement, onPropertyChange }: StructuralPropertiesPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    dimensions: true,
    material: true,
    structural: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!selectedElement) {
    return (
      <div className="w-80 bg-[#0A0A0A] border-l border-zinc-800 p-6 flex flex-col items-center justify-center text-zinc-500">
        <Info className="w-12 h-12 mb-3 text-zinc-700" />
        <p className="text-sm">Select an element to view properties</p>
      </div>
    );
  }

  const PropertySection = ({ title, section, children }: { title: string; section: string; children: React.ReactNode }) => (
    <div className="border-b border-zinc-800 last:border-b-0">
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors"
      >
        <span className="text-sm font-medium text-white">{title}</span>
        {expandedSections[section] ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      {expandedSections[section] && (
        <div className="p-4 pt-0 space-y-3">{children}</div>
      )}
    </div>
  );

  const PropertyInput = ({ label, value, onChange, type = 'text', suffix }: any) => (
    <div>
      <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ea580c] transition-colors"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  const PropertySelect = ({ label, value, onChange, options }: any) => (
    <div>
      <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ea580c] transition-colors"
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="w-80 bg-[#0A0A0A] border-l border-zinc-800 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Properties</h3>
        <p className="text-xs text-zinc-500 mt-1">{selectedElement.type || 'Element'}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <PropertySection title="General" section="general">
          <PropertyInput
            label="Name"
            value={selectedElement.name || ''}
            onChange={(val: string) => onPropertyChange('name', val)}
          />
          <PropertySelect
            label="Type"
            value={selectedElement.type || 'wall'}
            onChange={(val: string) => onPropertyChange('type', val)}
            options={[
              { value: 'wall', label: 'Wall' },
              { value: 'beam', label: 'Beam' },
              { value: 'column', label: 'Column' },
              { value: 'slab', label: 'Slab' },
              { value: 'foundation', label: 'Foundation' },
            ]}
          />
        </PropertySection>

        <PropertySection title="Dimensions" section="dimensions">
          <PropertyInput
            label="Length"
            value={selectedElement.length || '0'}
            onChange={(val: string) => onPropertyChange('length', val)}
            type="number"
            suffix="ft"
          />
          <PropertyInput
            label="Width"
            value={selectedElement.width || '0'}
            onChange={(val: string) => onPropertyChange('width', val)}
            type="number"
            suffix="ft"
          />
          <PropertyInput
            label="Height"
            value={selectedElement.height || '0'}
            onChange={(val: string) => onPropertyChange('height', val)}
            type="number"
            suffix="ft"
          />
          <PropertyInput
            label="Thickness"
            value={selectedElement.thickness || '0'}
            onChange={(val: string) => onPropertyChange('thickness', val)}
            type="number"
            suffix="in"
          />
        </PropertySection>

        <PropertySection title="Material" section="material">
          <PropertySelect
            label="Material Type"
            value={selectedElement.material || 'concrete'}
            onChange={(val: string) => onPropertyChange('material', val)}
            options={[
              { value: 'concrete', label: 'Concrete' },
              { value: 'steel', label: 'Steel' },
              { value: 'wood', label: 'Wood' },
              { value: 'masonry', label: 'Masonry' },
              { value: 'composite', label: 'Composite' },
            ]}
          />
          <PropertyInput
            label="Grade/Class"
            value={selectedElement.grade || ''}
            onChange={(val: string) => onPropertyChange('grade', val)}
          />
        </PropertySection>

        <PropertySection title="Structural Properties" section="structural">
          <PropertyInput
            label="Load Capacity"
            value={selectedElement.loadCapacity || '0'}
            onChange={(val: string) => onPropertyChange('loadCapacity', val)}
            type="number"
            suffix="kN"
          />
          <PropertyInput
            label="Reinforcement"
            value={selectedElement.reinforcement || ''}
            onChange={(val: string) => onPropertyChange('reinforcement', val)}
          />
          <PropertySelect
            label="Connection Type"
            value={selectedElement.connectionType || 'fixed'}
            onChange={(val: string) => onPropertyChange('connectionType', val)}
            options={[
              { value: 'fixed', label: 'Fixed' },
              { value: 'pinned', label: 'Pinned' },
              { value: 'roller', label: 'Roller' },
              { value: 'hinged', label: 'Hinged' },
            ]}
          />
        </PropertySection>
      </div>
    </div>
  );
}
