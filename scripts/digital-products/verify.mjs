/**
 * Verify a built product workbook.
 *
 *     node scripts/digital-products/verify.mjs               every product
 *     node scripts/digital-products/verify.mjs calc-roi      just one
 *
 * WHY THIS EXISTS
 *
 * `exceljs` writes formulas; it does not evaluate them. So a workbook can build
 * cleanly and still open with #REF! in every cell, and the first person to find
 * out would be somebody who paid for it. There is no Excel on this machine, so
 * the next best thing is two independent statements of the same arithmetic: the
 * formulas in the sheet, and a recomputation in plain JavaScript from the
 * workbook's own input cells.
 *
 * TWO DIFFERENT KINDS OF CHECK
 *
 *   STRUCTURE  — done here for every product. Every sheet a formula names
 *                exists, no formula is empty, nothing carries an error token.
 *   ARITHMETIC — done by the product, which exports `selfCheck(wb)` returning
 *                { figures, concerns }. The product owns it because the numbers
 *                being checked are the product's subject matter, and a generic
 *                checker would only be able to confirm that cells contain text.
 *
 * A disagreement between the formulas and the recomputation is the signal.
 * Agreement is not proof that Excel accepts every formula, and this file does
 * not claim otherwise.
 */
import ExcelJS from 'exceljs';

const ALL = ['calc-reserve', 'calc-roi', 'calc-rental-pricing', 'calc-ev-roi', 'maint-nh-winter'];
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const ids = wanted.length ? wanted : ALL;

let anyProblem = false;

for (const id of ids) {
  const mod = await import(`./products/${id}.mjs`);
  const files = await mod.build();
  const xlsx = files.find((f) => f.name.endsWith('.xlsx'));

  console.log(`\n${mod.meta.title}  —  $${(mod.meta.price / 100).toFixed(0)}`);
  console.log(`  files       ${files.map((f) => `${f.name} (${Math.round(f.buffer.length / 1024)} KB)`).join(', ')}`);

  /**
   * Only a spreadsheet gets the formula walk below. A PDF or a Word file is
   * checked by the product's own `selfCheck` — a PDF has no formulas to
   * inspect, and a .docx is verified by being unzipped and having its parts
   * accounted for, which the product does because it knows what it put in.
   */
  if (!xlsx) {
    if (typeof mod.selfCheck === 'function') {
      const { figures = [], concerns = [] } = (await mod.selfCheck()) || {};
      if (figures.length) {
        const pad = Math.max(...figures.map(([label]) => label.length));
        for (const [label, value] of figures) console.log(`      ${String(label).padEnd(pad)}   ${value}`);
      }
      console.log(`  checks      ${concerns.length === 0 ? 'the files open and the listing\'s promises are kept' : 'review:'}`);
      for (const c of concerns) console.log(`      - ${c}`);
      if (concerns.length) anyProblem = true;
    } else {
      console.log('  checks      no selfCheck() — not verified');
      anyProblem = true;
    }
    continue;
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(xlsx.buffer);

  const sheetNames = wb.worksheets.map((w) => w.name);
  const problems = [];
  let formulaCount = 0;

  for (const ws of wb.worksheets) {
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const f = cell.formula ?? cell.value?.formula;
        if (!f) return;
        formulaCount += 1;
        const text = String(f);
        if (text.trim() === '') {
          problems.push(`${ws.name}!${cell.address} has an empty formula`);
          return;
        }
        if (/#REF|#NAME|#VALUE/.test(text)) {
          problems.push(`${ws.name}!${cell.address} carries an error token: ${text}`);
        }
        for (const m of text.matchAll(/([A-Za-z][A-Za-z0-9 ]*)!\$?[A-Z]/g)) {
          const named = m[1].trim();
          // Skip function names that happen to precede a sheet-style reference.
          if (!sheetNames.includes(named) && !/^(IF|SUM|MIN|MAX|INDEX|MATCH|IRR|PMT|FV|ROUND|AND|OR|COUNT|COUNTIF|SUMIF|AVERAGE|ABS|NPV)$/i.test(named)) {
            problems.push(`${ws.name}!${cell.address} references unknown sheet "${named}"`);
          }
        }
      });
    });
  }

  console.log(`  sheets      ${sheetNames.join(', ')}`);
  console.log(`  formulas    ${formulaCount}`);
  console.log(`  structure   ${problems.length === 0 ? 'clean' : `${problems.length} problem(s)`}`);
  for (const p of problems.slice(0, 15)) console.log(`      - ${p}`);
  if (problems.length) anyProblem = true;

  if (typeof mod.selfCheck === 'function') {
    const { figures = [], concerns = [] } = (await mod.selfCheck(wb)) || {};
    if (figures.length) {
      console.log('  recomputed from the workbook\'s own inputs:');
      const pad = Math.max(...figures.map(([label]) => label.length));
      for (const [label, value] of figures) {
        console.log(`      ${String(label).padEnd(pad)}   ${value}`);
      }
    }
    console.log(`  example     ${concerns.length === 0 ? 'the seeded case tells a story worth seeing' : 'review:'}`);
    for (const c of concerns) console.log(`      - ${c}`);
    if (concerns.length) anyProblem = true;
  } else {
    console.log('  arithmetic  no selfCheck() — structure only');
  }
}

console.log('');
process.exitCode = anyProblem ? 1 : 0;
