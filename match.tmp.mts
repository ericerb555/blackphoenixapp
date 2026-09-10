import {
  normaliseName, normaliseUnit, scorePair, proposeMerges, AUTO_TICK,
  type MatchCandidate,
} from './supabase/functions/server/productMatch.ts';

let pass = 0, fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`);
}

// ── normalisation: form only ────────────────────────────────────────────────
check('inch marks', normaliseName('OSB Sheathing 7/16" 4x8'), 'osb sheathing 7/16 in 4x8');
check('curly inch marks', normaliseName('OSB 7/16″'), 'osb 7/16 in');
check('feet marks', normaliseName("2x4 PT 8'"), '2x4 pt 8 ft');
check('spaced x', normaliseName('2 X 4 Pressure Treated'), '2x4 pressure treated');
check('commas and case', normaliseName('Joist, 2x8, #2 SPF'), 'joist 2x8 #2 spf');
check('unit synonyms', [normaliseUnit('EA'), normaliseUnit('Pcs'), normaliseUnit('SHT'), normaliseUnit('Lin Ft')],
  ['each', 'each', 'sheet', 'lf']);

const make = (id: string, name: string, unit: string, category: string, skus: string[], vendors: string[]): MatchCandidate =>
  ({ productId: id, name, unit, category, skus, vendorIds: vendors });

// ── the pairs that should merge ─────────────────────────────────────────────
{
  const a = make('p1', '2x4 Pressure Treated Lumber 8ft', 'EA', 'Lumber', ['BP-2X4PT-8'], ['v1']);
  const b = make('p2', '2X4  PRESSURE TREATED LUMBER 8FT', 'each', 'Lumber', ['SM-4408'], ['v2']);
  const p = scorePair(a, b);
  check('identical description, different suppliers -> ticked', [p?.confidence, p?.ticked], [0.9, true]);
}
{
  const a = make('p1', 'Simpson LUS28 Joist Hanger', 'EA', 'Fasteners', ['LUS28'], ['v1']);
  const b = make('p2', 'Hanger, face mount 2x8', 'ea', 'Hardware', ['LUS-28'], ['v2']);
  const p = scorePair(a, b);
  check('shared manufacturer part number -> ticked', [p?.confidence, p?.ticked], [0.85, true]);
}
{
  const a = make('p1', 'OSB Sheathing 7/16" 4x8', 'SHT', 'Sheathing', ['OSB716'], ['v1']);
  const b = make('p2', 'OSB sheathing 7/16 in 4x8', 'sheet', 'Sheathing', ['X-9931'], ['v2']);
  const p = scorePair(a, b);
  check('inch marks normalised into a match', [p?.confidence, p?.ticked], [0.9, true]);
}

// ── the pairs that must NOT merge ───────────────────────────────────────────
check('different units are different products',
  scorePair(
    make('p1', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['A1'], ['v1']),
    make('p2', '2x4 Pressure Treated 8ft', 'MBF', 'Lumber', ['B2'], ['v2']),
  ), null);

check('same vendor on both sides is not a merge',
  scorePair(
    make('p1', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['A1'], ['v1']),
    make('p2', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['A2'], ['v1']),
  ), null);

check('unrelated products are not proposed',
  scorePair(
    make('p1', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['A1'], ['v1']),
    make('p2', 'Roofing Nails 1-1/4 in Galvanized', 'EA', 'Fasteners', ['B2'], ['v2']),
  ), null);

check('a short shared code is not treated as a part number',
  scorePair(
    make('p1', 'Deck Screw 3in', 'EA', 'Fasteners', ['A12'], ['v1']),
    make('p2', 'Lag Bolt 6in', 'EA', 'Fasteners', ['A12'], ['v2']),
  ), null);

// ── the honest limit, stated as a test ─────────────────────────────────────
{
  const p = scorePair(
    make('p1', '2x4-8 PT', 'EA', 'Lumber', ['A1'], ['v1']),
    make('p2', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['B2'], ['v2']),
  );
  check('abbreviations are NOT expanded, so this is missed rather than guessed', p, null);
}

// ── a product is only offered in its strongest pair ────────────────────────
{
  const cands = [
    make('p1', 'OSB Sheathing 7/16 in 4x8', 'SHT', 'Sheathing', ['OSB716'], ['v1']),
    make('p2', 'OSB Sheathing 7/16 in 4x8', 'SHT', 'Sheathing', ['Z1'], ['v2']),
    make('p3', 'OSB Sheathing 7/16 in 4x8', 'SHT', 'Sheathing', ['Z2'], ['v3']),
  ];
  const out = proposeMerges(cands);
  check('one proposal per product, not three overlapping ones', out.length, 1);
  check('and it is ticked', out[0]?.ticked, true);
}

// ── a weak-but-shown proposal ──────────────────────────────────────────────
{
  const p = scorePair(
    make('p1', 'Galvanized Roofing Nail 1-1/4 in 5 lb', 'EA', 'Fasteners', ['A1'], ['v1']),
    make('p2', 'Galvanized Roofing Nail 1-1/4 in', 'EA', 'Hardware', ['B2'], ['v2']),
  );
  check('close but categories differ -> shown, not ticked',
    [p !== null, p ? p.confidence < AUTO_TICK : null, p?.ticked], [true, true, false]);
}

console.log(`\n${pass}/${pass + fail} as expected${fail ? `, ${fail} WRONG` : ''}`);
