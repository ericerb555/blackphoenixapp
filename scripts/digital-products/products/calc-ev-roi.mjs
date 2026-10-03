/**
 * EV Charging Revenue Calculator — marketplace product `calc-ev-roi`, $19.
 *
 * WHAT A BUYER IS PAYING FOR
 *
 * Whether putting chargers in the car park pays, and at what point it stops
 * paying. Most charger pro formas fail on one number — utilisation — and most
 * spreadsheets do not report it. This one solves for it: the break-even
 * sessions per port per day, which is the figure to check against what the
 * site actually sees.
 *
 * ABOUT THE REBATE, AND WHY IT STARTS AT ZERO
 *
 * The listing for this product mentions Eversource New Hampshire incentives.
 * Utility make-ready and charger programmes open, close, change their caps and
 * change their eligibility rules, and an amount typed into a spreadsheet by
 * somebody who is not the utility is a liability rather than a feature. So the
 * incentive is an input that starts at zero, with instructions to enter the
 * figure from an approved application.
 *
 * That is deliberate and it is the honest way round: a model that assumes a
 * grant you have not been awarded tells you to build something that does not
 * pay. Put nothing in until the utility has put it in writing, and the answer
 * on screen is the answer if the grant never comes — which is the one worth
 * making a decision on.
 *
 * THE HONEST CONCLUSION, WHICH THE GUIDE STATES PLAINLY
 *
 * Level 2 charging at realistic utilisation pays back over about five years.
 * It is a decent amenity with a return attached, not an income stream. Anyone
 * selling it as the latter is selling something else.
 */
import ExcelJS from 'exceljs';
import {
  INK, INK_SOFT, AMBER_PALE, GOOD, WARN, BAD,
  MONEY, MONEY_CENTS, PERCENT, NUMBER, YEAR,
  applyWorkbookMeta, newWorkbook, sheetHeader, sectionTitle, tableHead,
  inputCell, calcCell, labelCell, noteCell, zebra, printSetup, guideSheet, field,
} from '../lib/workbook.mjs';

export const meta = {
  id: 'calc-ev-roi',
  title: 'EV Charging Revenue Calculator',
  subtitle: 'Model your EV charging ROI with New Hampshire utility incentives',
  price: 1900,
  files: ['xlsx'],
};

const YEARS = 10;

const N = {
  ports: 'B6', kwPerPort: 'B7', hardware: 'B8', install: 'B9', service: 'B10', permits: 'B11', capex: 'B12',
  rebatePerPort: 'B15', rebateCap: 'B16', incentive: 'B17', netCapex: 'B18',
};
const O = {
  days: 'B6', sessionsPerDay: 'B7', kwhPerSession: 'B8', annualKwh: 'B9', annualSessions: 'B10',
  price: 'B13', sessionFee: 'B14', revenue: 'B15',
  energyRate: 'B18', demandCharge: 'B19', billedKw: 'B20',
  network: 'B21', maintenance: 'B22', processing: 'B23',
  cost: 'B24', net: 'B25',
  growth: 'B28', discount: 'B29',
};
const abs = (ref) => ref.replace(/([A-Z]+)(\d+)/, '$$$1$$$2');
const INS = (ref) => `Install!${abs(ref)}`;
const OPS = (ref) => `Operating!${abs(ref)}`;

function buildGuide(wb) {
  return guideSheet(wb, {
    title: 'EV Charging Revenue Calculator',
    blurb: 'Whether chargers pay at your site, and the utilisation they need to. Shaded cells are yours.',
    blocks: [
      ['The rule for the whole workbook', [
        'Shaded cells are inputs. Unshaded cells are calculated.',
        'Fill in Install, then Operating. Results and Projection follow.',
      ]],
      ['Read the break-even utilisation first', [
        'Charger business cases almost never fail on price or on hardware cost. They fail on utilisation — the ports sit idle and the fixed costs run anyway.',
        'Results solves for the sessions per port per day the site needs just to cover its costs. Compare that against what the car park actually sees, not against what you hope it will see once word gets round.',
        'The other half of the same question is hours: a Level 2 port delivering 7.7 kW takes a bit over two hours to put 16 kWh into a car. Three sessions a day is around seven hours of occupancy. Ten sessions a day on one port is not optimism, it is impossible.',
      ]],
      ['About the incentive, and why it starts at zero', [
        'Utility make-ready and charger programmes open, close, change their caps and change their eligibility. An amount typed in by anyone who is not the utility is a guess.',
        'So the incentive starts at zero. Put in the figure from your own approved application, and keep a copy of the approval with it.',
        'Run the decision at zero first. A model that assumes a grant you have not been awarded will tell you to build something that does not pay.',
      ]],
      ['Where the money actually goes', [
        'Your margin is the spread between what you charge the driver per kWh and what the utility charges you, less card processing — which takes about three percent of revenue before anything else does.',
        'The network subscription per port is charged whether anyone plugs in or not. On a quiet site it is the largest single cost.',
        'Demand charges are the trap. They are usually irrelevant for a couple of Level 2 ports and can wreck a DC fast-charging case on their own, because one fifteen-minute peak sets the bill for the whole month. Check your tariff before entering zero.',
      ]],
      ['What this is honestly worth', [
        'Level 2 charging at realistic utilisation pays back over roughly five years, and the hardware lasts about ten. That makes it a decent amenity with a return attached — not an income stream.',
        'The returns that do not appear in this workbook are often the real ones: a unit that lets faster because it comes with charging, a commercial tenant who renews, a condo board that can say yes to an owner who just bought an EV.',
        'If the arithmetic here only works with the incentive, the project is a grant application rather than an investment. That is a perfectly good reason to do it — but know which one you are doing.',
      ]],
    ],
  });
}

function buildInstall(wb) {
  const ws = wb.addWorksheet('Install', { properties: { tabColor: { argb: INK_SOFT } } });
  [40, 18, 2, 60].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  sheetHeader(ws, {
    title: 'Install — what it costs to put in',
    blurb: 'Shaded cells only. Use real quotes where you have them; trenching is the line that surprises people.',
    lastColumn: 'D',
  });

  sectionTitle(ws, 5, 'The installation', 'D');
  field(ws, 6, 'Number of ports', { value: 2, input: true, numFmt: NUMBER });
  field(ws, 7, 'Power per port (kW)', { value: 7.7, input: true, numFmt: '0.0', note: 'A typical Level 2 port is 7.2 to 11.5 kW. DC fast charging starts around 50 kW and changes every assumption in this workbook.' });
  field(ws, 8, 'Hardware per port', { value: 4800, input: true, numFmt: MONEY });
  field(ws, 9, 'Installation per port', { value: 3200, input: true, numFmt: MONEY, note: 'Trenching, conduit, bollards, mounting, making good. Distance from the panel to the parking space drives this more than anything else.' });
  field(ws, 10, 'Electrical service upgrade', { value: 6500, input: true, numFmt: MONEY, note: 'One-off. Zero only if the existing service genuinely has the spare capacity — have that confirmed, not assumed.' });
  field(ws, 11, 'Permits, design and inspection', { value: 1500, input: true, numFmt: MONEY });
  field(ws, 12, 'Total installed cost', {
    formula: `${abs(N.ports)}*(${abs(N.hardware)}+${abs(N.install)})+${abs(N.service)}+${abs(N.permits)}`,
    numFmt: MONEY, bold: true,
  });

  sectionTitle(ws, 14, 'Utility incentive — enter only what has been approved', 'D');
  field(ws, 15, 'Incentive per port', {
    value: 0, input: true, numFmt: MONEY,
    note: 'Starts at zero deliberately. New Hampshire utility make-ready and charger programmes change their amounts, caps and eligibility — put in the figure from your own approved application, not one from an article.',
  });
  field(ws, 16, 'Overall cap on the incentive', { value: 0, input: true, numFmt: MONEY, note: 'Zero here means no cap applies.' });
  field(ws, 17, 'Incentive applied', {
    formula: `IF(${abs(N.rebateCap)}=0,${abs(N.ports)}*${abs(N.rebatePerPort)},MIN(${abs(N.ports)}*${abs(N.rebatePerPort)},${abs(N.rebateCap)}))`,
    numFmt: MONEY,
  });
  field(ws, 18, 'Net cost after incentive', {
    formula: `${abs(N.capex)}-${abs(N.incentive)}`, numFmt: MONEY, bold: true,
    note: 'Run the decision with the incentive at zero first. This is the figure the payback and the return are built on.',
  });

  printSetup(ws, { title: 'EV Charging Revenue Calculator — Install' });
  return ws;
}

function buildOperating(wb) {
  const ws = wb.addWorksheet('Operating', { properties: { tabColor: { argb: AMBER_PALE } } });
  [40, 18, 2, 60].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  sheetHeader(ws, {
    title: 'Operating — use, revenue and running costs',
    blurb: 'Sessions per port per day is the assumption that decides everything. Be pessimistic here.',
    lastColumn: 'D',
  });

  sectionTitle(ws, 5, 'How much it gets used', 'D');
  field(ws, 6, 'Days operating per year', { value: 365, input: true, numFmt: NUMBER });
  field(ws, 7, 'Sessions per port per day', { value: 2.4, input: true, numFmt: '0.0', note: 'Residential sites run 1 to 3. Workplace and retail can reach 4 to 6. Check the hours: see "occupancy" on Results.' });
  field(ws, 8, 'kWh delivered per session', { value: 16, input: true, numFmt: '0.0', note: 'A commuter top-up is 10 to 20 kWh. A full charge is 40 to 80 and almost never happens on a shared port.' });
  field(ws, 9, 'Energy sold per year (kWh)', {
    formula: `${abs(O.days)}*${abs(O.sessionsPerDay)}*${abs(O.kwhPerSession)}*${INS(N.ports)}`, numFmt: NUMBER, bold: true,
  });
  field(ws, 10, 'Sessions per year', { formula: `${abs(O.days)}*${abs(O.sessionsPerDay)}*${INS(N.ports)}`, numFmt: NUMBER });

  sectionTitle(ws, 12, 'What it earns', 'D');
  field(ws, 13, 'Price to the driver, per kWh', { value: 0.42, input: true, numFmt: MONEY_CENTS, note: 'Has to clear your own energy cost with enough left to cover the network fee. Compare against what nearby public chargers ask.' });
  field(ws, 14, 'Session or idle fee', { value: 0, input: true, numFmt: MONEY_CENTS, note: 'An idle fee after charging completes is how a busy site stops one car blocking a port all afternoon.' });
  field(ws, 15, 'Gross revenue per year', {
    formula: `${abs(O.annualKwh)}*${abs(O.price)}+${abs(O.annualSessions)}*${abs(O.sessionFee)}`, numFmt: MONEY, bold: true,
  });

  sectionTitle(ws, 17, 'What it costs to run', 'D');
  field(ws, 18, 'Your energy cost, per kWh', { value: 0.21, input: true, numFmt: MONEY_CENTS, note: 'The all-in delivered rate from the bill, not the supply rate alone.' });
  field(ws, 19, 'Demand charge, per kW per month', { value: 0, input: true, numFmt: MONEY_CENTS, note: 'Usually nil for a couple of Level 2 ports. For DC fast charging this line can exceed the energy cost — one brief peak sets the whole month.' });
  field(ws, 20, 'Billed demand (kW)', { formula: `${INS(N.ports)}*${INS(N.kwPerPort)}`, numFmt: '0.0', note: 'Assumes every port at full power at once, which is the worst case and the one the utility meters.' });
  field(ws, 21, 'Network subscription per port per year', { value: 240, input: true, numFmt: MONEY, note: 'Payable whether anyone plugs in or not. On a quiet site this is the biggest cost there is.' });
  field(ws, 22, 'Maintenance per port per year', { value: 150, input: true, numFmt: MONEY });
  field(ws, 23, 'Card processing, share of revenue', { value: 0.03, input: true, numFmt: PERCENT });
  field(ws, 24, 'Total running cost per year', {
    formula: `${abs(O.annualKwh)}*${abs(O.energyRate)}+${abs(O.billedKw)}*${abs(O.demandCharge)}*12`
      + `+${INS(N.ports)}*(${abs(O.network)}+${abs(O.maintenance)})+${abs(O.revenue)}*${abs(O.processing)}`,
    numFmt: MONEY, bold: true,
  });
  field(ws, 25, 'Net per year', { formula: `${abs(O.revenue)}-${abs(O.cost)}`, numFmt: MONEY, bold: true });

  sectionTitle(ws, 27, 'Over ten years', 'D');
  field(ws, 28, 'Annual growth in sessions', { value: 0.08, input: true, numFmt: PERCENT, note: 'EV adoption is rising, but a port has a ceiling — growth stops when it is full. Results reports occupancy so you can see where that is.' });
  field(ws, 29, 'Discount rate', { value: 0.08, input: true, numFmt: PERCENT, note: 'What the money would earn elsewhere. Used for the net present value.' });

  printSetup(ws, { title: 'EV Charging Revenue Calculator — Operating' });
  return ws;
}

function buildProjection(wb) {
  const ws = wb.addWorksheet('Projection', { properties: { tabColor: { argb: AMBER_PALE } } });
  sheetHeader(ws, {
    title: 'Ten years',
    blurb: 'Energy sold grows with use; the fixed costs do not move. Occupancy is the reality check on the growth assumption.',
    lastColumn: 'H',
  });

  tableHead(ws, 5, ['Year', 'Sessions', 'kWh sold', 'Revenue', 'Running cost', 'Net', 'Cumulative net', 'Port occupancy'],
    [8, 12, 14, 14, 15, 14, 16, 15]);

  const zero = 6;
  calcCell(ws.getCell(`A${zero}`), { numFmt: YEAR }).value = 0;
  calcCell(ws.getCell(`F${zero}`), { numFmt: MONEY, bold: true }).value = { formula: `-${INS(N.netCapex)}` };
  calcCell(ws.getCell(`G${zero}`), { numFmt: MONEY }).value = { formula: `F${zero}` };
  noteCell(ws, `B${zero}:E${zero}`, 'Installation, net of any approved incentive.');

  const first = zero + 1;
  for (let t = 1; t <= YEARS; t += 1) {
    const r = first + t - 1;
    const row = ws.getRow(r);
    const g = `(1+${OPS(O.growth)})^${t - 1}`;

    calcCell(row.getCell(1), { numFmt: YEAR }).value = t;
    calcCell(row.getCell(2), { numFmt: NUMBER }).value = { formula: `${OPS(O.annualSessions)}*${g}` };
    calcCell(row.getCell(3), { numFmt: NUMBER }).value = { formula: `${OPS(O.annualKwh)}*${g}` };
    calcCell(row.getCell(4), { numFmt: MONEY }).value = {
      formula: `C${r}*${OPS(O.price)}+B${r}*${OPS(O.sessionFee)}`,
    };
    // Energy and processing scale with use; network, maintenance and demand do not.
    calcCell(row.getCell(5), { numFmt: MONEY }).value = {
      formula: `C${r}*${OPS(O.energyRate)}+${OPS(O.billedKw)}*${OPS(O.demandCharge)}*12`
        + `+${INS(N.ports)}*(${OPS(O.network)}+${OPS(O.maintenance)})+D${r}*${OPS(O.processing)}`,
    };
    calcCell(row.getCell(6), { numFmt: MONEY, bold: true }).value = { formula: `D${r}-E${r}` };
    calcCell(row.getCell(7), { numFmt: MONEY }).value = { formula: `G${r - 1}+F${r}` };
    /**
     * Occupancy: the share of the day a port spends delivering energy.
     *
     * This is the sanity check on the growth rate. A port cannot be busier than
     * all day, so a projection that drifts past 100% is projecting something
     * that cannot happen — which is the most common fault in a charger pro
     * forma and the reason this column is here rather than in a footnote.
     */
    calcCell(row.getCell(8), { numFmt: PERCENT }).value = {
      formula: `IF(OR(${INS(N.kwPerPort)}=0,${INS(N.ports)}=0),"",`
        + `C${r}/${INS(N.kwPerPort)}/(${INS(N.ports)}*24*${OPS(O.days)}))`,
    };
  }

  const last = first + YEARS - 1;
  zebra(ws, first, last, 8);
  ws.addConditionalFormatting({
    ref: `H${first}:H${last}`,
    rules: [
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0.6'], priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'cellIs', operator: 'greaterThan', formulae: ['0.35'], priority: 2, style: { font: { color: { argb: WARN } } } },
    ],
  });
  ws.addConditionalFormatting({
    ref: `G${zero}:G${last}`,
    rules: [{ type: 'cellIs', operator: 'lessThan', formulae: ['0'], priority: 1, style: { font: { color: { argb: BAD } } } }],
  });

  ws.views = [{ state: 'frozen', ySplit: 5 }];
  printSetup(ws, { landscape: true, title: 'EV Charging Revenue Calculator — Projection' });
  return { zero, first, last };
}

function buildResults(wb, proj) {
  const ws = wb.addWorksheet('Results', { properties: { tabColor: { argb: AMBER_PALE } } });
  [42, 18, 2, 58].forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  sheetHeader(ws, {
    title: 'Results',
    blurb: 'Nothing here is typed. The break-even utilisation is the number to check against the site.',
    lastColumn: 'D',
  });

  const net = OPS(O.net);
  const capex = INS(N.netCapex);

  sectionTitle(ws, 5, 'Year one', 'D');
  field(ws, 6, 'Energy sold', { formula: `${OPS(O.annualKwh)}&" kWh"` });
  field(ws, 7, 'Revenue', { formula: OPS(O.revenue), numFmt: MONEY });
  field(ws, 8, 'Running cost', { formula: OPS(O.cost), numFmt: MONEY });
  field(ws, 9, 'Net', { formula: net, numFmt: MONEY, bold: true });
  field(ws, 10, 'Margin per kWh sold', {
    formula: `IF(${OPS(O.annualKwh)}=0,"",${net}/${OPS(O.annualKwh)})`, numFmt: '$0.000',
    note: 'After every cost, including the fees that run whether anyone plugs in or not.',
  });
  field(ws, 11, 'Spread on energy alone', { formula: `${OPS(O.price)}-${OPS(O.energyRate)}`, numFmt: '$0.000', note: 'The gross spread before processing, network and maintenance. The gap between this and the line above is what people forget.' });

  sectionTitle(ws, 13, 'Does it pay for itself', 'D');
  field(ws, 14, 'Net installed cost', { formula: capex, numFmt: MONEY });
  const payback = field(ws, 15, 'Simple payback', {
    formula: `IF(${net}<=0,"Never at this utilisation",${capex}/${net})`, numFmt: '0.0" years"', bold: true,
  });
  payback.font = { name: 'Calibri', size: 16, bold: true, color: { argb: INK } };
  field(ws, 16, 'Net present value over ten years', {
    formula: `NPV(${OPS(O.discount)},Projection!$F$${proj.first}:$F$${proj.last})-${capex}`, numFmt: MONEY, bold: true,
    note: 'Positive means it beats leaving the money where it is, at your discount rate.',
  });
  field(ws, 17, 'Return on the investment', {
    formula: `IFERROR(IRR(Projection!$F$${proj.zero}:$F$${proj.last}),"")`, numFmt: PERCENT, bold: true,
  });
  field(ws, 18, 'Cumulative net at year ten', { formula: `Projection!$G$${proj.last}`, numFmt: MONEY });
  field(ws, 19, 'The verdict', {
    formula: `IF(${net}<=0,"Loses money at this utilisation",`
      + `IF(B15>10,"Does not pay back within the hardware's life",`
      + `IF(B15>6,"Marginal — justify it as an amenity",`
      + `IF(B15>3,"Reasonable — an amenity that pays for itself","Strong — check the utilisation assumption again"))))`,
    bold: true,
  });
  ws.addConditionalFormatting({
    ref: 'B19',
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'Loses', priority: 1, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'does not pay', priority: 2, style: { font: { color: { argb: BAD }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Marginal', priority: 3, style: { font: { color: { argb: WARN }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Reasonable', priority: 4, style: { font: { color: { argb: GOOD }, bold: true } } },
      { type: 'containsText', operator: 'containsText', text: 'Strong', priority: 5, style: { font: { color: { argb: GOOD }, bold: true } } },
    ],
  });

  sectionTitle(ws, 21, 'The utilisation it needs', 'D');
  // Contribution per session, and the fixed costs that must be covered.
  field(ws, 22, 'Contribution per session', {
    formula: `${OPS(O.kwhPerSession)}*(${OPS(O.price)}-${OPS(O.energyRate)})`
      + `+${OPS(O.sessionFee)}-(${OPS(O.kwhPerSession)}*${OPS(O.price)}+${OPS(O.sessionFee)})*${OPS(O.processing)}`,
    numFmt: MONEY_CENTS,
    note: 'What one session leaves behind after energy and card fees.',
  });
  field(ws, 23, 'Fixed costs per year', {
    formula: `${INS(N.ports)}*(${OPS(O.network)}+${OPS(O.maintenance)})+${OPS(O.billedKw)}*${OPS(O.demandCharge)}*12`,
    numFmt: MONEY,
    note: 'Network, maintenance and demand charges. Payable on an empty car park.',
  });
  field(ws, 24, 'Break-even sessions per port per day', {
    formula: `IF(OR(B22<=0,${INS(N.ports)}=0),"Never — a session loses money",`
      + `B23/B22/${OPS(O.days)}/${INS(N.ports)})`,
    numFmt: '0.00', bold: true,
    note: 'Just to cover the running costs — before any of the installation is paid back. Check this against what the car park actually sees.',
  });
  field(ws, 25, 'You have assumed', { formula: OPS(O.sessionsPerDay), numFmt: '0.0' });
  field(ws, 26, 'Headroom', {
    formula: `IF(B24="","",IF(${OPS(O.sessionsPerDay)}<=B24,"None — the assumption is below break-even",`
      + `TEXT(${OPS(O.sessionsPerDay)}/B24-1,"0%")&" above break-even"))`,
    bold: true,
  });
  field(ws, 27, 'Hours a port is busy per day', {
    formula: `IF(${INS(N.kwPerPort)}=0,"",${OPS(O.sessionsPerDay)}*${OPS(O.kwhPerSession)}/${INS(N.kwPerPort)})`,
    numFmt: '0.0',
    note: 'If this is pushing past eight or ten hours, the sessions assumption is not physically available — add a port instead.',
  });
  field(ws, 28, 'Break-even price per kWh', {
    formula: `IF(${OPS(O.annualKwh)}=0,"",${OPS(O.cost)}/${OPS(O.annualKwh)})`, numFmt: '$0.000',
    note: 'Charge less than this and the site loses money at the use you have assumed.',
  });

  printSetup(ws, { title: 'EV Charging Revenue Calculator — Results' });
  return ws;
}

export async function build() {
  const wb = new ExcelJS.Workbook();
  applyWorkbookMeta(wb, newWorkbook({
    title: meta.title,
    subject: 'EV charging station business case — payback, NPV and break-even utilisation',
    keywords: 'EV charging, Level 2, utilisation, payback, New Hampshire',
  }));

  buildGuide(wb);
  buildInstall(wb);
  buildOperating(wb);
  const proj = buildProjection(wb);
  buildResults(wb, proj);
  wb.views = [{ activeTab: 4, firstSheet: 0, visibility: 'visible' }];

  return [{
    name: 'EV Charging Revenue Calculator.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
  }];
}

/** Independent recomputation of the business case, for `verify.mjs`. */
export async function selfCheck(wb) {
  const ins = wb.getWorksheet('Install');
  const ops = wb.getWorksheet('Operating');
  const money = (n) => (n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`);
  const lit = (ws, ref) => {
    const v = ws.getCell(ref).value;
    return v && typeof v === 'object' && 'formula' in v ? null : v;
  };

  const ports = lit(ins, N.ports);
  const kwPerPort = lit(ins, N.kwPerPort);
  const capex = ports * (lit(ins, N.hardware) + lit(ins, N.install)) + lit(ins, N.service) + lit(ins, N.permits);
  const rebatePerPort = lit(ins, N.rebatePerPort);
  const rebateCap = lit(ins, N.rebateCap);
  const incentive = rebateCap === 0 ? ports * rebatePerPort : Math.min(ports * rebatePerPort, rebateCap);
  const netCapex = capex - incentive;

  const days = lit(ops, O.days);
  const sessionsPerDay = lit(ops, O.sessionsPerDay);
  const kwhPerSession = lit(ops, O.kwhPerSession);
  const price = lit(ops, O.price);
  const sessionFee = lit(ops, O.sessionFee);
  const energyRate = lit(ops, O.energyRate);
  const demandCharge = lit(ops, O.demandCharge);
  const network = lit(ops, O.network);
  const maintenance = lit(ops, O.maintenance);
  const processing = lit(ops, O.processing);
  const growth = lit(ops, O.growth);
  const discount = lit(ops, O.discount);

  const annualKwh = days * sessionsPerDay * kwhPerSession * ports;
  const annualSessions = days * sessionsPerDay * ports;
  const billedKw = ports * kwPerPort;
  const revenue = annualKwh * price + annualSessions * sessionFee;
  const cost = annualKwh * energyRate + billedKw * demandCharge * 12
    + ports * (network + maintenance) + revenue * processing;
  const net = revenue - cost;

  const flows = [-netCapex];
  let cumulative = -netCapex;
  let npv = -netCapex;
  let occupancyFinal = 0;
  for (let t = 1; t <= YEARS; t += 1) {
    const g = (1 + growth) ** (t - 1);
    const kwh = annualKwh * g;
    const rev = kwh * price + annualSessions * g * sessionFee;
    const run = kwh * energyRate + billedKw * demandCharge * 12
      + ports * (network + maintenance) + rev * processing;
    const flow = rev - run;
    flows.push(flow);
    cumulative += flow;
    npv += flow / (1 + discount) ** t;
    occupancyFinal = kwh / kwPerPort / (ports * 24 * days);
  }

  const npvFn = (x) => flows.reduce((s, f, i) => s + f / (1 + x) ** i, 0);
  let lo = -0.9;
  let hi = 2;
  let irr = null;
  if (npvFn(lo) * npvFn(hi) < 0) {
    for (let i = 0; i < 200; i += 1) {
      const mid = (lo + hi) / 2;
      if (npvFn(lo) * npvFn(mid) <= 0) hi = mid; else lo = mid;
    }
    irr = (lo + hi) / 2;
  }

  const contribution = kwhPerSession * (price - energyRate) + sessionFee
    - (kwhPerSession * price + sessionFee) * processing;
  const fixed = ports * (network + maintenance) + billedKw * demandCharge * 12;
  const breakEvenSessions = contribution > 0 ? fixed / contribution / days / ports : null;
  const payback = net > 0 ? netCapex / net : null;
  const hoursBusy = (sessionsPerDay * kwhPerSession) / kwPerPort;

  const concerns = [];
  if (net <= 0) concerns.push('the seeded site loses money, so the example tells a buyer not to bother');
  if (payback !== null && payback > 8) concerns.push(`a ${payback.toFixed(1)}-year payback on ten-year hardware is a discouraging example to ship`);
  if (payback !== null && payback < 2) concerns.push(`a ${payback.toFixed(1)}-year payback is implausibly good and will read as a sales pitch`);
  if (breakEvenSessions === null) concerns.push('a session makes no contribution, so break-even cannot be computed');
  else if (sessionsPerDay <= breakEvenSessions) concerns.push('the seeded utilisation is below its own break-even');
  if (hoursBusy > 10) concerns.push(`the seeded assumption needs ${hoursBusy.toFixed(1)} hours of charging per port per day, which is not physically available`);
  if (occupancyFinal > 0.6) concerns.push(`year-ten occupancy reaches ${(occupancyFinal * 100).toFixed(0)}%, which the workbook itself flags red`);
  if (incentive > 0) concerns.push('the shipped incentive is not zero — it must start at zero so a buyer never models a grant they have not been awarded');

  return {
    figures: [
      ['ports / power', `${ports} x ${kwPerPort} kW`],
      ['installed cost', `${money(capex)}  (net of incentive ${money(netCapex)})`],
      ['energy sold per year', `${Math.round(annualKwh).toLocaleString()} kWh over ${Math.round(annualSessions).toLocaleString()} sessions`],
      ['revenue / running cost', `${money(revenue)} / ${money(cost)}`],
      ['net per year', money(net)],
      ['margin per kWh', `$${(net / annualKwh).toFixed(3)} (gross spread $${(price - energyRate).toFixed(3)})`],
      ['simple payback', payback === null ? 'never' : `${payback.toFixed(1)} years`],
      ['NPV over ten years', money(npv)],
      ['return', irr === null ? 'not computable' : `${(irr * 100).toFixed(1)}%`],
      ['cumulative net at year ten', money(cumulative)],
      ['break-even sessions/port/day', breakEvenSessions === null ? 'n/a' : `${breakEvenSessions.toFixed(2)} against ${sessionsPerDay} assumed`],
      ['hours a port is busy', `${hoursBusy.toFixed(1)} per day  (year-ten occupancy ${(occupancyFinal * 100).toFixed(0)}%)`],
    ],
    concerns,
  };
}
