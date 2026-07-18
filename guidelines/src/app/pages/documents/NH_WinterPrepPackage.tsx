import { DocSection, DocSubSection, DocCallout, DocChecklist, DocTable, DocLink, P, UL, Bold, PageBreak } from './DocComponents';

export default function NH_WinterPrepPackage() {
  return (
    <div>
      <DocSection id="overview" title="NH Winter Prep Package" subtitle="The complete guide to protecting NH properties through winter">
        <P>New Hampshire winters are not gentle. The Granite State regularly sees -20°F temperatures in the north, 100+ inches of snow in some regions, and relentless freeze-thaw cycles that stress every building system. This guide is built specifically for NH conditions.</P>

        <div className="my-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center">NH Winter Design Temperatures</p>
          <svg viewBox="0 0 400 200" className="w-full max-w-xl mx-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Map outline of NH */}
            <rect x="10" y="10" width="380" height="180" rx="8" fill="#111" stroke="#2A2A2A" strokeWidth="1" />
            {/* NH state rough shape */}
            <path d="M180 30 L220 30 L230 80 L240 90 L235 120 L220 130 L215 160 L180 160 L170 130 L160 120 L165 90 L170 80 Z" fill="#1A1A1A" stroke="#444" strokeWidth="1.5" />
            {/* Temperature zones */}
            <text x="196" y="60" textAnchor="middle" fill="#60A5FA" fontSize="9" fontWeight="bold">Northern NH</text>
            <text x="196" y="72" textAnchor="middle" fill="#60A5FA" fontSize="8">-20°F design</text>
            <text x="196" y="110" textAnchor="middle" fill="#FBBF24" fontSize="9" fontWeight="bold">Central NH</text>
            <text x="196" y="122" textAnchor="middle" fill="#FBBF24" fontSize="8">-10°F design</text>
            <text x="196" y="148" textAnchor="middle" fill="#F97316" fontSize="9" fontWeight="bold">Southern NH</text>
            <text x="196" y="160" textAnchor="middle" fill="#F97316" fontSize="8">0°F design</text>
            {/* Legend */}
            <rect x="280" y="40" width="100" height="100" rx="6" fill="#0D0D0D" stroke="#2A2A2A" strokeWidth="1" />
            <text x="330" y="56" textAnchor="middle" fill="#888" fontSize="8" fontWeight="bold">KEY FACTS</text>
            <text x="290" y="70" fill="#60A5FA" fontSize="7">• Avg Jan low: 5–15°F</text>
            <text x="290" y="82" fill="#60A5FA" fontSize="7">• Record: -50°F (1933)</text>
            <text x="290" y="94" fill="#FBBF24" fontSize="7">• Annual snow: 60–100"</text>
            <text x="290" y="106" fill="#FBBF24" fontSize="7">• Ice storm risk: high</text>
            <text x="290" y="118" fill="#F97316" fontSize="7">• Freeze-thaw: 80+/yr</text>
            <text x="290" y="130" fill="#F97316" fontSize="7">• Pipe freeze: below 20°F</text>
          </svg>
        </div>

        <DocCallout type="warning" title="Ice Dams: NH's #1 Winter Property Damage Cause">
          Ice dams form when heat escapes through insufficiently insulated roofs, melting snow that refreezes at the cold eaves. Water backs up under shingles and into the building. Average ice dam damage claim in NH: $15,000–40,000. Prevention is the only effective solution — retrofit insulation and air sealing.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="exterior" title="Exterior & Roof" subtitle="15-item pre-winter exterior checklist">
        <DocChecklist category="Exterior Checklist (Complete by October 15)" items={[
          "Clean gutters thoroughly of all leaves, seeds, and debris",
          "Inspect roof visually from ground — look for missing, curled, or damaged shingles",
          "Check all roof flashing: chimney, skylights, vents, valleys — look for gaps or lifting",
          "Trim overhanging tree branches within 6 feet of roof",
          "Seal cracks in foundation walls with hydraulic cement — even hairline cracks admit water",
          "Store or secure all outdoor furniture, umbrellas, and decorations",
          "Winterize irrigation system — blow out all lines with compressed air",
          "Cover exterior AC condenser units with breathable cover (NOT plastic — causes condensation damage)",
          "Check all exterior lights — replace burned bulbs, clear cobwebs from covers",
          "Inspect chimney exterior and cap — have chimney swept if wood-burning stove used",
          "Test sump pump operation — pour 5 gallons in pit to confirm float switch triggers pump",
          "Clean dryer vent exterior cap — remove lint buildup from screen and duct",
          "Check weatherstripping on all exterior doors and garage doors — replace if compressible seal is gone",
          "Inspect all exterior faucets — shut off interior valve, open exterior spigot to drain",
          "Disconnect and drain/store all garden hoses",
        ]} />

        <DocCallout type="tip" title="Roof Rake — NH Essential Equipment">
          A roof rake ($40–80) lets you safely remove snow from the eaves after storms without climbing on an icy roof. Use it after any accumulation over 4 inches. Target the bottom 3–4 feet of the roof slope — this is where ice dams form. Do NOT rake the entire roof — you may damage shingles.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="heating" title="Heating Systems" subtitle="Pre-season tune-up and readiness checklist">
        <DocCallout type="key" title="September Is the Best Time for Furnace Service">
          Schedule your annual furnace or boiler tune-up in September. By October, HVAC companies in NH are fully booked. By November, emergency rates apply. September service ensures your system is certified ready before you need it — and any parts needed can be ordered without emergency shipping charges.
        </DocCallout>

        <DocChecklist category="Heating System Pre-Season Checklist" items={[
          "Schedule and complete annual furnace/boiler professional tune-up (September)",
          "Replace HVAC filter — use MERV 8 or higher for better particulate capture",
          "Bleed radiators (hot water heat systems) — remove air pockets that reduce efficiency",
          "Replace thermostat batteries — low batteries cause false thermostat behavior in cold weather",
          "Test heating system: set thermostat to 80°F and confirm heat comes on within 5 minutes",
          "Inspect fuel supply: oil tank level, propane contract in place, natural gas utility contact saved",
          "Install or upgrade to smart thermostat — reduce heating bills by $100-200/year",
          "Check emergency heat backup (heat pump secondary heat, electric baseboard, or pellet stove)",
          "Test all carbon monoxide detectors — replace if over 7 years old",
          "Clear 3-foot zone around all heat sources: furnace, water heater, boiler",
          "Check exhaust vent pipes on high-efficiency furnaces — clear of debris or bird nests",
          "Confirm heating oil contract: confirm delivery schedule and emergency response policy",
        ]} />

        <DocTable
          headers={["Fuel Type", "Emergency Contact", "Key Risk", "NH Resources"]}
          rows={[
            ["Natural Gas", "Liberty Utilities: 800-780-9808", "Gas leak — evacuate immediately", "liberty.com"],
            ["Electricity", "Eversource: 800-662-7764", "Outage — backup heat required", "eversource.com"],
            ["Heating Oil", "Your oil company (save contact)", "Run-out during storm", "Sign a budget plan contract"],
            ["Propane", "Your propane company", "Tank level monitoring", "Check level monthly in winter"],
          ]}
        />
      </DocSection>

      <PageBreak />

      <DocSection id="plumbing" title="Plumbing & Pipes" subtitle="Pipe freeze prevention in NH winters">
        <P>Water freezes in pipes when the temperature inside the wall or space drops to 32°F. But problems typically start when outdoor temperatures drop below <Bold>20°F</Bold> — the point where uninsulated exterior walls begin to lose heat faster than indoor sources can replace it. Northern NH regularly sees -10°F to -25°F nights.</P>

        <DocSubSection title="Insulation Methods Comparison">
          <DocTable
            headers={["Method", "Best For", "R-Value", "Cost/LF", "Installation"]}
            rows={[
              ["Foam pipe sleeve", "Interior pipes in unheated spaces", "R-2 to R-3", "$0.50–1.50", "Easy DIY — slit and snap on"],
              ["Fiberglass pipe wrap", "Pipes needing more insulation", "R-3 to R-4", "$1–3", "Moderate DIY"],
              ["Heat tape (thermostatically controlled)", "Exterior wall pipes, problem pipes", "Electric — varies", "$1–3/LF + outlet", "DIY — plug into GFCI"],
              ["Heat cable (constant wattage)", "Long runs in extreme cold", "Electric — varies", "$1–2/LF", "DIY — requires planning"],
              ["Spray foam", "Gaps around pipes in exterior walls", "R-6/inch", "$20–40 per can", "Easy DIY"],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Where to Insulate">
          <UL items={[
            "Pipes running through exterior walls (highest priority)",
            "Pipes in unheated basements or crawlspaces",
            "Pipes in unheated garage ceilings (if there is plumbing above garage)",
            "Pipes in unheated mechanical rooms",
            "Under kitchen and bathroom sinks on exterior walls — open cabinet doors during extreme cold",
            "Any pipe within 12 inches of an exterior wall in a north-facing room",
          ]} />
        </DocSubSection>

        <DocChecklist category="Pipe Protection 12-Item Checklist" items={[
          "Identify all pipes on exterior walls and in unheated spaces",
          "Install foam pipe insulation on all at-risk pipes",
          "Install thermostatically controlled heat tape on highest-risk pipes",
          "Plug heat tape into GFCI outlet — confirm GFCI is functional",
          "Locate main water shutoff — know how to turn it off in 10 seconds",
          "Shut off and drain all exterior faucets — confirm hoses disconnected",
          "Keep interior temperature minimum 55°F even when vacant",
          "If leaving property vacant: shut main water off, drain all fixtures",
          "Inform neighboring units to contact you if your unit goes cold",
          "Have emergency plumber contact saved in phone with 24hr response",
          "Know the drip technique: run both hot and cold faucet at a drip during extreme cold events (-10°F+)",
          "Inspect crawlspace insulation and vapor barrier condition before winter",
        ]} />

        <DocCallout type="warning" title="If a Pipe Freezes">
          <Bold>Never use open flame to thaw a frozen pipe.</Bold> Use a hair dryer on low heat, starting at the faucet end and working toward the frozen section. Never assume a frozen pipe has not already cracked — keep towels handy and be ready to shut off the main valve immediately when thaw begins. If you cannot locate the frozen section, call a licensed plumber.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="insulation" title="Insulation & Air Sealing" subtitle="The foundation of winter efficiency and ice dam prevention">
        <DocSubSection title="NH Minimum R-Values (2020 NH Energy Code)">
          <DocTable
            headers={["Location", "NH Minimum", "Recommended for NH Climate", "DIY Possible?"]}
            rows={[
              ["Attic (most critical)", "R-49", "R-60", "Yes — blown-in cellulose"],
              ["Cathedral ceiling", "R-49", "R-60", "No — requires contractor"],
              ["Exterior walls (new)", "R-20 or R-13+R-5ci", "R-21", "Not without major renovation"],
              ["Basement walls (interior)", "R-15 continuous", "R-19", "Yes — rigid foam + framing"],
              ["Crawlspace walls", "R-15", "R-19", "Yes — rigid foam"],
              ["Slab edge", "R-10 (2 ft)", "R-15", "Contractor for existing slab"],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Air Sealing Priority Areas">
          <P>Air sealing delivers more energy savings per dollar than additional insulation in most NH homes. Target these locations first:</P>
          <UL items={[
            "Attic hatch: add weatherstripping and rigid foam insulated cover box",
            "Recessed can lights in attic floor (major source of air and heat loss)",
            "Top plates where interior walls meet attic — use caulk or spray foam",
            "Plumbing and electrical penetrations through top plates",
            "Rim joist area in basement — rigid foam + acoustic sealant",
            "Around window and door rough openings — low-expansion spray foam",
            "Fireplace damper — use damper balloon when not in use",
          ]} />
        </DocSubSection>

        <DocCallout type="key" title="Eversource NH Insulation Rebates">
          Eversource NH offers up to $2,000 in rebates for qualifying insulation projects. Attic insulation to R-49 typically qualifies. An energy audit is required first — Eversource pays $150 toward the audit cost. The combination of rebates + energy savings typically yields 2–4 year payback in NH.
        </DocCallout>

        <DocLink href="https://www.nhsaves.com/">NHSaves — NH Utility Rebate Programs for Insulation and Efficiency</DocLink>
      </DocSection>

      <PageBreak />

      <DocSection id="schedule" title="Vendor Schedule Template" subtitle="Who to call and when — October through March">
        <DocTable
          headers={["Month", "Task", "Vendor Type", "When to Book"]}
          rows={[
            ["October", "Furnace/boiler annual tune-up", "Licensed HVAC technician", "Book in September"],
            ["October", "Chimney inspection and sweep (if wood-burning)", "Chimney sweep", "Book in August/September"],
            ["October", "Snow removal contract signed", "Snow removal company", "Book by September 1"],
            ["October", "Final gutter cleaning", "Gutter company or handyman", "After leaves fall"],
            ["November", "Plumber winterization (vacant units)", "Licensed plumber", "As needed, book early"],
            ["November", "Generator service and test run", "Generator service company", "Annual — October ideal"],
            ["December", "Roof inspection after first major snow", "Roofing contractor", "As conditions allow"],
            ["January", "Roof raking after accumulation events", "Snow removal company or DIY", "Within 24 hours of storm end"],
            ["February", "Ice dam treatment (if forming)", "Ice dam removal specialist", "Emergency basis"],
            ["March", "Spring roof inspection (check for winter damage)", "Licensed roofing contractor", "Book early — spring is busy"],
          ]}
        />

        <DocCallout type="tip" title="Sign Snow Removal Contract Early">
          NH snow removal companies fill their route capacity by September 1 each year. If you contact them in November, they may not have capacity to serve your property. Sign your contract in August or September for guaranteed service through spring.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="storm" title="Storm Response Protocol" subtitle="Before, during, and after every major winter storm">
        <DocSubSection title="Before the Storm (24–48 Hours Out)">
          <DocChecklist category="Pre-Storm Preparation" items={[
            "Fill vehicle gas tanks (gas stations run out during major storms)",
            "Check and fill gas cans for generator — add fuel stabilizer",
            "Restock ice melt (calcium chloride works to -25°F)",
            "Confirm snow removal contractor is aware and on schedule",
            "Check backup heating source — propane heater, pellet stove, or electric baseboard",
            "Fill bathtubs with water as backup supply if concerned about pipes",
            "Charge all backup battery packs",
            "Download utility outage reporting apps (Eversource, Liberty)",
            "Confirm generator is functional — 30-minute load test",
            "Move vehicles to allow snow removal access to parking lots",
          ]} />
        </DocSubSection>

        <DocSubSection title="During the Storm">
          <DocChecklist category="During Storm Actions" items={[
            "Monitor snow accumulation — begin plowing at trigger depth per contract",
            "Apply ice melt to walkways and stairs before ice forms (not after)",
            "Check roof rake availability — rake eaves if accumulation exceeds 4 inches",
            "Monitor interior temperatures in all units — confirm heat is functioning",
            "Check in on elderly or vulnerable tenants by phone",
            "Keep utility company numbers accessible",
            "Do NOT use portable generator indoors under any circumstances",
          ]} />
        </DocSubSection>

        <DocSubSection title="After the Storm">
          <DocChecklist category="Post-Storm Inspection" items={[
            "Inspect roof from ground for visible sagging or ice dam formation",
            "If roof snow exceeds 18–24 inches, consider calling roofing contractor for removal",
            "Check all downspouts are draining — not blocked by ice",
            "Inspect foundation perimeter for water pooling from snowmelt",
            "Check all exterior mechanical equipment — buried exhausts are dangerous",
            "Verify furnace and water heater vents are clear of snow and ice",
            "Walk all parking and walking surfaces — address slip hazards",
            "Inspect any exposed pipes after extreme cold event for damage",
            "If pipe appears to have burst: shut main water valve immediately",
            "Document all storm-related damage with photos for insurance purposes",
          ]} />
        </DocSubSection>

        <DocCallout type="law" title="NH Landlord Responsibility for Snow Removal">
          NH courts have consistently held that landlords are responsible for maintaining safe access to rental properties. Failure to remove snow and ice from walkways within a reasonable time can result in significant liability for slip-and-fall injuries. Document all snow removal activities with time-stamped photos.
        </DocCallout>
      </DocSection>
    </div>
  );
}
