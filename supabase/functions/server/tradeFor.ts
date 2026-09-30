/**
 * What trade a customer's request needs, if we can tell.
 *
 * WHY THIS HAD TO EXIST
 *
 * The work request form asks the customer to pick a SERVICE — "Pressure
 * Washing", "Trash Removal / Hauling", "Handyman / Repairs". The estimator and
 * the scheduler speak in TRADES — `carpentry`, `laboring`, `hvac`. The two
 * lists were written for different purposes and barely overlap, and the
 * scheduler was handed the service string as though it were a trade id.
 *
 * That was harmless only while nobody had any trades recorded, because
 * `tradeMatch` treats an unrecorded technician as eligible-but-flagged. The
 * moment somebody's trades were filled in it inverted: a recorded technician
 * MUST hold the trade named, `held.includes('pressure washing')` is false for
 * everybody alive, and every request became unschedulable. Filling in the
 * roster made the schedule empty.
 *
 * THE RULE, AND WHY IT LEANS THIS WAY
 *
 * An unknown service resolves to NO TRADE, never to a guess. No trade means
 * anybody may take it, which is the same direction every other unknown in
 * `availability.ts` leans — offer them and flag it, rather than quietly
 * excluding. Guessing the other way would either exclude the whole roster from
 * a real job or claim somebody holds a trade nobody assessed them on.
 *
 * Several services map to nothing ON PURPOSE. Lawn care, pressure washing,
 * snow removal and pest control are things the company sells and the estimator
 * does not price as trades. Folding them into `laboring` so the map looks
 * complete would be inventing a qualification: it would let the scheduler tell
 * somebody they hold a trade for work nobody recorded them as doing.
 */

/**
 * Service and project-type wording, to the trade id it genuinely needs.
 *
 * Keys are compared after lowercasing and squashing whitespace, so the form's
 * exact label and a hand-typed variant both land. Only entries where the match
 * is real - a debris haul IS the 'lab-debris' task - appear here.
 */
const SERVICE_TO_TRADE: Record<string, string> = {
  // The work request form's own service list, where a trade genuinely applies.
  'trash removal / hauling': 'laboring',
  'trash removal': 'laboring',
  'trash & demo removal': 'laboring',
  'demolition': 'laboring',

  // Wording that names a trade outright, from internal requests and quotes.
  'painting': 'painting',
  'interior painting': 'painting',
  'exterior painting': 'painting',
  'roofing': 'roofing',
  'roof replacement': 'roofing',
  'siding': 'siding',
  'plumbing': 'plumbing',
  'electrical': 'electrical',
  'hvac': 'hvac',
  'heating': 'hvac',
  'cooling': 'hvac',
  'tile': 'tile',
  'tiling': 'tile',
  'flooring': 'flooring',
  'masonry': 'masonry',
  'drywall': 'sheetrock',
  'drywall & taping': 'sheetrock',
  'sheetrock': 'sheetrock',
  'carpentry': 'carpentry',
  'framing': 'carpentry',
  'deck': 'carpentry',
  'decking': 'carpentry',
  'general labour': 'laboring',
  'general labor': 'laboring',
  'laboring': 'laboring',
};

/** Every trade id the estimator knows, so a request already carrying one passes through. */
const KNOWN_TRADE_IDS = new Set([
  'carpentry', 'painting', 'electrical', 'plumbing', 'laboring', 'sheetrock',
  'siding', 'roofing', 'tile', 'flooring', 'masonry', 'hvac',
]);

const squash = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * The trade a request needs, or `undefined` for "we cannot tell".
 *
 * `undefined` is a real answer and must be passed through as an absent trade
 * rather than as an empty string — `tradeMatch` reads a missing trade as
 * "anybody may take it", which is what an unclassifiable service should mean.
 */
export function tradeFor(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    const text = squash(candidate);
    if (!text) continue;
    if (KNOWN_TRADE_IDS.has(text)) return text;
    const mapped = SERVICE_TO_TRADE[text];
    if (mapped) return mapped;
  }
  return undefined;
}

/**
 * Whether a service is one we deliberately do not treat as a trade.
 *
 * Kept separate from "we have never seen this wording" so a proposal can say
 * which it is. "Pressure washing is not a trade the roster is assessed on" is
 * useful; "we could not classify pressure washing" sounds like a fault.
 */
const NOT_A_TRADE = new Set([
  'lawn care & landscaping', 'lawn care', 'landscaping',
  'pressure washing', 'power washing',
  'general cleaning', 'deep clean', 'cleaning',
  'snow removal', 'pest control', 'property management',
  'handyman / repairs', 'construction / builds',
  'other / not sure', 'other',
]);

export function isRecognisedNonTrade(value: unknown): boolean {
  return NOT_A_TRADE.has(squash(value));
}
