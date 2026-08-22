/**
 * What to offer a condo, to whom, and the reason for saying so.
 *
 * A CONDO IS TWO CUSTOMERS
 *
 * The association is responsible for the common elements and the building
 * envelope; the owner is responsible for everything inside their unit walls.
 * That is the legal boundary of a condominium, and it means the same building
 * yields two buyers with entirely different shopping lists. An offer aimed at
 * the wrong one is not merely off-target — it is something the recipient has no
 * authority to buy.
 *
 * So every offer below declares an `audience`, and the split is decided before
 * season or location or anything else.
 *
 * WHY EVERY OFFER CARRIES A REASON
 *
 * This module is one `townLoads.ts` away from the rule that module states
 * plainly: a figure is looked up and carries its source, never inferred,
 * because a plausible guess will be believed. A sell screen shown to a paying
 * board is exactly that situation. So nothing here is generated, estimated or
 * projected. Each recommendation names the fact that produced it — the month,
 * the town's recorded ground snow load, the frost depth, the number of units —
 * and where a fact is missing the offer that depends on it simply does not
 * appear.
 *
 * There are deliberately no revenue projections and no market sizing. We do not
 * hold the data for either.
 */

/** Which side of the condominium boundary an offer belongs to. */
export type OfferAudience = 'owner' | 'association';

export interface CondoOffer {
  id: string;
  audience: OfferAudience;
  title: string;
  /** What the work actually is, in a sentence. */
  blurb: string;
  /** Why this is being suggested now, stated as fact rather than persuasion. */
  reason: string;
  /** The service name to carry into a work request, from the real service list. */
  service: string;
  /** Set only where a real published price exists. Otherwise it is a quote. */
  price?: string;
  /** Higher sorts first. Driven by evidence strength, not by margin. */
  weight: number;
  /** Seasonal offers say which season, so an owner can see it is timing. */
  season?: string;
}

export interface CondoFacts {
  /** The association record. */
  name?: string;
  address?: string;
  unitCount?: number;
  buildings?: number;
  /** From lookupTownLoads(). Null when the town has no record on file. */
  town?: {
    townName?: string;
    state?: string;
    groundSnowPsf?: number;
    frostDepthIn?: number;
    codeEdition?: string;
    loadSource?: string;
  } | null;
  /** Defaults to today. Injected so the reasoning can be tested. */
  now?: Date;
}

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

/** New England seasons, as they affect building work rather than the calendar. */
export function seasonOf(date: Date): Season {
  const m = date.getMonth(); // 0-11
  if (m <= 1 || m === 11) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}

/** A town's snow load only counts as heavy once a record actually says so. */
const HEAVY_SNOW_PSF = 50;
/** Frost depth at or past this drives heave in walkways, steps and footings. */
const DEEP_FROST_IN = 48;

/**
 * The offers worth putting in front of this condo right now.
 *
 * Returns both audiences; the caller filters by who is looking. Sorted by the
 * strength of the evidence behind them, so the best-supported recommendation
 * leads rather than the most expensive one.
 */
export function offersFor(facts: CondoFacts): CondoOffer[] {
  const now = facts.now || new Date();
  const season = seasonOf(now);
  const units = Number(facts.unitCount) || 0;
  const buildings = Number(facts.buildings) || 0;
  const town = facts.town || null;
  const townName = String(town?.townName || '').trim();
  const snow = Number(town?.groundSnowPsf) || 0;
  const frost = Number(town?.frostDepthIn) || 0;

  const where = townName ? `in ${townName}` : 'here';
  const out: CondoOffer[] = [];

  // ── Sold to the unit owners: everything inside their walls ───────────────
  //
  // This is the company's core business pointed at a new channel. A 40-unit
  // building is 40 kitchens with a known address and a warm introduction.

  out.push({
    id: 'owner-kitchen',
    audience: 'owner',
    title: 'Kitchen renovation',
    blurb: 'Full kitchen renovation — cabinets, counters, appliances and finishes, managed end to end.',
    reason: 'Inside your unit is yours to alter. Kitchen work is what we do most of.',
    service: 'Construction / Builds',
    weight: 60,
  });

  out.push({
    id: 'owner-bath',
    audience: 'owner',
    title: 'Bathroom remodel',
    blurb: 'Bathroom remodel from fixtures and tile through to a full reconfiguration.',
    reason: 'Inside your unit is yours to alter, and bathrooms are the other half of what we build.',
    service: 'Construction / Builds',
    weight: 58,
  });

  out.push({
    id: 'owner-handyman',
    audience: 'owner',
    title: 'In-unit repairs',
    blurb: 'The list of small jobs — doors, trim, fixtures, drywall, the things that never get done.',
    reason: 'Anything inside your walls is your responsibility rather than the association’s.',
    service: 'Handyman / Repairs',
    weight: 40,
  });

  if (season === 'spring' || season === 'summer') {
    out.push({
      id: 'owner-interior-paint',
      audience: 'owner',
      title: 'Interior painting',
      blurb: 'Repaint a room or the whole unit, with the windows open.',
      reason: `It is ${season} — the one stretch of the year when interior paint can be done with ventilation.`,
      service: 'General Cleaning',
      season,
      weight: 34,
    });
  }

  // ── Sold to the association: the envelope and the common elements ────────

  if (season === 'autumn') {
    out.push({
      id: 'assoc-roof-gutter',
      audience: 'association',
      title: 'Roof and gutter check before the freeze',
      blurb: 'Inspect and clear roofs, gutters and downspouts across every building before winter.',
      reason: `It is autumn. Blocked gutters ${where} are what turn the first thaw into an ice dam and an interior claim.`,
      service: 'Handyman / Repairs',
      season: 'autumn',
      weight: 95,
    });
  }

  if (season === 'autumn' || season === 'winter') {
    out.push({
      id: 'assoc-snow',
      audience: 'association',
      title: 'Snow and ice contract',
      blurb: 'Plowing, walkway clearing and ice treatment for the common areas, on a contract rather than a call-out.',
      reason: snow >= HEAVY_SNOW_PSF
        ? `${townName || 'This town'} carries a recorded ground snow load of ${snow} psf. At that loading, roofs and walkways need a plan rather than a phone call at 6am.`
        : `It is ${season}. Walkways and drives are the association’s responsibility, and a contract costs less than emergency call-outs.`,
      service: 'Snow Removal',
      season,
      weight: snow >= HEAVY_SNOW_PSF ? 98 : 88,
    });
  }

  // Roof snow loading is worth raising on its own where the town record is
  // genuinely heavy — this is a looked-up figure, with a source, not a guess.
  if (snow >= HEAVY_SNOW_PSF && (season === 'winter' || season === 'autumn')) {
    out.push({
      id: 'assoc-roof-load',
      audience: 'association',
      title: 'Roof snow-load assessment',
      blurb: 'Check roof structures and drainage against the ground snow load the town actually requires.',
      reason: `${townName || 'This town'}’s recorded ground snow load is ${snow} psf${town?.loadSource ? ` (${town.loadSource})` : ''}. Buildings ${buildings ? `— all ${buildings} of yours — ` : ''}should be checked against it before a heavy year.`,
      service: 'Construction / Builds',
      weight: 90,
    });
  }

  if (season === 'spring') {
    out.push({
      id: 'assoc-pressure-wash',
      audience: 'association',
      title: 'Spring pressure washing',
      blurb: 'Siding, walkways and common entries washed down after the winter.',
      reason: 'It is spring. Salt and grit come off far more easily before they set for another year.',
      service: 'Pressure Washing',
      season: 'spring',
      weight: 80,
    });

    out.push({
      id: 'assoc-deck-inspect',
      audience: 'association',
      title: 'Deck and balcony inspection',
      blurb: 'Inspect balconies, decks and railings across the property for winter damage.',
      reason: snow >= HEAVY_SNOW_PSF
        ? `A winter at ${snow} psf is hard on balconies and railings. Spring is when that shows.`
        : 'Spring is when a winter’s damage to balconies and railings becomes visible.',
      service: 'Handyman / Repairs',
      season: 'spring',
      weight: 76,
    });
  }

  // Frost heave. Only offered where a frost depth has actually been recorded.
  if (frost >= DEEP_FROST_IN && (season === 'spring' || season === 'autumn')) {
    out.push({
      id: 'assoc-walkways',
      audience: 'association',
      title: 'Walkway and step repair',
      blurb: 'Reset and repair walkways, steps and entry slabs lifted by frost.',
      reason: `${townName || 'This town'} has a recorded frost depth of ${frost} inches. Anything set shallower than that moves every year, and walkways are where it is felt.`,
      service: 'Construction / Builds',
      season,
      weight: 72,
    });
  }

  if (season === 'spring' || season === 'summer') {
    out.push({
      id: 'assoc-grounds',
      audience: 'association',
      title: 'Grounds and landscaping',
      blurb: 'Mowing, beds, trimming and general grounds care across the common areas.',
      reason: `It is ${season}, and the grounds are a common element the association maintains.`,
      service: 'Lawn Care & Landscaping',
      season,
      weight: 64,
    });
  }

  // Association services rather than site work. These come from the plan
  // catalogue's own property-management add-ons, so they are things already
  // sold rather than things invented for this screen.
  out.push({
    id: 'assoc-reserve-study',
    audience: 'association',
    title: 'Reserve study',
    blurb: 'An assessment of what the buildings will need and what should be set aside for it.',
    reason: units
      ? `${units} units across ${buildings || 1} building${(buildings || 1) === 1 ? '' : 's'} is enough that a reserve schedule beats reacting.`
      : 'A reserve schedule turns capital work into a plan rather than a special assessment.',
    service: 'Property Management',
    weight: 56,
  });

  out.push({
    id: 'assoc-emergency',
    audience: 'association',
    title: 'After-hours emergency dispatch',
    blurb: 'A number that reaches a crew outside working hours, for the burst pipe at midnight.',
    reason: buildings > 1
      ? `With ${buildings} buildings, an out-of-hours failure is a question of when.`
      : 'Out-of-hours failures are the ones that cause the damage, because nobody can reach anyone.',
    service: 'Property Management',
    weight: 52,
  });

  return out.sort((a, b) => b.weight - a.weight);
}

/** Just the ones this viewer is able to act on. */
export function offersForAudience(facts: CondoFacts, audience: OfferAudience): CondoOffer[] {
  return offersFor(facts).filter((o) => o.audience === audience);
}

/**
 * What the town record contributed, said plainly.
 *
 * Shown so a board can see which recommendations rest on their town's own
 * figures and which are simply seasonal — and so an absent record reads as
 * absent rather than as nothing to say.
 */
export function townBasis(facts: CondoFacts): { hasRecord: boolean; line: string } {
  const t = facts.town;
  const name = String(t?.townName || '').trim();
  const snow = Number(t?.groundSnowPsf) || 0;
  const frost = Number(t?.frostDepthIn) || 0;

  if (!t || (!snow && !frost && !t.codeEdition)) {
    return {
      hasRecord: false,
      line: name
        ? `No building-department figures are on file for ${name} yet, so the suggestions below are seasonal only.`
        : 'No town record is on file for this address yet, so the suggestions below are seasonal only.',
    };
  }

  const parts: string[] = [];
  if (snow) parts.push(`${snow} psf ground snow load`);
  if (frost) parts.push(`${frost}in frost depth`);
  if (t.codeEdition) parts.push(t.codeEdition);
  return {
    hasRecord: true,
    line: `Using ${name || 'this town'}’s recorded figures — ${parts.join(', ')}${t.loadSource ? ` (${t.loadSource})` : ''}.`,
  };
}
