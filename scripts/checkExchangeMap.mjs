/**
 * Does every OSM tag we claim to handle actually reach a category?
 *
 *   node scripts/checkExchangeMap.mjs
 *
 * WHY THIS EXISTS
 *
 * `OSM_TRADE_WORDS` maps an OpenStreetMap tag to a PHRASE, and the phrase is
 * resolved to a category by the alias table in the database. Those are two
 * halves in two places, and nothing checked that they met.
 *
 * On 2026-10-12 four of them did not:
 *
 *     craft=carpenter    -> "carpenter"           no such alias
 *     craft=tiler        -> "tile"                no such alias
 *     office=insurance   -> "insurance"           no such alias
 *     shop=florist       -> "planting & beds"     no such alias, and wrong
 *
 * A mapping like that is the worst kind of broken: it resolves to nothing, so
 * the listing goes uncategorised, while the map reads as though the tag were
 * handled. `office=insurance` had been that way since it was written — about a
 * dozen insurance offices sat invisible to browsing because of one missing
 * row. Nobody could have noticed without doing exactly what this script does.
 *
 * Unit tests cannot catch it. They assert the tag-to-phrase half, which was
 * always correct; the fault was that the phrase meant nothing on the other
 * side. So the check has to talk to the database, which is why it is a script
 * rather than a test.
 *
 * WHAT IT NEEDS
 *
 * The anon key only. `exchange_category` and `exchange_category_alias` are
 * readable by anyone — the taxonomy is public, it is what the browse surface
 * renders — so this needs no secret and can run anywhere.
 *
 * EXIT CODES
 *
 *   0  every mapping lands on a real category
 *   1  at least one mapping resolves to nothing
 *   2  the taxonomy could not be read, so nothing was checked
 *
 * The last one matters. An empty alias table would make every mapping look
 * broken, and a failed fetch would make them all look fine; neither is an
 * answer, so both are reported as "could not check" rather than as a verdict.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const SERVER = new URL('supabase/functions/server/', ROOT);

/** The publishable key, read where the app reads it. */
function anonKey() {
  const src = readFileSync(new URL('src/app/utils/supabase/info.tsx', ROOT), 'utf8');
  const match = src.match(/publicAnonKey\s*=\s*[`'"]([^`'"]+)/);
  if (!match) throw new Error('could not find publicAnonKey in src/app/utils/supabase/info.tsx');
  return match[1];
}

function projectId() {
  const src = readFileSync(new URL('src/app/utils/supabase/info.tsx', ROOT), 'utf8');
  const match = src.match(/projectId\s*=\s*[`'"]([^`'"]+)/);
  if (!match) throw new Error('could not find projectId in src/app/utils/supabase/info.tsx');
  return match[1];
}

/** The same normalisation `exchange_normalise_phrase` applies in SQL. */
const normalise = (value) =>
  String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const { OSM_TRADE_WORDS, OSM_BEAUTY_WORDS } = await (async () => {
  const mod = await import(new URL('exchangeOsm.ts', SERVER).href);
  // `OSM_BEAUTY_WORDS` is module-private on purpose — it is an implementation
  // detail of one ambiguous tag — so it is read out of the source rather than
  // exported just for this. Exporting it would widen the module's surface to
  // suit a checker, which is the wrong way round.
  const src = readFileSync(new URL('exchangeOsm.ts', SERVER), 'utf8');
  const block = src.match(/const OSM_BEAUTY_WORDS[^{]*\{([\s\S]*?)\n\};/);
  const beauty = {};
  if (block) {
    for (const line of block[1].split('\n')) {
      const m = line.match(/^\s*"?([a-z_]+)"?\s*:\s*"([^"]*)"/);
      if (m) beauty[m[1]] = m[2];
    }
  }
  return { OSM_TRADE_WORDS: mod.OSM_TRADE_WORDS, OSM_BEAUTY_WORDS: beauty };
})();

const key = anonKey();
const REST = `https://${projectId()}.supabase.co/rest/v1`;
const headers = { apikey: key, Authorization: `Bearer ${key}` };

let aliases, categories;
try {
  const [a, c] = await Promise.all([
    fetch(`${REST}/exchange_category_alias?select=phrase,category_id`, { headers }),
    fetch(`${REST}/exchange_category?select=id,slug,parent_id,section_slug,status`, { headers }),
  ]);
  if (!a.ok || !c.ok) throw new Error(`taxonomy read failed: aliases ${a.status}, categories ${c.status}`);
  aliases = await a.json();
  categories = await c.json();
} catch (error) {
  console.error(`Could not read the taxonomy, so nothing was checked: ${error.message}`);
  process.exit(2);
}

if (!Array.isArray(aliases) || !aliases.length || !Array.isArray(categories) || !categories.length) {
  console.error('The taxonomy came back empty, so nothing was checked.');
  console.error(`aliases: ${aliases?.length ?? 'none'}  categories: ${categories?.length ?? 'none'}`);
  process.exit(2);
}

const byId = new Map(categories.map((c) => [c.id, c]));
/** phrase -> the category it resolves to */
const resolves = new Map();
for (const row of aliases) {
  const category = byId.get(row.category_id);
  if (category) resolves.set(normalise(row.phrase), category);
}

const entries = [
  ...Object.entries(OSM_TRADE_WORDS).map(([tag, phrase]) => [`tag ${tag}`, phrase]),
  ...Object.entries(OSM_BEAUTY_WORDS).map(([sub, phrase]) => [`beauty=${sub}`, phrase]),
];

const broken = [];
const toService = [];
const inactive = [];
let mapped = 0;
let deliberatelyBlank = 0;

for (const [what, phrase] of entries) {
  // An empty string means "mapped on purpose to nothing", which is a decision
  // rather than a fault — see the comments beside each one.
  if (phrase === '') { deliberatelyBlank += 1; continue; }

  const category = resolves.get(normalise(phrase));
  if (!category) { broken.push([what, phrase]); continue; }

  mapped += 1;
  // A business holds a category, never a service under one. The ingest lifts a
  // service to its parent, so this is worth knowing but is not a failure.
  if (category.parent_id) toService.push([what, phrase, category.slug]);
  if (category.status !== 'active') inactive.push([what, phrase, category.slug]);
}

console.log(`${entries.length} mappings: ${mapped} land on a category, ` +
            `${deliberatelyBlank} deliberately blank, ${broken.length} broken`);

if (toService.length) {
  console.log(`\n${toService.length} resolve to a SERVICE and are lifted to its parent by the ingest:`);
  for (const [what, phrase, slug] of toService) console.log(`   ${what} -> "${phrase}" -> ${slug}`);
}

if (inactive.length) {
  console.log(`\n${inactive.length} resolve to a category that is not active:`);
  for (const [what, phrase, slug] of inactive) console.log(`   ${what} -> "${phrase}" -> ${slug}`);
}

if (broken.length) {
  console.error(`\n${broken.length} MAPPING(S) RESOLVE TO NOTHING.`);
  console.error('Each one reads as handled and silently leaves its listings uncategorised:\n');
  for (const [what, phrase] of broken) console.error(`   ${what} -> "${phrase}"  (no alias)`);
  console.error('\nEither add the alias, point the mapping at a phrase that exists, or set');
  console.error('it to "" with a comment saying why there is no honest destination.');
  process.exit(1);
}

console.log('\nEvery mapping lands on a real category.');
