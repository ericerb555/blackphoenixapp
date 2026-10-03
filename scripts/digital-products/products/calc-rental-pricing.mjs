/**
 * Rental Pricing Optimizer — marketplace product `calc-rental-pricing`, $24.
 *
 * WHAT A BUYER IS PAYING FOR
 *
 * Not a guess at market rent — a method. Comparable rents are stripped back to
 * a common base using the same adjustment logic an appraiser uses, averaged,
 * and then rebuilt onto each of the landlord's own units. So the answer comes
 * with its reasoning attached, which matters when a tenant asks why.
 *
 * THE METHOD
 *
 * For every comparable, strip its features out at the adjustment rates to get
 * the rent a featureless unit in that market would command:
 *
 *   base = rent - beds x perBed - baths x perBath - sq ft x perSqFt
 *               - parking - in-unit laundry - heat included
 *               - (condition - 3) x perConditionPoint
 *
 * Average those bases, then rebuild for each subject unit with its own
 * features. The spread between the highest and lowest comp base is reported
 * too: a tight spread means the adjustments are explaining the market, a wide
 * one means they are not and the answer should be trusted less.
 *
 * THE PART NOBODY ELSE MODELS
 *
 * Raising rent is not free. A $75 increase earns $900 a year and is worthless
 * if it costs six weeks of vacancy and a turnover. The Results sheet prices
 * that trade directly: how many days empty the increase can absorb before the
 * landlord is worse off, against the turnover cost they actually incur.
 *
 * And one piece of New Hampshire practicality: leases that end between
 * November and February re-let into the worst market of the year. The renewal
 * calendar counts them and says so.
 */
import ExcelJS from 'exceljs';
import {
  INK, INK_SOFT, AMBER_PALE, GOOD, WARN, BAD,
  MONEY, MONEY_CENTS, PERCENT, NUMBER,
  applyWorkbookMeta, newWorkbook, sheetHeader, sectionTitle, tableHead,
  inputCell, calcCell, labelCell, noteCell, zebra, printSetup, guideSheet, field,
} from '../lib/workbook.mjs';

export const meta = {
  id: 'calc-rental-pricing',
  title: 'Rental Pricing Optimizer',
  subtitle: 'Set the right rent for every unit',
  price: 2400,
  files: ['xlsx'],
};

const COMP_ROWS = 12;
const FIRST_COMP = 6;
const LAST_COMP = FIRST_COMP + COMP_ROWS - 1;
const UNIT_ROWS = 16;
const FIRST_UNIT = 6;
const LAST_UNIT = FIRST_UNIT + UNIT_ROWS - 1;

/**
 * Comparables: [address, beds, baths, sqft, parking, laundry, heat, condition, rent].
 *
 * These are internally consistent on purpose. A first pass used rents picked
 * freehand, and they stripped back to a $198 spread — which this workbook's own
 * Guide calls "poor, revisit the adjustment rates". Shipping an example that
 * fails its own advice would teach a buyer to distrust the method on the first
 * screen they looked at. These strip to roughly $65, which is the "good" band,
 * while still varying enough to look like real market data rather than
 * arithmetic.
 */
const COMPS = [
  ['12 Elm St #2, Manchester', 2, 1, 860, 1, 0, 0, 3, 1725],
  ['45 Pine Ave #1, Manchester', 2, 1, 910, 1, 1, 0, 4, 1950],
  ['8 Hanover St #3, Manchester', 1, 1, 650, 0, 0, 1, 3, 1475],
  ['211 Union St, Manchester', 3, 1.5, 1180, 1, 1, 0, 4, 2375],
  ['77 Beech St #4, Manchester', 2, 1, 840, 0, 0, 1, 2, 1725],
  ['19 Maple Ct #1, Bedford', 2, 2, 1020, 1, 1, 0, 5, 2250],
  ['330 Second St #2, Manchester', 1, 1, 700, 1, 0, 0, 3, 1425],
  ['6 Orchard Ln, Goffstown', 3, 2, 1340, 1, 1, 0, 4, 2550],
];

/** Subject units: [unit, beds, baths, sqft, parking, laundry, heat, condition, rent, leaseEndsMonth]. */
const UNITS = [
  ['Unit 1', 2, 1, 880, 1, 0, 0, 3, 1650, 6],
  ['Unit 2', 2, 1, 880, 1, 1, 0, 4, 1650, 12],
  ['Unit 3', 1, 1, 710, 1, 0, 0, 3, 1425, 1],
  ['Unit 4', 3, 1.5, 1050, 1, 0, 0, 4, 1875, 8],
];

const A = {
  perBed: 'B6', perBath: 'B7', perSqFt: 'B8', parking: 'B9',
  laundry: 'B10', heat: 'B11', perCondition: 'B12',
  base: 'B16', lowBase: 'B17', highBase: 'B18', spread: 'B19', count: 'B20',
};
const abs = (ref) => ref.replace(/([A-Z]+)(\d+)/, '$$$1$$$2');
const COMPARE = (ref) => `Comparables!${abs(ref)}`;

const U = { currentTotal: 'J23', indicatedTotal: 'K23', gapTotal: 'L23' };

function buildGuide(wb) {
  return guideSheet(wb, {
    title: 'Rental Pricing Optimizer',
    blurb: 'Work out what each unit should rent for, and whether pushing for it is worth the vacancy risk.',
    blocks: [
      ['The rule for the whole workbook', [
        'Shaded cells are yours. Unshaded cells are calculated.',
        'Fill in Comparables first, then Units. Results reads both.',
      ]],
      ['How the market rent is worked out', [
        'Every comparable is stripped back to a common base: its rent, less the value of its bedrooms, bathrooms, floor area, parking, in-unit laundry, included heat and condition.',
        'Those bases are averaged to give one market base rent, which is then rebuilt onto each of your units using its own features.',
        'This is how an appraiser reasons, and the point of it is that the answer arrives with its reasoning attached. "The market says $1,850" loses an argument; "two bedrooms, parking, no laundry, average condition, from eight comparables" wins one.',
      ]],
      ['Set the adjustment rates honestly', [
        'The defaults are reasonable for southern New Hampshire. They are not facts.',
        'The test of a good set of rates is the spread on Results: strip eight comparables back and if their bases land within fifty dollars of each other, the rates are explaining the market. If the spread is two hundred dollars, they are not — and the indicated rents should be treated as a range rather than a number.',
      ]],
      ['Comparables worth using', [
        'Same town, or the same school district at minimum. Rent is local in a way that price is not.',
        'Actually rented in the last six months. Asking rents on current listings are what landlords hope for, not what tenants paid.',
        'Include the bad ones. A comparable in poor condition at a low rent tells the model what condition is worth, which is exactly the adjustment people guess at.',
      ]],
      ['Whether to push for it', [
        'An increase is not free. The Results sheet prices the trade: how many days a unit can sit empty before the increase has cost more than it earned, set against the turnover cost you actually incur.',
        'If the increase only breaks even after six weeks of vacancy, you are making a bet, not a decision.',
        'Sitting tenants who pay on time have a value that does not appear in any comparable. The model will not tell you to keep them; this paragraph does.',
      ]],
      ['The New Hampshire renewal calendar', [
        'A lease that ends in December or January re-lets into the worst market of the year — fewer movers, worse weather, longer vacancy, weaker rents.',
        'The renewal calendar on Results counts how many of your leases end between November and February. Shifting one of them by a couple of months, by offering a fourteen-month renewal, is usually worth more than the increase you were arguing about.',
      ]],
    ],
  });
}

function buildComparables(wb) {
  const ws = wb.addWorksheet('Comparables', { properties: { tabColor: { argb: INK_SOFT } } });
  sheetHeader(ws, {
    title: 'Comparables — and what each feature is worth',
    blurb: 'Rents that were actually achieved in the last six months. Asking rents are a wish, not a comparable.',
    lastColumn: 'J',
  });

  sectionTitle(ws, 5, 'Adjustment rates — what each feature adds per month', 'D');
  [40, 16, 2, 60].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  field(ws, 6, 'Per bedroom', { value: 225, input: true, numFmt: MONEY });
  field(ws, 7, 'Per bathroom', { value: 150, input: true, numFmt: MONEY });
  field(ws, 8, 'Per square foot', { value: 0.45, input: true, numFmt: MONEY_CENTS });
  field(ws, 9, 'Off-street parking', { value: 85, input: true, numFmt: MONEY });
  field(ws, 10, 'Laundry in the unit', { value: 110, input: true, numFmt: MONEY });
  field(ws, 11, 'Heat included in rent', { value: 190, input: true, numFmt: MONEY, note: 'In New Hampshire this is the largest single adjustment there is, and the one most often left out.' });
  field(ws, 12, 'Per point of condition (1–5)', { value: 95, input: true, numFmt: MONEY, note: 'Condition 3 is the baseline: clean, dated, nothing broken. 5 is renovated; 1 needs work before anyone will sign.' });

  sectionTitle(ws, 15, 'What the comparables say', 'D');
  field(ws, 16, 'Market base rent', { formula: `IFERROR(AVERAGE(J${FIRST_COMP}:J${LAST_COMP}),"")`, numFmt: MONEY, bold: true, note: 'A featureless unit in this market. Every indicated rent is built up from here.' });
  field(ws, 17, 'Lowest comparable base', { formula: `IFERROR(MIN(J${FIRST_COMP}:J${LAST_COMP}),"")`, numFmt: MONEY });
  field(ws, 18, 'Highest comparable base', { formula: `IFERROR(MAX(J${FIRST_COMP}:J${LAST_COMP}),"")`, numFmt: MONEY });
  field(ws, 19, 'Spread', {
    formula: `IFERROR(${abs(A.highBase)}-${abs(A.lowBase)},"")`, numFmt: MONEY, bold: true,
    note: 'Under $75 and your adjustment rates are explaining this market. Over $150 and they are not — treat the indicated rents as a range.',
  });
  field(ws, 20, 'Comparables used', { formula: `COUNT(J${FIRST_COMP}:J${LAST_COMP})`, numFmt: NUMBER, note: 'Fewer than five and one unusual property is steering the answer.' });
  ws.addConditionalFormatting({
    ref: abs(A.spread).replace(/\$/g, ''),
    rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: ['150'], priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'cellIs', operator: 'lessThan', formulae: ['75'], priority: 2, style: { font: { color: { argb: GOOD }, bold: true } } },
    ],
  });

  const head = 23;
  tableHead(ws, head, ['Comparable', 'Beds', 'Baths', 'Sq ft', 'Parking', 'Laundry', 'Heat inc.', 'Condition', 'Rent achieved', 'Stripped base'],
    [36, 8, 8, 9, 10, 10, 10, 11, 14, 14]);
  // The table sits below the rates, so the data rows start after the header.
  for (let i = 0; i < COMP_ROWS; i += 1) {
    const r = head + 1 + i;
    const seed = COMPS[i];
    const row = ws.getRow(r);
    for (const c of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      inputCell(row.getCell(c), { numFmt: c === 9 ? MONEY : (c === 4 ? NUMBER : undefined) });
      if (c >= 5 && c <= 7) {
        row.getCell(c).dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,0"'] };
      }
    }
    if (seed) seed.forEach((v, j) => { row.getCell(j + 1).value = v; });
    calcCell(row.getCell(10), { numFmt: MONEY }).value = {
      formula: `IF($I${r}="","",$I${r}-$B${r}*${abs(A.perBed)}-$C${r}*${abs(A.perBath)}-$D${r}*${abs(A.perSqFt)}`
        + `-$E${r}*${abs(A.parking)}-$F${r}*${abs(A.laundry)}-$G${r}*${abs(A.heat)}-($H${r}-3)*${abs(A.perCondition)})`,
    };
  }
  zebra(ws, head + 1, head + COMP_ROWS, 10);
  noteCell(ws, `A${head + COMP_ROWS + 2}:J${head + COMP_ROWS + 3}`,
    'Parking, laundry and heat are 1 for yes and 0 for no. The stripped base is what that unit would rent for with no bedrooms, no floor area and nothing included — a nonsense unit on purpose, which is what makes the comparison fair.');

  printSetup(ws, { landscape: true, title: 'Rental Pricing Optimizer — Comparables' });
  return ws;
}

function buildUnits(wb) {
  const ws = wb.addWorksheet('Units', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(ws, {
    title: 'Your units — what they get, and what they should',
    blurb: 'Describe each unit the same way you described the comparables. The indicated rent is built from the market base.',
    lastColumn: 'N',
  });

  tableHead(ws, 5, [
    'Unit', 'Beds', 'Baths', 'Sq ft', 'Parking', 'Laundry', 'Heat inc.', 'Condition',
    'Rent now', 'Indicated rent', 'Gap', 'Gap %', 'Lease ends (month)', 'Annual upside',
  ], [14, 7, 7, 9, 9, 9, 9, 10, 12, 14, 12, 9, 16, 14]);

  for (let i = 0; i < UNIT_ROWS; i += 1) {
    const r = FIRST_UNIT + i;
    const seed = UNITS[i];
    const row = ws.getRow(r);
    for (const c of [1, 2, 3, 4, 5, 6, 7, 8, 9, 13]) {
      inputCell(row.getCell(c), { numFmt: c === 9 ? MONEY : (c === 4 || c === 13 ? NUMBER : undefined) });
      if (c >= 5 && c <= 7) {
        row.getCell(c).dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,0"'] };
      }
    }
    if (seed) {
      [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((j) => { row.getCell(j + 1).value = seed[j]; });
      row.getCell(13).value = seed[9];
    }
    // Market base rebuilt with this unit's own features.
    calcCell(row.getCell(10), { numFmt: MONEY, bold: true }).value = {
      formula: `IF($A${r}="","",ROUND(${COMPARE(A.base)}+$B${r}*${COMPARE(A.perBed)}+$C${r}*${COMPARE(A.perBath)}`
        + `+$D${r}*${COMPARE(A.perSqFt)}+$E${r}*${COMPARE(A.parking)}+$F${r}*${COMPARE(A.laundry)}`
        + `+$G${r}*${COMPARE(A.heat)}+($H${r}-3)*${COMPARE(A.perCondition)},-1))`,
    };
    calcCell(row.getCell(11), { numFmt: MONEY }).value = { formula: `IF($A${r}="","",$J${r}-$I${r})` };
    calcCell(row.getCell(12), { numFmt: '0.0%' }).value = { formula: `IF(OR($A${r}="",$I${r}=0),"",$K${r}/$I${r})` };
    calcCell(row.getCell(14), { numFmt: MONEY }).value = { formula: `IF($A${r}="","",$K${r}*12)` };
  }

  const totals = LAST_UNIT + 1;
  labelCell(ws.getRow(totals).getCell(1), 'Totals', { bold: true });
  for (const c of [9, 10, 11, 14]) {
    calcCell(ws.getRow(totals).getCell(c), { numFmt: MONEY, bold: true }).value = {
      formula: `SUM(${String.fromCharCode(64 + c)}${FIRST_UNIT}:${String.fromCharCode(64 + c)}${LAST_UNIT})`,
    };
  }
  ws.getRow(totals).eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: INK } } }; });
  zebra(ws, FIRST_UNIT, LAST_UNIT, 14);

  ws.addConditionalFormatting({
    ref: `K${FIRST_UNIT}:K${LAST_UNIT}`,
    rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: ['50'], priority: 1, style: { font: { color: { argb: GOOD }, bold: true } } },
      { type: 'cellIs', operator: 'lessThan', formulae: ['-50'], priority: 2, style: { font: { color: { argb: BAD }, bold: true } } },
    ],
  });

  noteCell(ws, `A${totals + 2}:N${totals + 3}`,
    'Lease ends is the month number, 1 to 12. A gap shown in green is rent you are not collecting; a gap in red means the unit is already above what the comparables support, which is worth knowing before a renewal conversation.');

  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 5 }];
  printSetup(ws, { landscape: true, title: 'Rental Pricing Optimizer — Units' });
  return { totals };
}

function buildResults(wb, units) {
  const ws = wb.addWorksheet('Results', { properties: { tabColor: { argb: AMBER_PALE } } });
  [42, 18, 2, 58].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  sheetHeader(ws, {
    title: 'Results',
    blurb: 'What the units should earn, and whether chasing it is worth the risk of an empty unit.',
    lastColumn: 'D',
  });

  const T = (c) => `Units!$${c}$${units.totals}`;

  sectionTitle(ws, 5, 'The portfolio', 'D');
  field(ws, 6, 'Units priced', { formula: `COUNTA(Units!$A$${FIRST_UNIT}:$A$${LAST_UNIT})`, numFmt: NUMBER });
  field(ws, 7, 'Collected now, per month', { formula: T('I'), numFmt: MONEY });
  field(ws, 8, 'Indicated, per month', { formula: T('J'), numFmt: MONEY, bold: true });
  field(ws, 9, 'Gap, per month', { formula: T('K'), numFmt: MONEY, bold: true });
  field(ws, 10, 'Gap, per year', { formula: T('N'), numFmt: MONEY, bold: true, note: 'What the units would earn at the rents the comparables support, if every tenant accepted and nobody left.' });
  field(ws, 11, 'Confidence in the market base', {
    formula: `IF(${COMPARE(A.spread)}="","",IF(${COMPARE(A.spread)}<75,"Good — the adjustments explain this market",`
      + `IF(${COMPARE(A.spread)}<150,"Fair — treat the rents as a range","Poor — revisit the adjustment rates")))`,
    bold: true,
  });
  ws.addConditionalFormatting({
    ref: 'B11',
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'Good', priority: 1, style: { font: { color: { argb: GOOD }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Fair', priority: 2, style: { font: { color: { argb: WARN }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Poor', priority: 3, style: { font: { color: { argb: BAD }, bold: true } } },
    ],
  });

  sectionTitle(ws, 13, 'Is the increase worth the risk', 'D');
  field(ws, 14, 'Turnover cost on a re-let', { value: 1200, input: true, numFmt: MONEY, note: 'Cleaning, paint, repairs, listing, your own time showing it. $800 to $2,000 is usual on a small unit.' });
  field(ws, 15, 'Increase you are considering', { value: 200, input: true, numFmt: MONEY, note: 'Per month, on one unit. Try the per-unit gaps from the Units sheet — and try a small one, to see how quickly a modest increase stops being worth a turnover.' });
  field(ws, 16, 'Typical rent for that unit', { formula: `IFERROR(AVERAGE(Units!$J$${FIRST_UNIT}:$J$${LAST_UNIT}),"")`, numFmt: MONEY });
  field(ws, 17, 'The increase earns, per year', { formula: `B15*12`, numFmt: MONEY, bold: true });
  field(ws, 18, 'A day empty costs', { formula: `IF(B16="","",B16/30.4)`, numFmt: MONEY_CENTS });
  field(ws, 19, 'Days empty the increase can absorb', {
    formula: `IF(OR(B16="",B18=0),"",(B17-B14)/B18)`, numFmt: '0', bold: true,
    note: 'After the turnover cost is paid. Negative means the turnover alone costs more than a year of the increase.',
  });
  field(ws, 20, 'The verdict', {
    formula: `IF(B19="","",IF(B19<0,"Not worth it — turnover alone exceeds the gain",`
      + `IF(B19<14,"Marginal — only if you are confident they stay",`
      + `IF(B19<45,"Reasonable — the increase survives a normal re-let","Push for it — the gain is large relative to the risk"))))`,
    bold: true,
  });
  ws.addConditionalFormatting({
    ref: 'B20',
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'Not worth it', priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Marginal', priority: 2, style: { font: { color: { argb: WARN }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Reasonable', priority: 3, style: { font: { color: { argb: GOOD }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Push for it', priority: 4, style: { font: { color: { argb: GOOD }, bold: true } } },
    ],
  });

  sectionTitle(ws, 22, 'Who can afford it', 'D');
  field(ws, 23, 'Rent-to-income limit you apply', { value: 0.33, input: true, numFmt: PERCENT, note: 'A third of gross income is the conventional screen.' });
  field(ws, 24, 'Income a tenant needs', { formula: `IF(OR(B16="",B23=0),"",B16*12/B23)`, numFmt: MONEY, bold: true, note: 'At the indicated rent. If this is far above local household income, the rent is theoretical.' });

  sectionTitle(ws, 26, 'The renewal calendar', 'D');
  field(ws, 27, 'Leases ending November to February', {
    formula: `COUNTIF(Units!$M$${FIRST_UNIT}:$M$${LAST_UNIT},11)+COUNTIF(Units!$M$${FIRST_UNIT}:$M$${LAST_UNIT},12)`
      + `+COUNTIF(Units!$M$${FIRST_UNIT}:$M$${LAST_UNIT},1)+COUNTIF(Units!$M$${FIRST_UNIT}:$M$${LAST_UNIT},2)`,
    numFmt: NUMBER, bold: true,
  });
  field(ws, 28, 'What to do about it', {
    formula: `IF(B27=0,"Nothing — none of your leases end in the winter",`
      + `"Offer a 14-month renewal on "&B27&" of them to move the expiry into spring")`,
    bold: true,
  });
  noteCell(ws, 'D27:D28', 'A unit that comes empty in January re-lets slowly and at a discount. Moving the expiry is usually worth more than the increase being argued over.');

  printSetup(ws, { title: 'Rental Pricing Optimizer — Results' });
  return ws;
}

export async function build() {
  const wb = new ExcelJS.Workbook();
  applyWorkbookMeta(wb, newWorkbook({
    title: meta.title,
    subject: 'Comparable-adjusted market rent by unit, with vacancy trade-off',
    keywords: 'rent, market rent, comparables, landlord, New Hampshire',
  }));

  buildGuide(wb);
  buildComparables(wb);
  const units = buildUnits(wb);
  buildResults(wb, units);
  wb.views = [{ activeTab: 3, firstSheet: 0, visibility: 'visible' }];

  return [{
    name: 'Rental Pricing Optimizer.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
  }];
}

/** Independent recomputation of the pricing model, for `verify.mjs`. */
export async function selfCheck(wb) {
  const comp = wb.getWorksheet('Comparables');
  const units = wb.getWorksheet('Units');
  const res = wb.getWorksheet('Results');
  const money = (n) => (n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`);
  const lit = (ws, ref) => {
    const v = ws.getCell(ref).value;
    return v && typeof v === 'object' && 'formula' in v ? null : v;
  };

  const rates = {
    bed: lit(comp, A.perBed), bath: lit(comp, A.perBath), sqft: lit(comp, A.perSqFt),
    parking: lit(comp, A.parking), laundry: lit(comp, A.laundry), heat: lit(comp, A.heat),
    cond: lit(comp, A.perCondition),
  };

  const strip = (ws, r, rentCol) => {
    const rent = Number(ws.getCell(`${rentCol}${r}`).value || 0);
    const beds = Number(ws.getCell(`B${r}`).value || 0);
    const baths = Number(ws.getCell(`C${r}`).value || 0);
    const sqft = Number(ws.getCell(`D${r}`).value || 0);
    const park = Number(ws.getCell(`E${r}`).value || 0);
    const laun = Number(ws.getCell(`F${r}`).value || 0);
    const heat = Number(ws.getCell(`G${r}`).value || 0);
    const cond = Number(ws.getCell(`H${r}`).value || 0);
    return rent - beds * rates.bed - baths * rates.bath - sqft * rates.sqft
      - park * rates.parking - laun * rates.laundry - heat * rates.heat - (cond - 3) * rates.cond;
  };

  const COMP_HEAD = 23;
  const bases = [];
  for (let r = COMP_HEAD + 1; r <= COMP_HEAD + COMP_ROWS; r += 1) {
    if (!comp.getCell(`A${r}`).value) continue;
    bases.push(strip(comp, r, 'I'));
  }
  const base = bases.reduce((s, b) => s + b, 0) / (bases.length || 1);
  const spread = Math.max(...bases) - Math.min(...bases);

  let currentTotal = 0;
  let indicatedTotal = 0;
  let unitCount = 0;
  let winterLeases = 0;
  const perUnit = [];
  for (let r = FIRST_UNIT; r <= LAST_UNIT; r += 1) {
    const name = units.getCell(`A${r}`).value;
    if (!name) continue;
    unitCount += 1;
    const beds = Number(units.getCell(`B${r}`).value || 0);
    const baths = Number(units.getCell(`C${r}`).value || 0);
    const sqft = Number(units.getCell(`D${r}`).value || 0);
    const park = Number(units.getCell(`E${r}`).value || 0);
    const laun = Number(units.getCell(`F${r}`).value || 0);
    const heat = Number(units.getCell(`G${r}`).value || 0);
    const cond = Number(units.getCell(`H${r}`).value || 0);
    const now = Number(units.getCell(`I${r}`).value || 0);
    const month = Number(units.getCell(`M${r}`).value || 0);
    const indicated = Math.round((base + beds * rates.bed + baths * rates.bath + sqft * rates.sqft
      + park * rates.parking + laun * rates.laundry + heat * rates.heat + (cond - 3) * rates.cond) / 10) * 10;
    currentTotal += now;
    indicatedTotal += indicated;
    if ([11, 12, 1, 2].includes(month)) winterLeases += 1;
    perUnit.push(`${name} ${money(now)} → ${money(indicated)}`);
  }

  const turnover = lit(res, 'B14');
  const increase = lit(res, 'B15');
  const typical = indicatedTotal / (unitCount || 1);
  const daysAbsorbed = (increase * 12 - turnover) / (typical / 30.4);

  const concerns = [];
  if (bases.length < 5) concerns.push(`only ${bases.length} comparables seeded — the Guide tells buyers fewer than five is unreliable`);
  if (spread > 150) concerns.push(`the seeded comparables strip to a $${Math.round(spread)} spread, which the workbook itself calls "poor" — the example contradicts its own advice`);
  if (indicatedTotal <= currentTotal) concerns.push('the seeded units are already at or above market, so the example shows no upside');
  if (unitCount === 0) concerns.push('no units read back');
  if (winterLeases === 0) concerns.push('no seeded lease ends in winter, so the renewal calendar demonstrates nothing');
  if (daysAbsorbed < 0) concerns.push('the seeded increase cannot even cover turnover, so the verdict reads as "not worth it"');

  return {
    figures: [
      ['comparables used', `${bases.length}`],
      ['market base rent', money(base)],
      ['comparable spread', `${money(spread)}  → ${spread < 75 ? 'good' : spread < 150 ? 'fair' : 'poor'}`],
      ['units priced', `${unitCount}`],
      ['collected now / month', money(currentTotal)],
      ['indicated / month', money(indicatedTotal)],
      ['gap per month / per year', `${money(indicatedTotal - currentTotal)} / ${money((indicatedTotal - currentTotal) * 12)}`],
      ['per unit', perUnit.join(', ')],
      ['winter lease expiries', `${winterLeases}`],
      [`a $${increase} increase absorbs`, `${daysAbsorbed.toFixed(0)} days empty after $${turnover} turnover`],
    ],
    concerns,
  };
}
