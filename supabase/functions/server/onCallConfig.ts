/**
 * onCallConfig — one portal account's answer to "who turns out, and when".
 *
 * Pure on purpose. Everything here decides who gets woken at three in the
 * morning and what they are owed for it, and none of it should need a network,
 * a clock it cannot control, or a running server to be proven. The router next
 * door does the reading and writing; this does the judging.
 *
 * WHOSE RECORD THIS IS
 *
 * The account's. Eric's decision is that each portal account runs its own
 * on-call — their people, their number, their hours — with Black Phoenix as the
 * escalation when nobody there answers, and with us running it outright only
 * for accounts that have added on-call to their subscription. So this is edited
 * by the portal holder, not only by staff, and it is keyed by their account.
 *
 * THE ORDER OF THE RULES IS NOT COSMETIC
 *
 * A contracted vendor wins outright. If an account already has somebody under
 * contract for that trade, the job goes to them and nowhere else — not to our
 * rota, not to the open exchange. A condo association that has signed an
 * agreement must not have it undercut by the platform it pays for, and a
 * routing pass that broadcasts first and checks afterwards has already done the
 * damage. `contractedFor` is therefore the first question, everywhere.
 */

/** Someone who can be rung. */
export interface OnCallContact {
  id: string;
  name: string;
  /** What Twilio actually dials. A contact without one cannot be paged. */
  phone: string;
  email?: string;
  /** "Plumber", "Site manager" — free text, shown to whoever is triaging. */
  role?: string;
  /** For our own technicians: apprentice, intermediate, advanced, master. */
  level?: string;
}

/** One rung of the ladder: ring these people, wait this long, then move on. */
export interface OnCallStep {
  contactIds: string[];
  waitMinutes: number;
}

export type HoursMode = 'always' | 'outside-business-hours' | 'custom';

export interface OnCallHours {
  mode: HoursMode;
  /** An IANA zone. Business hours mean nothing without one. */
  timezone: string;
  /** For 'outside-business-hours': the working day this is the outside of. */
  businessOpen?: string;   // "08:00"
  businessClose?: string;  // "17:00"
  /** For 'custom': the windows on-call actually covers. 0 is Sunday. */
  windows?: Array<{ day: number; from: string; to: string }>;
}

/**
 * Somebody already under contract for a trade.
 *
 * `exclusive` is the whole point. An exclusive vendor means the work never
 * reaches the open exchange, which is an agreement the account has made with
 * somebody else and the platform's job is to honour it.
 */
export interface ContractedVendor {
  trade: string;
  name: string;
  vendorId?: string;
  orgId?: string;
  phone?: string;
  email?: string;
  exclusive: boolean;
}

/** What a callout costs, over and above the subscription. */
export interface CallExtras {
  /** Turning up at all. */
  calloutCents: number;
  /** Added to the callout when the call lands outside the working day. */
  afterHoursCents: number;
  hourlyCents: number;
  /** Hours billed even if the work takes ten minutes. */
  minimumHours: number;
  notes?: string;
}

export interface OnCallConfig {
  /** The account this belongs to. */
  email: string;
  audience: string;
  /** Off means no rota — an emergency goes straight to escalation. */
  enabled: boolean;
  hours: OnCallHours;
  contacts: OnCallContact[];
  ladder: OnCallStep[];
  contractedVendors: ContractedVendor[];
  extras: CallExtras;
  /**
   * May an unanswered call fall through to Black Phoenix and the exchange?
   *
   * Defaults to true, because the alternative is a ladder that ends in silence.
   * An account can turn it off — some will have their own arrangements they do
   * not want undercut — and then an unanswered emergency stops with them, which
   * is their decision to make knowingly.
   */
  escalateToPlatform: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const cents = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100_000_00) : 0;
};

/** "08:00" → 480. Anything unreadable → null, never a silent zero. */
export function minutesOfDay(hhmm: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * A config cleaned to something that can be stored and trusted.
 *
 * WHY THE WAIT IS CLAMPED
 *
 * A step with a zero wait rings the next rung immediately, so the whole ladder
 * fires at once and there is no escalation left — everybody is woken and
 * nobody is responsible. A step with a wait of several hours is the opposite
 * failure and reads, to whoever set it, like a rota that works. One minute to
 * two hours covers every real arrangement and refuses both.
 *
 * WHY UNKNOWN CONTACT IDS ARE DROPPED FROM THE LADDER
 *
 * Because a rung pointing at somebody who has been removed is a rung that
 * silently does nothing, and it looks identical on screen to one that works.
 */
export function normalizeConfig(raw: any, fallback: { email: string; audience: string }): OnCallConfig {
  const contacts: OnCallContact[] = (Array.isArray(raw?.contacts) ? raw.contacts : [])
    .map((c: any, i: number) => ({
      id: str(c?.id, 40) || `c${i + 1}`,
      name: str(c?.name, 80),
      phone: str(c?.phone, 32),
      email: str(c?.email, 160) || undefined,
      role: str(c?.role, 60) || undefined,
      level: str(c?.level, 40) || undefined,
    }))
    .filter((c: OnCallContact) => Boolean(c.name))
    .slice(0, 50);

  const known = new Set(contacts.map((c) => c.id));

  const ladder: OnCallStep[] = (Array.isArray(raw?.ladder) ? raw.ladder : [])
    .map((s: any) => ({
      contactIds: (Array.isArray(s?.contactIds) ? s.contactIds : [])
        .map((id: any) => str(id, 40))
        .filter((id: string) => known.has(id))
        .slice(0, 20),
      waitMinutes: Math.min(120, Math.max(1, Math.round(Number(s?.waitMinutes)) || 5)),
    }))
    .filter((s: OnCallStep) => s.contactIds.length > 0)
    .slice(0, 10);

  const mode: HoursMode = ['always', 'outside-business-hours', 'custom'].includes(String(raw?.hours?.mode))
    ? raw.hours.mode
    : 'always';

  const windows = (Array.isArray(raw?.hours?.windows) ? raw.hours.windows : [])
    .map((w: any) => ({
      day: Math.min(6, Math.max(0, Math.round(Number(w?.day)) || 0)),
      from: str(w?.from, 5),
      to: str(w?.to, 5),
    }))
    .filter((w: any) => minutesOfDay(w.from) !== null && minutesOfDay(w.to) !== null)
    .slice(0, 21);

  return {
    email: String(fallback.email || '').toLowerCase(),
    audience: String(fallback.audience || ''),
    enabled: raw?.enabled === true,
    hours: {
      mode,
      // A zone we cannot read is worse than a default, because every hours
      // comparison below silently answers for the wrong part of the world.
      timezone: str(raw?.hours?.timezone, 64) || 'America/New_York',
      businessOpen: str(raw?.hours?.businessOpen, 5) || '08:00',
      businessClose: str(raw?.hours?.businessClose, 5) || '17:00',
      windows,
    },
    contacts,
    ladder,
    contractedVendors: (Array.isArray(raw?.contractedVendors) ? raw.contractedVendors : [])
      .map((v: any) => ({
        trade: str(v?.trade, 60).toLowerCase(),
        name: str(v?.name, 120),
        vendorId: str(v?.vendorId, 80) || undefined,
        orgId: str(v?.orgId, 80) || undefined,
        phone: str(v?.phone, 32) || undefined,
        email: str(v?.email, 160) || undefined,
        // Exclusivity is opt-in. Read as true by default it would quietly stop
        // work reaching the exchange for accounts that never asked for that.
        exclusive: v?.exclusive === true,
      }))
      .filter((v: ContractedVendor) => Boolean(v.trade && v.name))
      .slice(0, 50),
    extras: {
      calloutCents: cents(raw?.extras?.calloutCents),
      afterHoursCents: cents(raw?.extras?.afterHoursCents),
      hourlyCents: cents(raw?.extras?.hourlyCents),
      minimumHours: Math.min(24, Math.max(0, Number(raw?.extras?.minimumHours) || 0)),
      notes: str(raw?.extras?.notes, 500) || undefined,
    },
    escalateToPlatform: raw?.escalateToPlatform !== false,
    updatedAt: str(raw?.updatedAt, 40) || undefined,
    updatedBy: str(raw?.updatedBy, 160) || undefined,
  };
}

/** A usable empty config, so a portal opening this screen has something to edit. */
export function emptyConfig(email: string, audience: string): OnCallConfig {
  return normalizeConfig({}, { email, audience });
}

/**
 * The account's local day and minute, for a zone that is not ours.
 *
 * Done with Intl rather than arithmetic because the alternative is a fixed
 * offset, and a fixed offset is wrong twice a year — in the direction that
 * matters, since the hour a clock changes is the middle of the night.
 */
export function localParts(at: Date, timezone: string): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(at).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = Math.max(0, days.indexOf(String(parts.weekday || 'Sun')));
  // Intl renders midnight as 24 in some locales; both mean the start of the day.
  const hour = Number(parts.hour) % 24;
  return { day, minutes: hour * 60 + Number(parts.minute || 0) };
}

/** Does a window that may cross midnight contain this minute? */
function within(from: number, to: number, minute: number): boolean {
  return from <= to ? minute >= from && minute < to : minute >= from || minute < to;
}

/**
 * Is this account's on-call covering right now?
 *
 * `outside-business-hours` is the common arrangement and the one worth getting
 * right: on-call covers the night and the weekend, and during the working day
 * an emergency goes to whoever is already at a desk. Answering that backwards
 * would page somebody's night engineer at eleven on a Tuesday morning and leave
 * nobody at all at two on a Sunday.
 */
export function isOnCallNow(config: OnCallConfig, at: Date = new Date()): boolean {
  if (!config?.enabled) return false;
  const { day, minutes } = localParts(at, config.hours?.timezone || 'UTC');

  switch (config.hours?.mode) {
    case 'always':
      return true;

    case 'outside-business-hours': {
      // The weekend is outside the working day in its entirety.
      if (day === 0 || day === 6) return true;
      const open = minutesOfDay(config.hours.businessOpen) ?? 8 * 60;
      const close = minutesOfDay(config.hours.businessClose) ?? 17 * 60;
      return !within(open, close, minutes);
    }

    case 'custom':
      return (config.hours.windows || []).some((w) => {
        if (w.day !== day) return false;
        const from = minutesOfDay(w.from);
        const to = minutesOfDay(w.to);
        return from !== null && to !== null && within(from, to, minutes);
      });

    default:
      return false;
  }
}

/**
 * Anybody under contract for this trade.
 *
 * Matched loosely in both directions — "plumbing" should find a vendor
 * contracted for "plumbing & heating", and the reverse — because the trade on
 * an emergency is typed by whoever is panicking and will not match a stored
 * string exactly. A missed match here sends contracted work to the open market,
 * which is the failure this check exists to prevent.
 */
export function contractedFor(config: OnCallConfig, trade: string): ContractedVendor[] {
  const wanted = String(trade || '').trim().toLowerCase();
  if (!wanted) return [];
  return (config?.contractedVendors || []).filter((v) => {
    const theirs = String(v.trade || '').toLowerCase();
    return theirs === wanted || theirs.includes(wanted) || wanted.includes(theirs);
  });
}

/** Does a contracted arrangement stop this reaching the open exchange? */
export function heldByContract(config: OnCallConfig, trade: string): boolean {
  return contractedFor(config, trade).some((v) => v.exclusive);
}

/** The ladder with its contacts resolved, ready to ring. */
export function ladderWithContacts(
  config: OnCallConfig,
): Array<{ waitMinutes: number; contacts: OnCallContact[] }> {
  const byId = new Map((config?.contacts || []).map((c) => [c.id, c]));
  return (config?.ladder || []).map((step) => ({
    waitMinutes: step.waitMinutes,
    contacts: step.contactIds.map((id) => byId.get(id)).filter(Boolean) as OnCallContact[],
  }));
}

/**
 * How long the whole ladder takes before nobody is left to ring.
 *
 * This is the number the escalation runs on: once it has elapsed with no
 * answer, the call belongs to Black Phoenix or to the exchange.
 */
export function ladderMinutes(config: OnCallConfig): number {
  return (config?.ladder || []).reduce((sum, s) => sum + (Number(s.waitMinutes) || 0), 0);
}

/**
 * What is wrong with this rota, in words the account can act on.
 *
 * Worth its own function because the dangerous state is not an error anywhere:
 * on-call switched ON with an empty ladder, or with a ladder of people who have
 * no phone number, is a configuration that looks finished, reports nothing, and
 * rings nobody during an emergency. Somebody has to be told, on the screen
 * where they set it up, before the night it matters.
 */
export function readiness(config: OnCallConfig): { ready: boolean; problems: string[] } {
  const problems: string[] = [];
  if (!config?.enabled) {
    return { ready: false, problems: ['On-call is switched off for this account.'] };
  }
  const steps = ladderWithContacts(config);
  if (steps.length === 0) {
    problems.push('Nobody is on the rota, so an emergency would reach no one here.');
  }
  const unreachable = steps
    .flatMap((s) => s.contacts)
    .filter((c) => !c.phone);
  if (unreachable.length) {
    problems.push(
      `${unreachable.map((c) => c.name).join(', ')} ${unreachable.length === 1 ? 'has' : 'have'} `
      + 'no phone number, so they cannot be called.',
    );
  }
  if (config.hours?.mode === 'custom' && (config.hours.windows || []).length === 0) {
    problems.push('Custom hours are chosen but no hours are set, so on-call never covers anything.');
  }
  if (!config.escalateToPlatform && steps.length === 0) {
    problems.push('Escalation to Black Phoenix is off and the rota is empty — nothing would happen at all.');
  }
  return { ready: problems.length === 0, problems };
}

/**
 * What a callout costs, from the account's own rates.
 *
 * Computed here, from the stored record, and never from a figure a browser
 * sends — the same rule as every other total in this system. `afterHours` is
 * added rather than substituted, because turning out at 2am is the callout plus
 * the inconvenience, not a different callout.
 */
export function calloutCents(
  config: OnCallConfig,
  opts: { hours?: number; afterHours?: boolean } = {},
): { total: number; lines: Array<{ label: string; cents: number }> } {
  const extras = config?.extras;
  const lines: Array<{ label: string; cents: number }> = [];
  if (!extras) return { total: 0, lines };

  if (extras.calloutCents > 0) lines.push({ label: 'Callout', cents: extras.calloutCents });
  if (opts.afterHours && extras.afterHoursCents > 0) {
    lines.push({ label: 'Out of hours', cents: extras.afterHoursCents });
  }
  if (extras.hourlyCents > 0) {
    const billed = Math.max(Number(opts.hours) || 0, extras.minimumHours || 0);
    if (billed > 0) {
      lines.push({
        label: `Labour — ${billed} hour${billed === 1 ? '' : 's'}`,
        cents: Math.round(extras.hourlyCents * billed),
      });
    }
  }
  return { total: lines.reduce((sum, l) => sum + l.cents, 0), lines };
}
