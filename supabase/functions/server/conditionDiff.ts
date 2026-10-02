/**
 * What changed between the way in and the way out.
 *
 * This file decides what a tenant can be charged for out of their deposit, so
 * it is worth reading the four decisions in it before changing anything.
 *
 * ONE. THE SIGNED RECORD GOVERNS.
 *
 * A move-in or move-out checklist holds two accounts of every area. The landlord
 * records theirs in `data.areas`; the tenant's copy is seeded from it, they
 * adjust what they disagree with, and they SIGN, which lands in
 * `tenantResponses.areas`. The signed version is the record of record — it is
 * the one both parties put their name to, and the landlord's own draft is a
 * document the tenant was invited to correct.
 *
 * So the comparison runs on the signed readings. Where the landlord's differ,
 * that is surfaced as a disagreement rather than resolved in either direction:
 * a landlord who thinks the signed move-out reading is too generous escalates
 * the line deliberately, and the report records that they did.
 *
 * TWO. WEAR IS NOT CHARGEABLE. DAMAGE IS.
 *
 * Every state draws this line and this report exists to act on it. A one-step
 * drop is somebody having lived in a flat; a drop onto Damaged is damage. The
 * default is WEAR, which charges nothing, and a person escalates per line —
 * meaning the automatic step never makes the accusation. A document that charged
 * somebody because a scale moved one notch would not survive being handed to
 * them, and this one is built to be handed to them.
 *
 * THREE. NO BASELINE MEANS NOTHING IS CHARGEABLE.
 *
 * Without a completed move-in record there is no evidence the tenant caused
 * anything, and a deduction that cannot show the before cannot be defended. So
 * a missing baseline is reported as its own state rather than treated as
 * "Excellent on arrival", which is the assumption that would quietly charge a
 * tenant for a flat that was already worn when they got there.
 *
 * FOUR. TENANCY LENGTH IS SHOWN, NOT APPLIED.
 *
 * A one-step drop in three months reads differently from the same drop in four
 * years, and it is the argument that comes up most. It is still not folded into
 * the classification: that would add a second axis to a judgement a person is
 * making anyway, and two rules interacting is harder to defend than one rule
 * plus a stated fact. `tenancyMonths` is on the result so the report can show
 * it.
 */

/** Worst last. The index is the position, so a bigger number is a worse area. */
export const CONDITION_SCALE = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

/** The index of the worst condition, which is always chargeable when reached. */
const DAMAGED_INDEX = CONDITION_SCALE.length - 1;

export type Classification =
  | 'improved'
  | 'unchanged'
  /** Deterioration consistent with living there. Listed, never charged. */
  | 'wear'
  /** Chargeable against the deposit. */
  | 'damage'
  /** No move-in reading for this area, so nothing can be proven. */
  | 'no_baseline'
  /** A condition that is not on the scale, so no comparison is possible. */
  | 'unreadable';

export interface AreaMedia { id: string; name: string; type: string }

/** One end of the comparison for one area. */
export interface SideReading {
  /** The condition on the signed record, as written. */
  condition: string | null;
  /** Its position on the scale, or null when it is not on the scale. */
  index: number | null;
  notes: string;
  media: AreaMedia[];
  /** False when the tenant never signed, which makes this a weaker record. */
  signed: boolean;
  /** The landlord's own reading, present only when it differs from the signed one. */
  landlordCondition?: string | null;
  recordedOn: string | null;
}

export interface ConditionLine {
  area: string;
  moveIn: SideReading | null;
  moveOut: SideReading | null;
  /** How many steps worse it got. Negative is better. Null when incomparable. */
  steps: number | null;
  classification: Classification;
  /** Whether this line may take money from the deposit. */
  chargeable: boolean;
  /** The landlord and the tenant recorded different conditions at one end. */
  disputed: boolean;
  /** Present when a person overrode the automatic classification. */
  override?: ConditionOverride;
  /** One sentence, written to be read on the report itself. */
  why: string;
}

export interface ConditionOverride {
  area: string;
  classification: 'wear' | 'damage';
  by: string;
  at: string;
  reason?: string;
}

export interface ConditionDiff {
  lines: ConditionLine[];
  chargeableAreas: number;
  disputedAreas: number;
  /** Whole months between the two records, where both are dated. */
  tenancyMonths: number | null;
  /** True when there is no completed move-in record at all. */
  noBaseline: boolean;
  /** Things that belong on the face of the report. */
  notes: string[];
}

const str = (value: unknown): string => (value == null ? '' : String(value));

/** Where a condition sits on the scale, case and padding forgiven. */
export function conditionIndex(condition: unknown): number | null {
  const want = str(condition).trim().toLowerCase();
  if (!want) return null;
  const at = CONDITION_SCALE.findIndex((c) => c.toLowerCase() === want);
  return at < 0 ? null : at;
}

function mediaFrom(value: unknown): AreaMedia[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((m: any) => m && m.id)
    .map((m: any) => ({ id: String(m.id), name: str(m.name), type: str(m.type) || 'image' }));
}

/** The areas off one form, indexed by area name. */
function areasByName(rows: unknown): Map<string, any> {
  const out = new Map<string, any>();
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    const name = str(row?.name).trim();
    if (name && !out.has(name)) out.set(name, row);
  }
  return out;
}

/**
 * One end of the comparison, built from the signed record where there is one.
 *
 * The landlord's reading is carried only when it DIFFERS, because a report that
 * repeated an agreed figure twice would bury the one case that matters.
 */
function readingFor(
  area: string,
  signedAreas: Map<string, any>,
  landlordAreas: Map<string, any>,
  signed: boolean,
  recordedOn: string | null,
): SideReading | null {
  const primary = (signed ? signedAreas.get(area) : null) || landlordAreas.get(area);
  if (!primary) return null;

  const landlordRow = landlordAreas.get(area);
  const condition = str(primary.condition).trim() || null;
  const landlordCondition = str(landlordRow?.condition).trim() || null;
  const differs = signed && landlordCondition !== null && landlordCondition !== condition;

  return {
    condition,
    index: conditionIndex(condition),
    notes: str(primary.notes),
    // Evidence from BOTH accounts of the area, because a photo the landlord took
    // and one the tenant took are both evidence and neither supersedes the other.
    media: [...mediaFrom(primary.media), ...mediaFrom(signed ? landlordRow?.media : null)]
      .filter((m, i, all) => all.findIndex((x) => x.id === m.id) === i),
    signed,
    landlordCondition: differs ? landlordCondition : undefined,
    recordedOn,
  };
}

/** Whole months between two dates, or null where either is missing. */
export function monthsBetween(from: unknown, to: unknown): number | null {
  const a = new Date(str(from));
  const b = new Date(str(to));
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  // Not yet a full month if the day of the month has not come round.
  const whole = b.getDate() < a.getDate() ? months - 1 : months;
  return whole < 0 ? 0 : whole;
}

/**
 * Classify one area's change.
 *
 * Deliberately knows nothing about money, dates or who is asking — it answers
 * only "is this wear or is this damage", which is the question a deduction
 * stands or falls on.
 */
export function classify(moveInIndex: number | null, moveOutIndex: number | null): {
  classification: Classification; steps: number | null; why: string;
} {
  if (moveInIndex === null && moveOutIndex === null) {
    return { classification: 'unreadable', steps: null, why: 'No condition was recorded at either end.' };
  }
  if (moveInIndex === null) {
    return {
      classification: 'no_baseline', steps: null,
      why: 'No move-in condition for this area, so there is nothing to compare against and nothing chargeable.',
    };
  }
  if (moveOutIndex === null) {
    return {
      classification: 'unreadable', steps: null,
      why: 'The move-out condition is not on the scale, so no comparison is possible.',
    };
  }

  const steps = moveOutIndex - moveInIndex;
  if (steps < 0) {
    return { classification: 'improved', steps, why: 'Better than on arrival.' };
  }
  if (steps === 0) {
    return { classification: 'unchanged', steps, why: 'Unchanged since arrival.' };
  }
  if (moveOutIndex === DAMAGED_INDEX) {
    return {
      classification: 'damage', steps,
      why: `Recorded as ${CONDITION_SCALE[DAMAGED_INDEX]} on the way out, from `
        + `${CONDITION_SCALE[moveInIndex]} on arrival.`,
    };
  }
  if (steps >= 2) {
    return {
      classification: 'damage', steps,
      why: `Dropped ${steps} steps, from ${CONDITION_SCALE[moveInIndex]} to `
        + `${CONDITION_SCALE[moveOutIndex]}.`,
    };
  }
  return {
    classification: 'wear', steps,
    why: `One step, from ${CONDITION_SCALE[moveInIndex]} to ${CONDITION_SCALE[moveOutIndex]} — `
      + 'treated as wear and not charged unless somebody says otherwise.',
  };
}

/** Only these two can ever take money, and only after a person has looked. */
const CHARGEABLE = new Set<Classification>(['damage']);

/**
 * Compare a completed move-in checklist against a completed move-out checklist.
 *
 * Both are the form records as stored: `data.areas` is the landlord's own
 * reading and `tenantResponses.areas` is what the tenant signed.
 */
export function compareConditions(
  moveIn: any,
  moveOut: any,
  overrides: ConditionOverride[] = [],
): ConditionDiff {
  const notes: string[] = [];

  const inSigned = areasByName(moveIn?.tenantResponses?.areas);
  const inLandlord = areasByName(moveIn?.data?.areas);
  const outSigned = areasByName(moveOut?.tenantResponses?.areas);
  const outLandlord = areasByName(moveOut?.data?.areas);

  const inIsSigned = inSigned.size > 0;
  const outIsSigned = outSigned.size > 0;
  const noBaseline = inSigned.size === 0 && inLandlord.size === 0;

  if (noBaseline) {
    notes.push('There is no completed move-in record for this tenancy. Without one, nothing can '
      + 'be charged against the deposit: a deduction has to be able to show the condition on '
      + 'arrival.');
  }
  if (!inIsSigned && inLandlord.size > 0) {
    notes.push('The move-in checklist was never signed by the tenant, so the arrival condition is '
      + "the landlord's own record rather than an agreed one. It is weaker evidence.");
  }
  if (!outIsSigned && outLandlord.size > 0) {
    notes.push('The move-out checklist was never signed by the tenant, so the departure condition '
      + "is the landlord's own record rather than an agreed one.");
  }

  /* Every area either record mentions, in the order they were walked. */
  const order: string[] = [];
  for (const map of [outSigned, outLandlord, inSigned, inLandlord]) {
    for (const name of map.keys()) if (!order.includes(name)) order.push(name);
  }

  const overrideFor = new Map<string, ConditionOverride>();
  for (const o of overrides || []) {
    const area = str(o?.area).trim();
    if (area && (o?.classification === 'wear' || o?.classification === 'damage')) {
      overrideFor.set(area, { ...o, area });
    }
  }

  const tenancyMonths = monthsBetween(
    moveIn?.completedAt || moveIn?.createdAt,
    moveOut?.completedAt || moveOut?.createdAt,
  );

  const lines: ConditionLine[] = order.map((area) => {
    const inReading = readingFor(area, inSigned, inLandlord, inIsSigned, moveIn?.completedAt || null);
    const outReading = readingFor(area, outSigned, outLandlord, outIsSigned, moveOut?.completedAt || null);

    const base = noBaseline || !inReading
      ? {
        classification: 'no_baseline' as Classification, steps: null,
        why: 'No move-in condition for this area, so there is nothing to compare against and nothing chargeable.',
      }
      : classify(inReading.index, outReading?.index ?? null);

    const disputed = Boolean(inReading?.landlordCondition || outReading?.landlordCondition);

    let classification = base.classification;
    let why = base.why;
    const override = overrideFor.get(area);

    /*
     * An override can move a line between wear and damage and nothing else.
     *
     * It cannot manufacture a baseline that does not exist, and it cannot charge
     * for an area that is unchanged or better than on arrival — those are not
     * judgement calls, they are the absence of a thing to judge. Allowing it
     * would make the override a way to charge for anything at all.
     */
    const overridable = classification === 'wear' || classification === 'damage';
    if (override && overridable) {
      classification = override.classification;
      why = override.reason?.trim()
        ? `${override.reason.trim()} (recorded by ${override.by})`
        : `Set to ${override.classification} by ${override.by}.`;
    }

    if (disputed) {
      const ends: string[] = [];
      if (inReading?.landlordCondition) ends.push(`on arrival the landlord recorded ${inReading.landlordCondition}, the tenant signed ${inReading.condition}`);
      if (outReading?.landlordCondition) ends.push(`on departure the landlord recorded ${outReading.landlordCondition}, the tenant signed ${outReading.condition}`);
      why += ` The two accounts differ: ${ends.join('; ')}.`;
    }

    return {
      area,
      moveIn: inReading,
      moveOut: outReading,
      steps: base.steps,
      classification,
      chargeable: CHARGEABLE.has(classification),
      disputed,
      override: override && overridable ? override : undefined,
      why,
    };
  });

  const disputedAreas = lines.filter((l) => l.disputed).length;
  if (disputedAreas > 0) {
    notes.push(`${disputedAreas} area${disputedAreas === 1 ? '' : 's'} where the landlord and the `
      + 'tenant recorded different conditions. Those are the lines to settle first.');
  }

  return {
    lines,
    chargeableAreas: lines.filter((l) => l.chargeable).length,
    disputedAreas,
    tenancyMonths,
    noBaseline,
    notes,
  };
}
