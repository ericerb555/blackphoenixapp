import { useState } from 'react';
import { DocSection, DocSubSection, DocCallout, CalcInput, CalcResult, P, Bold, PageBreak } from './DocComponents';

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function RentalPricingOptimizer() {
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [sqft, setSqft] = useState(900);
  const [floor, setFloor] = useState(1);
  const [hasParking, setHasParking] = useState(false);
  const [hasLaundry, setHasLaundry] = useState(false);
  const [hasAC, setHasAC] = useState(false);
  const [isPetFriendly, setIsPetFriendly] = useState(false);
  const [isRenovated, setIsRenovated] = useState(false);

  const [comp1, setComp1] = useState(1800);
  const [comp2, setComp2] = useState(1850);
  const [comp3, setComp3] = useState(1900);

  // Seasonal: month 1-12, current month July = peak
  const currentMonth = new Date().getMonth() + 1;
  const isPeak = currentMonth >= 4 && currentMonth <= 8;
  const isSlow = currentMonth >= 1 && currentMonth <= 3;

  const avgComp = (comp1 + comp2 + comp3) / 3;

  // Adjustments
  const parkingAdj = hasParking ? 62 : 0;
  const laundryAdj = hasLaundry ? 87 : 0;
  const acAdj = hasAC ? 37 : 0;
  const petAdj = isPetFriendly ? 37 : 0;
  const renovatedAdj = isRenovated ? 125 : 0;
  const floorAdj = floor > 1 ? (floor - 1) * 25 : 0;

  const seasonalPct = isPeak ? 0.04 : isSlow ? -0.04 : 0;
  const baseBeforeSeasonal = avgComp + parkingAdj + laundryAdj + acAdj + petAdj + renovatedAdj + floorAdj;
  const seasonalAdj = Math.round(baseBeforeSeasonal * seasonalPct);
  const recommendedRent = Math.round(baseBeforeSeasonal + seasonalAdj);

  const monthlyAt95 = recommendedRent * 0.95;
  const annualRevenue = monthlyAt95 * 12;
  const onePercentRule = sqft > 0 ? (recommendedRent / (avgComp * 100)) : 0;
  const annualVacancyCost = recommendedRent * 12 * 0.05;

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg border text-sm transition-all ${value ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'}`}
    >
      <span>{label}</span>
      <span className={`text-xs font-bold ${value ? 'text-green-400' : 'text-gray-600'}`}>{value ? 'YES' : 'NO'}</span>
    </button>
  );

  return (
    <div>
      <DocSection id="unit" title="Unit Details" subtitle="Enter your unit characteristics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CalcInput label="Bedrooms" value={bedrooms} onChange={setBedrooms} min={0} max={6} step={1} />
            <CalcInput label="Bathrooms" value={bathrooms} onChange={setBathrooms} min={1} max={4} step={0.5} />
            <CalcInput label="Square Footage" value={sqft} onChange={setSqft} suffix="sq ft" step={50} />
            <CalcInput label="Unit Floor" value={floor} onChange={setFloor} min={1} max={20} step={1} hint="Upper floors typically command premium" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Unit Amenities</p>
            <Toggle label="Parking Included" value={hasParking} onChange={setHasParking} />
            <Toggle label="In-Unit Laundry (W/D)" value={hasLaundry} onChange={setHasLaundry} />
            <Toggle label="Central AC" value={hasAC} onChange={setHasAC} />
            <Toggle label="Pet Friendly" value={isPetFriendly} onChange={setIsPetFriendly} />
            <Toggle label="Recently Renovated (5 years)" value={isRenovated} onChange={setIsRenovated} />
          </div>
        </div>
      </DocSection>

      <DocSection id="market" title="Market Comparables" subtitle="Enter 3 comparable rents from similar properties nearby">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CalcInput label="Comparable 1 Monthly Rent" value={comp1} onChange={setComp1} prefix="$" step={25} />
          <CalcInput label="Comparable 2 Monthly Rent" value={comp2} onChange={setComp2} prefix="$" step={25} />
          <CalcInput label="Comparable 3 Monthly Rent" value={comp3} onChange={setComp3} prefix="$" step={25} />
        </div>
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mt-2">
          <p className="text-sm text-gray-400">Average Comparable Rent: <span className="text-white font-bold">${fmt(avgComp)}</span></p>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="adjustments" title="Adjustments" subtitle="How your unit differs from average comparables">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden my-4">
          <div className="px-4 py-2.5 bg-[#111] border-b border-[#2A2A2A]">
            <p className="text-xs font-bold text-gray-400 uppercase">Adjustment Detail</p>
          </div>
          <div className="divide-y divide-[#1E1E1E]">
            {[
              { label: "Average Comparable Rent (base)", value: avgComp, always: true },
              { label: "Parking Included (+$50–75)", value: parkingAdj, show: hasParking },
              { label: "In-Unit Laundry (+$75–100)", value: laundryAdj, show: hasLaundry },
              { label: "Central AC (+$25–50)", value: acAdj, show: hasAC },
              { label: "Pet Friendly (+$25–50)", value: petAdj, show: isPetFriendly },
              { label: "Recently Renovated (+$100–150)", value: renovatedAdj, show: isRenovated },
              { label: `Floor Premium (floor ${floor}, +$25/floor above 1)`, value: floorAdj, show: floorAdj > 0 },
              { label: `Seasonal Adjustment (${isPeak ? 'Peak Apr–Aug +4%' : isSlow ? 'Slow Jan–Mar -4%' : 'Neutral Sep–Dec'})`, value: seasonalAdj, show: true },
            ].filter(row => row.always || row.show).map((row, i) => (
              <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-400">{row.label}</span>
                <span className={`font-bold ${i === 0 ? 'text-white' : row.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {i === 0 ? '$' + fmt(row.value) : (row.value >= 0 ? '+' : '') + '$' + fmt(row.value)}
                </span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 bg-orange-500/5 border-t border-orange-500/20">
              <span className="font-bold text-white">Recommended Rent</span>
              <span className="font-black text-orange-400 text-lg">${fmt(recommendedRent)}/mo</span>
            </div>
          </div>
        </div>

        {isPeak && (
          <DocCallout type="tip" title="Peak Rental Season in NH">
            April through August is NH's peak rental season. Tenants are actively searching and moving. This is the best time to list vacancies and achieve above-market rents.
          </DocCallout>
        )}
        {isSlow && (
          <DocCallout type="info" title="Slow Season — NH January through March">
            January through March sees 30–40% lower rental search traffic in NH. Consider a -3 to -5% price adjustment to minimize vacancy, or time lease expirations to hit the spring market instead.
          </DocCallout>
        )}
      </DocSection>

      <DocSection id="recommendation" title="Optimal Rent Recommendation" subtitle="Your pricing recommendation and revenue projections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <CalcResult label="Recommended Monthly Rent" value={'$' + fmt(recommendedRent)} sub="Based on comps + adjustments" highlight />
          <CalcResult label="Monthly Revenue at 95% Occupancy" value={'$' + fmt(monthlyAt95)} sub="One month with 5% vacancy factor" />
          <CalcResult label="Annual Revenue at 95% Occupancy" value={'$' + fmt(annualRevenue)} sub="Projected annual rent income" />
          <CalcResult label="Annual Vacancy Cost at 5%" value={'$' + fmt(annualVacancyCost)} sub="Lost revenue from vacancy" />
          <CalcResult label="Comparable Rent Average" value={'$' + fmt(avgComp)} sub="Your market baseline" />
          <CalcResult label="Your Premium vs. Market" value={'$' + fmt(recommendedRent - avgComp) + '/mo'} sub={recommendedRent > avgComp ? "Above market — justify with amenities" : "At or below market"} />
        </div>

        <DocCallout type="key" title="The 1% Rule Check">
          The 1% rule: monthly rent should be at least 1% of purchase price for positive cash flow potential. If you purchased at ${fmt(recommendedRent * 100)}, your rent of ${fmt(recommendedRent)}/month meets the 1% threshold. This is a rough screener only — always do full cash flow analysis.
        </DocCallout>
      </DocSection>
    </div>
  );
}
