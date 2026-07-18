import { useState } from 'react';
import { DocSection, DocSubSection, DocCallout, CalcInput, CalcResult, P, Bold, PageBreak } from './DocComponents';

interface Component {
  name: string;
  cost: number;
  usefulLife: number;
  remainingLife: number;
}

const DEFAULT_COMPONENTS: Component[] = [
  { name: "Asphalt Shingle Roof", cost: 85000, usefulLife: 25, remainingLife: 12 },
  { name: "Parking Lot (asphalt)", cost: 45000, usefulLife: 22, remainingLife: 8 },
  { name: "HVAC Systems", cost: 60000, usefulLife: 18, remainingLife: 5 },
  { name: "Building Exterior Paint", cost: 28000, usefulLife: 8, remainingLife: 3 },
  { name: "Windows (replacement)", cost: 55000, usefulLife: 28, remainingLife: 20 },
  { name: "Pool Resurfacing", cost: 18000, usefulLife: 12, remainingLife: 7 },
  { name: "Playground Equipment", cost: 22000, usefulLife: 15, remainingLife: 9 },
  { name: "Elevator Modernization", cost: 95000, usefulLife: 25, remainingLife: 18 },
];

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function ReserveFundCalculator() {
  const [components, setComponents] = useState<Component[]>(DEFAULT_COMPONENTS);
  const [currentBalance, setCurrentBalance] = useState(125000);
  const [annualContribution, setAnnualContribution] = useState(45000);

  const updateComponent = (i: number, field: keyof Component, value: string | number) => {
    setComponents(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: typeof value === 'string' ? value : Number(value) };
      return updated;
    });
  };

  const addComponent = () => {
    setComponents(prev => [...prev, { name: "New Component", cost: 10000, usefulLife: 20, remainingLife: 15 }]);
  };

  const removeComponent = (i: number) => {
    setComponents(prev => prev.filter((_, idx) => idx !== i));
  };

  // Calculations
  const totalFutureReplacement = components.reduce((sum, c) => sum + c.cost, 0);

  // Fully funded balance = sum of (cost × (useful_life - remaining_life) / useful_life)
  const fullyFundedBalance = components.reduce((sum, c) => {
    const elapsed = c.usefulLife - c.remainingLife;
    return sum + (c.cost * (elapsed / c.usefulLife));
  }, 0);

  const percentFunded = fullyFundedBalance > 0 ? (currentBalance / fullyFundedBalance) * 100 : 0;

  // Straight-line annual contribution needed
  const straightLineRequired = components.reduce((sum, c) => sum + c.cost / c.usefulLife, 0);

  // Years until depletion at current balance with current contribution
  let depletionYear = Infinity;
  let balance = currentBalance;
  for (let year = 0; year <= 30; year++) {
    // Find expenses this year
    const yearlyExpense = components.filter(c => c.remainingLife === year).reduce((s, c) => s + c.cost, 0);
    balance = balance + annualContribution - yearlyExpense;
    if (balance < 0) { depletionYear = year; break; }
  }

  // Recommended contribution to reach 100% funded in minimum remaining life
  const minRemaining = Math.min(...components.map(c => c.remainingLife));
  const deficiency = Math.max(0, fullyFundedBalance - currentBalance);
  const recommendedContribution = straightLineRequired + (minRemaining > 0 ? deficiency / minRemaining : 0);

  // 10-year scenario table
  const scenarios = [
    { label: "Current", contribution: annualContribution, color: "text-yellow-400" },
    { label: "Recommended (100%)", contribution: Math.round(recommendedContribution), color: "text-green-400" },
    { label: "70% Funded Target", contribution: Math.round(recommendedContribution * 0.7), color: "text-blue-400" },
  ];

  const buildYearlyBalance = (annual: number) => {
    let bal = currentBalance;
    return Array.from({ length: 10 }, (_, i) => {
      const year = i + 1;
      const expense = components.filter(c => c.remainingLife === year).reduce((s, c) => s + c.cost, 0);
      bal = bal + annual - expense;
      return { year, balance: bal, expense };
    });
  };

  const fundingColor = percentFunded >= 70 ? 'text-green-400' : percentFunded >= 30 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div>
      <DocSection id="components" title="Component Inventory" subtitle="Enter all major components that will eventually need replacement">
        <div className="overflow-x-auto rounded-xl border border-[#2A2A2A] mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                {["Component", "Replacement Cost ($)", "Useful Life (yrs)", "Remaining Life (yrs)", ""].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left font-bold text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {components.map((comp, i) => (
                <tr key={i} className={`border-b border-[#1E1E1E] ${i % 2 === 1 ? 'bg-[#0F0F0F]' : ''}`}>
                  <td className="px-3 py-2">
                    <input value={comp.name} onChange={e => updateComponent(i, 'name', e.target.value)}
                      className="bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 w-full min-w-36" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={comp.cost} onChange={e => updateComponent(i, 'cost', e.target.value)}
                      className="bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 w-24" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={comp.usefulLife} onChange={e => updateComponent(i, 'usefulLife', e.target.value)}
                      className="bg-transparent text-gray-200 text-xs outline-none border-b border-transparent focus:border-orange-500/40 w-16" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={comp.remainingLife} onChange={e => updateComponent(i, 'remainingLife', e.target.value)}
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

      <DocSection id="current" title="Current Fund Status" subtitle="Your existing reserve balance and contribution rate">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CalcInput label="Current Reserve Balance" value={currentBalance} onChange={setCurrentBalance} prefix="$" step={5000} />
          <CalcInput label="Annual Contribution" value={annualContribution} onChange={setAnnualContribution} prefix="$" step={1000} hint="What you currently put into reserves each year" />
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="results" title="Adequacy Results" subtitle="How well-funded is your reserve fund?">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          <CalcResult label="Total Future Replacement Cost" value={'$' + fmt(totalFutureReplacement)} sub="Sum of all component replacements" />
          <CalcResult label="Fully Funded Target" value={'$' + fmt(fullyFundedBalance)} sub="What you should have saved to date" />
          <CalcResult label="Percent Funded" value={fmt(percentFunded, 1) + '%'} sub="Current balance vs. target" highlight />
          <CalcResult label="Straight-Line Annual Contribution" value={'$' + fmt(straightLineRequired)} sub="Needed to keep up with depreciation" />
          <CalcResult label="Recommended Annual Contribution" value={'$' + fmt(recommendedContribution)} sub="To reach 100% funded" />
          <CalcResult label="Years Until Fund Depletion" value={depletionYear === Infinity ? 'No depletion' : depletionYear + ' years'} sub="At current contribution rate" />
        </div>

        <div className="my-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-gray-400">Percent Funded</span>
            <span className={`text-sm font-black ${fundingColor}`}>{fmt(percentFunded, 1)}%</span>
          </div>
          <div className="w-full bg-[#111] rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${percentFunded >= 70 ? 'bg-green-500' : percentFunded >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: Math.min(percentFunded, 100) + '%' }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-600">
            <span>0% Critical</span>
            <span>30% Fair</span>
            <span>70% Good</span>
            <span>100% Excellent</span>
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="scenarios" title="Funding Scenarios" subtitle="10-year fund balance under three contribution levels">
        <div className="overflow-x-auto rounded-xl border border-[#2A2A2A]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
                <th className="px-3 py-2.5 text-left font-bold text-gray-400">Year</th>
                {scenarios.map((s, i) => (
                  <th key={i} className={`px-3 py-2.5 text-left font-bold ${s.color}`}>
                    {s.label}<br />
                    <span className="text-gray-500 font-normal">${fmt(s.contribution)}/yr</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, i) => {
                const year = i + 1;
                const balances = scenarios.map(s => {
                  const rows = buildYearlyBalance(s.contribution);
                  return rows[i].balance;
                });
                return (
                  <tr key={i} className={`border-b border-[#1E1E1E] ${i % 2 === 1 ? 'bg-[#0F0F0F]' : ''}`}>
                    <td className="px-3 py-2 font-bold text-orange-400">{year}</td>
                    {balances.map((bal, j) => (
                      <td key={j} className={`px-3 py-2 ${bal < 0 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>
                        {bal < 0 ? '(' + '$' + fmt(Math.abs(bal)) + ')' : '$' + fmt(bal)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-600 mt-2">Negative balances shown in (parentheses) indicate fund shortfall — a special assessment would be required.</p>
      </DocSection>

      <PageBreak />

      <DocSection id="guide" title="Understanding Your Results" subtitle="What the numbers mean and what to do">
        <DocCallout type="key" title="Percent Funded Thresholds">
          <Bold>0–30% funded (Critical):</Bold> High risk of special assessment or loan required for any major project. Immediate contribution increases required.
          <br /><Bold>30–70% funded (Fair):</Bold> Association is managing but has vulnerability. Gradual increase plan needed.
          <br /><Bold>70%+ funded (Good):</Bold> Fannie Mae/FHA preferred threshold for condo financing eligibility. Most lenders will approve individual condo mortgages.
          <br /><Bold>100% funded (Excellent):</Bold> Full financial strength. Special assessment risk is minimal.
        </DocCallout>

        <DocCallout type="info" title="What to Do if Underfunded">
          If your fund is below 70%: (1) Increase contributions immediately — present the data to owners clearly; (2) Prioritize the most critical safety and habitability components; (3) Get a professional reserve study to validate your numbers; (4) Consider a phased increase plan to reach 100% funded within 10 years.
        </DocCallout>

        <DocCallout type="law" title="NH Law and Reserve Requirements">
          New Hampshire does not currently mandate reserve studies for all associations. However, NH RSA 356-B (Condominium Act) requires associations to "maintain adequate reserves." Lenders applying Fannie Mae guidelines require associations to budget at least 10% of annual assessments for reserves. Failure to maintain adequate reserves can make units ineligible for conventional financing.
        </DocCallout>
      </DocSection>
    </div>
  );
}
