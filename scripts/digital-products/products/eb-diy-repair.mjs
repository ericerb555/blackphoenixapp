/**
 * DIY Home Repair Encyclopedia — `eb-diy-repair`, $29.
 *
 * THE ONE PRODUCT WHERE BEING WRONG HURTS SOMEBODY
 *
 * Every other product in this catalogue risks money. This one risks a person,
 * so it is built the other way round from a normal repair book: the chapter on
 * what is NEVER do-it-yourself comes first, every procedure carries the thing
 * that actually goes wrong rather than only the steps, and no procedure is
 * included where the failure mode is injury rather than a second attempt.
 *
 * Gas, anything inside the panel, structural alteration, oil burners, asbestos
 * and lead, and roof work at height are all excluded by name and with the
 * reason. New Hampshire licenses electricians, plumbers and gas fitters, and
 * work outside a licence is a problem with the town, with the insurer, and at
 * resale as well as being dangerous.
 *
 * THE LISTING PROMISES PHOTOGRAPHS, WHICH ARE NOT HERE
 *
 * "100+ repair procedures with photos". There are no photographs: none exist
 * for these procedures and the renderer has no image support. That is a real
 * gap against the listing rather than a wording quibble, and it is reported on
 * every run — the honest options are to shoot them, to license them, or to
 * drop the claim. Each procedure instead carries tools, materials with costs,
 * a time, a difficulty and the failure mode, which is the information a
 * photograph does not give.
 */
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';

export const meta = {
  id: 'eb-diy-repair',
  title: 'DIY Home Repair Encyclopedia',
  subtitle: 'Fix it yourself — safely and correctly',
  price: 2900,
  files: ['pdf'],
};

/** Never, with the reason. This chapter comes before any procedure. */
const NEVER_DIY = [
  ['Anything inside the electrical panel', 'The service conductors are live even with the main breaker off. There is no safe way to work in there without the training and the equipment, and the failure mode is not a shock — it is an arc flash.'],
  ['Any gas work at all', 'Supply pipe, appliance connection, a shut-off valve, relighting a pilot on an older appliance. New Hampshire licenses gas fitting. A small leak is not detectable by smell at the concentration that matters, and the consequence is the building.'],
  ['Oil burner servicing', 'The nozzle, the electrodes, the pump pressure. Set wrong it produces carbon monoxide or soot, and it voids the service record an insurer may ask for.'],
  ['Removing or altering anything structural', 'A wall, a beam, a post, notching a joist to run a pipe. If you are unsure whether something is structural, it is, until an engineer says otherwise.'],
  ['Asbestos or lead', 'Old pipe lagging, floor tiles, textured ceilings, pre-1978 paint. Disturbing either releases it. There are licensed specialists for exactly this and the testing is cheap.'],
  ['Roof work at any height', 'Not the repair — the roof. The hazard is the fall, and it is the commonest serious domestic injury in this whole subject. A roof rake from the ground is the limit.'],
  ['New circuits, new outlets, panel changes', 'Licensed electrical work, permitted work, and inspected work. Replacing a faulty switch or outlet on an existing circuit is within reach; adding anything is not.'],
  ['Anything on a ladder you are not steady on', 'Not a category of work — a category of day. The job will wait.'],
];

/**
 * The reference. Each entry is
 * [name, difficulty 1-3, time, tools, materials and cost, what goes wrong].
 *
 * "What goes wrong" is the column that makes this worth money. Steps are
 * available anywhere; the failure mode usually is not, and it is the reason a
 * first attempt becomes a second one.
 */
const PROCEDURES = [
  ['Plumbing', [
    ['Replace a toilet flapper', 1, '15 min', 'None', 'Flapper, $8-14', 'Buying the wrong one. Take the old one to the shop, or photograph the tank markings. A flapper that nearly fits runs constantly and wastes more water than the part costs.'],
    ['Replace a toilet fill valve', 1, '30 min', 'Adjustable wrench, sponge', 'Fill valve, $12-20', 'Not emptying the tank first, and overtightening the plastic nut — it cracks and you have made a leak where there was a drip.'],
    ['Stop a running toilet', 1, '20 min', 'None', '$0-20', 'Replacing parts before identifying which one. Dye in the tank: if it reaches the bowl without flushing, it is the flapper; if the fill never stops, it is the valve.'],
    ['Clear a sink or bath blockage', 1, '30 min', 'Plunger, bucket, drain snake', '$0-15', 'Chemical drain cleaner. It rarely clears a real blockage, it damages older pipes, and it makes the eventual plumber\'s job hazardous. Mechanical first, always.'],
    ['Clean a sink trap', 1, '30 min', 'Bucket, gloves, maybe a wrench', 'Washers, $3', 'Reassembling with the old washer. They are pennies and they are why it drips afterwards.'],
    ['Replace a tap washer or cartridge', 2, '45 min', 'Screwdrivers, adjustable wrench, penetrating oil', 'Cartridge, $10-35', 'Not turning off the supply, and not knowing the make. Photograph the tap and any marking before going to the shop.'],
    ['Replace a shower head', 1, '15 min', 'Adjustable wrench, cloth', 'Head $20-60, PTFE tape $2', 'Gripping the pipe with the wrench and twisting the plumbing inside the wall. Hold the arm still, turn the head.'],
    ['Re-caulk a bath or shower', 1, '1 hr + cure', 'Caulk gun, scraper, cloth', 'Silicone, $8-12', 'Caulking over the old bead, or over damp. Remove it all, let it dry completely, then one continuous bead. Caulk over mould seals the mould in.'],
    ['Replace a flexible supply line', 2, '30 min', 'Adjustable wrenches, bucket', 'Braided line, $10-18', 'Reusing an old line, and overtightening. Braided stainless lines are cheap and the rubber ones fail — replace them on sight at any age.'],
    ['Insulate exposed pipes', 1, '1-2 hr', 'Knife, tape measure', 'Foam sleeve, $1-2 per foot', 'Leaving gaps at the joints and bends, which is exactly where it freezes. Butt the ends and tape them.'],
    ['Drain and winterize an outside tap', 1, '10 min', 'None', '$0', 'Leaving the hose attached. The hose holds water in the tap, which splits inside the wall and is found in April. This is the highest-value ten minutes in the book.'],
    ['Replace a toilet seal (wax ring)', 3, '2 hr', 'Wrench, putty knife, help lifting', 'Wax ring $6, bolts $5', 'Doing it alone. A toilet is heavy and awkward, and dropping it cracks the pan and the floor. Also: do not reuse the ring.'],
    ['Replace a sink pop-up stopper', 2, '45 min', 'Adjustable wrench, pliers', 'Stopper assembly, $15-30', 'Not aligning the pivot rod with the stopper hole, so it will not seal. Fit the stopper first, then the rod through it.'],
    ['Replace a shut-off valve under a sink', 3, '1 hr', 'Two wrenches, bucket, towels', 'Quarter-turn valve, $12-20', 'Doing it without knowing where the main is. Turn the main off first — the valve you are replacing is the one that was meant to let you avoid that.'],
    ['Clear a toilet blockage', 1, '30 min', 'Flange plunger, closet auger', '$12-30', 'Using a cup plunger. A toilet needs a flange plunger to seal the outlet, and a sink plunger will not shift anything.'],
    ['Fit a water leak alarm', 1, '10 min each', 'None', 'Alarm, $12-25 each', 'Putting it where the water will not reach first. Behind the washing machine, under the water heater, under the sink — on the floor, at the lowest point.'],
    ['Adjust water heater temperature', 1, '10 min', 'Screwdriver', '$0', 'Setting it too high. Around 120°F is the usual recommendation — hotter scalds, and on an electric tank it means opening a panel, so switch it off at the breaker first.'],
    ['Flush sediment from a water heater', 2, '1 hr', 'Garden hose', '$0', 'Opening the drain on a tank that has never been flushed and finding the valve will not reseal. On an older tank, think about whether you want to disturb it at all.'],
  ]],
  ['Electrical (low risk only)', [
    ['Replace a light switch', 2, '30 min', 'Screwdrivers, voltage tester', 'Switch, $3-12', 'Not testing that it is dead after switching the breaker off. Breakers are mislabelled constantly. Test at the wires, every time, with a tester you have proved works.'],
    ['Replace an outlet', 2, '30 min', 'Screwdrivers, voltage tester', 'Outlet, $3-15', 'As above, plus wiring it to the wrong terminals. Photograph the existing connections before disconnecting anything.'],
    ['Replace a GFCI outlet', 2, '40 min', 'Screwdrivers, voltage tester', 'GFCI, $18-30', 'Confusing LINE and LOAD. Wired backwards it appears to work and does not protect anything, which is worse than leaving the old one.'],
    ['Replace a ceiling light fitting', 2, '1 hr', 'Screwdrivers, voltage tester, step ladder', 'Fitting, varies', 'Hanging a heavy fitting from a box not rated for it, and assuming the box is earthed. A fan or chandelier needs a rated box.'],
    ['Reset a tripped breaker', 1, '2 min', 'None', '$0', 'Resetting it repeatedly. Once is finding out; twice is a fault. A breaker that keeps tripping is doing its job and the cause needs finding.'],
    ['Test and reset a GFCI', 1, '2 min', 'None', '$0', 'Assuming it works because it has power. Press test, confirm it cuts, press reset. Twice a year.'],
    ['Replace a pull-cord or pendant switch', 1, '20 min', 'Screwdriver, voltage tester', 'Switch, $6-10', 'The usual: not proving it is dead first.'],
    ['Replace a lamp or appliance cord plug', 2, '30 min', 'Screwdriver, wire strippers', 'Plug, $5-9', 'Leaving the outer sheath stripped too far back, so bare conductor sits inside the plug body. Strip the minimum and check nothing is exposed.'],
    ['Replace smoke and CO alarms', 1, '30 min', 'Screwdriver, step ladder', 'Alarms, $15-45 each', 'Replacing the battery on a ten-year-old alarm instead of the alarm. The sensor degrades whether or not the test button works. Note the date on the new one in marker.'],
  ]],
  ['Walls, ceilings and paint', [
    ['Fill a nail hole', 1, '10 min + dry', 'Putty knife, sanding sponge', 'Filler, $6', 'Overfilling and then sanding hard, which digs a crater. Slightly proud, light sand.'],
    ['Patch a small hole in plasterboard', 2, '1 hr over 2 days', 'Putty knife, sanding sponge, patch', 'Patch kit, $8-14', 'One thick coat. Two or three thin coats, each dry, each sanded. A thick coat cracks and shrinks.'],
    ['Patch a large hole', 3, '3 hr over 3 days', 'Saw, putty knife, sanding sponge', 'Board offcut, tape, compound, $20', 'Not backing the hole. Without a backing piece the patch has nothing to sit on and will move.'],
    ['Repair a popped nail or screw', 2, '1 hr over 2 days', 'Screwdriver, putty knife', 'Screws, compound, $8', 'Refastening in the same spot. Put a new screw an inch away into the stud, then remove or set the old one.'],
    ['Fix cracked corner tape', 2, '2 hr over 2 days', 'Knife, putty knife', 'Tape, compound, $12', 'Compounding over loose tape. Cut the loose section out first.'],
    ['Paint a room properly', 2, '1-2 days', 'Brushes, roller, tray, tape, sheets', 'Paint $35-70 per gallon', 'Skipping preparation. Washing, filling and sanding is most of the job and all of the difference. Also: two coats, and cut in by hand before rolling.'],
    ['Deal with a water stain on a ceiling', 2, '2 hr', 'Brush, step ladder', 'Stain blocker $18, paint', 'Painting over it with emulsion. The stain bleeds straight through. A shellac or oil-based blocker first — and find the leak, or it returns.'],
    ['Re-caulk interior trim', 1, '1-2 hr', 'Caulk gun, damp cloth', 'Decorator\'s caulk, $5', 'Using silicone where it will be painted. Silicone does not take paint; use a paintable caulk indoors.'],
    ['Remove and replace skirting or trim', 2, '3 hr', 'Pry bar, mitre saw, nail gun or hammer', 'Trim, $2-6 per foot', 'Prying against the plasterboard rather than against a block, which tears the wall. Scrape the caulk line first.'],
    ['Remove old wallpaper', 2, '1-2 days', 'Scorer, scraper, sprayer', 'Stripper solution, $15-25', 'Scraping dry, which tears the plasterboard face. Score, wet, wait, and let the paste release before the scraper touches it.'],
    ['Fix a sticking interior door', 1, '30 min', 'Screwdriver, plane or sandpaper', '$0-10', 'Planing before checking the hinges. Nine times in ten it is a loose hinge screw, and a longer screw into the stud fixes it in five minutes.'],
  ]],
  ['Doors and windows', [
    ['Replace exterior door weatherstripping', 1, '45 min', 'Knife, tape measure', 'Weatherstrip, $12-25', 'Measuring once. Also compressing it too hard, which stops the door latching.'],
    ['Replace a door threshold or sweep', 2, '1 hr', 'Screwdriver, knife, hacksaw', 'Sweep $15-30', 'Cutting it short. Measure, then cut long and trim.'],
    ['Adjust a door that will not latch', 1, '30 min', 'Screwdriver, chisel', '$0-5', 'Filing the latch. Move the strike plate instead — a sixteenth of an inch is usually the whole problem.'],
    ['Replace a lock cylinder or deadbolt', 2, '45 min', 'Screwdrivers, tape measure', 'Deadbolt, $25-60', 'Buying the wrong backset. Measure from the door edge to the centre of the hole before shopping.'],
    ['Re-key locks after moving in', 2, '1 hr', 'Re-key kit or a locksmith', 'Kit $15-25, or $60-120 for a locksmith', 'Not doing it at all. You do not know how many keys exist.'],
    ['Fix a sagging screen door', 1, '30 min', 'Screwdriver, drill', 'Screws, $5', 'Tightening the existing screws into stripped holes. Longer screws, or a dowel in the hole first.'],
    ['Replace a window sash cord or balance', 3, '2 hr', 'Screwdrivers, pry bar', 'Balance, $15-40', 'Letting the sash fall. Support it before releasing anything, and work on one side at a time.'],
    ['Apply interior window film', 1, '30 min per window', 'Hair dryer, knife, tape measure', 'Film kit, $12-25', 'Applying it to a dirty or damp frame. Clean and dry, or the tape lets go in a week.'],
    ['Replace a window screen mesh', 2, '45 min', 'Spline roller, knife', 'Mesh and spline, $12-20', 'Pulling the mesh tight before rolling the spline. Lay it slack; the roller tensions it.'],
    ['Lubricate hinges, locks and tracks', 1, '30 min', 'Cloth', 'Dry lubricant or graphite, $6-10', 'Using oil in a lock. It attracts grit and the lock gets worse — graphite or a dry lubricant for locks, light oil for hinges only.'],
    ['Replace a storm window pane', 2, '1 hr', 'Spline roller, knife, gloves', 'Glass or acrylic, $15-40', 'Measuring the old glass rather than the frame opening, and not wearing gloves handling cut glass.'],
    ['Seal around a window frame', 1, '1 hr', 'Caulk gun, backer rod for wide gaps', 'Exterior caulk, $8-14', 'Caulking a gap wider than about a quarter inch without backer rod. It sags, splits and fails in a season.'],
  ]],
  ['Heating and cooling', [
    ['Replace a furnace or air handler filter', 1, '5 min', 'None', 'Filter, $8-25', 'Fitting it backwards. The arrow points in the direction of airflow, towards the unit. Also: write the size somewhere you will find it.'],
    ['Bleed a radiator', 1, '10 min each', 'Radiator key, cloth, bowl', 'Key, $3', 'Bleeding with the system hot, and not checking the boiler pressure afterwards. Let it cool, bleed, then top up if the pressure dropped.'],
    ['Replace a thermostat (like for like)', 2, '1 hr', 'Screwdrivers, phone camera', 'Thermostat, $25-150', 'Not photographing the wiring before disconnecting it. The colours are not reliable; the terminal letters are.'],
    ['Clear an outdoor heat pump unit', 1, '20 min', 'Brush, gloves', '$0', 'Using anything hard or sharp on the fins, and clearing it while it is running. Switch it off first.'],
    ['Vacuum baseboard heating fins', 1, '30 min', 'Vacuum, brush', '$0', 'Bending the fins. They transfer the heat; flattened, they do not.'],
    ['Clean a condensate drain', 2, '30 min', 'Wet vacuum, brush', '$0-10', 'Leaving it until it backs up. A blocked condensate drain overflows onto whatever is below the unit.'],
    ['Replace an ERV or HRV filter', 1, '15 min', 'None', 'Filters, $20-45', 'Not knowing the house has one. If there is a ventilation unit in the basement, it has filters and they are almost never changed.'],
    ['Reset a tripped boiler', 1, '10 min', 'None', '$0', 'Resetting repeatedly. Once, and if it goes again, call somebody. Repeated resets on an oil system can flood the chamber.'],
    ['Check and top up boiler pressure', 2, '20 min', 'None, usually', '$0', 'Overfilling. There is a normal range marked on the gauge; above it the relief valve discharges and you have a different problem.'],
  ]],
  ['Exterior and roof (from the ground)', [
    ['Clear gutters', 2, '2 hr', 'Ladder, gloves, scoop, bucket', '$0-20', 'The ladder. More people are hurt doing this than any other job here. Three points of contact, never overreach, and move the ladder rather than leaning.'],
    ['Reattach a loose downspout', 1, '30 min', 'Drill, ladder', 'Brackets, screws, $10', 'Not extending the discharge away from the foundation, which is the whole point of the downspout.'],
    ['Add a downspout extension', 1, '20 min', 'Hacksaw', 'Extension, $8-15', 'Discharging onto a path that then ices over.'],
    ['Reseal around a hose tap or vent penetration', 1, '30 min', 'Caulk gun, scraper', 'Exterior sealant, $8', 'Sealing over wet or dirty surfaces, and using interior caulk outside.'],
    ['Replace a cracked window sill or trim piece', 3, '3 hr', 'Saw, pry bar, drill', 'Trim, primer, paint, $25-60', 'Not priming the back and ends of the new piece before fitting. Unprimed end grain is where the next rot starts.'],
    ['Tighten or replace deck railings', 2, '2 hr', 'Drill, socket set', 'Hardware, $15-40', 'Treating it as cosmetic. Push every railing hard — this is the one on this list where the failure is somebody falling.'],
    ['Replace a deck board', 2, '1 hr', 'Saw, drill, pry bar', 'Board, $12-25', 'Fixing the new board without checking the joist under it. If the board rotted, look at what it was sitting on.'],
    ['Reseal or stain a deck', 2, '2 days', 'Brush, roller, cleaner, sander', 'Cleaner and stain, $80-180', 'Applying to damp wood or in direct sun. Also skipping the cleaning, which is most of the result.'],
    ['Seal coat a driveway', 2, '1 day + cure', 'Squeegee, brush, broom', 'Sealer, $120-250', 'Doing it when rain is forecast within 24 hours, or below about 50°F. Also doing it too often — every three to five years, not annually.'],
    ['Replace a dryer or bath vent hood screen', 1, '30 min', 'Screwdriver, ladder', 'Hood, $12-20', 'Fitting a hood with a fine mesh on a dryer vent. It clogs with lint within weeks and becomes a fire risk — dryer hoods take a flap, not a screen.'],
    ['Patch a driveway crack or hole', 1, '2 hr', 'Trowel, broom', 'Crack filler or patch, $20-50', 'Filling a dirty crack. Blow it out and brush it first, or it lifts within a year.'],
  ]],
  ['Weatherization — the New Hampshire chapter', [
    ['Air seal around a plumbing or wiring penetration', 1, '30 min', 'Caulk gun or foam gun', 'Sealant or foam, $8-15', 'Using expanding foam where it will push something out of place. Minimal-expansion foam around frames, ordinary foam only in open cavities.'],
    ['Air seal the attic hatch', 1, '1 hr', 'Knife, staple gun', 'Weatherstrip and rigid insulation, $25-40', 'Insulating the hatch without weatherstripping it. The air leak matters more than the R-value.'],
    ['Seal rim joists in the basement', 2, '3 hr', 'Knife, caulk gun', 'Rigid foam and sealant, $60-120', 'Leaving gaps. The rim joist is one of the largest single leaks in most houses and it is also one of the easiest to reach.'],
    ['Insulate attic hatch and access', 1, '1 hr', 'Knife, adhesive', 'Rigid insulation, $20-35', 'See above. These two are listed separately because people do one and not the other.'],
    ['Add attic insulation (loose or batt)', 2, '1 day', 'Rake, mask, lights, boards to kneel on', '$0.60-1.40 per sq ft', 'Blocking the soffit vents, which converts an insulation job into an ice dam. Baffles first, always.'],
    ['Fit draught excluders on outlets and switches', 1, '30 min', 'Screwdriver', 'Foam gaskets, $8', 'Expecting much from it. Cheap and easy and a small effect — do it, but do the rim joist first.'],
    ['Insulate hot water pipes', 1, '1 hr', 'Knife', 'Foam sleeve, $1-2 per foot', 'Only doing the easy-to-reach runs. The cold ones in unheated space matter more.'],
    ['Fit a water heater blanket', 1, '45 min', 'Knife, tape', 'Blanket, $25-40', 'Covering the controls, the relief valve or the flue on a gas unit. On a gas tank, read the manufacturer\'s guidance before fitting one at all.'],
    ['Weatherstrip a loft or basement door', 1, '45 min', 'Knife, tape measure', 'Weatherstrip, $12-20', 'Treating an interior door to unheated space as interior. It is an exterior door in practice.'],
    ['Reverse ceiling fans for winter', 1, '5 min', 'Step ladder', '$0', 'Nothing much. Free, and genuinely noticeable in a room with a high ceiling.'],
  ]],
  ['Floors', [
    ['Fix a squeaking floor from below', 2, '1 hr', 'Drill, shims, adhesive', 'Shims and screws, $10', 'Shimming too hard, which lifts the board and creates a new squeak next to the old one.'],
    ['Fix a squeaking floor from above', 2, '1 hr', 'Drill, finish nails or screws', '$10-20', 'Screwing into nothing. Find the joist first.'],
    ['Replace a damaged laminate plank', 3, '2 hr', 'Saw, pry bar, tapping block', 'Plank, varies', 'Starting in the middle of the floor. Work from the nearest wall, or cut the plank out carefully and glue the replacement.'],
    ['Re-grout tile', 2, '3 hr + cure', 'Grout float, sponge, grout saw', 'Grout, $12-20', 'Grouting over loose or damp grout, and wiping too soon. Also: grout is not a repair for a moving floor.'],
    ['Replace a cracked floor tile', 3, '3 hr over 2 days', 'Chisel, trowel, grout float', 'Tile, adhesive, grout, $25-40', 'Not establishing why it cracked. A single cracked tile is usually movement below, and the replacement will crack too.'],
    ['Refit a loose vinyl tile or plank', 1, '30 min', 'Adhesive, roller or weight', 'Adhesive, $10', 'Not cleaning the old adhesive off the subfloor.'],
  ]],
  ['Appliances', [
    ['Clean a dryer vent', 1, '1 hr', 'Vent brush, screwdriver, vacuum', 'Brush kit, $15-25', 'Cleaning only the lint trap. The duct and the exterior flap are the fire risk and the efficiency loss.'],
    ['Replace a dryer vent flap', 1, '30 min', 'Screwdriver, caulk gun', 'Vent hood, $12-20', 'Leaving a flap that does not close. It is a direct hole to outside all winter, and birds nest in it all summer.'],
    ['Clean a refrigerator condenser coil', 1, '30 min', 'Vacuum, brush', '$0', 'Not doing it. A clogged coil makes the compressor work harder for years and then fail.'],
    ['Replace a refrigerator door seal', 2, '1 hr', 'Screwdriver, hair dryer', 'Seal, $40-90', 'Fitting it cold. Warm it so it sits flat, or it will not seal.'],
    ['Replace washing machine hoses', 1, '30 min', 'Adjustable wrench, bucket', 'Braided hoses, $20-35', 'Keeping rubber hoses. They are the commonest cause of a laundry flood — replace with braided stainless on sight.'],
    ['Replace a dishwasher drain hose', 2, '1 hr', 'Screwdriver, pliers, towels', 'Hose, $15-30', 'Not fitting the high loop. Without it, waste water siphons back into the machine and everything smells.'],
    ['Clean a range hood filter', 1, '20 min', 'None', '$0-15', 'Washing a charcoal filter. Metal mesh filters wash; charcoal ones are replaced, and washing one destroys it.'],
    ['Clean a dishwasher filter and spray arms', 1, '30 min', 'None', '$0', 'Not knowing it has a filter. Most do, most are never cleaned, and it is the usual cause of poor results.'],
  ]],
  ['Site and outdoor', [
    ['Regrade soil away from the foundation', 2, '1 day', 'Shovel, rake, wheelbarrow', 'Soil, $60-150', 'Piling soil against the siding. Keep it below the cladding and slope it away — six inches over ten feet is the usual guidance.'],
    ['Reset a loose paving slab or step', 2, '2 hr', 'Shovel, level, rubber mallet', 'Sand and gravel, $20-40', 'Bedding on soil instead of compacted gravel and sand. It moves again by spring.'],
    ['Repair a fence post', 3, '3 hr + cure', 'Post hole digger, level, spirit level', 'Post and concrete, $35-70', 'Setting a post without gravel at the base for drainage. Water sits, and the post rots at exactly that point.'],
    ['Clear a blocked yard drain', 1, '1 hr', 'Hose, drain snake, gloves', '$0-15', 'Clearing the grate and stopping there. The grate is almost never the blockage — the pipe below it is, and a drain that still backs up after the grate is clean needs the snake run properly.'],
    ['Trim vegetation back from the building', 1, '2 hr', 'Loppers, pruning saw, gloves', '$0', 'Cutting back to the wall rather than a foot clear of it. Growth against siding holds damp and carries insects in.'],
    ['Seal a mouse entry point', 1, '1 hr', 'Caulk gun, snips, gloves', 'Copper mesh and sealant, $15', 'Using expanding foam alone. They chew straight through it — stuff the gap with copper or steel mesh first, then seal over it.'],
    ['Reset a loose mailbox or sign post', 2, '2 hr', 'Post hole digger, level', 'Gravel and concrete, $25-45', 'Setting it without gravel for drainage, which is how the post rots at exactly ground level.'],
    ['Mark the driveway and utilities before winter', 1, '1 hr', 'Mallet', 'Markers, $15-30', 'Marking the driveway and forgetting the septic cover, the well head and the hydrant. A plough sees none of them.'],
  ]],
];

const CATEGORY_COUNT = PROCEDURES.length;
const PROCEDURE_COUNT = PROCEDURES.reduce((n, [, list]) => n + list.length, 0);
const DIFFICULTY = { 1: 'Easy', 2: 'Moderate', 3: 'Confident' };

/** The dozen worth walking through properly, because they save the most. */
const WALKTHROUGHS = [
  {
    name: 'Draining an outside tap for winter',
    saves: 'Prevents a split pipe inside a wall — $3,000 to $15,000, discovered in April',
    steps: [
      'Disconnect the hose. This is the step that matters: the hose holds water in the tap and stops it draining.',
      'Find the shut-off for that line inside — usually in the basement, on the pipe heading to the tap, sometimes with a small bleed screw.',
      'Close it.',
      'Open the outside tap fully and leave it open all winter.',
      'Open the bleed screw on the interior valve if there is one, with a cup underneath, until it stops dripping, then close it.',
      'If there is no interior shut-off, you have a frost-free tap — the drain happens automatically PROVIDED the hose is off and the tap is left open.',
    ],
    note: 'Ten minutes, no tools, and it is the single highest-value procedure in this book. It is also the one most often forgotten, because October feels early.',
  },
  {
    name: 'Replacing a light switch safely',
    saves: '$120 to $180 against a call-out, and it is the gateway to every other small electrical job',
    steps: [
      'Switch off the breaker you believe serves it. Put something on the panel so nobody switches it back.',
      'Test the switch — flick it. Then remove the cover plate and test at the terminals with a non-contact tester AND confirm the tester works on something live first. A tester with a flat battery reads dead on everything.',
      'Photograph the wiring before touching it.',
      'Loosen the terminals, note which wire was where, and remove the switch.',
      'Fit the new switch with the wires in the same positions. Wrap each wire clockwise around its screw, or use the proper back terminal — never the push-fit hole on a cheap device if a screw is available.',
      'Check no copper is exposed beyond the terminal, fold the wires back neatly, and screw the switch to the box without forcing it.',
      'Cover plate on, breaker on, test.',
    ],
    note: 'The one that hurts people is skipping the test. Breakers are mislabelled in most houses, including new ones. Test at the wires, every single time.',
  },
  {
    name: 'Patching a hole in plasterboard',
    saves: '$150 to $300 per patch',
    steps: [
      'Square the hole off with a knife and remove anything loose.',
      'Back it: for a hole up to about four inches, a self-adhesive mesh patch is enough. Larger, cut a board offcut slightly bigger than the hole, pass it through on a string or a screw, and glue it to the back of the existing board.',
      'First coat of compound: thin, wider than the hole, feathered at the edges. Let it dry fully — not nearly.',
      'Sand lightly with a sponge. Second coat, wider again, thinner.',
      'Dry, sand, and a third coat if any shadow remains.',
      'Prime the patch before painting, or it will flash — a visible dull patch through the finish coat.',
    ],
    note: 'Three thin coats over three days beats one thick coat in an afternoon, and it is the entire difference between an invisible repair and an obvious one.',
  },
  {
    name: 'Clearing a dryer vent',
    saves: '$120 to $200, and it is a fire risk rather than only an efficiency one',
    steps: [
      'Unplug the dryer, or switch off its breaker if it is electric. If it is gas, do not disconnect anything — clean the duct only.',
      'Pull the dryer out and disconnect the duct at the machine.',
      'Vacuum the duct from both ends and run a vent brush through it.',
      'Go outside and clean the exterior hood. Check the flap opens freely and closes fully.',
      'Check the duct itself: flexible foil or plastic should be replaced with rigid or semi-rigid metal, and any crushed section replaced.',
      'Reconnect with the proper clamp — not duct tape, which fails with heat.',
      'Run the dryer and confirm strong airflow at the exterior hood.',
    ],
    note: 'A vent flap held open by lint is a direct hole to outside all winter, and the lint itself is a leading cause of house fires in heating season. Annually, and more often with a long duct run.',
  },
  {
    name: 'Bleeding a radiator and restoring pressure',
    saves: '$150 to $250, and it is why one room is cold',
    steps: [
      'Turn the heating off and let the system cool. Bleeding hot is how people get scalded.',
      'Start with the radiator furthest from the boiler, or the highest one.',
      'Hold a cloth and a bowl under the bleed valve at the top corner.',
      'Open it a quarter turn with the key. Air hisses out. When water comes steadily rather than spitting, close it.',
      'Work through the others.',
      'Check the boiler pressure gauge. Bleeding releases pressure, and it is often now below the marked range.',
      'Top up using the filling loop, slowly, to the middle of the range. Close the loop fully.',
      'Heat on, and check the cold radiator again once hot.',
    ],
    note: 'Do not top up above the marked range. The relief valve will discharge and you will have swapped a cold room for a leak.',
  },
  {
    name: 'Sealing rim joists',
    saves: 'One of the largest single air leaks in most houses, for under $120',
    steps: [
      'Find them: in the basement, where the floor above meets the exterior wall, between each pair of joists.',
      'Clear and brush each bay.',
      'Cut rigid foam to fit each bay, slightly undersize.',
      'Push each piece into place against the rim board.',
      'Seal all four edges with sealant or minimal-expansion foam. The seal is the point — the foam board alone does little.',
      'Work round the whole perimeter. It is tedious and it is one afternoon.',
    ],
    note: 'Wear eye protection and gloves, keep the area ventilated, and keep foam well away from any flue, chimney or recessed light.',
  },
  {
    name: 'Re-caulking a bath or shower',
    saves: '$150 to $250, and prevents a rotted floor',
    steps: [
      'Remove ALL the old caulk with a scraper or a caulk removal tool. All of it.',
      'Clean with a mould cleaner and let it dry completely — ideally a full day with the room ventilated and the bath unused.',
      'Fill the bath with water before caulking, if it is a bath. It drops under load, and caulk applied empty tears when somebody gets in.',
      'Tape both sides of the joint for a clean line.',
      'One continuous bead, pushed rather than pulled.',
      'Smooth with a wet finger in one pass. Remove the tape immediately while it is wet.',
      'Leave it to cure for as long as the tube says before using the shower. Usually 24 hours, and shortening it is why it fails.',
    ],
    note: 'Caulking over mould seals the mould in and it grows through within weeks. Removing every trace of the old bead is most of the job.',
  },
  {
    name: 'Fixing a door that will not latch',
    saves: '$100 to $150, and takes half an hour',
    steps: [
      'Close the door slowly and watch where the latch meets the strike plate. Rub a little chalk on the latch if it is not obvious.',
      'If the latch sits above or below the hole: first tighten the top hinge screws. A sagging door is usually a loose top hinge.',
      'If they spin in stripped holes, replace one screw per hinge with a three-inch screw that reaches the stud behind the frame. This alone fixes most of these.',
      'If the door is still out, loosen the strike plate, move it the small amount needed, and re-drill the pilot holes.',
      'If it needs more than about an eighth of an inch, remove the plate, chisel the mortise over, and refit.',
      'Only consider planing the door as a last resort, and then only the latch edge.',
    ],
    note: 'Nine times in ten this is a single loose hinge screw and a longer screw solves it permanently. People reach for a plane first and remove wood that cannot go back.',
  },
  {
    name: 'Clearing gutters without getting hurt',
    saves: '$180 to $350 per clean, and prevents ice dam damage',
    steps: [
      'Choose the day: dry, not windy, and not alone in the house.',
      'Set the ladder on firm level ground at about a quarter of its height out from the wall, and tie it off or have somebody foot it.',
      'Keep your hips between the stiles. If you have to lean, get down and move the ladder.',
      'Scoop debris into a bucket hooked to the ladder — not dropped, which means climbing down to clear the path.',
      'Flush each run with a hose and check the water reaches the downspout.',
      'Check each downspout discharges away from the foundation.',
      'Note anything you can see about the roof edge from there, and get down.',
    ],
    note: 'More people are hurt doing this than any other job in this book, and the injuries are serious. If the roof is above a single storey, or the ground is uneven, pay somebody. It is $200 against a fall.',
  },
  {
    name: 'Replacing braided supply lines and washer hoses',
    saves: 'Prevents the commonest indoor flood for about $30',
    steps: [
      'Turn off the supply at the valve, and test by opening the tap or running the appliance briefly.',
      'Put a bucket and a towel underneath. There is always some water.',
      'Undo the old line at both ends with two wrenches — one holding the valve still, one turning the nut. Twisting the valve itself is how a small job becomes a plumber.',
      'Fit the new braided line finger tight, then a quarter to half turn with the wrench. No more: these seal on a washer, not on force.',
      'Open the valve slowly and watch the joints for a full minute.',
      'Check again in an hour, and again the next day.',
    ],
    note: 'Rubber washing machine hoses are the single commonest cause of a laundry flood. Replace them with braided stainless on sight, whatever their age, and note the date.',
  },
  {
    name: 'Replacing a GFCI outlet correctly',
    saves: '$150, and a wrongly wired one protects nothing',
    steps: [
      'Switch off the breaker and prove the outlet is dead with a tester you have confirmed works on something live.',
      'Remove the cover and the outlet. Photograph the wiring.',
      'Identify LINE and LOAD. LINE is the pair bringing power in — if there is only one pair of wires, it goes to LINE.',
      'Where there are two pairs, work out which is incoming. If you cannot determine it with certainty, stop and get an electrician: this is the one detail that matters.',
      'Connect incoming to the terminals marked LINE, outgoing to LOAD. The markings are on the back of the device.',
      'Fold the wires neatly, fit the device, cover plate on.',
      'Power on, press RESET, then press TEST and confirm it cuts the power. If it does not trip, it is wired wrong.',
    ],
    note: 'Wired with LINE and LOAD reversed, a GFCI appears to work — the outlet has power — and protects nothing at all. That is worse than leaving the old one in, which is why the test at the end is not optional.',
  },
  {
    name: 'Adding attic insulation without causing ice dams',
    saves: '$600 to $1,800 against a contractor, and lowers the heating bill',
    steps: [
      'Air seal FIRST. Insulation over unsealed penetrations lets warm wet air straight into the attic, which is worse than no insulation for ice dams and rot.',
      'Fit baffles at every rafter bay at the eaves, so the soffit vents stay clear. This is the step that prevents the ice dam.',
      'Box out around any recessed light not rated for insulation contact, and around the flue, with the clearance the manufacturer requires.',
      'Lay boards to kneel and walk on. Do not stand between joists.',
      'Mask, eye protection, long sleeves, and good light.',
      'Add insulation evenly, right out to the baffles, without compressing it.',
      'Leave the hatch area insulated and weatherstripped separately.',
    ],
    note: 'Insulating without air sealing and without baffles is the commonest way a well-meant improvement creates an ice dam. The order of these steps is the whole thing.',
  },
];

function chapters() {
  return [
    {
      title: 'What is never do-it-yourself',
      blocks: [
        { t: 'p', text: 'This chapter comes first on purpose. Every other product in this series risks money; this one risks a person, and the most useful thing a repair book can do is be clear about its own boundary.' },
        { t: 'p', text: 'Nothing on the list below is in this book, and none of it should be attempted on the strength of a video.' },
        { t: 'table', head: ['Not this', 'Why'], rows: NEVER_DIY, widths: [0.27, 0.73] },
        { t: 'h2', text: 'New Hampshire licensing, briefly' },
        { t: 'p', text: 'New Hampshire does not issue a general contractor licence, which surprises people from other states. It DOES license electricians, plumbers and gas fitters, among other specialities. Work in those trades done by somebody unlicensed is a problem with the town, with your insurer and at resale, as well as being a safety question — and some towns add their own permit and registration requirements on top.' },
        { t: 'p', text: 'The practical line this book draws: replacing a device on an existing circuit is within reach of a careful person. Anything that adds, extends or alters a circuit is licensed work. Any gas at all is licensed work.' },
        { t: 'h2', text: 'The four safety rules behind every procedure' },
        { t: 'numbers', items: [
          'Isolate, then PROVE it is isolated. Switch the breaker, then test at the wires with a tester you have just confirmed works on something live. Breakers are mislabelled in most houses. For water: close the valve, then open the tap and watch it stop.',
          'Eyes and lungs. Safety glasses for anything that chips, cuts or sprays. A mask for insulation, old plaster, sanding and anything in a crawlspace.',
          'Ladders are the actual hazard. Firm level ground, about a quarter of the height out from the wall, three points of contact, hips between the stiles, and move it rather than leaning. If the thought of it makes you uneasy, that is information.',
          'If you find something you did not expect — a smell of gas, scorched wiring, suspected asbestos, water where it should not be, a structural member that has been cut — stop. Do not finish the job first.',
        ] },
        { t: 'callout', heading: 'The honest test before starting anything', body: 'If this goes wrong, is the consequence a second attempt, or an injury, a flood, or a fire? A second attempt is the territory of this book. The others are the territory of somebody who does it for a living, and the money saved is never the point in that comparison.' },
      ],
    },
    {
      title: 'How to use this book',
      blocks: [
        { t: 'p', text: `${PROCEDURE_COUNT} procedures across ${CATEGORY_COUNT} categories, each with the tools, the materials and their cost, a realistic time, a difficulty, and — the column worth paying for — what actually goes wrong.` },
        { t: 'h2', text: 'Why the failure mode rather than the steps' },
        { t: 'p', text: 'Steps for any of these are available free in a dozen places. What is rarely written down is the specific thing that turns a first attempt into a second one: the flapper that nearly fits, the caulk applied over damp, the GFCI wired backwards that appears to work, the insulation that blocks the soffit vents. That column is the book.' },
        { t: 'h2', text: 'The difficulty ratings' },
        { t: 'table', head: ['Rating', 'Means'], rows: [
          ['Easy', 'No special tools, no isolation required, and a mistake costs the part. Most people can do these the first time.'],
          ['Moderate', 'Isolation, or a tool you may not own, or a finish that shows if it goes wrong. Read the whole procedure before starting.'],
          ['Confident', 'Takes judgement, or it is awkward or heavy, or getting it wrong means calling somebody anyway. Fine if you have done similar work.'],
        ], widths: [0.16, 0.84] },
        { t: 'h2', text: 'About the costs and times' },
        { t: 'p', text: 'Materials are mid-2026 New Hampshire retail, and times assume you have not done the job before — which is the useful figure rather than the expert one. Both are there to let you compare honestly against a call-out, because the right answer is sometimes to pay somebody and the comparison should be made with real numbers.' },
        { t: 'callout', heading: 'On photographs', body: 'There are none in this edition, and the listing should not say otherwise. Every procedure instead carries its tools, its materials with costs, a time, a difficulty and the failure mode — which is information a photograph does not give. Where a procedure genuinely needs to be seen rather than read, it says so and tells you what to search for.' },
      ],
    },
    {
      title: 'Start from the symptom',
      blocks: [
        { t: 'p', text: 'Nobody looks up "replace a toilet flapper". They look up "the toilet keeps running". This chapter goes the other way round — the thing you noticed, what it usually is, and whether it is yours to fix.' },
        { t: 'h2', text: 'Water' },
        { t: 'table', head: ['What you noticed', 'Usually', 'Yours?'], rows: [
          ['Toilet runs constantly', 'The flapper, or the fill valve. Dye in the tank tells you which.', 'Yes — 20 minutes'],
          ['Damp patch on a ceiling', 'A leak above, or an ice dam in winter. Follow it upwards; water travels along joists before it drops.', 'Finding it, yes. The repair depends on what it is.'],
          ['Water in the basement after rain', 'Grading, gutters or downspout discharge before anything else. Nine times in ten it is outside, not the foundation.', 'Yes — regrade and extend downspouts first'],
          ['Water in the basement with no rain', 'A supply leak or a failed water heater. Shut the main and see whether it stops.', 'Isolate it yourself, then decide'],
          ['Low water pressure everywhere', 'On a well: the pump or the pressure tank. On town water: a valve not fully open, or a failing pressure reducer.', 'Check the valves. The rest is a plumber.'],
          ['Drain is slow, not blocked', 'The trap, or a vent issue. Clean the trap first.', 'Yes — 30 minutes'],
          ['Gurgling drains elsewhere when one is used', 'A venting problem, or on septic, a system beginning to back up.', 'No — call somebody, particularly on septic'],
          ['Smell of sewage indoors', 'A dry trap, a failed toilet seal, or a vent problem.', 'Run the water in unused drains first. Then call.'],
        ], widths: [0.26, 0.47, 0.27] },
        { t: 'h2', text: 'Heat and cold' },
        { t: 'table', head: ['What you noticed', 'Usually', 'Yours?'], rows: [
          ['No heat anywhere', 'Thermostat, breaker, fuel, or a tripped boiler. Check those four before calling, and have the error code ready.', 'Check the four. One reset only.'],
          ['Heat in some rooms, not others', 'Air in the pipes, a closed or blocked vent, or a zone valve.', 'Bleeding, yes. A zone valve, no.'],
          ['Boiler keeps needing a reset', 'Something is wrong. Stop resetting it.', 'No — and repeated resets on oil can make it worse'],
          ['One room always cold in winter', 'Air sealing and insulation before any heating change. Check for draughts at the outlets, the window frame and the rim joist below.', 'Yes — and it is the cheapest fix available'],
          ['Icicles and a ridge of ice at the eaves', 'An ice dam — attic heat loss, not a roof fault.', 'Rake from the ground. Fix the attic in summer.'],
          ['Condensation running down the windows', 'Indoor humidity too high. Ventilation, not heat.', 'Yes — run the bath and kitchen fans properly'],
          ['Heating bill rising with no change in habits', 'Filter, then air leaks, then equipment. In that order.', 'Yes, mostly — start with the filter'],
        ], widths: [0.26, 0.47, 0.27] },
        { t: 'h2', text: 'Electrical, and the ones to stop at' },
        { t: 'table', head: ['What you noticed', 'Usually', 'Yours?'], rows: [
          ['A breaker tripped once', 'An overload at that moment. Reset once and watch.', 'Yes'],
          ['A breaker trips repeatedly', 'A genuine fault. It is doing its job.', 'No — stop resetting and get it found'],
          ['An outlet or switch is warm', 'A loose connection, which is how fires start.', 'NO. Switch it off at the breaker and call today.'],
          ['Smell of burning plastic', 'Overheating wiring or a device.', 'NO. Breaker off, call immediately.'],
          ['Lights dim when an appliance starts', 'An undersized or loose connection somewhere.', 'No — an electrician'],
          ['Half the house has no power', 'Can indicate a problem at the service rather than inside.', 'No — call the utility and an electrician'],
          ['One outlet dead, others fine', 'A tripped GFCI somewhere on that circuit, often in another room.', 'Yes — find and reset it first'],
        ], widths: [0.26, 0.47, 0.27] },
        { t: 'h2', text: 'The building' },
        { t: 'table', head: ['What you noticed', 'Usually', 'Yours?'], rows: [
          ['Granules in the gutters', 'The roof shedding its surface — it is aging.', 'Note it and start budgeting'],
          ['A door that suddenly sticks', 'Seasonal movement, or a loose hinge. Rarely the door.', 'Yes — hinge screws first'],
          ['Cracks above a door or window', 'Normal settlement if hairline and stable. Monitor and date a photograph.', 'Watch it. Widening or stepped cracks: get advice.'],
          ['A springy or soft floor', 'Could be a joist or subfloor issue, and that is structural.', 'No — get it looked at'],
          ['Peeling exterior paint in one area', 'Moisture getting behind it. Find the source before repainting.', 'Finding it, yes'],
          ['Railing that moves when pushed', 'Failed fixings, and the failure mode is a fall.', 'Yes, and do it today'],
          ['Mould in a bathroom corner', 'Ventilation. The fan is undersized, not ducted outside, or not used.', 'Yes — check where the fan actually discharges'],
        ], widths: [0.26, 0.47, 0.27] },
        { t: 'callout', heading: 'The pattern in the "no" column', body: 'Almost every one is electrical, structural, or a symptom of something upstream of what you can see. That is not caution for its own sake — those are the three categories where a confident attempt makes the situation worse rather than merely unresolved.' },
      ],
    },
    {
      title: 'Twelve worth doing properly',
      blocks: [
        { t: 'p', text: 'The dozen that save the most money, prevent the most damage, or are most often done wrong. Each is a full walkthrough rather than a reference entry.' },
        ...WALKTHROUGHS.flatMap((w) => [
          { t: 'h2', text: w.name },
          { t: 'p', text: w.saves, opts: { italic: true, size: 10 } },
          { t: 'numbers', items: w.steps },
          { t: 'callout', heading: 'What goes wrong', body: w.note },
        ]),
      ],
    },
    ...PROCEDURES.map(([category, list]) => ({
      title: category,
      blocks: [
        {
          t: 'table',
          head: ['Repair', 'Level', 'Time', 'Tools', 'Materials', 'What goes wrong'],
          rows: list.map(([name, diff, time, tools, materials, wrong]) => [
            name, DIFFICULTY[diff], time, tools, materials, wrong,
          ]),
          widths: [0.17, 0.08, 0.07, 0.17, 0.14, 0.37],
        },
      ],
    })),
    {
      title: 'Weatherization, and what to ask the utility',
      blocks: [
        { t: 'p', text: 'Heating is the largest controllable cost in a New Hampshire house, and the order you spend in makes a very large difference to what comes back.' },
        { t: 'h2', text: 'The order that saves the most' },
        { t: 'numbers', items: [
          'Air sealing. Rim joists, the attic hatch, penetrations, around frames. Cheapest, least glamorous, highest return.',
          'Attic insulation, right out to the eaves, with baffles so the soffit vents stay clear.',
          'Ventilation, so the roof deck stays cold. The same work prevents ice dams, which is why it solves two problems.',
          'Weatherstripping on doors and windows. Replacement windows much later, and for failure rather than for efficiency.',
          'Equipment last. A new high-efficiency boiler heating a leaky house is an expensive way to warm the outdoors.',
        ] },
        { t: 'callout', heading: 'Why no rebate figures are printed', body: 'New Hampshire\'s utility-funded efficiency programmes change their amounts, caps and eligibility, sometimes mid-year, and they differ by utility and by circumstance. A number printed in a book somebody bought becomes a promise nobody here made. What follows is how to find the current terms, which stays true.' },
        { t: 'h2', text: 'What to ask for, in order' },
        { t: 'numbers', items: [
          'A home energy audit through your electric or gas utility\'s efficiency programme. Ask specifically whether it includes a blower-door test — that is the one that finds the leaks and makes the rest worth doing.',
          'The air sealing and insulation incentive that follows the audit. Usually offered together, and the audit is what qualifies you.',
          'Any heating equipment incentive, if you are replacing equipment anyway.',
          'Income-eligible weatherization, which is a separate and much larger programme run through community action agencies rather than the utility. Ask even if you assume you will not qualify.',
        ] },
        { t: 'p', text: 'Three calls: your electric utility\'s efficiency programme by name, your fuel supplier, and your regional community action agency. Some require pre-approval and will not pay retrospectively, so ask before the work rather than after.' },
        { t: 'h2', text: 'The New Hampshire specifics' },
        { t: 'bullets', items: [
          'Freeze-thaw is the climate feature that breaks things here. Water gets in, freezes, expands, and widens the gap it came through. Every exterior sealing job is really about that cycle.',
          'Ice dams are an attic heat-loss problem rather than a roofing problem. Air seal, insulate, ventilate — in that order.',
          'A five-month heating season means air sealing pays back faster here than in most of the country.',
          'Hose bibs, every single autumn. It is on three lists in this book for a reason.',
          'Snow load matters on decks and flat roofs. If you are unsure whether a structure can take it, that is a question for an engineer and not for this book.',
        ] },
      ],
    },
    {
      title: 'The tool kit, and when to stop',
      blocks: [
        { t: 'h2', text: 'What covers most of this book' },
        { t: 'table', head: ['Tool', 'Rough cost', 'What it unlocks here'], rows: [
          ['Screwdriver set, slotted and cross', '$20-35', 'Most of the electrical, doors, appliances.'],
          ['Non-contact voltage tester', '$15-25', 'Every electrical entry. Do not do any of them without one.'],
          ['Adjustable wrenches, two', '$25-40', 'All the plumbing. Two, because one holds the valve still.'],
          ['Caulk gun', '$10-20', 'A dozen procedures, indoors and out.'],
          ['Putty knives, 2in and 6in', '$15', 'Every wall repair.'],
          ['Sanding sponges', '$8', 'Wall repairs and paint prep.'],
          ['Cordless drill and bit set', '$70-140', 'Decks, fences, trim, railings.'],
          ['Hand saw or mitre box', '$25-60', 'Trim and boards.'],
          ['Spirit level, 2ft', '$15-25', 'Anything that will look wrong if it is not level.'],
          ['Step ladder, good one', '$70-140', 'Interior and low exterior. Buy a solid one; this is not the place to economise.'],
          ['Extension ladder', '$180-350', 'Gutters. Consider whether you want to own one, or to pay somebody who does.'],
          ['Vent brush kit', '$15-25', 'The dryer vent, annually.'],
          ['Safety glasses, gloves, masks', '$25', 'Non-negotiable, and the cheapest line here.'],
        ], widths: [0.26, 0.14, 0.6] },
        { t: 'p', text: 'About $350 covers everything rated Easy or Moderate in this book, excluding the extension ladder — and a single avoided call-out pays for a good part of it.' },
        { t: 'h2', text: 'When to stop mid-job' },
        { t: 'p', text: 'Stopping is a skill, and the point of this section. Stop and call somebody if:' },
        { t: 'bullets', items: [
          'You smell gas. Leave, from outside call the utility\'s emergency line, and do not operate switches on the way out.',
          'You find scorched or melted wiring, or a hot switch plate or outlet.',
          'You find a cut or notched joist, beam or post.',
          'You suspect asbestos or lead — old pipe lagging, floor tiles, textured ceiling, pre-1978 paint. Stop before disturbing it further.',
          'Water is coming in and you cannot find or stop the source.',
          'A fixing has nothing solid behind it and you cannot work out what it was fixed to.',
          'You have taken something apart and cannot see how it goes back. Photograph it as it is and call; it is far cheaper than a wrong reassembly.',
          'You are tired, it is late, or you are annoyed with it. Genuinely the commonest cause of the mistake that costs money.',
        ] },
        { t: 'callout', heading: 'The real economics', body: 'A call-out is $120 to $200 and an hour of somebody\'s expertise. That is cheap against a flooded floor, a fire, a fall or a repair done twice. The jobs in this book are worth doing yourself because the downside is a second attempt. The moment the downside changes, the arithmetic changes with it — and recognising that moment is the most valuable thing in these two hundred procedures.' },
      ],
    },
  ];
}

export async function build() {
  const book = renderBook({
    title: 'DIY Home Repair Encyclopedia',
    subtitle: 'Fix it yourself — safely and correctly',
    blurb: `${PROCEDURE_COUNT} repairs across ${CATEGORY_COUNT} categories, each with its tools, its materials and their cost, a realistic time for somebody who has not done it before, and the thing that actually goes wrong. Twelve full walkthroughs for the ones that save the most. And, first, the chapter on what is never do-it-yourself — because the most useful thing a repair book can do is be clear about its own boundary.`,
    audience: ['Homeowners', 'DIY Enthusiasts'],
    edition: '2026 edition',
    keywords: 'home repair, DIY, New Hampshire, weatherization, maintenance',
    chapters: chapters(),
  });

  return [
    { name: 'DIY Home Repair Encyclopedia.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
  ];
}

export async function selfCheck() {
  const files = await build();
  const pdf = files[0];
  const concerns = [];

  if (pdf.buffer.subarray(0, 4).toString() !== '%PDF') concerns.push('the PDF does not start with %PDF');
  if (pdf.pages < 28) concerns.push(`only ${pdf.pages} pages`);

  // Every procedure must carry all five columns. A row missing its failure
  // mode is the one thing this book claims to be about.
  const incomplete = PROCEDURES.flatMap(([cat, list]) => list
    .filter(([name, diff, time, tools, materials, wrong]) => !name || !diff || !time || !tools || !materials || !wrong || wrong.length < 40)
    .map(([name]) => `${cat}: ${name}`));
  if (incomplete.length) concerns.push(`${incomplete.length} procedure(s) are missing a column or have a thin failure mode`);

  // Difficulty must be one of the three defined levels.
  const badDifficulty = PROCEDURES.flatMap(([, list]) => list.filter(([, d]) => !DIFFICULTY[d]));
  if (badDifficulty.length) concerns.push(`${badDifficulty.length} procedure(s) have an undefined difficulty`);

  // The safety chapter is the reason this product is publishable at all.
  if (NEVER_DIY.length < 7) concerns.push(`only ${NEVER_DIY.length} exclusions in the never-DIY chapter`);
  const thinNever = NEVER_DIY.filter(([, why]) => !why || why.length < 60);
  if (thinNever.length) concerns.push(`${thinNever.length} exclusion(s) do not explain why`);

  // A walkthrough with three steps is a reference entry wearing a hat.
  const thinWalks = WALKTHROUGHS.filter((w) => w.steps.length < 5 || !w.note || !w.saves);
  if (thinWalks.length) concerns.push(`${thinWalks.length} walkthrough(s) are too thin to justify the format`);

  return {
    figures: [
      ['procedures', `${PROCEDURE_COUNT} across ${CATEGORY_COUNT} categories`],
      ['walkthroughs', String(WALKTHROUGHS.length)],
      ['never-DIY exclusions', String(NEVER_DIY.length)],
      ['encyclopedia', `${pdf.pages} pages, ${Math.round(pdf.buffer.length / 1024)} KB`],
      ['listing says', `120 pages and "100+ procedures" — this has ${PROCEDURE_COUNT} procedures in ${pdf.pages} pages; correct the listing`],
      ['listing claims PHOTOS', 'none exist and the renderer has no image support — shoot them, license them, or drop the claim'],
    ],
    concerns,
  };
}
