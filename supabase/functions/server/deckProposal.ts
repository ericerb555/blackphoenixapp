/**
 * The deck the customer is asking for, built against the one that is there.
 *
 * Eric: "then it should read what the customer is requestiong and prep a new
 * build that i can review and then render".
 *
 * THE ONE DISTINCTION THIS FILE EXISTS FOR
 *
 * A customer's dimension means opposite things on the two decks, and getting
 * that backwards is the whole risk here:
 *
 *   AS-BUILT    "the deck is 20 by 14" is HEARSAY. It is a claim about
 *               something measurable that nobody measured, and
 *               `deckObservationReply` refuses to promote it — a wrong
 *               as-built misprices demolition, footings and disposal.
 *
 *   PROPOSAL    "I want it 20 by 16" is a REQUIREMENT. It is the customer
 *               telling us what to build, which is the most reliable
 *               information on the job and the only source for it.
 *
 * So the same sentence is rejected on one deck and honoured on the other. Both
 * are right, and nothing else in this feature would make sense if they were
 * treated the same.
 *
 * WHAT IT STILL WILL NOT DO
 *
 * Invent a requirement. A customer who said nothing about size gets the
 * existing size, recorded as "kept". Every field on the proposal says whether
 * it was REQUESTED or KEPT, so Eric reviewing it can see what the customer
 * actually asked for versus what is simply unchanged — and `asked` lists the
 * things worth a phone call rather than a guess.
 *
 * Nothing here prices anything or sends anything. It prepares a model for
 * `DeckDesigner`, which is what Eric asked for: "prep a new build that i can
 * review and then render".
 */

import type { DeckModel, LumberSize, PostSize, JoistSpacing } from './deckFromObservation.ts';

/** Where a value on the proposal came from. */
export type Provenance = 'requested' | 'kept' | 'code';

export interface ChangeNote {
  field: string;
  from: string;
  to: string;
  why: Provenance;
}

/**
 * What the customer asked for, after validation.
 *
 * Every field optional, because silence is the normal case and must not become
 * a change. Absent means "keep what is there".
 */
export interface DeckChanges {
  widthFt?: number | null;
  depthFt?: number | null;
  heightFt?: number | null;
  /** They want stairs added or taken away. */
  stairs?: boolean | null;
  stairWidthFt?: number | null;
  guardrail?: boolean | null;
  /** Finish ids from `deckFinishes.ts`. Not validated against the catalogue
   *  here — the designer offers the real list and this only carries a wish. */
  deckingFinish?: string | null;
  railFinish?: string | null;
  /** Things the request mentions that this cannot turn into a deck. */
  asked?: string[] | null;
}

export interface Proposal {
  deck: DeckModel;
  changes: ChangeNote[];
  /** Questions for the customer. Never guessed at. */
  asked: string[];
  /** True when the customer asked for nothing dimensional. */
  sizeUnchanged: boolean;
}

/*
 * SANITY BOUNDS, NOT DESIGN LIMITS.
 *
 * A deck 400 feet wide is a typo or a hallucination, and the point of refusing
 * it here is that the next step frames it, draws it and prices it. The ranges
 * are wide enough to contain anything anybody would really build.
 */
const LIMITS = {
  widthFt: [4, 60],
  depthFt: [4, 40],
  heightFt: [0, 14],
  stairWidthFt: [3, 20],
} as const;

const inBounds = (v: unknown, key: keyof typeof LIMITS): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const [lo, hi] = LIMITS[key];
  if (n < lo || n > hi) return null;
  return Math.round(n * 100) / 100;
};

const tristate = (v: unknown): boolean | null => {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return null;
};

const shortLines = (v: unknown, max = 10): string[] => {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const raw of v) {
    const t = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out;
};

const finishId = (v: unknown): string | null => {
  const t = String(v ?? '').trim();
  // An id, not a sentence. "something nicer" is a question, not a finish.
  if (!t || t.length > 40 || /\s/.test(t)) return null;
  return t;
};

/** The model would not read the request. */
export interface ProposalRefusal {
  unsure: true;
  why: string;
}

/**
 * Read the model's reading of the customer's request.
 *
 * Nothing structural is accepted here — no joist size, no beam, no footing
 * count. A customer asks for a bigger deck with composite boards and a gate;
 * they do not specify framing, and a model allowed to "request" a 2x12 joist
 * would be making an engineering decision inside a sentence about decking
 * colour. `deckStructural` sizes the framing from the span, which is the only
 * defensible source.
 */
export function readDeckChanges(raw: unknown): DeckChanges | ProposalRefusal | null {
  /*
   * An ARRAY is not a reply, and `typeof [] === 'object'` would have let one
   * through as a set of changes where every field came back null — which reads
   * downstream as "the customer asked for nothing" rather than as a broken
   * answer. Those are different things and only one of them is safe to act on.
   */
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;

  if (r.unsure === true) {
    return {
      unsure: true,
      why: String(r.why ?? '').trim().slice(0, 240) || 'Could not tell what was being asked for.',
    };
  }

  return {
    widthFt: inBounds(r.widthFt, 'widthFt'),
    depthFt: inBounds(r.depthFt, 'depthFt'),
    heightFt: inBounds(r.heightFt, 'heightFt'),
    stairs: tristate(r.stairs),
    stairWidthFt: inBounds(r.stairWidthFt, 'stairWidthFt'),
    guardrail: tristate(r.guardrail),
    deckingFinish: finishId(r.deckingFinish),
    railFinish: finishId(r.railFinish),
    asked: shortLines(r.asked),
  };
}

/** True when a reading is changes rather than a refusal. */
export function isDeckChanges(
  v: DeckChanges | ProposalRefusal | null,
): v is DeckChanges {
  return Boolean(v) && !('unsure' in (v as object));
}

const ft = (n: number) => `${Math.round(n * 100) / 100} ft`;

/**
 * The proposed deck, and a note for every field that moved.
 *
 * GUARDRAIL IS THE ONE THING THIS DECIDES ITSELF. A deck more than 30 inches
 * above grade needs a guard by code, so a customer who asks for a deck raised
 * to four feet and says nothing about railings gets one, marked `code` rather
 * than `requested`. Leaving it off because nobody mentioned it would put a
 * drawing in front of somebody that cannot be built — and marking it
 * `requested` would credit the customer with a decision they never made.
 */
export function proposeDeck(asBuilt: DeckModel, changes: DeckChanges): Proposal {
  const notes: ChangeNote[] = [];
  const deck: DeckModel = { ...asBuilt };

  const dim = (field: 'widthFt' | 'depthFt' | 'heightFt' | 'stairWidthFt') => {
    const want = changes[field];
    if (want === null || want === undefined) return;
    if (want === asBuilt[field]) return;
    notes.push({ field, from: ft(asBuilt[field]), to: ft(want), why: 'requested' });
    (deck as any)[field] = want;
  };

  dim('widthFt');
  dim('depthFt');
  dim('heightFt');
  dim('stairWidthFt');

  /*
   * The two booleans are written out rather than looped. A loop over them
   * needs `continue` for the absent case, and `absent` here is three states
   * deep — not asked, asked for false, asked for true — which reads far more
   * clearly spelled out than as a generic skip.
   */
  if (changes.stairs !== null && changes.stairs !== undefined && changes.stairs !== asBuilt.stairs) {
    notes.push({
      field: 'stairs',
      from: asBuilt.stairs ? 'stairs' : 'no stairs',
      to: changes.stairs ? 'stairs' : 'no stairs',
      why: 'requested',
    });
    deck.stairs = changes.stairs;
  }

  if (changes.guardrail !== null && changes.guardrail !== undefined
      && changes.guardrail !== asBuilt.guardrail) {
    notes.push({
      field: 'guardrail',
      from: asBuilt.guardrail ? 'guardrail' : 'no guardrail',
      to: changes.guardrail ? 'guardrail' : 'no guardrail',
      why: 'requested',
    });
    deck.guardrail = changes.guardrail;
  }

  for (const field of ['deckingFinish', 'railFinish'] as const) {
    const want = changes[field];
    if (!want || want === asBuilt[field]) continue;
    notes.push({ field, from: String(asBuilt[field]), to: want, why: 'requested' });
    deck[field] = want;
  }

  /*
   * The code guard, applied last so it sees the proposed height rather than
   * the existing one. 30 inches is the trigger in the IRC; `deckBuildSpec`
   * already states the 34"–38" handrail rule for four or more risers, and this
   * is the guard that goes with it.
   */
  if (deck.heightFt > 30 / 12 && !deck.guardrail) {
    notes.push({
      field: 'guardrail',
      from: 'no guardrail',
      to: 'guardrail',
      why: 'code',
    });
    deck.guardrail = true;
  }

  const asked = shortLines(changes.asked);

  return {
    deck,
    changes: notes,
    asked,
    sizeUnchanged: !notes.some((n) => n.field === 'widthFt' || n.field === 'depthFt' || n.field === 'heightFt'),
  };
}

/** Types re-exported so a caller needs one import. */
export type { DeckModel, LumberSize, PostSize, JoistSpacing };
