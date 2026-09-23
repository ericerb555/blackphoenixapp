/**
 * onCallConfig — one portal account's answer to "who turns out, for what, and when".
 *
 * Pure on purpose. Everything here decides who gets woken at three in the
 * morning and what they are owed for it, and none of it should need a network,
 * a clock it cannot control, or a running server to be proven. The router next
 * door does the reading and writing; this does the judging.
 *
 * WHOSE RECORD THIS IS
 *
 * The account's. Each portal account runs its own on-call — their people, their
 * numbers, their hours — with Black Phoenix as the escalation when nobody there
 * answers, and with us running it outright for accounts that have added on-call
 * to their subscription.
 *
 * SEVERAL SERVICES, NOT ONE ROTA
 *
 * Eric's requirement, and it is how this actually works in a building: a burst
 * pipe and a tenant locked out are not the same emergency and do not wake the
 * same person. So an account keeps a list of **services** — one for plumbing,
 * one for lockouts, one for anything else — each with its own rota, its own
 * hours if they differ, its own rates if they differ, and its own answer to
 * whether an unanswered call should go out to the exchange.
 *
 * A service with no events listed is the catch-all: it answers whatever no
 * other service claims. Without one, an emergency in an unlisted trade would
 * match nothing and reach nobody, which is the failure that matters most here.
 *
 * THE ORDER OF THE RULES IS NOT COSMETIC
 *
 * A contracted vendor wins outright. If an account already has somebody under
 * contract for that trade, the job goes to them and nowhere else — not to their
 * own rota, not to ours, not to the open exchange. A condo association that has
 * signed an agreement must not have it undercut by the platform it pays for,
 * and a routing pass that broadcasts first and checks afterwards has already
 * done the damage. `contractedFor` is therefore the first question, everywhere.
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

/** One rung of a rota: ring these people, wait this long, then move on. */
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

/**
 * One kind of emergency, and who answers it.
 *
 * `hours` and `extras` are optional and mean "the account's own" when absent.
 * That is deliberate: most accounts want one set of hours and one set of rates,
 * and making every service restate them would turn one edit into five and let
 * them drift apart. A service that genuinely differs — a lockout line that runs
 * all night when everything else is office hours — overrides just that.
 */
export interface OnCallService {
  id: string;
  name: string;
  /**
   * The trades or event kinds this service answers.
   *
   * Empty means the catch-all: whatever no other service claims.
   */
  events: string[];
  ladder: OnCallStep[];
  hours?: OnCallHours;
  extras?: CallExtras;
  /**
   * When this service's rota is exhausted, put the job out to Phoenix Exchange.
   *
   * Per service because it is a per-service decision: an account may be happy
   * for a blocked drain to go to any subscribed contractor at 3am and want a
   * lift entrapment to stay with the firm that holds the maintenance contract.
   */
  sendToExchange: boolean;
  enabled: boolean;
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

export interface OnCallConfig {
  /** The account this belongs to. */
  email: string;
  audience: string;
  /** Off means no rota at all — an emergency goes straight to escalation. */
  enabled: boolean;
  /** The account's default hours; a service may override them. */
  hours: OnCallHours;
  /** The account's default rates; a service may override them. */
  extras: CallExtras;
  contacts: OnCallContact[];
  services: OnCallService[];
  contractedVendors: ContractedVendor[];
  /**
   * May an unanswered call fall through to Black Phoenix?
   *
   * Defaults to true, because the alternative is a rota that ends in silence.
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

function readHours(raw: any, fallbackMode: HoursMode = 'always'): OnCallHours {
  const mode: HoursMode = ['always', 'outside-business-hours', 'custom'].includes(String(raw?.mode))
    ? raw.mode
    : fallbackMode;
  const windows = (Array.isArray(raw?.windows) ? raw.windows : [])
    .map((w: any) => ({
      day: Math.min(6, Math.max(0, Math.round(Number(w?.day)) || 0)),
      from: str(w?.from, 5),
      to: str(w?.to, 5),
    }))
    .filter((w: any) => minutesOfDay(w.from) !== null && minutesOfDay(w.to) !== null)
    .slice(0, 21);

  return {
    mode,
    // A zone we cannot read is worse than a default, because every hours
    // comparison below silently answers for the wrong part of the world.
    timezone: str(raw?.timezone, 64) || 'America/New_York',
    businessOpen: str(raw?.businessOpen, 5) || '08:00',
    businessClose: str(raw?.businessClose, 5) || '17:00',
    windows,
  };
}

function readExtras(raw: any): CallExtras {
  return {
    calloutCents: cents(raw?.calloutCents),
    afterHoursCents: cents(raw?.afterHoursCents),
    hourlyCents: cents(raw?.hourlyCents),
    minimumHours: Math.min(24, Math.max(0, Number(raw?.minimumHours) || 0)),
    notes: str(raw?.notes, 500) || undefined,
  };
}

/**
 * A rota, cleaned.
 *
 * WHY THE WAIT IS CLAMPED
 *
 * A step with a zero wait rings the next rung immediately, so the whole rota
 * fires at once and there is no escalation left — everybody is woken and nobody
 * is responsible. A step with a wait of several hours is the opposite failure
 * and reads, to whoever set it, like a rota that works. One minute to two hours
 * covers every real arrangement and refuses both.
 *
 * WHY UNKNOWN CONTACT IDS ARE DROPPED
 *
 * Because a rung pointing at somebody who has been removed is a rung that
 * silently does nothing, and it looks identical on screen to one that works.
 */
function readLadder(raw: any, known: Set<string>): OnCallStep[] {
  return (Array.isArray(raw) ? raw : [])
    .map((s: any) => ({
      contactIds: (Array.isArray(s?.contactIds) ? s.contactIds : [])
        .map((id: any) => str(id, 40))
        .filter((id: string) => known.has(id))
        .slice(0, 20),
      waitMinutes: Math.min(120, Math.max(1, Math.round(Number(s?.waitMinutes)) || 5)),
    }))
    .filter((s: OnCallStep) => s.contactIds.length > 0)
    .slice(0, 10);
}

/** A config cleaned to something that can be stored and trusted. */
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
  const escalateToPlatform = raw?.escalateToPlatform !== false;

  /**
   * Services, with the single-rota shape carried forward.
   *
   * An earlier version of this record held one `ladder` on the config itself.
   * Anything saved in that shape becomes one catch-all service rather than
   * being dropped — losing somebody's rota in a format change is exactly the
   * kind of silent damage this file exists to avoid.
   */
  const rawServices = Array.isArray(raw?.services) && raw.services.length > 0
    ? raw.services
    : (Array.isArray(raw?.ladder) && raw.ladder.length > 0
      ? [{ id: 'general', name: 'General', events: [], ladder: raw.ladder, sendToExchange: escalateToPlatform, enabled: true }]
      : []);

  const services: OnCallService[] = rawServices
    .map((s: any, i: number) => ({
      id: str(s?.id, 40) || `s${i + 1}`,
      name: str(s?.name, 80),
      events: (Array.isArray(s?.events) ? s.events : [])
        .map((e: any) => str(e, 60).toLowerCase())
        .filter(Boolean)
        .slice(0, 20),
      ladder: readLadder(s?.ladder, known),
      // Absent means the account's own, so only a real object is kept.
      hours: s?.hours ? readHours(s.hours) : undefined,
      extras: s?.extras ? readExtras(s.extras) : undefined,
      sendToExchange: s?.sendToExchange === true,
      enabled: s?.enabled !== false,
    }))
    .filter((s: OnCallService) => Boolean(s.name))
    .slice(0, 20);

  return {
    email: String(fallback.email || '').toLowerCase(),
    audience: String(fallback.audience || ''),
    enabled: raw?.enabled === true,
    hours: readHours(raw?.hours),
    extras: readExtras(raw?.extras),
    contacts,
    services,
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
    escalateToPlatform,
    updatedAt: str(raw?.updatedAt, 40) || undefined,
    updatedBy: str(raw?.updatedBy, 160) || undefined,
  };
}

/** A usable empty config, so a portal opening this screen has something to edit. */
export function emptyConfig(email: string, audience: string): OnCallConfig {
  return normalizeConfig({}, { email, audience });
}

/* ── matching an emergency to a service ──────────────────────────────────── */

/**
 * Loose in both directions, on purpose.
 *
 * "plumbing" should find a service listed for "plumbing & heating", and the
 * reverse, because the trade on an emergency is typed by whoever is panicking
 * and will not match a stored string exactly.
 */
function eventMatches(listed: string, wanted: string): boolean {
  const a = String(listed || '').trim().toLowerCase();
  const b = String(wanted || '').trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Which service answers this kind of emergency.
 *
 * A named match wins over the catch-all, so an account that has set up a
 * plumbing line gets the plumbing line. Falling back to the catch-all is what
 * stops an unlisted trade reaching nobody — and if there is no catch-all
 * either, this answers null and the caller escalates rather than guessing.
 */
export function serviceFor(config: OnCallConfig, event: string): OnCallService | null {
  const live = (config?.services || []).filter((s) => s.enabled !== false);
  const named = live.find((s) => (s.events || []).some((e) => eventMatches(e, event)));
  if (named) return named;
  return live.find((s) => (s.events || []).length === 0) || null;
}

/** The hours this service runs to — its own, or the account's. */
export function hoursFor(config: OnCallConfig, service?: OnCallService | null): OnCallHours {
  return service?.hours || config.hours;
}

/** The account's own rates for this service — its own, or the account's default. */
export function extrasFor(config: OnCallConfig, service?: OnCallService | null): CallExtras {
  return service?.extras || config.extras;
}

/**
 * WHOSE rates apply to this callout.
 *
 * The account sets rates on its own record, and that is correct for a rota
 * they run themselves: it is their contractor turning out and their money.
 * It is exactly wrong when Black Phoenix answers, because then the figures
 * are OURS and the person being charged them would be the one editing them.
 * A customer could set our callout to zero from the setup screen.
 *
 * So when we answer, the platform rates win and the account's are ignored
 * entirely — not merged, not used as a floor. A merge would let a customer
 * influence our pricing through whichever field we happened to read from
 * their side.
 *
 * `platform` is passed in rather than read, because this file is pure and
 * because the caller is the only thing that knows whether the subscription
 * has actually been paid for.
 */
export function ratesFor(
  config: OnCallConfig,
  opts: {
    service?: OnCallService | null;
    /** Has this account paid for Black Phoenix to answer? */
    weAnswer?: boolean;
    /** Our rates. Required for them to be used at all. */
    platform?: CallExtras | null;
  } = {},
): { rates: CallExtras; owner: 'platform' | 'account' } {
  if (opts.weAnswer && opts.platform) {
    return { rates: opts.platform, owner: 'platform' };
  }
  return { rates: extrasFor(config, opts.service), owner: 'account' };
}

/* ── when it covers ──────────────────────────────────────────────────────── */

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

function coversAt(hours: OnCallHours, at: Date): boolean {
  const { day, minutes } = localParts(at, hours?.timezone || 'UTC');
  switch (hours?.mode) {
    case 'always':
      return true;

    case 'outside-business-hours': {
      // The weekend is outside the working day in its entirety.
      if (day === 0 || day === 6) return true;
      const open = minutesOfDay(hours.businessOpen) ?? 8 * 60;
      const close = minutesOfDay(hours.businessClose) ?? 17 * 60;
      return !within(open, close, minutes);
    }

    case 'custom':
      return (hours.windows || []).some((w) => {
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
 * Is on-call covering right now — for one service, or for the account at all?
 *
 * `outside-business-hours` is the common arrangement and the one worth getting
 * right: on-call covers the night and the weekend, and during the working day
 * an emergency goes to whoever is already at a desk. Answering that backwards
 * would page somebody's night engineer at eleven on a Tuesday morning and leave
 * nobody at all at two on a Sunday.
 */
export function isOnCallNow(
  config: OnCallConfig,
  service?: OnCallService | null,
  at: Date = new Date(),
): boolean {
  if (!config?.enabled) return false;
  if (service) {
    if (service.enabled === false) return false;
    return coversAt(hoursFor(config, service), at);
  }
  // No service named: covering if ANY live service is covering, because the
  // account is reachable for something.
  const live = (config.services || []).filter((s) => s.enabled !== false);
  if (live.length === 0) return coversAt(config.hours, at);
  return live.some((s) => coversAt(hoursFor(config, s), at));
}

/* ── contracted vendors, which come before everything ────────────────────── */

export function contractedFor(config: OnCallConfig, trade: string): ContractedVendor[] {
  const wanted = String(trade || '').trim().toLowerCase();
  if (!wanted) return [];
  return (config?.contractedVendors || []).filter((v) => eventMatches(v.trade, wanted));
}

/** Does a contracted arrangement stop this reaching the open exchange? */
export function heldByContract(config: OnCallConfig, trade: string): boolean {
  return contractedFor(config, trade).some((v) => v.exclusive);
}

/* ── the rota ────────────────────────────────────────────────────────────── */

/** One service's rota with its contacts resolved, ready to ring. */
export function ladderWithContacts(
  config: OnCallConfig,
  service?: OnCallService | null,
): Array<{ waitMinutes: number; contacts: OnCallContact[] }> {
  const byId = new Map((config?.contacts || []).map((c) => [c.id, c]));
  return (service?.ladder || []).map((step) => ({
    waitMinutes: step.waitMinutes,
    contacts: step.contactIds.map((id) => byId.get(id)).filter(Boolean) as OnCallContact[],
  }));
}

/**
 * How long a service's rota takes before nobody is left to ring.
 *
 * This is the number the escalation runs on: once it has elapsed with no
 * answer, the call belongs to Black Phoenix or to the exchange.
 */
export function ladderMinutes(service?: OnCallService | null): number {
  return (service?.ladder || []).reduce((sum, s) => sum + (Number(s.waitMinutes) || 0), 0);
}

/**
 * Where an unanswered call goes after this service has run out of people.
 *
 * The exchange is a per-service choice; falling back to Black Phoenix is an
 * account-wide one. Both can be true, and the order matters to the router
 * rather than here — this only reports what the account has asked for.
 */
export function afterTheRota(
  config: OnCallConfig,
  service?: OnCallService | null,
): { exchange: boolean; platform: boolean } {
  return {
    exchange: service?.sendToExchange === true,
    platform: config?.escalateToPlatform !== false,
  };
}

/* ── the state that looks finished and rings nobody ──────────────────────── */

/**
 * What is wrong with this setup, in words the account can act on.
 *
 * Worth its own function because the dangerous state is not an error anywhere:
 * on-call switched ON with an empty rota, or with a rota of people who have no
 * phone number, is a configuration that looks finished, reports nothing, and
 * rings nobody during an emergency. Somebody has to be told, on the screen
 * where they set it up, before the night it matters.
 */
export function readiness(config: OnCallConfig): { ready: boolean; problems: string[] } {
  const problems: string[] = [];
  if (!config?.enabled) {
    return { ready: false, problems: ['On-call is switched off for this account.'] };
  }

  const live = (config.services || []).filter((s) => s.enabled !== false);
  if (live.length === 0) {
    problems.push('No on-call services are set up, so an emergency would reach no one here.');
    return { ready: false, problems };
  }

  for (const service of live) {
    const steps = ladderWithContacts(config, service);
    const where = service.name || 'A service';
    if (steps.length === 0) {
      problems.push(`${where} has nobody on its rota, so those calls would reach no one.`);
      continue;
    }
    const unreachable = steps.flatMap((s) => s.contacts).filter((c) => !c.phone);
    if (unreachable.length) {
      problems.push(
        `${where}: ${unreachable.map((c) => c.name).join(', ')} `
        + `${unreachable.length === 1 ? 'has' : 'have'} no phone number, so they cannot be called.`,
      );
    }
    const hours = hoursFor(config, service);
    if (hours.mode === 'custom' && (hours.windows || []).length === 0) {
      problems.push(`${where} is set to specific hours but none are set, so it never covers anything.`);
    }
  }

  /**
   * Nothing catches an unlisted trade.
   *
   * Every service naming its events means an emergency in a trade nobody
   * thought of matches none of them. With escalation on, that lands with us and
   * is survivable; with escalation off it lands nowhere at all.
   */
  const hasCatchAll = live.some((s) => (s.events || []).length === 0);
  if (!hasCatchAll && !config.escalateToPlatform) {
    problems.push(
      'Every service covers named trades only, and escalation is off — an emergency in '
      + 'any other trade would reach nobody. Add a service with no trades listed to catch the rest.',
    );
  }

  return { ready: problems.length === 0, problems };
}

/* ── what a callout costs ────────────────────────────────────────────────── */

/**
 * From the account's own rates, or the service's where it sets its own.
 *
 * Computed here, from the stored record, and never from a figure a browser
 * sends — the same rule as every other total in this system. `afterHours` is
 * added rather than substituted, because turning out at 2am is the callout plus
 * the inconvenience, not a different callout.
 */
export function calloutCents(
  config: OnCallConfig,
  opts: {
    service?: OnCallService | null;
    hours?: number;
    afterHours?: boolean;
    weAnswer?: boolean;
    platform?: CallExtras | null;
  } = {},
): {
  total: number;
  lines: Array<{ label: string; cents: number }>;
  chargedBy: 'platform' | 'account';
} {
  const { rates: extras, owner } = ratesFor(config, opts);
  const lines: Array<{ label: string; cents: number }> = [];
  if (!extras) return { total: 0, lines, chargedBy: owner };

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
  return { total: lines.reduce((sum, l) => sum + l.cents, 0), lines, chargedBy: owner };
}
