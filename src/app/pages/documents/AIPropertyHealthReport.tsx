import { useState } from 'react';
import { DocSection, DocSubSection, DocCallout, DocSteps, DocStats, P, UL, Bold, PageBreak } from './DocComponents';

type SystemRating = 'excellent' | 'good' | 'fair' | 'poor' | '';
type PropertyType = 'single-family' | 'multi-family' | 'condo' | 'commercial' | '';

const SYSTEM_NAMES = ['Roof', 'HVAC', 'Plumbing', 'Electrical', 'Foundation', 'Exterior'];

function ratingScore(r: SystemRating): number {
  return { excellent: 4, good: 3, fair: 2, poor: 1, '': 0 }[r];
}

export default function AIPropertyHealthReport() {
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [sqft, setSqft] = useState('');
  const [units, setUnits] = useState('1');
  const [lastRoof, setLastRoof] = useState('');
  const [lastHVAC, setLastHVAC] = useState('');
  const [currentIssues, setCurrentIssues] = useState('');
  const [ratings, setRatings] = useState<Record<string, SystemRating>>({});
  const [generated, setGenerated] = useState(false);

  const setRating = (system: string, rating: SystemRating) => {
    setRatings(prev => ({ ...prev, [system]: rating }));
  };

  // Generate report logic
  const year = parseInt(yearBuilt) || 0;
  const currentYear = 2026;
  const age = currentYear - year;

  const riskFlags: string[] = [];
  if (year > 0 && year < 1978) riskFlags.push("Lead Paint Risk: Property built before 1978 — lead paint testing required by federal law for renovation work (EPA RRP Rule). Disclose to all tenants and buyers.");
  if (year > 0 && year < 1980) riskFlags.push("Asbestos Risk: Properties built before 1980 may contain asbestos in insulation, floor tiles, or roofing. Have tested before any renovation.");

  const hvacYear = parseInt(lastHVAC) || 0;
  const hvacAge = hvacYear > 0 ? currentYear - hvacYear : 0;
  if (hvacAge > 2 || lastHVAC === '') riskFlags.push("HVAC Service Overdue: Last service was " + (hvacYear > 0 ? hvacAge + " year(s) ago" : "not recorded") + ". Annual service is required for efficiency and warranty compliance.");

  const roofYear = parseInt(lastRoof) || 0;
  const roofAge = roofYear > 0 ? currentYear - roofYear : 0;
  if (roofYear > 0 && roofAge > 20) riskFlags.push("Roof Age Alert: Roof is approximately " + roofAge + " years old — at or near end of typical 20-30 year lifespan. Budget for replacement.");
  if (roofYear > 0 && roofAge > 15 && roofAge <= 20) riskFlags.push("Roof Monitoring: Roof is " + roofAge + " years old. Begin monitoring closely and budget for replacement within 5-10 years.");

  if (ratings['Electrical'] === 'poor') riskFlags.push("Electrical System: Rated poor — immediate professional inspection required. Electrical issues are the leading cause of house fires in NH.");
  if (ratings['Foundation'] === 'poor' || ratings['Foundation'] === 'fair') riskFlags.push("Foundation Issues: Foundation rated " + ratings['Foundation'] + " — have a structural engineer inspect. NH freeze-thaw cycles accelerate foundation deterioration.");
  if (ratings['Plumbing'] === 'poor') riskFlags.push("Plumbing System: Rated poor — likely requires significant repairs. In properties built before 1970, galvanized steel pipes may be failing.");
  if (age > 50) riskFlags.push("Aged Property: At " + age + " years old, this property may have outdated systems throughout. A full home inspection is recommended.");

  const avgRating = Object.values(ratings).filter(r => r !== '').reduce((sum, r) => sum + ratingScore(r), 0) / (Object.values(ratings).filter(r => r !== '').length || 1);
  const healthScore = Math.round((avgRating / 4) * 100);

  const generateActionPlan = (): { title: string; body: string; badge?: string }[] => {
    const steps: { title: string; body: string; badge?: string }[] = [];
    if (ratings['Electrical'] === 'poor') steps.push({ title: "Electrical Inspection", body: "Schedule licensed NH electrician inspection immediately. Electrical failures are life safety issues.", badge: "Urgent" });
    if (ratings['Foundation'] === 'poor') steps.push({ title: "Structural Engineering Assessment", body: "Hire a licensed structural engineer to assess foundation. Do not defer — deterioration accelerates.", badge: "Urgent" });
    if (ratings['Roof'] === 'poor' || (roofYear > 0 && roofAge > 18)) steps.push({ title: "Roof Replacement Planning", body: "Get 3 bids from NH-licensed roofing contractors. Budget $8,000-20,000 depending on size.", badge: "High Priority" });
    if (hvacAge > 2 || lastHVAC === '') steps.push({ title: "Schedule HVAC Service", body: "Book annual furnace/boiler tune-up before heating season. September is ideal — contractors are less busy than October/November.", badge: "This Month" });
    if (ratings['Plumbing'] === 'fair' || ratings['Plumbing'] === 'poor') steps.push({ title: "Plumbing Assessment", body: "Have a licensed plumber inspect the system, especially if built before 1970. Scope the main drain line." });
    if (year < 1978) steps.push({ title: "Lead Paint Testing", body: "Order lead paint test kit or hire certified NH lead inspector. Required before any renovation. Disclose status to tenants." });
    if (steps.length < 3) steps.push({ title: "Preventive Maintenance Schedule", body: "Implement a monthly and annual maintenance checklist. See the Annual Maintenance Planner document in your bundle." });
    if (steps.length < 4) steps.push({ title: "Energy Efficiency Assessment", body: "Schedule a free energy audit through NHSaves.com. Identify rebate opportunities for insulation, heat pumps, and windows." });
    return steps.slice(0, 5);
  };

  const getCapitalRange = () => {
    const base = parseInt(sqft) || 1000;
    const ranges: [string, string][] = [];
    if (ratings['Roof'] === 'poor') ranges.push(["Roof Replacement", "$" + (base * 4).toLocaleString() + "–" + (base * 8).toLocaleString()]);
    if (ratings['HVAC'] === 'poor') ranges.push(["HVAC Replacement", "$8,000–15,000"]);
    if (ratings['Electrical'] === 'poor') ranges.push(["Electrical Upgrade", "$5,000–12,000"]);
    if (ratings['Foundation'] === 'fair' || ratings['Foundation'] === 'poor') ranges.push(["Foundation Repair", "$5,000–30,000"]);
    if (ratings['Plumbing'] === 'poor') ranges.push(["Plumbing Overhaul", "$8,000–25,000"]);
    if (ranges.length === 0) ranges.push(["Preventive Maintenance Reserve", "$" + (parseInt(sqft) || 1000).toLocaleString() + "/year"]);
    return ranges;
  };

  const canGenerate = address && propertyType && yearBuilt && Object.keys(ratings).length >= 4;

  return (
    <div>
      <DocSection id="property-info" title="Property Details" subtitle="Enter your property information to generate a health report">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Property Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St, Concord NH 03301"
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60 mb-4" />

            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Property Type</label>
            <select value={propertyType} onChange={e => setPropertyType(e.target.value as PropertyType)}
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60 mb-4">
              <option value="">Select type...</option>
              <option value="single-family">Single-Family Home</option>
              <option value="multi-family">Multi-Family (2-4 units)</option>
              <option value="condo">Condo / Townhouse</option>
              <option value="commercial">Commercial</option>
            </select>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Year Built</label>
                <input type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)}
                  placeholder="1985" min={1800} max={2025}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Square Footage</label>
                <input type="number" value={sqft} onChange={e => setSqft(e.target.value)}
                  placeholder="1800"
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60" />
              </div>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Number of Units</label>
                <input type="number" value={units} onChange={e => setUnits(e.target.value)}
                  placeholder="1" min={1}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Last Roof Inspection</label>
                <input type="number" value={lastRoof} onChange={e => setLastRoof(e.target.value)}
                  placeholder="2018" min={1970} max={2026}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Last HVAC Service</label>
                <input type="number" value={lastHVAC} onChange={e => setLastHVAC(e.target.value)}
                  placeholder="2024" min={1990} max={2026}
                  className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60" />
              </div>
            </div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Current Known Issues</label>
            <textarea value={currentIssues} onChange={e => setCurrentIssues(e.target.value)}
              placeholder="Describe any known issues, recent repairs, or concerns..."
              rows={4}
              className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-orange-500/60 resize-none" />
          </div>
        </div>
      </DocSection>

      <DocSection id="systems" title="Systems Assessment" subtitle="Rate each major system's current condition">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SYSTEM_NAMES.map(system => (
            <div key={system} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
              <p className="text-sm font-bold text-white mb-3">{system}</p>
              <div className="grid grid-cols-4 gap-1">
                {(['excellent', 'good', 'fair', 'poor'] as SystemRating[]).map(r => (
                  <button key={r} onClick={() => setRating(system, r)}
                    className={`px-2 py-1.5 text-xs font-bold rounded border capitalize transition-all ${ratings[system] === r
                      ? r === 'excellent' ? 'bg-green-500 border-green-500 text-white'
                        : r === 'good' ? 'bg-blue-500 border-blue-500 text-white'
                          : r === 'fair' ? 'bg-yellow-500 border-yellow-500 text-black'
                            : 'bg-red-500 border-red-500 text-white'
                      : 'bg-transparent border-[#3A3A3A] text-gray-500 hover:border-[#4A4A4A]'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { if (canGenerate) setGenerated(true); }}
          disabled={!canGenerate}
          className={`mt-6 px-6 py-3 font-bold text-sm rounded-xl transition-all ${canGenerate
            ? 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer'
            : 'bg-[#2A2A2A] text-gray-600 cursor-not-allowed'}`}
        >
          {canGenerate ? 'Generate AI Property Health Report' : 'Complete all fields to generate report'}
        </button>
      </DocSection>

      {generated && (
        <>
          <PageBreak />

          <div className="border border-orange-500/30 rounded-2xl p-6 bg-orange-500/5 my-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center">
                <span className="text-white font-black text-sm">AI</span>
              </div>
              <div>
                <p className="font-black text-white">Property Health Report</p>
                <p className="text-xs text-gray-400">{address} — Generated {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <DocSection id="risk" title="Risk Flags" subtitle="Auto-identified based on your property data">
              {riskFlags.length === 0 ? (
                <DocCallout type="tip" title="No Major Risk Flags Identified">
                  Based on the data provided, no immediate high-risk conditions were identified. Continue with your regular preventive maintenance schedule.
                </DocCallout>
              ) : (
                <div className="space-y-3">
                  {riskFlags.map((flag, i) => (
                    <DocCallout key={i} type={flag.includes('Lead') || flag.includes('Asbestos') ? 'law' : flag.includes('Urgent') || flag.includes('Electrical') ? 'warning' : 'info'}>
                      {flag}
                    </DocCallout>
                  ))}
                </div>
              )}
            </DocSection>

            <DocSection id="action-plan" title="90-Day Action Plan" subtitle="Priority actions based on your property assessment">
              <DocSteps steps={generateActionPlan()} />
            </DocSection>

            <DocSection id="capital" title="Capital Needs Estimate" subtitle="1–3 year capital requirements based on age and system ratings">
              <DocStats stats={[
                { label: "Property Health Score", value: healthScore + '/100', color: healthScore >= 75 ? 'text-green-400' : healthScore >= 50 ? 'text-yellow-400' : 'text-red-400' },
                { label: "Property Age", value: age + ' years', sub: yearBuilt ? 'Built ' + yearBuilt : '' },
                { label: "Risk Flags", value: riskFlags.length.toString(), color: riskFlags.length === 0 ? 'text-green-400' : 'text-red-400' },
                { label: "Systems Rated Good+", value: Object.values(ratings).filter(r => r === 'good' || r === 'excellent').length + '/' + SYSTEM_NAMES.length },
              ]} />

              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden mt-4">
                <div className="px-4 py-2.5 bg-[#111] border-b border-[#2A2A2A]">
                  <p className="text-xs font-bold text-gray-400 uppercase">Estimated Capital Items (1–3 Years)</p>
                </div>
                <div className="divide-y divide-[#1E1E1E]">
                  {getCapitalRange().map(([item, range], i) => (
                    <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                      <span className="text-gray-300">{item}</span>
                      <span className="text-orange-400 font-bold">{range}</span>
                    </div>
                  ))}
                </div>
              </div>

              <DocCallout type="info" title="Report Disclaimer">
                This report is generated based on data you provided and general industry knowledge. It is not a substitute for a licensed property inspection. Capital cost estimates are ranges based on typical NH market costs and may vary significantly based on specific conditions.
              </DocCallout>
            </DocSection>
          </div>
        </>
      )}
    </div>
  );
}
