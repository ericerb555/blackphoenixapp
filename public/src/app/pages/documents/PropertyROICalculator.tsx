import { useState } from 'react';
import { DocSection, DocSubSection, DocCallout, CalcInput, CalcResult, DocStats, P, Bold, PageBreak } from './DocComponents';

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtDollar(n: number) { return '$' + fmt(n); }
function fmtPct(n: number) { return fmt(n, 2) + '%'; }

export default function PropertyROICalculator() {
  // Purchase
  const [purchasePrice, setPurchasePrice] = useState(350000);
  const [downPct, setDownPct] = useState(20);
  const [interestRate, setInterestRate] = useState(7.0);
  const [loanTerm, setLoanTerm] = useState(30);
  const [closingCosts, setClosingCosts] = useState(8000);

  // Income & Expenses
  const [monthlyRent, setMonthlyRent] = useState(2200);
  const [vacancyPct, setVacancyPct] = useState(5);
  const [monthlyTax, setMonthlyTax] = useState(400);
  const [monthlyInsurance, setMonthlyInsurance] = useState(120);
  const [monthlyHOA, setMonthlyHOA] = useState(0);
  const [repairsPct, setRepairsPct] = useState(5);
  const [capExPct, setCapExPct] = useState(5);
  const [mgmtPct, setMgmtPct] = useState(8);

  // Calculations
  const downPayment = purchasePrice * (downPct / 100);
  const loanAmount = purchasePrice - downPayment;
  const totalCashIn = downPayment + closingCosts;

  // Monthly mortgage payment (P&I)
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  const mortgage = monthlyRate === 0 ? loanAmount / numPayments
    : loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

  const effectiveRent = monthlyRent * (1 - vacancyPct / 100);
  const monthlyRepairs = monthlyRent * (repairsPct / 100);
  const monthlyCapEx = monthlyRent * (capExPct / 100);
  const monthlyMgmt = monthlyRent * (mgmtPct / 100);
  const totalMonthlyExpenses = monthlyTax + monthlyInsurance + monthlyHOA + monthlyRepairs + monthlyCapEx + monthlyMgmt;

  const monthlyNOI = effectiveRent - totalMonthlyExpenses;
  const annualNOI = monthlyNOI * 12;
  const capRate = (annualNOI / purchasePrice) * 100;
  const monthlyCashFlow = monthlyNOI - mortgage;
  const annualCashFlow = monthlyCashFlow * 12;
  const cashOnCash = (annualCashFlow / totalCashIn) * 100;
  const DSCR = monthlyNOI / mortgage;

  // 10-Year Projection
  const projectionRows = Array.from({ length: 10 }, (_, idx) => {
    const year = idx + 1;
    const propValue = purchasePrice * Math.pow(1.03, year);
    const rentGrowth = monthlyRent * Math.pow(1.02, year);
    const annualCF = (rentGrowth * (1 - vacancyPct / 100) - totalMonthlyExpenses - mortgage) * 12;
    // Remaining balance
    const remainBal = loanAmount * (Math.pow(1 + monthlyRate, numPayments) - Math.pow(1 + monthlyRate, year * 12)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const equity = propValue - remainBal;
    return { year, propValue, equity, remainBal, annualCF };
  });

  const cumulativeCF = projectionRows.reduce((acc, row, i) => {
    return [...acc, (acc[i - 1] || 0) + row.annualCF];
  }, [] as number[]);

  return (
    <div>
      <DocSection id="purchase" title="Purchase Details" subtitle="Enter your property acquisition information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CalcInput label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" step={5000} min={50000} />
            <CalcInput label="Down Payment %" value={downPct} onChange={setDownPct} suffix="%" min={0} max={100} step={1} />
            <CalcInput label="Loan Interest Rate" value={interestRate} onChange={setInterestRate} suffix="%" min={1} max={20} step={0.125} />
          </div>
          <div>
            <CalcInput label="Loan Term" value={loanTerm} onChange={setLoanTerm} suffix="years" min={10} max={30} step={5} />
            <CalcInput label="Closing Costs" value={closingCosts} onChange={setClosingCosts} prefix="$" step={500} />
          </div>
        </div>
        <DocStats stats={[
          { label: "Down Payment", value: fmtDollar(downPayment) },
          { label: "Loan Amount", value: fmtDollar(loanAmount) },
          { label: "Monthly Mortgage (P&I)", value: fmtDollar(mortgage) },
          { label: "Total Cash to Close", value: fmtDollar(totalCashIn), color: "text-orange-400" },
        ]} />
      </DocSection>

      <DocSection id="income" title="Income & Expenses" subtitle="Monthly recurring income and operating costs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CalcInput label="Monthly Gross Rent" value={monthlyRent} onChange={setMonthlyRent} prefix="$" step={50} />
            <CalcInput label="Vacancy Rate" value={vacancyPct} onChange={setVacancyPct} suffix="%" min={0} max={30} step={0.5} hint="5% is typical for NH residential" />
            <CalcInput label="Monthly Property Tax" value={monthlyTax} onChange={setMonthlyTax} prefix="$" step={25} />
            <CalcInput label="Monthly Insurance" value={monthlyInsurance} onChange={setMonthlyInsurance} prefix="$" step={10} />
          </div>
          <div>
            <CalcInput label="Monthly HOA (if any)" value={monthlyHOA} onChange={setMonthlyHOA} prefix="$" step={10} />
            <CalcInput label="Annual Repairs Budget" value={repairsPct} onChange={setRepairsPct} suffix="% of rent" min={0} max={20} step={0.5} hint="5% of gross rent is industry standard" />
            <CalcInput label="Annual CapEx Reserve" value={capExPct} onChange={setCapExPct} suffix="% of rent" min={0} max={20} step={0.5} hint="5% for long-term capital items" />
            <CalcInput label="Property Management Fee" value={mgmtPct} onChange={setMgmtPct} suffix="% of rent" min={0} max={15} step={1} hint="8-12% is typical in NH" />
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="results" title="Results Dashboard" subtitle="Real-time investment performance metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-4">
          <CalcResult label="Monthly NOI" value={fmtDollar(monthlyNOI)} sub="Net Operating Income (before mortgage)" />
          <CalcResult label="Annual NOI" value={fmtDollar(annualNOI)} sub="NOI × 12" />
          <CalcResult label="Cap Rate" value={fmtPct(capRate)} sub="Annual NOI ÷ Purchase Price" />
          <CalcResult label="Monthly Cash Flow" value={fmtDollar(monthlyCashFlow)} sub="NOI minus mortgage payment" highlight={monthlyCashFlow > 0} />
          <CalcResult label="Annual Cash Flow" value={fmtDollar(annualCashFlow)} sub="After all expenses and mortgage" highlight={annualCashFlow > 0} />
          <CalcResult label="Cash-on-Cash Return" value={fmtPct(cashOnCash)} sub="Annual cash flow ÷ total cash invested" highlight />
          <CalcResult label="DSCR" value={fmt(DSCR, 2) + 'x'} sub="Debt Service Coverage Ratio" />
          <CalcResult label="Total Cash Invested" value={fmtDollar(totalCashIn)} sub="Down payment + closing costs" />
          <CalcResult label="Effective Monthly Rent" value={fmtDollar(effectiveRent)} sub={"After " + vacancyPct + "% vacancy"} />
        </div>

        {monthlyCashFlow < 0 && (
          <DocCallout type="warning" title="Negative Cash Flow">
            This property has negative monthly cash flow of {fmtDollar(Math.abs(monthlyCashFlow))}. You will need to contribute this amount from other income each month. Consider renegotiating the purchase price, increasing rent, or increasing your down payment.
          </DocCallout>
        )}
      </DocSection>

      <PageBreak />

      <DocSection id="projection" title="10-Year Projection" subtitle="Assumes 3% annual appreciation, 2% annual rent growth">
        <div className="overflow-x-auto rounded-xl border border-[#2A2A2A]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1A1A1A]">
                {["Year", "Property Value", "Equity", "Loan Balance", "Annual Cash Flow", "Cumulative CF"].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left font-bold text-gray-400 border-b border-[#2A2A2A]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectionRows.map((row, i) => (
                <tr key={i} className={`border-b border-[#1E1E1E] ${i % 2 === 1 ? 'bg-[#0F0F0F]' : ''}`}>
                  <td className="px-3 py-2 font-bold text-orange-400">{row.year}</td>
                  <td className="px-3 py-2 text-gray-300">{fmtDollar(row.propValue)}</td>
                  <td className="px-3 py-2 text-green-400">{fmtDollar(row.equity)}</td>
                  <td className="px-3 py-2 text-gray-400">{fmtDollar(row.remainBal)}</td>
                  <td className={`px-3 py-2 ${row.annualCF >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtDollar(row.annualCF)}</td>
                  <td className={`px-3 py-2 ${cumulativeCF[i] >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtDollar(cumulativeCF[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="guide" title="How to Read Your Results" subtitle="NH residential investment benchmarks">
        <DocCallout type="key" title="Cap Rate — What's Good in NH">
          <Bold>Under 4%:</Bold> Weak return — only justified in prime appreciation markets.
          <br /><Bold>4–6%:</Bold> Average for NH residential — acceptable with strong appreciation potential.
          <br /><Bold>6–8%:</Bold> Good for NH residential — solid cash-flow property.
          <br /><Bold>8%+:</Bold> Excellent — typically multi-family or value-add opportunity.
        </DocCallout>

        <DocCallout type="tip" title="Cash-on-Cash Return Benchmarks">
          <Bold>Under 5%:</Bold> Weak — you can do better in index funds with less work.
          <br /><Bold>5–8%:</Bold> Acceptable — justifiable with appreciation and tax benefits.
          <br /><Bold>8–12%:</Bold> Good — solid leveraged real estate return.
          <br /><Bold>12%+:</Bold> Excellent — typically value-add, multi-family, or favorable financing.
        </DocCallout>

        <DocCallout type="info" title="DSCR — Lender Requirements">
          Debt Service Coverage Ratio (DSCR) = NOI ÷ Annual Debt Service.
          <br /><Bold>Below 1.0:</Bold> Property cash flow does not cover mortgage — most lenders will not lend.
          <br /><Bold>1.0–1.25:</Bold> Marginal — some DSCR loan programs available.
          <br /><Bold>1.25+:</Bold> Bankable — qualifies for most investment property loans.
          <br /><Bold>1.5+:</Bold> Strong — best loan terms available.
        </DocCallout>

        <DocCallout type="law" title="NH Property Tax Note">
          New Hampshire has no income tax or sales tax but has among the highest property tax rates in the US. Average effective rate is 1.8–2.2% of assessed value annually. Verify the current rate for your specific municipality at <Bold>nh.gov/revenue</Bold> before finalizing your analysis.
        </DocCallout>
      </DocSection>
    </div>
  );
}
