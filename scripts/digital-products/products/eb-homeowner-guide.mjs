/**
 * First-Time Homeowner Complete Guide — `eb-homeowner-guide`, $14.
 *
 * THE ONLY PRODUCT IN THE CATALOGUE AIMED AT A HOMEOWNER
 *
 * Everything else here is written for landlords, boards and managers — people
 * with a commercial interest and some professional distance. This one is for
 * somebody who has just bought their first house in New Hampshire, is slightly
 * frightened of it, and does not know what they do not know.
 *
 * So the voice is different: warmer, less procedural, and organised around
 * what a new owner is actually anxious about rather than around systems. The
 * first chapter is thirty days of orientation, because the single most useful
 * thing a new owner can do is find out where the shutoffs are before they need
 * them.
 *
 * WHY THE LIFE EXPECTANCY CHAPTER IS THE CENTRE OF IT
 *
 * Because the thing that makes first-time ownership frightening is not any one
 * repair, it is not knowing which repairs are coming. A roof at year twenty-two
 * of a twenty-five-year life is a known, budgetable event. The same roof,
 * unknown, is an ambush. Telling somebody the typical service life of the eleven
 * things that will cost them money converts dread into a plan, and that is worth
 * more than any single piece of advice in the book.
 *
 * NO REBATE FIGURES, AS EVERYWHERE ELSE
 *
 * The listing promises an "Eversource NH rebate guide". Delivered as what to
 * ask for, in what order, and who to ask — because programme amounts, caps and
 * eligibility change, and a figure printed in a book becomes a promise nobody
 * here made. Reported by `selfCheck` so the bullet gets reworded.
 */
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';

export const meta = {
  id: 'eb-homeowner-guide',
  title: 'First-Time Homeowner Complete Guide',
  subtitle: 'Your first year of ownership — done right',
  price: 1400,
  files: ['pdf'],
};

/**
 * Typical service life, and what it costs when it goes.
 *
 * Ranges rather than single figures, because a roof in full sun on a windy hill
 * does not last as long as one under trees — and because a single number invites
 * somebody to treat year twenty-five as a deadline.
 */
const LIFESPANS = [
  ['Asphalt shingle roof', '20 to 30 years', '$9,000 to $22,000', 'Look for granules in the gutters and shingles that curl at the edge. A roof replaced a year early costs money; one replaced a year late costs the ceiling too.'],
  ['Gas or oil boiler / furnace', '15 to 25 years', '$5,000 to $12,000', 'Serviced annually it reaches the top of that range. Unserviced it does not, and it fails in February rather than in June.'],
  ['Hot water tank', '8 to 12 years', '$1,400 to $2,600', 'The one most likely to fail suddenly and flood a basement. Look for rust at the base and replace it on age rather than on failure — this is the single best preventive spend in the house.'],
  ['Heat pump / air conditioning', '12 to 18 years', '$5,000 to $14,000', 'Keep the outdoor unit clear of snow and leaves and it lasts; buried, it ices up and the compressor pays for it.'],
  ['Vinyl siding', '30 to 40 years', '$12,000 to $28,000', 'Usually fails at the fixings and around penetrations rather than in the middle of a wall.'],
  ['Windows (double glazed)', '20 to 30 years', '$450 to $900 each', 'The seal fails before the frame. Misting between the panes is the sign, and it is not repairable.'],
  ['Asphalt driveway', '15 to 25 years', '$4,000 to $9,000', 'Seal coating every three to five years roughly doubles the life, and it is the cheapest maintenance on this list.'],
  ['Septic system', '25 to 40 years', '$18,000 to $35,000', 'Pumped every three to five years it lasts. Not pumped, the leach field fails, and that is the most expensive line in this table.'],
  ['Well pump', '10 to 15 years', '$1,200 to $3,000', 'Fails without warning, and the house has no water until it is replaced. Worth knowing the make and where the controls are.'],
  ['Deck (pressure-treated)', '15 to 25 years', '$6,000 to $18,000', 'Check the ledger board where it meets the house and the post bases. Those two fail first and they are the structural ones.'],
  ['Interior paint', '5 to 10 years', '$2,500 to $6,000', 'Cosmetic, deferrable, and the first thing to postpone when something on this list arrives early.'],
];

/** The first thirty days, in the order that matters. */
const FIRST_30 = [
  ['Day one', 'Find and label the water main shutoff', 'The minute a pipe bursts is a bad time to be looking for it. Everybody in the household should know where it is and how it turns.'],
  ['Day one', 'Find the electrical panel and check it is labelled', 'If it is not, work out what each breaker does and write it on. An hour, once, and worth it at the worst moment.'],
  ['Day one', 'Locate the fuel shutoff and the boiler emergency switch', 'Oil, propane or gas. And the switch that stops the heating plant.'],
  ['Day one', 'Test every smoke and carbon monoxide alarm', 'With the button. Replace any over ten years old regardless of whether it beeps — the sensor degrades even when the test works.'],
  ['Week one', 'Change the locks', 'You do not know how many keys exist. Cheap, and it is the only way to know.'],
  ['Week one', 'Find the filter and change it', 'Furnace or air handler. Note the size on your phone so you never have to work it out again.'],
  ['Week one', 'Work out what heats the water, and how old it is', 'There is usually a date on the label. If it is over eight years, start budgeting rather than waiting.'],
  ['Week one', 'Read the meters and set up every utility account', 'Including which services you pay and which were on the seller\'s account.'],
  ['Week two', 'Walk the exterior slowly, with a notebook', 'Grading away from the foundation, gutter discharge, anything touching the siding, cracked flashing, loose railings. An hour, and it sets your first year of jobs.'],
  ['Week two', 'Find the septic cover and the well head, and mark them', 'Before snow. A plough cannot see them and a vehicle over a leach field is expensive.'],
  ['Week two', 'Check the attic', 'Insulation depth, daylight where there should be none, staining on the sheathing, and whether the bath fans discharge outside rather than into the attic.'],
  ['Week three', 'Collect the paperwork into one place', 'Survey, title policy, inspection report, appliance manuals and warranties, any permits, the seller\'s disclosures.'],
  ['Week three', 'Write down the age of every system you can date', 'Roof, heating, water heater, windows, siding, driveway, septic. This becomes your replacement plan.'],
  ['Week three', 'Read your insurance policy declarations page', 'What is covered, what the deductible is, and whether anything is excluded. Most people first read it during a claim.'],
  ['Week four', 'Build the maintenance calendar and the budget', 'Chapters four and five. Twenty minutes, and it is the difference between surprises and a plan.'],
  ['Week four', 'Find your three tradespeople before you need them', 'A plumber, an electrician and a heating engineer. Ask neighbours. Call each one for something small, so that the first time you call in a crisis you are already a customer.'],
];

/** What to ask a contractor, and what a wrong answer sounds like. */
const HIRING = [
  ['Is the work in writing, with exclusions?', 'Reluctance, or "I\'ll sort it out as I go". Everything else on this list follows from this one.'],
  ['Can I see your certificate of insurance, from your agency?', 'A PDF forwarded by the contractor, or one that expires before the work finishes. Ask for general liability and workers\' compensation.'],
  ['Is the name on the contract the same as the name on the insurance?', 'Three different trading names for the same person makes a claim very hard.'],
  ['For electrical, plumbing or gas: what is your licence number?', 'Hesitation. New Hampshire licenses these trades specifically, and the number can be checked.'],
  ['Who pulls the permit?', '"It doesn\'t need one" when the town says otherwise. Unpermitted work surfaces when you sell, which is the worst possible moment.'],
  ['What is the payment schedule?', 'Most of the money up front on labour-only work. A deposit for materials is normal; a deposit for showing up is not.'],
  ['What warranty, on labour and on materials?', '"Everything is guaranteed." They are two warranties with two different lengths, and the labour one is the one that matters.'],
  ['Two references for this same work, on a house like mine?', 'Vagueness, or references from a different kind of job entirely.'],
  ['How are changes priced?', '"We\'ll work it out." The most expensive answer in this table.'],
];

function chapters() {
  return [
    {
      title: 'The first thirty days',
      blocks: [
        { t: 'p', text: 'Congratulations, and welcome to the part nobody prepares you for. A house is not complicated, but it does have about a dozen things in it that will cost you real money, and the difference between a stressful first year and a calm one is almost entirely about knowing which ones and when.' },
        { t: 'p', text: 'Start here. Sixteen jobs, none of them hard, spread over four weeks. Most are about finding things rather than fixing them.' },
        { t: 'table', head: ['When', 'Do this', 'Why'], rows: FIRST_30, widths: [0.11, 0.3, 0.59] },
        { t: 'callout', heading: 'If you only do three of these today', body: 'Find the water shutoff, test the alarms, and write the furnace filter size in your phone. The first one limits the damage from the most expensive thing that can happen suddenly, the second is about somebody being hurt rather than about money, and the third you will use six times a year for as long as you own the house.' },
        { t: 'h2', text: 'A note on the inspection report' },
        { t: 'p', text: 'Read it again now that the house is yours, properly, not as a negotiation document. It is the most informative thing you own about your own building, and the "monitor" and "recommend further evaluation" items are a to-do list that the pressure of a purchase usually buries. Work through them in the first year.' },
      ],
    },
    {
      title: 'What you own, and when it will need replacing',
      blocks: [
        { t: 'p', text: 'The thing that makes first-time ownership frightening is not any single repair. It is not knowing which repairs are coming. A roof at year twenty-two of a twenty-five-year life is a known event you can budget for; the same roof, unknown, is an ambush.' },
        { t: 'p', text: 'So: write down the age of everything you can date, and read it against this table. Twenty minutes, and most of the anxiety goes with it.' },
        { t: 'table', head: ['What', 'Typical life', 'Replacement cost', 'What to watch for'], rows: LIFESPANS, widths: [0.18, 0.14, 0.17, 0.51] },
        { t: 'p', text: 'Ranges rather than single figures, deliberately. A roof in full sun on an exposed hill does not last as long as one under trees, and a single number invites you to treat year twenty-five as a deadline rather than a window.' },
        { t: 'h2', text: 'How to turn this into a plan' },
        { t: 'numbers', items: [
          'List every system with the year it was installed, as best you can establish. Labels, permits, the inspection report, or ask a neighbour who has lived there longer.',
          'Add the typical life to get a rough replacement year for each.',
          'Divide each replacement cost by its remaining years. That is what you should be setting aside annually for that item.',
          'Add them up. That total is your real annual cost of owning the building, and it is almost always between $2,500 and $5,000 for a typical New Hampshire single-family house.',
          'Put it in an account you do not touch. Chapter five covers how much and where.',
        ] },
        { t: 'callout', heading: 'The water heater, specifically', body: 'Of everything in that table it is the one most likely to fail suddenly and to flood something while doing it. It is also the cheapest to replace on the list. Replacing it on age — at ten or eleven years, before it fails — rather than on failure is the single best preventive spend available to a homeowner, and almost nobody does it.' },
      ],
    },
    {
      title: 'How your house works, and the words for it',
      blocks: [
        { t: 'p', text: 'This chapter exists for one practical reason: you cannot get good help describing a problem badly. A plumber given "there is water in the basement" sends somebody for an hour to find out what you could have told them on the phone. The vocabulary below is worth half an hour, and it saves call-outs for years.' },
        { t: 'h2', text: 'Water coming in' },
        { t: 'p', text: 'There are only four ways water gets into a house, and they are distinguishable without any expertise at all:' },
        { t: 'bullets', items: [
          'From the supply — a pipe, a fitting, an appliance. It runs whether or not it is raining, it is usually clean, and turning the main off stops it. If turning off the main stops it, say so when you call; it halves the diagnosis.',
          'From the drains — a blockage or a failed seal. It appears when something is used and it smells.',
          'From outside, through the structure — rain or snowmelt. It follows weather, and it stops when the weather does.',
          'From the air — condensation. It appears on cold surfaces in humid conditions, it is widespread rather than in one spot, and it is a ventilation problem rather than a leak.',
        ] },
        { t: 'p', text: 'Say which of those four it looks like, where it is, when it started, and whether it follows the weather or the taps. That is a useful phone call.' },
        { t: 'h2', text: 'The heating system, in parts' },
        { t: 'table', head: ['Part', 'What it does', 'What it sounds like when it is the problem'], rows: [
          ['Boiler or furnace', 'Makes the heat — a boiler heats water, a furnace heats air.', 'No heat anywhere, or it starts and stops quickly. Note any error code on the display before you call; it is the first thing they will ask.'],
          ['Distribution', 'Moves it — pipes and radiators, or ducts and vents.', 'Heat in some rooms and not others. Air in the pipes, or a blocked or closed vent.'],
          ['Thermostat', 'Decides when.', 'Nothing comes on at all, or it runs constantly. Check it is calling for heat before assuming the boiler has failed.'],
          ['Circulator or blower', 'Pushes the heat around.', 'The boiler is hot and the house is not. Often an audible hum, or silence where there should be one.'],
          ['Zone valves', 'Send heat to one part of the house.', 'One whole floor or wing cold while the rest is fine.'],
        ], widths: [0.17, 0.33, 0.5] },
        { t: 'p', text: 'Being able to say "the boiler is hot, the thermostat is calling, and only the upstairs is cold" turns a diagnostic visit into a repair visit.' },
        { t: 'h2', text: 'Electrical, enough to be safe' },
        { t: 'bullets', items: [
          'A breaker trips to protect the wiring. One that trips once is a fault to find; one that trips repeatedly is a fault to stop resetting and get looked at.',
          'A GFCI outlet (the one with the buttons, near water) trips to protect a person. Test them with the button a couple of times a year.',
          'If half the house loses power and the rest is fine, that is unusual and is worth a call rather than an experiment — it can indicate a problem at the service rather than inside.',
          'Warm switch plates, a smell of burning plastic, or lights that dim when an appliance starts: stop and call an electrician. These are not wait-and-see symptoms.',
        ] },
        { t: 'h2', text: 'Well and septic, if you have them' },
        { t: 'p', text: 'About half of New Hampshire houses are not on town services, and the two systems are simple but unforgiving.' },
        { t: 'bullets', items: [
          'A well needs electricity. No power means no water, which is why water storage is in the outage plan.',
          'Falling pressure, or air spitting from a tap, usually means the pump or the pressure tank rather than the plumbing.',
          'Test well water periodically. New Hampshire has naturally occurring arsenic and radon in groundwater in parts of the state, and both are invisible and tasteless — ask the state or your town what is recommended locally and how often.',
          'A septic system wants pumping every three to five years. Nothing down the drain but waste and paper; no wipes, no fat, no chemicals that kill the bacteria doing the work.',
          'Never drive or park over the leach field, and keep piled snow off it. Compaction and deep frost are both how a field that would have lasted decades fails.',
        ] },
        { t: 'callout', heading: 'The three sentences that make a good call', body: 'What it is doing, when it started, and what you have already checked. "No heat upstairs since this morning, thermostat is calling, boiler is hot to the touch, other floors fine." A tradesperson hearing that arrives with the right part. One hearing "the heating is broken" arrives twice.' },
      ],
    },
    {
      title: 'The year in a New Hampshire house',
      blocks: [
        { t: 'p', text: 'Four seasons, and here they are genuinely four different jobs. The freeze-thaw cycle, a five-month heating season and mud season mean a maintenance calendar from elsewhere will have you doing the right things at the wrong time.' },
        { t: 'h2', text: 'Autumn is the season that matters most' },
        { t: 'p', text: 'If you do nothing else all year, do autumn. Almost every expensive winter failure is prevented by an afternoon in October.' },
        { t: 'bullets', items: [
          'September: book the heating service. By November a technician is triaging no-heat calls and an appointment is simply not available.',
          'September: sign the snow contract if you are not clearing it yourself. The good contractors are full by early November.',
          'Early October: disconnect every hose and drain every exterior tap. The most expensive five-minute job you will ever do — a hose left on traps water in the tap, which splits inside the wall and is discovered in April by the ceiling below.',
          'Early October: blow out the irrigation system if you have one.',
          'Late October: clear the gutters once the leaves are actually down. Full gutters hold water, water freezes, and ice backs up under the shingles. This is the cause of most ice dam damage.',
          'October: test every alarm, mark the driveway edges and the septic cover, and buy a roof rake before the first storm sells them out statewide.',
        ] },
        { t: 'h2', text: 'Winter' },
        { t: 'bullets', items: [
          'Keep the outdoor heat pump unit and any high-efficiency exhaust vent clear of snow. A blocked vent shuts the system down, or worse.',
          'In a hard freeze: open cabinet doors under sinks on exterior walls, leave interior doors open, and run a trickle on the coldest run. Moving water freezes far more slowly and an open tap relieves the pressure that actually bursts the pipe.',
          'Do not drop the thermostat at night during a deep freeze. The saving is a few dollars and the exposure is a wall.',
          'Watch for ice dams after each thaw — from the ground, with a rake. Not from a ladder on ice.',
        ] },
        { t: 'h2', text: 'Spring' },
        { t: 'bullets', items: [
          'Walk the whole exterior as the snow goes. Everything winter broke is visible for about two weeks: lifted shingles, bent gutters, cracked flashing, a split tap.',
          'Turn the exterior water back on with somebody watching inside. A split tap only leaks once there is pressure.',
          'Check the basement for water, and the foundation. Mud season is when a grading problem announces itself.',
          'Test the sump pump before you need it.',
        ] },
        { t: 'h2', text: 'Summer' },
        { t: 'bullets', items: [
          'The month for anything needing dry weather: painting, sealing, deck work, the driveway.',
          'Trim vegetation a foot clear of the siding. Growth against a wall holds damp and carries insects in.',
          'Check the attic on a hot day. If it is far hotter than outside, the ventilation is not working — and that is the same fault that causes winter ice dams.',
          'Clean the dryer vent. A lint fire does not care what month it is.',
        ] },
        { t: 'p', text: 'The NH Winter Prep Package covers autumn and winter in full detail — forty-seven items with the window each belongs in — and the Annual Maintenance Planner carries the whole year with costs and a tracker.' },
      ],
    },
    {
      title: 'What a house actually costs',
      blocks: [
        { t: 'p', text: 'The mortgage is the predictable part and it is not the whole cost. The figure that surprises first-time owners is the gap between the mortgage payment and what actually leaves the account.' },
        { t: 'h2', text: 'The annual budget, honestly' },
        { t: 'table', head: ['What', 'Typical annual cost', 'Note'], rows: [
          ['Property tax', '$4,000 to $9,000', 'Varies enormously by town in New Hampshire — more than almost any other state. Check the actual bill rather than a rate of thumb.'],
          ['Insurance', '$900 to $1,800', 'Read the declarations page once a year.'],
          ['Heating', '$1,800 to $3,500', 'Depends heavily on fuel and on how well the house is sealed. The audit in chapter seven is how you lower it.'],
          ['Electricity', '$1,200 to $2,400', ''],
          ['Water and sewer, or well and septic', '$400 to $1,200', 'A well and septic cost less annually and more when they fail.'],
          ['Snow and landscaping', '$800 to $3,000', 'Less if you do it yourself, but budget for equipment and its servicing.'],
          ['Routine maintenance', '$1,000 to $2,000', 'Filters, servicing, small repairs, seal coating.'],
          ['Replacement reserve', '$2,500 to $5,000', 'From chapter two. The line everybody omits, and the one that turns a failure into a plan.'],
        ], widths: [0.3, 0.22, 0.48] },
        { t: 'p', text: 'Which puts the true annual cost of a typical New Hampshire single-family house somewhere between about $12,000 and $25,000 before the mortgage. That is not a reason to be alarmed — it is the number that lets you plan instead of react.' },
        { t: 'h2', text: 'Three accounts' },
        { t: 'numbers', items: [
          'The current account, for the mortgage and the monthly bills.',
          'A maintenance account, holding about two months of the routine figure. This is what pays for the filter, the service and the small repair without a conversation.',
          'A replacement account, receiving the reserve figure monthly and touched only for the things in the chapter two table. Keep it somewhere slightly inconvenient to reach.',
        ] },
        { t: 'callout', heading: 'The emergency fund is separate', body: 'Three to six months of living costs, for job loss and illness, is not the same money as the roof fund and should not be the same account. A household that replaces a boiler out of its emergency fund has not had an emergency yet — it has had a Tuesday — and the fund is now gone for the one that is coming.' },
        { t: 'h2', text: 'The first-year trap' },
        { t: 'p', text: 'Almost everybody overspends in year one on things they can see — paint, furniture, a kitchen — and underspends on things they cannot. Then the water heater goes. If you are choosing between a cosmetic project and funding the replacement account, the account wins every time in the first two years. The kitchen will still be there; the boiler may not.' },
      ],
    },
    {
      title: 'When the power goes out',
      blocks: [
        { t: 'p', text: 'A multi-day outage in an ice storm is a normal New Hampshire event rather than a disaster scenario. Prepared it is an inconvenience; unprepared, with a well pump and electric heat, it is genuinely serious.' },
        { t: 'h2', text: 'The plan, written once' },
        { t: 'p', text: 'Fill this in and put it on the inside of a cupboard door. It is the single most useful page in this book during the one week a year it is needed.' },
        { t: 'fields', pairs: [
          ['Water main shutoff is', ''],
          ['Electrical panel is', ''],
          ['Main breaker is', ''],
          ['Fuel shutoff is', ''],
          ['Boiler emergency switch is', ''],
          ['Well pump controls are', ''],
          ['Utility outage line', ''],
          ['Plumber', ''],
          ['Electrician', ''],
          ['Heating engineer', ''],
          ['Insurance claims line', ''],
          ['Policy number', ''],
          ['Water mitigation, 24 hour', ''],
          ['Neighbour with a key', ''],
          ['Where the torches are', ''],
          ['Where the water is stored', ''],
        ] },
        { t: 'h2', text: 'Before a storm' },
        { t: 'bullets', items: [
          'Charge everything, including a battery bank and one torch per person.',
          'Fill containers with drinking water. A well pump needs electricity, so losing power means losing water.',
          'Fill the car. Pumps need power too.',
          'Get cash. Card readers do not work in an outage.',
          'Set the fridge and freezer colder. A full freezer holds about 48 hours unopened; a half-full one about 24.',
          'Bring in or tie down anything the wind will take.',
        ] },
        { t: 'h2', text: 'During' },
        { t: 'bullets', items: [
          'A generator runs OUTSIDE only, at least twenty feet from any window, door or vent. Not in a garage, even with the door open. Generator carbon monoxide kills people in New England every winter.',
          'Never connect a generator to the house wiring without a transfer switch installed by an electrician. Backfeeding kills line workers.',
          'Heat one room rather than the house. Close doors, cover windows at night.',
          'Treat every downed line as live and keep well back.',
          'Keep the fridge closed. Every look costs hours.',
        ] },
        { t: 'h2', text: 'After' },
        { t: 'bullets', items: [
          'Walk the exterior before the snow goes and photograph anything damaged, dated, before touching it.',
          'Check the attic for damp and the ceilings for new stains.',
          'Throw out refrigerated food that has been above 40°F for four hours or more. Frozen food with ice crystals is fine.',
          'Write down what you wished you had. That note is next September\'s shopping list.',
        ] },
      ],
    },
    {
      title: 'Hiring somebody',
      blocks: [
        { t: 'p', text: 'New Hampshire does not issue a general contractor licence, which surprises people moving from other states and changes how you check somebody out. Anybody may describe themselves as a contractor or a handyman, and "licensed and insured" in an advertisement may mean only the second half.' },
        { t: 'p', text: 'That is not a reason to distrust tradespeople here — most are excellent and word of mouth works well in small towns. It is a reason to verify differently.' },
        { t: 'h2', text: 'Nine questions, and what a wrong answer sounds like' },
        { t: 'table', head: ['Ask', 'The answer that should worry you'], rows: HIRING, widths: [0.37, 0.63] },
        { t: 'h2', text: 'What is and is not a red flag' },
        { t: 'p', text: 'Being suspicious of the wrong things is how people end up with the wrong contractor. A one-van operation, no website, being expensive, or being booked up are not warning signs — several of the best trades in New Hampshire are one person and a reputation, and a contractor with a waiting list is a recommendation.' },
        { t: 'p', text: 'What genuinely should worry you: no written scope, pressure to decide today, cash only, most of the money up front, unwilling to pull permits, and doing licensed work without producing the licence number.' },
        { t: 'callout', heading: 'The cheapest bid', body: 'Usually lowest for a reason, and the reason is almost always something left out — which you then pay for anyway, later, at a price nobody competed for. Compare the EXCLUSIONS before the prices. On anything substantial get three quotes on the same written scope, and if one is far below the others, ask what it does not include.' },
        { t: 'h2', text: 'Find your three before you need them' },
        { t: 'p', text: 'A plumber, an electrician and a heating engineer, found in a calm month, each called once for something small. The first time you ring somebody should not be at eleven at night with water coming through a ceiling — that is the call where you take whoever answers. Being an existing customer is worth more than any amount of research on the night.' },
      ],
    },
    {
      title: 'Making it cheaper to heat',
      blocks: [
        { t: 'p', text: 'Heating is the largest controllable cost in a New Hampshire house, and the order you spend money in makes a very large difference to what you get back.' },
        { t: 'h2', text: 'The order that saves the most' },
        { t: 'numbers', items: [
          'Air sealing. Gaps around light fittings, the attic hatch, plumbing penetrations, rim joists. Cheap, unglamorous, and the highest return per dollar in the whole house.',
          'Insulation, particularly the attic, right out to the eaves — without blocking the soffit vents.',
          'Ventilation, so the roof deck stays cold. This is also what prevents ice dams, which is why the same work solves two problems.',
          'Windows and doors: weatherstripping first, replacement much later. Replacing windows for efficiency alone rarely pays back; replacing them because they have failed is a different decision.',
          'Equipment last. A new high-efficiency boiler heating a leaky house is an expensive way to warm the outdoors.',
        ] },
        { t: 'p', text: 'It is tempting to start with the furnace, because it is the thing that makes the heat. Almost every energy auditor will tell you to start with the envelope, and they are right.' },
        { t: 'h2', text: 'The audit, and the incentives' },
        { t: 'p', text: 'New Hampshire has run utility-funded efficiency programmes for years, and a subsidised home energy audit is the best value available on an older house. Ask specifically whether it includes a blower-door test — that is the one that finds the air leaks and makes the rest of the work worth doing.' },
        { t: 'callout', heading: 'Why there are no figures here', body: 'Programme amounts, caps and eligibility change, sometimes mid-year, and they differ by utility and by circumstance. A number printed in this book would become a promise nobody here made. What follows is how to find the current terms, which stays true.' },
        { t: 'h2', text: 'What to ask for, and who to ask' },
        { t: 'numbers', items: [
          'A home energy audit through your electric or gas utility\'s efficiency programme, including a blower-door test.',
          'The air sealing and insulation incentive that follows the audit — these are usually offered together, and the audit is what qualifies you.',
          'Any heating equipment or heat pump incentive, if you are replacing equipment anyway. Replacing a working boiler to chase an incentive rarely pays.',
          'Income-eligible weatherization, which is a separate and much larger programme run through community action agencies rather than the utility. Ask even if you assume you will not qualify — the thresholds are higher than most people expect.',
        ] },
        { t: 'p', text: 'Call your electric utility\'s efficiency programme by name, your fuel supplier, and your regional community action agency. Three calls, one afternoon, and some of them require pre-approval and will not pay retrospectively — so ask before the work rather than after.' },
      ],
    },
    {
      title: 'The things first-time owners get wrong',
      blocks: [
        { t: 'p', text: 'Collected from the pattern rather than from any one house. None of these is foolish; all of them are common.' },
        { t: 'h2', text: 'Nine of them' },
        { t: 'numbers', items: [
          'Not knowing where the water shutoff is. The most consequential omission in the book, and it takes five minutes to fix.',
          'Leaving a hose connected over winter. The most expensive five minutes not spent.',
          'Spending year one on what is visible and nothing on what is not. Paint is deferrable; a water heater at year twelve is not.',
          'Treating the emergency fund and the replacement fund as the same money. Then the boiler goes and there is no emergency fund.',
          'Deferring the annual heating service to save $220, and paying $600 for an out-of-hours call in February.',
          'Taking the cheapest quote without reading what it excluded.',
          'Not reading the insurance declarations page until making a claim.',
          'Ignoring the "monitor" items in the inspection report, which is a to-do list that the pressure of buying buries.',
          'Doing licensed work unlicensed, or letting somebody else do it. It is a problem with the town, with the insurer, and at resale.',
        ] },
        { t: 'h2', text: 'And three things worth doing that nobody mentions' },
        { t: 'bullets', items: [
          'Keep a house notebook. One page a year: what was done, by whom, what it cost. It answers every question a future buyer asks and most of the ones you will ask yourself.',
          'Photograph the walls before you close them up. Any time something is open — a wall, a ceiling, a floor — take pictures of what is behind it. In ten years that photograph will save somebody a day of searching.',
          'Introduce yourself to the neighbours who have been there longest. They know what the house has done before, where the septic is, who the previous owner used, and what the drive does in a bad winter. It is the best source of information about your own house and it is free.',
        ] },
        { t: 'callout', heading: 'The honest summary of the whole book', body: 'A house is not a series of emergencies. It is about a dozen known items with known lifespans, a handful of seasonal jobs, and one afternoon in October. Write down the ages, set aside the money, do the autumn list, and find your three tradespeople before you need them. Everything else is detail — and you will be more on top of it than most people who have owned a house for twenty years.' },
      ],
    },
  ];
}

export async function build() {
  const book = renderBook({
    title: 'First-Time Homeowner Complete Guide',
    subtitle: 'Your first year of ownership — done right',
    blurb: 'What makes a first house frightening is not any single repair — it is not knowing which repairs are coming. So this is thirty days of orientation, the typical life and replacement cost of the eleven things that will cost you money, the New Hampshire year season by season, what a house honestly costs beyond the mortgage, and the nine questions to ask anybody you hire.',
    audience: ['Homeowners', 'First-Time Buyers'],
    edition: '2026 edition',
    keywords: 'homeowner, New Hampshire, maintenance, budget, first home',
    chapters: chapters(),
  });

  return [
    { name: 'First-Time Homeowner Complete Guide.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
  ];
}

export async function selfCheck() {
  const files = await build();
  const pdf = files[0];
  const concerns = [];

  if (pdf.buffer.subarray(0, 4).toString() !== '%PDF') concerns.push('the PDF does not start with %PDF');
  if (pdf.pages < 18) concerns.push(`only ${pdf.pages} pages`);

  // The lifespan table is the centre of the book. Every row needs a cost and a
  // "what to watch for", or it is trivia rather than a plan.
  const thinLives = LIFESPANS.filter(([, life, cost, watch]) => !life || !cost || !watch || watch.length < 40);
  if (thinLives.length) concerns.push(`${thinLives.length} lifespan row(s) lack a cost or something to watch for`);
  if (LIFESPANS.length < 10) concerns.push(`only ${LIFESPANS.length} systems in the lifespan table`);

  // The thirty days is the first chapter and the reason somebody buys this.
  const thinDays = FIRST_30.filter(([, , why]) => !why || why.length < 40);
  if (thinDays.length) concerns.push(`${thinDays.length} first-thirty-days item(s) do not say why`);

  // Hiring questions are worthless without the wrong answer to listen for.
  const thinHiring = HIRING.filter(([, wrong]) => !wrong || wrong.length < 30);
  if (thinHiring.length) concerns.push(`${thinHiring.length} hiring question(s) have no wrong answer stated`);

  return {
    figures: [
      ['chapters', String(chapters().length)],
      ['guide', `${pdf.pages} pages, ${Math.round(pdf.buffer.length / 1024)} KB`],
      ['tables', `${FIRST_30.length} first-month jobs, ${LIFESPANS.length} systems costed, ${HIRING.length} hiring questions`],
      ['listing', 'corrected to 19 pages on 2026-10-04 — it said 58'],
      ['Eversource', 'bullet reworded on 2026-10-04 to "what to ask for, and who to ask", which is what the chapter delivers — it carries no programme figures'],
      ['EPUB', 'claim removed from the listing on 2026-10-04 — none is produced'],
    ],
    concerns,
  };
}
