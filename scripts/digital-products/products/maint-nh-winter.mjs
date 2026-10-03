/**
 * NH Winter Prep Package — marketplace product `maint-nh-winter`, $34.
 *
 * TWO FILES, BECAUSE THEY DO DIFFERENT JOBS
 *
 * A PDF guide to read once in September, and an editable Word workbook to
 * print, fill in and keep on the boiler room wall. The listing promises both,
 * and they genuinely are both: a checklist you cannot write on is a poster.
 *
 * WHAT MAKES IT WORTH $34 RATHER THAN A BLOG POST
 *
 * The timing. Almost every item here is something a homeowner already half
 * knows; what they do not know is that the boiler service appointment has to be
 * booked in September, that the plough contract is gone by the first week of
 * November, and that the hose bib they forgot is the one that splits inside the
 * wall and is not discovered until April. So the guide is organised by WHEN,
 * and the consequence of missing each window is stated.
 *
 * WHAT IT DOES NOT CLAIM
 *
 * No utility rebate amounts. New Hampshire's weatherization and efficiency
 * programmes change their figures, their caps and their eligibility, and a
 * number printed in a document somebody bought becomes a promise we did not
 * make. The rebate section says what to ask for and where, which is the part
 * that stays true.
 */
import {
  buildDocx, DOCX_MIME, title as dTitle, h1 as dH1, h2 as dH2, p as dP,
  fill, note as dNote, table as dTable, spacer, pageBreak,
} from '../lib/docx.mjs';
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';

export const meta = {
  id: 'maint-nh-winter',
  title: 'NH Winter Prep Package',
  subtitle: 'Get your property ready for New Hampshire winters',
  price: 3400,
  files: ['pdf', 'docx'],
};

/**
 * The checklist, grouped by system. Each item is [task, when, why it matters].
 *
 * "When" is the part people pay for. "Why" is there because a checklist whose
 * items have no stated consequence gets half done — the two or three that feel
 * tedious are skipped, and they are never the same two or three.
 */
const CHECKLIST = [
  ['Heating', [
    ['Book the annual heating service', 'September', 'Technicians are booked three weeks out by mid-October and same-week by November. A boiler that fails in January waits behind every other failure.'],
    ['Replace the furnace or air handler filter', 'September, then every 60 days', 'A blocked filter makes the system work harder for less heat and is the commonest cause of a "broken" furnace that is not broken.'],
    ['Bleed the radiators or check system pressure', 'October', 'Air in the loop means cold rooms at the end of the run while the boiler cycles happily.'],
    ['Top off oil or propane before the first cold snap', 'October', 'Deliveries are slowest exactly when demand spikes, and a run-out means a restart call on top of the fuel.'],
    ['Test the thermostat on a cold morning, not a warm afternoon', 'October', 'A failing thermostat often works until the temperature difference is real.'],
    ['Clear 3 feet around any outdoor heat pump unit', 'October, then after each storm', 'A buried unit either ices up or shuts down, usually overnight.'],
    ['Check the chimney and flue, and sweep if you burn wood', 'September', 'Creosote is the ignition source in most chimney fires, and a blocked flue sends combustion gases indoors.'],
    ['Confirm the emergency heat source works', 'October', 'A generator, woodstove or kerosene heater that has sat since last winter is not a plan until it has been started.'],
    ['Clear the dryer vent and check its flap closes', 'October', 'A vent held open by lint is a direct hole to outside, and the lint itself is the second commonest cause of a house fire in heating season.'],
  ]],
  ['Water and pipes', [
    ['Shut off and drain every exterior hose bib', 'Early October', 'The most expensive five-minute job on this list. A hose left attached traps water in the bib, which splits inside the wall and is found when it thaws.'],
    ['Disconnect and store all hoses', 'Early October', 'See above. The hose is the reason the bib freezes.'],
    ['Blow out the irrigation system', 'Early October', 'Water in a lateral below frost line is fine; water in the backflow preventer above grade is not.'],
    ['Insulate pipes in crawlspaces, garages and exterior walls', 'October', 'Any run on the cold side of the insulation will freeze given enough hours below 10°F.'],
    ['Locate and label the main water shutoff', 'Any time, now', 'The minute a pipe bursts is a bad time to learn where it is. Everyone in the household should know.'],
    ['Fit heat tape where a pipe has frozen before', 'October', 'A pipe that froze once will freeze again — the conditions have not changed.'],
    ['Drain and shut the water to any unheated outbuilding', 'October', 'A barn, workshop or well house is the one nobody walks into in February, so a burst there runs for weeks rather than hours.'],
    ['Know the plan for a vacancy or a holiday', 'Before leaving', 'Heat no lower than 55°F, water off, and somebody checking. A house left at 45°F with the water on is how a two-week trip becomes a claim.'],
  ]],
  ['Roof, gutters and ice dams', [
    ['Clear the gutters after the last leaves drop', 'Late October to early November', 'Full gutters hold water, water freezes, and the ice backs up under the shingles. This is the single cause of most ice dam damage.'],
    ['Check that downspouts discharge away from the foundation', 'October', 'Ice at the base of a downspout becomes a sheet of ice across the walk.'],
    ['Look for missing, lifted or cracked shingles', 'September', 'A roofer can fix it in October. In January they cannot get on the roof at all.'],
    ['Check attic insulation depth and coverage', 'September', 'Ice dams are an attic heat-loss problem wearing a roofing costume: warm roof deck, melting snow, refreezing at the cold eave.'],
    ['Confirm the soffit and ridge vents are not blocked', 'September', 'Insulation stuffed into the soffit is the commonest cause of a warm roof deck.'],
    ['Check the flashing at every chimney, vent and valley', 'September', 'Flashing failures show up as ceiling stains in February and get blamed on the roof.'],
    ['Buy a roof rake before you need one', 'October', 'They sell out within a day of the first big storm, statewide.'],
    ['Decide now who clears the roof, and how', 'October', 'A ladder on ice is how this list turns into a hospital visit. If the answer is a contractor, book them.'],
  ]],
  ['Doors, windows and the envelope', [
    ['Replace failed weatherstripping on exterior doors', 'October', 'A door you can see daylight around is a permanently open window.'],
    ['Caulk gaps where pipes and wires enter the building', 'October', 'These are also where mice come in, and they arrive the same week the cold does.'],
    ['Fit storm windows or interior film on single glazing', 'October', 'The cheapest comfort improvement available on an old NH house.'],
    ['Check basement windows and hatch seals', 'October', 'A basement at 38°F puts every pipe above it at risk.'],
    ['Weatherstrip and insulate the attic hatch', 'October', 'An uninsulated hatch is a square metre of missing ceiling insulation, and it sits directly under the roof deck where ice dams start.'],
    ['Watch for condensation on windows once the heat is on', 'November', 'Water running down the inside of the glass means indoor humidity is too high, which rots sills and sheathing and is fixed with ventilation rather than heat.'],
    ['Reverse ceiling fans to push warm air down', 'October', 'Free, and genuinely noticeable in a room with a high ceiling.'],
  ]],
  ['Site and access', [
    ['Sign the snow removal contract', 'September', 'By the first week of November the good contractors are full and the rest are the reason you are reading this.'],
    ['Mark the driveway edges, hydrants and septic covers', 'Late October', 'A plough cannot see the lawn, the well head or the leach field under a foot of snow.'],
    ['Stock sand or ice melt, and put it where it will be reached', 'October', 'A bag in the garage behind the mower is a bag that does not get used.'],
    ['Service the snow blower and keep fuel fresh', 'October', 'Last year\'s fuel is this year\'s carburettor rebuild.'],
    ['Trim branches overhanging the roof, drive and service lines', 'September', 'Wet snow and ice bring down limbs that a dry summer wind never would.'],
    ['Check that walkway lighting works', 'October', 'Dark by half past four, and ice is invisible.'],
    ['Protect shrubs near the roof line from falling ice', 'October', 'A sheet of ice off a metal roof removes a decade of growth.'],
    ['Keep the leach field clear of vehicles and piled snow', 'All winter', 'Compacted snow lets frost drive deeper and can freeze a field that would otherwise have been fine.'],
  ]],
  ['Safety', [
    ['Test every smoke and carbon monoxide alarm', 'October', 'Heating season is CO season. This is the one item on the list that is about somebody dying rather than money.'],
    ['Replace alarm batteries, and any alarm over ten years old', 'October', 'Sensors degrade whether or not the test button beeps.'],
    ['Check the fire extinguisher gauge and date', 'October', 'Near the heating plant and in the kitchen, at minimum.'],
    ['Confirm the generator runs, and that it runs OUTSIDE', 'October', 'Twenty feet from any window or door. Generator CO kills people in New England every single winter.'],
    ['Store a week of water, heat and light that needs no power', 'November', 'A three-day outage in an ice storm is a normal NH event, not a disaster scenario.'],
    ['Write down the emergency numbers on paper', 'October', 'A phone with a flat battery holds no contacts.'],
    ['Agree who checks on elderly neighbours', 'November', 'Nobody is coming to tell you to do this.'],
  ]],
];

const ITEM_COUNT = CHECKLIST.reduce((sum, [, items]) => sum + items.length, 0);

const AUDIENCE = ['Homeowners', 'Landlords', 'Property Managers'];

// ── The PDF guide ───────────────────────────────────────────────────────────

function guideChapters() {
  return [
    {
      title: 'Start here: the three windows that matter',
      blocks: [
        { t: 'p', text: `This package covers ${ITEM_COUNT} jobs across six systems. Almost none of them is difficult, and a New Hampshire homeowner already half knows most of them. What makes the difference between a quiet winter and an expensive one is not knowing what to do — it is doing it before the window closes.` },
        { t: 'p', text: 'There are three windows, and they are not equally forgiving.' },
        { t: 'h2', text: 'September: the window that closes hardest' },
        { t: 'p', text: 'Everything that needs another person booked. Heating service, chimney sweep, roof repairs, the snow contract. By mid-October a heating technician is three weeks out; by November they are triaging no-heat calls and a service appointment is simply not available. The same is true of ploughing — the contractors worth having are full by the first week of November, and the ones still taking work in December are taking it for a reason.' },
        { t: 'callout', heading: 'If you only do one thing today', body: 'Book the heating service and the snow contract. Both are other people\'s calendars, and neither can be fixed later with money or urgency. Everything else on this list you can still do yourself in a cold November weekend.' },
        { t: 'h2', text: 'Early October: water, before the first hard freeze' },
        { t: 'p', text: 'Hose bibs, hoses, irrigation, outbuildings. The first overnight dip below the mid-twenties usually arrives in the second half of October and it does not announce itself. This group takes an afternoon and prevents the most expensive single failure on the list — a split hose bib inside a wall, which does not leak while it is frozen and so is discovered in April by the ceiling below it.' },
        { t: 'h2', text: 'Late October and November: the envelope and the ground' },
        { t: 'p', text: 'Gutters once the leaves are actually down, weatherstripping, driveway markers, sand, lighting, alarms. This is the part that can be done in the cold, which is precisely why it should be scheduled rather than left to a free Saturday that never comes.' },
        { t: 'h2', text: 'How to use the workbook' },
        { t: 'p', text: 'The Word file in this package is the same checklist, with a column for the date each item was done and who did it, plus pages for your shutoff locations, your vendors and a storm log. Print it, put it where the heating plant is, and fill it in as you go. Next September it tells you what you did and when, which is worth more than remembering.' },
        { t: 'p', text: 'Landlords and managers: the completed sheet is also evidence. "The heating system was serviced on this date by this contractor" is a different conversation from "we service it every year".' },
      ],
    },
    {
      title: 'Pipes: the failure that costs the most',
      blocks: [
        { t: 'p', text: 'Of everything in this package, frozen pipes cause the largest bills and the most avoidable ones. It is worth understanding the mechanism rather than only following the steps, because the steps do not cover every house and the mechanism does.' },
        { t: 'h2', text: 'What actually happens' },
        { t: 'p', text: 'Water expands as it freezes. In a closed pipe that expansion has nowhere to go, so pressure builds — and it does not burst at the ice. It bursts at the weakest point in the sealed run, which is often somewhere else entirely, in a wall or above a ceiling. That is why the damage and the freeze are frequently in different rooms.' },
        { t: 'p', text: 'And the burst does not leak while it is frozen. The ice plugs the hole. The water arrives when it thaws, which may be days later and is often while nobody is in the building.' },
        { t: 'h2', text: 'Which pipes are at risk' },
        { t: 'p', text: 'Any run on the cold side of the insulation. In practice that means:' },
        { t: 'bullets', items: [
          'Exterior hose bibs, and anything connected to one.',
          'Pipes in an unheated crawlspace, garage, porch or attic.',
          'Runs inside an exterior wall, particularly on the north and west faces.',
          'Anything in a room that gets closed off — a spare bedroom with the door shut and the register closed is a cold room with pipes in its walls.',
          'Kitchen and bathroom supplies in a cabinet against an exterior wall. The cabinet door is the insulation keeping the heat out.',
        ] },
        { t: 'h2', text: 'The hose bib, specifically' },
        { t: 'p', text: 'This is worth its own section because it is both the most common failure and the easiest to prevent. A hose left connected holds a column of water in the bib and the first foot of pipe. A frost-free bib is designed so the shutoff sits back inside the heated envelope — but that only works if the hose is off, because the hose stops the bib draining.' },
        { t: 'p', text: 'So: disconnect every hose, open the bib to let it drain, and if there is an interior shutoff for that line, close it and leave the exterior tap open through the winter.' },
        { t: 'h2', text: 'In a cold snap' },
        { t: 'bullets', items: [
          'Open the cabinet doors under sinks on exterior walls. You are letting room heat reach the pipes.',
          'Leave interior doors open so heat circulates into closed-off rooms.',
          'Run a trickle from the furthest tap on the coldest run. Moving water freezes far more slowly, and an open tap relieves the pressure that actually causes the burst.',
          'Do not drop the thermostat at night during a hard freeze. The saving is a few dollars; the exposure is a wall.',
        ] },
        { t: 'callout', heading: 'If a pipe is already frozen', body: 'Shut the water off at the main first, before thawing anything — if that section has already split, you want it dry when the ice goes. Then thaw gently with a hair dryer or heat gun working back from the tap, never with a torch. Open the tap so meltwater has somewhere to go, and watch for the sound of water running where it should not be.' },
        { t: 'h2', text: 'The plan for an empty building' },
        { t: 'p', text: 'A house left for a week in February needs heat no lower than 55°F, the water shut off at the main, and somebody physically looking at it. A remote thermostat alert is useful and is not a substitute: it tells you the house is cold, not that the ceiling is down. If the property will be empty for a season, have the system properly drained and winterised instead.' },
      ],
    },
    {
      title: 'Ice dams, and why they are an attic problem',
      blocks: [
        { t: 'p', text: 'Ice dams get treated as a roof problem, and roofers get blamed for them. They are almost always a heat-loss problem, and understanding that is the difference between fixing one and paying for the same repair every spring.' },
        { t: 'h2', text: 'The mechanism' },
        { t: 'p', text: 'Heat escaping from the living space warms the underside of the roof deck. Snow on the warm part of the roof melts; the water runs down to the eave, which is cold because there is no living space under it, and refreezes. That ridge of ice is the dam. The next meltwater backs up behind it, finds a lap in the shingles, and comes inside.' },
        { t: 'p', text: 'Which is why a roof can be in perfect condition and still leak in February: shingles shed running water, they do not hold standing water, and nobody designed them to.' },
        { t: 'h2', text: 'What fixes it' },
        { t: 'bullets', items: [
          'Air sealing first. Gaps around light fittings, bath fans, plumbing stacks and the attic hatch leak warm, wet air into the attic. This is the step people skip and it does more than insulation.',
          'Insulation depth, evenly, right out to the eaves — without blocking the soffit vents. Insulation stuffed into the soffit is the most common cause of a warm roof deck.',
          'Ventilation: soffit in, ridge out. The point is to keep the deck the same temperature as the outside air.',
          'Bath and kitchen fans ducted to the OUTSIDE, not into the attic. A fan discharging into an attic is a humidifier aimed at your roof sheathing.',
        ] },
        { t: 'h2', text: 'What only treats the symptom' },
        { t: 'p', text: 'Raking the roof, heat cables along the eaves, and chipping ice all reduce the damage this winter without changing the cause. They are worth doing when the dam is already there. They are not a repair, and a contractor who proposes only these is managing the problem rather than solving it.' },
        { t: 'callout', heading: 'Do not get on the roof', body: 'More people are hurt clearing ice dams than are hurt by them. A roof rake from the ground, from a position where sliding snow cannot land on you, is the limit of sensible do-it-yourself. Anything beyond that is a contractor with the right equipment, and that contractor should be lined up in October rather than found in a panic in February.' },
      ],
    },
    {
      title: 'Storm response: before, during, after',
      blocks: [
        { t: 'p', text: 'A multi-day power outage in an ice storm is a normal New Hampshire event. The difference between an inconvenience and an emergency is almost entirely preparation, and the preparation is cheap.' },
        { t: 'h2', text: 'Forty-eight hours before' },
        { t: 'bullets', items: [
          'Charge everything, including a battery bank and a torch per person.',
          'Fill containers with drinking water — a well pump needs electricity, so losing power means losing water.',
          'Fill the vehicle. Pumps need power too.',
          'Get cash. Card readers do not work in an outage.',
          'Set the fridge and freezer colder than usual. A full freezer holds about 48 hours unopened; a half-full one holds about 24.',
          'Bring in or tie down anything the wind will take.',
          'If you have a generator, start it now rather than discovering the problem in the dark.',
        ] },
        { t: 'h2', text: 'During' },
        { t: 'bullets', items: [
          'Run a generator outdoors only, at least twenty feet from any window, door or vent. People die of carbon monoxide every winter in New England doing this wrong, including in open garages.',
          'Never run a generator into the house wiring without a transfer switch installed by an electrician. Backfeeding kills line workers.',
          'Keep one room warm rather than the house. Close doors, cover windows at night.',
          'Treat every downed line as live, and keep well back.',
          'Leave the fridge and freezer closed. Every look costs hours.',
          'Clear snow off any outdoor heat pump unit and off exhaust vents — a blocked high-efficiency furnace vent will shut the system down, or worse.',
        ] },
        { t: 'h2', text: 'After' },
        { t: 'bullets', items: [
          'Walk the whole exterior before the snow goes. Lifted shingles, bent gutters, cracked flashing and broken branches are cheaper to fix now than to discover in the spring.',
          'Photograph anything damaged before touching it. Dated photographs are what makes a claim straightforward.',
          'Check the attic for damp sheathing and the ceilings for new stains.',
          'Throw out refrigerated food that has been above 40°F for four hours or more. Frozen food that still has ice crystals is fine.',
          'Write down what went wrong and what you wished you had. That note is next September\'s shopping list, and it is the single most useful page in the workbook.',
        ] },
      ],
    },
    {
      title: 'Efficiency and weatherization incentives',
      blocks: [
        { t: 'p', text: 'New Hampshire has run utility-funded efficiency and weatherization programmes for years, and they are worth pursuing — a subsidised energy audit followed by air sealing and insulation is the best value available on an older house, and it is the same work that prevents ice dams.' },
        { t: 'callout', heading: 'Why there are no figures here', body: 'Programme amounts, caps and eligibility change, sometimes mid-year, and they differ by utility and by whether the property is owner-occupied or rented. A number printed in this document would become a promise nobody here made. What follows is how to find the current terms, which stays true.' },
        { t: 'h2', text: 'What to ask for, in order' },
        { t: 'numbers', items: [
          'A home energy audit through your electric or gas utility\'s efficiency programme. Ask specifically whether it includes a blower-door test — that is the one that finds the air leaks, and it is what makes the rest of the work worth doing.',
          'The air sealing and insulation incentive that follows the audit. These are usually offered together, and the audit is what qualifies you.',
          'Any heat pump or heating system incentive, if you are replacing equipment anyway. Replacing a working boiler to chase an incentive rarely pays; replacing a failing one is a different calculation.',
          'Income-eligible weatherization, which is a separate and much larger programme administered through community action agencies rather than the utility. Ask about it even if you think you will not qualify — the thresholds are higher than most people assume.',
          'For a rental: ask what is available to landlords specifically. Some programmes treat rented property differently, and some require tenant income documentation.',
        ] },
        { t: 'h2', text: 'Where to ask' },
        { t: 'bullets', items: [
          'Your electric utility\'s efficiency programme, by name — the programmes are branded and the call centre will route you.',
          'Your gas or oil supplier, which may have its own separate offering.',
          'The New Hampshire Public Utilities Commission, which oversees the ratepayer-funded programmes and publishes what is current.',
          'Your regional community action agency for income-eligible weatherization.',
        ] },
        { t: 'h2', text: 'The order that saves the most' },
        { t: 'p', text: 'Air sealing, then insulation, then equipment. It is tempting to start with the furnace because it is the thing that makes the heat, but a new high-efficiency boiler heating a leaky envelope is an expensive way to warm the outdoors. The audit exists to tell you where your particular house is losing it.' },
      ],
    },
    {
      title: `The full checklist: ${ITEM_COUNT} items`,
      blocks: [
        { t: 'p', text: 'Every item, with the window it belongs in and what happens if it is missed. The Word workbook in this package has the same list with space to record the date and who did it.' },
        ...CHECKLIST.flatMap(([group, items]) => [
          { t: 'h2', text: group },
          {
            t: 'table',
            head: ['Do this', 'When', 'Why it matters'],
            rows: items.map(([task, when, why]) => [task, when, why]),
            widths: [0.27, 0.16, 0.57],
          },
        ]),
      ],
    },
  ];
}

// ── The Word workbook ───────────────────────────────────────────────────────

function workbook() {
  const content = [
    dTitle('NH Winter Prep Workbook'),
    dP([{ t: 'Print this, keep it where the heating plant is, and fill it in as you go. Next September it tells you what you did and when.', i: true, color: '57534E' }]),
    spacer(),

    dH1('The property'),
    fill('Property', 4.2),
    fill('Address', 4.2),
    fill('Winter of', 2),
    fill('Completed by', 3),
    spacer(),

    dH1('Shutoffs and controls'),
    dNote('Fill this in once. The minute a pipe bursts is the wrong time to be looking for the main.'),
    dTable([
      ['What', 'Where it is', 'How it operates'],
      ['Water main shutoff', '', ''],
      ['Water heater shutoff', '', ''],
      ['Electrical panel', '', ''],
      ['Main breaker', '', ''],
      ['Fuel shutoff (oil / propane / gas)', '', ''],
      ['Boiler / furnace emergency switch', '', ''],
      ['Exterior hose bib shutoffs', '', ''],
      ['Septic tank and leach field', '', ''],
      ['Well head', '', ''],
    ], [0.3, 0.38, 0.32]),
    spacer(),

    dH1('Who to call'),
    dTable([
      ['Trade', 'Company', 'Phone', 'Account or notes'],
      ['Heating service', '', '', ''],
      ['Plumber', '', '', ''],
      ['Electrician', '', '', ''],
      ['Fuel delivery', '', '', ''],
      ['Snow removal', '', '', ''],
      ['Roofer', '', '', ''],
      ['Chimney sweep', '', '', ''],
      ['Utility outage line', '', '', ''],
      ['Insurance claims', '', '', ''],
      ['Water mitigation (24h)', '', '', ''],
    ], [0.22, 0.26, 0.2, 0.32]),
    dNote('Fill in the water mitigation line before you need it. At two in the morning with water coming through a ceiling, the first company that answers is the one you will use, and it should be one you chose.'),
    pageBreak(),

    dH1(`The checklist — ${ITEM_COUNT} items`),
    dP([{ t: 'Tick it, date it, initial it. An item with a date beside it is evidence; an item with a tick is a memory.', i: true, color: '57534E' }]),
  ];

  for (const [group, items] of CHECKLIST) {
    content.push(dH2(group));
    content.push(dTable(
      [['Done', 'Task', 'When', 'Date', 'By']].concat(
        items.map(([task, when]) => ['☐', task, when, '', '']),
      ),
      [0.07, 0.46, 0.17, 0.16, 0.14],
    ));
  }

  content.push(
    pageBreak(),
    dH1('Storm log'),
    dNote('One line per storm or outage. This is what makes next year\'s preparation specific rather than general.'),
    dTable([
      ['Date', 'What happened', 'What failed or was missing', 'What to do differently'],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
      ['', '', '', ''],
    ], [0.13, 0.29, 0.29, 0.29]),
    spacer(),

    dH1('Next September'),
    dNote('Written in April, read in September. The three things you wish you had done sooner.'),
    ...[1, 2, 3].flatMap((n) => [dP([{ t: `${n}.`, b: true }]), fill('', 5.5)]),
    spacer(),
    dH2('Notes'),
    ...Array.from({ length: 6 }, () => fill('', 5.5)),
  );

  return content;
}

// ── Build ───────────────────────────────────────────────────────────────────

export async function build() {
  const book = renderBook({
    title: 'NH Winter Prep Package',
    subtitle: 'Get your property ready for New Hampshire winters',
    blurb: `Six systems, ${ITEM_COUNT} jobs, and the three windows that decide whether winter is quiet or expensive. Organised by when each thing has to happen and what it costs to miss it — because the booking you cannot get in November is the one that matters most.`,
    audience: AUDIENCE,
    edition: 'Winter 2026-27 edition',
    keywords: 'winterization, New Hampshire, ice dams, frozen pipes, storm preparation',
    chapters: guideChapters(),
  });

  const docx = buildDocx({
    title: 'NH Winter Prep Workbook',
    subject: 'Fillable winterization checklist, shutoff record and storm log',
    keywords: 'winterization, checklist, New Hampshire',
    footer: 'NH Winter Prep Workbook',
    content: workbook(),
  });

  return [
    { name: 'NH Winter Prep Guide.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
    { name: 'NH Winter Prep Workbook.docx', mime: DOCX_MIME, buffer: docx },
  ];
}

/** Checked by `verify.mjs`: the archive opens, and the promises are kept. */
export async function selfCheck() {
  const { unzip } = await import('../lib/zip.mjs');
  const files = await build();
  const pdf = files.find((f) => f.name.endsWith('.pdf'));
  const docx = files.find((f) => f.name.endsWith('.docx'));
  const concerns = [];

  // The Word file must actually be a readable package.
  let parts = [];
  try {
    parts = unzip(docx.buffer).map((f) => f.name);
  } catch (error) {
    concerns.push(`the Word file is not a readable archive: ${error.message}`);
  }
  for (const required of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml']) {
    if (!parts.includes(required)) concerns.push(`the Word file is missing ${required}`);
  }

  if (!pdf?.buffer?.length || pdf.buffer.subarray(0, 4).toString() !== '%PDF') {
    concerns.push('the PDF does not start with %PDF');
  }
  if ((pdf?.pages || 0) < 12) concerns.push(`only ${pdf?.pages} pages — thin for $34`);
  if (ITEM_COUNT < 40) concerns.push(`the listing promises a 47-item checklist and this has ${ITEM_COUNT}`);

  // Every item must carry its window and its consequence, or it is just a list.
  const missing = CHECKLIST.flatMap(([, items]) => items)
    .filter(([task, when, why]) => !task || !when || !why || why.length < 40);
  if (missing.length) concerns.push(`${missing.length} checklist item(s) have no real "why" — the thing that stops them being skipped`);

  return {
    figures: [
      ['checklist items', `${ITEM_COUNT} across ${CHECKLIST.length} systems`],
      ['guide', `${pdf?.pages} pages, ${Math.round((pdf?.buffer.length || 0) / 1024)} KB`],
      ['workbook', `${parts.length} parts, ${Math.round((docx?.buffer.length || 0) / 1024)} KB`],
      ['word parts', parts.join(', ')],
    ],
    concerns,
  };
}
