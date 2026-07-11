import { DocSection, DocSubSection, DocCallout, DocChecklist, DocTable, DocSteps, DocStats, DocLink, P, UL, OL, Bold, PageBreak, DocAccordion } from './DocComponents';

function BoardStructureDiagram() {
  return (
    <div className="my-6 p-4 bg-[#111] border border-[#2A2A2A] rounded-xl">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">NH Condo Association Structure</p>
      <svg viewBox="0 0 520 200" className="w-full max-w-xl mx-auto">
        {[
          { x: 180, y: 10, w: 160, h: 36, text: 'Unit Owners (Members)', fill: '#1e1b4b', stroke: '#8b5cf6' },
          { x: 180, y: 80, w: 160, h: 36, text: 'Board of Directors', fill: '#14532d', stroke: '#22c55e' },
          { x: 10, y: 155, w: 120, h: 36, text: 'President', fill: '#1a1a1a', stroke: '#6b7280' },
          { x: 145, y: 155, w: 120, h: 36, text: 'Treasurer', fill: '#1a1a1a', stroke: '#6b7280' },
          { x: 280, y: 155, w: 120, h: 36, text: 'Secretary', fill: '#1a1a1a', stroke: '#6b7280' },
          { x: 415, y: 155, w: 95, h: 36, text: 'At-Large', fill: '#1a1a1a', stroke: '#6b7280' },
        ].map((box, i) => (
          <g key={i}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={6} fill={box.fill} stroke={box.stroke} strokeWidth={1.5} />
            <text x={box.x + box.w / 2} y={box.y + box.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#e5e5e5" style={{ fontFamily: 'sans-serif' }}>{box.text}</text>
          </g>
        ))}
        <line x1={260} y1={46} x2={260} y2={80} stroke="#8b5cf6" strokeWidth={1.5} />
        {[70, 205, 340, 462].map((x, i) => (
          <g key={i}>
            <line x1={260} y1={116} x2={x} y2={155} stroke="#4b5563" strokeWidth={1} />
            <circle cx={x} cy={155} r={1} fill="#4b5563" />
          </g>
        ))}
        <line x1={260} y1={116} x2={260} y2={116} stroke="none" />
        <line x1={260} y1={116} x2={260} y2={116} stroke="none" />
        <text x={260} y={140} textAnchor="middle" fontSize={8} fill="#6b7280" style={{ fontFamily: 'sans-serif' }}>Elected by members</text>
      </svg>
    </div>
  );
}

export default function CondoBoardHandbook() {
  return (
    <div>
      <div className="mb-10 p-8 bg-gradient-to-br from-violet-950/60 to-[#111] border border-violet-500/20 rounded-2xl">
        <h1 className="text-4xl font-black text-white mb-2">Condo Board Governance Handbook</h1>
        <p className="text-violet-300 text-lg mb-4">Run your NH condominium association with legal confidence under RSA 356-B</p>
        <DocStats stats={[
          { label: 'Pages', value: '72', color: 'text-violet-400' },
          { label: 'RSA Sections', value: '15+', color: 'text-violet-400' },
          { label: 'Templates', value: '6', color: 'text-violet-400' },
          { label: 'Checklists', value: '7', color: 'text-violet-400' },
        ]} />
        <p className="text-xs text-gray-500 mt-2">Last updated July 2026 · RSA 356-B current as of 2025 session</p>
      </div>

      <DocSection id="intro" title="Introduction" subtitle="Your role and this guide">
        <P>Serving on a condominium association board in New Hampshire is a serious responsibility. Board members are fiduciaries — you have a legal duty to act in the best interests of all unit owners, not just yourself or your neighbors. This handbook gives you the knowledge to fulfill that duty confidently.</P>
        <DocCallout type="law" title="RSA 356-B — NH Condominium Act">
          The NH Condominium Act (RSA 356-B) governs every aspect of condominium association life: how the association is formed, how the board operates, budget and reserve requirements, and unit owner rights. Every board member should read RSA 356-B or have a copy accessible.
          <br /><br />
          <DocLink href="https://www.gencourt.state.nh.us/rsa/html/XXXVI-A/356-B/356-B-mrg.htm">Read RSA 356-B full text →</DocLink>
        </DocCallout>
      </DocSection>

      <DocSection id="rsa356b" title="RSA 356-B Overview" subtitle="The law that governs your association">
        <DocSubSection title="Key Provisions Board Members Must Know">
          <DocTable
            headers={['RSA Section', 'What It Covers']}
            rows={[
              ['356-B:3', 'Definitions (common area, unit, association, etc.)'],
              ['356-B:15', 'Declaration requirements — founding documents'],
              ['356-B:12-a', 'Budget and reserve fund requirements'],
              ['356-B:12-b', 'Reserve study requirements'],
              ['356-B:10-a', 'Unit owner access to records'],
              ['356-B:10-b', 'Meetings of unit owners'],
              ['356-B:10-c', 'Board of directors powers and duties'],
              ['356-B:46', 'Lien for unpaid assessments'],
              ['356-B:45', 'Liability of unit owner for assessments'],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="What the Declaration and Bylaws Say">
          <P>Your association is governed first by its Declaration, then Bylaws, then Rules and Regulations. State law sets the floor — your documents can be stricter but never less protective than RSA 356-B.</P>
          <DocChecklist category="Document Review Checklist" items={[
            'Locate original Declaration and all recorded amendments',
            'Locate current Bylaws',
            'Locate current Rules and Regulations',
            'Identify quorum requirements for unit owner meetings',
            'Identify voting requirements for major decisions (simple majority? 2/3?)',
            'Identify board size and term lengths',
            'Identify assessment lien authority',
          ]} />
        </DocSubSection>
      </DocSection>

      <DocSection id="roles" title="Board Roles & Fiduciary Duties">
        <BoardStructureDiagram />

        <DocSubSection title="Fiduciary Duty Explained">
          <P>Board members owe a fiduciary duty to all unit owners. This means three things:</P>
          <DocTable
            headers={['Duty', 'What It Means', 'Common Violations']}
            rows={[
              ['Duty of Care', 'Make informed decisions; get expert advice when needed', 'Approving a major contract without getting bids; ignoring maintenance'],
              ['Duty of Loyalty', 'Act in the association\'s interest, not your own', 'Awarding contracts to relatives; voting on matters where you have a conflict'],
              ['Duty of Obedience', 'Follow governing documents and applicable law', 'Ignoring reserve fund requirements; holding meetings without proper notice'],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Officer Roles">
          <DocAccordion items={[
            {
              q: 'President',
              a: 'Presides over all board and membership meetings. Signs contracts on behalf of the association (per authorization in bylaws). Primary spokesperson. Oversees property manager if one is retained.',
            },
            {
              q: 'Treasurer',
              a: 'Oversees all finances: monthly financial review, budget preparation, banking relationships, reserve fund oversight, assessment collection, and ensuring financial statements are prepared. Should review bank statements monthly.',
            },
            {
              q: 'Secretary',
              a: 'Takes and maintains minutes for all meetings. Ensures proper notice of meetings is sent. Maintains association records. Responds to records requests from unit owners per RSA 356-B:10-a.',
            },
            {
              q: 'At-Large Directors',
              a: 'Vote on all board decisions. Take on specific committee roles (architectural control, landscaping, etc.) as assigned. Equal voting rights to officers.',
            },
          ]} />
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="meetings" title="Meeting Procedures" subtitle="Running legal, productive meetings">
        <DocCallout type="law" title="RSA 356-B:10-b — Meeting Requirements">
          At least one annual meeting of unit owners must be held. Board meetings should be held at regular intervals. Both types require advance notice to all unit owners.
        </DocCallout>

        <DocSubSection title="Notice Requirements">
          <DocTable
            headers={['Meeting Type', 'Notice Required', 'Method']}
            rows={[
              ['Annual Meeting', '10-60 days advance notice (check bylaws)', 'Written notice to each unit owner of record'],
              ['Special Meeting', '10-60 days (check bylaws)', 'Written notice specifying purpose'],
              ['Board Meeting (open)', 'As specified in bylaws (commonly 5-7 days)', 'Posted/emailed to owners per bylaws'],
              ['Emergency Board Meeting', 'Reasonable under circumstances', 'Phone/email; document attempts'],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Quorum Requirements">
          <P>A meeting cannot legally conduct business without quorum. Check your bylaws for your specific quorum requirement. Typical standards:</P>
          <UL items={[
            'Unit owner meetings: 25-33% of all voting interests (by bylaws)',
            'Board meetings: Majority of seated directors (e.g., 3 of 5)',
            'If quorum is not met: no binding decisions may be made; meeting may be adjourned',
          ]} />
        </DocSubSection>

        <DocSubSection title="Agenda Best Practices">
          <DocChecklist category="Pre-Meeting Checklist" items={[
            'Send meeting notice with agenda at least 10 days in advance',
            'Include any materials for unit owner review (financial reports, proposed budget)',
            'Confirm quorum will be met (track RSVPs for annual meetings)',
            'Prepare financial report for treasurer to present',
            'Prepare any vendor quotes or proposals for discussion',
            'Designate someone to take minutes',
            'Set expected end time (respect everyone\'s time)',
          ]} />
        </DocSubSection>
      </DocSection>

      <DocSection id="finances" title="Financial Management" subtitle="Budgets, assessments, and financial controls">
        <DocSubSection title="Annual Budget Process">
          <DocSteps steps={[
            { title: 'Gather Operating Expense History', body: 'Pull last 2 years of actual expenses by category. Identify any one-time items vs. recurring costs.' },
            { title: 'Project Next Year\'s Costs', body: 'Apply inflation (typically 3-6% for labor/materials in NH). Get vendor quotes for major recurring contracts (landscaping, snow removal, management).' },
            { title: 'Calculate Reserve Contribution', body: 'Based on your reserve study, determine the annual contribution needed to fund future capital expenses. This is a non-negotiable line item.' },
            { title: 'Calculate Required Assessments', body: 'Total budget ÷ percentage of common interest = each owner\'s annual assessment. Divide by 12 for monthly.' },
            { title: 'Present to Owners', body: 'Present proposed budget at annual meeting or mail to all owners at least 10 days before adoption. RSA 356-B requires owner notification.' },
          ]} />
        </DocSubSection>

        <DocSubSection title="Financial Controls Every Board Should Have">
          <UL items={[
            <><Bold>Dual signature requirement</Bold> for checks over a set threshold (e.g., $500)</>,
            <><Bold>Monthly bank reconciliation</Bold> — treasurer reviews bank statements against books</>,
            <><Bold>Separate operating and reserve accounts</Bold> — never comingle funds</>,
            <><Bold>Annual financial review or audit</Bold> by independent CPA (required for many associations by bylaws)</>,
            <><Bold>Written authorization</Bold> for any unbudgeted expense over a set amount</>,
            <><Bold>Bonding and D&O insurance</Bold> for board members</>,
          ]} />
        </DocSubSection>
      </DocSection>

      <DocSection id="reserves" title="Reserve Funds" subtitle="Protecting the long-term health of your property">
        <DocCallout type="law" title="RSA 356-B:12-a and 12-b — Reserve Requirements">
          NH law requires condominium associations to maintain a reserve fund and conduct periodic reserve studies. Failure to maintain adequate reserves exposes the association to special assessments and board members to liability.
        </DocCallout>

        <DocStats stats={[
          { label: 'Fully Funded', value: '100%', color: 'text-green-400', sub: 'Goal' },
          { label: 'Acceptable Range', value: '70-100%', color: 'text-teal-400', sub: 'Industry standard' },
          { label: 'Warning Zone', value: '30-70%', color: 'text-yellow-400', sub: 'Needs attention' },
          { label: 'Critical', value: '<30%', color: 'text-red-400', sub: 'Special assessment risk' },
        ]} />

        <DocSubSection title="What a Reserve Study Covers">
          <UL items={[
            'Roof (life expectancy, remaining life, replacement cost)',
            'Parking lot / driveway (paving, seal coating)',
            'HVAC equipment (if association-maintained)',
            'Exterior painting',
            'Elevators (if applicable)',
            'Pool and recreational facilities',
            'Foundation and structural elements',
            'Water and sewer infrastructure',
            'Common area flooring and finishes',
          ]} />
        </DocSubSection>
      </DocSection>

      <DocSection id="assessments" title="Special Assessments" subtitle="When to levy them and how to do it legally">
        <P>A special assessment is a one-time charge to unit owners for a capital expense that cannot be funded from operating reserves. They should be a last resort — adequate reserve funding prevents them.</P>

        <DocSubSection title="Legal Requirements for Special Assessments">
          <OL items={[
            'Review your Declaration — many require owner approval for assessments above a certain threshold',
            'Obtain at least two competitive bids for any capital project over $10,000',
            'Pass a board resolution authorizing the assessment with amount, purpose, and payment schedule',
            'Provide written notice to all unit owners with at least 30 days before first payment due',
            'Document everything in board minutes',
          ]} />
        </DocSubSection>

        <DocCallout type="tip" title="Hardship Payment Plans">
          Consider offering payment plans for large special assessments. Some owners may face hardship. A formal installment plan (put in writing with interest terms) shows good governance and reduces collection issues.
        </DocCallout>
      </DocSection>

      <DocSection id="vendors" title="Vendor Management">
        <DocSubSection title="Competitive Bidding Best Practices">
          <DocTable
            headers={['Contract Value', 'Minimum Bids', 'Approval Required']}
            rows={[
              ['Under $1,000', '1 bid acceptable', 'Board officer authorization'],
              ['$1,000 – $5,000', '2 bids recommended', 'Board vote'],
              ['$5,000 – $25,000', '3 bids required (best practice)', 'Board vote; document bids'],
              ['Over $25,000', '3 bids required', 'Board vote; may need owner vote per bylaws'],
            ]}
          />
        </DocSubSection>

        <DocChecklist category="Vendor Qualification Checklist" items={[
          'Verify NH contractor license (check at nh.gov for licensed trades)',
          'Require Certificate of Insurance (COI) — general liability minimum $1M',
          'Verify workers compensation coverage',
          'Check references (at least 2 comparable projects)',
          'Review contract for scope of work, timeline, payment schedule',
          'Include warranty provisions in contract',
          'Ensure contract can be terminated for cause with 30-day notice',
        ]} />
      </DocSection>

      <DocSection id="disputes" title="Owner Disputes & Violations" subtitle="A fair, consistent process">
        <DocSteps steps={[
          { title: 'Documented Written Notice', body: 'Send written notice of the violation with specific rule cited, description, and deadline to cure. Keep copy.' },
          { title: 'Give Reasonable Time to Cure', body: 'Most rules violations: 30-day cure period is reasonable. Nuisances: may be shorter. Safety hazards: may be immediate.' },
          { title: 'Hearing if Not Cured', body: 'Offer owner opportunity to appear before the board. Document the hearing in minutes. Do not make final decision at the hearing — deliberate privately.' },
          { title: 'Board Decision in Writing', body: 'Send written decision with finding and consequence. Fines should be per your enforcement policy (must be established in advance by rule).' },
          { title: 'Collection if Fines Unpaid', body: 'Unpaid fines become a lien on the unit under RSA 356-B:46. Consult your association attorney before filing a lien.' },
        ]} />
      </DocSection>

      <DocSection id="resources" title="NH Resources">
        <UL items={[
          <><DocLink href="https://www.gencourt.state.nh.us/rsa/html/XXXVI-A/356-B/356-B-mrg.htm">RSA 356-B — NH Condominium Act</DocLink></>,
          <><DocLink href="https://www.nhcourts.gov">NH Courts — Dispute Resolution</DocLink></>,
          <><DocLink href="https://www.cai-ne.org">Community Associations Institute — NE Chapter</DocLink></>,
          <><DocLink href="https://www.nhar.org">NH Association of Realtors</DocLink></>,
        ]} />
      </DocSection>
    </div>
  );
}
