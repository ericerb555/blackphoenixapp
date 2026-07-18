import { useState } from 'react';
import { DocSection, DocSubSection, DocCallout, DocTable, CalcInput, CalcResult, DocStats, P, Bold, PageBreak } from './DocComponents';

interface Component {
  name: string;
  cost: number;
  remainingLife: number;
  usefulLife: number;
}

const DEFAULT_COMPONENTS: Component[] = [
  { name: "Roof", cost: 80000, remainingLife: 8, usefulLife: 25 },
  { name: "Parking Lot", cost: 40000, remainingLife: 5, usefulLife: 20 },
  { name: "HVAC Systems", cost: 55000, remainingLife: 6, usefulLife: 18 },
  { name: "Building Paint", cost: 25000, remainingLife: 2, usefulLife: 8 },
  { name: "Windows", cost: 50000, remainingLife: 15, usefulLife: 28 },
  { name: "Common Area Flooring", cost: 18000, remainingLife: 4, usefulLife: 12 },
];

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function AI_CapitalPlan() {
  const [components, setComponents] = useState<Component[]>(DEFAULT_COMPONENTS);
  const [currentBalance, setCurrentBalance] = useState(85000);
  const [associationName, setAssociationName] = useState('');
  const [units, setUnits] = useState(24);

  const addComponent = () => {
    setComponents(prev => [...prev, { name: "New Component", cost: 10000, remainingLife: 10, usefulLife: 20 }]);
  };

  const updateComponent = (i: number, field: keyof Component, value: string) => {
    setComponents(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: field === 'name' ? value : parseFloat(value) || 0 };
      return updated;
    });
  };

  const removeComponent = (i: number) => {
    setComponents(prev => prev.filter((_, idx) => idx !== i));
  };

  // Calculations
  const annualRequired = components.reduce((sum, c) => sum + c.cost / c.usefulLife, 0);
  const fullyFunded = components.reduce((sum, c) => {
    const elapsed = c.usefulLife - c.remainingLife;
    return sum + c.cost * (elapsed / c.usefulLife);
  }, 0);
  const percentFunded = fullyFunded > 0 ? (currentBalance / fullyFunded) * 100 : 0;

  // Scenarios
  const scenarios = [
    { label: "Conservative (70% Funded)", contribution: annualRequired * 0.7, target: 70 },
    { label: "Moderate (85% Funded)", contribution: annualRequired * 0.85, target: 85 },
    { label: "Aggressive (100% Funded)", contribution: annualRequired, target: 100 },
  ];

  // 10-year schedule
  const years = Array.from({ length: 10 }, (_, i) => i + 1);
  const scheduleRows = years.map(year => {
    const items = components.filter(c => c.remainingLife === year);
    return { year, items, total: items.reduce((s, c) => s + c.cost, 0) };
  }).filter(r => r.items.length > 0 || r.year <= 10);

  const buildBalance = (annual: number) => {
    let bal = currentBalance;
    return years.map(year => {
      const expense = components.filter(c => c.remainingLife === year).reduce((s, c) => s + c.cost, 0);
      bal = bal + annual - expense;
      return bal;
    });
  };

  const perUnitPerMonth = (annual: number) => units > 0 ? annual / units / 12 : 0;

  return (
    <div>
      <DocSection id="inventory" title="Component Inventory" subtitle="Enter all major capital components">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Association Name</label>
            <input value={associationName} onChange={e => setAssociationName(e.target.value)}
              placeholder="Maple Hill Condominium Association"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Number of Units</label>
              <input type="number" value={units} onChange={e => setUnits(parseInt(e.target.value) || 1)}
                className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Current Reserve Balance</label>
              <div className="flex items-center bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg overflow-hidden focus-within:border-orange-500/60">
                <span className="px-3 text-gray-500 font-bold text-sm border-r border-[#2A2A2A]">$</span>
                <input type="number" value={currentBalance} onChange={e => setCurrentBalance(parseFloat(e.target.value) || 0)}
                  className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm outline-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#2A2A2A] mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                {["Component", "Replacement Cost", "Useful Life (yrs)", "Remaining Life (yrs)", ""].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left font-bold text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={i} className={`border-b border-[#1E1E1E] ${i % 2 === 1 ? 'bg-[#0F0F0F]' : ''}`}>
                  <td className="px-3 py-2">
                    <input value={c.name} onChange={e => updateComponent(i, 'name', e.target.value)}
                      className="bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 w-36" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={c.cost} onChange={e => updateComponent(i, 'cost', e.target.value)}
                      className="bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 w-24" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={c.usefulLife} onChange={e => updateComponent(i, 'usefulLife', e.target.value)}
                      className="bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={c.remainingLife} onChange={e => updateComponent(i, 'remainingLife', e.target.value)}
                      className="bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeComponent(i)} className="text-red-400 hover:text-red-300">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addComponent}
          className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-300 text-xs font-bold rounded-lg transition">
          + Add Component
        </button>
      </DocSection>

      <PageBreak />

      <DocSection id="schedule" title="10-Year Replacement Schedule" subtitle="When each component needs replacement">
        <div className="overflow-x-auto rounded-xl border border-[#2A2A2A]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                <th className="px-3 py-2.5 text-left font-bold text-gray-400">Year</th>
                <th className="px-3 py-2.5 text-left font-bold text-gray-400">Components Due</th>
                <th className="px-3 py-2.5 text-left font-bold text-gray-400">Year Total</th>
              </tr>
            </thead>
            <tbody>
              {years.map(year => {
                const items = components.filter(c => c.remainingLife === year);
                const total = items.reduce((s, c) => s + c.cost, 0);
                return (
                  <tr key={year} className={`border-b border-[#1E1E1E] ${year % 2 === 0 ? 'bg-[#0F0F0F]' : ''}`}>
                    <td className="px-3 py-2 font-bold text-orange-400">Year {year}</td>
                    <td className="px-3 py-2 text-gray-300">
                      {items.length === 0 ? <span className="text-gray-600">No major expenditures</span> : items.map(c => c.name).join(', ')}
                    </td>
                    <td className={`px-3 py-2 font-bold ${total > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                      {total > 0 ? '$' + fmt(total) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="funding" title="Annual Funding Plan" subtitle="Required contributions to meet capital obligations">
        <DocStats stats={[
          { label: "Straight-Line Annual Contribution", value: '$' + fmt(annualRequired), sub: "To fully fund all components" },
          { label: "Per Unit Per Month", value: '$' + fmt(perUnitPerMonth(annualRequired), 0), sub: "At 100% funding level" },
          { label: "Current Fund % Funded", value: fmt(percentFunded, 1) + '%', color: percentFunded >= 70 ? 'text-green-400' : 'text-yellow-400' },
          { label: "Current Balance", value: '$' + fmt(currentBalance) },
        ]} />
      </DocSection>

      <DocSection id="scenarios" title="Three Funding Scenarios" subtitle="Conservative, moderate, and aggressive funding options">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {scenarios.map((s, i) => (
            <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
              <p className="text-2xl font-black text-white">${fmt(s.contribution)}</p>
              <p className="text-xs text-gray-500">/year</p>
              <p className="text-xs text-orange-400 mt-1">${fmt(perUnitPerMonth(s.contribution), 0)}/unit/month</p>
              <div className="mt-3 space-y-1 text-xs">
                {buildBalance(s.contribution).slice(0, 5).map((bal, j) => (
                  <div key={j} className="flex justify-between text-gray-500">
                    <span>Year {j + 1}</span>
                    <span className={bal < 0 ? 'text-red-400 font-bold' : 'text-gray-400'}>
                      {bal < 0 ? '(' + '$' + fmt(Math.abs(bal)) + ')' : '$' + fmt(bal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="presentation" title="Board Summary" subtitle="One-page summary for board presentation — print ready">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 print:border-gray-200">
          <div className="text-center mb-6 pb-4 border-b border-[#3A3A3A]">
            <p className="text-xl font-bold text-white print:text-black">{associationName || "Association Name"}</p>
            <p className="text-sm text-gray-400 print:text-gray-600">10-Year Capital Reserve Plan — Prepared {new Date().toLocaleDateString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Current Status</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Units</span><span className="text-white">{units}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Current Reserve Balance</span><span className="text-white">${fmt(currentBalance)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Fully Funded Target</span><span className="text-white">${fmt(fullyFunded)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Percent Funded</span>
                  <span className={percentFunded >= 70 ? 'text-green-400 font-bold' : 'text-yellow-400 font-bold'}>{fmt(percentFunded, 1)}%</span></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Recommended Funding</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Annual Contribution Needed</span><span className="text-white">${fmt(annualRequired)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Per Unit Monthly</span><span className="text-white">${fmt(perUnitPerMonth(annualRequired), 0)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Components Tracked</span><span className="text-white">{components.length}</span></div>
              </div>
            </div>
          </div>

          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Upcoming 5-Year Major Projects</p>
          <div className="space-y-1">
            {years.slice(0, 5).map(year => {
              const items = components.filter(c => c.remainingLife === year);
              if (items.length === 0) return null;
              const total = items.reduce((s, c) => s + c.cost, 0);
              return (
                <div key={year} className="flex justify-between text-sm py-1 border-b border-[#1E1E1E] print:border-gray-200">
                  <span className="text-gray-400">Year {year}: {items.map(c => c.name).join(', ')}</span>
                  <span className="text-orange-400 font-bold">${fmt(total)}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg print:bg-orange-50 print:border-orange-200">
            <p className="text-xs text-orange-300 print:text-orange-700">
              This summary is based on estimated replacement costs and current conditions. A full reserve study by a certified Reserve Specialist (RS) is recommended every 3-5 years to validate these figures.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-6">
            {["Prepared by", "Board President", "Date Approved"].map((label, i) => (
              <div key={i}>
                <div className="border-b border-gray-600 h-8 mb-1"></div>
                <p className="text-xs text-gray-600">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => window.print()}
          className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg transition print:hidden">
          Print Board Summary
        </button>
      </DocSection>
    </div>
  );
}
