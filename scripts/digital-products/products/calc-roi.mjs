/**
 * Property ROI Calculator — marketplace product `calc-roi`, $39.
 *
 * WHAT A BUYER IS PAYING FOR
 *
 * The underwriting a small-multifamily buyer does on the back of an envelope,
 * done properly: a rent roll, a real operating-expense schedule, financing, and
 * then the six numbers a decision actually turns on — cap rate, DSCR,
 * cash-on-cash, break-even occupancy, IRR over the hold, and the equity
 * multiple. Every one of them a live formula, so an offer price can be moved
 * and the answer moves with it.
 *
 * WHY THESE SIX
 *
 *   Cap rate              what the building earns, ignoring how it is paid for
 *   DSCR                  whether a lender will lend: NOI over debt service
 *   Cash-on-cash          what the cash actually returns in year one
 *   Break-even occupancy  how much of the building can sit empty before the
 *                         deal loses money — the number that kills more deals
 *                         than any other and gets left off most spreadsheets
 *   IRR                   the return over the whole hold, with the sale in it
 *   Equity multiple       how many times the cash comes back
 *
 * EXPENSES ARE NOT A PERCENTAGE
 *
 * The common shortcut is the "50% rule". It is in here as a cross-check, not as
 * the method, because in New Hampshire the line items that decide a deal —
 * winter heating on an owner-paid system, snow removal, water and sewer, and
 * property taxes that vary enormously by town — are exactly the ones a flat
 * percentage hides. The expense sheet is itemised for that reason.
 *
 * THE STARTING NUMBERS
 *
 * A four-unit property at $565,000 with 25% down at 6.75%, itemised expenses
 * at New Hampshire levels. Plausible rather than flattering: it is a deal that
 * covers its debt and returns modest cash, which is what most real ones do.
 */
import ExcelJS from 'exceljs';
import {
  INK, INK_SOFT, AMBER_PALE, GOOD, WARN, BAD, RULE,
  MONEY, MONEY_CENTS, PERCENT, NUMBER, YEAR,
  applyWorkbookMeta, newWorkbook, sheetHeader, sectionTitle, tableHead,
  inputCell, calcCell, labelCell, noteCell, bigNumber, zebra, printSetup,
  guideSheet, field,
} from '../lib/workbook.mjs';

export const meta = {
  id: 'calc-roi',
  title: 'Property ROI Calculator',
  subtitle: 'Analyze any investment in minutes',
  price: 3900,
  files: ['xlsx'],
};

const YEARS = 30;
const UNIT_ROWS = 12;
const FIRST_UNIT = 6;
const LAST_UNIT = FIRST_UNIT + UNIT_ROWS - 1;

/** Four-unit New Hampshire multifamily: [unit, beds, baths, sq ft, rent]. */
const RENT_ROLL = [
  ['Unit 1', 2, 1, 880, 1650],
  ['Unit 2', 2, 1, 880, 1650],
  ['Unit 3', 1, 1, 710, 1425],
  ['Unit 4', 3, 1.5, 1050, 1875],
];

/** Other monthly income: [label, amount]. */
const OTHER_INCOME = [
  ['Coin laundry', 85],
  ['Off-street parking', 0],
  ['Storage lockers', 40],
  ['Pet rent', 50],
  ['Other', 0],
];

/**
 * Itemised annual operating expenses: [label, amount, note].
 * `null` amount means the line is calculated from a rate instead.
 */
const EXPENSES = [
  ['Property taxes', 9800, 'The single biggest variable between NH towns. Use the actual bill, not a rate of thumb.'],
  ['Insurance', 3400, null],
  ['Water and sewer', 2900, 'Owner-paid on most older NH multifamily. Check whether units are separately metered.'],
  ['Common-area electric', 720, null],
  ['Heating fuel (owner-paid)', 0, 'Zero only if every unit heats itself. If the boiler is central, this is the line that decides the deal.'],
  ['Trash and recycling', 960, null],
  ['Snow removal and sanding', 2100, 'Budget for a bad winter, not an average one.'],
  ['Landscaping and grounds', 1200, null],
  ['Pest control', 350, null],
  ['Legal and accounting', 650, null],
  ['Advertising and leasing', 400, null],
  ['Licences and inspections', 300, null],
];

const D = {
  name: 'B6', price: 'B7', closing: 'B8', repairs: 'B9', acquisition: 'B10',
  downPct: 'B13', loan: 'B14', cashIn: 'B15', rate: 'B16', amortYears: 'B17',
  monthlyPayment: 'B18', annualDebt: 'B19',
  hold: 'B22', rentGrowth: 'B23', expenseGrowth: 'B24', exitCap: 'B25', sellingCosts: 'B26',
};
const abs = (ref) => ref.replace(/([A-Z]+)(\d+)/, '$$$1$$$2');
const DEAL = (ref) => `Deal!${abs(ref)}`;

const I = { vacancy: 'B30', gpr: 'B34', vacancyLoss: 'B35', egi: 'B36', unitCount: 'B37' };
const INC = (ref) => `Income!${abs(ref)}`;

const E = { rmPct: 'B20', mgmtPct: 'B21', reservesPerUnit: 'B22', total: 'B25', ratio: 'B26', noi: 'B27' };
const EXP = (ref) => `Expenses!${abs(ref)}`;

function buildGuide(wb) {
  return guideSheet(wb, {
    title: 'Property ROI Calculator',
    blurb: 'Underwrite a rental property properly in about fifteen minutes. Shaded cells are yours; everything else calculates.',
    blocks: [
      ['The rule for the whole workbook', [
        'Shaded cells are inputs. Unshaded cells are calculated — type into one and you break the chain behind it.',
        'Work in order: Deal, then Income, then Expenses. Results and Projection fill themselves in.',
      ]],
      ['The six numbers that decide it', [
        'Cap rate — what the building earns before financing. Compare it against what else you could buy in the same town, not against a national figure.',
        'DSCR — net operating income divided by annual debt service. Under 1.20 and most lenders decline; under 1.00 and the building cannot pay its own mortgage.',
        'Cash-on-cash — year-one cash flow against the cash you actually put in. This is the number that pays you.',
        'Break-even occupancy — how empty the building can get before the deal loses money. Most spreadsheets omit it and it kills more deals than any other figure.',
        'IRR over the hold — the whole return, including the sale, with the timing accounted for.',
        'Equity multiple — how many times your cash comes back by the end.',
      ]],
      ['Why the expenses are itemised', [
        'The "50% rule" says operating expenses run to half of gross rent. It is in Results as a cross-check, never as the method.',
        'In New Hampshire the lines that decide a deal are the ones a flat percentage hides: owner-paid heat, snow removal, water and sewer, and property taxes that differ by multiples between towns. Put the real bills in.',
        'Repairs, management and reserves are entered as rates rather than amounts, because they genuinely do scale with income and unit count.',
      ]],
      ['Reserves are not optional', [
        'A roof you have not budgeted for is not a surprise, it is an omission. The reserves line is set per unit per year and is treated as an operating expense here, which is why the cap rate this produces is slightly lower — and more honest — than a listing broker\'s.',
      ]],
      ['How the sale is modelled', [
        'The exit value is that year\'s net operating income divided by the exit cap rate you set — the way a buyer will actually price it when you sell.',
        'Set the exit cap at or above the cap rate you are buying at. Assuming you will sell at a lower cap than you bought is assuming the market does you a favour.',
        'Selling costs come off, the loan balance comes off, and what is left is the sale proceeds feeding the IRR.',
      ]],
      ['Three sensitivities worth running', [
        'Raise the exit cap rate by one point. If the IRR collapses, the deal is a bet on the market rather than on the building.',
        'Drop every rent to what is being paid now rather than what you think it should be. If it only works at market rents you have not yet achieved, it does not work yet.',
        'Add two months of vacancy in year one. Turnover on acquisition is normal and rarely modelled.',
      ]],
    ],
  });
}

function buildDeal(wb) {
  const ws = wb.addWorksheet('Deal', { properties: { tabColor: { argb: INK_SOFT } } });
  [38, 18, 2, 62].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  sheetHeader(ws, {
    title: 'Deal — price, financing and the hold',
    blurb: 'Shaded cells only. Everything in the workbook reads these.',
    lastColumn: 'D',
  });

  sectionTitle(ws, 5, 'The purchase', 'D');
  field(ws, 6, 'Property', { value: '4-unit, New Hampshire', input: true });
  field(ws, 7, 'Purchase price', { value: 565000, input: true, numFmt: MONEY });
  field(ws, 8, 'Closing costs', { value: 12500, input: true, numFmt: MONEY, note: 'Legal, recording, lender fees, inspection, first-year escrows.' });
  field(ws, 9, 'Immediate repairs before rent-up', { value: 25000, input: true, numFmt: MONEY, note: 'What it takes to get the building to the condition the rent roll assumes.' });
  field(ws, 10, 'Total acquisition cost', { formula: `${abs(D.price)}+${abs(D.closing)}+${abs(D.repairs)}`, numFmt: MONEY, bold: true });

  sectionTitle(ws, 12, 'The financing', 'D');
  field(ws, 13, 'Down payment', { value: 0.25, input: true, numFmt: PERCENT, note: 'Most lenders want 20–25% on a non-owner-occupied small multifamily.' });
  field(ws, 14, 'Loan amount', { formula: `${abs(D.price)}*(1-${abs(D.downPct)})`, numFmt: MONEY });
  field(ws, 15, 'Cash you put in', { formula: `${abs(D.acquisition)}-${abs(D.loan)}`, numFmt: MONEY, bold: true, note: 'Down payment plus closing plus repairs. This is the denominator of cash-on-cash and the first entry in the IRR.' });
  field(ws, 16, 'Interest rate', { value: 0.0675, input: true, numFmt: '0.000%' });
  field(ws, 17, 'Amortisation (years)', { value: 30, input: true, numFmt: NUMBER });
  field(ws, 18, 'Monthly payment', { formula: `PMT(${abs(D.rate)}/12,${abs(D.amortYears)}*12,-${abs(D.loan)})`, numFmt: MONEY_CENTS });
  field(ws, 19, 'Annual debt service', { formula: `${abs(D.monthlyPayment)}*12`, numFmt: MONEY, bold: true });

  sectionTitle(ws, 21, 'The hold and the exit', 'D');
  field(ws, 22, 'Hold period (years)', { value: 10, input: true, numFmt: NUMBER });
  field(ws, 23, 'Annual rent growth', { value: 0.03, input: true, numFmt: PERCENT });
  field(ws, 24, 'Annual expense growth', { value: 0.035, input: true, numFmt: PERCENT, note: 'Expenses have outrun rents for most of the last decade. Keeping this above rent growth is the honest default.' });
  field(ws, 25, 'Exit cap rate', { value: 0.0675, input: true, numFmt: PERCENT, note: 'What a buyer will pay in terms of that year\'s income. Set it at or above your going-in cap rate.' });
  field(ws, 26, 'Selling costs', { value: 0.06, input: true, numFmt: PERCENT });

  printSetup(ws, { title: 'Property ROI Calculator — Deal' });
  return ws;
}

function buildIncome(wb) {
  const ws = wb.addWorksheet('Income', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(ws, {
    title: 'Income — the rent roll and everything else',
    blurb: 'Put in what is actually being paid today and what the unit should get. The workbook underwrites on market rent and shows you both.',
    lastColumn: 'G',
  });

  tableHead(ws, 5, ['Unit', 'Beds', 'Baths', 'Sq ft', 'Rent now / mo', 'Market rent / mo', 'Annual at market'],
    [16, 8, 8, 10, 16, 18, 18]);

  for (let i = 0; i < UNIT_ROWS; i += 1) {
    const r = FIRST_UNIT + i;
    const seed = RENT_ROLL[i];
    const row = ws.getRow(r);
    [1, 2, 3, 4, 5, 6].forEach((c) => inputCell(row.getCell(c), { numFmt: c >= 5 ? MONEY : (c === 4 ? NUMBER : undefined) }));
    if (seed) {
      row.getCell(1).value = seed[0];
      row.getCell(2).value = seed[1];
      row.getCell(3).value = seed[2];
      row.getCell(4).value = seed[3];
      row.getCell(5).value = seed[4];
      row.getCell(6).value = seed[4];
    }
    calcCell(row.getCell(7), { numFmt: MONEY }).value = { formula: `IF($F${r}="","",$F${r}*12)` };
  }

  const totals = LAST_UNIT + 1;
  labelCell(ws.getRow(totals).getCell(1), 'Totals', { bold: true });
  calcCell(ws.getRow(totals).getCell(4), { numFmt: NUMBER, bold: true }).value = { formula: `SUM(D${FIRST_UNIT}:D${LAST_UNIT})` };
  calcCell(ws.getRow(totals).getCell(5), { numFmt: MONEY, bold: true }).value = { formula: `SUM(E${FIRST_UNIT}:E${LAST_UNIT})` };
  calcCell(ws.getRow(totals).getCell(6), { numFmt: MONEY, bold: true }).value = { formula: `SUM(F${FIRST_UNIT}:F${LAST_UNIT})` };
  calcCell(ws.getRow(totals).getCell(7), { numFmt: MONEY, bold: true }).value = { formula: `SUM(G${FIRST_UNIT}:G${LAST_UNIT})` };
  ws.getRow(totals).eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: INK } } }; });
  zebra(ws, FIRST_UNIT, LAST_UNIT, 7);

  sectionTitle(ws, 21, 'Other income, per month', 'G');
  OTHER_INCOME.forEach(([label, amount], i) => {
    const r = 22 + i;
    labelCell(ws.getCell(`A${r}`), label);
    inputCell(ws.getCell(`B${r}`), { numFmt: MONEY }).value = amount;
  });
  const otherTotal = 22 + OTHER_INCOME.length;
  labelCell(ws.getCell(`A${otherTotal}`), 'Other income per year', { bold: true });
  calcCell(ws.getCell(`B${otherTotal}`), { numFmt: MONEY, bold: true }).value = {
    formula: `SUM(B22:B${otherTotal - 1})*12`,
  };

  sectionTitle(ws, 29, 'Vacancy and collection loss', 'G');
  field(ws, 30, 'Vacancy and credit loss', { value: 0.06, input: true, numFmt: PERCENT, noteColumn: 'D', note: 'Six percent is roughly three weeks a year per unit. Owner-managed buildings with long tenancies run lower; student or seasonal markets much higher.' });

  sectionTitle(ws, 32, 'What the building actually collects', 'G');
  field(ws, 34, 'Gross potential rent', { formula: `G${totals}+${abs('B' + otherTotal)}`, numFmt: MONEY, bold: true });
  field(ws, 35, 'Less vacancy and collection loss', { formula: `-${abs(I.gpr)}*${abs(I.vacancy)}`, numFmt: MONEY });
  field(ws, 36, 'Effective gross income', { formula: `${abs(I.gpr)}+${abs(I.vacancyLoss)}`, numFmt: MONEY, bold: true });
  field(ws, 37, 'Units counted', { formula: `COUNTA(A${FIRST_UNIT}:A${LAST_UNIT})`, numFmt: NUMBER });

  printSetup(ws, { landscape: true, title: 'Property ROI Calculator — Income' });
  return ws;
}

function buildExpenses(wb) {
  const ws = wb.addWorksheet('Expenses', { properties: { tabColor: { argb: AMBER_PALE } } });
  [38, 18, 2, 62].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  sheetHeader(ws, {
    title: 'Expenses — itemised, because the percentage rules hide the ones that matter',
    blurb: 'Annual amounts. Use the actual bills wherever you have them; a seller\'s pro forma is a sales document.',
    lastColumn: 'D',
  });

  sectionTitle(ws, 5, 'Fixed and contracted costs', 'D');
  EXPENSES.forEach(([label, amount, note], i) => {
    const r = 6 + i;
    field(ws, r, label, { value: amount, input: true, numFmt: MONEY, note: note || undefined });
  });
  const lastFixed = 6 + EXPENSES.length - 1;

  sectionTitle(ws, 19, 'Costs that scale with the building', 'D');
  field(ws, 20, 'Repairs and maintenance (% of income)', { value: 0.07, input: true, numFmt: PERCENT, note: 'Seven percent suits a building in sound condition. Older systems or deferred maintenance: ten to fifteen.' });
  field(ws, 21, 'Property management (% of income)', { value: 0.08, input: true, numFmt: PERCENT, note: 'Put the real figure in even if you manage it yourself — your time is a cost, and the next buyer will have to pay for it.' });
  field(ws, 22, 'Capital reserves per unit per year', { value: 400, input: true, numFmt: MONEY, note: 'Roof, boiler, paving, windows. Leaving this at zero is how a cap rate gets flattered.' });

  sectionTitle(ws, 24, 'What it costs to run', 'D');
  field(ws, 25, 'Total operating expenses', {
    formula: `SUM(B6:B${lastFixed})+${INC(I.egi)}*(${abs(E.rmPct)}+${abs(E.mgmtPct)})+${abs(E.reservesPerUnit)}*${INC(I.unitCount)}`,
    numFmt: MONEY, bold: true,
  });
  field(ws, 26, 'Operating expense ratio', {
    formula: `IF(${INC(I.egi)}=0,"",${abs(E.total)}/${INC(I.egi)})`,
    numFmt: PERCENT,
    note: 'Thirty-five to fifty percent is the usual band for small multifamily with reserves included. Well outside it, something is missing or double-counted.',
  });
  field(ws, 27, 'Net operating income', {
    formula: `${INC(I.egi)}-${abs(E.total)}`,
    numFmt: MONEY, bold: true,
    note: 'Income less operating costs, before any mortgage. This is what the building earns.',
  });

  printSetup(ws, { title: 'Property ROI Calculator — Expenses' });
  return ws;
}

function buildProjection(wb) {
  const ws = wb.addWorksheet('Projection', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(ws, {
    title: 'The hold, year by year',
    blurb: 'Rows past your hold period are left blank on purpose — the IRR reads this column and must not see cash flows you will never receive.',
    lastColumn: 'K',
  });

  tableHead(ws, 5, [
    'Year', 'Effective income', 'Operating expenses', 'Net operating income',
    'Debt service', 'Cash flow', 'Cumulative cash', 'Loan balance',
    'Value at exit cap', 'Sale proceeds', 'Investor cash flow',
  ], [8, 16, 18, 20, 14, 14, 16, 14, 16, 14, 17]);

  // Year zero: the cash going in, which is what makes the IRR an IRR.
  const zero = 6;
  calcCell(ws.getCell(`A${zero}`), { numFmt: YEAR }).value = 0;
  calcCell(ws.getCell(`K${zero}`), { numFmt: MONEY, bold: true }).value = { formula: `-${DEAL(D.cashIn)}` };
  noteCell(ws, `B${zero}:J${zero}`, 'Acquisition — down payment, closing costs and up-front repairs.');

  const first = zero + 1;
  for (let t = 1; t <= YEARS; t += 1) {
    const r = first + t - 1;
    const row = ws.getRow(r);
    const hold = DEAL(D.hold);

    calcCell(row.getCell(1), { numFmt: YEAR }).value = t;
    calcCell(row.getCell(2), { numFmt: MONEY }).value = {
      formula: `IF(${t}>${hold},"",${INC(I.egi)}*(1+${DEAL(D.rentGrowth)})^${t - 1})`,
    };
    calcCell(row.getCell(3), { numFmt: MONEY }).value = {
      formula: `IF(${t}>${hold},"",${EXP(E.total)}*(1+${DEAL(D.expenseGrowth)})^${t - 1})`,
    };
    calcCell(row.getCell(4), { numFmt: MONEY }).value = {
      formula: `IF(${t}>${hold},"",B${r}-C${r})`,
    };
    // Debt service stops when the loan is paid off rather than running forever.
    calcCell(row.getCell(5), { numFmt: MONEY }).value = {
      formula: `IF(${t}>${hold},"",IF(${t}<=${DEAL(D.amortYears)},${DEAL(D.annualDebt)},0))`,
    };
    calcCell(row.getCell(6), { numFmt: MONEY }).value = {
      formula: `IF(${t}>${hold},"",D${r}-E${r})`,
    };
    calcCell(row.getCell(7), { numFmt: MONEY }).value = t === 1
      ? { formula: `IF(${t}>${hold},"",F${r})` }
      : { formula: `IF(${t}>${hold},"",IF(G${r - 1}="",F${r},G${r - 1}+F${r}))` };
    /**
     * Remaining loan balance.
     *
     * FV(rate, periods, payment, -loan) is the arrangement that returns a
     * positive balance: passing the loan as a positive present value and the
     * payment as negative returns the balance with its sign flipped, which is
     * the mistake this comment exists to stop somebody repeating.
     */
    calcCell(row.getCell(8), { numFmt: MONEY }).value = {
      formula: `IF(${t}>${hold},"",IF(${t}>=${DEAL(D.amortYears)},0,`
        + `MAX(0,FV(${DEAL(D.rate)}/12,${t}*12,${DEAL(D.monthlyPayment)},-${DEAL(D.loan)}))))`,
    };
    calcCell(row.getCell(9), { numFmt: MONEY }).value = {
      formula: `IF(${t}>${hold},"",IF(${DEAL(D.exitCap)}=0,"",D${r}/${DEAL(D.exitCap)}))`,
    };
    calcCell(row.getCell(10), { numFmt: MONEY }).value = {
      formula: `IF(${t}<>${hold},0,I${r}*(1-${DEAL(D.sellingCosts)})-H${r})`,
    };
    calcCell(row.getCell(11), { numFmt: MONEY, bold: true }).value = {
      formula: `IF(${t}>${hold},"",F${r}+J${r})`,
    };
  }

  const last = first + YEARS - 1;
  zebra(ws, first, last, 11);
  ws.addConditionalFormatting({
    ref: `F${first}:F${last}`,
    rules: [{ type: 'cellIs', operator: 'lessThan', formulae: ['0'], priority: 1, style: { font: { color: { argb: BAD }, bold: true } } }],
  });

  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 5 }];
  printSetup(ws, { landscape: true, title: 'Property ROI Calculator — Projection' });
  return { zero, first, last };
}

function buildResults(wb, proj) {
  const ws = wb.addWorksheet('Results', { properties: { tabColor: { argb: AMBER_PALE } } });
  [40, 20, 2, 58].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  sheetHeader(ws, {
    title: 'Results',
    blurb: 'Nothing here is typed. Change the Deal, Income or Expenses sheet and every figure moves.',
    lastColumn: 'D',
  });

  const noi = EXP(E.noi);
  const egi = INC(I.egi);
  const gpr = INC(I.gpr);
  const opex = EXP(E.total);
  const units = INC(I.unitCount);
  const cf = `Projection!$F$${proj.first}`;
  const irrRange = `Projection!$K$${proj.zero}:$K$${proj.last}`;

  sectionTitle(ws, 5, 'The building', 'D');
  field(ws, 6, 'Net operating income', { formula: noi, numFmt: MONEY, bold: true });
  field(ws, 7, 'Cap rate on purchase price', { formula: `IF(${DEAL(D.price)}=0,"",${noi}/${DEAL(D.price)})`, numFmt: PERCENT, bold: true, note: 'What the building earns, ignoring how you paid for it. The comparison that matters is other buildings in the same town.' });
  field(ws, 8, 'Cap rate on all-in cost', { formula: `IF(${DEAL(D.acquisition)}=0,"",${noi}/${DEAL(D.acquisition)})`, numFmt: PERCENT, note: 'The same figure with closing costs and up-front repairs included — your real return on capital.' });
  field(ws, 9, 'Operating expense ratio', { formula: `IF(${egi}=0,"",${opex}/${egi})`, numFmt: PERCENT });
  field(ws, 10, 'Gross rent multiplier', { formula: `IF(${gpr}=0,"",${DEAL(D.price)}/${gpr})`, numFmt: '0.0' });
  field(ws, 11, 'Price per unit', { formula: `IF(${units}=0,"",${DEAL(D.price)}/${units})`, numFmt: MONEY });

  sectionTitle(ws, 13, 'Can it carry the debt', 'D');
  field(ws, 14, 'Annual debt service', { formula: DEAL(D.annualDebt), numFmt: MONEY });
  const dscr = field(ws, 15, 'Debt service coverage ratio', { formula: `IF(${DEAL(D.annualDebt)}=0,"",${noi}/${DEAL(D.annualDebt)})`, numFmt: '0.00', bold: true, note: 'Under 1.20 and most lenders decline. Under 1.00 and the building cannot pay its own mortgage.' });
  dscr.font = { name: 'Calibri', size: 14, bold: true, color: { argb: INK } };
  field(ws, 16, 'Lender\'s view', {
    formula: `IF(B15="","",IF(B15<1,"Will not cover the payment",IF(B15<1.2,"Thin — expect a decline","Bankable")))`,
    bold: true,
  });
  ws.addConditionalFormatting({
    ref: 'B16',
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'Will not', priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Thin', priority: 2, style: { font: { color: { argb: WARN }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Bankable', priority: 3, style: { font: { color: { argb: GOOD }, bold: true } } },
    ],
  });
  field(ws, 17, 'Break-even occupancy', {
    formula: `IF(${gpr}=0,"",(${opex}+${DEAL(D.annualDebt)})/${gpr})`,
    numFmt: PERCENT, bold: true,
    note: 'Above this much of the rent roll empty, the deal loses money. The figure most spreadsheets leave out.',
  });

  sectionTitle(ws, 19, 'What it pays you', 'D');
  field(ws, 20, 'Year-one cash flow', { formula: cf, numFmt: MONEY, bold: true });
  field(ws, 21, 'Cash flow per unit per month', { formula: `IF(${units}=0,"",${cf}/${units}/12)`, numFmt: MONEY_CENTS });
  const coc = field(ws, 22, 'Cash-on-cash return', { formula: `IF(${DEAL(D.cashIn)}=0,"",${cf}/${DEAL(D.cashIn)})`, numFmt: PERCENT, bold: true, note: 'Year-one cash against the cash you put in.' });
  coc.font = { name: 'Calibri', size: 14, bold: true, color: { argb: INK } };
  field(ws, 23, 'Cash invested', { formula: DEAL(D.cashIn), numFmt: MONEY });

  sectionTitle(ws, 25, `Over the whole hold`, 'D');
  field(ws, 26, 'Sale price at exit cap', { formula: `INDEX(Projection!$I$${proj.first}:$I$${proj.last},${DEAL(D.hold)})`, numFmt: MONEY });
  field(ws, 27, 'Net sale proceeds', { formula: `INDEX(Projection!$J$${proj.first}:$J$${proj.last},${DEAL(D.hold)})`, numFmt: MONEY });
  field(ws, 28, 'Total cash received', { formula: `SUM(Projection!$K$${proj.first}:$K$${proj.last})`, numFmt: MONEY });
  field(ws, 29, 'Total profit', { formula: `B28-${DEAL(D.cashIn)}`, numFmt: MONEY, bold: true });
  field(ws, 30, 'Equity multiple', { formula: `IF(${DEAL(D.cashIn)}=0,"",B28/${DEAL(D.cashIn)})`, numFmt: '0.00"x"' });
  const irr = field(ws, 31, 'Internal rate of return', { formula: `IFERROR(IRR(${irrRange}),"")`, numFmt: PERCENT, bold: true, note: 'The whole return with the sale and the timing in it. This is the figure to compare against anything else you could do with the money.' });
  irr.font = { name: 'Calibri', size: 18, bold: true, color: { argb: INK } };
  ws.getRow(31).height = 26;

  sectionTitle(ws, 33, 'Cross-checks, not methods', 'D');
  field(ws, 34, 'The 1% rule', { formula: `IF(${DEAL(D.price)}=0,"",(${gpr}/12)/${DEAL(D.price)})`, numFmt: '0.00%', note: 'Monthly gross rent against price. A rule of thumb from a different interest-rate era — informative, not decisive.' });
  field(ws, 35, 'The 50% rule would predict', { formula: `${gpr}*0.5`, numFmt: MONEY, note: 'Half of gross rent as operating expenses.' });
  field(ws, 36, 'Your itemised expenses are', { formula: opex, numFmt: MONEY, note: 'Far below the 50% line usually means a line item is missing — most often reserves, owner-paid heat, or management.' });
  field(ws, 37, 'Difference', { formula: `B36-B35`, numFmt: MONEY });

  printSetup(ws, { title: 'Property ROI Calculator — Results' });
  return ws;
}

export async function build() {
  const wb = new ExcelJS.Workbook();
  applyWorkbookMeta(wb, newWorkbook({
    title: meta.title,
    subject: 'Rental property investment underwriting — cap rate, DSCR, cash-on-cash, IRR',
    keywords: 'real estate, underwriting, cap rate, DSCR, IRR, multifamily, New Hampshire',
  }));

  buildGuide(wb);
  buildDeal(wb);
  buildIncome(wb);
  buildExpenses(wb);
  const proj = buildProjection(wb);
  buildResults(wb, proj);
  wb.views = [{ activeTab: 5, firstSheet: 0, visibility: 'visible' }];

  return [{
    name: 'Property ROI Calculator.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
  }];
}

/** Independent recomputation of the underwriting, for `verify.mjs`. */
export async function selfCheck(wb) {
  const deal = wb.getWorksheet('Deal');
  const income = wb.getWorksheet('Income');
  const exp = wb.getWorksheet('Expenses');
  const money = (n) => (n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`);
  const lit = (ws, ref) => {
    const v = ws.getCell(ref).value;
    return v && typeof v === 'object' && 'formula' in v ? null : v;
  };

  const price = lit(deal, D.price);
  const closing = lit(deal, D.closing);
  const repairs = lit(deal, D.repairs);
  const downPct = lit(deal, D.downPct);
  const rate = lit(deal, D.rate);
  const amort = lit(deal, D.amortYears);
  const hold = lit(deal, D.hold);
  const rentGrowth = lit(deal, D.rentGrowth);
  const expGrowth = lit(deal, D.expenseGrowth);
  const exitCap = lit(deal, D.exitCap);
  const sellCosts = lit(deal, D.sellingCosts);
  const vacancy = lit(income, I.vacancy);

  const acquisition = price + closing + repairs;
  const loan = price * (1 - downPct);
  const cashIn = acquisition - loan;
  const r = rate / 12;
  const n = amort * 12;
  const monthly = (loan * r) / (1 - (1 + r) ** -n);
  const annualDebt = monthly * 12;

  let marketRent = 0;
  let unitCount = 0;
  let sqft = 0;
  for (let row = FIRST_UNIT; row <= LAST_UNIT; row += 1) {
    const name = income.getCell(`A${row}`).value;
    if (!name) continue;
    unitCount += 1;
    sqft += Number(income.getCell(`D${row}`).value || 0);
    marketRent += Number(income.getCell(`F${row}`).value || 0);
  }
  let other = 0;
  for (let row = 22; row < 22 + OTHER_INCOME.length; row += 1) other += Number(income.getCell(`B${row}`).value || 0);

  const gpr = marketRent * 12 + other * 12;
  const egi = gpr * (1 - vacancy);

  let fixed = 0;
  for (let row = 6; row < 6 + EXPENSES.length; row += 1) fixed += Number(exp.getCell(`B${row}`).value || 0);
  const rmPct = lit(exp, E.rmPct);
  const mgmtPct = lit(exp, E.mgmtPct);
  const reserves = lit(exp, E.reservesPerUnit);
  const opex = fixed + egi * (rmPct + mgmtPct) + reserves * unitCount;
  const noi = egi - opex;

  const flows = [-cashIn];
  for (let t = 1; t <= hold; t += 1) {
    const egiT = egi * (1 + rentGrowth) ** (t - 1);
    const opexT = opex * (1 + expGrowth) ** (t - 1);
    const noiT = egiT - opexT;
    const debtT = t <= amort ? annualDebt : 0;
    let flow = noiT - debtT;
    if (t === hold) {
      const balance = t >= amort ? 0 : loan * (1 + r) ** (t * 12) - monthly * (((1 + r) ** (t * 12) - 1) / r);
      flow += (noiT / exitCap) * (1 - sellCosts) - Math.max(0, balance);
    }
    flows.push(flow);
  }

  // Bisection on NPV — IRR without pulling in a finance library.
  const npv = (x) => flows.reduce((s, f, i) => s + f / (1 + x) ** i, 0);
  let lo = -0.9;
  let hi = 1.5;
  let irr = null;
  if (npv(lo) * npv(hi) < 0) {
    for (let i = 0; i < 200; i += 1) {
      const mid = (lo + hi) / 2;
      if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid;
    }
    irr = (lo + hi) / 2;
  }

  const cf1 = noi - annualDebt;
  const dscr = noi / annualDebt;
  const breakEven = (opex + annualDebt) / gpr;
  const totalCash = flows.slice(1).reduce((s, f) => s + f, 0);

  const concerns = [];
  if (unitCount === 0) concerns.push('no units read back out of the rent roll');
  if (dscr < 1.15) concerns.push(`the seeded deal has a DSCR of ${dscr.toFixed(2)} — a lender would call that thin or worse, which is a discouraging example to ship`);
  if (dscr > 2) concerns.push(`a DSCR of ${dscr.toFixed(2)} is implausibly comfortable for a seeded example`);
  if (cf1 < 0) concerns.push('the seeded deal loses money in year one');
  if (irr === null) concerns.push('the cash flows have no sign change, so IRR cannot be computed — the Results sheet will be blank');
  else if (irr < 0.03 || irr > 0.35) concerns.push(`an IRR of ${(irr * 100).toFixed(1)}% is outside the believable range for a seeded example`);
  if (opex / egi < 0.3) concerns.push(`an expense ratio of ${((opex / egi) * 100).toFixed(0)}% suggests a missing line item`);

  return {
    figures: [
      ['units / sq ft', `${unitCount} / ${sqft.toLocaleString()}`],
      ['all-in acquisition cost', `${money(acquisition)}  (cash in ${money(cashIn)})`],
      ['loan / monthly payment', `${money(loan)} / ${money(monthly)}`],
      ['gross potential rent', money(gpr)],
      ['effective gross income', money(egi)],
      ['operating expenses', `${money(opex)}  (${((opex / egi) * 100).toFixed(0)}% of income)`],
      ['net operating income', money(noi)],
      ['cap rate on price', `${((noi / price) * 100).toFixed(2)}%`],
      ['DSCR', `${dscr.toFixed(2)}  → ${dscr < 1 ? 'will not cover' : dscr < 1.2 ? 'thin' : 'bankable'}`],
      ['break-even occupancy', `${(breakEven * 100).toFixed(1)}%`],
      ['year-one cash flow', `${money(cf1)}  (${money(cf1 / unitCount / 12)} per unit per month)`],
      ['cash-on-cash', `${((cf1 / cashIn) * 100).toFixed(2)}%`],
      [`total cash over ${hold} years`, money(totalCash)],
      ['equity multiple', `${(totalCash / cashIn).toFixed(2)}x`],
      ['IRR', irr === null ? 'not computable' : `${(irr * 100).toFixed(2)}%`],
    ],
    concerns,
  };
}
