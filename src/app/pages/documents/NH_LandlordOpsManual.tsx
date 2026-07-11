import { DocSection, DocSubSection, DocCallout, DocChecklist, DocTable, DocSteps, DocStats, DocLink, P, UL, OL, Bold, DocDivider, PageBreak, DocAccordion } from './DocComponents';

// ─── Illustrations ────────────────────────────────────────────────────────────

function EvictionFlowchart() {
  return (
    <div className="my-6 p-4 bg-[#111] border border-[#2A2A2A] rounded-xl">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">NH Eviction Process Flowchart</p>
      <svg viewBox="0 0 600 340" className="w-full max-w-2xl mx-auto">
        {/* Boxes */}
        {[
          { x: 220, y: 10, w: 160, h: 40, text: 'Lease Violation / Non-Payment', fill: '#1a1a1a', stroke: '#f97316' },
          { x: 220, y: 80, w: 160, h: 40, text: '7-Day Notice to Quit (RSA 540:3)', fill: '#1a1a1a', stroke: '#8b5cf6' },
          { x: 220, y: 150, w: 160, h: 40, text: 'File Eviction at Circuit Court', fill: '#1a1a1a', stroke: '#8b5cf6' },
          { x: 220, y: 220, w: 160, h: 40, text: 'Court Hearing (7-14 days)', fill: '#1a1a1a', stroke: '#8b5cf6' },
          { x: 70, y: 290, w: 140, h: 40, text: 'Judgment for Landlord', fill: '#14532d', stroke: '#22c55e' },
          { x: 390, y: 290, w: 140, h: 40, text: 'Judgment for Tenant', fill: '#7f1d1d', stroke: '#ef4444' },
        ].map((box, i) => (
          <g key={i}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={8} fill={box.fill} stroke={box.stroke} strokeWidth={1.5} />
            <text x={box.x + box.w / 2} y={box.y + box.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#e5e5e5" style={{ fontFamily: 'sans-serif' }}>
              {box.text.length > 25 ? box.text.substring(0, 25) + '…' : box.text}
            </text>
          </g>
        ))}
        {/* Arrows */}
        <line x1={300} y1={50} x2={300} y2={80} stroke="#4b5563" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
        <line x1={300} y1={120} x2={300} y2={150} stroke="#4b5563" strokeWidth={1.5} />
        <line x1={300} y1={190} x2={300} y2={220} stroke="#4b5563" strokeWidth={1.5} />
        <line x1={220} y1={260} x2={140} y2={290} stroke="#22c55e" strokeWidth={1.5} />
        <line x1={380} y1={260} x2={460} y2={290} stroke="#ef4444" strokeWidth={1.5} />
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
          </marker>
        </defs>
        {/* Labels */}
        <text x={150} y={275} textAnchor="middle" fontSize={9} fill="#22c55e" style={{ fontFamily: 'sans-serif' }}>Judge rules for you</text>
        <text x={450} y={275} textAnchor="middle" fontSize={9} fill="#ef4444" style={{ fontFamily: 'sans-serif' }}>Tenant wins</text>
      </svg>
    </div>
  );
}

function SecurityDepositTimeline() {
  return (
    <div className="my-6 p-4 bg-[#111] border border-[#2A2A2A] rounded-xl">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">Security Deposit Timeline (RSA 540-A:6)</p>
      <svg viewBox="0 0 580 80" className="w-full max-w-xl mx-auto">
        <line x1={40} y1={40} x2={540} y2={40} stroke="#374151" strokeWidth={2} />
        {[
          { x: 40, label: 'Move-Out', sub: 'Day 0', color: '#f97316' },
          { x: 180, label: 'Written Itemization', sub: 'Day 30 max', color: '#8b5cf6' },
          { x: 350, label: 'Return Balance', sub: 'Same as itemization', color: '#8b5cf6' },
          { x: 540, label: 'Penalty if Late', sub: '2× deposit', color: '#ef4444' },
        ].map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={40} r={6} fill={pt.color} />
            <text x={pt.x} y={20} textAnchor="middle" fontSize={9} fill="#e5e5e5" style={{ fontFamily: 'sans-serif' }}>{pt.label}</text>
            <text x={pt.x} y={62} textAnchor="middle" fontSize={9} fill="#6b7280" style={{ fontFamily: 'sans-serif' }}>{pt.sub}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

export default function NH_LandlordOpsManual() {
  return (
    <div>
      {/* Cover */}
      <div className="mb-10 p-8 bg-gradient-to-br from-teal-950/60 to-[#111] border border-teal-500/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-teal-500/20 border border-teal-500/30 rounded-full text-xs font-bold text-teal-300">BESTSELLER</span>
          <span className="text-xs text-gray-500">Black Phoenix Property Management</span>
        </div>
        <h1 className="text-4xl font-black text-white mb-2">NH Landlord Operations Manual</h1>
        <p className="text-teal-300 text-lg mb-4">The complete legal and operational guide for New Hampshire landlords</p>
        <DocStats stats={[
          { label: 'Pages', value: '85', color: 'text-teal-400' },
          { label: 'Sections', value: '10', color: 'text-teal-400' },
          { label: 'RSA Citations', value: '12', color: 'text-teal-400' },
          { label: 'Checklists', value: '8', color: 'text-teal-400' },
        ]} />
        <p className="text-xs text-gray-500 mt-2">Last updated July 2026 · NH law current as of RSA 540 (2025 amendments)</p>
      </div>

      {/* Section 1 */}
      <DocSection id="intro" title="Introduction" subtitle="How to use this manual">
        <P>This manual gives New Hampshire landlords — from first-timers to experienced portfolio owners — a practical, plain-English guide to every aspect of managing residential rental property under NH law. Every section references the applicable RSA chapter so you can verify the statute yourself.</P>
        <DocCallout type="info" title="How to Use This Guide">
          Use the table of contents on the left to jump to any section. Interactive checklists let you track completed tasks directly on screen. Use the Print / PDF button to save or print any page.
        </DocCallout>
        <DocCallout type="law" title="Primary Statutes Covered">
          <UL items={[
            <><Bold>RSA 540</Bold> — Landlord and Tenant (eviction, notice, termination)</>,
            <><Bold>RSA 540-A</Bold> — Prohibited Practices (landlord conduct, security deposits)</>,
            <><Bold>RSA 540-B</Bold> — Shared Facilities</>,
            <><Bold>RSA 48-A</Bold> — Minimum Housing Standards (habitability)</>,
            <><Bold>RSA 477</Bold> — Conveyances of Realty (lease recording requirements)</>,
          ]} />
        </DocCallout>
      </DocSection>

      <DocSection id="rsa540" title="NH Landlord Law Overview" subtitle="RSA 540 — What every NH landlord must know">
        <DocStats stats={[
          { label: 'Min. Notice to Terminate', value: '30 days', color: 'text-violet-400' },
          { label: 'Security Deposit Cap', value: '1 Month Rent', color: 'text-orange-400' },
          { label: 'Return Deadline', value: '30 Days', color: 'text-teal-400' },
          { label: 'Late Penalty', value: '2× Deposit', color: 'text-red-400' },
        ]} />

        <DocSubSection title="Types of Tenancy in NH">
          <DocTable
            headers={['Type', 'Notice Required', 'Key Rules']}
            rows={[
              ['Fixed-Term Lease', 'No notice needed at end of term', 'Expires by its terms unless renewed'],
              ['Month-to-Month', '30 days written notice by either party', 'RSA 540:11 — Either party may terminate'],
              ['Week-to-Week', '7 days written notice', 'Common for furnished rooms'],
              ['Tenancy at Will', '30 days written notice', 'No written lease; oral agreement'],
              ['Holdover Tenancy', '30 days written notice', 'Tenant stays past lease end; becomes MTM'],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Required Lease Disclosures">
          <P>NH law requires landlords to disclose certain information at lease signing. Missing these can void your ability to collect certain fees.</P>
          <UL items={[
            'Name and address of the property owner or authorized agent (RSA 540-A:3)',
            'Lead paint disclosure (federal requirement for pre-1978 housing)',
            'Radon test results if known (RSA 477:4-g)',
            'Bed bug history disclosure (RSA 48-A:14-a)',
            'Smoking policy (if applicable)',
            'Pet policy and pet deposit rules',
          ]} />
        </DocSubSection>

        <DocCallout type="warning" title="Common Mistake: Charging Too Much Security Deposit">
          NH law (RSA 540-A:6) caps the security deposit at one month's rent OR $100, whichever is greater. You may NOT charge first and last month's rent PLUS a security deposit — that exceeds the cap. Violations result in double damages plus attorney fees.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="screening" title="Tenant Screening Framework" subtitle="Legal, effective, and defensible">
        <P>Proper tenant screening protects your property and ensures you select qualified tenants — while staying compliant with the Fair Housing Act and NH anti-discrimination laws.</P>

        <DocCallout type="law" title="Protected Classes in NH">
          Federal Fair Housing Act: race, color, national origin, sex, familial status, disability, religion. NH also adds: age (over 18), marital status, sexual orientation, gender identity, and public assistance source of income.
        </DocCallout>

        <DocSubSection title="Legal Screening Criteria (Objective & Consistent)">
          <DocTable
            headers={['Criterion', 'Acceptable Standard', 'Documentation']}
            rows={[
              ['Income', 'Gross income ≥ 2.5–3× monthly rent', 'Pay stubs, tax returns, offer letter'],
              ['Credit Score', 'Minimum score (state in writing, e.g., 620+)', 'Credit report (obtain consent first)'],
              ['Rental History', 'No evictions in past 5 years', 'Landlord references (prior 2)'],
              ['Criminal History', 'Case-by-case; individualized assessment required', 'Background report'],
              ['Employment', 'Stable employment or verifiable income source', 'Employer contact or bank statements'],
            ]}
          />
          <DocCallout type="tip" title="Use a Written Screening Criteria Document">
            Create a one-page written screening criteria sheet and give it to every applicant at the time of application. This protects you legally by showing you applied criteria consistently.
          </DocCallout>
        </DocSubSection>

        <DocSubSection title="Screening Checklist">
          <DocChecklist category="For Every Applicant" items={[
            'Provide written rental criteria to applicant before they apply',
            'Collect written application with signature authorizing credit/background check',
            'Verify photo ID matches application name',
            'Run credit check (obtain written consent first)',
            'Run background check (obtain written consent first)',
            'Verify income with pay stubs (last 2) or bank statements (last 3 months)',
            'Contact prior landlord (at least 2 if possible)',
            'Verify employment with employer phone call',
            'Document your decision in writing (approve or deny with reason)',
            'Send adverse action notice if denied (FCRA requirement)',
          ]} />
        </DocSubSection>
      </DocSection>

      <DocSection id="lease" title="Lease Agreements" subtitle="Key clauses every NH lease must have">
        <DocSubSection title="Required Lease Clauses">
          <OL items={[
            <><Bold>Parties</Bold> — Full legal names of all adult tenants and the landlord/property manager</>,
            <><Bold>Property Description</Bold> — Full address including unit number</>,
            <><Bold>Lease Term</Bold> — Start date, end date, and what happens at end of term</>,
            <><Bold>Rent Amount & Due Date</Bold> — Monthly amount, due date, grace period if any</>,
            <><Bold>Late Fee</Bold> — Amount and when it applies (must be in lease to enforce)</>,
            <><Bold>Security Deposit</Bold> — Amount, conditions for return, and itemization process</>,
            <><Bold>Utilities</Bold> — Who pays which utilities</>,
            <><Bold>Pet Policy</Bold> — Allowed/not allowed, pet deposit (separate from security deposit)</>,
            <><Bold>Maintenance Responsibilities</Bold> — What tenant is responsible for vs. landlord</>,
            <><Bold>Entry Notice</Bold> — 24-hour advance notice requirement (RSA 540-A:3)</>,
          ]} />
        </DocSubSection>

        <DocSubSection title="Clauses That Are Void Under NH Law">
          <DocCallout type="warning" title="Unenforceable Lease Clauses">
            Including these clauses can expose you to liability even if the tenant signed:
            <UL items={[
              'Waiver of landlord liability for negligence',
              'Tenant agrees to move out with no notice',
              'Landlord may enter without notice',
              'Tenant waives right to habitability',
              'Late fees above a reasonable amount (NH courts scrutinize excessive fees)',
            ]} />
          </DocCallout>
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="deposits" title="Security Deposits" subtitle="RSA 540-A:6 — The rules that trip up most landlords">
        <SecurityDepositTimeline />

        <DocSubSection title="The Rules">
          <DocTable
            headers={['Rule', 'Requirement', 'Consequence of Violation']}
            rows={[
              ['Maximum Amount', '1 month rent or $100, whichever is greater', 'Landlord must return excess; liable for damages'],
              ['Separate Account', 'Must be held in separate account (not commingled)', 'Criminal penalty possible'],
              ['Interest', 'Must pay interest if held more than 12 months', 'Forfeiture of right to deduct'],
              ['Itemization Deadline', 'Written itemization within 30 days of move-out', '2× deposit returned to tenant'],
              ['Return Deadline', 'Return balance within 30 days', '2× deposit + attorney fees'],
              ['Move-In Inspection', 'Tenant may demand written inspection; landlord must provide', 'Cannot charge for pre-existing damage'],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Valid Deductions from Security Deposit">
          <UL items={[
            'Unpaid rent',
            'Damage beyond normal wear and tear (document with photos)',
            'Cleaning costs if unit left significantly dirtier than received',
            'Unpaid utilities if tenant was responsible',
            'Cost of replacing items tenant removed or destroyed',
          ]} />
          <DocCallout type="info" title="What is Normal Wear and Tear?">
            NH courts define normal wear and tear as deterioration that occurs from ordinary use: small nail holes, minor scuffs on walls, worn carpet in traffic areas, faded paint. You CANNOT deduct for these. You CAN deduct for large holes in walls, stains, burns, broken fixtures, or damage caused by pets or negligence.
          </DocCallout>
        </DocSubSection>

        <DocChecklist category="Security Deposit Checklist" items={[
          'Confirm deposit amount does not exceed 1 month rent (or $100)',
          'Deposit deposited in separate bank account within 3 business days',
          'Provide tenant with bank name and account number in writing',
          'Conduct move-in inspection with tenant; both parties sign',
          'Take dated photos of entire unit at move-in',
          'Upon move-out: conduct move-out inspection within 24 hours',
          'Take dated photos at move-out',
          'Compare move-in vs. move-out documentation',
          'Send written itemization within 30 days of move-out',
          'Return remaining balance with itemization (or full deposit if no deductions)',
        ]} />
      </DocSection>

      <DocSection id="habitability" title="Habitability Standards" subtitle="Your legal duty to maintain rental property">
        <DocCallout type="law" title="RSA 48-A and RSA 540-A:3 — Implied Warranty of Habitability">
          Every NH residential lease carries an implied warranty of habitability. The property must be safe, sanitary, and fit for human habitation — regardless of what the lease says. A lease clause disclaiming this warranty is void.
        </DocCallout>

        <DocSubSection title="Minimum Standards Required by NH Law">
          <DocTable
            headers={['System', 'Requirement']}
            rows={[
              ['Heating', 'Maintain 65°F minimum from September 15 to June 15'],
              ['Hot Water', 'Adequate supply of hot running water at all times'],
              ['Plumbing', 'All plumbing in good working order; no leaks'],
              ['Electrical', 'Safe wiring; no exposed conductors; working outlets in key areas'],
              ['Structural', 'Sound floors, walls, roof; no water infiltration'],
              ['Pest Control', 'Landlord responsible for initial infestation; prevention thereafter'],
              ['Smoke/CO Detectors', 'Functional detectors required; test at each tenancy start'],
              ['Ventilation', 'Adequate natural or mechanical ventilation in each room'],
              ['Garbage', 'Proper garbage receptacles and removal service'],
            ]}
          />
        </DocSubSection>

        <DocChecklist category="Monthly Property Condition Checklist" items={[
          'All heating systems functional (Sept 15 – June 15: 65°F minimum)',
          'Hot water heater operating; temperature set to 120°F',
          'No visible plumbing leaks under sinks or at fixtures',
          'All smoke detectors and CO detectors functional (test monthly)',
          'No evidence of pest infestation (rodents, cockroaches, bed bugs)',
          'All exterior entry doors lock securely',
          'Common area lighting functional',
          'No visible water staining on ceilings (indicates roof or plumbing leak)',
        ]} />
      </DocSection>

      <DocSection id="entry" title="Entry & Privacy Rights" subtitle="When and how you can enter a tenant's unit">
        <DocCallout type="law" title="RSA 540-A:3 — Entry Rights">
          You must provide at least 24 hours advance notice before entering a tenant's unit for non-emergency purposes. Entry without notice is a prohibited practice and can result in liability for damages and loss of your right to evict.
        </DocCallout>

        <DocTable
          headers={['Situation', 'Notice Required', 'Notes']}
          rows={[
            ['Non-emergency repairs', '24 hours minimum', 'Best practice: written/text notice'],
            ['Showing to prospective tenants/buyers', '24 hours minimum', 'Reasonable times only'],
            ['Annual inspection', '24 hours minimum', 'Schedule in lease if desired'],
            ['Emergency (fire, flood, gas leak)', 'No notice required', 'Limited to true emergencies'],
            ['Tenant abandonment', 'No notice required', 'Must have reasonable basis to believe unit is abandoned'],
          ]}
        />
        <P>Always document your entry attempts and actual entries in writing. A simple text message to the tenant with "I will be entering unit 2A on Thursday July 15 between 10am-12pm for HVAC service" is excellent documentation.</P>
      </DocSection>

      <PageBreak />

      <DocSection id="maintenance" title="Handling Maintenance Requests" subtitle="A system that protects you legally and keeps tenants happy">
        <DocSteps steps={[
          { title: 'Receive Request in Writing', body: 'Require maintenance requests in writing (email, text, or portal). Creates documentation. If reported verbally, immediately send a written summary back to tenant.' },
          { title: 'Acknowledge Within 24 Hours', body: 'Send a written acknowledgment confirming you received the request. This shows good faith and can be used in any legal dispute.' },
          { title: 'Assess Priority', body: 'Emergency (same day): no heat/hot water, flooding, gas leak, broken entry door. Urgent (3 days): appliance failure, significant pest issue. Routine (7-14 days): cosmetic issues, minor repairs.', badge: 'Critical Step' },
          { title: 'Schedule & Notify', body: 'Provide 24-hour entry notice. Confirm date and time window with tenant in writing.' },
          { title: 'Document Completion', body: 'After repair, send written confirmation to tenant: what was fixed, who did it, date completed. Keep copy of any vendor invoices.' },
        ]} />

        <DocCallout type="tip" title="Maintenance Request Log">
          Keep a simple spreadsheet or use property management software to track every request: date received, priority, vendor, date completed, cost. This protects you in disputes and helps plan capital spending.
        </DocCallout>
      </DocSection>

      <DocSection id="eviction" title="Eviction Process" subtitle="RSA 540 — Step by step with timelines">
        <EvictionFlowchart />

        <DocSubSection title="Grounds for Eviction Under RSA 540">
          <UL items={[
            <><Bold>Non-payment of rent</Bold> — most common; 7-day notice to quit required</>,
            <><Bold>Lease violation</Bold> — 30-day notice to cure or quit</>,
            <><Bold>End of tenancy</Bold> — 30-day notice (month-to-month)</>,
            <><Bold>Criminal activity</Bold> — can seek expedited hearing</>,
            <><Bold>Substantial damage to property</Bold> — expedited process available</>,
          ]} />
        </DocSubSection>

        <DocSteps steps={[
          {
            title: 'Issue Written Notice to Quit',
            body: 'Non-payment: 7-day notice. Lease violation: 30-day notice. End of tenancy: 30-day notice. Must be served personally or by certified mail AND regular mail.',
            badge: 'Required First Step',
          },
          {
            title: 'Wait for Notice Period to Expire',
            body: 'Do NOT accept any partial rent during the notice period — it can void the notice. If tenant cures the violation (pays in full, fixes the issue), you may not proceed.',
          },
          {
            title: 'File Eviction (Possessory Action) at NH Circuit Court',
            body: 'File in the Circuit Court — District Division for the county where the property is located. Filing fee: approximately $115-165. You can represent yourself as a landlord (no attorney required for evictions).',
          },
          {
            title: 'Serve Tenant with Summons',
            body: 'Court will issue a summons. Serve by sheriff or certified mail. Hearing date is typically 7-14 days after filing.',
          },
          {
            title: 'Attend Court Hearing',
            body: 'Bring: lease, proof of notice delivery, payment records, photos, any documentation of violation. Be factual and organized. Judges appreciate prepared landlords.',
          },
          {
            title: 'Obtain Writ of Possession if You Win',
            body: 'If you win, request a Writ of Possession. Tenant has 5 days to appeal. After 5 days, sheriff can physically remove tenant if they have not vacated.',
            badge: 'Final Step',
          },
        ]} />

        <DocCallout type="warning" title="Never Self-Help Evict">
          Changing locks, removing doors, shutting off utilities, or removing the tenant's belongings to force them out is ILLEGAL in NH (RSA 540-A:2). You can be liable for actual damages plus a civil penalty. Always use the court process.
        </DocCallout>

        <DocSubSection title="NH Circuit Court Filing Locations">
          <DocTable
            headers={['County', 'Court Location', 'Phone']}
            rows={[
              ['Hillsborough', '30 Spring St, Nashua / 300 Chestnut St, Manchester', '(603) 594-4400'],
              ['Rockingham', '10 Green St, Exeter', '(603) 772-3340'],
              ['Merrimack', '163 N Main St, Concord', '(603) 271-6400'],
              ['Strafford', '259 County Farm Rd, Dover', '(603) 742-7933'],
              ['Grafton', '3785 Dartmouth College Hwy, N Haverhill', '(603) 787-6961'],
              ['Carroll', '96 Water Village Rd, Ossipee', '(603) 539-4123'],
              ['Cheshire', '33 Winter St, Keene', '(603) 357-7704'],
              ['Sullivan', '22 Main St, Newport', '(603) 863-3450'],
              ['Belknap', '64 Court St, Laconia', '(603) 524-2074'],
              ['Coos', '55 School St, Lancaster', '(603) 788-4900'],
            ]}
          />
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="resources" title="NH Resources & Contacts" subtitle="Official sources and helpful links">
        <DocSubSection title="Legal Resources">
          <UL items={[
            <><DocLink href="https://www.gencourt.state.nh.us/rsa/html/lv/540/540-mrg.htm">RSA 540 Full Text — NH General Court</DocLink></>,
            <><DocLink href="https://www.gencourt.state.nh.us/rsa/html/lv/540-a/540-a-mrg.htm">RSA 540-A — Prohibited Practices</DocLink></>,
            <><DocLink href="https://www.nhcourts.gov/court-locations/circuit-court">NH Circuit Court Locations</DocLink></>,
            <><DocLink href="https://www.nhcourts.gov/forms-and-instructions">NH Court Forms & Instructions</DocLink></>,
            <><DocLink href="https://www.nhlegalaid.org">NH Legal Aid — Free Legal Help</DocLink></>,
          ]} />
        </DocSubSection>
        <DocSubSection title="Regulatory & Utility">
          <UL items={[
            <><DocLink href="https://www.eversource.com/nh">Eversource NH — Rebates & Programs</DocLink></>,
            <><DocLink href="https://www.libertyutilities.com/nh">Liberty Utilities NH</DocLink></>,
            <><DocLink href="https://www.nh.gov/safety/divisions/firesafety">NH Fire Safety — Smoke/CO Detector Requirements</DocLink></>,
            <><DocLink href="https://www.des.nh.gov/environment/radon">NH DES — Radon Information</DocLink></>,
          ]} />
        </DocSubSection>

        <DocCallout type="key" title="Key Takeaways">
          <OL items={[
            'Security deposit maximum: 1 month rent. Return with itemization within 30 days or owe 2× the deposit.',
            'Give 24-hour notice before entering a tenant\'s unit for any non-emergency.',
            'Never self-help evict. Always use NH Circuit Court.',
            'Maintain habitability including 65°F heat September 15 – June 15.',
            'Screen tenants consistently using written criteria you give to every applicant.',
          ]} />
        </DocCallout>
      </DocSection>
    </div>
  );
}
