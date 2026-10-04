/**
 * Generates the SERVER's copy of the maintenance pricing data.
 *
 * WHY THIS EXISTS
 *
 * The plan builder priced itself in the browser and the server stored whatever
 * monthly figure the browser posted, so a customer with the console open could
 * save a $900 plan as $9 — and that figure mints a gift card and an hours
 * allotment. Fixing it means the server has to know the prices.
 *
 * It cannot import them. `src/app/data/maintenancePlans.ts` is front-end code
 * and the edge function deploys only `supabase/functions/server/`, so the
 * server needs its own copy. A copy typed by hand is a copy that drifts, and a
 * drifted price is a wrong invoice. So it is generated, and the generator is
 * the thing that gets run again when the catalogue changes.
 *
 * Deliberately NOT the end state. Task P2 in tasks/marketing-and-monetisation.md
 * moves the catalogue into `plan_addon` records so there is one store rather
 * than a source and a generated copy. `planPricing.ts` keeps its function
 * signatures so that change does not reach any caller.
 *
 *   node scripts/gen-plan-pricing-data.mjs
 *
 * Run it after editing maintenancePlans.ts; tests/planPricingData.test.ts
 * fails if the generated file has fallen behind, so `npm test` catches it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, '..', 'src', 'app', 'data', 'maintenancePlans.ts');
const TARGET = join(here, '..', 'supabase', 'functions', 'server', 'planPricingData.ts');

const src = readFileSync(SOURCE, 'utf8');

/** Pull `id: 'x'`-style fields out of a single-line object literal. */
function field(line, name) {
  const quoted = new RegExp(`\\b${name}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(line);
  if (quoted) return quoted[1].replace(/\\'/g, "'");
  const bare = new RegExp(`\\b${name}:\\s*([0-9]+(?:\\.[0-9]+)?)`).exec(line);
  return bare ? Number(bare[1]) : undefined;
}

/**
 * SKILL_LEVELS and FREQUENCY_TIERS are multi-line objects, so they are read
 * by id/multiplier pairing rather than by line.
 */
function readMultipliers(name) {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) throw new Error(`${name} not found`);
  const end = src.indexOf('\n];', start);
  const block = src.slice(start, end);
  const out = {};
  const re = /id:\s*'([^']+)'[\s\S]*?(?:multiplier|priceMultiplier):\s*([0-9]*\.?[0-9]+)/g;
  let m;
  while ((m = re.exec(block))) out[m[1]] = Number(m[2]);
  if (!Object.keys(out).length) throw new Error(`${name} parsed to no multipliers`);
  return out;
}

// ─── The service catalogue, by entity ────────────────────────────────────────

const catStart = src.indexOf('export const SERVICE_CATALOG');
const catEnd = src.indexOf('\n};', catStart);
if (catStart < 0 || catEnd < 0) throw new Error('SERVICE_CATALOG not found');
const catBlock = src.slice(catStart, catEnd);

const services = {};
let entity = null;
for (const line of catBlock.split('\n')) {
  const key = /^\s{2}([a-z_]+):\s*\[/.exec(line);
  if (key) { entity = key[1]; services[entity] = []; continue; }
  const id = field(line, 'id');
  if (typeof id !== 'string' || !entity) continue;
  const price = field(line, 'baseMonthlyPrice');
  if (typeof price !== 'number') throw new Error(`${id} has no baseMonthlyPrice`);
  // The display fields come too, because the builder now reads its catalogue
  // from the server rather than from the bundle — a service with no description
  // would render as a bare name in the portal.
  const recommended = /recommended:\s*true/.test(line);
  const nhSpecific = /nhSpecific:\s*true/.test(line);
  services[entity].push({
    id,
    name: field(line, 'name') || id,
    category: field(line, 'category') || 'Service',
    unit: field(line, 'unit') || 'per month',
    description: field(line, 'description') || '',
    baseMonthlyPrice: price,
    ...(recommended ? { recommended: true } : {}),
    ...(nhSpecific ? { nhSpecific: true } : {}),
  });
}

const skill = readMultipliers('SKILL_LEVELS');
const frequency = readMultipliers('FREQUENCY_TIERS');
const region = readMultipliers('REGIONS');
const presets = (() => {
  const start = src.indexOf('export const PLAN_PRESETS');
  const end = src.indexOf('\n};', start);
  const block = src.slice(start, end);
  const out = {};
  let ent = null;
  for (const line of block.split('\n')) {
    const key = /^\s{2}([a-z_]+):\s*\[/.exec(line);
    if (key) { ent = key[1]; out[ent] = []; continue; }
    const id = field(line, 'id');
    if (typeof id !== 'string' || !ent) continue;
    const ids = /serviceIds:\s*\[([^\]]*)\]/.exec(line);
    out[ent].push({
      id,
      name: field(line, 'name') || id,
      serviceIds: ids ? ids[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : [],
    });
  }
  return out;
})();

const count = Object.values(services).reduce((n, list) => n + list.length, 0);
if (count < 100) throw new Error(`only ${count} services parsed — the format must have changed`);

const banner = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by scripts/gen-plan-pricing-data.mjs from
 * src/app/data/maintenancePlans.ts, which is still where prices are edited.
 * Re-run the generator after changing them; tests/planPricingData.test.ts
 * fails if this file has fallen behind.
 *
 * The server needs its own copy because the edge function deploys only
 * supabase/functions/server/ and cannot import front-end code. Task P2 replaces
 * this with plan_addon records held in the catalogue.
 *
 * ${count} services across ${Object.keys(services).length} entity types.
 */
`;

const body = `${banner}
export interface ServerServiceItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  description: string;
  baseMonthlyPrice: number;
  recommended?: boolean;
  nhSpecific?: boolean;
}

/** Applied to a service's base price. Keys are the ids saved on a plan. */
export const SKILL_MULTIPLIERS: Record<string, number> = ${JSON.stringify(skill, null, 2)};

export const FREQUENCY_MULTIPLIERS: Record<string, number> = ${JSON.stringify(frequency, null, 2)};

export const REGION_MULTIPLIERS: Record<string, number> = ${JSON.stringify(region, null, 2)};

export const SERVICE_CATALOG: Record<string, ServerServiceItem[]> = ${JSON.stringify(services, null, 2)};

/** The three standard bundles per entity, by the service ids they contain. */
export const PLAN_PRESETS: Record<string, Array<{ id: string; name: string; serviceIds: string[] }>> = ${JSON.stringify(presets, null, 2)};
`;

writeFileSync(TARGET, body);
console.log(`Wrote ${TARGET}`);
console.log(`  ${count} services, ${Object.keys(services).length} entities`);
console.log(`  skill: ${JSON.stringify(skill)}`);
console.log(`  frequency: ${JSON.stringify(frequency)}`);
console.log(`  region: ${JSON.stringify(region)}`);
console.log(`  presets: ${Object.values(presets).reduce((n, p) => n + p.length, 0)}`);
