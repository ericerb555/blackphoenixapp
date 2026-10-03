/**
 * Verify a built product workbook.
 *
 *     node scripts/digital-products/verify.mjs calc-reserve
 *
 * WHY THIS EXISTS
 *
 * `exceljs` writes formulas; it does not evaluate them. So a workbook can build
 * cleanly and still open with #REF! in every cell, and the first person to find
 * out would be somebody who paid $29 for it. There is no Excel on this machine,
 * so the next best thing is two independent statements of the same arithmetic:
 * the formulas in the sheet, and a recomputation here in plain JavaScript from
 * the workbook's own input cells.
 *
 * It checks two different kinds of thing:
 *
 *   STRUCTURE  every sheet a formula names exists, no formula is empty, no
 *              formula points outside the ranges the sheet actually has.
 *   ARITHMETIC the model recomputed from the saved inputs, printed, so the
 *              headline figures can be read against what Excel shows on open.
 *
 * A disagreement between the two is the signal. Agreement is not proof the
 * formulas are syntactically valid for Excel, and this file does not claim it.
 */
import ExcelJS from 'exceljs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const id = process.argv[2] || 'calc-reserve';

const money = (n) => (n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`);
const pct = (n) => `${(n * 100).toFixed(1)}%`;

const mod = await import(`./products/${id}.mjs`);
const files = await mod.build();
const xlsx = files.find((f) => f.name.endsWith('.xlsx'));
if (!xlsx) {
  console.log(`${id} produces no workbook — nothing to verify here.`);
  process.exit(0);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.load(xlsx.buffer);

// ── Structure ───────────────────────────────────────────────────────────────
const sheetNames = wb.worksheets.map((w) => w.name);
const problems = [];
let formulaCount = 0;

for (const ws of wb.worksheets) {
  ws.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const f = cell.formula ?? cell.value?.formula;
      if (!f) return;
      formulaCount += 1;
      if (String(f).trim() === '') {
        problems.push(`${ws.name}!${cell.address} has an empty formula`);
        return;
      }
      if (/#REF|#NAME|#VALUE/.test(String(f))) {
        problems.push(`${ws.name}!${cell.address} carries an error token: ${f}`);
      }
      // Any sheet named with "Name!" must exist.
      for (const m of String(f).matchAll(/([A-Za-z][A-Za-z0-9 ]*)!\$?[A-Z]/g)) {
        const named = m[1].trim();
        if (!sheetNames.includes(named)) {
          problems.push(`${ws.name}!${cell.address} references unknown sheet "${named}"`);
        }
      }
    });
  });
}

console.log(`\n${mod.meta.title}`);
console.log(`  sheets      ${sheetNames.join(', ')}`);
console.log(`  formulas    ${formulaCount}`);
console.log(`  structure   ${problems.length === 0 ? 'clean' : `${problems.length} problem(s)`}`);
for (const p of problems.slice(0, 20)) console.log(`      - ${p}`);

if (id !== 'calc-reserve') process.exit(problems.length ? 1 : 0);

// ── Arithmetic, recomputed from the saved inputs ────────────────────────────
const setup = wb.getWorksheet('Setup');
const comps = wb.getWorksheet('Components');
const raw = (ws, ref) => {
  const v = ws.getCell(ref).value;
  if (v && typeof v === 'object' && 'formula' in v) return null;
  return v;
};

const units = raw(setup, 'B7');
const studyYear = raw(setup, 'B8');
const balance = raw(setup, 'B11');
const contribution = raw(setup, 'B12');
const inflation = raw(setup, 'B15');
const interest = raw(setup, 'B16');
const increase = raw(setup, 'B20');
const catchUp = raw(setup, 'B21');

const rows = [];
for (let r = 6; r <= 46; r += 1) {
  const name = comps.getCell(`A${r}`).value;
  const qty = comps.getCell(`C${r}`).value;
  const unitCost = comps.getCell(`E${r}`).value;
  const life = comps.getCell(`G${r}`).value;
  const lastDone = comps.getCell(`H${r}`).value;
  if (!name || qty == null || unitCost == null || !life || !lastDone) continue;
  const costToday = qty * unitCost;
  const age = Math.max(0, studyYear - lastDone);
  const remaining = Math.max(0, life - age);
  rows.push({
    name,
    costToday,
    life,
    age,
    remaining,
    futureCost: costToday * (1 + inflation) ** remaining,
    ffb: costToday * Math.min(age / life, 1),
    accrual: costToday / life,
  });
}

const totalToday = rows.reduce((s, c) => s + c.costToday, 0);
const ffb = rows.reduce((s, c) => s + c.ffb, 0);
const accrual = rows.reduce((s, c) => s + c.accrual, 0);
const percentFunded = ffb === 0 ? 0 : balance / ffb;
const shortfall = Math.max(0, ffb - balance);
const recommended = accrual + (catchUp ? shortfall / catchUp : 0);

// The projection, on the contribution actually modelled (which seeds equal to
// this year's contribution), including recurring replacements.
const YEARS = 30;
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
let totalSpend = 0;
for (let t = 1; t <= YEARS; t += 1) {
  const contrib = contribution * (1 + increase) ** (t - 1);
  const earned = Math.max(0, bal + contrib / 2) * interest;
  const out = spend[t - 1];
  bal = bal + contrib + earned - out;
  totalSpend += out;
  if (bal < lowest) lowest = bal;
  if (bal < 0) {
    if (firstDry === null) firstDry = studyYear + t - 1;
    maxAssessment = Math.max(maxAssessment, -bal);
  }
}

const dueIn30 = rows.filter((c) => c.remaining <= 30).length;
console.log(`
  Recomputed from the workbook's own inputs — these are the figures Excel
  should show on Results when the file is opened:

    components priced            ${rows.length}  (${dueIn30} fall due inside 30 years)
    replacement cost today       ${money(totalToday)}
    fully funded balance         ${money(ffb)}
    reserve balance on hand      ${money(balance)}
    percent funded               ${pct(percentFunded)}   → ${percentFunded < 0.3 ? 'Weak' : percentFunded < 0.7 ? 'Fair' : 'Strong'}
    shortfall                    ${money(shortfall)}   (${money(shortfall / units)} per unit)

    straight-line accrual        ${money(accrual)}
    catch-up over ${catchUp} years      ${money(shortfall / catchUp)}
    recommended contribution     ${money(recommended)}
    contributing now             ${money(contribution)}
    gap per unit per month       $${(Math.max(0, recommended - contribution) / units / 12).toFixed(2)}

    lowest balance in 30 years   ${money(lowest)}
    first year the fund dries    ${firstDry ?? 'never on these assumptions'}
    largest assessment needed    ${money(maxAssessment)}${maxAssessment ? `   (${money(maxAssessment / units)} per unit)` : ''}
    total replacement spending   ${money(totalSpend)}
`);

const sanity = [];
if (percentFunded <= 0 || percentFunded > 3) sanity.push(`percent funded of ${pct(percentFunded)} is not a believable starting example`);
if (recommended <= contribution) sanity.push('the recommended contribution does not exceed the current one, so the product demonstrates nothing');
if (firstDry === null) sanity.push('the seeded association never runs dry, so the projection sheet shows nothing interesting');
if (rows.length < 20) sanity.push(`only ${rows.length} components were read back out of the workbook`);
console.log(`  example quality  ${sanity.length === 0 ? 'the seeded association tells a story worth seeing' : 'review:'}`);
for (const s of sanity) console.log(`      - ${s}`);

process.exitCode = problems.length ? 1 : 0;
