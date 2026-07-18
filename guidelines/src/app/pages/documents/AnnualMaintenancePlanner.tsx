import { useState } from 'react';
import { DocSection, DocSubSection, DocCallout, DocChecklist, DocStats, DocTable, P, UL, Bold, DocLink } from './DocComponents';
import { CalcInput, CalcResult } from './DocComponents';

const MONTHS = [
  {
    id: 'jan-feb', label: 'January – February', emoji: '❄️', color: 'text-blue-400',
    tasks: [
      'Change furnace filter (monthly during heating season)',
      'Check heat tape on exposed pipes during extreme cold snaps',
      'Inspect attic for ice dam formation after heavy snow',
      'Keep walkways clear of ice and snow — apply ice melt proactively',
      'Test smoke and CO detectors',
      'Check sump pump pit — keep from freezing',
      'Review homeowner\'s insurance policy — ensure coverage is current',
      'Inspect basement for moisture or water infiltration during thaws',
    ],
    vendors: ['HVAC technician (emergency contact)', 'Snow removal service', 'Oil/gas delivery'],
  },
  {
    id: 'mar-apr', label: 'March – April', emoji: '🌱', color: 'text-green-400',
    tasks: [
      'Schedule HVAC spring tune-up (before AC season)',
      'Inspect roof after winter — look for missing or lifted shingles',
      'Clean gutters after snowmelt and before spring rains',
      'Test sump pump — peak season is spring rains',
      'Walk foundation perimeter — check for frost heave or new cracks',
      'Remove storm windows; clean and store; install window screens',
      'Service lawn equipment and irrigation system',
      'Flush water heater to remove sediment buildup',
      'Inspect deck/porch for winter damage — loose boards, rot at posts',
      'Check weatherstripping on all exterior doors — replace if compressed',
    ],
    vendors: ['HVAC technician', 'Roofer (if damage found)', 'Gutter cleaner'],
  },
  {
    id: 'may-jun', label: 'May – June', emoji: '🌿', color: 'text-teal-400',
    tasks: [
      'Switch HVAC to cooling mode; clean or replace filter',
      'Clean AC condenser coils and clear vegetation 2\' around unit',
      'Inspect and clean dryer vent duct — major fire hazard if clogged',
      'Check attic ventilation — soffit and ridge vents clear',
      'Apply deck stain/sealer if needed (every 2-3 years)',
      'Inspect exterior wood trim for peeling paint or rot',
      'Check grading around foundation — soil should slope away',
      'Test all GFCIs on exterior, kitchen, bathrooms',
      'Inspect driveway and walkways for winter crack damage',
    ],
    vendors: ['Deck refinisher', 'Exterior painter (if needed)', 'Driveway sealer'],
  },
  {
    id: 'jul-aug', label: 'July – August', emoji: '☀️', color: 'text-yellow-400',
    tasks: [
      'Clean refrigerator coils (pull out, vacuum underneath and back)',
      'Check window AC units — clean filters; inspect seals',
      'Inspect attic for heat damage and adequate ventilation',
      'Paint or caulk exterior surfaces while weather permits',
      'Schedule chimney inspection/cleaning before fall (book now — busy season)',
      'Check crawl space vapor barrier — repair or replace if damaged',
      'Inspect basement walls for any new moisture or efflorescence',
      'Review all vendor contracts before fall renewal deadlines',
    ],
    vendors: ['Chimney sweep (book early!)', 'Exterior painter', 'Pest control (preventive)'],
  },
  {
    id: 'sep-oct', label: 'September – October', emoji: '🍂', color: 'text-orange-400',
    tasks: [
      'Have heating system serviced BEFORE Oct 1 (avoid rush season)',
      'Order heating oil or set up budget plan before peak pricing',
      'Clean gutters after early leaf fall; again after full leaf drop',
      'Seal gaps around windows, doors, pipes, and penetrations',
      'Disconnect and drain outdoor hoses; shut off exterior hose bibs',
      'Drain and store irrigation system before first freeze',
      'Cover AC condenser for winter protection',
      'Stock emergency supplies: ice melt, snow shovel, batteries, blankets',
      'Trim tree branches over roof before storm season',
      'Check driveway and parking area drainage before freeze',
    ],
    vendors: ['Heating oil company (lock in price)', 'HVAC tech', 'Arborist (tree trimming)'],
  },
  {
    id: 'nov-dec', label: 'November – December', emoji: '🏠', color: 'text-violet-400',
    tasks: [
      'Install heat tape on vulnerable pipes (exterior walls, under sinks near exterior)',
      'Set minimum thermostat to 65°F even when away or vacant',
      'Check and clean humidifier if part of HVAC system',
      'Reverse ceiling fans to clockwise (pushes warm air down)',
      'Inspect fireplace damper — ensure it seals properly when closed',
      'Replace HVAC filter at start of heating season',
      'Test all smoke and CO detectors; replace batteries',
      'Review emergency contact list and ensure it\'s up to date',
      'Locate shut-off valves for all fixtures — know them in case of emergency',
    ],
    vendors: ['Snow removal service (sign contract now)', 'Emergency plumber (have on speed dial)'],
  },
];

function BudgetTracker() {
  const [items, setItems] = useState([
    { name: 'HVAC Service', budget: 300, actual: 0 },
    { name: 'Heating Fuel', budget: 2200, actual: 0 },
    { name: 'Roof / Gutters', budget: 500, actual: 0 },
    { name: 'Landscaping', budget: 1200, actual: 0 },
    { name: 'Plumbing', budget: 400, actual: 0 },
    { name: 'Electrical', budget: 200, actual: 0 },
    { name: 'Paint / Exterior', budget: 600, actual: 0 },
    { name: 'Appliances', budget: 300, actual: 0 },
    { name: 'Emergency Fund', budget: 1000, actual: 0 },
  ]);
  const totalBudget = items.reduce((s, i) => s + i.budget, 0);
  const totalActual = items.reduce((s, i) => s + i.actual, 0);
  return (
    <div className="my-6 bg-[#111] border border-[#2A2A2A] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
        <p className="font-bold text-white text-sm">Annual Maintenance Budget Tracker</p>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${totalActual > totalBudget ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>
          ${totalActual.toLocaleString()} / ${totalBudget.toLocaleString()}
        </span>
      </div>
      <div className="divide-y divide-[#1E1E1E]">
        {items.map((item, i) => (
          <div key={i} className="px-5 py-2.5 flex items-center gap-3">
            <span className="text-sm text-gray-300 w-36 flex-shrink-0">{item.name}</span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-orange-500/60 transition-all"
                  style={{ width: `${Math.min((item.actual / item.budget) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">${item.budget.toLocaleString()} budgeted</span>
              <input
                type="number" value={item.actual || ''}
                placeholder="$0 spent"
                onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, actual: parseFloat(e.target.value) || 0 } : it))}
                className="w-24 bg-[#0D0D0D] border border-[#2A2A2A] rounded px-2 py-1 text-xs text-white outline-none focus:border-orange-500/60"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-[#2A2A2A] flex justify-between">
        <span className="text-sm font-bold text-gray-400">Total</span>
        <span className="text-sm font-bold text-white">${totalActual.toLocaleString()} spent of ${totalBudget.toLocaleString()} budgeted</span>
      </div>
    </div>
  );
}

export default function AnnualMaintenancePlanner() {
  return (
    <div>
      <div className="mb-10 p-8 bg-gradient-to-br from-green-950/60 to-[#111] border border-green-500/20 rounded-2xl">
        <h1 className="text-4xl font-black text-white mb-2">Annual Maintenance Planner</h1>
        <p className="text-green-300 text-lg mb-4">12-month NH property maintenance calendar — interactive checklists + budget tracker</p>
        <DocStats stats={[
          { label: 'Months Covered', value: '12', color: 'text-green-400' },
          { label: 'Total Tasks', value: '60+', color: 'text-green-400' },
          { label: 'Budget Categories', value: '9', color: 'text-green-400' },
          { label: 'NH-Specific', value: '100%', color: 'text-green-400' },
        ]} />
      </div>

      <DocCallout type="tip" title="How to Use This Planner">
        Check off tasks as you complete them — your progress saves in your browser. Use the Budget Tracker at the bottom to record actual spend vs. your annual budget. Print the full planner each January as your year's maintenance guide.
      </DocCallout>

      {MONTHS.map(month => (
        <DocSection key={month.id} id={month.id} title={`${month.emoji} ${month.label}`} subtitle={`${month.tasks.length} maintenance tasks`}>
          <DocChecklist items={month.tasks} />
          <div className="mt-3 p-3 bg-[#111] border border-[#2A2A2A] rounded-lg">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Vendors to Contact This Period</p>
            <div className="flex flex-wrap gap-2">
              {month.vendors.map((v, i) => (
                <span key={i} className="px-2 py-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded text-xs text-gray-400">{v}</span>
              ))}
            </div>
          </div>
        </DocSection>
      ))}

      <DocSection id="budget" title="💰 Annual Budget Tracker" subtitle="Track actual spend against your maintenance budget">
        <P>Enter your actual spending throughout the year to track where your maintenance dollars go. Adjust budget amounts to match your property's needs.</P>
        <BudgetTracker />
        <DocCallout type="key" title="NH Maintenance Cost Benchmarks">
          For a typical NH single-family home (1,800-2,400 sq ft), expect $6,000-$10,000 per year in total maintenance including heating fuel, routine service, and small repairs. Older homes (pre-1980) and larger properties run higher. Budget 1-2% of home value annually.
        </DocCallout>
      </DocSection>
    </div>
  );
}
