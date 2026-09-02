/**
 * What a town requires, and whether this design meets it.
 *
 * THE RULE THIS WHOLE FILE TURNS ON
 *
 * Unknown is not compliant. A setback nobody has entered must never read as a
 * pass — it reads as *not known*, every time, in the type and on the screen.
 * That is the entire integrity of the design: the system knows only what
 * somebody told it, so its silence has to mean silence rather than approval.
 *
 * The alternative was shipping the ordinances for every town in the area
 * pre-loaded. It would work on day one and rot quietly: towns amend, a figure
 * that was right when written is wrong two years later, and nothing announces
 * it. A wrong setback in a filed drawing is a reputation with a building
 * department, and it would be Eric's, not the software's.
 *
 * So the town record is his. It is filled in once, it says who entered it and
 * when and where they got it, and it shows its age — because a rule taken off
 * an ordinance in 2023 deserves a second look before it decides a filing.
 *
 * WHAT IT BUYS
 *
 * The first job in a town costs twenty minutes. Every job after that says, at
 * design time rather than at the counter, that the deck projects two feet
 * further than the rear setback allows — and offers the two ways out.
 */

/* ── where a rule came from ───────────────────────────────────────────── */

/**
 * How the figure was learned.
 *
 * A number read off the ordinance and a number somebody was told on the phone
 * are both useful and they are not the same claim. Which it was decides whether
 * it is worth re-checking before a filing rests on it.
 */
export type RuleSource = 'ordinance' | 'counter' | 'phone' | 'assumed';

export const SOURCE_LABEL: Record<RuleSource, string> = {
  ordinance: 'read off the ordinance',
  counter: 'confirmed at the counter',
  phone: 'told over the phone',
  assumed: 'assumed — not confirmed',
};

/** How much weight a figure carries, worst first. */
export const SOURCE_RANK: Record<RuleSource, number> = {
  assumed: 0, phone: 1, counter: 2, ordinance: 3,
};

/* ── the town ─────────────────────────────────────────────────────────── */

export interface Jurisdiction {
  id: string;
  town: string;
  /** Two-letter state. Decides which variance criteria apply. */
  state: string;

  /** Feet from the lot line. Undefined means nobody has entered it. */
  frontSetbackFt?: number;
  rearSetbackFt?: number;
  sideSetbackFt?: number;
  maxHeightFt?: number;
  maxLotCoveragePct?: number;

  /**
   * Square feet below which no permit is needed.
   *
   * Zero is a real answer — some towns permit everything — and is deliberately
   * different from undefined, which means nobody asked.
   */
  permitExemptUnderSqFt?: number;

  feeNote?: string;
  formsUrl?: string;
  submissionNote?: string;
  notes?: string;

  /** Where the figures came from, and when. */
  source: RuleSource;
  enteredBy?: string;
  /** ISO date. Drives the staleness warning. */
  enteredOn?: string;
}

export function blankJurisdiction(town = '', state = 'NH'): Jurisdiction {
  return { id: `juris_${town.toLowerCase().replace(/\W+/g, '-')}_${state.toLowerCase()}`, town, state, source: 'assumed' };
}

const RULE_FIELDS: Array<[keyof Jurisdiction, string]> = [
  ['frontSetbackFt', 'Front setback'],
  ['rearSetbackFt', 'Rear setback'],
  ['sideSetbackFt', 'Side setback'],
  ['maxHeightFt', 'Height limit'],
  ['maxLotCoveragePct', 'Lot coverage'],
  ['permitExemptUnderSqFt', 'Permit threshold'],
];

/** Which rules are known, and which nobody has entered. */
export function knownRules(j: Jurisdiction): { known: string[]; unknown: string[] } {
  const known: string[] = [];
  const unknown: string[] = [];
  for (const [key, label] of RULE_FIELDS) {
    (j[key] === undefined || j[key] === null ? unknown : known).push(label);
  }
  return { known, unknown };
}

/** Days since the record was entered, or null if it never said. */
export function ageInDays(j: Jurisdiction, now = Date.now()): number | null {
  if (!j.enteredOn) return null;
  const t = new Date(j.enteredOn).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((now - t) / 86_400_000);
}

/**
 * Whether this record is old enough to check again.
 *
 * Two years is the threshold because that is roughly how often a town gets
 * round to amending, and because a figure nobody has looked at since before the
 * last town meeting is a figure worth a phone call rather than a filing.
 */
export const STALE_AFTER_DAYS = 730;

export function isStale(j: Jurisdiction, now = Date.now()): boolean {
  const age = ageInDays(j, now);
  return age !== null && age >= STALE_AFTER_DAYS;
}

/** One sentence on how far this record can be trusted. */
export function jurisdictionNote(j: Jurisdiction, now = Date.now()): string {
  const { known, unknown } = knownRules(j);
  if (!known.length) {
    return `Nothing has been entered for ${j.town || 'this town'} yet, so nothing can be checked. `
      + 'Twenty minutes once, and every job here afterwards is checked at design time.';
  }

  const parts: string[] = [];
  if (unknown.length) {
    parts.push(`${unknown.length} of ${RULE_FIELDS.length} rules not entered (${unknown.join(', ').toLowerCase()}) — `
      + 'those are reported as unknown rather than as passing');
  }

  const age = ageInDays(j, now);
  if (isStale(j, now)) {
    parts.push(`entered ${Math.floor((age || 0) / 365)} years ago and worth re-checking — towns amend`);
  }
  if (j.source === 'assumed') {
    parts.push('marked as assumed rather than confirmed, so do not file on it');
  }

  if (!parts.length) {
    return `${known.length} rules on file for ${j.town}, ${SOURCE_LABEL[j.source]}`
      + `${j.enteredOn ? ` on ${j.enteredOn}` : ''}.`;
  }
  return parts.join('. ') + '.';
}

/* ── the proposal ─────────────────────────────────────────────────────── */

/**
 * What is being built, as the ordinance sees it.
 *
 * Every field optional, because most jobs know some of these and not others,
 * and a check that demands all of them gets skipped.
 */
export interface Proposal {
  /** Feet from the finished structure's nearest point to each line. */
  toFrontFt?: number;
  toRearFt?: number;
  toSideFt?: number;
  heightFt?: number;
  /** Square feet this adds to the footprint. */
  addedCoverageSqFt?: number;
  existingCoverageSqFt?: number;
  lotSqFt?: number;
}

export type FindingStatus = 'passes' | 'violates' | 'unknown';

export interface Finding {
  rule: string;
  status: FindingStatus;
  /** What the ordinance requires, in words. */
  required?: string;
  /** What the design does. */
  actual?: string;
  /** How far short, in the rule's own unit. Positive means over the line. */
  shortfall?: number;
  /** What to do about it. */
  remedy?: string;
  /** What is missing, when the status is unknown. */
  needs?: string;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Check a design against what the town told us.
 *
 * Three outcomes per rule, never two. `unknown` covers both "the town rule was
 * never entered" and "the design has not been measured against it", and the
 * finding says which — because those are fixed by different people.
 */
export function checkProposal(j: Jurisdiction, p: Proposal): Finding[] {
  const findings: Finding[] = [];

  const setback = (
    rule: string,
    limit: number | undefined,
    actual: number | undefined,
    which: string,
  ) => {
    if (limit === undefined) {
      findings.push({ rule, status: 'unknown', needs: `the ${which} setback for ${j.town || 'this town'} has not been entered` });
      return;
    }
    if (actual === undefined) {
      findings.push({
        rule, status: 'unknown',
        required: `${limit} ft`,
        needs: `nobody has measured how far this sits from the ${which} lot line`,
      });
      return;
    }
    const over = r1(limit - actual);
    findings.push(over > 0
      ? {
        rule, status: 'violates',
        required: `${limit} ft`, actual: `${r1(actual)} ft`, shortfall: over,
        remedy: `Pull it back ${over} ft, or file a variance.`,
      }
      : { rule, status: 'passes', required: `${limit} ft`, actual: `${r1(actual)} ft` });
  };

  setback('Front setback', j.frontSetbackFt, p.toFrontFt, 'front');
  setback('Rear setback', j.rearSetbackFt, p.toRearFt, 'rear');
  setback('Side setback', j.sideSetbackFt, p.toSideFt, 'side');

  // Height.
  if (j.maxHeightFt === undefined) {
    findings.push({ rule: 'Height limit', status: 'unknown', needs: `the height limit for ${j.town || 'this town'} has not been entered` });
  } else if (p.heightFt === undefined) {
    findings.push({ rule: 'Height limit', status: 'unknown', required: `${j.maxHeightFt} ft`, needs: 'the proposed height is not set' });
  } else {
    const over = r1(p.heightFt - j.maxHeightFt);
    findings.push(over > 0
      ? {
        rule: 'Height limit', status: 'violates',
        required: `${j.maxHeightFt} ft`, actual: `${r1(p.heightFt)} ft`, shortfall: over,
        remedy: `${over} ft over. Lower it, or file a variance.`,
      }
      : { rule: 'Height limit', status: 'passes', required: `${j.maxHeightFt} ft`, actual: `${r1(p.heightFt)} ft` });
  }

  // Lot coverage. Needs three numbers and says which one is missing rather
  // than reporting a single unhelpful "unknown".
  if (j.maxLotCoveragePct === undefined) {
    findings.push({ rule: 'Lot coverage', status: 'unknown', needs: `the coverage limit for ${j.town || 'this town'} has not been entered` });
  } else if (!p.lotSqFt) {
    findings.push({ rule: 'Lot coverage', status: 'unknown', required: `${j.maxLotCoveragePct}%`, needs: 'the lot area is not known' });
  } else if (p.addedCoverageSqFt === undefined && p.existingCoverageSqFt === undefined) {
    findings.push({ rule: 'Lot coverage', status: 'unknown', required: `${j.maxLotCoveragePct}%`, needs: 'nothing has been measured for existing or added footprint' });
  } else {
    const total = (p.existingCoverageSqFt || 0) + (p.addedCoverageSqFt || 0);
    const pct = r1((total / p.lotSqFt) * 100);
    const over = r1(pct - j.maxLotCoveragePct);
    findings.push(over > 0
      ? {
        rule: 'Lot coverage', status: 'violates',
        required: `${j.maxLotCoveragePct}%`, actual: `${pct}%`, shortfall: over,
        remedy: `Over by ${over} points — about ${Math.ceil((over / 100) * p.lotSqFt)} sq ft of footprint. `
          + 'Shrink it, or file a variance.',
      }
      : { rule: 'Lot coverage', status: 'passes', required: `${j.maxLotCoveragePct}%`, actual: `${pct}%` });
  }

  // Does it need a permit at all. Zero is a real answer meaning "everything
  // needs one", and is not the same as nobody having asked.
  if (j.permitExemptUnderSqFt === undefined) {
    findings.push({ rule: 'Permit required', status: 'unknown', needs: `nobody has asked ${j.town || 'this town'} what is exempt` });
  } else if (p.addedCoverageSqFt === undefined) {
    findings.push({ rule: 'Permit required', status: 'unknown', required: `exempt under ${j.permitExemptUnderSqFt} sq ft`, needs: 'the added area is not known' });
  } else {
    const needs = p.addedCoverageSqFt >= j.permitExemptUnderSqFt;
    findings.push({
      rule: 'Permit required',
      status: 'passes',
      required: `exempt under ${j.permitExemptUnderSqFt} sq ft`,
      actual: `${r1(p.addedCoverageSqFt)} sq ft — ${needs ? 'a permit is required' : 'no permit needed'}`,
    });
  }

  return findings;
}

export function violations(findings: Finding[]): Finding[] {
  return findings.filter(f => f.status === 'violates');
}

export function unknowns(findings: Finding[]): Finding[] {
  return findings.filter(f => f.status === 'unknown');
}

/**
 * One sentence on where the design stands with the town.
 *
 * Leads with violations, then with what is not known — never with the passes,
 * because "four rules pass" reads as approval when three others were never
 * checked.
 */
export function complianceNote(findings: Finding[]): string {
  if (!findings.length) return 'Nothing checked.';
  const bad = violations(findings);
  const dunno = unknowns(findings);

  if (bad.length) {
    const lead = `${bad.length} rule${bad.length === 1 ? '' : 's'} broken — `
      + bad.map(f => f.rule.toLowerCase()).join(', ') + '.';
    return dunno.length
      ? `${lead} ${dunno.length} more could not be checked.`
      : `${lead} Reduce the design or file a variance.`;
  }
  if (dunno.length) {
    return `Nothing broken among the ${findings.length - dunno.length} rule`
      + `${findings.length - dunno.length === 1 ? '' : 's'} that could be checked, but `
      + `${dunno.length} could not be — that is not the same as passing.`;
  }
  return 'Every rule on file is met.';
}

/* ── variances ────────────────────────────────────────────────────────── */

export interface VarianceCriterion {
  id: string;
  /** The statutory wording, as the board will read it. */
  test: string;
  /** What the board is actually weighing, in plain terms. */
  plain: string;
}

/**
 * The five tests a New Hampshire zoning board applies, from RSA 674:33, I(b).
 *
 * Carried verbatim because the board will read them out and take each in turn,
 * and an application that answers all five is one that gets heard rather than
 * continued. Telling somebody to "check with the town" instead would be
 * withholding the thing that makes the filing work.
 *
 * `unnecessary hardship` has its own statutory definition, which is why it
 * carries the longest plain-terms note — it is the test applications fail on.
 */
export const NH_VARIANCE_CRITERIA: VarianceCriterion[] = [
  {
    id: 'public-interest',
    test: 'The variance will not be contrary to the public interest.',
    plain: 'It does not alter the essential character of the neighbourhood, and it '
      + 'threatens nobody\'s health or safety.',
  },
  {
    id: 'spirit',
    test: 'The spirit of the ordinance is observed.',
    plain: 'The rule exists for a reason — light, air, space between buildings. Say why '
      + 'granting this still serves that reason.',
  },
  {
    id: 'substantial-justice',
    test: 'Substantial justice is done.',
    plain: 'The loss to the applicant if refused outweighs any gain to the public. A board '
      + 'weighs these against each other explicitly.',
  },
  {
    id: 'property-values',
    test: 'The values of surrounding properties are not diminished.',
    plain: 'Say what the neighbours already have and how this compares. Abutter support in '
      + 'writing carries real weight here.',
  },
  {
    id: 'hardship',
    test: 'Literal enforcement of the ordinance would result in unnecessary hardship.',
    plain: 'The statutory test: special conditions of THIS property distinguish it from others '
      + 'in the area; there is no fair and substantial relationship between the general purpose '
      + 'of the ordinance and applying it to this property; and the proposed use is reasonable. '
      + 'A hardship that is about the owner rather than the land does not qualify.',
  },
];

/** The criteria for a state, or null when we do not carry them. */
export function criteriaFor(state: string): VarianceCriterion[] | null {
  return String(state || '').trim().toUpperCase() === 'NH' ? NH_VARIANCE_CRITERIA : null;
}

export interface VarianceAnswer {
  criterionId: string;
  answer: string;
}

export interface VarianceApplication {
  jurisdictionId: string;
  /** The findings this application exists to overcome. */
  reliefSought: string[];
  answers: VarianceAnswer[];
  abutterSupport?: string;
  preparedBy?: string;
}

/** What is still missing before a board would hear it. */
export function varianceGaps(
  app: VarianceApplication, criteria: VarianceCriterion[],
): string[] {
  const gaps: string[] = [];
  if (!app.reliefSought.length) {
    gaps.push('The relief being sought is not stated. A board grants relief from a specific rule, not in general.');
  }
  for (const c of criteria) {
    const answer = app.answers.find(a => a.criterionId === c.id)?.answer?.trim();
    if (!answer) {
      gaps.push(`No answer to: ${c.test}`);
    } else if (answer.length < 40) {
      gaps.push(`The answer on "${c.test}" is a sentence fragment. Boards continue applications for this.`);
    }
  }
  return gaps;
}

/** Turn broken rules into the relief a board is being asked for. */
export function reliefFrom(findings: Finding[]): string[] {
  return violations(findings).map(f => {
    const amount = f.shortfall !== undefined ? `${f.shortfall}` : 'some';
    if (/setback/i.test(f.rule)) {
      return `Relief from the ${f.rule.toLowerCase()}: ${f.required} required, ${f.actual} proposed — ${amount} ft of relief.`;
    }
    if (/coverage/i.test(f.rule)) {
      return `Relief from the lot coverage limit: ${f.required} allowed, ${f.actual} proposed.`;
    }
    if (/height/i.test(f.rule)) {
      return `Relief from the height limit: ${f.required} allowed, ${f.actual} proposed — ${amount} ft of relief.`;
    }
    return `Relief from ${f.rule.toLowerCase()}: ${f.required} required, ${f.actual} proposed.`;
  });
}
