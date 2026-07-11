import { useState } from 'react';
import { DocSection, DocSubSection, DocCallout, CalcInput, CalcResult, DocStats, DocSteps, P, Bold, PageBreak } from './DocComponents';

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface AncillaryItem {
  label: string;
  minRevPerUnit: number;
  maxRevPerUnit: number;
  selected: boolean;
}

const DEFAULT_ANCILLARY: AncillaryItem[] = [
  { label: "Storage Unit Rentals", minRevPerUnit: 50, maxRevPerUnit: 100, selected: false },
  { label: "Coin/Card Laundry", minRevPerUnit: 30, maxRevPerUnit: 60, selected: false },
  { label: "Covered Parking / Garage", minRevPerUnit: 50, maxRevPerUnit: 150, selected: false },
  { label: "Pet Fees (monthly)", minRevPerUnit: 25, maxRevPerUnit: 50, selected: false },
  { label: "EV Charging Stations", minRevPerUnit: 40, maxRevPerUnit: 80, selected: false },
  { label: "Package Lockers", minRevPerUnit: 5, maxRevPerUnit: 10, selected: false },
  { label: "Renter's Insurance Referral Fee", minRevPerUnit: 5, maxRevPerUnit: 15, selected: false },
];

export default function RevenueOpportunityAnalysis() {
  const [totalUnits, setTotalUnits] = useState(24);
  const [currentAvgRent, setCurrentAvgRent] = useState(1650);
  const [marketAvgRent, setMarketAvgRent] = useState(1800);
  const [occupancyPct, setOccupancyPct] = useState(92);
  const [annualOpEx, setAnnualOpEx] = useState(180000);

  const [ancillary, setAncillary] = useState<AncillaryItem[]>(DEFAULT_ANCILLARY);
  const [generated, setGenerated] = useState(false);

  const toggleAncillary = (i: number) => {
    setAncillary(prev => prev.map((item, idx) => idx === i ? { ...item, selected: !item.selected } : item));
  };

  // Pricing gap analysis
  const rentGap = marketAvgRent - currentAvgRent;
  const currentAnnualRevenue = currentAvgRent * totalUnits * (occupancyPct / 100) * 12;
  const marketAnnualRevenue = marketAvgRent * totalUnits * (occupancyPct / 100) * 12;
  const annualRevenueGap = marketAnnualRevenue - currentAnnualRevenue;
  const currentNOI = currentAnnualRevenue - annualOpEx;
  const currentNOIMargin = currentAnnualRevenue > 0 ? (currentNOI / currentAnnualRevenue) * 100 : 0;

  // Ancillary revenue
  const selectedAncillary = ancillary.filter(a => a.selected);
  const ancillaryMinMonthly = selectedAncillary.reduce((sum, a) => sum + a.minRevPerUnit * totalUnits, 0);
  const ancillaryMaxMonthly = selectedAncillary.reduce((sum, a) => sum + a.maxRevPerUnit * totalUnits, 0);
  const ancillaryAvgAnnual = ((ancillaryMinMonthly + ancillaryMaxMonthly) / 2) * 12;

  const totalOpportunity = annualRevenueGap + ancillaryAvgAnnual;

  const generateRoadmap = (): { title: string; body: string; badge?: string }[] => {
    const steps: { title: string; body: string; badge?: string }[] = [];

    if (rentGap > 50) {
      steps.push({
        title: "Q1: Rent Adjustment Strategy",
        body: "Current rents are $" + fmt(rentGap) + "/month below market. Begin increasing rents on unit renewals — a $" + fmt(Math.round(rentGap * 0.5)) + "/month increase on renewals is reasonable. For vacant units, price at market immediately.",
        badge: "High Impact"
      });
    }

    const easyAncillary = selectedAncillary.filter(a => a.minRevPerUnit <= 50);
    if (easyAncillary.length > 0) {
      steps.push({
        title: "Q1: Implement Low-Investment Revenue Streams",
        body: "Add " + easyAncillary.map(a => a.label).join(', ') + ". These require minimal capital and can be activated within 30 days. Estimated monthly revenue: $" + fmt(easyAncillary.reduce((s, a) => s + ((a.minRevPerUnit + a.maxRevPerUnit) / 2) * totalUnits, 0)),
        badge: "Quick Win"
      });
    }

    if (ancillary.find(a => a.label === "EV Charging Stations" && a.selected)) {
      steps.push({
        title: "Q2: EV Charging Installation",
        body: "Apply for Eversource NH rebates ($500/port) before installation. Get 3 bids from NH-licensed electrical contractors. Target 4-6 ports for a property of " + totalUnits + " units. Use the EV Charging Calculator to model exact ROI.",
        badge: "Planning"
      });
    }

    if (occupancyPct < 95) {
      steps.push({
        title: "Q2–Q3: Occupancy Optimization",
        body: "Current occupancy of " + occupancyPct + "% has room to improve. Review marketing channels, unit condition, and pricing. Each 1% improvement in occupancy = $" + fmt(currentAvgRent * totalUnits * 12 / 100, 0) + " additional annual revenue.",
        badge: "Revenue"
      });
    }

    steps.push({
      title: "Q4: Annual Performance Review",
      body: "Review all revenue streams at year end. Compare actual vs. projected ancillary revenue. Set rent targets for next year based on updated market data. Total annual revenue opportunity from all initiatives: $" + fmt(totalOpportunity),
    });

    return steps.slice(0, 4);
  };

  return (
    <div>
      <DocSection id="portfolio" title="Portfolio Overview" subtitle="Enter your portfolio financial data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CalcInput label="Total Units" value={totalUnits} onChange={setTotalUnits} min={1} max={500} step={1} />
            <CalcInput label="Current Average Rent" value={currentAvgRent} onChange={setCurrentAvgRent} prefix="$" step={25} hint="Your current average monthly rent per unit" />
            <CalcInput label="Market Average Rent" value={marketAvgRent} onChange={setMarketAvgRent} prefix="$" step={25} hint="Comparable market rent for similar units" />
          </div>
          <div>
            <CalcInput label="Current Occupancy Rate" value={occupancyPct} onChange={setOccupancyPct} suffix="%" min={0} max={100} step={1} />
            <CalcInput label="Annual Operating Expenses" value={annualOpEx} onChange={setAnnualOpEx} prefix="$" step={5000} hint="Total OpEx excluding debt service" />
          </div>
        </div>

        <DocStats stats={[
          { label: "Current Annual Revenue", value: '$' + fmt(currentAnnualRevenue) },
          { label: "Current NOI", value: '$' + fmt(currentNOI) },
          { label: "NOI Margin", value: fmt(currentNOIMargin, 1) + '%', color: currentNOIMargin >= 40 ? 'text-green-400' : 'text-yellow-400' },
          { label: "Units", value: totalUnits.toString() },
        ]} />
      </DocSection>

      <DocSection id="pricing-gaps" title="Pricing Gap Analysis" subtitle="Revenue left on the table vs. market">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <CalcResult label="Rent Gap vs. Market" value={'$' + fmt(rentGap) + '/unit/mo'} sub={rentGap > 0 ? "Below market — opportunity" : "At or above market"} highlight={rentGap > 0} />
          <CalcResult label="Annual Revenue Gap" value={'$' + fmt(annualRevenueGap)} sub="If all units were at market rate" highlight={annualRevenueGap > 0} />
        </div>

        {rentGap > 100 ? (
          <DocCallout type="warning" title="Significant Pricing Gap Identified">
            Your rents are <Bold>${fmt(rentGap)}/month below market</Bold> per unit. On {totalUnits} units, this represents <Bold>${fmt(annualRevenueGap)} in annual revenue</Bold> being left on the table. A phased rent increase strategy on renewals can capture this without triggering excess vacancy.
          </DocCallout>
        ) : rentGap > 0 ? (
          <DocCallout type="info" title="Modest Pricing Opportunity">
            Rents are modestly below market. Capture gap gradually through normal renewal increases. Avoid large one-time increases which can spike vacancy.
          </DocCallout>
        ) : (
          <DocCallout type="tip" title="Rents at Market">
            Your current rents are at or above market average. Focus on ancillary revenue and occupancy optimization for revenue growth.
          </DocCallout>
        )}
      </DocSection>

      <PageBreak />

      <DocSection id="ancillary" title="Ancillary Revenue Opportunities" subtitle="Select applicable revenue streams for your property">
        <P>Select the ancillary revenue opportunities that apply to your property. Estimates are per-unit per month across your entire portfolio.</P>

        <div className="space-y-2 my-4">
          {ancillary.map((item, i) => (
            <button key={i} onClick={() => toggleAncillary(i)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${item.selected ? 'bg-green-500/10 border-green-500/30' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]'}`}>
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded border flex items-center justify-center ${item.selected ? 'bg-green-500 border-green-500' : 'border-[#444]'}`}>
                  {item.selected && <span className="text-white text-xs">✓</span>}
                </span>
                <span className={item.selected ? 'text-white' : 'text-gray-300'}>{item.label}</span>
              </div>
              <span className={`text-xs font-bold ${item.selected ? 'text-green-400' : 'text-gray-500'}`}>
                ${item.minRevPerUnit}–${item.maxRevPerUnit}/unit/mo
              </span>
            </button>
          ))}
        </div>

        {selectedAncillary.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <CalcResult label="Monthly Ancillary Revenue (min)" value={'$' + fmt(ancillaryMinMonthly)} sub="Conservative estimate" />
            <CalcResult label="Monthly Ancillary Revenue (max)" value={'$' + fmt(ancillaryMaxMonthly)} sub="Optimistic estimate" />
            <CalcResult label="Annual Ancillary Revenue (avg)" value={'$' + fmt(ancillaryAvgAnnual)} sub="Midpoint estimate" highlight />
          </div>
        )}
      </DocSection>

      <DocSection id="roadmap" title="12-Month Revenue Roadmap" subtitle="Quarterly action plan based on your selections">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-400 mb-1">Total Annual Revenue Opportunity</p>
          <p className="text-3xl font-black text-orange-400">${fmt(totalOpportunity)}</p>
          <p className="text-xs text-gray-500 mt-1">Rent gap capture + ancillary revenue (midpoint estimate)</p>
        </div>

        <button onClick={() => setGenerated(true)}
          className="mb-6 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-xl transition">
          Generate 12-Month Roadmap
        </button>

        {generated && <DocSteps steps={generateRoadmap()} />}
      </DocSection>
    </div>
  );
}
