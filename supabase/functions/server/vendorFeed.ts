/**
 * Turning whatever a vendor's API returns into catalogue lines.
 *
 * WHY IT LOOKS LIKE THE CSV IMPORTER
 *
 * Because it is the same problem. No two suppliers agree on what to call a
 * price, and the CSV importer already solved that with a mapping the vendor
 * confirms rather than a guess the software applies. A feed is the same thing
 * arriving over HTTP instead of in a file, so it gets the same treatment and
 * lands through the same import route — one set of validation rules, one
 * update-by-SKU behaviour, one way of reporting what was rejected.
 *
 * WHAT IS DIFFERENT ABOUT A FEED
 *
 * A CSV is a grid. JSON is a shape nobody agreed on: the products might be the
 * whole response, or under `data`, `items`, `products`, `results`, or nested two
 * levels down. So there is a step a CSV does not need — finding the array — and
 * it is a guess that gets shown to the vendor rather than applied silently.
 */

/** Our fields, same names the CSV importer uses. */
export type FeedField = 'name' | 'sku' | 'category' | 'unit' | 'price' | 'availability' | 'leadTimeDays';

export const REQUIRED_FEED_FIELDS: FeedField[] = ['name', 'price'];

/**
 * Where the product array lives in a response.
 *
 * Ordered: an explicitly named collection beats the bare array, because a
 * response that is itself an array is unambiguous but one with several arrays
 * needs the most likely name to win.
 */
const ARRAY_KEYS = ['products', 'items', 'data', 'results', 'catalog', 'catalogue', 'records', 'rows', 'list'];

export interface FoundArray {
  rows: any[];
  /** Dotted path to it, shown to the vendor so the guess is visible. */
  path: string;
}

/**
 * Find the products in a parsed response.
 *
 * Searches two levels deep, which covers `{ data: { products: [...] } }` — a
 * common envelope — without wandering through an arbitrarily nested document
 * looking for anything array-shaped.
 */
export function findProductArray(payload: any): FoundArray | null {
  if (Array.isArray(payload)) return { rows: payload, path: '(top level)' };
  if (!payload || typeof payload !== 'object') return null;

  for (const key of ARRAY_KEYS) {
    if (Array.isArray(payload[key])) return { rows: payload[key], path: key };
  }
  for (const [k, v] of Object.entries(payload)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const key of ARRAY_KEYS) {
        if (Array.isArray((v as any)[key])) return { rows: (v as any)[key], path: `${k}.${key}` };
      }
    }
  }
  // Last resort: any array of objects at the top level.
  for (const [k, v] of Object.entries(payload)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') return { rows: v, path: k };
  }
  return null;
}

/** Field names seen in the wild, normalised. Mirrors the CSV importer's list. */
const FIELD_ALIASES: Array<[FeedField, string[]]> = [
  ['price', ['unitprice', 'listprice', 'yourprice', 'netprice', 'price', 'cost', 'unitcost', 'list', 'net', 'rate', 'amount']],
  ['sku', ['sku', 'itemnumber', 'item', 'itemno', 'itemcode', 'partnumber', 'partno', 'partcode', 'productcode', 'mpn', 'modelnumber', 'model', 'code', 'id']],
  ['name', ['name', 'description', 'productname', 'itemdescription', 'itemname', 'product', 'title', 'desc', 'shortdescription']],
  ['unit', ['unit', 'uom', 'unitofmeasure', 'units', 'measure', 'per', 'packaging']],
  ['category', ['category', 'productcategory', 'group', 'productgroup', 'class', 'department', 'type', 'family']],
  ['availability', ['availability', 'available', 'stock', 'stockstatus', 'instock', 'status', 'inventory']],
  ['leadTimeDays', ['leadtime', 'leadtimedays', 'leaddays', 'daystoship', 'shipsin', 'lead']],
];

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * A first guess at the mapping, from the keys the sample rows actually carry.
 *
 * Shown to the vendor to correct, never applied on its own — the same rule the
 * CSV importer follows, and for the same reason: a sheet or a feed carrying both
 * "Unit Price" and "Unit" maps backwards under any naive matcher, and every
 * product silently ends up priced "each".
 */
export function guessFeedMapping(rows: any[]): Partial<Record<FeedField, string>> {
  const keys = new Set<string>();
  for (const row of rows.slice(0, 20)) {
    if (row && typeof row === 'object') for (const k of Object.keys(row)) keys.add(k);
  }
  const available = [...keys];
  const out: Partial<Record<FeedField, string>> = {};
  const taken = new Set<string>();

  for (const [field, aliases] of FIELD_ALIASES) {
    let hit = available.find((k) => !taken.has(k) && aliases.includes(normalise(k)));
    if (!hit) {
      hit = available.find((k) => {
        if (taken.has(k)) return false;
        const n = normalise(k);
        return n.length > 2 && aliases.some((a) => n === a || n.startsWith(a));
      });
    }
    if (hit) { out[field] = hit; taken.add(hit); }
  }
  return out;
}

/** What is still missing before a sync can run. */
export function missingFeedFields(mapping: Partial<Record<FeedField, string>>): FeedField[] {
  return REQUIRED_FEED_FIELDS.filter((f) => !mapping[f]);
}

/**
 * A price from whatever the feed put in that field.
 *
 * JSON gives numbers more often than a spreadsheet does, but not always: prices
 * arrive as `"14.20"`, `"$14.20"`, and occasionally as `{ amount: 14.2 }`.
 * Returns null rather than zero when there is no number, because zero is a free
 * product and null is a rejected row.
 */
export function feedPrice(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? Math.round(raw * 100) / 100 : null;
  if (typeof raw === 'object') {
    for (const k of ['amount', 'value', 'price']) {
      if (k in raw) return feedPrice((raw as any)[k]);
    }
    return null;
  }
  const cleaned = String(raw).replace(/[^0-9.,-]/g, '');
  if (!cleaned || !/[0-9]/.test(cleaned)) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let n = cleaned;
  if (lastComma > -1 && lastDot > -1) {
    n = lastComma > lastDot ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  } else if (lastComma > -1) {
    n = /,\d{2}$/.test(cleaned) ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  }
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
}

export interface FeedRow {
  name: string; sku: string; category: string; unit: string;
  price: number; availability: string; leadTimeDays: number | null;
  /** 1-based position in the feed, so a rejection can be pointed at something. */
  line: number;
}

export interface FeedResult {
  rows: FeedRow[];
  rejected: Array<{ line: number; reason: string }>;
  duplicates: number;
}

/**
 * Build catalogue lines from the feed, given the confirmed mapping.
 *
 * Rejections carry a position and a reason, because a feed that imports 1,830
 * of 1,842 lines quietly becomes twelve materials missing from a quote.
 */
export function buildFeedRows(
  rows: any[],
  mapping: Partial<Record<FeedField, string>>,
): FeedResult {
  const out: FeedRow[] = [];
  const rejected: Array<{ line: number; reason: string }> = [];
  const seen = new Set<string>();
  let duplicates = 0;

  const at = (row: any, f: FeedField): any => {
    const key = mapping[f];
    return key === undefined ? undefined : row?.[key];
  };
  const text = (v: any, max: number) =>
    (v === null || v === undefined || typeof v === 'object' ? '' : String(v)).trim().slice(0, max);

  rows.forEach((row, i) => {
    const line = i + 1;
    if (!row || typeof row !== 'object') {
      rejected.push({ line, reason: 'That entry is not a product object.' });
      return;
    }

    const name = text(at(row, 'name'), 200);
    if (!name) { rejected.push({ line, reason: 'No product name in the mapped name field.' }); return; }

    const price = feedPrice(at(row, 'price'));
    if (price === null) {
      rejected.push({ line, reason: `No usable price — the price field reads "${text(at(row, 'price'), 40) || '(empty)'}".` });
      return;
    }

    const sku = text(at(row, 'sku'), 60);
    if (sku) {
      const key = sku.toLowerCase();
      if (seen.has(key)) { duplicates++; return; }
      seen.add(key);
    }

    const leadRaw = at(row, 'leadTimeDays');
    const leadMatch = /(\d+)/.exec(String(leadRaw ?? ''));
    const lead = leadMatch ? Number(leadMatch[1]) : null;

    out.push({
      name, sku,
      category: text(at(row, 'category'), 80),
      unit: text(at(row, 'unit'), 24) || 'each',
      price,
      availability: text(at(row, 'availability'), 80),
      leadTimeDays: lead !== null && lead >= 0 && lead <= 3650 ? lead : null,
      line,
    });
  });

  return { rows: out, rejected, duplicates };
}
