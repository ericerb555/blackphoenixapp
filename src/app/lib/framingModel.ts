/**
 * The framing submittal — what goes to an architect for approval.
 *
 * WHY IT IS A SUBMITTAL AND NOT A PRINTOUT
 *
 * Nobody can review a number without knowing what it assumed. A schedule saying
 * "2x10 joists" is a claim; a schedule saying "2x10 at 16in, 13ft 6in clear
 * span, 50 psf total, 0.81 utilisation, L/312" is something an architect can
 * agree with or take apart. So every member carries the check that produced it,
 * and the assumptions are stated once where they cannot be missed.
 *
 * The engineering is not invented here. `structureModel.checkMember` already
 * does bending as M = wL²/8 against section modulus and deflection as
 * 5wL⁴/384EI against L/240, and `deckStructural` does soil bearing and frost
 * depth. This assembles what those produced into something reviewable.
 *
 * THE QUESTIONS ARE THE POINT
 *
 * A submittal with nothing to ask is a brochure. What we could not determine —
 * an existing header we cannot see, a bearing wall we are guessing at, a footing
 * we could not expose — is the reason a reviewer is being paid, so those are
 * carried explicitly rather than left as an absence.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * Money. No labour rate, no margin, no customer quote. There is no field for it
 * on any type in this file, which is the same discipline `bidPackageModel`
 * follows for the same reason: an omission the type system enforces cannot be
 * undone by carelessness later.
 */

/* ── the members ──────────────────────────────────────────────────────── */

export type MemberRole =
  | 'joist' | 'rafter' | 'beam' | 'header' | 'post' | 'footing'
  | 'ledger' | 'bearing-wall' | 'other';

/**
 * One line of the schedule.
 *
 * `utilisation` is the honest number: the worse of bending and deflection as a
 * fraction of allowable. Anything over 1.0 fails and must be shown failing
 * rather than quietly rounded or omitted.
 */
export interface MemberRow {
  id: string;
  role: MemberRole;
  /** Where it is — 'Kitchen floor', 'Rear wall opening'. */
  location: string;
  size: string;
  /** How many, when the row stands for several identical members. */
  count?: number;
  spacingIn?: number;
  spanFt?: number;
  loadPlf?: number;
  utilisation?: number;
  /** L/x. 240 means it deflects exactly at the limit. */
  deflectionRatio?: number;
  /** Free text for anything the fields above cannot hold. */
  note?: string;
}

export function memberPasses(m: MemberRow): boolean | null {
  if (typeof m.utilisation !== 'number') return null;
  return m.utilisation <= 1;
}

/* ── what the numbers assumed ─────────────────────────────────────────── */

export interface Assumptions {
  /** Ground snow, psf, from the site address. */
  groundSnowPsf?: number;
  liveLoadPsf?: number;
  deadLoadPsf?: number;
  /** 'SPF No.2' — species and grade decide Fb and E. */
  species?: string;
  /** 240 means L/240. */
  deflectionLimit?: number;
  soilBearingPsf?: number;
  frostDepthIn?: number;
  /** 'IRC 2021 with NH amendments'. */
  codeEdition?: string;
}

/**
 * The assumptions written out, in the order a reviewer checks them.
 *
 * Anything not supplied is named as missing rather than dropped. A reviewer
 * seeing eight assumptions cannot tell whether a ninth was considered and
 * omitted or never considered at all, and that difference decides whether the
 * schedule can be trusted.
 */
export function assumptionLines(a: Assumptions): Array<{ label: string; value: string; missing: boolean }> {
  const row = (label: string, v: string | number | undefined, unit = '') => ({
    label,
    value: v === undefined || v === '' ? 'not stated' : `${v}${unit}`,
    missing: v === undefined || v === '',
  });
  return [
    row('Code edition', a.codeEdition),
    row('Ground snow', a.groundSnowPsf, ' psf'),
    row('Live load', a.liveLoadPsf, ' psf'),
    row('Dead load', a.deadLoadPsf, ' psf'),
    row('Species and grade', a.species),
    row('Deflection limit', a.deflectionLimit ? `L/${a.deflectionLimit}` : undefined),
    row('Soil bearing', a.soilBearingPsf, ' psf'),
    row('Frost depth', a.frostDepthIn, ' in'),
  ];
}

/* ── the conventions this company builds to ───────────────────────────── */

/**
 * Standing details that are ours rather than the code's.
 *
 * They go on every submittal because a reviewer who does not know them will
 * either assume the usual thing or ask, and both cost a round trip. They are
 * stated as what we do, not as a request for permission.
 */
export const STANDING_DETAILS: string[] = [
  '4x4 posts are not notched. Beams sit on top of the post, or on a bracket — '
  + 'never in a cut-out. Any detail returned showing a notched post has been misread.',
  'Post bases are anchored with a 1/2in drop-in anchor set into the cured footing, '
  + 'not a J-bolt cast in wet concrete.',
];

/* ── open questions ───────────────────────────────────────────────────── */

export interface OpenQuestion {
  id: string;
  question: string;
  /** What we assumed in the meantime, so the schedule still computes. */
  assumedAnswer?: string;
  /** What changes if the assumption is wrong. */
  ifWrong?: string;
}

/* ── the document ─────────────────────────────────────────────────────── */

/**
 * Where a submittal is up to.
 *
 * `changes-requested` is not a failure state, it is the normal one — a reviewer
 * who never asks for anything is not reviewing. `superseded` exists because a
 * revision must not silently replace what somebody already approved.
 */
export type SubmittalState =
  | 'draft' | 'sent' | 'approved' | 'changes-requested' | 'superseded';

export const STATE_LABEL: Record<SubmittalState, string> = {
  draft: 'Draft',
  sent: 'With the architect',
  approved: 'Approved',
  'changes-requested': 'Changes requested',
  superseded: 'Superseded',
};

export interface ReviewResponse {
  verdict: 'approved' | 'changes-requested';
  /** Who said so, as they typed it. */
  reviewer: string;
  /** Their licence or firm, when they gave one. */
  credential?: string;
  comments: string;
  respondedAt: string;
}

export interface FramingSubmittal {
  id: string;
  /** Bumped on every re-issue, so an approval names a specific revision. */
  revision: number;
  title: string;
  siteAddress?: string;
  state: SubmittalState;
  members: MemberRow[];
  assumptions: Assumptions;
  questions: OpenQuestion[];
  standingDetails: string[];
  /** Warnings the structural calculation itself raised. */
  calcWarnings: string[];
  preparedBy?: string;
  preparedOn?: string;
  sentOn?: string;
  response?: ReviewResponse;
}

export const BLANK_SUBMITTAL: FramingSubmittal = {
  id: '',
  revision: 1,
  title: '',
  state: 'draft',
  members: [],
  assumptions: {},
  questions: [],
  standingDetails: STANDING_DETAILS,
  calcWarnings: [],
};

/* ── is it fit to send ────────────────────────────────────────────────── */

export interface SubmittalGap {
  severity: 'blocking' | 'warning';
  message: string;
}

/**
 * What is wrong with it, before an architect's time is spent on it.
 *
 * Blocking gaps are the ones that would waste the review: a member that fails
 * its own check, a schedule with nothing on it, or assumptions so incomplete
 * that none of the numbers can be verified. A reviewer sent one of those comes
 * back with "what did you assume", which is a round trip nobody needed.
 */
export function submittalGaps(s: FramingSubmittal): SubmittalGap[] {
  const gaps: SubmittalGap[] = [];

  if (!s.members.length) {
    gaps.push({ severity: 'blocking', message: 'Nothing is on the schedule.' });
    return gaps;
  }

  const failing = s.members.filter(m => memberPasses(m) === false);
  if (failing.length) {
    gaps.push({
      severity: 'blocking',
      message: `${failing.length} member${failing.length === 1 ? '' : 's'} fail${failing.length === 1 ? 's' : ''} the check — `
        + `${failing.slice(0, 2).map(m => `${m.size} at ${m.location}`).join(', ')}`
        + `${failing.length > 2 ? ', and others' : ''}. Size ${failing.length === 1 ? 'it' : 'them'} up before anyone reviews this.`,
    });
  }

  // Loads and species are what every other number depends on. Without them a
  // reviewer cannot verify a single row, which is a wasted round trip.
  const critical = assumptionLines(s.assumptions).filter(
    a => a.missing && ['Live load', 'Dead load', 'Species and grade', 'Deflection limit'].includes(a.label),
  );
  if (critical.length) {
    gaps.push({
      severity: 'blocking',
      message: `${critical.map(c => c.label.toLowerCase()).join(', ')} not stated. `
        + 'Nothing on the schedule can be checked without them.',
    });
  }

  const unchecked = s.members.filter(m => memberPasses(m) === null);
  if (unchecked.length) {
    gaps.push({
      severity: 'warning',
      message: `${unchecked.length} member${unchecked.length === 1 ? ' carries' : 's carry'} no calculation — `
        + 'they are shown as proposed rather than verified, and are marked so on the sheet.',
    });
  }

  const otherMissing = assumptionLines(s.assumptions).filter(a => a.missing).length - critical.length;
  if (otherMissing > 0) {
    gaps.push({
      severity: 'warning',
      message: `${otherMissing} assumption${otherMissing === 1 ? ' is' : 's are'} not stated. `
        + 'Named as unstated on the sheet rather than left blank, so nobody assumes it was considered.',
    });
  }

  if (!s.questions.length) {
    gaps.push({
      severity: 'warning',
      message: 'No open questions. That is unusual — if there is genuinely nothing we could not '
        + 'determine, say so; otherwise a reviewer has to guess what we were unsure about.',
    });
  }

  return gaps;
}

export function isSendable(s: FramingSubmittal): boolean {
  return !submittalGaps(s).some(g => g.severity === 'blocking');
}

/** One sentence on where this stands. */
export function submittalNote(s: FramingSubmittal): string {
  if (s.state === 'approved' && s.response) {
    return `Approved by ${s.response.reviewer}${s.response.credential ? `, ${s.response.credential}` : ''}, `
      + `revision ${s.revision}. A change from here needs a new revision.`;
  }
  if (s.state === 'changes-requested' && s.response) {
    return `${s.response.reviewer} asked for changes. Address them, then re-issue as revision ${s.revision + 1}.`;
  }
  if (s.state === 'superseded') {
    return 'Superseded by a later revision. Kept because somebody may have worked from it.';
  }
  if (s.state === 'sent') {
    return `Revision ${s.revision} is with the architect${s.sentOn ? `, sent ${s.sentOn}` : ''}. Nothing to do until they answer.`;
  }

  const gaps = submittalGaps(s);
  const blocking = gaps.filter(g => g.severity === 'blocking');
  if (blocking.length) return blocking[0].message;

  const checked = s.members.filter(m => memberPasses(m) !== null).length;
  return `${s.members.length} member${s.members.length === 1 ? '' : 's'}, `
    + `${checked} with a calculation behind ${checked === 1 ? 'it' : 'them'}. Ready to send.`;
}

/**
 * A new revision after changes were asked for.
 *
 * The old one becomes superseded rather than being edited in place. Somebody
 * may have already built from it, and an approval that silently changes what it
 * approved is worse than no approval.
 */
export function reviseFor(s: FramingSubmittal): FramingSubmittal {
  return {
    ...s,
    revision: s.revision + 1,
    state: 'draft',
    sentOn: undefined,
    response: undefined,
  };
}

/**
 * A submittal assembled from a deck that has already been calculated.
 *
 * Nothing here is re-derived. The sizes come from the model somebody drew, the
 * loads and footing from `deckStructural.computeStructural`, and the warnings
 * from the same place — a number retyped is a number that will eventually
 * disagree with the one it was copied from.
 *
 * Members are marked with a span and load where the calculation supplies them
 * and left uncalculated where it does not, rather than being given a plausible
 * figure. `submittalGaps` then reports them as proposed rather than verified,
 * which is what an architect needs to know before stamping anything.
 */
export function submittalFromDeck(args: {
  id: string;
  title: string;
  siteAddress?: string;
  deck: {
    widthFt: number; depthFt: number;
    joistSize: string; joistSpacing: number;
    beamSize: string; beamPlies: number;
    postSize: string; postSpacingFt: number;
  };
  structural: {
    designLivePsf: number; deadLoadPsf: number; totalLoadPsf: number;
    postLoadLbs: number; soilPsf: number; frostDepthIn: number;
    roundFootingDiameterIn: number;
    failures: string[]; cautions: string[]; missing: string[];
  };
  groundSnowPsf?: number;
  codeEdition?: string;
  preparedBy?: string;
}): FramingSubmittal {
  const { deck, structural } = args;

  // Joists span the depth; the beam carries them across the width. Stated here
  // because a reviewer must know which way the framing runs to check anything.
  const members: MemberRow[] = [
    {
      id: 'joists', role: 'joist', location: 'Deck field, joists span front to back',
      size: deck.joistSize, spacingIn: deck.joistSpacing,
      spanFt: deck.depthFt,
      loadPlf: Math.round(structural.totalLoadPsf * (deck.joistSpacing / 12) * 10) / 10,
      note: 'Simple span, ledger to beam.',
    },
    {
      id: 'beam', role: 'beam', location: 'Carrying beam',
      size: `${deck.beamPlies}-ply ${deck.beamSize}`,
      spanFt: deck.postSpacingFt,
      loadPlf: Math.round(structural.totalLoadPsf * (deck.depthFt / 2) * 10) / 10,
      note: 'Tributary width taken as half the deck depth.',
    },
    {
      id: 'posts', role: 'post', location: 'Beam posts',
      size: deck.postSize,
      count: Math.max(2, Math.ceil(deck.widthFt / Math.max(1, deck.postSpacingFt)) + 1),
      note: `${Math.round(structural.postLoadLbs)} lb arriving at each post. `
        + 'Posts are not notched — see the standing details.',
    },
    {
      id: 'footings', role: 'footing', location: 'Post footings',
      size: `${structural.roundFootingDiameterIn}in round`,
      note: `${Math.round(structural.postLoadLbs)} lb on ${structural.soilPsf} psf soil, `
        + `bearing at ${structural.frostDepthIn}in below grade.`,
    },
  ];

  // What the calculation could not settle becomes a question rather than an
  // omission — an absence tells a reviewer nothing.
  const questions: OpenQuestion[] = structural.missing.map((m, i) => ({
    id: `missing_${i}`,
    question: `We could not determine: ${m}.`,
    ifWrong: 'The footing size and the post load both move if this is not what we assumed.',
  }));

  return {
    ...BLANK_SUBMITTAL,
    id: args.id,
    title: args.title,
    siteAddress: args.siteAddress,
    members,
    questions,
    assumptions: {
      groundSnowPsf: args.groundSnowPsf,
      liveLoadPsf: structural.designLivePsf,
      deadLoadPsf: structural.deadLoadPsf,
      species: 'SPF No.2',
      deflectionLimit: 240,
      soilBearingPsf: structural.soilPsf,
      frostDepthIn: structural.frostDepthIn,
      codeEdition: args.codeEdition,
    },
    calcWarnings: [...structural.failures, ...structural.cautions],
    preparedBy: args.preparedBy,
    preparedOn: undefined,
  };
}

/**
 * Everything an architect is allowed to see.
 *
 * Built explicitly rather than by spreading the submittal, so a field added to
 * `FramingSubmittal` later cannot reach an outside firm by accident. This is
 * the whole reason the function exists — a spread would be shorter and would
 * quietly leak the next field somebody adds.
 */
export interface ArchitectView {
  title: string;
  revision: number;
  siteAddress?: string;
  state: SubmittalState;
  members: MemberRow[];
  assumptions: Assumptions;
  questions: OpenQuestion[];
  standingDetails: string[];
  calcWarnings: string[];
  preparedBy?: string;
  preparedOn?: string;
  response?: ReviewResponse;
}

export function architectView(s: FramingSubmittal): ArchitectView {
  return {
    title: s.title,
    revision: s.revision,
    siteAddress: s.siteAddress,
    state: s.state,
    members: s.members.map(m => ({
      id: m.id, role: m.role, location: m.location, size: m.size,
      count: m.count, spacingIn: m.spacingIn, spanFt: m.spanFt,
      loadPlf: m.loadPlf, utilisation: m.utilisation,
      deflectionRatio: m.deflectionRatio, note: m.note,
    })),
    assumptions: { ...s.assumptions },
    questions: s.questions.map(q => ({ ...q })),
    standingDetails: [...s.standingDetails],
    calcWarnings: [...s.calcWarnings],
    preparedBy: s.preparedBy,
    preparedOn: s.preparedOn,
    response: s.response,
  };
}
