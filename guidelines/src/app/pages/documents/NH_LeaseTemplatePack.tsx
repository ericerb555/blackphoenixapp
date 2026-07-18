import { DocSection, DocSubSection, DocCallout, DocChecklist, DocLink, P, UL, Bold, PageBreak } from './DocComponents';

function Field({ label, width = "medium" }: { label: string; width?: "small" | "medium" | "large" | "full" }) {
  const widths = { small: "w-24", medium: "w-48", large: "w-72", full: "w-full" };
  return (
    <span className={`inline-block ${widths[width]} border-b-2 border-orange-500/50 bg-orange-500/5 px-2 py-0.5 text-orange-300 text-sm font-mono rounded-sm`}>
      {label}
    </span>
  );
}

export default function NH_LeaseTemplatePack() {
  return (
    <div>
      <DocSection id="intro" title="How to Use These Templates" subtitle="Important instructions and NH-specific notes">
        <DocCallout type="warning" title="Attorney Review Required">
          These templates are provided for educational purposes and as a starting point only. <Bold>Every lease should be reviewed by a licensed NH attorney before use.</Bold> NH landlord-tenant law changes frequently, and local municipalities may have additional requirements. The cost of an attorney review ($150–400) is far less than the cost of an unenforceable clause.
        </DocCallout>

        <DocSubSection title="How to Customize These Templates">
          <P>Fields shown in <span className="text-orange-300 font-mono">orange highlighted text</span> are fillable placeholders. Replace each with the actual information for your tenancy. Review every clause to ensure it fits your specific property and situation.</P>
          <UL items={[
            "Replace ALL orange fields before presenting to a tenant",
            "Do not use terms that conflict with NH RSA 540 or RSA 540-A",
            "Security deposits are capped at ONE month's rent in NH (RSA 540-A:6)",
            "Required notice to enter is 24 hours except in emergency (RSA 540-A:3)",
            "Late fees must be reasonable — NH courts routinely void excessive late fees",
            "No-pet clauses must be consistent — if you allow one tenant's pet, you may need to allow others",
          ]} />
        </DocSubSection>

        <DocCallout type="law" title="NH RSA 540 — Key Requirements">
          NH landlord-tenant law requires: written notice for rent increases (30 days month-to-month, length of lease for fixed term), written receipt for any cash payment, security deposit return within 30 days of tenancy end with itemized deductions, and compliance with habitability standards in RSA 48-A.
        </DocCallout>

        <DocLink href="https://www.gencourt.state.nh.us/rsa/html/nhtoc/nhtoc-l-540.htm">NH RSA 540 — Landlord and Tenant (Full Text)</DocLink>
      </DocSection>

      <PageBreak />

      <DocSection id="standard-lease" title="Standard 12-Month Lease Agreement" subtitle="Residential tenancy — New Hampshire">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 my-4 font-serif text-sm leading-relaxed">
          <p className="text-center font-bold text-white text-lg mb-1">RESIDENTIAL LEASE AGREEMENT</p>
          <p className="text-center text-gray-400 mb-6">State of New Hampshire</p>

          <p className="text-gray-300 mb-4"><Bold>PARTIES.</Bold> This Residential Lease Agreement ("Agreement") is entered into as of <Field label="Date" />, between <Field label="Landlord Full Name" width="large" /> ("Landlord"), whose mailing address is <Field label="Landlord Address" width="full" />, and the following Tenant(s): <Field label="Tenant 1 Full Name" width="large" /> and <Field label="Tenant 2 Full Name (if any)" width="large" /> (collectively "Tenant").</p>

          <p className="text-gray-300 mb-4"><Bold>1. PROPERTY.</Bold> Landlord hereby leases to Tenant the residential property located at: <Field label="Full Property Address" width="full" />, including the following described premises: <Field label="Apartment/Unit description e.g. Unit 2B, second floor" width="full" /> (the "Premises"). Parking: <Field label="e.g. One assigned space #4" width="large" />. Storage: <Field label="e.g. None / Basement locker" />.</p>

          <p className="text-gray-300 mb-4"><Bold>2. TERM.</Bold> This lease commences on <Field label="Start Date" /> and expires on <Field label="End Date" /> (the "Term"). Upon expiration, if Tenant holds over with Landlord's written consent, tenancy shall convert to a month-to-month tenancy terminable by either party upon 30 days written notice.</p>

          <p className="text-gray-300 mb-4"><Bold>3. RENT.</Bold> Tenant shall pay <Field label="$___/month" width="small" /> per month, due on the <Field label="1st" width="small" /> day of each month. Rent shall be paid to <Field label="Payee Name" /> at <Field label="Payment Address or Venmo/Zelle info" width="full" />. First month rent of <Field label="$___" width="small" /> and last month rent of <Field label="$___" width="small" /> are due at lease signing.</p>

          <p className="text-gray-300 mb-4"><Bold>4. LATE FEES.</Bold> Rent received after the <Field label="5th" width="small" /> day of the month shall incur a late fee of <Field label="$___" width="small" /> (not to exceed a reasonable amount). Returned check fee: $<Field label="35" width="small" />. Landlord shall provide written notice of any late fee within 30 days of the late payment per NH RSA 540-A.</p>

          <p className="text-gray-300 mb-4"><Bold>5. SECURITY DEPOSIT.</Bold> Tenant shall deposit <Field label="$___" width="small" /> as a security deposit, not to exceed one (1) month's rent as required by NH RSA 540-A:6. The security deposit shall be held in a separate, non-commingled account at <Field label="Bank Name" width="large" />. Landlord shall return the deposit within 30 days of tenancy end with an itemized statement of any deductions, as required by NH RSA 540-A:7.</p>

          <p className="text-gray-300 mb-4"><Bold>6. UTILITIES.</Bold> Tenant is responsible for: <Field label="e.g. Electric, Gas, Internet" width="large" />. Landlord provides: <Field label="e.g. Water/Sewer, Trash" width="large" />. Tenant must establish utility accounts in Tenant's name within 3 days of commencement date.</p>

          <p className="text-gray-300 mb-4"><Bold>7. OCCUPANTS.</Bold> The Premises shall be occupied only by the Tenant(s) named above and the following approved occupants: <Field label="Names of minor children or other occupants" width="full" />. No additional occupants without prior written Landlord consent.</p>

          <p className="text-gray-300 mb-4"><Bold>8. PETS.</Bold> ☐ No pets permitted. ☐ Pets permitted per attached Pet Addendum only. Unauthorized pets are grounds for eviction.</p>

          <p className="text-gray-300 mb-4"><Bold>9. LANDLORD ENTRY.</Bold> Landlord shall provide at least 24 hours advance written notice before entering the Premises except in cases of emergency, as required by NH RSA 540-A:3. Emergency entry requires no prior notice.</p>

          <p className="text-gray-300 mb-4"><Bold>10. MAINTENANCE & REPAIRS.</Bold> Tenant shall: (a) keep the Premises clean and sanitary; (b) promptly report all needed repairs to Landlord in writing; (c) not cause or allow waste or damage; (d) be responsible for repair of damage caused by Tenant's negligence or misuse. Landlord shall: (a) maintain the Premises in habitable condition per NH RSA 48-A; (b) make repairs within a reasonable time after written notice.</p>

          <p className="text-gray-300 mb-4"><Bold>11. ALTERATIONS.</Bold> Tenant shall make no alterations, additions, or improvements to the Premises without prior written consent of Landlord. All approved improvements become property of Landlord upon lease termination unless otherwise agreed in writing.</p>

          <p className="text-gray-300 mb-4"><Bold>12. SUBLETTING.</Bold> Tenant shall not sublet the Premises or any portion thereof, nor assign this lease, without prior written consent of Landlord.</p>

          <p className="text-gray-300 mb-4"><Bold>13. RULES.</Bold> Tenant agrees to comply with the following rules: <Field label="e.g. No smoking on property, quiet hours 10pm-8am, no grilling on decks" width="full" />.</p>

          <p className="text-gray-300 mb-4"><Bold>14. MOVE-IN CONDITION.</Bold> Tenant acknowledges that the Premises have been inspected and are in satisfactory condition as documented on the Move-In Inspection Checklist, a copy of which is attached hereto and incorporated by reference.</p>

          <p className="text-gray-300 mb-4"><Bold>15. GOVERNING LAW.</Bold> This Agreement shall be governed by the laws of the State of New Hampshire, including but not limited to RSA 540 and RSA 540-A. Any disputes shall be resolved in the district court of the county in which the Premises are located.</p>

          <p className="text-gray-300 mb-6"><Bold>16. ENTIRE AGREEMENT.</Bold> This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations. Amendments must be in writing and signed by both parties.</p>

          <div className="border-t border-[#3A3A3A] pt-6 grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-gray-600 mb-1 h-8"></div>
              <p className="text-xs text-gray-500">Landlord Signature</p>
              <div className="border-b border-gray-600 mb-1 h-8 mt-4"></div>
              <p className="text-xs text-gray-500">Date</p>
            </div>
            <div>
              <div className="border-b border-gray-600 mb-1 h-8"></div>
              <p className="text-xs text-gray-500">Tenant Signature</p>
              <div className="border-b border-gray-600 mb-1 h-8 mt-4"></div>
              <p className="text-xs text-gray-500">Date</p>
            </div>
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="mtm-lease" title="Month-to-Month Lease Agreement" subtitle="Short-form tenancy with 30-day termination">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 my-4 font-serif text-sm leading-relaxed">
          <p className="text-center font-bold text-white text-lg mb-6">MONTH-TO-MONTH RESIDENTIAL LEASE — NEW HAMPSHIRE</p>

          <p className="text-gray-300 mb-4"><Bold>PARTIES.</Bold> This Month-to-Month Lease is entered into between <Field label="Landlord Name" width="large" /> ("Landlord") and <Field label="Tenant Name(s)" width="large" /> ("Tenant") effective <Field label="Start Date" />.</p>

          <p className="text-gray-300 mb-4"><Bold>PROPERTY.</Bold> The leased premises: <Field label="Full Property Address" width="full" />.</p>

          <p className="text-gray-300 mb-4"><Bold>RENT.</Bold> <Field label="$___" width="small" /> per month, due on the <Field label="1st" width="small" /> day of each month. Late fee of <Field label="$___" width="small" /> applies after the <Field label="5th" width="small" />.</p>

          <p className="text-gray-300 mb-4"><Bold>SECURITY DEPOSIT.</Bold> <Field label="$___" width="small" /> (maximum 1 month rent per NH RSA 540-A:6), held in separate account, returned within 30 days of termination with itemized deductions.</p>

          <p className="text-gray-300 mb-4"><Bold>TERMINATION.</Bold> Either party may terminate this tenancy upon <Bold>30 days written notice</Bold> delivered to the other party. Notice shall be delivered in person or by first-class mail. Per NH RSA 540:2, termination notice for non-payment requires a 7-day demand notice.</p>

          <p className="text-gray-300 mb-4"><Bold>RENT INCREASES.</Bold> Landlord shall provide at least 30 days written notice before any rent increase takes effect.</p>

          <p className="text-gray-300 mb-4">All other terms including utilities, pets, entry notice, maintenance obligations, and NH governing law are identical to the Standard Lease terms above. <Field label="Add any additional terms here" width="full" />.</p>

          <div className="border-t border-[#3A3A3A] pt-6 grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-gray-600 mb-1 h-8"></div>
              <p className="text-xs text-gray-500">Landlord Signature / Date</p>
            </div>
            <div>
              <div className="border-b border-gray-600 mb-1 h-8"></div>
              <p className="text-xs text-gray-500">Tenant Signature / Date</p>
            </div>
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="room-rental" title="Room Rental Agreement" subtitle="Shared housing with common areas">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 my-4 font-serif text-sm leading-relaxed">
          <p className="text-center font-bold text-white text-lg mb-6">ROOM RENTAL AGREEMENT — NEW HAMPSHIRE</p>

          <p className="text-gray-300 mb-4"><Bold>LANDLORD:</Bold> <Field label="Owner Name" width="large" /> | <Bold>TENANT:</Bold> <Field label="Tenant Name" width="large" /></p>
          <p className="text-gray-300 mb-4"><Bold>PROPERTY:</Bold> <Field label="Full Address" width="full" /></p>
          <p className="text-gray-300 mb-4"><Bold>RENTED ROOM:</Bold> <Field label="Description e.g. Second floor front bedroom" width="full" /></p>
          <p className="text-gray-300 mb-4"><Bold>RENT:</Bold> <Field label="$___/month" width="small" /> due on the <Field label="1st" width="small" />. Includes: <Field label="e.g. Utilities, WiFi" width="large" />.</p>
          <p className="text-gray-300 mb-4"><Bold>SHARED AREAS:</Bold> Tenant has access to kitchen, <Field label="list shared areas" width="large" />. Tenant shall not use: <Field label="e.g. Landlord's bedroom, garage" width="large" />.</p>
          <p className="text-gray-300 mb-4"><Bold>HOUSE RULES:</Bold> <Field label="e.g. No guests overnight without notice, quiet hours 10pm, shared cleaning schedule" width="full" />.</p>
          <p className="text-gray-300 mb-4"><Bold>TERMINATION:</Bold> Either party may terminate upon <Field label="30" width="small" /> days written notice. Landlord may terminate upon 7 days notice for lease violations.</p>

          <div className="border-t border-[#3A3A3A] pt-4 grid grid-cols-2 gap-8 mt-4">
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Landlord / Date</p></div>
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Tenant / Date</p></div>
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="pet-addendum" title="Pet Addendum" subtitle="Attach to any lease when pets are permitted">
        <div className="bg-[#0D0D0D] border border-[#3A3A3A] rounded-xl p-6 my-4 font-serif text-sm leading-relaxed">
          <p className="text-center font-bold text-white text-lg mb-6">PET ADDENDUM TO RESIDENTIAL LEASE</p>

          <p className="text-gray-300 mb-4">This Addendum is attached to and made part of the Lease Agreement dated <Field label="Date" /> for premises at <Field label="Address" width="full" />.</p>

          <p className="text-gray-300 mb-4"><Bold>APPROVED PETS:</Bold></p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><p className="text-xs text-gray-500">Type/Breed</p><Field label="e.g. Dog / Lab mix" width="full" /></div>
            <div><p className="text-xs text-gray-500">Name</p><Field label="Pet Name" width="full" /></div>
            <div><p className="text-xs text-gray-500">Weight</p><Field label="___ lbs" width="full" /></div>
          </div>

          <p className="text-gray-300 mb-4"><Bold>PET DEPOSIT:</Bold> A refundable pet deposit of <Field label="$___" width="small" /> is due at lease signing. Note: NH law caps total security deposit at 1 month's rent — consult an attorney on structuring.</p>
          <p className="text-gray-300 mb-4"><Bold>PET RENT:</Bold> An additional <Field label="$___" width="small" /> per month in pet rent applies, due with monthly rent.</p>
          <p className="text-gray-300 mb-4"><Bold>DAMAGE LIABILITY:</Bold> Tenant is fully liable for all damage caused by the approved pet(s), including but not limited to flooring, doors, trim, yard damage, and any damage to neighboring units or common areas.</p>
          <p className="text-gray-300 mb-4"><Bold>BREED RESTRICTIONS NOTE:</Bold> Landlord may restrict certain breeds per property insurance requirements. Tenant must provide current vaccination records and proof of renter's insurance covering pet liability of at least $100,000.</p>
          <p className="text-gray-300 mb-4"><Bold>VIOLATIONS:</Bold> Unauthorized pets or violation of pet rules are grounds for immediate pet removal notice and may constitute a lease violation subject to eviction proceedings per NH RSA 540.</p>

          <div className="border-t border-[#3A3A3A] pt-4 grid grid-cols-2 gap-8 mt-4">
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Landlord / Date</p></div>
            <div><div className="border-b border-gray-600 h-8 mb-1"></div><p className="text-xs text-gray-500">Tenant / Date</p></div>
          </div>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="move-in-checklist" title="Move-In Inspection Checklist" subtitle="Room-by-room condition documentation">
        <DocCallout type="key" title="Complete This at Move-In — Both Parties Sign">
          This checklist protects both landlord and tenant. Complete it together at move-in, note all pre-existing conditions, and have both parties sign. Attach to the lease. This document determines what, if anything, can be deducted from the security deposit.
        </DocCallout>

        <DocSubSection title="Kitchen">
          <DocChecklist category="Kitchen" items={[
            "Cabinets — condition of doors, hinges, interior",
            "Countertops — chips, stains, burns",
            "Kitchen sink — faucet, drain, condition of basin",
            "Dishwasher — runs, drains, racks in good condition",
            "Stove/oven — all burners work, oven heats, drip pans",
            "Refrigerator — temperature, seals, ice maker if applicable",
            "Microwave (if included) — works, clean interior",
            "Flooring — scratches, stains, loose tiles",
            "Ceiling and walls — any water stains, holes, marks",
            "Outlets — all functional (test with phone charger)",
            "Light fixtures — all bulbs work",
          ]} />
        </DocSubSection>

        <DocSubSection title="Bathroom">
          <DocChecklist category="Bathroom" items={[
            "Toilet — flushes, no running, no cracks",
            "Sink — faucet drips, drain speed, basin condition",
            "Tub/shower — caulk condition, drain speed, tile grout",
            "Faucet — hot/cold function, no leaks",
            "Mirror — no cracks",
            "Flooring — condition, no soft spots",
            "Exhaust fan — works and actually vents",
            "Outlets — GFCI protected and functional",
          ]} />
        </DocSubSection>

        <DocSubSection title="Bedrooms">
          <DocChecklist category="Bedroom(s)" items={[
            "Floors — scratches, stains, condition of carpet or hardwood",
            "Walls — holes, scuffs, paint condition",
            "Ceiling — any stains or damage",
            "Closet — door operates, shelf condition, rod present",
            "Windows — locks work, no broken panes, screens present",
            "Outlets — all functional",
            "Door — opens/closes/latches properly",
            "Closet light (if any) — functional",
          ]} />
        </DocSubSection>

        <DocSubSection title="Living Room and Common Areas">
          <DocChecklist category="Living Room / Common Areas" items={[
            "Floors — general condition",
            "Walls and ceiling — damage or stains",
            "Windows — screens, locks, operation",
            "Lighting — all fixtures functional",
            "Outlets and switches — functional",
          ]} />
        </DocSubSection>

        <DocSubSection title="Exterior and Mechanical">
          <DocChecklist category="Exterior & Mechanical" items={[
            "Exterior doors — all locks functional, weatherstripping present",
            "Garage door (if applicable) — auto opener works, manual release",
            "Driveway and walkways — existing cracks noted",
            "Heating system — runs, thermostat works",
            "Water heater — no visible corrosion or leaks",
            "Electrical panel — breakers labeled, no visible issues",
            "Smoke detectors — present and tested",
            "CO detectors — present and tested",
          ]} />
        </DocSubSection>

        <div className="border border-[#3A3A3A] rounded-xl p-4 mt-4">
          <p className="text-xs font-bold text-gray-400 uppercase mb-3">Signatures</p>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-gray-600 h-8 mb-1"></div>
              <p className="text-xs text-gray-500">Landlord Signature / Date</p>
            </div>
            <div>
              <div className="border-b border-gray-600 h-8 mb-1"></div>
              <p className="text-xs text-gray-500">Tenant Signature / Date</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">Both parties acknowledge the above conditions as accurate at time of move-in.</p>
        </div>
      </DocSection>
    </div>
  );
}
