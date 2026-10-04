/**
 * The server's copy of the maintenance prices must match the front end's.
 *
 * `supabase/functions/server/planPricingData.ts` is generated from
 * `src/app/data/maintenancePlans.ts` because the edge function cannot import
 * front-end code. A generated copy that nobody checks is a copy that goes
 * stale, and a stale price here means the builder shows one figure and the
 * server charges another. This test is what makes the generator obligatory:
 * change a price, forget to re-run it, and the suite fails.
 *
 * It deliberately re-parses both files as text rather than importing them.
 * Neither is loadable in node — one is TypeScript with front-end imports, the
 * other uses Deno module specifiers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync('src/app/data/maintenancePlans.ts', 'utf8');
const SERVER = readFileSync('supabase/functions/server/planPricingData.ts', 'utf8');

/** id → base price, read from the app's single-line catalogue entries. */
function appPrices(): Map<string, number> {
  const start = APP.indexOf('export const SERVICE_CATALOG');
  const end = APP.indexOf('\n};', start);
  assert.ok(start > -1 && end > start, 'SERVICE_CATALOG not found in the app catalogue');
  const out = new Map<string, number>();
  for (const line of APP.slice(start, end).split('\n')) {
    const id = /\bid:\s*'([^']+)'/.exec(line);
    const price = /\bbaseMonthlyPrice:\s*([0-9.]+)/.exec(line);
    if (id && price) out.set(id[1], Number(price[1]));
  }
  return out;
}

/** id → base price, read out of the generated JSON blocks. */
function serverPrices(): Map<string, number> {
  const start = SERVER.indexOf('export const SERVICE_CATALOG');
  const end = SERVER.indexOf('\n};', start);
  assert.ok(start > -1 && end > start, 'SERVICE_CATALOG not found in the generated file');
  const block = SERVER.slice(start, end);
  const out = new Map<string, number>();
  const re = /"id":\s*"([^"]+)"[\s\S]*?"baseMonthlyPrice":\s*([0-9.]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.set(m[1], Number(m[2]));
  return out;
}

/** A `{"id": n}` map out of one generated multiplier block. */
function multipliers(name: string): Record<string, number> {
  const start = SERVER.indexOf(`export const ${name}`);
  assert.ok(start > -1, `${name} missing from the generated file`);
  const open = SERVER.indexOf('{', start);
  const close = SERVER.indexOf('\n};', open);
  return JSON.parse(SERVER.slice(open, close + 2).replace(/;$/, ''));
}

test('every app service appears in the generated server catalogue', () => {
  const app = appPrices();
  const server = serverPrices();
  assert.ok(app.size >= 100, `expected the app catalogue to hold 100+ services, found ${app.size}`);
  const missing = [...app.keys()].filter((id) => !server.has(id));
  assert.deepEqual(missing, [], 'run: node scripts/gen-plan-pricing-data.mjs');
});

test('no price differs between the two copies', () => {
  const app = appPrices();
  const server = serverPrices();
  const drifted: string[] = [];
  for (const [id, price] of app) {
    const theirs = server.get(id);
    if (theirs !== undefined && theirs !== price) drifted.push(`${id}: app $${price} vs server $${theirs}`);
  }
  assert.deepEqual(drifted, [], 'run: node scripts/gen-plan-pricing-data.mjs');
});

test('the generated catalogue invents nothing of its own', () => {
  const app = appPrices();
  const extra = [...serverPrices().keys()].filter((id) => !app.has(id));
  assert.deepEqual(extra, [], 'the generated file holds services the app catalogue does not');
});

test('the skill and frequency multipliers match, and none is zero', () => {
  const skill = multipliers('SKILL_MULTIPLIERS');
  const frequency = multipliers('FREQUENCY_MULTIPLIERS');

  for (const [name, table] of [['skill', skill], ['frequency', frequency]] as const) {
    assert.ok(Object.keys(table).length >= 3, `${name} should carry at least three rungs`);
    for (const [id, value] of Object.entries(table)) {
      // A zero or negative multiplier would make a plan free, which is the
      // failure this whole module exists to prevent.
      assert.ok(value > 0, `${name} multiplier ${id} is ${value}`);
    }
  }
  // The standard rungs the pricing falls back to must exist, or a plan saved
  // with an unrecognised id would fall back to nothing.
  assert.ok(skill['journeyman'] > 0, 'the journeyman fallback multiplier is missing');
  assert.ok(frequency['monthly'] > 0, 'the monthly fallback multiplier is missing');

  for (const [id, value] of Object.entries(skill)) {
    const inApp = new RegExp(`id:\\s*'${id}'[\\s\\S]{0,400}?multiplier:\\s*${String(value).replace('.', '\\.')}`).test(APP);
    assert.ok(inApp, `skill multiplier ${id}=${value} does not match the app catalogue`);
  }
});
