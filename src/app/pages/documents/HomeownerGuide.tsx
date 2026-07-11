import { DocSection, DocSubSection, DocCallout, DocChecklist, DocTable, DocSteps, DocStats, DocLink, P, UL, Bold, PageBreak, DocDivider } from './DocComponents';

export default function HomeownerGuide() {
  return (
    <div>
      <DocStats stats={[
        { label: "Pages", value: "58", sub: "Comprehensive guide" },
        { label: "Sections", value: "8", sub: "Topics covered" },
        { label: "Checklists", value: "12+", sub: "Action items" },
        { label: "NH Rebates", value: "$13K+", sub: "Available savings", color: "text-green-400" },
      ]} />

      <DocSection id="day-one" title="Day One Orientation" subtitle="What to do in your first week as a homeowner">
        <P>Congratulations on your new home! The first week sets the tone for responsible homeownership. Follow these steps to establish security, safety, and awareness of your new property.</P>

        <DocCallout type="warning" title="Do This Immediately">
          Change all exterior locks before you unpack a single box. You have no way of knowing who has copies of the existing keys — previous owners, contractors, real estate agents, or neighbors.
        </DocCallout>

        <DocSubSection title="Day 1: Security & Safety">
          <DocSteps steps={[
            { title: "Change All Locks", body: "Replace deadbolts on all exterior doors. Budget $30–60 per lock for hardware; a locksmith charges $50–100 to rekey existing hardware if you prefer. Include garage entry door and any basement exterior doors.", badge: "Do First" },
            { title: "Locate the Main Water Shutoff", body: "Know where to turn off all water in an emergency. In NH homes, this is typically in the basement near the front of the house or utility room. Test it to confirm it turns fully and doesn't leak." },
            { title: "Locate the Electrical Panel", body: "Find your breaker box, confirm all breakers are labeled. Take a photo. Note the main breaker location. If breakers are unlabeled, walk the house with a partner and a lamp." },
            { title: "Locate Gas Shutoff (if applicable)", body: "Find the main gas shutoff valve near the meter outside. Never use it yourself during an emergency — call your gas utility (Liberty Utilities or National Grid) and let them restore service." },
            { title: "Test All Smoke & CO Detectors", body: "NH RSA 153:10-a requires working smoke detectors on each level and outside each sleeping area. Test every detector, replace batteries, and note expiration dates (detectors expire 10 years from manufacture date)." },
          ]} />
        </DocSubSection>

        <DocSubSection title="First Week: Know Your Home">
          <DocChecklist category="First Week Priorities" items={[
            "Change all exterior locks",
            "Locate and test main water shutoff valve",
            "Find and photograph electrical panel — label all breakers",
            "Locate gas shutoff valve outside",
            "Test all smoke and CO detectors",
            "Meet immediate neighbors — introduce yourself",
            "Walk the property perimeter — document any visible issues",
            "Locate HVAC filter and check condition",
            "Find water heater and note age and temperature setting (set to 120°F)",
            "Confirm attic hatch location and inspect briefly for insulation",
            "Document all appliance model/serial numbers for warranty registration",
            "Save emergency contacts: plumber, electrician, HVAC, utility companies",
          ]} />
        </DocSubSection>

        <DocCallout type="tip" title="Document Everything">
          Walk every room, every closet, every exterior corner with your phone camera on Day One. This photo record protects you if you later discover pre-existing damage, and helps you compare conditions over time.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="systems" title="Know Your Home Systems" subtitle="Life expectancy, maintenance requirements, and where to find each system">
        <P>Every home is a collection of interdependent systems. Understanding their age and condition lets you plan and budget intelligently.</P>

        <DocSubSection title="System Life Expectancy">
          <DocTable
            headers={["System", "Typical Life (Years)", "Replacement Cost Range", "Warning Signs"]}
            rows={[
              ["Gas Furnace", "15–20", "$3,000–7,000 installed", "Frequent cycling, yellow flame, rising bills"],
              ["Central AC", "10–15", "$3,500–7,500 installed", "Warm air, ice on lines, loud noises"],
              ["Heat Pump", "12–18", "$5,000–12,000 installed", "Reduced efficiency, icing in winter"],
              ["Water Heater (tank)", "8–12", "$800–2,000 installed", "Rust, rumbling, leaking base"],
              ["Water Heater (tankless)", "15–25", "$2,000–4,500 installed", "Error codes, reduced flow"],
              ["Asphalt Shingle Roof", "20–30", "$8,000–20,000", "Missing shingles, granules in gutters"],
              ["Metal Roof", "40–70", "$15,000–40,000", "Rust spots, loose fasteners"],
              ["Electrical Panel (modern)", "30–40", "$2,000–5,000 to upgrade", "Frequent trips, burning smell"],
              ["Plumbing (copper)", "50+", "Varies by scope", "Green stains, pinhole leaks"],
              ["Plumbing (PVC/PEX)", "50+", "Varies by scope", "Discoloration, brittleness"],
              ["Windows (double pane)", "20–30", "$300–800 per window", "Fogging between panes, drafts"],
              ["Garage Door", "15–30", "$800–2,500", "Grinding noise, slow operation"],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Locate and Document Each System">
          <DocChecklist category="System Location Checklist" items={[
            "Gas furnace or oil boiler — basement or utility closet, note make/model/age",
            "Central AC condenser — exterior of home, note make/model/age",
            "Water heater — basement or utility room, note age from serial number",
            "Electrical panel — basement, garage, or utility room",
            "Main water shutoff valve — typically near front of basement",
            "Individual fixture shutoffs — under every sink, behind every toilet",
            "Gas meter and shutoff — exterior of home",
            "Oil tank (if applicable) — basement or exterior, note gauge level",
            "Sump pump (if applicable) — lowest point of basement",
            "Radon mitigation system (if applicable) — basement pipe with fan",
            "Attic access — note insulation type and depth",
            "Crawlspace access (if applicable) — note vapor barrier condition",
          ]} />
        </DocSubSection>

        <DocCallout type="info" title="NH-Specific Systems">
          Many older NH homes use oil heat — if your home has an oil tank, have it inspected annually and keep at least 1/4 tank in winter. Propane is common in rural areas. Confirm delivery contracts before winter.
        </DocCallout>

        <DocSubSection title="System Illustration">
          <div className="my-6 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Typical NH Home Systems Layout</p>
            <svg viewBox="0 0 400 300" className="w-full max-w-lg mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* House outline */}
              <rect x="50" y="100" width="300" height="170" rx="2" stroke="#444" strokeWidth="2" fill="#1A1A1A" />
              {/* Roof */}
              <polygon points="200,40 50,100 350,100" stroke="#888" strokeWidth="2" fill="#2A2A2A" />
              {/* Basement */}
              <rect x="50" y="220" width="300" height="50" fill="#111" stroke="#444" strokeWidth="1" />
              {/* Furnace icon */}
              <rect x="80" y="230" width="40" height="30" rx="3" fill="#444" stroke="#F97316" strokeWidth="1.5" />
              <text x="100" y="249" textAnchor="middle" fill="#F97316" fontSize="8" fontWeight="bold">HVAC</text>
              {/* Water heater */}
              <rect x="150" y="230" width="30" height="30" rx="15" fill="#1A3A5C" stroke="#60A5FA" strokeWidth="1.5" />
              <text x="165" y="249" textAnchor="middle" fill="#60A5FA" fontSize="6" fontWeight="bold">WH</text>
              {/* Panel */}
              <rect x="200" y="228" width="25" height="32" rx="2" fill="#2A2A2A" stroke="#FBBF24" strokeWidth="1.5" />
              <text x="212" y="248" textAnchor="middle" fill="#FBBF24" fontSize="6" fontWeight="bold">⚡</text>
              {/* Labels */}
              <text x="100" y="270" textAnchor="middle" fill="#666" fontSize="8">Furnace</text>
              <text x="165" y="270" textAnchor="middle" fill="#666" fontSize="8">Water Htr</text>
              <text x="212" y="270" textAnchor="middle" fill="#666" fontSize="8">Panel</text>
              {/* Roof attic area */}
              <text x="200" y="85" textAnchor="middle" fill="#888" fontSize="9">Attic — Insulation R-49 min</text>
              {/* Windows */}
              <rect x="100" y="130" width="50" height="40" rx="2" stroke="#60A5FA" strokeWidth="1.5" fill="#0D1B2A" />
              <rect x="250" y="130" width="50" height="40" rx="2" stroke="#60A5FA" strokeWidth="1.5" fill="#0D1B2A" />
              {/* Door */}
              <rect x="170" y="200" width="60" height="70" rx="2" stroke="#888" strokeWidth="1.5" fill="#0D0D0D" />
              <circle cx="225" cy="240" r="3" fill="#888" />
            </svg>
          </div>
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="seasonal" title="NH Seasonal Maintenance Calendar" subtitle="Month-by-month tasks to protect your investment">
        <P>New Hampshire's climate demands consistent seasonal attention. Winters are harsh, springs bring flooding risks, and fall preparation is critical. Follow this calendar to stay ahead of every season.</P>

        <DocTable
          headers={["Month", "Priority Tasks", "Who to Call"]}
          rows={[
            ["January", "Monitor pipes in extreme cold, check heating system, inspect for ice dams daily, change HVAC filter", "Emergency plumber if pipes freeze"],
            ["February", "Inspect roof after heavy snowfall, check for moisture in basement, service snow removal equipment", "Roofer if ice dams are severe"],
            ["March", "Inspect foundation for frost heave, check window and door weatherstripping, schedule HVAC tune-up", "Foundation specialist if cracking found"],
            ["April", "AC startup and service, spring exterior inspection, clean gutters, test irrigation, fertilize lawn", "HVAC technician for AC tune-up"],
            ["May", "Power wash exterior, paint touch-ups, inspect deck hardware and boards, check exterior caulking", "Deck contractor if structural issues"],
            ["June", "Clean gutters, HVAC filter change, inspect roof for winter damage, pest prevention treatment", "Pest control, gutter company"],
            ["July", "Check AC performance, inspect crawlspace for moisture, clean refrigerator coils, test GFCI outlets", "Electrician for GFCI issues"],
            ["August", "Begin fall planning, schedule furnace tune-up, inspect weatherstripping, clean dryer vent", "HVAC for furnace service"],
            ["September", "Furnace tune-up, chimney inspection and cleaning, drain irrigation system, transition AC to heat", "Chimney sweep, HVAC tech"],
            ["October", "Winterize exterior faucets, install storm windows, check roof before winter, stock ice melt", "Plumber for winterization"],
            ["November", "Final winterization, test heating backup, check generator, insulate vulnerable pipes", "Generator service tech"],
            ["December", "Test smoke/CO detectors, check fire extinguisher, review emergency contacts, year-end inspection", "Review all vendor contacts"],
          ]}
        />

        <DocCallout type="warning" title="NH Ice Dam Warning">
          Ice dams form when heat escapes through the roof, melts snow, and the water refreezes at the cold eaves. Prevention is everything: ensure R-49 attic insulation and proper air sealing. Roof raking after 4+ inch snowfalls significantly reduces risk. Never use open flame or salt pucks on your roof.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="budget" title="Maintenance Budget Planning" subtitle="The 1% rule and how to build your home maintenance fund">
        <P>A reliable rule of thumb: budget <Bold>1% of your home's purchase price per year</Bold> for maintenance and repairs. On a $400,000 NH home, that is $4,000 annually. Older homes, larger lots, and pool properties should budget 1.5–2%.</P>

        <DocCallout type="key" title="The 1% Rule">
          Home maintenance isn't optional — it is deferred liability. Skipping $4,000 in annual maintenance typically leads to $15,000–40,000 in emergency repairs within 5 years.
        </DocCallout>

        <DocSubSection title="Typical Annual Cost by Category">
          <DocTable
            headers={["Category", "Annual Budget", "Notes"]}
            rows={[
              ["HVAC Service", "$200–400", "Annual tune-up, filter replacements"],
              ["Landscaping", "$1,500–5,000", "Mowing, mulch, snow removal"],
              ["Exterior Painting", "$500–1,500 (prorated)", "Full repaint every 7–10 years"],
              ["Roof Repairs", "$300–500/year (prorated)", "Spot repairs, gutters"],
              ["Plumbing", "$200–500", "Minor fixes, inspections"],
              ["Electrical", "$100–300", "Outlet replacements, minor fixes"],
              ["Appliances", "$300–600", "Service and parts"],
              ["Pest Control", "$300–600", "Quarterly treatment"],
              ["Driveway/Walkways", "$200–500", "Crack sealing, resurfacing"],
              ["Miscellaneous", "$500–1,000", "Unexpected minor repairs"],
            ]}
          />
        </DocSubSection>

        <DocChecklist category="Budget Setup Checklist" items={[
          "Open a dedicated savings account for home maintenance",
          "Set up automatic monthly transfer equal to 1/12 of annual budget",
          "Create a spreadsheet or use property management software to track all repairs",
          "Collect all appliance warranties and store digitally",
          "Schedule annual review of all insurance coverages",
          "Price out your 5 largest future capital expenses",
          "Keep 3 months of maintenance budget as liquid emergency reserve",
          "Register all major appliances with manufacturer for warranty tracking",
        ]} />
      </DocSection>

      <PageBreak />

      <DocSection id="emergency" title="Emergency Preparedness" subtitle="Contacts, shutoffs, and storm kit">
        <P>NH homeowners face real weather emergencies: ice storms, nor'easters, extended power outages, and polar vortex events. Being prepared reduces damage and keeps your family safe.</P>

        <DocSubSection title="Emergency Contact List to Post in Your Home">
          <DocTable
            headers={["Emergency Type", "Who to Call", "Notes"]}
            rows={[
              ["Fire / Life Safety", "911", "Always call first"],
              ["Gas Leak", "911 + your gas utility", "Leave home immediately; do not use switches"],
              ["Power Outage", "Eversource: 800-662-7764 or Liberty: 800-780-9808", "Report outage online or by phone"],
              ["Burst Pipe", "Your plumber (save number)", "Know how to shut off main water first"],
              ["Heating Failure in Winter", "Your HVAC company (save number)", "Many offer 24/7 emergency service"],
              ["Oil Delivery Emergency", "Your oil company (save number)", "Confirm emergency delivery terms when signing"],
              ["Non-Emergency Police", "NH State Police: 603-271-3636", "For non-life-threatening property crimes"],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Winter Storm Kit">
          <DocChecklist category="Storm Preparedness Supplies" items={[
            "Flashlights with fresh batteries (one per room)",
            "Battery-powered or hand-crank weather radio",
            "3-day food and water supply (1 gallon/person/day)",
            "Backup phone chargers (keep charged)",
            "Portable generator with fuel stabilizer in gas supply",
            "Extension cords rated for generator use",
            "Carbon monoxide detector (always run generator OUTSIDE)",
            "Extra blankets and warm clothing",
            "Ice melt and sand for walkways",
            "Roof rake (essential for NH homes)",
            "First aid kit with 7-day medication supply",
            "Cash (ATMs fail during outages)",
            "Backup heating source (propane heater with safe indoor use rating)",
          ]} />
        </DocSubSection>

        <DocCallout type="law" title="NH Generator Safety — RSA 153:8">
          Never operate a portable generator indoors, in a garage, or near any window or door. Carbon monoxide poisoning kills NH residents every winter. Generators must be at least 20 feet from any opening.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="contractors" title="Finding Contractors in NH" subtitle="How to verify, hire, and manage contractors the right way">
        <P>New Hampshire licenses contractors in many trades. Hiring unlicensed workers exposes you to liability, insurance gaps, and shoddy work with no legal recourse.</P>

        <DocSubSection title="License Verification">
          <DocSteps steps={[
            { title: "Verify License at NH.gov", body: "Go to nh.gov/safety/divisions/fsem/contractor-licensing/ to verify any contractor's NH license status before signing anything.", badge: "Required" },
            { title: "Require Certificate of Insurance", body: "Ask for a Certificate of Insurance (COI) showing general liability (minimum $1M per occurrence) and workers' compensation. Call the insurer to verify the policy is active." },
            { title: "Get Three Written Bids", body: "For any project over $1,000, get at least three written bids. Bids should specify materials, labor, timeline, payment schedule, and what's excluded." },
            { title: "Check References", body: "Ask for three recent references in NH. Call them and ask: Did work finish on time? On budget? Would you hire again? Any issues with cleanup?" },
            { title: "Use a Written Contract", body: "Never pay cash without a written contract. Include: scope of work, materials, timeline, payment schedule (never pay more than 10% upfront), and warranty terms." },
          ]} />
        </DocSubSection>

        <DocSubSection title="Red Flags — Walk Away If You See These">
          <UL items={[
            "Contractor wants full payment upfront (legitimate contractors require 10–30% max deposit)",
            "No physical business address — only a cell phone number",
            "Cannot provide proof of NH license or insurance",
            "Pressure to sign immediately ('this price is only good today')",
            "Request to be paid in cash only",
            "Unmarked vehicle with no company signage",
            "Unable to provide any local references",
            "Unsolicited door-to-door after a storm offering repair work",
          ]} />
        </DocSubSection>

        <DocLink href="https://www.nh.gov/safety/divisions/fsem/contractor-licensing/">Verify NH Contractor License at NH.gov</DocLink>
      </DocSection>

      <PageBreak />

      <DocSection id="rebates" title="NH Energy Rebates" subtitle="Money available to NH homeowners for energy improvements">
        <P>Eversource NH and Liberty Utilities offer significant rebates for energy efficiency upgrades. Combined with federal tax credits, the savings can offset 30–50% of project costs.</P>

        <DocCallout type="key" title="Act Before Budgets Run Out">
          Eversource rebate programs have annual budget caps. The heat pump rebate program frequently runs out of funds by mid-year. Apply early in the calendar year for best results.
        </DocCallout>

        <DocSubSection title="Current Eversource NH Rebate Amounts">
          <DocTable
            headers={["Improvement", "Max Rebate", "Additional Federal Credit", "Notes"]}
            rows={[
              ["Attic/Basement Insulation", "Up to $2,000", "30% of cost (Inflation Reduction Act)", "Requires certified installer"],
              ["Air Source Heat Pump", "Up to $10,000", "Up to $2,000 federal tax credit", "Must replace fossil fuel system"],
              ["Heat Pump Water Heater", "Up to $700", "30% of cost up to $600 federal", "Replace electric resistance or fossil fuel"],
              ["EV Charger (Level 2)", "Up to $500/port", "30% up to $1,000 federal", "Both residential and commercial"],
              ["Smart Thermostat", "Up to $100", "None separate", "Nest, Ecobee, and others qualify"],
              ["Air Sealing", "Up to $500", "Included in insulation credit", "Must have energy audit first"],
              ["LED Lighting", "Instant rebate at retailer", "None separate", "Applied at point of sale"],
              ["Energy Audit", "Up to $150 rebate", "None separate", "Required before insulation rebates"],
            ]}
          />
        </DocSubSection>

        <DocLink href="https://www.eversource.com/content/nh/residential/save-money-energy/learn-about-our-programs">Eversource NH Energy Efficiency Programs</DocLink>
        <div className="mt-2">
          <DocLink href="https://www.nhsaves.com/">NHSaves — All NH Utility Rebate Programs</DocLink>
        </div>
      </DocSection>

      <PageBreak />

      <DocSection id="improvements" title="Smart Improvements ROI" subtitle="Which home improvements return the most value in NH">
        <P>Not all home improvements return equal value. In the NH real estate market, focus on improvements that appeal to buyers and address buyer concerns (energy efficiency, condition, systems).</P>

        <DocTable
          headers={["Improvement", "Typical Cost", "Estimated ROI", "NH Market Notes"]}
          rows={[
            ["Kitchen Remodel (minor)", "$15,000–30,000", "75–85%", "Buyers focus heavily on kitchens in NH"],
            ["Kitchen Remodel (major)", "$60,000–100,000", "55–65%", "Overimproving for neighborhood is common mistake"],
            ["Bathroom Remodel", "$10,000–25,000", "70–80%", "Master bath additions are highly valued"],
            ["Attic Insulation to R-49", "$2,000–5,000", "100%+", "Energy savings + buyer attraction in NH"],
            ["New Roof", "$10,000–20,000", "60–70%", "Required for financing; prevents deal-killing inspection items"],
            ["Deck Addition", "$15,000–30,000", "65–75%", "NH outdoor living season drives value"],
            ["Basement Finishing", "$25,000–50,000", "60–70%", "Adds livable square footage"],
            ["Heat Pump Installation", "$8,000–15,000", "70–80%", "High value in NH due to heating costs"],
            ["Garage Addition", "$30,000–60,000", "60–70%", "Essential in NH climate; major buyer priority"],
            ["Landscaping (basic)", "$2,000–8,000", "80–100%", "Curb appeal drives first impressions"],
          ]}
        />

        <DocCallout type="tip" title="Best ROI Strategy for NH Homeowners">
          Focus first on condition (roof, heating, insulation) before cosmetic upgrades. NH buyers in all price ranges conduct thorough inspections and will negotiate hard or walk away from deferred maintenance items. A new roof and efficient heating system often yield more net return than a kitchen remodel.
        </DocCallout>
      </DocSection>
    </div>
  );
}
