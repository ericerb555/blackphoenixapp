/**
 * planPricing.ts — the server's own answer to "what does this plan cost?"
 *
 * WHY
 *
 * The plan builder computed its monthly total in the browser and posted it, and
 * `POST /plans` stored `Number(body.monthlyTotal) || 0` without recomputing
 * anything. That figure is not cosmetic: `provisionLinks` derives an included
 * hours allotment from it and mints a welcome gift card worth up to $250, both
 * as real records. So a posted number decided money, which is exactly what the
 * standing rule says never to trust a client for.
 *
 * This module is the authority instead. Everything that writes a plan price
 * goes through `pricePlan`, and the posted figure survives only as a
 * cross-check that gets logged when it disagrees.
 *
 * TWO KINDS OF LINE ITEM
 *
 *   catalogue items — priced from our own records, keyed by the ids the builder
 *                     already sends;
 *   quoted items    — the "price out your own request" feature, where a model
 *                     proposes a price for something not in the catalogue.
 *
 * A quoted item is the awkward one, because its price does not exist until the
 * model invents it. The answer is that the SERVER keeps the quote: when
 * /plan-builder/price-custom prices a request it writes the result under a
 * `plan_quote:` key and hands back only an id. The browser can echo the id; it
 * cannot name the price. A quote belongs to the account that asked for it and
 * stops being usable after a week, so an old quote cannot be replayed into a
 * new plan at a stale price.
 *
 * WHERE THE NUMBERS COME FROM
 *
 * `planPricingData.ts`, generated from the front end's own catalogue so the two
 * cannot drift, with the admin's saved overrides from `maintenance_config`
 * merged over the top exactly as the browser merges them. Task P2 in
 * tasks/marketing-and-monetisation.md replaces the generated file with
 * `plan_addon` records; the functions here keep their signatures so that change
 * reaches no caller.
 */
import * as kv from './kv_store.tsx';
import {
  SKILL_MULTIPLIERS, FREQUENCY_MULTIPLIERS, REGION_MULTIPLIERS,
  SERVICE_CATALOG, type ServerServiceItem,
} from './planPricingData.ts';

const CONFIG_KEY = 'maintenance_config:default';
const QUOTE_PREFIX = 'plan_quote:';

/** A quote is usable for a week. Long enough to finish signing up, short
 *  enough that a price change takes effect for everybody who comes after. */
const QUOTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PricedLine {
  id: string;
  name: string;
  category: string;
  unit: string;
  baseMonthlyPrice: number;
  /** After the skill, frequency and region multipliers. */
  monthly: number;
  custom?: boolean;
}

export interface PricedPlan {
  monthlyTotal: number;
  annualTotal: number;
  lines: PricedLine[];
  /** Ids we could not price. A caller should refuse rather than drop them. */
  unknownIds: string[];
  skillId: string;
  frequencyId: string;
  regionId: string;
}

/** The one piece of arithmetic, matching the front end's computePrice(). */
export function computePrice(
  baseMonthlyPrice: number,
  skillMultiplier: number,
  frequencyMultiplier: number,
  regionMultiplier: number,
): number {
  return Math.round(
    (Number(baseMonthlyPrice) || 0) * skillMultiplier * frequencyMultiplier * regionMultiplier,
  );
}

/**
 * The catalogue, with the admin editor's saved overrides merged over the
 * generated defaults.
 *
 * The merge rule is deliberately the same as `mergeWithDefaults` in
 * src/app/data/maintenanceConfig.ts — a saved item replaces the default of the
 * same id, and anything saved that code does not know about is appended — so
 * the price the builder shows and the price the server charges come out of the
 * same policy. Two different merge rules would be a slow, quiet drift.
 *
 * Only the fields that decide money are taken from the saved config. A saved
 * description or badge is a display concern and is not worth trusting here.
 */
export async function loadCatalogue(): Promise<{
  services: Record<string, ServerServiceItem[]>;
  skill: Record<string, number>;
  frequency: Record<string, number>;
  region: Record<string, number>;
}> {
  const services: Record<string, ServerServiceItem[]> = {};
  for (const key of Object.keys(SERVICE_CATALOG)) services[key] = SERVICE_CATALOG[key].slice();
  const skill = { ...SKILL_MULTIPLIERS };
  const frequency = { ...FREQUENCY_MULTIPLIERS };
  const region = { ...REGION_MULTIPLIERS };

  let saved: any = null;
  try { saved = await kv.get(CONFIG_KEY); } catch (err) { console.log('[planPricing] config read failed, using defaults:', err); }
  if (!saved || typeof saved !== 'object') return { services, skill, frequency, region };

  const num = (value: any) => (Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null);

  for (const list of [saved.skillLevels, saved.frequencyTiers, saved.regions]) {
    if (!Array.isArray(list)) continue;
    const target = list === saved.skillLevels ? skill : list === saved.frequencyTiers ? frequency : region;
    for (const row of list) {
      const id = String(row?.id || '');
      const m = num(row?.multiplier ?? row?.priceMultiplier);
      if (id && m !== null) target[id] = m;
    }
  }

  if (saved.catalog && typeof saved.catalog === 'object') {
    for (const entity of Object.keys(saved.catalog)) {
      const rows = (saved.catalog as Record<string, any[]>)[entity];
      if (!Array.isArray(rows)) continue;
      const defaults = services[entity] || [];
      const savedById = new Map<string, any>();
      for (const row of rows) if (row && row.id) savedById.set(String(row.id), row);

      const merged: ServerServiceItem[] = defaults.map((item) => {
        const row = savedById.get(item.id);
        const price = row ? num(row.baseMonthlyPrice) : null;
        return price === null ? item : { ...item, baseMonthlyPrice: price, name: String(row.name || item.name), category: String(row.category || item.category), unit: String(row.unit || item.unit) };
      });
      for (const row of rows) {
        const id = String(row?.id || '');
        const price = num(row?.baseMonthlyPrice);
        if (!id || price === null || defaults.some((d) => d.id === id)) continue;
        merged.push({ id, name: String(row.name || id), category: String(row.category || 'Service'), unit: String(row.unit || 'per month'), baseMonthlyPrice: price });
      }
      services[entity] = merged;
    }
  }

  return { services, skill, frequency, region };
}

// ─── Quoted custom items ─────────────────────────────────────────────────────

export interface QuotedItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  baseMonthlyPrice: number;
  rationale: string;
  entity: string;
  quotedFor: string;
  quotedAt: string;
}

function quoteId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `CUSTOM-${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/** Called by price-custom once the model has answered. Returns the stored quote. */
export async function saveQuotedItem(input: {
  name: string; category: string; unit: string; baseMonthlyPrice: number;
  rationale: string; entity: string; quotedFor: string;
}): Promise<QuotedItem> {
  const item: QuotedItem = {
    id: quoteId(),
    name: String(input.name || 'Custom request').slice(0, 80),
    category: String(input.category || 'Custom Request').slice(0, 40),
    unit: String(input.unit || 'per month').slice(0, 30),
    baseMonthlyPrice: Math.max(0, Math.round(Number(input.baseMonthlyPrice) || 0)),
    rationale: String(input.rationale || '').slice(0, 240),
    entity: String(input.entity || ''),
    quotedFor: String(input.quotedFor || '').toLowerCase(),
    quotedAt: new Date().toISOString(),
  };
  await kv.set(`${QUOTE_PREFIX}${item.id}`, item);
  return item;
}

/**
 * Looks up a quote for the account trying to use it.
 *
 * Refuses somebody else's quote and refuses an expired one, because a quote is
 * a price we committed to for one person at one moment. `allowAnyOwner` exists
 * for an administrator creating a plan on a customer's behalf.
 */
export async function getQuotedItem(id: string, forEmail: string, allowAnyOwner: boolean): Promise<{
  ok: boolean; item?: QuotedItem; error?: string;
}> {
  if (!String(id || '').startsWith('CUSTOM-')) return { ok: false, error: 'Not a quoted item id.' };
  let stored: any = null;
  try { stored = await kv.get(`${QUOTE_PREFIX}${id}`); } catch (err) { console.log('[planPricing] quote read failed:', err); }
  if (!stored) return { ok: false, error: 'That custom item is no longer on file. Price the request again.' };
  const owner = String(stored.quotedFor || '').toLowerCase();
  if (!allowAnyOwner && owner && owner !== String(forEmail || '').toLowerCase()) {
    return { ok: false, error: 'That custom item was priced for another account.' };
  }
  const age = Date.now() - Date.parse(String(stored.quotedAt || '')) ;
  if (!Number.isFinite(age) || age > QUOTE_TTL_MS) {
    return { ok: false, error: 'That custom price has expired. Price the request again.' };
  }
  return { ok: true, item: stored as QuotedItem };
}

// ─── Pricing a whole plan ────────────────────────────────────────────────────

/**
 * Prices a plan from the ids alone.
 *
 * Nothing about the money comes out of the request except which services were
 * chosen. An unrecognised multiplier id falls back to the standard rung rather
 * than to zero — a missing multiplier must never make a plan free.
 */
export async function pricePlan(input: {
  entity: string;
  skillId: string;
  frequencyId: string;
  regionId?: string;
  serviceIds: string[];
  forEmail: string;
  allowAnyOwner?: boolean;
}): Promise<PricedPlan> {
  const { services, skill, frequency, region } = await loadCatalogue();

  const skillId = String(input.skillId || 'journeyman');
  const frequencyId = String(input.frequencyId || 'monthly');
  const regionId = String(input.regionId || 'national');

  const skillMultiplier = Number.isFinite(skill[skillId]) ? skill[skillId] : (skill['journeyman'] || 1);
  const frequencyMultiplier = Number.isFinite(frequency[frequencyId]) ? frequency[frequencyId] : (frequency['monthly'] || 1);
  const regionMultiplier = Number.isFinite(region[regionId]) ? region[regionId] : 1;

  const catalogue = services[String(input.entity || '')] || [];
  const byId = new Map<string, ServerServiceItem>();
  for (const item of catalogue) byId.set(item.id, item);

  const lines: PricedLine[] = [];
  const unknownIds: string[] = [];
  const seen = new Set<string>();

  for (const raw of Array.isArray(input.serviceIds) ? input.serviceIds : []) {
    const id = String(raw || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);

    if (id.startsWith('CUSTOM-')) {
      const quote = await getQuotedItem(id, input.forEmail, !!input.allowAnyOwner);
      if (!quote.ok || !quote.item) { unknownIds.push(id); continue; }
      lines.push({
        id, name: quote.item.name, category: quote.item.category, unit: quote.item.unit,
        baseMonthlyPrice: quote.item.baseMonthlyPrice,
        monthly: computePrice(quote.item.baseMonthlyPrice, skillMultiplier, frequencyMultiplier, regionMultiplier),
        custom: true,
      });
      continue;
    }

    const item = byId.get(id);
    if (!item) { unknownIds.push(id); continue; }
    lines.push({
      id, name: item.name, category: item.category, unit: item.unit,
      baseMonthlyPrice: item.baseMonthlyPrice,
      monthly: computePrice(item.baseMonthlyPrice, skillMultiplier, frequencyMultiplier, regionMultiplier),
    });
  }

  const monthlyTotal = lines.reduce((sum, line) => sum + line.monthly, 0);
  return { monthlyTotal, annualTotal: monthlyTotal * 12, lines, unknownIds, skillId, frequencyId, regionId };
}

/**
 * The reference list handed to the model when it prices a custom request.
 *
 * It used to come out of the request body, which meant the browser told us what
 * our own services cost before asking for a comparable price — so a caller
 * could talk the model into any figure by sending an inflated catalogue. It
 * comes from our records now.
 */
export async function referenceCatalogue(entity: string, limit = 40): Promise<Array<{
  name: string; category: string; baseMonthlyPrice: number; unit: string;
}>> {
  const { services } = await loadCatalogue();
  const list = services[String(entity || '')] || services['homeowner'] || [];
  return list.slice(0, limit).map((s) => ({
    name: s.name, category: s.category, baseMonthlyPrice: s.baseMonthlyPrice, unit: s.unit,
  }));
}
