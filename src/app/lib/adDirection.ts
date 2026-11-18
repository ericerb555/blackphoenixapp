/**
 * Reading back the design the model proposed for an advertisement.
 *
 * Eric, asked what an AI ad assistant should do: "it means i can attach the
 * photos a ai can create them."
 *
 * So the model is handed the photographs and the facts of the job, and answers
 * with a whole design: which photograph is the before, which is the after, how
 * to lay them out, and a line to put across it. The person then adjusts any of
 * it with the controls that already exist — this proposes, it does not publish.
 *
 * WHAT THIS FILE IS FOR IS DISTRUST
 *
 * Everything in a direction is a claim by a language model about a design that
 * is going to carry a company's name. Three of those claims can be wrong in
 * ways that are invisible once rendered, so each is checked here rather than
 * taken:
 *
 * INDICES, NOT IDENTIFIERS. The model answers with positions in the array it
 * was sent. An index outside that range is rejected WHOLE — the entire
 * direction is thrown away rather than the bad index being clamped into
 * bounds. Clamping 9 to 7 produces a confident pick of a photograph the model
 * never looked at, carrying the model's own reasoning as its justification,
 * and nobody downstream can tell. This rule is already how `beforeAfterPick`
 * and `content-studio` read a reply; it is the same rule because it is the
 * same hazard.
 *
 * THE SAME PHOTOGRAPH TWICE is a before-and-after of nothing. It renders
 * perfectly and reads as a mistake to the one person who knows the room.
 *
 * A LAYOUT MUST BE ONE THIS TOOL HAS. An unknown layout name would fall
 * through to whatever the renderer defaults to, which is a design nobody
 * chose.
 *
 * THE HEADLINE IS TRIMMED, NOT TRUSTED. Length is capped here because a
 * sentence that overflows its band is a broken-looking advertisement. What it
 * is ALLOWED TO SAY — no invented testimonials, prices or timescales — is
 * enforced in the prompt and by the facts it is given, because that is a
 * question about meaning and this is a question about shape. Neither check
 * substitutes for the other.
 */

export type DirectionLayout =
  | 'side-by-side' | 'horizontal-split' | 'vertical-split' | 'diagonal'
  | 'framed' | 'luxury' | 'full-bleed' | 'collage';

/** The layouts a direction may name, which is every layout the tool renders. */
export const DIRECTION_LAYOUTS: DirectionLayout[] = [
  'side-by-side', 'horizontal-split', 'vertical-split', 'diagonal',
  'framed', 'luxury', 'full-bleed', 'collage',
];

export interface AdDirection {
  /** Positions in the array of photographs that was sent. */
  before: number;
  after: number;
  layout: DirectionLayout;
  /** The line to put across the design. May be empty — see `readDirection`. */
  headline: string;
  /** One sentence on why, shown to the person before they accept it. */
  why: string;
}

/** The model declining, which is a valid and sometimes correct answer. */
export interface AdDirectionRefusal {
  unsure: true;
  why: string;
}

export const MAX_HEADLINE = 64;

const isLayout = (v: unknown): v is DirectionLayout =>
  DIRECTION_LAYOUTS.includes(v as DirectionLayout);

/**
 * An index into the photographs, or null.
 *
 * ABSENT IS NOT ZERO, and that is the whole reason this is not one line.
 * `Number(null)` is 0 and `Number.isInteger(0)` is true, so a reply that
 * simply never mentioned `before` would be read as "the first photograph" —
 * confidently, with the model's reasoning attached, and nobody downstream able
 * to tell it was never said. The same goes for `undefined` and an empty
 * string.
 *
 * A numeric STRING is accepted, because models emit "0" as often as 0 and the
 * meaning is not in doubt. Throwing away a sound pick and a sound layout over
 * a type quirk punishes a correct answer; silently inventing an index does
 * something worse.
 */
const wholeIndex = (v: unknown, count: number): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  if (n < 0 || n >= count) return null;
  return n;
};

/**
 * A headline fit to render.
 *
 * Collapses whitespace, because a newline inside a single-line band draws as a
 * box glyph in canvas text, and strips the quotation marks a model habitually
 * wraps a slogan in. Truncation is on a word boundary where there is one: a
 * headline cut mid-word looks like a bug, while one cut short reads as brevity.
 */
export function readHeadline(raw: unknown): string {
  let text = String(raw ?? '').replace(/\s+/g, ' ').trim();
  text = text.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (text.length <= MAX_HEADLINE) return text;
  const cut = text.slice(0, MAX_HEADLINE);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > MAX_HEADLINE * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

/**
 * The direction, or null if it cannot be trusted whole.
 *
 * `count` is how many photographs were sent. A refusal comes back as its own
 * shape so a caller can tell "the model would not choose" from "the model
 * answered nonsense" — the first is worth showing somebody, the second is not.
 */
export function readDirection(
  raw: unknown,
  count: number,
): AdDirection | AdDirectionRefusal | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (r.unsure === true) {
    return {
      unsure: true,
      why: String(r.why ?? '').trim().slice(0, 240) || 'Not sure enough to choose.',
    };
  }

  const before = wholeIndex(r.before, count);
  const after = wholeIndex(r.after, count);
  // Rejected whole. See the note at the top about clamping.
  if (before === null || after === null) return null;
  if (before === after) return null;

  if (!isLayout(r.layout)) return null;

  return {
    before,
    after,
    layout: r.layout,
    /*
     * An empty headline is allowed through rather than failing the direction.
     * A model that has been told not to invent facts, and given none worth
     * putting in a headline, is RIGHT to leave it blank — and losing a good
     * pair and a good layout over a missing line would punish the honest
     * answer.
     */
    headline: readHeadline(r.headline),
    why: String(r.why ?? '').trim().slice(0, 240),
  };
}

/** True when a direction is something that can actually be applied. */
export function isDirection(
  d: AdDirection | AdDirectionRefusal | null,
): d is AdDirection {
  return Boolean(d) && !('unsure' in (d as object));
}
