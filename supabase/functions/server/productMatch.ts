/**
 * Deciding that two suppliers are selling the same thing.
 *
 * WHY THIS IS THE HARD PART OF THE MATERIALS HUB
 *
 * The customer picks the product and the platform resolves the supplier, which
 * only means anything when two vendors' lines can be recognised as one product.
 * But suppliers agree on nothing: SKUs are their own, names are whatever
 * somebody typed into their ERP, and "2x4-8 PT" and "2X4 PRESSURE TREATED 8FT"
 * are the same board written by two different people.
 *
 * And the cost of being wrong is not a tidy-up. A wrong merge puts one
 * supplier's price against another supplier's product, so the customer's job is
 * quoted from an item nobody is going to deliver — silently, because the number
 * looks exactly like a right one.
 *
 * SO NOTHING HERE APPLIES ANYTHING
 *
 * This module only ever PROPOSES, with a confidence and the reason attached, and
 * a person ticks it. That is the same rule the returned-bid reader follows, for
 * the same reason: an automated system writing money into a customer quote on
 * its own produces the worst kind of error — a wrong number nobody typed and
 * nobody checked.
 *
 * Below `AUTO_TICK` a proposal is shown and left unticked. Hiding it would drop
 * real work; ticking it would price the job wrong.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not expand abbreviations. Teaching it that "PT" is "pressure treated"
 * invites it to decide that "GALV" is "galvanized" and then that "4/4" is "1x",
 * and each of those is a guess that produces confident nonsense. It normalises
 * FORM — case, spacing, punctuation, inch marks — and compares words.
 */

/** At or above this, a proposal arrives pre-ticked. Below, shown and left off. */
export const AUTO_TICK = 0.7;

/** Below this, not worth showing at all. */
export const FLOOR = 0.45;

export interface MatchCandidate {
  productId: string;
  name: string;
  unit: string;
  category: string;
  /** The SKUs of the offers against this product, from all vendors. */
  skus: string[];
  /** The vendors offering it. Used to keep same-vendor pairs out. */
  vendorIds: string[];
}

export interface MatchProposal {
  a: string;
  b: string;
  confidence: number;
  /** Why, in words a person reviewing it can check. */
  reason: string;
  /** True when it arrives pre-ticked. */
  ticked: boolean;
}

/**
 * Normalise the FORM of a description, never its meaning.
 *
 * Inch marks are the one substitution made, because a supplier writing 7/16"
 * and one writing 7/16 in are not disagreeing about anything.
 */
export function normaliseName(raw: string): string {
  return String(raw ?? '')
    .toLowerCase()
    // Inch marks, in all the forms a spreadsheet produces.
    .replace(/[""″]/g, '"')
    .replace(/(\d)\s*"/g, '$1 in')
    .replace(/['′]/g, "'")
    .replace(/(\d)\s*'/g, '$1 ft')
    // 2X4 and 2 x 4 are 2x4.
    .replace(/(\d)\s*[x×]\s*(\d)/g, '$1x$2')
    // Punctuation that only ever separates.
    .replace(/[,;:()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A unit, with the synonyms suppliers actually use. Units are safe to map. */
const UNIT_SYNONYMS: Record<string, string> = {
  ea: 'each', each: 'each', pc: 'each', pcs: 'each', piece: 'each', unit: 'each',
  lf: 'lf', linearfoot: 'lf', linft: 'lf', lnft: 'lf',
  sf: 'sf', sqft: 'sf', squarefoot: 'sf',
  sht: 'sheet', sheet: 'sheet', pnl: 'sheet', panel: 'sheet',
  bx: 'box', box: 'box', cs: 'case', case: 'case',
  bdl: 'bundle', bundle: 'bundle', bnd: 'bundle',
  gal: 'gal', gallon: 'gal', qt: 'qt', quart: 'qt',
  lb: 'lb', lbs: 'lb', pound: 'lb',
  mbf: 'mbf', bf: 'bf', boardfoot: 'bf',
  roll: 'roll', rl: 'roll', bag: 'bag', tube: 'tube', pail: 'pail',
};

export function normaliseUnit(raw: string): string {
  const key = String(raw ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return UNIT_SYNONYMS[key] || key;
}

const tokens = (name: string) => new Set(normaliseName(name).split(' ').filter(Boolean));

/** Overlap of two word sets, 0 to 1. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

/** A SKU compared across suppliers, punctuation and case removed. */
const skuKey = (raw: string) => String(raw ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Score one pair. Returns null when they should not be offered at all.
 *
 * Two hard refusals come before any scoring, and neither is a judgement call:
 *
 *   DIFFERENT UNITS are different products. A board priced each and a board
 *   priced per thousand board feet cannot be the same line, and merging them
 *   would put a per-piece price against a per-MBF quantity.
 *
 *   THE SAME VENDOR ON BOTH SIDES is not a merge. Two lines one supplier chose
 *   to list separately are two products as far as they are concerned, and the
 *   importer already collapses their genuine duplicates by SKU.
 */
export function scorePair(a: MatchCandidate, b: MatchCandidate): MatchProposal | null {
  if (a.productId === b.productId) return null;
  if (normaliseUnit(a.unit) !== normaliseUnit(b.unit)) return null;

  const sharedVendor = a.vendorIds.some((v) => b.vendorIds.includes(v));
  if (sharedVendor) return null;

  const nameA = normaliseName(a.name);
  const nameB = normaliseName(b.name);
  const sameName = Boolean(nameA) && nameA === nameB;

  const skusA = new Set(a.skus.map(skuKey).filter((s) => s.length >= 4));
  const skusB = new Set(b.skus.map(skuKey).filter((s) => s.length >= 4));
  let sharedSku = '';
  for (const s of skusA) if (skusB.has(s)) { sharedSku = s; break; }

  const overlap = jaccard(tokens(a.name), tokens(b.name));
  const sameCategory =
    Boolean(a.category) && a.category.toLowerCase().trim() === b.category.toLowerCase().trim();

  let confidence = 0;
  let reason = '';

  if (sameName && sharedSku) {
    confidence = 0.97;
    reason = `Same name and both carry the item number ${sharedSku.toUpperCase()}.`;
  } else if (sameName) {
    confidence = 0.9;
    reason = 'The descriptions are identical once spacing and punctuation are ignored.';
  } else if (sharedSku) {
    // A shared item number across two suppliers is usually the manufacturer's
    // part number, which is the strongest signal available — and it is still not
    // certain, because some distributors number their own way.
    confidence = 0.85;
    reason = `Both suppliers use the item number ${sharedSku.toUpperCase()}, which is usually the manufacturer's.`;
  } else if (overlap >= 0.8 && sameCategory) {
    confidence = 0.72;
    reason = `The descriptions share ${Math.round(overlap * 100)}% of their words and the category matches.`;
  } else if (overlap >= 0.8) {
    confidence = 0.6;
    reason = `The descriptions share ${Math.round(overlap * 100)}% of their words, but the categories differ.`;
  } else if (overlap >= 0.6) {
    confidence = 0.5;
    reason = `The descriptions share ${Math.round(overlap * 100)}% of their words. Worth a look.`;
  } else {
    return null;
  }

  if (confidence < FLOOR) return null;

  return {
    a: a.productId,
    b: b.productId,
    confidence: Math.round(confidence * 100) / 100,
    reason,
    ticked: confidence >= AUTO_TICK,
  };
}

/**
 * Every pair worth showing, strongest first.
 *
 * A product already in a stronger proposal is not offered again in a weaker one:
 * reviewing "is A the same as B?" and then "is A the same as C?" invites
 * somebody to tick both, and A cannot be two products.
 */
export function proposeMerges(candidates: MatchCandidate[], limit = 100): MatchProposal[] {
  const all: MatchProposal[] = [];
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const p = scorePair(candidates[i], candidates[j]);
      if (p) all.push(p);
    }
  }
  all.sort((x, y) => y.confidence - x.confidence);

  const claimed = new Set<string>();
  const out: MatchProposal[] = [];
  for (const p of all) {
    if (claimed.has(p.a) || claimed.has(p.b)) continue;
    claimed.add(p.a);
    claimed.add(p.b);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}
