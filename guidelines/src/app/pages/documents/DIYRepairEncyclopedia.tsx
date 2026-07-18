import { DocSection, DocSubSection, DocCallout, DocChecklist, DocTable, DocSteps, DocLink, P, UL, Bold, PageBreak, DocDivider } from './DocComponents';

export default function DIYRepairEncyclopedia() {
  return (
    <div>
      <DocSection id="safety" title="Safety First" subtitle="Rules, PPE, and when to get permits in NH">
        <DocCallout type="warning" title="Electrical Safety Rules — Always Follow">
          <UL items={[
            "Turn off the breaker before ANY electrical work and tape it with a note",
            "Use a non-contact voltage tester to verify power is off before touching wires",
            "Never work on electrical when you're tired, rushed, or alone",
            "Never open the main electrical panel — hire a licensed electrician",
            "Never work in wet conditions near electrical",
          ]} />
        </DocCallout>

        <DocSubSection title="Required PPE by Task">
          <DocTable
            headers={["Task", "Required PPE"]}
            rows={[
              ["Painting", "Safety glasses, nitrile gloves, respirator for oil-based or spray"],
              ["Drywall patching", "N95 mask, safety glasses, gloves"],
              ["Electrical work", "Insulated gloves, voltage tester, safety glasses"],
              ["Plumbing", "Gloves, safety glasses, knee pads"],
              ["Attic work", "N95 or P100 respirator, safety glasses, gloves, long sleeves"],
              ["Power tools", "Safety glasses, hearing protection, work gloves (not loose)"],
              ["Chemical drain cleaners", "Chemical-resistant gloves, safety glasses, ventilation"],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="When to Pull a Permit in NH">
          <P>NH RSA 155-A requires building permits for many types of work. Unpermitted work can void your homeowner's insurance, create problems at resale, and expose you to liability.</P>
          <DocTable
            headers={["Work Type", "Permit Required?", "Notes"]}
            rows={[
              ["Structural changes (remove/add walls)", "Yes", "Requires engineering in some cases"],
              ["Electrical (new circuits or panel)", "Yes", "Licensed electrician usually required"],
              ["Plumbing (new fixtures or lines)", "Yes", "Contact your NH municipality"],
              ["HVAC (new system or change fuel type)", "Yes", "NH requires licensed HVAC contractor"],
              ["Roofing (replacement)", "Sometimes", "Varies by town; always check"],
              ["Deck addition", "Yes", "Structural, frost footings required"],
              ["Adding a bathroom", "Yes", "Plumbing and electrical permits"],
              ["Cosmetic repairs (drywall, paint)", "No", "No permit needed"],
              ["Replacing fixtures (same location)", "Usually no", "Verify with your town"],
            ]}
          />
          <DocLink href="https://www.nh.gov/safety/divisions/bcs/fmo/">NH Building Codes — Division of Fire Standards</DocLink>
          <br />
          <DocCallout type="law" title="Call 811 Before Digging">
            NH law requires you to call 811 (Dig Safe) at least 72 hours before any digging project, even shallow planting or fence posts. Utilities will mark underground lines for free. Failure to call can result in fines and liability for utility damage.
          </DocCallout>
          <DocLink href="https://www.digsafe.com/">Dig Safe NH — Call 811 or Visit digsafe.com</DocLink>
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="plumbing" title="Plumbing" subtitle="The most common DIY plumbing repairs">
        <DocSubSection title="Fixing a Running Toilet">
          <P>A running toilet wastes up to 200 gallons of water per day. The fix is almost always one of three components inside the tank.</P>
          <DocSubSection title="The 3 Causes">
            <DocTable
              headers={["Cause", "Symptom", "Part Needed", "Cost"]}
              rows={[
                ["Flapper", "Constant running, water at back of bowl", "Replacement flapper ($5–15)", "DIY"],
                ["Fill valve", "Tank fills slowly or runs after filling", "Fill valve kit ($10–20)", "DIY"],
                ["Float", "Water runs into overflow tube", "Float adjustment or replacement", "DIY"],
              ]}
            />
          </DocSubSection>
          <DocSteps steps={[
            { title: "Shut Off Water", body: "Turn the shutoff valve behind/below the toilet clockwise until fully closed. Flush to empty the tank." },
            { title: "Diagnose the Cause", body: "Put a few drops of food dye in the tank. If dye appears in the bowl without flushing, the flapper is leaking. If water is running into the overflow tube, the float needs adjustment." },
            { title: "Replace the Flapper", body: "Disconnect the flapper chain from the handle arm. Unhook the flapper ears from the overflow tube pegs. Install new flapper — bring old one to hardware store for match. Universal flappers fit most toilets." },
            { title: "Adjust or Replace Float", body: "If water level is above the overflow tube: bend the float arm down (older toilets) or turn the adjustment screw (newer ballcock valves). Water level should be 1 inch below the top of the overflow tube." },
            { title: "Test", body: "Turn water back on, let tank fill, and flush. Listen for any residual running after 30 seconds. If running persists, the fill valve likely needs replacement." },
          ]} />
          <DocChecklist category="Running Toilet Fix Checklist" items={[
            "Locate shutoff valve behind toilet",
            "Purchase correct flapper (measure or bring old one)",
            "Purchase fill valve kit as backup ($10–20)",
            "Turn off water, flush to drain tank",
            "Identify cause before replacing parts",
            "Test with food dye after replacement",
            "Confirm full tank refill in under 3 minutes",
          ]} />
        </DocSubSection>

        <DocSubSection title="Unclogging Drains">
          <DocSteps steps={[
            { title: "Plunger First", body: "For sink and tub clogs, use a cup plunger (not a flange plunger — that's for toilets). Cover the overflow drain with a wet rag. Create a tight seal and plunge 15–20 times vigorously.", badge: "Try First" },
            { title: "Drain Snake", body: "Feed a 25-foot hand snake into the drain, rotating as you push. When you hit resistance, continue rotating to hook or break up the clog. Retrieve and clean the snake.", badge: "Most Effective" },
            { title: "Chemical Drain Cleaner", body: "Use as last resort only. Chemical cleaners damage older pipes over time and are hazardous. Never use after any other chemical has been applied. Never use on complete blockages.", badge: "Last Resort" },
          ]} />
          <DocCallout type="tip" title="Prevent Hair Clogs">
            Install $3 mesh drain screens in every shower. Clean them weekly. This eliminates 80% of bathroom drain clogs entirely.
          </DocCallout>
        </DocSubSection>

        <DocSubSection title="Fixing a Leaky Faucet">
          <DocSteps steps={[
            { title: "Shut Off Supply Valves", body: "Under the sink, turn both hot and cold supply valves clockwise to fully close. Open the faucet to release pressure." },
            { title: "Remove Handle", body: "Remove decorative cap, unscrew handle screw, pull handle off. For cartridge faucets, pull the cartridge straight up." },
            { title: "Replace Washer or Cartridge", body: "Ball faucets: replace the seats, springs, and ball. Cartridge: pull out and replace (brand and model specific). Compression: replace rubber washer at base of stem." },
            { title: "Reassemble and Test", body: "Reassemble in reverse order. Turn water back on slowly. Test for leaks at all connections." },
          ]} />
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="electrical" title="Electrical Safety & Basic Repairs" subtitle="What you can safely do — and what you cannot">
        <DocCallout type="warning" title="Never Open the Main Electrical Panel">
          The main service entrance inside your electrical panel is always energized — even with the main breaker off. Only a licensed NH electrician should work inside the panel. Touching main service conductors can kill instantly.
        </DocCallout>

        <DocSubSection title="GFCI Outlets — What, Where, and How">
          <P>Ground Fault Circuit Interrupter (GFCI) outlets protect you from electrocution by detecting tiny current leaks and cutting power in milliseconds. NH building code (based on NEC 2020) requires GFCI protection in:</P>
          <UL items={[
            "All bathroom outlets (within 6 feet of any water source)",
            "Kitchen countertop outlets within 6 feet of sink",
            "Garage outlets",
            "Unfinished basement outlets",
            "Outdoor outlets",
            "Crawlspace outlets",
            "Pool/spa areas",
          ]} />
          <DocSteps steps={[
            { title: "Test Your GFCIs Monthly", body: "Press the TEST button — the outlet should go dead. Press RESET to restore power. If the outlet doesn't trip on TEST, replace it immediately." },
            { title: "Replace a GFCI Outlet", body: "Shut off the breaker and verify with voltage tester. Remove the old outlet. Match LINE terminals to incoming power wires (use the label on the back — LINE = power in, LOAD = protected outlets downstream). Connect ground wire to green screw. Fold wires in and mount." },
            { title: "Reset a Tripped GFCI", body: "Look for the GFCI outlet with the RESET button — often one outlet protects several downstream. Press RESET firmly. If it immediately trips again, there is a wiring fault downstream — call an electrician." },
          ]} />
        </DocSubSection>

        <DocSubSection title="Resetting Breakers">
          <DocSteps steps={[
            { title: "Identify the Tripped Breaker", body: "Tripped breakers are usually in the middle position (between ON and OFF) and may be a different color. Open the panel cover and look for the one that's not fully to the ON side." },
            { title: "Reset Correctly", body: "Push the breaker firmly to the OFF position first, then push to ON. Skipping the OFF step is a common mistake that prevents proper reset." },
            { title: "Identify the Cause", body: "If the breaker trips again immediately, there is a fault in a device or wiring on that circuit — unplug all devices and try again. Repeated tripping indicates a wiring problem requiring an electrician." },
          ]} />
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="drywall" title="Drywall & Painting" subtitle="Patches, prep, and a perfect finish">
        <DocSubSection title="Small Hole Patch (Under 6 Inches)">
          <DocSteps steps={[
            { title: "Clean the Hole", body: "Remove any loose paper or crumbling gypsum. For nail holes, just use the putty knife. For holes up to 4 inches, use a self-adhesive mesh patch." },
            { title: "Apply Joint Compound", body: "Apply all-purpose joint compound (not spackling for holes over 1/2 inch — it shrinks too much). Feather the edges out 6–8 inches. Let dry fully (24 hours minimum — do not rush)." },
            { title: "Sand Smooth", body: "Sand with 120-grit, then 220-grit. The goal is smooth transition from patch to wall — not just covering the hole. Wear an N95 mask." },
            { title: "Prime and Paint", body: "Always prime drywall patches before painting. Unprimed patches will show as flat spots even through paint. Use PVA drywall primer, let dry, then paint 2 coats." },
          ]} />
        </DocSubSection>

        <DocSubSection title="Large Hole Repair (Over 6 Inches) — Backing Board Method">
          <DocSteps steps={[
            { title: "Cut Clean Opening", body: "Use a drywall saw to cut the damaged area into a clean rectangle or square. Straight lines make patching much easier." },
            { title: "Install Backing Boards", body: "Cut two 1x4 lumber pieces longer than the hole height. Insert through the hole, hold against the inside face of the drywall, and screw the existing drywall to them with drywall screws." },
            { title: "Cut and Install Patch Piece", body: "Cut a piece of drywall to fit the hole exactly. Screw it into the backing boards. Use drywall tape (mesh or paper) over all four seams." },
            { title: "Compound, Sand, Prime, Paint", body: "Apply 3 thin coats of joint compound over the tape, sanding between each. Prime and paint as with small holes." },
          ]} />
        </DocSubSection>

        <DocSubSection title="Painting Prep Checklist">
          <DocChecklist category="Painting Prep" items={[
            "Repair all holes and cracks before painting",
            "Clean walls with TSP or sugar soap solution to remove grease",
            "Sand any glossy surfaces for adhesion",
            "Apply painter's tape to trim, outlets, and ceiling line",
            "Remove outlet and switch covers",
            "Lay drop cloths — canvas preferred over plastic (less slipping)",
            "Prime any patched areas or new drywall",
            "Use primer on color changes from dark to light",
            "Have wet rag ready for drips — wipe immediately",
          ]} />
        </DocSubSection>

        <DocCallout type="tip" title="Paint Coverage Calculator">
          One gallon of paint covers approximately 400 square feet with one coat. Calculate: (Room perimeter × ceiling height) ÷ 400 = gallons needed. Round up, and add one extra gallon for future touch-ups. Store leftovers inverted in a cool location.
        </DocCallout>
      </DocSection>

      <PageBreak />

      <DocSection id="weatherproofing" title="Weatherproofing" subtitle="Stopping air and water infiltration">
        <DocSubSection title="Caulking Windows and Doors">
          <DocTable
            headers={["Location", "Best Caulk Type", "Notes"]}
            rows={[
              ["Exterior window frames", "Paintable silicone or polyurethane", "Must flex with temperature changes"],
              ["Interior window trim", "Latex paintable caulk", "Easier to apply and paint"],
              ["Exterior door frames", "Polyurethane caulk", "Very durable, UV resistant"],
              ["Bathroom tile/tub", "100% silicone", "Mold resistant; requires clean dry surface"],
              ["Foundation to sill plate", "Polyurethane foam + caulk", "Major air sealing opportunity"],
            ]}
          />
          <DocSteps steps={[
            { title: "Prepare the Surface", body: "Remove all old caulk with a caulk remover tool or putty knife. Clean with rubbing alcohol. Surface must be dry — do not caulk in rain or when temperatures are below 40°F." },
            { title: "Cut the Tip at 45°", body: "Cut the caulk tube tip at a 45-degree angle to get a bead size matching your gap. Smaller is better — you can always add more." },
            { title: "Apply Steady Bead", body: "Pull the caulk gun smoothly along the joint at a consistent speed. Keep slight pressure into the gap. Don't stop and start or you'll get lumps." },
            { title: "Tool the Bead", body: "Run a wet finger or plastic caulk tool along the bead to press it into the joint and create a smooth concave surface. Clean up excess immediately with a damp rag." },
          ]} />
        </DocSubSection>

        <DocSubSection title="NH Minimum Insulation R-Values">
          <DocTable
            headers={["Location", "NH Minimum R-Value", "Recommended", "Notes"]}
            rows={[
              ["Attic (new construction)", "R-49", "R-60", "Most important upgrade for NH homes"],
              ["Exterior Walls", "R-20 (or R-13 + R-5 CI)", "R-21+", "Existing walls: blow-in insulation"],
              ["Basement Walls (interior)", "R-15 (continuous)", "R-19", "Rigid foam + framing common"],
              ["Crawlspace Walls", "R-15", "R-19", "Include vapor barrier on floor"],
              ["Slab (perimeter)", "R-10", "R-15", "2-foot horizontal or 4-foot vertical"],
            ]}
          />
          <DocCallout type="info" title="Air Sealing Priority Areas">
            Air sealing often delivers more energy savings than additional insulation. Top priority areas: attic hatch (add weatherstripping and rigid foam cover), recessed can lights in attic floor, plumbing and electrical penetrations through top plates, rim joists in basement.
          </DocCallout>
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="winterization" title="NH Winterization Deep-Dive" subtitle="Protecting pipes, systems, and your home from NH winters">
        <P>NH winters are unforgiving. Water freezes at 32°F but pipes in exterior walls or unheated spaces can freeze when outdoor temperatures drop below 20°F. A burst pipe releases 250+ gallons per hour — a catastrophic loss.</P>

        <DocSubSection title="Pipe Protection Methods">
          <DocTable
            headers={["Method", "Best For", "Cost", "Notes"]}
            rows={[
              ["Foam pipe insulation", "Interior pipes in unheated spaces", "$0.50–1.50/LF", "Easy DIY; provides R-2 to R-4"],
              ["Fiberglass wrap", "Pipes needing higher insulation", "$1–3/LF", "Better for very cold spaces"],
              ["Heat tape (self-regulating)", "Exterior walls, problem pipes", "$1–3/LF installed", "Plug into GFCI outlet; use thermostatically controlled"],
              ["Drip technique", "Extreme cold events only", "Free", "Drip hot and cold 1 drop/second; drains water heater but prevents freeze"],
              ["Minimum 55°F interior", "Whole house", "Ongoing heating cost", "Never let heated interior fall below 55°F even vacant"],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Exterior Faucet Winterization">
          <DocSteps steps={[
            { title: "Locate Interior Shutoff", body: "Most exterior faucets have a dedicated interior shutoff valve — look in the basement or crawlspace directly behind the faucet. Some older homes do not have these; retrofit is worth the $15 valve and 2 hours of work." },
            { title: "Close Interior Valve", body: "Shut the interior valve clockwise to fully closed." },
            { title: "Open Exterior Faucet", body: "Go outside and open the exterior faucet handle fully. This allows residual water to drain out so there is nothing to freeze in the pipe." },
            { title: "Disconnect Hoses", body: "Remove all garden hoses from exterior faucets. A connected hose traps water in the pipe even on frost-free spigots, preventing proper drainage." },
            { title: "Install Insulating Cover", body: "Install a foam faucet cover over the exterior faucet ($3–5 at any hardware store). These provide modest insulation against brief cold snaps." },
          ]} />
        </DocSubSection>

        <DocSubSection title="47-Item NH Winterization Checklist">
          <DocChecklist category="Exterior" items={[
            "Clean and clear gutters of leaves and debris",
            "Inspect roof for damaged or missing shingles",
            "Check flashing around chimney, skylights, and vents",
            "Trim branches overhanging roof by more than 6 feet",
            "Seal cracks in foundation walls with hydraulic cement",
            "Caulk any gaps around exterior penetrations (pipes, wires, vents)",
            "Disconnect and drain all garden hoses",
            "Shut off and drain irrigation system — blow out with compressed air",
            "Winterize exterior faucets — close interior shutoff, open exterior valve",
            "Cover exterior AC condenser with breathable cover (not plastic)",
            "Store or secure outdoor furniture and decorations",
            "Check exterior lighting for burned bulbs and water intrusion",
          ]} />
          <DocChecklist category="Roof & Ice Dam Prevention" items={[
            "Inspect attic insulation depth — confirm R-49 minimum",
            "Air seal attic floor penetrations before adding insulation",
            "Confirm attic ventilation is unobstructed",
            "Purchase roof rake for snow removal after storms",
            "Inspect chimney cap and flashing",
            "Clean chimney if wood-burning (annual requirement for safe use)",
          ]} />
          <DocChecklist category="Plumbing" items={[
            "Insulate pipes in exterior walls and unheated spaces",
            "Identify any pipes in garage ceiling — insulate or heat tape",
            "Install heat tape on problem pipes — plug into GFCI outlet",
            "Know location of main water shutoff — label it",
            "Drain and store hose reel",
            "Turn off irrigation system backflow preventer and drain",
            "Check water heater temperature — set to 120°F",
            "Have emergency plumber contact saved in phone",
          ]} />
          <DocChecklist category="Heating System" items={[
            "Schedule annual furnace or boiler tune-up (do this in September)",
            "Replace HVAC filter — use MERV 8 or higher",
            "Test thermostat in heat mode before temperatures drop",
            "Bleed radiators if hot water heat system",
            "Confirm oil tank is filled or propane contract is in place",
            "Check and replace humidifier water panel if applicable",
            "Test emergency heat backup if heat pump is primary",
            "Program setback thermostat — minimum 65°F when occupied, 60°F setback",
            "Replace thermostat batteries",
          ]} />
          <DocChecklist category="Safety & Emergency Prep" items={[
            "Test all smoke detectors — replace batteries",
            "Test all CO detectors — replace batteries",
            "Check fire extinguisher pressure gauge",
            "Fill gas cans for generator (add fuel stabilizer)",
            "Test generator under load — run 30 minutes with appliances connected",
            "Stock ice melt — calcium chloride works to -25°F vs. rock salt to +5°F",
            "Check backup heating source (space heater, pellet stove)",
            "Review emergency contact list with all household members",
            "Identify warming center locations in your town for extended outages",
          ]} />
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="flooring" title="Flooring Repairs" subtitle="Squeaks, scratches, and simple replacements">
        <DocSubSection title="Fixing Squeaky Floors">
          <DocTable
            headers={["Method", "Access Needed", "Difficulty", "Materials"]}
            rows={[
              ["Screws from above (carpet)", "From above through carpet", "Easy", "Snap-off screw kit ($20)"],
              ["Screws from above (hardwood)", "From above through floor", "Medium", "Ring-shank nails or finish screws, plug kit"],
              ["Adhesive from below", "Basement/crawlspace access", "Easy", "Construction adhesive, caulk gun"],
              ["Shim joist gap", "Basement access", "Easy", "Wood shims, construction adhesive"],
              ["Steel bridging", "Basement access", "Medium", "Steel bridging, drill"],
            ]}
          />
        </DocSubSection>

        <DocSubSection title="Fixing Hardwood Scratches">
          <DocTable
            headers={["Scratch Depth", "Fix", "Cost"]}
            rows={[
              ["Surface/finish only", "Apply touch-up marker or wax stick matching floor color", "$5–15"],
              ["Into wood grain", "Fill with wood filler, sand flush, apply finish", "$20–40"],
              ["Deep gouge", "Wood filler, sand, spot stain, finish", "$40–80 DIY"],
              ["Multiple/widespread", "Professional refinishing", "$3–5/SF professional"],
            ]}
          />
        </DocSubSection>
      </DocSection>

      <PageBreak />

      <DocSection id="appliances" title="Appliance Maintenance" subtitle="Extend the life of every major appliance">
        <DocChecklist category="Monthly" items={[
          "Clean dishwasher filter (bottom of tub, twist and lift)",
          "Check refrigerator door seals for tears or poor seal",
          "Empty and clean lint trap before every dryer load",
        ]} />
        <DocChecklist category="Every 3 Months" items={[
          "Run dishwasher cleaning cycle with citric acid tablet",
          "Replace HVAC filter (1-inch filters monthly; 4-inch filters every 6 months)",
          "Check dryer vent exterior cap is unobstructed",
          "Clean refrigerator coils with coil brush (under/behind unit)",
        ]} />
        <DocChecklist category="Annually" items={[
          "Have furnace or boiler professionally serviced",
          "Clean dryer vent duct — full run from machine to exterior",
          "Flush water heater tank to remove sediment",
          "Clean washing machine drum and door gasket with hot water cycle and cleaner",
          "Inspect refrigerator water line for leaks (if ice maker equipped)",
          "Test dishwasher water temperature — should reach 120°F at wash",
        ]} />
      </DocSection>

      <PageBreak />

      <DocSection id="hire-pro" title="When to Hire a Professional" subtitle="Know the limits of DIY">
        <DocTable
          headers={["Task", "DIY OK?", "Why"]}
          rows={[
            ["Unclogging drains", "Yes", "No permit, low risk, easy tools"],
            ["Patching drywall", "Yes", "Cosmetic, low risk"],
            ["Painting", "Yes", "Skill-based, no safety risk"],
            ["Replacing GFCI outlets", "Yes with care", "Low voltage, clear instructions"],
            ["Replacing toilet flapper", "Yes", "Shut off water, simple parts"],
            ["Fixing leaky faucet", "Yes", "Shut off water, common parts"],
            ["Adding a new circuit", "No — hire electrician", "Permit required, safety risk"],
            ["Opening main electrical panel", "Never — hire electrician", "Always energized, fatal risk"],
            ["Gas line work", "Never — hire plumber", "Explosive risk, NH law requires licensed plumber"],
            ["Structural wall removal", "No — hire engineer first", "Could be load-bearing, collapse risk"],
            ["Roof replacement", "Strongly advise hiring", "Fall risk, warranty requires pro install"],
            ["Asbestos/lead paint removal", "No — hire certified contractor", "NH law, health and liability"],
            ["Septic system work", "No — hire licensed septic contractor", "NH DES regulations, health risk"],
            ["Any work requiring permit", "Get permit; contractor may still be required", "Unpermitted work is a liability at resale"],
          ]}
        />

        <DocCallout type="law" title="NH Licensed Trade Requirements">
          NH requires licensing for plumbers, electricians, HVAC technicians, and other trades. Verify any contractor at <Bold>nh.gov/safety</Bold>. Hiring unlicensed tradespeople for permitted work voids your homeowner's insurance coverage for resulting damage.
        </DocCallout>

        <DocLink href="https://www.nh.gov/safety/divisions/fsem/contractor-licensing/">Verify NH Contractor Licenses</DocLink>
      </DocSection>
    </div>
  );
}
