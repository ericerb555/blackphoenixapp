import { useState } from 'react';
import { DocSection, DocCallout, CalcInput, CalcResult, DocStats, DocLink, P, Bold, PageBreak } from './DocComponents';

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function EVChargingCalculator() {
  const [numPorts, setNumPorts] = useState(4);
  const [costPerPort, setCostPerPort] = useState(3500);
  const [electricalUpgrade, setElectricalUpgrade] = useState(8000);
  const [conduit, setConduit] = useState(4000);

  const [sessionsPerDay, setSessionsPerDay] = useState(2);
  const [pricePerKwh, setPricePerKwh] = useState(0.35);
  const [kwhPerSession, setKwhPerSession] = useState(7.5);

  const [electricityCostPerKwh, setElectricityCostPerKwh] = useState(0.18);

  // Cost calculations
  const grossInstallCost = (numPorts * costPerPort) + electricalUpgrade + conduit;
  const eversourceRebate = Math.min(numPorts * 500, 20000); // $500/port up to 20k
  const federalTaxCredit = Math.min(grossInstallCost * 0.30, 30000); // 30% up to $30k
  const netCost = Math.max(0, grossInstallCost - eversourceRebate - federalTaxCredit);

  // Revenue calculations
  const monthlyRevenue = numPorts * sessionsPerDay * 30 * pricePerKwh * kwhPerSession;
  const annualRevenue = monthlyRevenue * 12;

  const monthlyElectricityCost = numPorts * sessionsPerDay * 30 * electricityCostPerKwh * kwhPerSession;
  const annualElectricityCost = monthlyElectricityCost * 12;
  const annualNetRevenue = annualRevenue - annualElectricityCost;

  const paybackYears = annualNetRevenue > 0 ? netCost / annualNetRevenue : Infinity;
  const tenYearNetRevenue = (annualNetRevenue * 10) - netCost;
  const roi = netCost > 0 ? ((annualNetRevenue * 10 - netCost) / netCost) * 100 : 0;

  return (
    <div>
      <DocSection id="install" title="Installation Costs" subtitle="Enter your EV charging installation details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CalcInput label="Number of Level 2 Ports" value={numPorts} onChange={setNumPorts} min={1} max={50} step={1} hint="Level 2 = 240V, 7.2–19.2 kW per port" />
            <CalcInput label="Cost Per Port (hardware + install)" value={costPerPort} onChange={setCostPerPort} prefix="$" step={250} hint="Typical range $2,500–5,000 per port installed" />
          </div>
          <div>
            <CalcInput label="Electrical Upgrade Cost" value={electricalUpgrade} onChange={setElectricalUpgrade} prefix="$" step={500} hint="Panel upgrade, wiring to location" />
            <CalcInput label="Conduit & Trenching Cost" value={conduit} onChange={setConduit} prefix="$" step={500} hint="Varies significantly by site conditions" />
          </div>
        </div>

        <DocStats stats={[
          { label: "Gross Install Cost", value: '$' + fmt(grossInstallCost) },
          { label: "Eversource Rebate", value: '$' + fmt(eversourceRebate), color: "text-green-400" },
          { label: "Federal 30% Tax Credit", value: '$' + fmt(federalTaxCredit), color: "text-green-400" },
          { label: "Net Cost After Incentives", value: '$' + fmt(netCost), color: "text-orange-400" },
        ]} />
      </DocSection>

      <DocSection id="rebates" title="NH Rebates & Federal Tax Credits" subtitle="Available financial incentives for EV charging installation">
        <DocCallout type="key" title="Eversource NH EV Charger Rebate">
          Eversource offers <Bold>$500 per Level 2 port</Bold> for qualifying commercial and multi-family installations. Your estimated rebate: <Bold>${fmt(eversourceRebate)}</Bold> for {numPorts} ports.
          Maximum rebate capped at $20,000 per project. Installation must use a pre-approved contractor and charger model.
        </DocCallout>

        <DocCallout type="info" title="Federal Tax Credit — Section 30C">
          The Alternative Fuel Vehicle Refueling Property Credit provides <Bold>30% of qualified installation costs, up to $30,000</Bold> for commercial properties. Your estimated credit: <Bold>${fmt(federalTaxCredit)}</Bold>. Consult your tax advisor — credit can be claimed in the year installation is placed in service.
        </DocCallout>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 my-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Incentive Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Gross Installation Cost</span><span className="text-white">${fmt(grossInstallCost)}</span></div>
            <div className="flex justify-between text-green-400"><span>Eversource NH Rebate ({numPorts} ports × $500)</span><span>− ${fmt(eversourceRebate)}</span></div>
            <div className="flex justify-between text-green-400"><span>Federal 30% Tax Credit</span><span>− ${fmt(federalTaxCredit)}</span></div>
            <div className="border-t border-[#2A2A2A] pt-2 flex justify-between font-bold"><span className="text-white">Net Cost to You</span><span className="text-orange-400">${fmt(netCost)}</span></div>
          </div>
        </div>

        <DocLink href="https://www.eversource.com/content/nh/residential/save-money-energy/learn-about-our-programs/electric-vehicles">Eversource NH EV Charger Rebate Program</DocLink>
      </DocSection>

      <PageBreak />

      <DocSection id="revenue" title="Revenue Projections" subtitle="Driver revenue based on usage patterns">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CalcInput label="Sessions Per Port Per Day" value={sessionsPerDay} onChange={setSessionsPerDay} min={0.5} max={10} step={0.5} hint="Multi-family: 1-2 typical; public: 3-5 typical" />
            <CalcInput label="Price Charged to Driver (per kWh)" value={pricePerKwh} onChange={setPricePerKwh} prefix="$" step={0.01} min={0.10} max={1.00} hint="$0.25-0.45/kWh is typical" />
          </div>
          <div>
            <CalcInput label="Average kWh Per Session" value={kwhPerSession} onChange={setKwhPerSession} suffix="kWh" step={0.5} min={2} max={30} hint="Typical Level 2 session: 6-10 kWh" />
            <CalcInput label="Your Electricity Cost (per kWh)" value={electricityCostPerKwh} onChange={setElectricityCostPerKwh} prefix="$" step={0.01} min={0.05} max={0.50} hint="Check your Eversource bill — avg NH commercial ~$0.18" />
          </div>
        </div>
      </DocSection>

      <DocSection id="results" title="ROI Results" subtitle="Full return on investment analysis">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <CalcResult label="Total Net Cost" value={'$' + fmt(netCost)} sub="After all rebates and tax credits" />
          <CalcResult label="Monthly Gross Revenue" value={'$' + fmt(monthlyRevenue)} sub="From driver charging fees" />
          <CalcResult label="Annual Gross Revenue" value={'$' + fmt(annualRevenue)} sub="Before electricity cost" />
          <CalcResult label="Annual Electricity Cost" value={'$' + fmt(annualElectricityCost)} sub="Your cost to supply the power" />
          <CalcResult label="Annual Net Revenue" value={'$' + fmt(annualNetRevenue)} sub="Revenue minus electricity cost" highlight={annualNetRevenue > 0} />
          <CalcResult label="Simple Payback Period" value={paybackYears === Infinity ? 'N/A' : fmt(paybackYears, 1) + ' years'} sub="Net cost ÷ annual net revenue" highlight />
          <CalcResult label="10-Year Net Revenue" value={'$' + fmt(tenYearNetRevenue)} sub="After recovering installation cost" />
          <CalcResult label="10-Year ROI" value={fmt(roi, 1) + '%'} sub="Return on net investment" />
        </div>

        {annualNetRevenue <= 0 && (
          <DocCallout type="warning" title="Low Revenue Projection">
            With current inputs, the charging stations may not cover electricity costs. Consider increasing the price per kWh to drivers, or review actual usage projections for your property type. Many property owners install EV chargers primarily as an amenity to attract and retain residents rather than as a profit center.
          </DocCallout>
        )}

        <DocCallout type="tip" title="Multi-Family EV Charging Strategy">
          For residential properties, consider offering Level 2 charging as a paid amenity ($50-80/month unlimited or per-session pricing). This is increasingly a competitive advantage in NH as EV adoption accelerates. Properties with EV charging report 15-20% lower vacancy rates among EV-owning tenants.
        </DocCallout>
      </DocSection>
    </div>
  );
}
