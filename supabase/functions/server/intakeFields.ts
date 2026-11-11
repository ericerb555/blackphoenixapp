/**
 * What has to be known about a job before anybody can price it.
 *
 * WHY THIS EXISTS
 *
 * There were two lists of "what we need from the customer" and they had drifted
 * until they barely overlapped.
 *
 * The intake agent's list lived as thirteen hand-written `check(...)` calls
 * inside `index.tsx`: project name, client name, email, phone, address, city,
 * state, ZIP, description, timeline, budget, property type, priority. All
 * contact details, every one of them.
 *
 * The estimator's list is `QuoteBriefInput` in `quoteBrief.ts`: square footage,
 * linear footage, ceiling height, rooms, units, storeys, access, occupancy,
 * parking, stairs, working hours, urgency, deadline, brief, exclusions. All
 * measurements and conditions.
 *
 * **Not one measurement the takeoff needs was on the agent's list.** So an
 * interview could run to completion, report `complete: true`, and leave the
 * office with a perfect postal address and no idea how big the room is — which
 * is why `StartQuoteModal` still carries a whole "Job details — the numbers a
 * takeoff needs" panel for somebody to fill in by hand afterwards.
 *
 * That is what happens to two lists that are meant to match and are written
 * down twice. So they are written down once, here, and `tests/intakeFields.test.ts`
 * fails the build if a `quoteBrief` input has no question attached to it.
 *
 * WHY A `.ts` WITH NO IMPORTS
 *
 * Same reason as `aiCeiling.ts`, which says it plainly: the key-value store is
 * a `.tsx` and the test runner strips types from `.ts` only, so a rule that
 * reaches storage cannot be checked by hand. This decides what the company asks
 * its customers, which is exactly the kind of rule that should be.
 *
 * WHERE THE ANSWERS GO
 *
 * `target: 'form'` fields already exist on `ClientWorkRequestForm`'s state and
 * are rendered by it. `target: 'brief'` fields do not exist on that form at
 * all — checked, 2026-11-10: it has no `squareFootage`, `linearFootage`,
 * `roomCount`, `unitCount`, `storeys`, `accessNotes`, `occupancy`, `parking`,
 * `stairsOrLift`, `workNature`, `exclusions` or `urgency`.
 *
 * They are collected into one `estimatorBrief` object and submitted as an
 * `estimator_brief` block, alongside the `budget_range`, `client_info` and
 * `kitchen_preferences` blocks the payload already carries. The work-request
 * handler spreads the body (`...stripBase64(body)`), so it stores without a
 * server change and `quoteBrief.ts` can read it by the same names.
 *
 * Which means the agent is not a nicer wrapper around the form — it is the only
 * way these fields get collected at all. That is the argument for it.
 */

export type IntakeSurface = 'customer' | 'staff';

/** The form's own categories. `''` is "not chosen yet". */
export type IntakeCategory =
  | 'simple_service'
  | 'kitchen_bath'
  | 'full_renovation'
  | 'new_construction'
  | 'trash_demo'
  | '';

export interface IntakeField {
  /** The key the answer is written under. */
  name: string;
  /** Human label, used in the checklist the model is shown. */
  label: string;
  /** What the agent should actually ask. Phrased for a customer, not a surveyor. */
  question: string;
  /**
   * `form`  — already a field on the work-request form.
   * `brief` — collected into `estimatorBrief`; the form has no such field.
   * `media` — counted from an array of attachments, never written by the model.
   */
  target: 'form' | 'brief' | 'media';
  kind: 'text' | 'measure' | 'longtext';
  /** Categories this applies to. Absent means all of them. */
  appliesTo?: IntakeCategory[];
  /** Without this the request cannot be submitted at all. */
  requiredToSubmit?: boolean;
  /** Without this the job cannot be priced, only acknowledged. */
  requiredForQuote?: boolean;
  /** Length ceiling for text. Guards against accident, not a budget. */
  max?: number;
  /** Staff may be asked this; a customer must not be. */
  staffOnly?: boolean;
}

const ALL_BUILD: IntakeCategory[] = [
  'simple_service',
  'kitchen_bath',
  'full_renovation',
  'new_construction',
];

/**
 * The order matters. The agent is told to ask about the first thing still
 * missing, so this is the order a customer is interviewed in: who they are and
 * where, then what the job is in their own words, then the measurements, then
 * the conditions, then timing.
 *
 * Contact details come first because an abandoned conversation that left a name
 * and a number is still a lead, and one that left three measurements and no way
 * to call anybody is not.
 */
export const INTAKE_FIELDS: IntakeField[] = [
  // ── Who, and where ────────────────────────────────────────────────────────
  {
    name: 'clientName', label: 'Your name', target: 'form', kind: 'text', max: 120,
    requiredToSubmit: true,
    question: 'Who should we address the estimate to?',
  },
  {
    name: 'clientEmail', label: 'Email', target: 'form', kind: 'text', max: 200,
    requiredToSubmit: true,
    question: 'What email should the estimate go to?',
  },
  {
    name: 'clientPhone', label: 'Phone', target: 'form', kind: 'text', max: 40,
    question: 'What number is best if we need to ask something on the day?',
  },
  {
    name: 'siteAddress', label: 'Site address', target: 'form', kind: 'text', max: 200,
    requiredToSubmit: true, requiredForQuote: true,
    question: 'What is the address of the work? Travel and permits depend on it.',
  },
  { name: 'city', label: 'City or town', target: 'form', kind: 'text', max: 100, requiredForQuote: true, question: 'Which city or town is that in?' },
  { name: 'state', label: 'State', target: 'form', kind: 'text', max: 40, question: 'And the state?' },
  { name: 'zipCode', label: 'ZIP code', target: 'form', kind: 'text', max: 20, question: 'What is the ZIP code?' },

  // ── What the job is, in their own words ───────────────────────────────────
  {
    name: 'brief', label: 'What the job is', target: 'brief', kind: 'longtext', max: 6000,
    requiredToSubmit: true, requiredForQuote: true,
    /**
     * This replaces a field that never existed. The old checklist asked about
     * `formData.projectDescription`, and `ClientWorkRequestForm` has no such
     * key — so it counted as missing on every single turn and the agent asked
     * for it forever, while anything the model returned under that name landed
     * in form state where nothing rendered it and nothing read it.
     *
     * `quoteBrief.ts` passes this through verbatim and places it last, where a
     * model weights it most heavily: "it is the part only the person who saw
     * the job can supply". So it is worth asking for properly.
     */
    question:
      'Describe the work in your own words — what is there now, what you want instead, ' +
      'and anything unusual about it. Detail here is worth more than anything else you can tell us.',
  },
  {
    name: 'workNature', label: 'New work or a replacement', target: 'brief', kind: 'text', max: 200,
    appliesTo: ALL_BUILD, requiredForQuote: true,
    question: 'Is this new work, or replacing something already there? Tearing out costs differently from building fresh.',
  },
  {
    /**
     * Separate from `projectCategory`, which is the five-way choice the form
     * makes before any of this. This is the trade in the customer's own terms —
     * "roofing", "deck", "bathroom" — and `handleSubmit` sends it as the work
     * request's `serviceType`, where the estimator reads it first.
     *
     * Added because `tests/intakeFields.test.ts` refused to pass without it.
     * It is a `QuoteBriefInput` and nothing was asking for it, which is the
     * exact drift that test exists to catch.
     */
    name: 'serviceType', label: 'Kind of work', target: 'form', kind: 'text', max: 120,
    requiredForQuote: true,
    question: 'What kind of work is it — roofing, a deck, a bathroom, painting, a clear-out?',
  },
  { name: 'propertyType', label: 'Property type', target: 'form', kind: 'text', max: 100, question: 'Is it a single family home, a condo, a rental, or commercial?' },

  // ── The size. The numbers a takeoff actually needs. ───────────────────────
  {
    name: 'squareFootage', label: 'Square footage', target: 'brief', kind: 'measure',
    appliesTo: ['simple_service', 'kitchen_bath', 'full_renovation', 'new_construction'],
    requiredForQuote: true,
    question: 'Roughly how many square feet does the work cover? A pace-counted guess is far better than nothing.',
  },
  {
    name: 'linearFootage', label: 'Linear footage', target: 'brief', kind: 'measure',
    appliesTo: ['simple_service', 'full_renovation', 'new_construction'],
    question: 'For anything run along a line — deck edge, fence, trim, counter — roughly how many feet?',
  },
  {
    name: 'ceilingHeight', label: 'Ceiling height', target: 'form', kind: 'measure',
    appliesTo: ['kitchen_bath', 'full_renovation', 'new_construction'],
    question: 'How tall are the ceilings — standard eight foot, or higher?',
  },
  {
    name: 'roomCount', label: 'Number of rooms', target: 'brief', kind: 'measure',
    appliesTo: ['kitchen_bath', 'full_renovation', 'new_construction'],
    question: 'How many rooms are involved?',
  },
  {
    name: 'storeys', label: 'Storeys', target: 'brief', kind: 'measure',
    appliesTo: ALL_BUILD,
    question: 'How many floors does the building have, and which one is the work on?',
  },
  {
    name: 'unitCount', label: 'Units covered', target: 'brief', kind: 'measure',
    appliesTo: ['full_renovation', 'new_construction'],
    question: 'Is this one unit, or several?',
  },

  // ── The conditions. What makes the same job cost differently. ─────────────
  {
    name: 'accessNotes', label: 'Access', target: 'brief', kind: 'text', max: 400,
    requiredForQuote: true,
    question: 'How do we get to the work — straight in off the street, round the back, through the house?',
  },
  {
    name: 'parking', label: 'Parking and staging', target: 'brief', kind: 'text', max: 300,
    question: 'Where can a truck park, and is there somewhere to stage materials?',
  },
  {
    name: 'stairsOrLift', label: 'Stairs or lift', target: 'brief', kind: 'text', max: 200,
    question: 'Are there stairs to carry everything up, or a lift?',
  },
  {
    name: 'occupancy', label: 'Occupied or empty', target: 'brief', kind: 'text', max: 200,
    requiredForQuote: true,
    question: 'Will anyone be living there while the work happens? Working around people takes longer.',
  },
  {
    name: 'workingHours', label: 'Hours we may work', target: 'brief', kind: 'text', max: 200,
    question: 'Any restriction on when we can work — building rules, a sleeping baby, a shop that opens at nine?',
  },

  // ── Timing ────────────────────────────────────────────────────────────────
  { name: 'urgency', label: 'How soon', target: 'brief', kind: 'text', max: 200, question: 'How soon would you like this done?' },
  {
    /**
     * A wish, where `deadline` is a fact — the same distinction the form draws
     * between `preferredDate` and `earliestDate`/`latestDate`, and the one the
     * scheduler treats as harder.
     */
    name: 'preferredWindow', label: 'When would suit you', target: 'brief', kind: 'text', max: 200,
    question: 'Is there a time of year or a month that would suit you best?',
  },
  { name: 'deadline', label: 'A hard date', target: 'brief', kind: 'text', max: 200, question: 'Is there a date it genuinely has to be finished by?' },

  // ── What we are NOT doing ─────────────────────────────────────────────────
  {
    name: 'exclusions', label: 'What you are supplying or arranging', target: 'brief', kind: 'text', max: 2000,
    /**
     * Its own field for the reason `quoteBrief.ts` gives: "'the customer is
     * supplying the tile' buried in a paragraph gets missed, and the resulting
     * quote has to be corrected by hand afterwards."
     */
    question: 'Is anything not ours to do — tile you have already bought, a plumber you have booked, disposal you are handling?',
  },

  // ── Photographs and video ─────────────────────────────────────────────────
  {
    name: 'photos', label: 'Photos', target: 'media', kind: 'text',
    requiredForQuote: true,
    question:
      'Photos make the most difference of anything here. Please add a few — the whole area from a distance, ' +
      'then anything close up that matters, and the way in.',
  },
  {
    name: 'videos', label: 'Walkthrough video', target: 'media', kind: 'text',
    appliesTo: ['full_renovation', 'new_construction', 'trash_demo'],
    question: 'A slow walkthrough video tells us more than photographs can for a job this size. Could you add one?',
  },
];

/** Every field that applies to a category, in asking order. */
export function fieldsFor(category: IntakeCategory, surface: IntakeSurface = 'customer'): IntakeField[] {
  return INTAKE_FIELDS.filter((f) => {
    if (f.staffOnly && surface !== 'staff') return false;
    if (!f.appliesTo) return true;
    // Before a category is chosen, only the always-relevant fields are asked.
    if (!category) return false;
    return f.appliesTo.includes(category);
  });
}

const hasText = (v: unknown): boolean => String(v ?? '').trim().length > 0;

/** A measurement is present only when it reads as a positive number. */
const hasMeasure = (v: unknown): boolean => {
  const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n > 0;
};

const hasMedia = (v: unknown): boolean => Array.isArray(v) && v.length > 0;

export function isFilled(field: IntakeField, value: unknown): boolean {
  if (field.target === 'media') return hasMedia(value);
  if (field.kind === 'measure') return hasMeasure(value);
  return hasText(value);
}

export interface IntakeStatus {
  filled: string[];
  missing: string[];
  /** Missing AND needed before this can be priced. */
  missingForQuote: string[];
  /** Missing AND needed before it can even be sent. */
  missingToSubmit: string[];
  /** True when everything needed to price the job is in. */
  quotable: boolean;
  /** True when it can be submitted, whether or not it is quotable. */
  submittable: boolean;
}

/**
 * Where an interview stands.
 *
 * `quotable` is deliberately NOT "nothing is missing". The old route reported
 * `complete: missing.length === 0`, which meant every contact box had text in
 * it — so it congratulated the customer and sent the office a request nobody
 * could price. Quotable means the measurements and conditions needed to put a
 * number on it are present. The two thresholds are different and the difference
 * is the whole point of the feature.
 */
export function statusOf(
  values: Record<string, unknown>,
  category: IntakeCategory,
  surface: IntakeSurface = 'customer',
): IntakeStatus {
  const fields = fieldsFor(category, surface);
  const filled: string[] = [];
  const missing: string[] = [];
  const missingForQuote: string[] = [];
  const missingToSubmit: string[] = [];

  for (const f of fields) {
    if (isFilled(f, values[f.name])) {
      filled.push(f.label);
      continue;
    }
    missing.push(f.label);
    if (f.requiredForQuote) missingForQuote.push(f.label);
    if (f.requiredToSubmit) missingToSubmit.push(f.label);
  }

  return {
    filled,
    missing,
    missingForQuote,
    missingToSubmit,
    quotable: missingForQuote.length === 0 && !!category,
    submittable: missingToSubmit.length === 0,
  };
}

/** The next thing to ask about, or null when there is nothing left worth asking. */
export function nextQuestion(
  values: Record<string, unknown>,
  category: IntakeCategory,
  surface: IntakeSurface = 'customer',
): IntakeField | null {
  const fields = fieldsFor(category, surface);
  // Anything needed to price it comes before anything merely useful.
  const ordered = [
    ...fields.filter((f) => f.requiredToSubmit),
    ...fields.filter((f) => f.requiredForQuote && !f.requiredToSubmit),
    ...fields.filter((f) => !f.requiredForQuote && !f.requiredToSubmit),
  ];
  for (const f of ordered) {
    if (!isFilled(f, values[f.name])) return f;
  }
  return null;
}

export interface CoercedUpdates {
  /** Fields that belong on the form's own state. */
  form: Record<string, string | number>;
  /** Fields that belong in `estimatorBrief`. */
  brief: Record<string, string | number>;
  /** Keys the model tried to write that it may not. Logged, never applied. */
  rejected: string[];
}

/**
 * What the model is allowed to write back, coerced to the right shape.
 *
 * WHY AN ALLOWLIST ON THE KEY AND NOT JUST THE VALUE
 *
 * The route used to do this:
 *
 *     for (const [k, v] of Object.entries(parsed)) {
 *       if (v !== '' && v !== null && v !== undefined && v !== 0) fieldUpdates[k] = v;
 *     }
 *
 * The filter is on the VALUE. Every key the model emitted was passed through
 * and the browser spread it over form state, so the model could write fields
 * nobody had asked it about. One of them is `photos`, which is a `File[]`: a
 * `"photos": "none"` in that block replaced the array with a string, and the
 * submit loop `for (const photo of formData.photos)` then iterated the
 * characters of the word "none". A conversation could reach a crash in the
 * submit path.
 *
 * So: only known names, only the right type, and `media` targets are never
 * writable by a model at all — attachments are counted from what was actually
 * uploaded, never asserted.
 */
export function coerceUpdates(
  parsed: unknown,
  category: IntakeCategory,
  surface: IntakeSurface = 'customer',
): CoercedUpdates {
  const out: CoercedUpdates = { form: {}, brief: {}, rejected: [] };
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;

  const byName = new Map(fieldsFor(category, surface).map((f) => [f.name, f]));

  for (const [key, raw] of Object.entries(parsed as Record<string, unknown>)) {
    const field = byName.get(key);
    if (!field || field.target === 'media') {
      out.rejected.push(key);
      continue;
    }

    if (field.kind === 'measure') {
      const n = Number(String(raw ?? '').replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(n) || n <= 0) { out.rejected.push(key); continue; }
      (field.target === 'form' ? out.form : out.brief)[key] = n;
      continue;
    }

    const s = String(raw ?? '').trim().slice(0, field.max ?? 300);
    if (!s) { out.rejected.push(key); continue; }
    (field.target === 'form' ? out.form : out.brief)[key] = s;
  }

  return out;
}
