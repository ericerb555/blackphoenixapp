import { DocSection, DocSubSection, DocCallout, DocTable, DocSteps, DocStats, DocLink, P, UL, Bold, PageBreak, DocDivider } from './DocComponents';

export default function CapitalPlanningGuide() {
  return (
    <div>
      <DocStats stats={[
        { label: "Pages", value: "45", sub: "Complete guide" },
        { label: "Components", value: "20", sub: "Tracked in inventory" },
        { label: "Key Stat", value: "70%", sub: "HOA lawsuits involve reserves", color: "text-red-400" },
        { label: "Funding Models", value: "2", sub: "Straight-line vs. % funded" },
      ]} />

      <DocSection id="intro" title="What is Capital Planning?" subtitle="The foundation of responsible property management">
        <P>Capital planning is the systematic process of identifying, scheduling, and funding the replacement or major repair of long-lived property components — roofs, parking lots, HVAC systems, elevators, and more. Unlike operating budgets that cover day-to-day expenses, capital budgets address items that typically cost more than $2,500 and have useful lives exceeding one year.</P>

        <DocCallout type="key" title="Why Capital Planning Matters">
          <Bold>70% of HOA-related lawsuits involve inadequate reserves.</Bold> When reserve funds are insufficient, associations face three unpleasant options: levy special assessments, take out loans, or defer maintenance — all of which damage property values and board credibility.
        </DocCallout>

        <DocSubSection title="Operating Budget vs. Capital Budget">
          <DocTable
            headers={["", "Operating Budget", "Capital Budget"]}
            rows={[
              ["What it covers", "Day-to-day expenses: utilities, landscaping, cleaning, management", "Major repairs/replacements: roofs, HVAC, parking, elevators"],
              ["Typical item cost", "Under $2,500", "Over $2,500"],
              ["Useful life", "Less than 1 year", "More than 1 year"],
              ["Funding mechanism", "Monthly assessments", "Reserve fund contributions"],
              ["Planning horizon", "1 year", "5–30 years"],
              ["Who oversees", "Property manager + board", "Board + reserve study professional"],
            ]}
          />
        </DocSubSection>

        <P>A well-funded capital plan provides predictability for residents, protects lender financing eligibility (Fannie Mae and FHA have reserve requirements for condo financing), and preserves property values across the community.</P>
      </DocSection>

      <PageBreak />

      <DocSection id="inventory" title="Component Inventory" subtitle="Building the foundation of your capital plan">
        <P>The component inventory is the complete list of all major physical assets that will eventually need replacement. Every capital plan starts here. The inventory drives all future calculations.</P>

        <DocSubSection title="How to Build Your Component Inventory">
          <DocSteps steps={[
            { title: "Walk the Entire Property", body: "Systematically inspect every major component: roofing, exterior, mechanical rooms, parking areas, amenities. Bring a clipboard and take photos of each component." },
            { title: "Record Key Data for Each Component", body: "For each item record: component name, description, quantity/area, year installed or estimated age, condition (good/fair/poor), estimated useful life, estimated remaining life." },
            { title: "Research Replacement Costs", body: "Get current cost estimates from local contractors, RSMeans cost data, or industry benchmarks. Update these costs every 3–5 years for inflation. In NH, add 10–15% above national averages." },
            { title: "Prioritize by Risk", body: "Identify items where failure would create safety risk, habitability issues, or regulatory violations. These get highest priority regardless of schedule." },
            { title: "Review with a Professional", body: "Have a licensed reserve study professional review your inventory before finalizing. They will identify items you missed and correct useful-life estimates." },
          ]} />
        </DocSubSection>

        <DocSubSection title="Common Components with Life Expectancy and Costs">
          <DocTable
            headers={["Component", "Typical Life (yrs)", "Rough $/SF or Unit", "Notes"]}
            rows={[
              ["Asphalt Shingle Roof", "20–30", "$4–8/SF", "Architectural shingles at high end"],
              ["Flat/EPDM Roof", "15–25", "$6–12/SF", "Membrane condition is key"],
              ["Parking Lot (asphalt)", "20–25", "$2–4/SF", "Seal coat every 3 yrs extends life"],
              ["Parking Lot (seal coat)", "3–5", "$0.25–0.50/SF", "Maintenance item, extends lot life"],
              ["Building Exterior Paint", "7–10", "$1.50–3/SF", "Wood vs. fiber cement varies"],
              ["HVAC — Split Systems", "12–18", "$3,000–6,000/unit", "Per residential unit"],
              ["HVAC — Rooftop Units", "15–20", "$8,000–20,000/unit", "Commercial grade"],
              ["Elevators (modernization)", "20–25", "$60,000–150,000/cab", "Cab interiors separate"],
              ["Pool Resurfacing", "10–15", "$8,000–20,000", "Per pool"],
              ["Pool Mechanical", "10–15", "$5,000–12,000", "Pumps, heater, filtration"],
              ["Windows (replacement)", "25–30", "$500–1,200/window", "Double pane, vinyl frame"],
              ["Entry Doors", "20–30", "$800–2,500/door", "Includes hardware"],
              ["Boiler/Heating Plant", "20–30", "$15,000–50,000", "Depends on building size"],
              ["Domestic Water Piping", "40–60", "$20–40/LF", "If replacement needed"],
              ["Fire Suppression System", "20–30", "$2–5/SF", "Major rehab, not routine test"],
              ["Clubhouse/Common Area", "15–20", "$15–30/SF", "Finishes and fixtures"],
              ["Fencing", "15–25", "$20–50/LF", "Wood vs. vinyl vs. chain link"],
              ["Retaining Walls", "20–40", "$30–80/LF", "Material and drainage dependent"],
              ["Playground Equipment", "15–20", "$15,000–50,000", "Per installation"],
              ["Signage", "10–15", "$2,000–10,000", "Monument and unit signs"],
            ]}
          />
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="reserve-study" title="Reserve Studies" subtitle="The professional foundation of your capital plan">
        <P>A reserve study is a professional analysis of your association's physical assets and financial health. It is the industry-standard tool for determining how much money you should be saving each year to fund future replacements.</P>

        <DocSubSection title="Three Levels of Reserve Studies">
          <DocTable
            headers={["Level", "What's Included", "When to Use", "Approx. Cost"]}
            rows={[
              ["Full (Level 1)", "Complete on-site inspection of all components, measurement, condition assessment, 30-year funding plan, financial analysis", "New associations or those without recent study", "$3,000–8,000"],
              ["Update with Site Visit (Level 2)", "Site visit to verify current conditions, update component inventory, revise funding plan based on new data", "Every 3–5 years for established associations", "$1,500–4,000"],
              ["Update without Site Visit (Level 3)", "Financial update only using existing inventory data provided by client; no site inspection", "Annual updates between full studies", "$500–1,500"],
            ]}
          />
        </DocSubSection>

        <DocCallout type="tip" title="Best Practice">
          Conduct a full reserve study every 3–5 years and a financial update annually. Some states require reserve studies by law. While NH does not currently mandate reserve studies for all associations, lenders and best practices make them essential.
        </DocCallout>

        <DocSubSection title="Choosing a Reserve Study Professional">
          <UL items={[
            "Look for RS (Reserve Specialist) or PRA (Professional Reserve Analyst) credentials from CAI",
            "Get references from NH-area associations of similar size",
            "Verify they carry E&O (errors and omissions) insurance",
            "Confirm they will provide a digital spreadsheet, not just a PDF",
            "Ask how they handle inflation assumptions in their projections",
          ]} />
        </DocSubSection>

        <DocLink href="https://www.caionline.org/Pages/FindaProfessional.aspx">Community Associations Institute — Find a Reserve Study Professional</DocLink>
      </DocSection>

      <PageBreak />

      <DocSection id="funding" title="Funding Models" subtitle="How to calculate the right annual reserve contribution">
        <P>There are two primary methods for calculating annual reserve contributions. Understanding both helps boards make informed decisions about their funding strategy.</P>

        <DocSubSection title="Straight-Line Funding">
          <P>The straight-line method calculates annual contribution by dividing the replacement cost of each component by its total useful life, then summing all components.</P>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 my-4 font-mono text-sm">
            <p className="text-gray-400 mb-2">Formula:</p>
            <p className="text-orange-300">Annual Contribution = Σ (Replacement Cost ÷ Useful Life) for all components</p>
            <p className="text-gray-500 mt-3 text-xs">Example: Roof costs $80,000, life 25 years = $3,200/year</p>
            <p className="text-gray-500 text-xs">HVAC costs $40,000, life 15 years = $2,667/year</p>
            <p className="text-gray-500 text-xs">Total from 2 components = $5,867/year needed</p>
          </div>
        </DocSubSection>

        <DocSubSection title="Percent-Funded Method">
          <P>The percent-funded method compares the association's actual reserve balance to the amount it theoretically should have saved (the "fully funded" amount) and calculates contributions needed to reach or maintain a target funding level.</P>
        </DocSubSection>

        <DocSubSection title="Model Comparison">
          <DocTable
            headers={["Factor", "Straight-Line", "Percent-Funded"]}
            rows={[
              ["Simplicity", "Easier to explain to owners", "More complex calculation"],
              ["Accuracy", "May not reflect current fund balance", "Accounts for existing reserves"],
              ["Stability", "Contributions may need to vary by year", "Smoother contribution growth"],
              ["Industry preference", "Common for smaller associations", "Preferred by reserve professionals"],
              ["When underfunded", "May require sudden increases", "Phases in increases gradually"],
              ["Software tools", "Excel is sufficient", "Reserve study software recommended"],
            ]}
          />
        </DocSubSection>

        <DocCallout type="key" title="Percent-Funded Benchmarks">
          <Bold>Under 30% funded: Critical</Bold> — High risk of special assessments, loan required for major projects.
          <br /><Bold>30–70% funded: Fair</Bold> — Association is managing but has vulnerability.
          <br /><Bold>70%+ funded: Good</Bold> — Lender-preferred threshold for condo financing eligibility.
          <br /><Bold>100% funded: Excellent</Bold> — Full financial strength, no special assessment risk.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="financing" title="Financing Options" subtitle="When reserves are not enough">
        <P>Even well-managed associations sometimes face a capital need that exceeds available reserves. Several financing options exist in New Hampshire.</P>

        <DocSubSection title="Financing Options Comparison">
          <DocTable
            headers={["Option", "Best For", "NH Source", "Considerations"]}
            rows={[
              ["Special Assessment", "One-time large project when timeline is short", "Board authority under association docs", "Owner hardship, possible payment plans, legal review required"],
              ["Bank Loan (Association)", "Multi-year phased projects", "Local NH banks and credit unions", "Requires supermajority vote in most docs; units as collateral"],
              ["NH CDFA Loan Program", "Nonprofits and some HOAs", "nhcdfa.org", "Lower rates, longer terms, income requirements"],
              ["Deferred Maintenance", "Never recommended", "—", "Compounds future costs; damages property values"],
              ["Phased Projects", "When cash flow is the constraint", "Internal planning decision", "Prioritize safety items; defer cosmetic work"],
            ]}
          />
        </DocSubSection>

        <DocCallout type="warning" title="The Cost of Deferred Maintenance">
          Deferring a $40,000 roof repair for 3 years typically results in $15,000–25,000 in additional interior water damage costs plus the original $40,000 replacement. Deferred maintenance never disappears — it always gets more expensive.
        </DocCallout>

        <DocLink href="https://www.nhcdfa.org/">NH Community Development Finance Authority (CDFA)</DocLink>
      </DocSection>

      <PageBreak />

      <DocSection id="execution" title="Project Execution" subtitle="Managing capital projects from bid to completion">
        <DocSteps steps={[
          { title: "Define Scope in Writing", body: "Before soliciting bids, prepare a detailed written scope of work. Vague scopes produce incomparable bids and change order disputes. Include specifications, materials, phasing, and site access requirements." },
          { title: "Solicit Minimum Three Bids", body: "Require written bids from at least three qualified contractors. All bidders must receive identical bid documents. Set a fixed bid deadline. Verify all bidders carry required NH licenses and insurance." },
          { title: "Evaluate Bids Fairly", body: "Compare bids line by line. The lowest price is not always the best choice. Evaluate contractor experience, references, financial stability, warranty terms, and proposed timeline alongside price." },
          { title: "Execute a Detailed Contract", body: "Use a written contract that includes: full scope of work, unit prices for extras, change order process, payment schedule tied to milestones (not calendar dates), warranty terms, insurance requirements, and dispute resolution." },
          { title: "Manage Change Orders Proactively", body: "Require written board approval for all change orders before work proceeds. Track cumulative change order percentage — anything over 10% of contract value suggests poor scope definition and warrants review." },
        ]} />

        <DocSubSection title="Contractor Oversight Best Practices">
          <UL items={[
            "Designate a single board member or property manager as primary contractor contact",
            "Conduct weekly site walk-throughs and document with photos",
            "Retain 5–10% of contract value until final punch list is complete",
            "Send weekly written progress summaries to the full board",
            "Keep all change orders in writing — verbal approvals are not enforceable",
            "Verify insurance certificates are current before first day of work",
          ]} />
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="communication" title="Owner Communication" subtitle="Presenting capital plans to boards and owners">
        <P>Capital planning communication is as important as the financial work itself. Owners who understand why they are being asked to pay more — and who trust the data behind the request — are far more likely to support reserve increases or special assessments.</P>

        <DocSubSection title="Best Practices for Capital Communication">
          <DocSteps steps={[
            { title: "Use Plain Language", body: "Avoid jargon. Instead of 'percent-funded reserve adequacy threshold,' say 'we have saved 55 cents for every dollar we will eventually need to spend.'" },
            { title: "Show Comparisons", body: "Compare the current underfunded scenario vs. the proposed funding level. Show owners what a special assessment would cost vs. a modest monthly increase now." },
            { title: "Provide Visual Charts", body: "A simple bar chart showing reserve balance vs. fully-funded target over 10 years is worth 1,000 words of explanation. Include in the annual report." },
            { title: "Conduct an Annual Reserve Update Presentation", body: "Dedicate 15 minutes at the annual meeting specifically to reserve status. Invite the reserve study professional to present directly to owners every 3 years." },
            { title: "Distribute Written Summary Before Meetings", body: "Provide a one-page reserve summary to all owners at least 10 days before any vote on assessments or contribution changes." },
          ]} />
        </DocSubSection>

        <DocSubSection title="Sample Language for Special Assessment Notice">
          <div className="bg-[#1A1A1A] border border-orange-500/20 rounded-xl p-5 my-4">
            <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3">Sample Notice Language</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              "Dear [Association] Owner: Our [2024] reserve study identified that our reserve fund is currently [X]% funded. To fund the planned [roof/parking lot/HVAC] replacement scheduled for [year], the Board has voted to levy a special assessment of $[amount] per unit, payable in [N] installments beginning [date]. This assessment was approved by [vote count] of the Board pursuant to Article [X] of our Declaration. Payment plans are available — please contact the management office by [date] to arrange installments. Questions? Please attend our owner information meeting on [date]."
            </p>
          </div>
        </DocSubSection>
      </DocSection>
    </div>
  );
}
