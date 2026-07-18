import { DocSection, DocSubSection, DocCallout, DocSteps, DocLink, P, UL, Bold, PageBreak } from './DocComponents';

function Field({ label, width = "medium" }: { label: string; width?: "small" | "medium" | "large" | "full" }) {
  const widths = { small: "w-24", medium: "w-40", large: "w-64", full: "w-full" };
  return (
    <span className={`inline-block ${widths[width]} border-b-2 border-orange-500/40 bg-orange-500/5 px-1.5 py-0.5 text-orange-300 text-xs font-mono rounded-sm`}>
      {label}
    </span>
  );
}

function ContractHeader({ title }: { title: string }) {
  return (
    <div className="text-center mb-6 pb-4 border-b border-[#3A3A3A]">
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-xs text-gray-500 mt-1">State of New Hampshire</p>
    </div>
  );
}

export default function VendorContractPack() {
  return (
    <div>
      <DocSection id="intro" title="How to Use These Contract Templates" subtitle="Verify, require COI, and manage change orders">
        <DocCallout type="warning" title="Attorney Review Strongly Recommended">
          These contract templates are starting points only. For contracts over $5,000 or involving multiple properties, have an NH attorney review before execution. Laws change; your specific situation may require different terms.
        </DocCallout>

        <DocSteps steps={[
          { title: "Verify NH License", body: "Before signing any contract, verify the contractor holds a current NH license at nh.gov/safety. Take a screenshot of the verification as your record.", badge: "Always" },
          { title: "Require Certificate of Insurance", body: "Call the contractor's insurance agent directly to verify the COI is active and lists your property as 'Additional Insured.' A COI is worthless if the policy has lapsed." },
          { title: "Manage Change Orders in Writing", body: "Include change order language in every contract. Require written board or owner approval before any extra work proceeds. Verbal change order approvals always end in disputes." },
          { title: "Tie Payment to Milestones", body: "Never pay more than 10-15% upfront. Structure remaining payments to specific, verifiable milestones — not calendar dates." },
          { title: "Retain Until Punch List Complete", body: "Hold back 5-10% of total contract value until all punch list items are fully resolved and you are satisfied with the work." },
        ]} />

        <DocLink href="https://www.nh.gov/safety/divisions/fsem/contractor-licensing/">Verify NH Contractor License</DocLink>
      </DocSection>

      <PageBreak />

      <DocSection id="hvac" title="HVAC Maintenance Agreement" subtitle="Annual service contract template">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 font-serif text-sm leading-relaxed">
          <ContractHeader title="HVAC MAINTENANCE AGREEMENT" />

          <p className="text-gray-300 mb-3"><Bold>DATE:</Bold> <Field label="Agreement Date" /></p>
          <p className="text-gray-300 mb-3"><Bold>OWNER / PROPERTY MANAGER:</Bold> <Field label="Owner/Manager Name" width="large" /> ("Owner")</p>
          <p className="text-gray-300 mb-3"><Bold>HVAC CONTRACTOR:</Bold> <Field label="Company Name" width="large" />, NH License # <Field label="License Number" width="small" /> ("Contractor")</p>
          <p className="text-gray-300 mb-4"><Bold>PROPERTY ADDRESS:</Bold> <Field label="Property Address" width="full" /></p>

          <p className="text-gray-300 mb-3"><Bold>1. SCOPE OF SERVICES.</Bold> Contractor shall perform the following services during the Term:</p>
          <ul className="text-gray-400 text-sm space-y-1 mb-4 ml-4">
            <li>• Annual heating system tune-up each fall (September–November) including: clean heat exchanger, inspect burners, test safety controls, check flue</li>
            <li>• Annual cooling system start-up each spring (April–May) including: clean condenser coils, check refrigerant charge, test capacitors, clean condensate drain</li>
            <li>• Filter replacement 4 times per year using <Field label="filter size" width="small" /> MERV <Field label="rating" width="small" /> filters</li>
            <li>• Emergency service response within <Field label="24" width="small" /> hours for system failures</li>
            <li>• Written service report provided after each visit</li>
          </ul>

          <p className="text-gray-300 mb-3"><Bold>2. PARTS AND LABOR.</Bold> Labor for scheduled maintenance is included in the annual fee. Parts required during maintenance visits are billed at contractor cost plus <Field label="15" width="small" />%. Emergency service labor: <Field label="$___/hr" width="small" /> weekdays, <Field label="$___/hr" width="small" /> nights/weekends.</p>

          <p className="text-gray-300 mb-3"><Bold>3. ANNUAL FEE.</Bold> Owner shall pay <Field label="$___/year" width="small" /> in equal monthly installments of <Field label="$___/mo" width="small" />.</p>

          <p className="text-gray-300 mb-3"><Bold>4. TERM AND RENEWAL.</Bold> This Agreement commences <Field label="Start Date" /> and continues for one (1) year, auto-renewing annually unless either party provides 30 days written notice of cancellation before renewal date.</p>

          <p className="text-gray-300 mb-3"><Bold>5. INSURANCE.</Bold> Contractor shall maintain General Liability insurance of not less than $1,000,000 per occurrence and Workers' Compensation as required by NH law. Certificate of Insurance naming Owner as Additional Insured shall be provided before commencement of services.</p>

          <p className="text-gray-300 mb-4"><Bold>6. GOVERNING LAW.</Bold> This Agreement shall be governed by the laws of the State of New Hampshire.</p>

          <div className="grid grid-cols-2 gap-8 border-t border-[#3A3A3A] pt-4">
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Owner / Date</p></div>
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Contractor / Date</p></div>
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="landscaping" title="Landscaping & Snow Removal Contract" subtitle="Full-service grounds maintenance">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 font-serif text-sm leading-relaxed">
          <ContractHeader title="LANDSCAPING & SNOW REMOVAL AGREEMENT" />

          <p className="text-gray-300 mb-3"><Bold>PARTIES:</Bold> <Field label="Owner/Manager Name" width="large" /> ("Owner") and <Field label="Contractor Name" width="large" />, NH License # <Field label="License #" width="small" /> ("Contractor")</p>
          <p className="text-gray-300 mb-4"><Bold>PROPERTY:</Bold> <Field label="Property Address" width="full" /></p>

          <p className="text-gray-300 mb-2"><Bold>1. LANDSCAPING SERVICES (April–November)</Bold></p>
          <ul className="text-gray-400 text-sm space-y-1 mb-4 ml-4">
            <li>• Mowing: <Field label="weekly / bi-weekly" width="small" />, including edging and trimming</li>
            <li>• Spring cleanup: remove debris, dethatch, edge beds, mulch application <Field label="___ yards mulch" width="small" /></li>
            <li>• Fall cleanup: leaf removal, bed cleanup, winterization of plantings</li>
            <li>• Fertilization: <Field label="___ applications/year" width="small" /> per program</li>
            <li>• Additional services: <Field label="list any extras" width="large" /></li>
          </ul>

          <p className="text-gray-300 mb-2"><Bold>2. SNOW AND ICE MANAGEMENT (November–April)</Bold></p>
          <ul className="text-gray-400 text-sm space-y-1 mb-4 ml-4">
            <li>• Plowing trigger depth: <Field label="2" width="small" /> inches of accumulation</li>
            <li>• Scope: <Field label="list areas: parking lot, drives, walkways" width="full" /></li>
            <li>• Sanding/salting: included with each plow event</li>
            <li>• Sidewalks: <Field label="included / not included" width="small" /></li>
            <li>• Sidewalks to be cleared within <Field label="___" width="small" /> hours of storm end</li>
          </ul>

          <p className="text-gray-300 mb-3"><Bold>3. RATES.</Bold> Landscaping season: <Field label="$___/month" />. Snow removal: <Field label="Per push: $___ OR Seasonal: $___" width="large" />. Salt/sand materials billed at cost + <Field label="10" width="small" />%.</p>

          <p className="text-gray-300 mb-3"><Bold>4. WEATHER DELAYS.</Bold> Contractor is not responsible for delays due to weather conditions preventing safe equipment operation. Contractor shall resume services as soon as conditions allow.</p>

          <p className="text-gray-300 mb-3"><Bold>5. SALT DAMAGE DISCLAIMER.</Bold> Owner acknowledges that de-icing materials may cause damage to concrete, vegetation, and surfaces near treated areas. Contractor shall use materials in commercially reasonable quantities but is not liable for incidental damage caused by necessary ice control applications.</p>

          <p className="text-gray-300 mb-4"><Bold>6. GOVERNING LAW.</Bold> State of New Hampshire. Disputes in <Field label="county" width="small" /> County District Court.</p>

          <div className="grid grid-cols-2 gap-8 border-t border-[#3A3A3A] pt-4">
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Owner / Date</p></div>
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Contractor / Date</p></div>
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="cleaning" title="Cleaning Services Agreement" subtitle="Professional cleaning contract">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 font-serif text-sm leading-relaxed">
          <ContractHeader title="CLEANING SERVICES AGREEMENT" />

          <p className="text-gray-300 mb-3"><Bold>PARTIES:</Bold> <Field label="Owner/Manager" width="large" /> ("Client") and <Field label="Cleaning Company" width="large" /> ("Contractor")</p>
          <p className="text-gray-300 mb-4"><Bold>PROPERTY:</Bold> <Field label="Property Address" width="full" /></p>

          <p className="text-gray-300 mb-3"><Bold>1. FREQUENCY AND SCOPE.</Bold> Services shall be performed <Field label="weekly / bi-weekly / monthly" width="small" /> and include:</p>
          <ul className="text-gray-400 text-sm space-y-1 mb-4 ml-4">
            <li>• All common areas: vacuum, mop, dust all surfaces, clean glass</li>
            <li>• Common bathrooms: scrub toilet, sink, tub/shower, mop floor, restock supplies</li>
            <li>• Laundry room: wipe machines, sweep/mop floor</li>
            <li>• Lobby/entry: mop, wipe surfaces, clean glass</li>
            <li>• Additional scope: <Field label="list any additional areas" width="full" /></li>
          </ul>

          <p className="text-gray-300 mb-3"><Bold>2. SUPPLIES.</Bold> Cleaning supplies shall be provided by: <Field label="Contractor / Client" width="small" />. If by Contractor, supplies are included in service fee. Client shall provide: <Field label="e.g. paper products, trash bags" width="large" />.</p>

          <p className="text-gray-300 mb-3"><Bold>3. KEY ACCESS.</Bold> Client shall provide <Field label="key / key code / access card" width="small" /> to Contractor. Contractor shall maintain strict confidentiality of access codes and return all keys upon termination. Contractor is responsible for securing the property upon each visit.</p>

          <p className="text-gray-300 mb-3"><Bold>4. DAMAGE CLAIMS.</Bold> Contractor shall report any damage discovered during cleaning immediately to Client. Damage claims by Client must be made in writing within 48 hours of the cleaning visit in question. Contractor's liability for a single incident is limited to <Field label="$500" width="small" /> unless caused by gross negligence.</p>

          <p className="text-gray-300 mb-3"><Bold>5. CONFIDENTIALITY.</Bold> Contractor agrees not to disclose any information about Client's property, tenants, or business to third parties.</p>

          <p className="text-gray-300 mb-3"><Bold>6. RATE.</Bold> <Field label="$___" width="small" /> per visit, invoiced <Field label="monthly / per visit" width="small" />. Rate subject to annual adjustment with 30 days notice.</p>

          <p className="text-gray-300 mb-4"><Bold>7. GOVERNING LAW.</Bold> State of New Hampshire.</p>

          <div className="grid grid-cols-2 gap-8 border-t border-[#3A3A3A] pt-4">
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Client / Date</p></div>
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Contractor / Date</p></div>
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="handyman" title="General Handyman Contract" subtitle="For repairs, maintenance, and small projects">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 font-serif text-sm leading-relaxed">
          <ContractHeader title="GENERAL HANDYMAN SERVICES CONTRACT" />

          <p className="text-gray-300 mb-3"><Bold>DATE:</Bold> <Field label="Date" /> | <Bold>PROPERTY:</Bold> <Field label="Address" width="full" /></p>
          <p className="text-gray-300 mb-3"><Bold>CLIENT:</Bold> <Field label="Owner Name" width="large" /> | <Bold>CONTRACTOR:</Bold> <Field label="Contractor Name" width="large" /></p>

          <p className="text-gray-300 mb-3"><Bold>1. SCOPE OF WORK.</Bold> Contractor shall perform the following work: <Field label="Detailed description of all work to be performed" width="full" /></p>

          <p className="text-gray-300 mb-3"><Bold>2. COMPENSATION.</Bold> ☐ Hourly rate: <Field label="$___/hr" width="small" /> for labor. ☐ Fixed price: <Field label="$___" width="small" /> total for all work described above.</p>

          <p className="text-gray-300 mb-3"><Bold>3. MATERIALS.</Bold> Materials shall be supplied by: <Field label="Contractor / Client" />. If by Contractor, materials billed at cost plus <Field label="10-15" width="small" />% markup. Client shall approve any materials purchase exceeding <Field label="$___" width="small" /> before purchase.</p>

          <p className="text-gray-300 mb-3"><Bold>4. PERMITS.</Bold> Contractor is responsible for obtaining all permits required for this work under NH law. Permit fees are additional to contract price. Work shall not begin until required permits are in hand.</p>

          <p className="text-gray-300 mb-3"><Bold>5. WARRANTY.</Bold> Contractor warrants all labor for <Field label="1 year" width="small" /> from completion. Manufacturer warranties apply to materials. Warranty covers defects in workmanship; not damage from misuse or subsequent work by others.</p>

          <p className="text-gray-300 mb-3"><Bold>6. INSURANCE.</Bold> Contractor carries General Liability of <Field label="$___" width="small" /> and Workers' Comp. COI provided to Client before work begins.</p>

          <p className="text-gray-300 mb-3"><Bold>7. PAYMENT.</Bold> Deposit of <Field label="10-15%" width="small" /> due at signing. Balance due within <Field label="7" width="small" /> days of completion.</p>

          <p className="text-gray-300 mb-4"><Bold>8. GOVERNING LAW.</Bold> State of New Hampshire.</p>

          <div className="grid grid-cols-2 gap-8 border-t border-[#3A3A3A] pt-4">
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Client / Date</p></div>
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Contractor / Date</p></div>
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="mgmt" title="Property Management Agreement" subtitle="For licensed NH property managers">
        <DocCallout type="law" title="NH RSA 331-A — Real Estate Practice Act">
          Managing property for compensation in New Hampshire requires a real estate broker or property manager license under RSA 331-A. Confirm your property manager holds a current NH license before signing any management agreement.
        </DocCallout>

        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 font-serif text-sm leading-relaxed">
          <ContractHeader title="PROPERTY MANAGEMENT AGREEMENT" />

          <p className="text-gray-300 mb-3"><Bold>OWNER:</Bold> <Field label="Owner Name and Address" width="full" /></p>
          <p className="text-gray-300 mb-3"><Bold>MANAGER:</Bold> <Field label="Property Management Company" width="large" />, NH License # <Field label="PM License #" width="small" /></p>
          <p className="text-gray-300 mb-4"><Bold>MANAGED PROPERTY:</Bold> <Field label="Property Address(es)" width="full" /></p>

          <p className="text-gray-300 mb-3"><Bold>1. MANAGEMENT FEE.</Bold> Owner shall pay Manager <Field label="8-10" width="small" />% of gross monthly rents collected as a management fee. Leasing fee for new tenants: <Field label="one month's rent / 50%" width="small" />. Lease renewal fee: <Field label="$___ / none" width="small" />.</p>

          <p className="text-gray-300 mb-3"><Bold>2. SCOPE OF SERVICES.</Bold> Manager shall: (a) market and show vacant units; (b) screen and select tenants per Fair Housing laws; (c) execute leases on Owner's behalf; (d) collect rents and security deposits; (e) coordinate maintenance and repairs; (f) provide monthly financial statements; (g) disburse owner proceeds monthly.</p>

          <p className="text-gray-300 mb-3"><Bold>3. MAINTENANCE AUTHORIZATION.</Bold> Manager is authorized to approve and pay for repairs and maintenance up to <Field label="$500" width="small" /> per incident without prior Owner approval. Expenditures exceeding this limit require Owner written approval except in emergency situations threatening health/safety.</p>

          <p className="text-gray-300 mb-3"><Bold>4. RESERVE ACCOUNT.</Bold> Owner shall maintain a reserve account of <Field label="$___" width="small" /> with Manager for operating expenses. Manager shall replenish reserve from rents collected. Reserve will be returned to Owner upon termination after all outstanding expenses are settled.</p>

          <p className="text-gray-300 mb-3"><Bold>5. REPORTING.</Bold> Manager shall provide: (a) monthly income and expense statement by the <Field label="15th" width="small" /> of the following month; (b) annual 1099 for tax purposes; (c) access to owner portal showing transactions on demand.</p>

          <p className="text-gray-300 mb-3"><Bold>6. TERM AND TERMINATION.</Bold> This Agreement commences <Field label="Start Date" /> and continues for <Field label="1 year" width="small" />, auto-renewing annually. Either party may terminate upon <Field label="60" width="small" /> days written notice. Owner may terminate immediately for Manager's breach of fiduciary duty.</p>

          <p className="text-gray-300 mb-4"><Bold>7. NH RSA 331-A COMPLIANCE.</Bold> Manager represents that it holds a current NH real estate broker or property manager license as required by RSA 331-A and shall comply with all applicable NH licensing laws and NHAR ethical standards.</p>

          <div className="grid grid-cols-2 gap-8 border-t border-[#3A3A3A] pt-4">
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Owner / Date</p></div>
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Manager / License # / Date</p></div>
          </div>
        </div>

        <DocLink href="https://www.oplc.nh.gov/real-estate">NH Office of Professional Licensure — Real Estate Licensing</DocLink>
      </DocSection>
    </div>
  );
}
