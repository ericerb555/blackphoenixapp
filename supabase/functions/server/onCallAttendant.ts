/**
 * onCallAttendant — the words the attendant says, and what it has understood.
 *
 * WHY THIS IS PURE
 *
 * Everything here runs at three in the morning to somebody who is frightened,
 * over a telephone, with no screen and no second chance. Each decision has a
 * plausible wrong answer that nobody sees until it matters: a burst pipe read
 * as "general maintenance" wakes the wrong trade; a smell of gas treated as an
 * ordinary call sends a plumber instead of telling the caller to get out; a
 * conversation with no question limit keeps a panicking tenant on the line
 * while the water rises. None of that needs a network to be proven, so none of
 * it is allowed to need one.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not dispatch. It gathers a description, a place and a person, and
 * hands them to `persistWorkRequest`, which opens a call that `routeEmergency`
 * decides — the same deterministic path a portal request takes. The model may
 * read the words; it may not choose who gets woken, and it may not reach past
 * a contracted vendor's exclusive agreement. That rule is the reason the
 * classifier below exists in this file rather than in a prompt: when the model
 * is unavailable, or stopped, or wrong, this still answers.
 */

/* ── the categories ──────────────────────────────────────────────────────── */

/**
 * One emergency category, with the words a caller actually uses.
 *
 * `trade` is what reaches `serviceFor` on the account's config, so it must be
 * spelled the way a rota's events are spelled rather than the way a product
 * page is. `safetyCritical` means life before property: the caller is told to
 * leave and ring the emergency services, and the dispatch still happens.
 */
export interface EmergencyCategory {
  id: string;
  label: string;
  trade: string;
  safetyCritical: boolean;
  /** Lower-case fragments, matched as substrings of the caller's words. */
  cues: string[];
}

/**
 * The standard catalogue. An account adds its own in the portal; those are
 * matched first, so a custom category always beats a built-in one.
 */
export const EMERGENCY_CATEGORIES: EmergencyCategory[] = [
  {
    id: 'fire-life-safety', label: 'Fire or life safety', trade: 'fire safety', safetyCritical: true,
    cues: ['fire', 'smoke', 'burning smell', 'gas leak', 'smell gas', 'smell of gas', 'carbon monoxide',
      'explosion', 'collapsed', 'trapped', 'someone is hurt', 'injured', 'unconscious',
      'not breathing', 'sparks', 'arcing', 'electrical fire'],
  },
  {
    id: 'flood', label: 'Flooding or water damage', trade: 'water damage', safetyCritical: false,
    cues: ['flood', 'flooding', 'water everywhere', 'ceiling is leaking', 'ceiling leak', 'water damage',
      'basement is full', 'water coming through', 'sewage', 'sewer backup'],
  },
  {
    id: 'plumbing', label: 'Plumbing emergency', trade: 'plumbing', safetyCritical: false,
    cues: ['burst pipe', 'pipe burst', 'leak', 'leaking', 'no water', 'water heater', 'hot water',
      'toilet', 'overflowing', 'drain', 'blocked', 'clogged', 'plumber', 'plumbing'],
  },
  {
    id: 'electrical', label: 'Electrical emergency', trade: 'electrical', safetyCritical: false,
    cues: ['no power', 'power is out', 'power outage', 'breaker', 'fuse', 'electric', 'electrical',
      'wiring', 'outlet', 'lights are out', 'shock'],
  },
  {
    id: 'hvac', label: 'Heating or cooling failure', trade: 'hvac', safetyCritical: false,
    cues: ['no heat', 'heating', 'furnace', 'boiler', 'freezing', 'no air', 'air conditioning',
      'hvac', 'too cold', 'too hot', 'thermostat'],
  },
  {
    id: 'lockout', label: 'Lockout', trade: 'locksmith', safetyCritical: false,
    cues: ['locked out', 'lockout', 'lost my key', 'lost keys', 'key broke',
      'cannot get in', 'door will not open', 'lock is broken'],
  },
  {
    id: 'structural', label: 'Structural damage', trade: 'structural', safetyCritical: false,
    cues: ['ceiling fell', 'wall is cracked', 'structural', 'roof', 'storm damage', 'tree fell',
      'window is broken', 'floor gave way'],
  },
  {
    id: 'security', label: 'Security incident', trade: 'security', safetyCritical: false,
    cues: ['break in', 'broke in', 'burglary', 'intruder', 'vandalism', 'door forced',
      'security', 'alarm is going'],
  },
  {
    id: 'elevator', label: 'Elevator entrapment', trade: 'elevator', safetyCritical: true,
    cues: ['elevator', 'lift is stuck', 'stuck in the elevator', 'entrapment'],
  },
  {
    id: 'general', label: 'General maintenance', trade: '', safetyCritical: false, cues: [],
  },
];

const GENERAL = EMERGENCY_CATEGORIES[EMERGENCY_CATEGORIES.length - 1];

export interface Classification {
  categoryId: string;
  label: string;
  trade: string;
  safetyCritical: boolean;
  /** The cue that decided it, so a wrong routing can be explained afterwards. */
  matched: string | null;
  /** 'none' means nothing was recognised and the catch-all took it. */
  confidence: 'high' | 'low' | 'none';
}

/**
 * What the caller is describing, from their own words.
 *
 * WHY SAFETY WINS REGARDLESS OF ORDER
 *
 * "There's water everywhere and I can smell gas" matches flooding first by
 * position and gas second. Dispatching that as a flood sends a plumber into a
 * building somebody should be walking out of. So every safety-critical cue is
 * checked across the whole sentence before any ordinary category is allowed to
 * win, and the ordinary match is kept alongside it as the trade.
 *
 * Longer cues beat shorter ones: "burst pipe" is a better answer than "pipe",
 * and a four-letter cue found inside a long sentence is reported as a guess
 * rather than a finding.
 */
export function classifyEmergency(
  speech: string,
  custom: EmergencyCategory[] = [],
): Classification {
  const text = ` ${String(speech || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  if (!text.trim()) {
    return { categoryId: GENERAL.id, label: GENERAL.label, trade: '', safetyCritical: false, matched: null, confidence: 'none' };
  }

  const catalogue = [...custom, ...EMERGENCY_CATEGORIES];
  let best: { category: EmergencyCategory; cue: string } | null = null;
  let safety: { category: EmergencyCategory; cue: string } | null = null;

  for (const category of catalogue) {
    for (const raw of category.cues) {
      const cue = String(raw || '').toLowerCase().trim();
      if (!cue || !text.includes(cue)) continue;
      if (category.safetyCritical && (!safety || cue.length > safety.cue.length)) {
        safety = { category, cue };
      }
      if (!best || cue.length > best.cue.length) best = { category, cue };
    }
  }

  if (safety) {
    // The trade still comes from the best ordinary match when there is one — a
    // gas leak alongside a flood is still water work once the building is clear.
    const trade = best && !best.category.safetyCritical ? best.category.trade : safety.category.trade;
    return {
      categoryId: safety.category.id,
      label: safety.category.label,
      trade,
      safetyCritical: true,
      matched: safety.cue,
      confidence: 'high',
    };
  }

  if (!best) {
    return { categoryId: GENERAL.id, label: GENERAL.label, trade: '', safetyCritical: false, matched: null, confidence: 'none' };
  }
  return {
    categoryId: best.category.id,
    label: best.category.label,
    trade: best.category.trade,
    safetyCritical: false,
    matched: best.cue,
    // One short cue in a long ramble is a guess; say so rather than pretending.
    confidence: best.cue.length >= 6 ? 'high' : 'low',
  };
}

/* ── the conversation ────────────────────────────────────────────────────── */

export type AttendantStep =
  | 'opening'     // asked what is happening, waiting for the description
  | 'address'     // the dialled number did not settle the property
  | 'unit'        // which unit, flat or suite
  | 'name'        // who is calling
  | 'callback'    // the number to ring back
  | 'dispatching' // enough is known; the work request is being written
  | 'handoff'     // a person is taking it
  | 'done';

export interface TranscriptLine {
  at: string;
  who: 'attendant' | 'caller';
  text: string;
}

export interface AttendantSession {
  id: string;
  /** The account whose rota this number belongs to. */
  accountEmail: string;
  /** The number the caller dialled, E.164. */
  dialled: string;
  /** The caller's own number, E.164, as Twilio reported it. */
  from: string;
  step: AttendantStep;
  /** How many questions have been put to the caller. Capped; see nextPrompt. */
  asked: number;
  /** How many times in a row nothing was understood. */
  misheard: number;
  description: string;
  categoryId: string;
  categoryLabel: string;
  trade: string;
  safetyCritical: boolean;
  /** Set when the number directory already knew the property. */
  propertyId: string | null;
  address: string;
  unit: string;
  callerName: string;
  callback: string;
  transcript: TranscriptLine[];
  dispatched: boolean;
  workRequestId: string | null;
  jobId: string | null;
  callId: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface AttendantSettings {
  enabled: boolean;
  /** Overrides the opening line. Empty means the generated one. */
  greeting: string;
  /** How the company names itself on the phone. */
  companyName: string;
  language: string;
  voice: string;
  recordCalls: boolean;
  askUnit: boolean;
  /** Hard stop on the conversation. A frightened caller is not a form. */
  maxQuestions: number;
  /** Where "let me get a person" goes. Empty means there is nobody to go to. */
  handoffNumber: string;
  customCategories: EmergencyCategory[];
}

export const ATTENDANT_DEFAULTS: AttendantSettings = {
  enabled: false,
  greeting: '',
  companyName: 'Black Phoenix',
  language: 'en-US',
  voice: 'Polly.Joanna',
  recordCalls: false,
  askUnit: true,
  maxQuestions: 6,
  handoffNumber: '',
  customCategories: [],
};

export function startSession(input: {
  id: string;
  accountEmail: string;
  dialled: string;
  from: string;
  propertyId?: string | null;
  address?: string;
  now?: string;
}): AttendantSession {
  const now = input.now || new Date().toISOString();
  return {
    id: input.id,
    accountEmail: String(input.accountEmail || '').toLowerCase(),
    dialled: String(input.dialled || ''),
    from: String(input.from || ''),
    step: 'opening',
    asked: 0,
    misheard: 0,
    description: '',
    categoryId: '',
    categoryLabel: '',
    trade: '',
    safetyCritical: false,
    propertyId: input.propertyId || null,
    address: String(input.address || ''),
    unit: '',
    callerName: '',
    callback: String(input.from || ''),
    transcript: [],
    dispatched: false,
    workRequestId: null,
    jobId: null,
    callId: null,
    startedAt: now,
    endedAt: null,
  };
}

/** The opening line. Says who answered, and warns about recording when it is on. */
export function greetingFor(settings: AttendantSettings): string {
  const base = String(settings.greeting || '').trim()
    || `Thank you for calling ${settings.companyName || 'the emergency line'}. `
      + 'This is the emergency attendant.';
  const consent = settings.recordCalls
    ? ' This call is recorded for quality and safety.'
    : '';
  return `${base}${consent} Please tell me what is happening.`;
}

/**
 * The line a safety-critical call gets before anything else.
 *
 * Said first and said plainly. The dispatch still happens afterwards — we are
 * not the emergency services, and telling somebody to ring them does not
 * discharge the obligation to send an engineer.
 */
export function safetyWarningFor(session: AttendantSession): string {
  if (!session.safetyCritical) return '';
  if (session.categoryId === 'elevator') {
    return 'Stay calm and stay inside the car. Do not try to force the doors. '
      + 'If anyone is unwell, hang up and dial 9 1 1 now.';
  }
  return 'This may be dangerous. Leave the building now and call 9 1 1 from outside. '
    + 'I will send someone as well.';
}

/**
 * What the attendant asks next, and nothing more than that.
 *
 * WHY THERE IS A CAP
 *
 * Because each question is another thirty seconds a tenant stands in rising
 * water answering a computer. Past `maxQuestions` the attendant stops asking
 * and dispatches with what it has — an emergency with a description and a
 * building is dispatchable; a complete form with no engineer on the way is not.
 */
export function nextPrompt(session: AttendantSession, settings: AttendantSettings): {
  step: AttendantStep;
  say: string;
} {
  if (session.step === 'handoff') {
    return { step: 'handoff', say: 'One moment. I am connecting you to a person now.' };
  }

  const capped = session.asked >= Math.max(2, settings.maxQuestions);

  if (!session.description) {
    return { step: 'opening', say: 'Please tell me what is happening.' };
  }
  if (!session.address && !session.propertyId && !capped) {
    return { step: 'address', say: 'What is the address of the property?' };
  }
  if (settings.askUnit && !session.unit && !capped) {
    return { step: 'unit', say: 'Which unit or apartment is it? If this is not a unit, say skip.' };
  }
  if (!session.callerName && !capped) {
    return { step: 'name', say: 'And your name, please?' };
  }
  if (!session.callback && !capped) {
    return { step: 'callback', say: 'What is the best number to call you back on?' };
  }
  return { step: 'dispatching', say: confirmationFor(session) };
}

/** Read back what is about to be dispatched, so a wrong address is caught on the call. */
export function confirmationFor(session: AttendantSession): string {
  const where = [session.unit && session.unit !== '-' ? `unit ${session.unit}` : '', session.address]
    .filter(Boolean).join(', ');
  const what = session.categoryLabel || 'an emergency';
  return `Thank you${session.callerName ? `, ${session.callerName}` : ''}. `
    + `I have ${what.toLowerCase()}${where ? ` at ${where}` : ''}. `
    + 'I am dispatching now, and you will get a text when someone accepts.';
}

/** Nothing was understood. Said differently each time rather than repeated. */
export function mishearPrompt(session: AttendantSession): string {
  if (session.misheard >= 2) {
    return 'I am having trouble hearing you. I will pass this to a person.';
  }
  return 'Sorry, I did not catch that. Please say it once more.';
}

const SKIP = /^(skip|none|no|n\/a|not applicable|nothing|house|single family)$/i;
const HUMAN = /(speak|talk) to (a |an |the )?(person|human|someone|somebody|operator|manager)|get me (a |an )?(person|human|operator)|real person/i;

/**
 * Fold one thing the caller said into the session.
 *
 * Returns a NEW session. It decides nothing about storage, which is why it can
 * be proven without any.
 */
export function applySpeech(
  session: AttendantSession,
  speech: string,
  settings: AttendantSettings,
  now: string = new Date().toISOString(),
): AttendantSession {
  const said = String(speech || '').trim();
  const next: AttendantSession = {
    ...session,
    transcript: said
      ? [...session.transcript, { at: now, who: 'caller' as const, text: said.slice(0, 1000) }]
      : [...session.transcript],
  };

  if (!said) {
    next.misheard = session.misheard + 1;
    if (next.misheard >= 3) next.step = 'handoff';
    return next;
  }
  next.misheard = 0;

  // Asking for a person is honoured at any point. The one thing worse than an
  // attendant that cannot understand is one that will not let go of the call.
  if (HUMAN.test(said)) {
    next.step = 'handoff';
    return next;
  }

  switch (session.step) {
    case 'opening': {
      next.description = said.slice(0, 2000);
      const verdict = classifyEmergency(next.description, settings.customCategories);
      next.categoryId = verdict.categoryId;
      next.categoryLabel = verdict.label;
      next.trade = verdict.trade;
      next.safetyCritical = verdict.safetyCritical;
      break;
    }
    case 'address':
      next.address = said.slice(0, 300);
      break;
    case 'unit':
      // A skipped unit is recorded as skipped rather than left empty, or the
      // question is asked again and again until the cap is spent on it.
      next.unit = SKIP.test(said) ? '-' : said.slice(0, 40);
      break;
    case 'name':
      next.callerName = said.slice(0, 120);
      break;
    case 'callback':
      next.callback = said.replace(/[^\d+]/g, '').slice(0, 20) || session.callback;
      break;
    default:
      // Anything said after the questions are done joins the description rather
      // than being dropped — it is often the most useful sentence on the call.
      next.description = `${next.description} ${said}`.trim().slice(0, 2000);
      break;
  }

  next.asked = session.asked + 1;
  return next;
}

/** Enough to send somebody: what it is, and where. */
export function readyToDispatch(session: AttendantSession): boolean {
  if (session.dispatched) return false;
  if (!session.description) return false;
  return Boolean(session.address || session.propertyId);
}

/**
 * The work request the rest of the platform already knows how to handle.
 *
 * `priority: 'urgent'` is what `isEmergency` reads, and `ownerEmail` is what
 * `accountForRequest` reads — ownership first, so the rota that answers is the
 * one the dialled number belongs to rather than whoever happened to ring.
 * Getting either wrong produces a call that is recorded and never routed,
 * which looks exactly like one that worked.
 */
export function workRequestFrom(session: AttendantSession, opts: {
  id: string;
  now?: string;
}): Record<string, any> {
  const now = opts.now || new Date().toISOString();
  const unit = session.unit && session.unit !== '-' ? session.unit : '';
  const where = [unit ? `Unit ${unit}` : '', session.address].filter(Boolean).join(', ');
  return {
    id: opts.id,
    source: 'ai-attendant',
    priority: 'urgent',
    isEmergency: true,
    status: 'pending',
    ownerEmail: session.accountEmail,
    client_name: session.callerName || 'Caller',
    client_email: '',
    client_phone: session.callback || session.from,
    title: `${session.categoryLabel || 'Emergency'}${where ? ` — ${where}` : ''}`.slice(0, 200),
    description: transcriptText(session),
    serviceType: session.trade || '',
    trade: session.trade || '',
    address: where || session.address,
    unit,
    propertyId: session.propertyId || null,
    safetyCritical: session.safetyCritical,
    attendantSessionId: session.id,
    created_at: now,
    updated_at: now,
  };
}

/** The call as a person would read it, newest line last. */
export function transcriptText(session: AttendantSession): string {
  const header = [
    `AI emergency attendant · ${session.categoryLabel || 'unclassified'}`,
    session.safetyCritical ? 'SAFETY CRITICAL — caller advised to call 911' : '',
    `Caller: ${session.callerName || 'not given'} · ${session.callback || session.from || 'no number'}`,
    `Dialled: ${session.dialled}`,
  ].filter(Boolean).join('\n');
  const body = session.transcript
    .map((line) => `${line.who === 'caller' ? 'Caller' : 'Attendant'}: ${line.text}`)
    .join('\n');
  return `${header}\n\n${body}`.slice(0, 8000);
}

/** One line for a notification or a list. */
export function summaryOf(session: AttendantSession): string {
  const unit = session.unit && session.unit !== '-' ? `unit ${session.unit}` : '';
  const where = [unit, session.address].filter(Boolean).join(', ');
  return [
    session.safetyCritical ? '🚨' : '',
    session.categoryLabel || 'Emergency',
    where ? `at ${where}` : '',
    session.callerName ? `· ${session.callerName}` : '',
  ].filter(Boolean).join(' ').trim();
}
