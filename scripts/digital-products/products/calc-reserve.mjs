/**
 * Reserve Fund Adequacy Calculator — marketplace product `calc-reserve`, $29.
 *
 * WHAT A BUYER IS PAYING FOR
 *
 * A condo board's hardest recurring question is "are we putting enough away,
 * and if not, when does it bite?" This answers it with the method a real
 * reserve study uses — the component method — and it answers it as a working
 * model rather than a printout: every figure below is an Excel formula, so a
 * treasurer can change the roof's unit cost and watch the thirty-year
 * projection and the per-unit special assessment move.
 *
 * THE METHOD, SO IT CAN BE CHECKED
 *
 *   Replacement cost today  = quantity x unit cost
 *   Effective age           = study year - year last replaced
 *   Remaining life          = useful life - effective age, floored at zero
 *   Future cost             = cost today x (1 + inflation) ^ remaining life
 *   Fully funded balance    = cost today x min(effective age / useful life, 1)
 *   Percent funded          = reserve balance / fully funded balance
 *
 * Percent funded is the figure lenders and buyers' attorneys ask for, and the
 * conventional reading of it is the one on the Guide sheet: under 30% weak,
 * 30-70% fair, over 70% strong.
 *
 * The recommended contribution is the straight-line accrual for every
 * component plus a catch-up on whatever is missing from the fully funded
 * balance, spread over an amortisation period the buyer chooses (20 years by
 * default). That is a closed-form answer that Excel can hold, which matters —
 * a goal-seek would need a macro, and a spreadsheet with macros gets blocked
 * by the buyer's own IT.
 *
 * THE STARTING NUMBERS
 *
 * Twenty-six components with New Hampshire replacement costs in 2026 dollars
 * and conventional useful lives. They are starting assumptions, labelled as
 * such on every sheet, and they are there so the thing is useful in the first
 * five minutes rather than being an empty grid. Fifteen blank rows follow for
 * anything a particular association has that this list does not.
 */
import ExcelJS from 'exceljs';
import {
  INK, INK_SOFT, AMBER_PALE, GOOD, WARN, BAD, RULE,
  MONEY, PERCENT, NUMBER, YEAR,
  applyWorkbookMeta, newWorkbook, sheetHeader, sectionTitle, tableHead,
  inputCell, calcCell, labelCell, noteCell, bigNumber, zebra, printSetup, guideSheet,
} from '../lib/workbook.mjs';

export const meta = {
  id: 'calc-reserve',
  title: 'Reserve Fund Adequacy Calculator',
  subtitle: 'Know exactly where your reserve fund stands',
  price: 2900,
  files: ['xlsx'],
};

/** Study horizon. Thirty years is the span a capital plan is judged over. */
const YEARS = 30;
/** Component rows: 26 filled, 15 spare. */
const FIRST_COMPONENT_ROW = 6;
const COMPONENT_ROWS = 41;
const LAST_COMPONENT_ROW = FIRST_COMPONENT_ROW + COMPONENT_ROWS - 1;

/** Excel column letter for a 1-based index. */
function col(n) {
  let s = '';
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/**
 * Starting component inventory: [name, category, quantity, unit, unit cost,
 * useful life, year last replaced].
 *
 * Costs are mid-2026 New Hampshire installed prices for a mid-sized
 * association; lives follow the conventional ranges used in reserve studies.
 * Both are meant to be overwritten with a real quote and a real install date,
 * which is why both columns are shaded as inputs.
 */
export const COMPONENTS = [
  ['Asphalt shingle roofing', 'Building envelope', 24000, 'sq ft', 7.25, 25, 2009],
  ['Flat / EPDM roof sections', 'Building envelope', 3200, 'sq ft', 12.5, 20, 2014],
  ['Vinyl siding', 'Building envelope', 31000, 'sq ft', 6.4, 35, 2004],
  ['Exterior trim paint', 'Building envelope', 1, 'job', 42000, 8, 2021],
  ['Gutters and downspouts', 'Building envelope', 2900, 'lin ft', 11, 20, 2012],
  ['Chimney flashing and caps', 'Building envelope', 14, 'each', 1850, 25, 2010],
  ['Common-area windows', 'Building envelope', 86, 'each', 925, 30, 2003],
  ['Entry and patio doors', 'Building envelope', 48, 'each', 1450, 25, 2011],
  ['Wood decks and balconies', 'Building envelope', 4800, 'sq ft', 38, 20, 2013],
  ['Asphalt pavement overlay', 'Site', 68000, 'sq ft', 3.1, 20, 2010],
  ['Pavement seal coat and striping', 'Site', 68000, 'sq ft', 0.32, 4, 2024],
  ['Concrete walkways', 'Site', 9200, 'sq ft', 12.5, 40, 1998],
  ['Retaining walls', 'Site', 410, 'lin ft', 165, 30, 2006],
  ['Perimeter and pool fencing', 'Site', 1250, 'lin ft', 48, 20, 2012],
  ['Site lighting and poles', 'Site', 22, 'each', 2400, 20, 2011],
  ['Mailbox kiosks', 'Site', 4, 'each', 3800, 25, 2009],
  ['Playground equipment', 'Amenities', 1, 'job', 58000, 15, 2016],
  ['Pool resurfacing and liner', 'Amenities', 1, 'job', 46000, 10, 2019],
  ['Clubhouse furnishings', 'Amenities', 1, 'job', 32000, 12, 2018],
  ['Common-area flooring', 'Interiors', 6400, 'sq ft', 9.5, 10, 2018],
  ['Common-area painting', 'Interiors', 1, 'job', 28000, 7, 2022],
  ['Gas-fired boilers', 'Mechanical', 4, 'each', 28500, 25, 2008],
  ['Domestic hot water heaters', 'Mechanical', 6, 'each', 6800, 12, 2017],
  ['Rooftop HVAC units', 'Mechanical', 3, 'each', 19500, 18, 2012],
  ['Elevator modernisation', 'Mechanical', 1, 'each', 165000, 30, 2002],
  ['Fire alarm panel and devices', 'Life safety', 1, 'job', 74000, 20, 2010],
];

/** Setup sheet cells the rest of the workbook points at. */
const S = {
  association: 'B6',
  units: 'B7',
  studyYear: 'B8',
  reserveBalance: 'B11',
  currentContribution: 'B12',
  inflation: 'B15',
  interest: 'B16',
  contributionModelled: 'B19',
  contributionIncrease: 'B20',
  catchUpYears: 'B21',
};
const SETUP = (ref) => `Setup!$${ref.replace(/(\D+)(\d+)/, '$1$$$2')}`;

function buildGuide(wb) {
  return guideSheet(wb, {
    title: 'Reserve Fund Adequacy Calculator',
    blurb: 'How to use it, what it calculates, and how to read the answer. Five minutes here saves an argument later.',
    blocks: [
    ['The rule for the whole workbook', [
      'Every shaded cell is yours to change. Every cell that is not shaded is calculated — type in one and you break the chain behind it.',
      'Start on the Setup sheet, then work down the Components sheet. Results updates as you go.',
    ]],
    ['What it does', [
      'It values every major component your association is responsible for, works out how much of each one\'s life has already been used up, and compares the money you should therefore be holding against the money you actually hold.',
      'It then projects thirty years of contributions, interest and replacement spending, and tells you the first year the fund runs dry and what a special assessment would cost each unit if it did.',
    ]],
    ['The method, in six lines', [
      'Replacement cost today = quantity x unit cost.',
      'Effective age = study year minus the year the component was last replaced.',
      'Remaining life = useful life minus effective age, never below zero.',
      'Future cost = cost today grown at your inflation rate over the remaining life.',
      'Fully funded balance = cost today x the share of its life already used.',
      'Percent funded = the reserve balance you hold, divided by that fully funded balance.',
    ]],
    ['How to read percent funded', [
      'Under 30% — weak. A failure of any large component means borrowing or a special assessment. Lenders notice this, and so do buyers\' attorneys during a resale.',
      '30% to 70% — fair. Normal for associations that have been funding steadily but started late. Workable with a catch-up plan.',
      'Over 70% — strong. Most replacements can be absorbed without an assessment.',
      'Being at 100% is not the goal. Spending nothing is not a virtue either — the goal is never needing an assessment nobody voted for.',
    ]],
    ['The recommended contribution', [
      'Two parts added together: the straight-line accrual for every component, plus a catch-up on whatever is missing from the fully funded balance, spread over the amortisation period you choose on Setup.',
      'To see what it actually does, copy the recommended figure into "Annual contribution to model" on Setup and watch the Projection sheet.',
    ]],
    ['What the starting numbers are', [
      'Twenty-six components with New Hampshire installed costs in 2026 dollars and conventional useful lives, so the workbook is useful before you have gathered anything.',
      'They are assumptions, not findings. Replace a unit cost with a real quote and an install year with your own records and the answer becomes yours.',
      'Fifteen blank rows are there for whatever your property has that this list does not. Add them in the same shape and every sheet picks them up.',
    ]],
    ['Where this sits next to a formal reserve study', [
      'A reserve study by a credentialed analyst includes a site inspection and carries professional liability. This is the arithmetic behind one, in your hands, between studies — for budget season, for a board that wants to test a dues increase before proposing it, and for checking a study you have been handed.',
    ]],
    ],
  });
}

function buildSetup(wb) {
  const ws = wb.addWorksheet('Setup', { properties: { tabColor: { argb: INK_SOFT } } });
  ws.getColumn(1).width = 38;
  ws.getColumn(2).width = 18;
  ws.getColumn(3).width = 2;
  ws.getColumn(4).width = 62;
  sheetHeader(ws, {
    title: 'Setup — your association and your assumptions',
    blurb: 'Shaded cells only. Everything else in the workbook reads these.',
    lastColumn: 'D',
  });

  sectionTitle(ws, 5, 'The association', 'D');
  labelCell(ws.getCell('A6'), 'Association name');
  inputCell(ws.getCell('B6'));
  ws.getCell('B6').value = 'Your Association';
  labelCell(ws.getCell('A7'), 'Number of units');
  inputCell(ws.getCell('B7'), { numFmt: NUMBER });
  ws.getCell('B7').value = 48;
  labelCell(ws.getCell('A8'), 'Study year (the fiscal year you are planning)');
  inputCell(ws.getCell('B8'), { numFmt: YEAR });
  ws.getCell('B8').value = 2026;
  noteCell(ws, 'D6:D8', 'Units drives the per-unit special assessment on Results — the number a board meeting actually reacts to.');

  sectionTitle(ws, 10, 'Where the fund stands today', 'D');
  labelCell(ws.getCell('A11'), 'Reserve balance on hand');
  inputCell(ws.getCell('B11'), { numFmt: MONEY });
  ws.getCell('B11').value = 685000;
  labelCell(ws.getCell('A12'), 'Reserve contribution this year');
  inputCell(ws.getCell('B12'), { numFmt: MONEY });
  ws.getCell('B12').value = 118000;
  noteCell(ws, 'D11:D12', 'Reserve money only. Leave the operating account out of both figures or the fund will look healthier than it is.');

  sectionTitle(ws, 14, 'Assumptions', 'D');
  labelCell(ws.getCell('A15'), 'Construction cost inflation');
  inputCell(ws.getCell('B15'), { numFmt: PERCENT });
  ws.getCell('B15').value = 0.035;
  labelCell(ws.getCell('A16'), 'Interest earned on reserves');
  inputCell(ws.getCell('B16'), { numFmt: PERCENT });
  ws.getCell('B16').value = 0.03;
  noteCell(ws, 'D15:D16', 'Inflation above interest is the reason underfunding compounds. If you only change one assumption, change inflation — materials have not behaved like the headline CPI.');

  sectionTitle(ws, 18, 'What to model', 'D');
  labelCell(ws.getCell('A19'), 'Annual contribution to model');
  inputCell(ws.getCell('B19'), { numFmt: MONEY });
  ws.getCell('B19').value = { formula: `${S.currentContribution}` };
  labelCell(ws.getCell('A20'), 'Annual increase in that contribution');
  inputCell(ws.getCell('B20'), { numFmt: PERCENT });
  ws.getCell('B20').value = 0.03;
  labelCell(ws.getCell('A21'), 'Years to catch up the shortfall');
  inputCell(ws.getCell('B21'), { numFmt: NUMBER });
  ws.getCell('B21').value = 20;
  noteCell(ws, 'D19:D21', 'The projection runs on the contribution modelled here. It starts equal to this year\'s contribution — put the recommended figure from Results in to see the difference.');

  printSetup(ws, { title: 'Reserve Fund Adequacy Calculator — Setup' });
  return ws;
}

function buildComponents(wb) {
  const ws = wb.addWorksheet('Components', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(ws, {
    title: 'Components — what you are responsible for replacing',
    blurb: 'Shaded columns are yours. Replace a unit cost with a real quote and an install year with your records; the rest calculates.',
    lastColumn: 'M',
  });

  tableHead(ws, 5, [
    'Component', 'Category', 'Qty', 'Unit', 'Unit cost',
    'Cost today', 'Useful life', 'Last replaced', 'Effective age',
    'Remaining life', 'Cost when due', 'Fully funded balance', 'Annual accrual',
  ], [34, 18, 8, 9, 11, 13, 9, 11, 10, 10, 13, 15, 13]);

  const infl = SETUP(S.inflation);
  const study = SETUP(S.studyYear);

  for (let i = 0; i < COMPONENT_ROWS; i += 1) {
    const r = FIRST_COMPONENT_ROW + i;
    const seed = COMPONENTS[i];
    const row = ws.getRow(r);

    inputCell(row.getCell(1));
    inputCell(row.getCell(2));
    inputCell(row.getCell(3), { numFmt: NUMBER });
    inputCell(row.getCell(4));
    inputCell(row.getCell(5), { numFmt: '$#,##0.00' });
    inputCell(row.getCell(7), { numFmt: NUMBER });
    inputCell(row.getCell(8), { numFmt: YEAR });

    if (seed) {
      row.getCell(1).value = seed[0];
      row.getCell(2).value = seed[1];
      row.getCell(3).value = seed[2];
      row.getCell(4).value = seed[3];
      row.getCell(5).value = seed[4];
      row.getCell(7).value = seed[5];
      row.getCell(8).value = seed[6];
    }

    // Cost today = qty x unit cost. Blank row stays blank rather than showing 0.
    calcCell(row.getCell(6), { numFmt: MONEY }).value = {
      formula: `IF(OR($C${r}="",$E${r}=""),"",$C${r}*$E${r})`,
    };
    // Effective age, floored at zero so a future install year cannot read as credit.
    calcCell(row.getCell(9), { numFmt: NUMBER }).value = {
      formula: `IF($H${r}="","",MAX(0,${study}-$H${r}))`,
    };
    // Remaining life, floored at zero. Zero means overdue, which the schedule treats as "next year".
    calcCell(row.getCell(10), { numFmt: NUMBER }).value = {
      formula: `IF(OR($G${r}="",$H${r}=""),"",MAX(0,$G${r}-$I${r}))`,
    };
    // Future cost at the point of replacement.
    calcCell(row.getCell(11), { numFmt: MONEY }).value = {
      formula: `IF($F${r}="","",$F${r}*(1+${infl})^$J${r})`,
    };
    // Fully funded balance: the share of this component's life already consumed.
    calcCell(row.getCell(12), { numFmt: MONEY }).value = {
      formula: `IF(OR($F${r}="",$G${r}=0,$G${r}=""),"",$F${r}*MIN($I${r}/$G${r},1))`,
    };
    // Straight-line accrual in today's dollars.
    calcCell(row.getCell(13), { numFmt: MONEY }).value = {
      formula: `IF(OR($F${r}="",$G${r}=0,$G${r}=""),"",$F${r}/$G${r})`,
    };
  }

  const totalRow = LAST_COMPONENT_ROW + 1;
  const tr = ws.getRow(totalRow);
  labelCell(tr.getCell(1), 'Totals', { bold: true });
  for (const c of [6, 12, 13]) {
    calcCell(tr.getCell(c), { numFmt: MONEY, bold: true }).value = {
      formula: `SUM(${col(c)}${FIRST_COMPONENT_ROW}:${col(c)}${LAST_COMPONENT_ROW})`,
    };
  }
  tr.eachCell((cell) => {
    cell.border = { top: { style: 'thin', color: { argb: INK } } };
  });

  zebra(ws, FIRST_COMPONENT_ROW, LAST_COMPONENT_ROW, 13);
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 5 }];
  ws.autoFilter = 'A5:M5';
  printSetup(ws, { landscape: true, title: 'Reserve Fund Adequacy Calculator — Components' });
  return ws;
}

/**
 * The replacement schedule: every component against every year of the horizon.
 *
 * A component is due in year t when (t - first replacement year) divides evenly
 * by its useful life, which is what makes a 4-year seal coat appear seven times
 * across thirty years instead of once. An overdue component (remaining life
 * zero) is scheduled for year one rather than year zero, because "we should
 * have done it already" still means money next budget.
 */
function buildSchedule(wb) {
  const ws = wb.addWorksheet('Schedule', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(ws, {
    title: 'Replacement schedule — what falls due, and when',
    blurb: 'Calculated from the Components sheet. Recurring items repeat across the horizon at their own cycle.',
    lastColumn: col(1 + YEARS),
  });

  const headRow = 5;
  ws.getRow(headRow).getCell(1).value = 'Component';
  ws.getColumn(1).width = 34;
  for (let t = 1; t <= YEARS; t += 1) {
    const cell = ws.getRow(headRow).getCell(1 + t);
    cell.value = { formula: `${SETUP(S.studyYear)}+${t - 1}` };
    cell.numFmt = YEAR;
    ws.getColumn(1 + t).width = 11;
  }
  ws.getRow(headRow).eachCell((cell, n) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK_SOFT } };
    cell.alignment = { horizontal: n === 1 ? 'left' : 'center' };
  });
  ws.getRow(headRow).height = 20;

  const infl = SETUP(S.inflation);
  for (let i = 0; i < COMPONENT_ROWS; i += 1) {
    const r = headRow + 1 + i;
    const cr = FIRST_COMPONENT_ROW + i;
    calcCell(ws.getRow(r).getCell(1)).value = { formula: `IF(Components!$A${cr}="","",Components!$A${cr})` };
    for (let t = 1; t <= YEARS; t += 1) {
      const cell = ws.getRow(r).getCell(1 + t);
      // Guard the whole expression: a blank or zero-life row contributes nothing
      // rather than a division error that would spread across the sheet.
      cell.value = {
        formula: `IF(OR(Components!$F${cr}="",Components!$G${cr}="",Components!$G${cr}=0),0,`
          + `IF(AND(${t}>=MAX(Components!$J${cr},1),MOD(${t}-MAX(Components!$J${cr},1),Components!$G${cr})=0),`
          + `Components!$F${cr}*(1+${infl})^${t},0))`,
      };
      cell.numFmt = MONEY;
      cell.font = { name: 'Calibri', size: 9, color: { argb: INK } };
    }
  }

  const totalRow = headRow + 1 + COMPONENT_ROWS;
  labelCell(ws.getRow(totalRow).getCell(1), 'Spending that year', { bold: true });
  for (let t = 1; t <= YEARS; t += 1) {
    const letter = col(1 + t);
    const cell = ws.getRow(totalRow).getCell(1 + t);
    cell.value = { formula: `SUM(${letter}${headRow + 1}:${letter}${totalRow - 1})` };
    cell.numFmt = MONEY;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: INK } };
    cell.border = { top: { style: 'thin', color: { argb: INK } } };
  }
  ws.getRow(totalRow).getCell(1).border = { top: { style: 'thin', color: { argb: INK } } };

  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: headRow }];
  printSetup(ws, { landscape: true, fitToWidth: 1, title: 'Reserve Fund Adequacy Calculator — Schedule' });
  return { ws, totalRow, headRow };
}

function buildProjection(wb, schedule) {
  const ws = wb.addWorksheet('Projection', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(ws, {
    title: 'Thirty-year projection',
    blurb: 'Runs on the contribution modelled on Setup. A negative ending balance is the year a special assessment or a loan becomes unavoidable.',
    lastColumn: 'H',
  });

  tableHead(ws, 5, [
    'Fiscal year', 'Opening balance', 'Contributions', 'Interest earned',
    'Replacement spending', 'Closing balance', 'Shortfall', 'Per unit if assessed',
    'Dry-year marker',
  ], [12, 16, 15, 14, 20, 16, 14, 18, 14]);

  const first = 6;
  for (let t = 1; t <= YEARS; t += 1) {
    const r = first + t - 1;
    const row = ws.getRow(r);

    calcCell(row.getCell(1), { numFmt: YEAR }).value = { formula: `${SETUP(S.studyYear)}+${t - 1}` };
    calcCell(row.getCell(2), { numFmt: MONEY }).value = t === 1
      ? { formula: `${SETUP(S.reserveBalance)}` }
      : { formula: `F${r - 1}` };
    // The modelled contribution, escalated each year.
    calcCell(row.getCell(3), { numFmt: MONEY }).value = {
      formula: `${SETUP(S.contributionModelled)}*(1+${SETUP(S.contributionIncrease)})^${t - 1}`,
    };
    // Mid-year convention on interest, and never credited on a negative balance.
    calcCell(row.getCell(4), { numFmt: MONEY }).value = {
      formula: `MAX(0,B${r}+C${r}/2)*${SETUP(S.interest)}`,
    };
    calcCell(row.getCell(5), { numFmt: MONEY }).value = {
      formula: `INDEX(Schedule!$B$${schedule.totalRow}:$${col(1 + YEARS)}$${schedule.totalRow},1,${t})`,
    };
    calcCell(row.getCell(6), { numFmt: MONEY, bold: true }).value = {
      formula: `B${r}+C${r}+D${r}-E${r}`,
    };
    calcCell(row.getCell(7), { numFmt: MONEY }).value = { formula: `IF(F${r}<0,-F${r},0)` };
    calcCell(row.getCell(8), { numFmt: MONEY }).value = {
      formula: `IF(OR(G${r}=0,${SETUP(S.units)}=0),"",G${r}/${SETUP(S.units)})`,
    };
    /**
     * A plain column instead of an array formula.
     *
     * Results needs "the first year the balance goes negative", and the
     * idiomatic way to write that is MATCH(TRUE,INDEX(range<0,0),0) — which
     * works in Excel 365 and is fragile everywhere else, including the older
     * Excel and the LibreOffice a condo treasurer may well be using. A marker
     * column costs one visible column and MIN() reads it anywhere.
     */
    calcCell(row.getCell(9), { numFmt: YEAR }).value = { formula: `IF(F${r}<0,A${r},99999)` };
  }

  const last = first + YEARS - 1;
  zebra(ws, first, last, 9);

  // Red where the fund has gone negative — the one thing a board must see.
  ws.addConditionalFormatting({
    ref: `F${first}:F${last}`,
    rules: [{
      type: 'cellIs', operator: 'lessThan', formulae: ['0'], priority: 1,
      style: { font: { color: { argb: BAD }, bold: true } },
    }],
  });
  ws.addConditionalFormatting({
    ref: `E${first}:E${last}`,
    rules: [{
      type: 'cellIs', operator: 'greaterThan', formulae: ['0'], priority: 2,
      style: { font: { color: { argb: WARN } } },
    }],
  });

  ws.views = [{ state: 'frozen', ySplit: 5 }];
  printSetup(ws, { landscape: true, title: 'Reserve Fund Adequacy Calculator — Projection' });
  return { first, last };
}

function buildResults(wb, projection) {
  const ws = wb.addWorksheet('Results', { properties: { tabColor: { argb: AMBER_PALE } } });
  ws.getColumn(1).width = 40;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 2;
  ws.getColumn(4).width = 58;
  sheetHeader(ws, {
    title: 'Results',
    blurb: 'Nothing on this sheet is typed. Change Setup or Components and every figure here moves.',
    lastColumn: 'D',
  });

  const ffb = `Components!$L$${LAST_COMPONENT_ROW + 1}`;
  const accrual = `Components!$M$${LAST_COMPONENT_ROW + 1}`;

  sectionTitle(ws, 5, 'Where you stand today', 'D');

  labelCell(ws.getCell('A6'), 'Fully funded balance', { bold: true });
  bigNumber(ws, 'B6', { numFmt: MONEY }).value = { formula: ffb };
  noteCell(ws, 'D6:D6', 'What you would be holding if every component had been funded from the day it was installed.');
  ws.getRow(6).height = 28;

  labelCell(ws.getCell('A7'), 'Reserve balance on hand', { bold: true });
  bigNumber(ws, 'B7', { numFmt: MONEY }).value = { formula: SETUP(S.reserveBalance) };
  ws.getRow(7).height = 28;

  labelCell(ws.getCell('A8'), 'Percent funded', { bold: true });
  bigNumber(ws, 'B8', { numFmt: PERCENT }).value = {
    formula: `IF(${ffb}=0,"",${SETUP(S.reserveBalance)}/${ffb})`,
  };
  ws.getRow(8).height = 32;
  noteCell(ws, 'D8:D8', 'Under 30% weak, 30-70% fair, over 70% strong. This is the figure a lender or a buyer\'s attorney asks for.');

  labelCell(ws.getCell('A9'), 'Reading', { bold: true });
  calcCell(ws.getCell('B9'), { bold: true }).value = {
    formula: `IF(${ffb}=0,"",IF(B8<0.3,"Weak",IF(B8<0.7,"Fair","Strong")))`,
  };
  ws.addConditionalFormatting({
    ref: 'B9',
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'Weak', priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Fair', priority: 2, style: { font: { color: { argb: WARN }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Strong', priority: 3, style: { font: { color: { argb: GOOD }, bold: true } } },
    ],
  });

  labelCell(ws.getCell('A10'), 'Shortfall against fully funded');
  calcCell(ws.getCell('B10'), { numFmt: MONEY }).value = { formula: `MAX(0,${ffb}-${SETUP(S.reserveBalance)})` };
  labelCell(ws.getCell('A11'), 'That shortfall per unit');
  calcCell(ws.getCell('B11'), { numFmt: MONEY }).value = {
    formula: `IF(${SETUP(S.units)}=0,"",B10/${SETUP(S.units)})`,
  };

  sectionTitle(ws, 13, 'What to contribute', 'D');
  labelCell(ws.getCell('A14'), 'Straight-line accrual on every component');
  calcCell(ws.getCell('B14'), { numFmt: MONEY }).value = { formula: accrual };
  labelCell(ws.getCell('A15'), 'Catch-up on the shortfall');
  calcCell(ws.getCell('B15'), { numFmt: MONEY }).value = {
    formula: `IF(${SETUP(S.catchUpYears)}=0,0,B10/${SETUP(S.catchUpYears)})`,
  };
  labelCell(ws.getCell('A16'), 'Recommended annual contribution', { bold: true });
  bigNumber(ws, 'B16', { numFmt: MONEY }).value = { formula: 'B14+B15' };
  ws.getRow(16).height = 30;
  labelCell(ws.getCell('A17'), 'You are contributing now');
  calcCell(ws.getCell('B17'), { numFmt: MONEY }).value = { formula: SETUP(S.currentContribution) };
  labelCell(ws.getCell('A18'), 'Gap, per unit per month', { bold: true });
  calcCell(ws.getCell('B18'), { numFmt: '$#,##0.00', bold: true }).value = {
    formula: `IF(${SETUP(S.units)}=0,"",MAX(0,B16-B17)/${SETUP(S.units)}/12)`,
  };
  noteCell(ws, 'D14:D18', 'The monthly per-unit gap is the number to take to a budget meeting. An annual total invites argument; eleven dollars a month invites a decision.');

  sectionTitle(ws, 20, 'What the projection says', 'D');
  const F = `Projection!$F$${projection.first}:$F$${projection.last}`;
  const G = `Projection!$G$${projection.first}:$G$${projection.last}`;
  const DRY = `Projection!$I$${projection.first}:$I$${projection.last}`;

  labelCell(ws.getCell('A21'), 'Lowest balance over thirty years', { bold: true });
  calcCell(ws.getCell('B21'), { numFmt: MONEY, bold: true }).value = { formula: `MIN(${F})` };
  labelCell(ws.getCell('A22'), 'First year the fund runs dry', { bold: true });
  calcCell(ws.getCell('B22'), { numFmt: YEAR, bold: true }).value = {
    formula: `IF(MIN(${DRY})=99999,"Never — on these assumptions",MIN(${DRY}))`,
  };
  ws.addConditionalFormatting({
    ref: 'B22',
    rules: [{
      type: 'expression', formulae: ['ISNUMBER($B$22)'], priority: 1,
      style: { font: { color: { argb: BAD }, bold: true } },
    }],
  });
  labelCell(ws.getCell('A23'), 'Largest assessment any one year needs');
  calcCell(ws.getCell('B23'), { numFmt: MONEY }).value = { formula: `MAX(${G})` };
  labelCell(ws.getCell('A24'), 'That assessment per unit');
  calcCell(ws.getCell('B24'), { numFmt: MONEY }).value = {
    formula: `IF(${SETUP(S.units)}=0,"",B23/${SETUP(S.units)})`,
  };
  labelCell(ws.getCell('A25'), 'Total replacement spending, thirty years');
  calcCell(ws.getCell('B25'), { numFmt: MONEY }).value = {
    formula: `SUM(Projection!$E$${projection.first}:$E$${projection.last})`,
  };
  noteCell(ws, 'D21:D25', 'The projection runs on the contribution modelled on Setup, not on the recommendation above. Put the recommended figure in and watch this section change.');

  sectionTitle(ws, 27, 'Before you take this to a meeting', 'D');
  const checks = [
    'Replace the three largest unit costs with real quotes. On most properties the roof, the pavement and the elevator decide the answer on their own.',
    'Check the install years for anything replaced in the last decade — an effective age that is five years wrong moves the fully funded balance more than the inflation rate does.',
    'Run it twice: once at your inflation assumption, once three points higher. If the answer only works at the low figure, it does not work.',
    'Delete any component the association is not actually responsible for. Paying twice for something a unit owner owns is the most common error in this arithmetic.',
  ];
  checks.forEach((text, i) => {
    const r = 28 + i;
    const cell = ws.getCell(`A${r}`);
    ws.mergeCells(`A${r}:D${r}`);
    cell.value = `${i + 1}.  ${text}`;
    cell.font = { name: 'Calibri', size: 10, color: { argb: INK } };
    cell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
    ws.getRow(r).height = 30;
  });

  for (const r of [6, 7, 8, 16, 21, 22]) {
    ws.getCell(`A${r}`).border = { top: { style: 'hair', color: { argb: RULE } } };
    ws.getCell(`B${r}`).border = { top: { style: 'hair', color: { argb: RULE } } };
  }

  printSetup(ws, { title: 'Reserve Fund Adequacy Calculator — Results' });
  return ws;
}

export async function build() {
  const wb = new ExcelJS.Workbook();
  applyWorkbookMeta(wb, newWorkbook({
    title: meta.title,
    subject: 'Condominium and homeowner association reserve fund adequacy analysis',
    keywords: 'reserve study, percent funded, capital planning, condominium, New Hampshire',
  }));

  buildGuide(wb);
  buildSetup(wb);
  buildComponents(wb);
  const schedule = buildSchedule(wb);
  const projection = buildProjection(wb, schedule);
  buildResults(wb, projection);

  // Opens on Results, because the first thing a buyer wants is the answer.
  wb.views = [{ activeTab: 5, firstSheet: 0, visibility: 'visible' }];

  return [{
    name: 'Reserve Fund Adequacy Calculator.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
  }];
}

/**
 * Independent recomputation of the model, for `verify.mjs`.
 *
 * Deliberately written from the saved input cells rather than from the
 * constants above, so a seed that fails to reach the sheet shows up as a
 * disagreement instead of being confirmed by the same array that caused it.
 */
export async function selfCheck(wb) {
  const setup = wb.getWorksheet('Setup');
  const comps = wb.getWorksheet('Components');
  const money = (n) => (n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`);
  const literal = (ws, ref) => {
    const v = ws.getCell(ref).value;
    return v && typeof v === 'object' && 'formula' in v ? null : v;
  };

  const units = literal(setup, S.units);
  const studyYear = literal(setup, S.studyYear);
  const balance = literal(setup, S.reserveBalance);
  const contribution = literal(setup, S.currentContribution);
  const inflation = literal(setup, S.inflation);
  const interest = literal(setup, S.interest);
  const increase = literal(setup, S.contributionIncrease);
  const catchUp = literal(setup, S.catchUpYears);

  const rows = [];
  for (let r = FIRST_COMPONENT_ROW; r <= LAST_COMPONENT_ROW; r += 1) {
    const name = comps.getCell(`A${r}`).value;
    const qty = comps.getCell(`C${r}`).value;
    const unitCost = comps.getCell(`E${r}`).value;
    const life = comps.getCell(`G${r}`).value;
    const lastDone = comps.getCell(`H${r}`).value;
    if (!name || qty == null || unitCost == null || !life || !lastDone) continue;
    const costToday = qty * unitCost;
    const age = Math.max(0, studyYear - lastDone);
    const remaining = Math.max(0, life - age);
    rows.push({ costToday, life, remaining, ffb: costToday * Math.min(age / life, 1), accrual: costToday / life });
  }

  const ffb = rows.reduce((s, c) => s + c.ffb, 0);
  const accrual = rows.reduce((s, c) => s + c.accrual, 0);
  const totalToday = rows.reduce((s, c) => s + c.costToday, 0);
  const percentFunded = ffb === 0 ? 0 : balance / ffb;
  const shortfall = Math.max(0, ffb - balance);
  const recommended = accrual + (catchUp ? shortfall / catchUp : 0);

  const spend = [];
  for (let t = 1; t <= YEARS; t += 1) {
    let total = 0;
    for (const c of rows) {
      const firstDue = Math.max(c.remaining, 1);
      if (t >= firstDue && (t - firstDue) % c.life === 0) total += c.costToday * (1 + inflation) ** t;
    }
    spend.push(total);
  }

  let bal = balance;
  let lowest = Infinity;
  let firstDry = null;
  let maxAssessment = 0;
  for (let t = 1; t <= YEARS; t += 1) {
    const contrib = contribution * (1 + increase) ** (t - 1);
    bal += contrib + Math.max(0, bal + contrib / 2) * interest - spend[t - 1];
    lowest = Math.min(lowest, bal);
    if (bal < 0) {
      if (firstDry === null) firstDry = studyYear + t - 1;
      maxAssessment = Math.max(maxAssessment, -bal);
    }
  }

  const reading = percentFunded < 0.3 ? 'Weak' : percentFunded < 0.7 ? 'Fair' : 'Strong';
  const concerns = [];
  if (rows.length < 20) concerns.push(`only ${rows.length} components read back out of the workbook`);
  if (percentFunded <= 0 || percentFunded > 3) concerns.push(`percent funded of ${(percentFunded * 100).toFixed(1)}% is not a believable example`);
  if (recommended <= contribution) concerns.push('the recommendation does not exceed the current contribution, so the example demonstrates nothing');
  if (firstDry === null) concerns.push('the seeded association never runs dry, so the projection shows nothing');

  return {
    figures: [
      ['components priced', `${rows.length}`],
      ['replacement cost today', money(totalToday)],
      ['fully funded balance', money(ffb)],
      ['reserve balance on hand', money(balance)],
      ['percent funded', `${(percentFunded * 100).toFixed(1)}%  → ${reading}`],
      ['shortfall', `${money(shortfall)}  (${money(shortfall / units)} per unit)`],
      ['recommended contribution', `${money(recommended)}  against ${money(contribution)} now`],
      ['gap per unit per month', `$${(Math.max(0, recommended - contribution) / units / 12).toFixed(2)}`],
      ['lowest balance in 30 years', money(lowest)],
      ['first year the fund dries', firstDry ?? 'never on these assumptions'],
      ['largest assessment needed', maxAssessment ? `${money(maxAssessment)}  (${money(maxAssessment / units)} per unit)` : 'none'],
    ],
    concerns,
  };
}
