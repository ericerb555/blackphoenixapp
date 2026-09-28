/**
 * What a field technician is actually good at.
 *
 * WHAT THIS REPLACES
 *
 * Eight tick boxes — HVAC, Plumbing, Electrical, Carpentry, Appliance Repair,
 * Painting, Flooring, Landscaping — one overall years-of-experience number, and
 * a free-text certifications box. So a technician who has run commercial HVAC
 * for twenty years and once helped a friend tile a floor produced exactly the
 * same record as a technician who was the other way round. Eric's words:
 * *"i need to know the techs real abilities what he is good at."*
 *
 * WHY THE TRADES COME FROM `laborTasks.ts` AND ARE NOT LISTED HERE
 *
 * Because a technician's ability is only worth recording if it lines up with
 * the work the company actually sells and prices. `laborTasks.ts` already holds
 * the twelve trades the estimator prices with and, under each, the named tasks
 * with their man-hours. Declaring ability against that same list means:
 *
 *   - assignment can ask "who is rated for this trade" rather than relying on
 *     somebody remembering;
 *   - labour rates, which are already held per `tradeId`, line up with the
 *     people who do the work;
 *   - the hours a technician really achieves can eventually be compared with
 *     the hours the estimate assumed, per trade and per person.
 *
 * A second hand-written trade list here would drift from that one within a
 * release, and the two screens would quietly disagree about what the company
 * does. So there is no trade list in this file — only a re-export of the real
 * one.
 *
 * DECLARED IS NOT CONFIRMED — READ THIS BEFORE USING A RATING
 *
 * Everything an applicant enters here is a CLAIM. Eric settled how it gets
 * verified: *"probation period to review actual skills"* — no trade quiz, no
 * working interview at application stage. The technician is brought on and the
 * real rating is settled by watching him work.
 *
 * So a rating carries two values, `declared` and `confirmed`, and they must
 * never be collapsed into one. Anything that decides who is sent to a job, or
 * what the company tells a customer about who is coming, reads `confirmed` and
 * falls back to nothing — not to `declared`. A claim is not a qualification.
 */

/**
 * The `.ts` extension is deliberate, not a slip.
 *
 * `tsconfig` sets `allowImportingTsExtensions` and Vite resolves it happily,
 * and it is what lets the node test runner load this module directly. Without
 * it, `node --test` cannot resolve the sibling and every test here fails before
 * the first assertion.
 */
import { SEED_TASKS, TRADE_IDS, TRADE_LABELS, tradeLabel, type LaborTask } from './laborTasks.ts';

export { TRADE_IDS, TRADE_LABELS, tradeLabel };

/**
 * The three rungs, and the years each one means.
 *
 * Eric's ruling, in his words: *"lets have three sections Beginner(1-2 years),
 * Novice (2-5years), Advanced (5-10 years)"*. Three, not four — an earlier
 * draft proposed a fourth "leads a crew" rung and he cut it.
 *
 * They are defined by YEARS SERVED rather than by a description of competence,
 * which is deliberate: years in a trade is a fact somebody can check against a
 * reference, where "works alone confidently" is a self-assessment that every
 * applicant grades generously.
 *
 * `maxYears: null` on Advanced is not a liberty taken with his numbers. He
 * wrote "5-10", and a ladder that stops at ten leaves a twenty-year tradesman
 * unable to pick anything at all. Advanced is the top rung, so it stays open at
 * the top; Beginner is the bottom rung, so it stays open at the bottom.
 */
export interface SkillLevel {
  id: 'beginner' | 'novice' | 'advanced';
  label: string;
  minYears: number;
  maxYears: number | null;
  /** How the range is written on the form. */
  yearsLabel: string;
}

export const SKILL_LEVELS: SkillLevel[] = [
  { id: 'beginner', label: 'Beginner', minYears: 0, maxYears: 2, yearsLabel: '1–2 years' },
  { id: 'novice',   label: 'Novice',   minYears: 2, maxYears: 5, yearsLabel: '2–5 years' },
  { id: 'advanced', label: 'Advanced', minYears: 5, maxYears: null, yearsLabel: '5+ years' },
];

export type SkillLevelId = SkillLevel['id'];

/** Ordered weakest to strongest, so two ratings can be compared. */
export const LEVEL_RANK: Record<SkillLevelId, number> = { beginner: 1, novice: 2, advanced: 3 };

export const levelLabel = (id: unknown): string =>
  SKILL_LEVELS.find((level) => level.id === id)?.label || '';

/**
 * The level the stated years fall into.
 *
 * Used to show the applicant when his two answers disagree — claiming Advanced
 * beside "2 years" is worth querying at review, and it is far easier to notice
 * on the form than in a list of sixty applications.
 */
export function levelForYears(years: number): SkillLevelId {
  if (!Number.isFinite(years) || years < 0) return 'beginner';
  for (const level of SKILL_LEVELS) {
    if (level.maxYears === null || years < level.maxYears) return level.id;
  }
  return 'advanced';
}

/** True when the level claimed does not match the years given for that trade. */
export function levelDisagreesWithYears(level: unknown, years: unknown): boolean {
  const numeric = Number(years);
  if (!level || !Number.isFinite(numeric)) return false;
  return levelForYears(numeric) !== level;
}

/**
 * One trade a technician claims.
 *
 * `confirmed` is written only by a reviewer, on the server, during probation.
 * It is deliberately a separate field rather than an overwrite of `declared`,
 * so that what he said and what was found stay comparable afterwards.
 */
export interface TradeRating {
  tradeId: string;
  declared: SkillLevelId;
  years: number;
  confirmed?: SkillLevelId | null;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  /** Task ids from `SEED_TASKS` he says he can do unsupervised. */
  tasks?: string[];
}

/**
 * The rating that may be relied on, which is the confirmed one or nothing.
 *
 * Never falls back to `declared`. A technician who claims Advanced electrical
 * and has not been watched doing it is not an Advanced electrician yet, and the
 * whole point of probation is that the difference is real.
 */
export const reliableLevel = (rating: TradeRating | null | undefined): SkillLevelId | null =>
  rating?.confirmed || null;

/** The named tasks under one trade, straight from the estimator's catalogue. */
export function tasksForTradeId(tradeId: string, tasks: LaborTask[] = SEED_TASKS): LaborTask[] {
  return tasks.filter((task) => task.tradeId === tradeId);
}

/**
 * Certifications, with an expiry date rather than a free-text box.
 *
 * Expiry is the reason this is structured at all. "EPA 608, OSHA 10" in a
 * textarea tells a reviewer nothing about whether either is still valid, and a
 * lapsed ticket is not a qualification — for several of these it is also a
 * compliance problem if the holder is sent to do the work.
 *
 * `neverExpires` marks the ones that genuinely do not, so the form does not
 * demand a date that does not exist and the reviewer is not shown a false gap.
 */
export interface CertificationType {
  id: string;
  label: string;
  note: string;
  neverExpires?: boolean;
  /** The trades this ticket matters for, so it can be surfaced next to them. */
  trades: string[];
}

export const CERTIFICATION_TYPES: CertificationType[] = [
  { id: 'epa608', label: 'EPA 608', note: 'Required to handle refrigerant.', neverExpires: true, trades: ['hvac'] },
  { id: 'epa_rrp', label: 'EPA RRP (lead-safe renovator)', note: 'Required on pre-1978 housing.', trades: ['carpentry', 'painting', 'siding', 'sheetrock'] },
  { id: 'osha10', label: 'OSHA 10', note: 'Entry-level site safety.', trades: [] },
  { id: 'osha30', label: 'OSHA 30', note: 'Supervisor-level site safety.', trades: [] },
  { id: 'electrical_apprentice', label: 'Electrical apprentice registration', note: 'Registered and working under a licensed electrician.', trades: ['electrical'] },
  { id: 'electrical_journeyman', label: 'Journeyman electrician licence', note: 'Licensed to work unsupervised.', trades: ['electrical'] },
  { id: 'electrical_master', label: 'Master electrician licence', note: 'Licensed to pull permits and supervise.', trades: ['electrical'] },
  { id: 'plumbing_journeyman', label: 'Journeyman plumber licence', note: 'Licensed to work unsupervised.', trades: ['plumbing'] },
  { id: 'plumbing_master', label: 'Master plumber licence', note: 'Licensed to pull permits and supervise.', trades: ['plumbing'] },
  { id: 'gas_fitting', label: 'Gas fitting licence', note: 'Required for gas appliance and line work.', trades: ['plumbing', 'hvac'] },
  { id: 'backflow', label: 'Backflow prevention certification', note: 'Testing and certifying backflow devices.', trades: ['plumbing'] },
  { id: 'aerial_lift', label: 'Aerial / scissor lift operator', note: 'Required to operate a lift on site.', trades: ['roofing', 'siding', 'painting'] },
  { id: 'fall_protection', label: 'Fall protection / competent person', note: 'Roof and elevated work.', trades: ['roofing', 'siding'] },
  { id: 'confined_space', label: 'Confined space entry', note: 'Crawl spaces, vaults, tanks.', trades: [] },
  { id: 'cdl', label: 'Commercial driver licence (CDL)', note: 'Hauling equipment or materials over weight.', trades: [] },
  { id: 'first_aid_cpr', label: 'First aid / CPR', note: '', trades: [] },
];

export interface CertificationEntry {
  typeId: string;
  /** Free text for anything not in the list above. */
  otherLabel?: string;
  number?: string;
  state?: string;
  /** ISO date. Empty when the certification does not expire. */
  expiresOn?: string;
}

/** A certification that has passed its expiry date. Blank dates are not lapsed. */
export function isLapsed(entry: CertificationEntry | null | undefined, today = new Date()): boolean {
  if (!entry?.expiresOn) return false;
  const expiry = new Date(entry.expiresOn);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() < today.getTime();
}

/** Expiring within the window, so a reviewer can see it coming. */
export function expiresSoon(entry: CertificationEntry | null | undefined, days = 90, today = new Date()): boolean {
  if (!entry?.expiresOn || isLapsed(entry, today)) return false;
  const expiry = new Date(entry.expiresOn);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() - today.getTime() <= days * 24 * 60 * 60 * 1000;
}

export const certificationLabel = (entry: CertificationEntry | null | undefined): string => {
  if (!entry) return '';
  const known = CERTIFICATION_TYPES.find((type) => type.id === entry.typeId);
  return known?.label || String(entry.otherLabel || entry.typeId || '').trim();
};

/**
 * Probation.
 *
 * Ninety days with an administrator signing it off, per Eric. The length lives
 * here rather than being typed into a form default, so that changing the policy
 * is one edit rather than a search across screens.
 */
export const PROBATION_DAYS = 90;

export type ProbationOutcome = 'in_progress' | 'passed' | 'extended' | 'not_passed';

export interface ProbationRecord {
  startedOn: string;
  reviewDueOn: string;
  outcome: ProbationOutcome;
  closedOn?: string | null;
  closedBy?: string | null;
  notes?: string;
}

/** The review date, counted from the start. */
export function probationReviewDate(startedOn: string, days = PROBATION_DAYS): string {
  const start = new Date(startedOn);
  if (Number.isNaN(start.getTime())) return '';
  const due = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return due.toISOString().slice(0, 10);
}
