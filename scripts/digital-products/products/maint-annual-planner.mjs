/**
 * Annual Maintenance Planner — `maint-annual-planner`, $24.
 *
 * WHAT A BUYER IS PAYING FOR
 *
 * A twelve-month calendar of what to do when, and a spreadsheet that both
 * tracks it and costs it. The guide is the thinking; the workbook is the thing
 * that gets used in March.
 *
 * WHY IT IS A BUDGET AS WELL AS A CHECKLIST
 *
 * Because maintenance is not skipped out of forgetfulness, it is skipped
 * because it arrives as a surprise bill in a month that already had one. A
 * calendar with costs beside it turns twelve surprises into one annual figure,
 * and an annual figure is something a household or a board can actually fund.
 * The tracker therefore totals by month and by category, and compares what was
 * budgeted against what was spent.
 *
 * WHY THE SEASONS ARE NEW HAMPSHIRE'S
 *
 * Freeze-thaw, mud season, black ice, and a five-month heating season are what
 * the calendar is built around. A generic planner puts gutter clearing in
 * "autumn"; here it is after the last leaves drop and before the first freeze,
 * which in New Hampshire is a window of about three weeks and is the difference
 * between a clear gutter and an ice dam.
 */
import ExcelJS from 'exceljs';
import { renderBook, PDF_MIME } from '../lib/pdfBook.mjs';
import {
  INK, INK_SOFT, AMBER_PALE, GOOD, WARN, BAD, RULE,
  MONEY, PERCENT, NUMBER,
  applyWorkbookMeta, newWorkbook, sheetHeader, sectionTitle, tableHead,
  inputCell, calcCell, labelCell, noteCell, zebra, printSetup, guideSheet, field,
} from '../lib/workbook.mjs';

export const meta = {
  id: 'maint-annual-planner',
  title: 'Annual Maintenance Planner',
  subtitle: '12-month property maintenance calendar',
  price: 2400,
  files: ['pdf', 'xlsx'],
};

/**
 * The year. [month, [ [task, category, typicalCost, note] ] ]
 *
 * Costs are mid-2026 New Hampshire figures for a single-family house or a small
 * multifamily, and they are starting assumptions the buyer replaces — the
 * workbook shades them as inputs for that reason. They are here so the budget
 * totals mean something on the first afternoon rather than after a week of
 * phone calls.
 */
const YEAR = [
  ['January', [
    ['Check for ice dams after each thaw', 'Roof', 0, 'Looking, not climbing. A stain on a ceiling in January is an ice dam, not a roof leak.'],
    ['Watch for pipe freeze in the coldest week', 'Plumbing', 0, 'Open cabinet doors on exterior walls; run a trickle on the worst run.'],
    ['Test every smoke and CO alarm', 'Safety', 0, 'Mid-heating-season is exactly when CO matters.'],
    ['Replace the furnace filter', 'Heating', 25, 'Every sixty days through the heating season.'],
  ]],
  ['February', [
    ['Check the attic for damp sheathing and frost', 'Roof', 0, 'Frost on the underside of the sheathing means warm wet air is getting up there.'],
    ['Keep heat pump units and exhaust vents clear', 'Heating', 0, 'A blocked high-efficiency vent shuts the system down, or worse.'],
    ['Order fuel before the last cold snap', 'Heating', 0, 'February run-outs are common and the restart call costs more than the fuel.'],
    ['Review the year\'s budget against actual', 'Admin', 0, 'Two months of data is enough to see whether the figures were right.'],
  ]],
  ['March', [
    ['Walk the exterior as the snow goes', 'Exterior', 0, 'Lifted shingles, bent gutters, cracked flashing, split hose bibs. Everything winter broke is visible for about two weeks.'],
    ['Check the foundation and basement for water', 'Structure', 0, 'Mud season is when a grading problem announces itself.'],
    ['Test the sump pump', 'Plumbing', 0, 'Before it is needed, not during.'],
    ['Book spring work now', 'Admin', 0, 'Roofers, painters and masons fill up for the whole season in March and April.'],
    ['Replace the furnace filter', 'Heating', 25, 'Mid-season, when it is at its dirtiest and the system is working hardest.'],
  ]],
  ['April', [
    ['Clear gutters of winter debris', 'Roof', 180, 'Grit and shingle granules collect over winter and block the outlets.'],
    ['Turn on exterior water and check every bib', 'Plumbing', 0, 'Have somebody watch inside while it is turned on. A split bib only leaks once there is pressure.'],
    ['Start up the irrigation system', 'Exterior', 120, 'Check every head before the first real watering.'],
    ['Service the air conditioning or heat pump for cooling', 'Heating', 180, 'Cheaper and easier to book now than in the first hot week of June.'],
    ['Reseal the drive if it needs it', 'Exterior', 400, 'Only on a dry stretch above 50°F.'],
  ]],
  ['May', [
    ['Wash the siding and check trim paint', 'Exterior', 350, 'Dirt holds moisture, and moisture is what ends paint.'],
    ['Check decks, railings and stairs', 'Structure', 0, 'Push on every railing. Winter loosens fixings and the failure is a fall.'],
    ['Reseal or stain exterior woodwork', 'Exterior', 450, 'Every two to three years on a deck that sees weather.'],
    ['Service the mower and outdoor equipment', 'Exterior', 90, 'Before the first cut, not after it will not start. Small-engine shops are three weeks out by June.'],
    ['Check window and door screens', 'Exterior', 60, 'Before the insects arrive. A torn screen in July is a window that cannot be opened.'],
  ]],
  ['June', [
    ['Clean the dryer vent and its termination', 'Safety', 0, 'A lint fire does not care what month it is.'],
    ['Check the water heater and its relief valve', 'Plumbing', 0, 'Look for rust at the base: a tank weeping at the seam is weeks from failing.'],
    ['Check caulking around tubs, showers and sinks', 'Plumbing', 40, 'Failed silicone is how a bathroom floor rots invisibly.'],
    ['Inspect the roof from the ground with binoculars', 'Roof', 0, 'Cheaper than a ladder and finds most of what matters.'],
  ]],
  ['July', [
    ['Trim vegetation back from the building', 'Exterior', 200, 'A foot of clearance. Growth against siding holds damp and carries insects in.'],
    ['Check the septic system and schedule pumping', 'Plumbing', 450, 'Every three to five years for most households.'],
    ['Test GFCI outlets, inside and out', 'Safety', 0, 'The test button, not an assumption.'],
    ['Check the attic in the heat', 'Roof', 0, 'An attic far hotter than outside is an attic with no working ventilation — and that is the same fault that causes winter ice dams.'],
  ]],
  ['August', [
    ['Book the heating service for September', 'Heating', 0, 'Booked in August it is routine. Booked in November it is not available.'],
    ['Book the chimney sweep', 'Heating', 0, 'Same reason.'],
    ['Check and clean the exterior dryer and bath vents', 'Safety', 0, 'Birds and wasps nest in vent terminations over the summer, and the flap is usually found jammed open in October.'],
    ['Review insurance cover and the deductible', 'Admin', 0, 'Before the storm season, and after any work that changed the building\'s value.'],
  ]],
  ['September', [
    ['Annual heating system service', 'Heating', 220, 'The single most important appointment of the year, and the hardest to get late.'],
    ['Chimney sweep and inspection, if you burn wood', 'Heating', 240, 'Sweeps are booked solid from October. September is the last month you can choose the date rather than take one.'],
    ['Sign the snow removal contract', 'Exterior', 0, 'Good contractors are full by early November.'],
    ['Check attic insulation and air sealing', 'Structure', 0, 'The month to do it, because the fix takes a contractor and they have time now.'],
    ['Check roof and flashing properly', 'Roof', 0, 'Repairs are possible in October. They are not in January.'],
  ]],
  ['October', [
    ['Full winter preparation', 'Seasonal', 0, 'The NH Winter Prep Package covers this month in detail — hose bibs, hoses, irrigation, markers, sand, alarms.'],
    ['Clear gutters after the last leaves drop', 'Roof', 180, 'The three-week window that decides whether you get ice dams.'],
    ['Top off fuel', 'Heating', 0, 'Before the first cold snap sets off the whole state ordering at once. Summer fill pricing is also usually better.'],
    ['Replace the furnace filter', 'Heating', 25, 'A clean filter going into the heating season. This is the one of the three that matters most.'],
    ['Test the generator under load', 'Safety', 0, 'Outdoors, twenty feet from any opening.'],
  ]],
  ['November', [
    ['Confirm the snow contractor and the markers', 'Exterior', 0, 'A contract signed in September and never confirmed is how people discover in December that they were dropped from the route.'],
    ['Check weatherstripping and door seals', 'Structure', 70, 'After the first cold night, when you can feel the draughts.'],
    ['Watch for condensation on windows', 'Structure', 0, 'Water on the inside of the glass means the humidity is too high and the sills are at risk.'],
    ['Stock the outage kit', 'Safety', 80, 'Water, light, heat and cash that need no power.'],
  ]],
  ['December', [
    ['Check heat reaches every room', 'Heating', 0, 'A cold room in December is an air-in-the-loop or a blocked register, and both are quick.'],
    ['Keep exhaust vents and heat pumps clear of snow', 'Heating', 0, 'After every storm.'],
    ['Replace the furnace filter', 'Heating', 25, 'Sixty days on from October, and the one most often forgotten because the house is already warm.'],
    ['Note what the year cost and what surprised you', 'Admin', 0, 'Ten minutes in December is next year\'s budget.'],
  ]],
];

const TASK_COUNT = YEAR.reduce((n, [, tasks]) => n + tasks.length, 0);
const CATEGORIES = [...new Set(YEAR.flatMap(([, tasks]) => tasks.map(([, c]) => c)))].sort();
const BUDGET_TOTAL = YEAR.reduce((sum, [, tasks]) => sum + tasks.reduce((s, [, , cost]) => s + cost, 0), 0);

// ── The PDF guide ───────────────────────────────────────────────────────────

function guideChapters() {
  return [
    {
      title: 'The year, and why a calendar beats a checklist',
      blocks: [
        { t: 'p', text: `${TASK_COUNT} jobs across twelve months and ${CATEGORIES.length} categories. The point is not the list — most of it is familiar — it is the month each item sits in and the reason it sits there.` },
        { t: 'h2', text: 'Maintenance is not skipped out of forgetfulness' },
        { t: 'p', text: 'It is skipped because it arrives as a surprise bill in a month that already had one. A boiler service, a septic pumping and a gutter clearing landing in the same fortnight is how a household decides to leave one of them until next year, and the one left is rarely the cheapest to postpone.' },
        { t: 'p', text: `So the planner is a budget as well as a calendar. The starting figures here total about $${BUDGET_TOTAL.toLocaleString()} a year for a single-family house — spread across the months, that is a number a household or a board can actually fund, and the workbook totals it by month and by category so the two or three expensive months are visible in January rather than in September.` },
        { t: 'h2', text: 'Why these months and not "spring" and "autumn"' },
        { t: 'p', text: 'A generic planner puts gutter clearing in autumn. In New Hampshire the useful window is after the last leaves are actually down and before the first hard freeze, which is about three weeks, and missing it is the difference between a clear gutter and an ice dam in February.' },
        { t: 'p', text: 'The same is true of booking: a heating service arranged in August is routine and one attempted in November is not available at all. Several items here are in a month purely because that is when the other person has capacity, and those are marked as booking jobs rather than doing jobs.' },
        { t: 'callout', heading: 'The two months that carry the year', body: 'September and October. Everything that needs a contractor is booked in September, and everything that protects against freezing is done in October. A year where only those two months are taken seriously is a year that mostly works. A year where they are missed cannot be recovered by effort in January.' },
        { t: 'h2', text: 'Using the workbook' },
        { t: 'p', text: 'The spreadsheet has the same twelve months with a column for the date done, who did it, what was budgeted and what it actually cost. It totals by month and by category and shows the variance, so next year\'s figures come from your own property rather than from this document.' },
        { t: 'p', text: 'Landlords and managers: the completed sheet is also the answer to "has this been maintained?" — a dated line with a contractor\'s name against it is worth more than a policy.' },
      ],
    },
    {
      title: 'Month by month',
      blocks: YEAR.flatMap(([month, tasks]) => [
        { t: 'h2', text: month },
        {
          t: 'table',
          head: ['Do this', 'Category', 'Typical cost', 'Why this month'],
          rows: tasks.map(([task, cat, cost, note]) => [task, cat, cost ? `$${cost}` : '—', note || '']),
          widths: [0.3, 0.13, 0.12, 0.45],
        },
      ]),
    },
    {
      title: 'What the year costs, and what it saves',
      blocks: [
        { t: 'p', text: 'Planned maintenance is not free, and the argument for it is not that it costs nothing. It is that the alternative costs more and arrives at a worse time.' },
        { t: 'h2', text: 'The arithmetic worth knowing' },
        { t: 'table', head: ['Planned', 'Cost', 'What it prevents', 'Unplanned cost'], rows: [
          ['Annual heating service', '$220', 'A mid-winter no-heat call, out of hours, behind a queue', '$600 and up, plus the risk of frozen pipes'],
          ['Gutter clearing, twice', '$360', 'Ice dam water through a ceiling', '$2,500 to $8,000 of ceiling, insulation and paint'],
          ['Hose bib drained, 5 minutes', '$0', 'A split pipe inside an exterior wall', '$3,000 to $15,000, discovered in April'],
          ['Septic pumped on schedule', '$450', 'A failed leach field', '$15,000 to $30,000'],
          ['Attic air sealing and insulation', '$1,800 once', 'Recurring ice dams and a cold house', 'The ice dam bill, every few winters'],
          ['Exterior paint and seal on schedule', '$450 a year', 'Rotted trim and siding replacement', '$6,000 and up, and it spreads'],
        ], widths: [0.26, 0.1, 0.34, 0.3] },
        { t: 'p', text: 'None of those unplanned figures is a worst case. They are what the common version of each failure costs, and every one of them also arrives with a loss of use — a tenant without heat, a room that cannot be used, a drive that cannot be parked on.' },
        { t: 'h2', text: 'Where to start if the budget will not stretch' },
        { t: 'p', text: 'In this order, because it is the order of consequence rather than cost:' },
        { t: 'numbers', items: [
          'Anything about combustion or alarms. Heating service, chimney, smoke and CO alarms. This is the group where the failure is somebody being hurt.',
          'Anything about water getting in or freezing. Hose bibs, gutters, flashing, the sump pump. This is the group with the largest bills.',
          'Anything that needs another person booked. Even if the work is deferred, the appointment cannot be.',
          'Anything that is only money and only gets slightly worse. Paint, sealing, cosmetic repair. Genuinely deferrable for a year — but write down that you deferred it, because a second year of deferral is a different decision and should be taken deliberately.',
        ] },
        { t: 'callout', heading: 'Write down what you skipped', body: 'The workbook has a column for it. A deferred job that is recorded is a plan; a deferred job that is forgotten is how a $450 seal becomes a $6,000 siding replacement over four quiet years. This is the single most useful habit in the whole document and it costs nothing.' },
      ],
    },
  ];
}

// ── The spreadsheet tracker ─────────────────────────────────────────────────

const FIRST_TASK_ROW = 6;

function buildTracker() {
  const wb = new ExcelJS.Workbook();
  applyWorkbookMeta(wb, newWorkbook({
    title: meta.title,
    subject: 'Twelve-month property maintenance calendar, tracker and budget',
    keywords: 'maintenance, calendar, budget, New Hampshire, property',
  }));

  guideSheet(wb, {
    title: 'Annual Maintenance Planner',
    blurb: 'A year of maintenance, tracked and costed. Shaded cells are yours; the totals calculate.',
    blocks: [
      ['The rule for the whole workbook', [
        'Shaded cells are yours to change. Unshaded cells are calculated.',
        'Work down the Calendar sheet as the year goes. Summary totals by month and by category as you fill it in.',
      ]],
      ['What to fill in, and when', [
        'When a job is done: the date, who did it, and what it actually cost. That is three cells and it takes ten seconds.',
        'When a job is NOT done: put a reason in the Deferred column. This is the most valuable column in the workbook — a deferred job that is recorded is a plan, and a deferred job that is forgotten is how a $450 seal becomes a $6,000 siding replacement over four quiet years.',
      ]],
      ['About the costs', [
        'The budget figures are mid-2026 New Hampshire prices for a single-family house, and they are starting assumptions — replace them with your own quotes and the plan becomes yours.',
        'The Summary sheet compares budget against actual by month and by category, so next year\'s figures come from your property rather than from this document.',
      ]],
      ['If the budget will not stretch', [
        'Defer in order of consequence, not cost: combustion and alarms last, water second to last, anything needing a booking third, and cosmetic work first.',
        'The guide in this package sets out what each deferred item typically costs when it fails instead.',
      ]],
    ],
  });

  // ── Calendar ──────────────────────────────────────────────────────────────
  const cal = wb.addWorksheet('Calendar', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(cal, {
    title: 'The year, job by job',
    blurb: 'Date, who, and what it cost. And a reason whenever something is skipped.',
    lastColumn: 'I',
  });
  tableHead(cal, 5, ['Month', 'Do this', 'Category', 'Budget', 'Date done', 'By whom', 'Actual cost', 'Deferred — why', 'Variance'],
    [12, 42, 14, 10, 12, 18, 12, 30, 10]);

  let row = FIRST_TASK_ROW;
  for (const [month, tasks] of YEAR) {
    for (const [task, category, cost, note] of tasks) {
      const r = cal.getRow(row);
      inputCell(r.getCell(1)).value = month;
      inputCell(r.getCell(2)).value = task;
      inputCell(r.getCell(3)).value = category;
      inputCell(r.getCell(4), { numFmt: MONEY }).value = cost;
      inputCell(r.getCell(5));
      inputCell(r.getCell(6));
      inputCell(r.getCell(7), { numFmt: MONEY });
      inputCell(r.getCell(8));
      calcCell(r.getCell(9), { numFmt: MONEY }).value = {
        formula: `IF($G${row}="","",$G${row}-$D${row})`,
      };
      if (note) r.getCell(2).note = note;
      row += 1;
    }
  }
  const lastTaskRow = row - 1;
  const totals = row;
  labelCell(cal.getRow(totals).getCell(2), 'Totals', { bold: true });
  for (const c of [4, 7, 9]) {
    const letter = String.fromCharCode(64 + c);
    calcCell(cal.getRow(totals).getCell(c), { numFmt: MONEY, bold: true }).value = {
      formula: `SUM(${letter}${FIRST_TASK_ROW}:${letter}${lastTaskRow})`,
    };
  }
  cal.getRow(totals).eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: INK } } }; });
  zebra(cal, FIRST_TASK_ROW, lastTaskRow, 9);
  cal.views = [{ state: 'frozen', xSplit: 2, ySplit: 5 }];
  cal.autoFilter = 'A5:I5';
  printSetup(cal, { landscape: true, title: 'Annual Maintenance Planner — Calendar' });

  // ── Summary ───────────────────────────────────────────────────────────────
  const sum = wb.addWorksheet('Summary', { properties: { tabColor: { argb: AMBER_PALE } } });
  [22, 14, 14, 14, 2, 50].forEach((w, i) => { sum.getColumn(i + 1).width = w; });
  sheetHeader(sum, {
    title: 'Summary',
    blurb: 'Nothing here is typed. Fill in the Calendar and these figures follow.',
    lastColumn: 'F',
  });

  const range = (col) => `Calendar!$${col}$${FIRST_TASK_ROW}:$${col}$${lastTaskRow}`;

  sectionTitle(sum, 5, 'By month', 'F');
  tableHead(sum, 6, ['Month', 'Budget', 'Actual', 'Variance'], [22, 14, 14, 14]);
  YEAR.forEach(([month], i) => {
    const r = 7 + i;
    labelCell(sum.getCell(`A${r}`), month);
    calcCell(sum.getCell(`B${r}`), { numFmt: MONEY }).value = {
      formula: `SUMIF(${range('A')},$A${r},${range('D')})`,
    };
    calcCell(sum.getCell(`C${r}`), { numFmt: MONEY }).value = {
      formula: `SUMIF(${range('A')},$A${r},${range('G')})`,
    };
    calcCell(sum.getCell(`D${r}`), { numFmt: MONEY }).value = { formula: `IF(C${r}=0,"",C${r}-B${r})` };
  });
  const monthTotal = 7 + YEAR.length;
  labelCell(sum.getCell(`A${monthTotal}`), 'Year', { bold: true });
  for (const col of ['B', 'C', 'D']) {
    calcCell(sum.getCell(`${col}${monthTotal}`), { numFmt: MONEY, bold: true }).value = {
      formula: `SUM(${col}7:${col}${monthTotal - 1})`,
    };
  }

  const catStart = monthTotal + 3;
  sectionTitle(sum, catStart - 1, 'By category', 'F');
  tableHead(sum, catStart, ['Category', 'Budget', 'Actual', 'Variance'], [22, 14, 14, 14]);
  CATEGORIES.forEach((category, i) => {
    const r = catStart + 1 + i;
    labelCell(sum.getCell(`A${r}`), category);
    calcCell(sum.getCell(`B${r}`), { numFmt: MONEY }).value = {
      formula: `SUMIF(${range('C')},$A${r},${range('D')})`,
    };
    calcCell(sum.getCell(`C${r}`), { numFmt: MONEY }).value = {
      formula: `SUMIF(${range('C')},$A${r},${range('G')})`,
    };
    calcCell(sum.getCell(`D${r}`), { numFmt: MONEY }).value = { formula: `IF(C${r}=0,"",C${r}-B${r})` };
  });

  const doneRow = catStart + CATEGORIES.length + 3;
  sectionTitle(sum, doneRow - 1, 'How the year is going', 'F');
  field(sum, doneRow, 'Jobs on the plan', { formula: `COUNTA(${range('B')})`, numFmt: NUMBER, noteColumn: 'F' });
  field(sum, doneRow + 1, 'Done so far', { formula: `COUNTA(${range('E')})`, numFmt: NUMBER });
  field(sum, doneRow + 2, 'Share complete', {
    formula: `IF(B${doneRow}=0,"",B${doneRow + 1}/B${doneRow})`, numFmt: PERCENT, bold: true,
  });
  field(sum, doneRow + 3, 'Deferred, and recorded as such', {
    formula: `COUNTA(${range('H')})`, numFmt: NUMBER,
    noteColumn: 'F',
    note: 'A deferred job that is written down is a plan. One that is forgotten is how a small seal becomes a siding replacement.',
  });
  field(sum, doneRow + 4, 'Still to do, and not deferred', {
    formula: `B${doneRow}-B${doneRow + 1}-B${doneRow + 3}`, numFmt: NUMBER,
  });

  sum.addConditionalFormatting({
    ref: `D7:D${monthTotal}`,
    rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0'], priority: 1, style: { font: { color: { argb: BAD } } } },
      { type: 'cellIs', operator: 'lessThan', formulae: ['0'], priority: 2, style: { font: { color: { argb: GOOD } } } },
    ],
  });

  printSetup(sum, { title: 'Annual Maintenance Planner — Summary' });

  wb.views = [{ activeTab: 1, firstSheet: 0, visibility: 'visible' }];
  return wb;
}

export async function build() {
  const book = renderBook({
    title: 'Annual Maintenance Planner',
    subtitle: '12-month property maintenance calendar',
    blurb: `${TASK_COUNT} jobs across twelve months, each in the month it belongs in and with the reason it belongs there. Maintenance is not skipped out of forgetfulness — it is skipped because it arrives as a surprise bill in a month that already had one, so this is a budget as well as a calendar.`,
    audience: ['Homeowners', 'Landlords', 'Condo Boards'],
    edition: '2026 edition',
    keywords: 'maintenance calendar, property maintenance, budget, New Hampshire',
    chapters: guideChapters(),
  });

  const wb = buildTracker();

  return [
    { name: 'Annual Maintenance Planner.pdf', mime: PDF_MIME, buffer: book.buffer, pages: book.pages },
    {
      name: 'Annual Maintenance Tracker.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    },
  ];
}

export async function selfCheck(loadedWorkbook) {
  const files = await build();
  const pdf = files.find((f) => f.name.endsWith('.pdf'));
  const concerns = [];

  if (pdf.buffer.subarray(0, 4).toString() !== '%PDF') concerns.push('the PDF does not start with %PDF');
  if (TASK_COUNT < 40) concerns.push(`only ${TASK_COUNT} jobs across the year — thin for a twelve-month planner`);
  if (YEAR.length !== 12) concerns.push(`${YEAR.length} months, which is not a year`);

  // Every month must carry work, or the calendar has a hole somebody will
  // read as "nothing to do in July".
  const empty = YEAR.filter(([, tasks]) => tasks.length === 0).map(([m]) => m);
  if (empty.length) concerns.push(`no jobs listed in ${empty.join(', ')}`);

  // A cost table that totals to nothing cannot be used as a budget.
  if (BUDGET_TOTAL < 500) concerns.push(`the budget totals $${BUDGET_TOTAL}, which is too little to plan against`);

  // The "why this month" is the thing being sold; a blank one is a generic list.
  const noReason = YEAR.flatMap(([month, tasks]) => tasks.filter(([, , , note]) => !note).map(([task]) => `${month}: ${task}`));

  return {
    figures: [
      ['jobs / months', `${TASK_COUNT} across ${YEAR.length} months, ${CATEGORIES.length} categories`],
      ['budget for the year', `$${BUDGET_TOTAL.toLocaleString()}`],
      ['guide', `${pdf.pages} pages, ${Math.round(pdf.buffer.length / 1024)} KB`],
      ['tracker', `${Math.round(files[1].buffer.length / 1024)} KB`],
      ['jobs with no "why this month"', `${noReason.length} of ${TASK_COUNT}`],
    ],
    concerns,
  };
}
