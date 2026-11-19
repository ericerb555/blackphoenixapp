/**
 * One definition of a CRM contact, and one way to put somebody into the CRM.
 *
 * Eric, 2026-11-19: *"can we make sure that when people add into the app he
 * get put into the crm"*.
 *
 * THEY WERE NOT. AND THE CODE SAID THEY WERE.
 *
 * The CRM is a single array at `crm_contacts:default`. Every screen that
 * shows people reads it — `GET /customers`, `GET /customers/stats`, the CRM
 * hub. Signup, meanwhile, wrote a record at `customer:{id}` and logged:
 *
 *     ✅ [CRM] Added signup to CRM: someone@example.com (CUST-123)
 *
 * Two different stores. The log named the right intention and the write went
 * somewhere nothing reads, so the failure was invisible from both ends: the
 * server reported success and the CRM was simply empty. Measured on live
 * data, every one of the nine signups was missing, along with all three user
 * profiles and half the portal grants. Only job applications arrived, because
 * that one flow happened to write the array directly — inline, with its own
 * twenty-five lines of contact shaping.
 *
 * So this module exists to make "put them in the CRM" a single call that
 * cannot be satisfied by writing the wrong key. Where a caller previously
 * hand-rolled a contact, it now hands a person to `crmContactFrom` and gets
 * the same shape every other caller gets.
 *
 * WHY THE MERGE RULES ARE THE INTERESTING PART
 *
 * Somebody arrives more than once: they enquire, then apply, then sign up.
 * Each arrival knows something the last did not, and none of them should
 * reset what is already recorded — a signup must not blank the company name
 * an application captured, and must not demote a customer back to a lead.
 * `mergeCrmContact` is where that is decided, and it is tested rather than
 * argued about.
 */

/** The array the whole CRM lives in. */
export const CRM_CONTACTS_KEY = 'crm_contacts:default';

/** What a caller knows about the person who just arrived. */
export interface ArrivingPerson {
  /**
   * Optional, because the junk-removal pricer collects a phone and leaves the
   * email blank. One of the two is required — see `contactKeyOf`.
   */
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  location?: string;
  /** 'customer' | 'employee' | 'partner' — what they are to the business. */
  type?: string;
  /** Where they came from: 'signup', 'application', 'intake', 'estimate'… */
  source?: string;
  /** Extra labels for this arrival. Merged with any already on the contact. */
  tags?: string[];
  /** The auth user, when there is one. */
  userId?: string | null;
  /** Anything else the caller wants recorded, applied before the merge rules. */
  extra?: Record<string, unknown>;
}

const clean = (value: unknown): string => String(value ?? '').trim();

/** Lower-cased and trimmed, which is how every lookup compares an email. */
export function normaliseEmail(value: unknown): string {
  return clean(value).toLowerCase();
}

/**
 * A phone reduced to its digits, so formatting cannot split one person in two.
 *
 * "(603) 555-0188", "603-555-0188" and "6035550188" are one number, and a
 * CRM that files them as three people is worse than no CRM.
 *
 * A number longer than ten digits is compared by its LAST ten, so
 * "+1 603 555 0188" matches "603-555-0188". A shorter one is left exactly as
 * it is rather than padded: inventing an area code is how two different
 * people get merged into one contact, and that is the unrecoverable
 * direction.
 */
export function phoneDigits(value: unknown): string {
  const digits = clean(value).replace(/[^0-9]+/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * What identifies this person, for matching against the contacts on file.
 *
 * Email where there is one. The junk-removal pricer is why there is a
 * fallback: it requires a PHONE and leaves email optional, on the reasoning
 * that *"an email with no name is a lead nobody knows how to greet; a name
 * and a number is a phone call"*. Those leads belong in the CRM, and
 * refusing them for want of an email would keep out the one arrival route
 * built for somebody standing in a basement holding a phone.
 */
export function contactKeyOf(person: { email?: string; phone?: string }): { kind: 'email' | 'phone'; value: string } | null {
  const email = normaliseEmail(person?.email);
  if (email) return { kind: 'email', value: email };
  const phone = phoneDigits(person?.phone);
  if (phone) return { kind: 'phone', value: phone };
  return null;
}

/**
 * A status we are confident about, ranked.
 *
 * `GET /customers` only recognises these four, so a contact carrying anything
 * else reads as a lead there. Ranking them lets a later arrival promote
 * somebody without ever demoting them: signing up when you are already an
 * active customer must not put you back to 'lead'.
 */
const STATUS_RANK: Record<string, number> = { lead: 0, inactive: 0, active: 1, vip: 2 };

/** The higher-standing of two statuses, defaulting to 'lead'. */
export function bestStatus(existing: unknown, incoming: unknown): string {
  const a = clean(existing).toLowerCase();
  const b = clean(incoming).toLowerCase();
  const known = (s: string) => (s in STATUS_RANK ? s : '');
  const ka = known(a);
  const kb = known(b);
  if (!ka && !kb) return 'lead';
  if (!ka) return kb;
  if (!kb) return ka;
  return STATUS_RANK[kb] > STATUS_RANK[ka] ? kb : ka;
}

/** A person's display name, from whichever of the three fields they gave. */
export function nameOf(person: ArrivingPerson): string {
  const joined = [clean(person.firstName), clean(person.lastName)].filter(Boolean).join(' ');
  return clean(person.name) || joined;
}

/**
 * The contact an arrival implies, before any merge with what is on file.
 *
 * Empty strings are left OFF rather than written as ''. A blank is not a
 * correction, and `mergeCrmContact` can only protect a recorded value if it
 * can tell "they did not say" from "they said nothing".
 */
export function crmContactFrom(person: ArrivingPerson, now = new Date().toISOString()): Record<string, unknown> {
  const email = normaliseEmail(person.email);
  const out: Record<string, unknown> = { updatedAt: now };
  /* Only written when there is one — a phone-only lead has no email at all,
     and storing '' would make it look like a cleared field. */
  if (email) out.email = email;

  const name = nameOf(person);
  if (name) out.name = name;
  if (clean(person.firstName)) out.first_name = clean(person.firstName);
  if (clean(person.lastName)) out.last_name = clean(person.lastName);
  if (clean(person.phone)) out.phone = clean(person.phone);
  if (clean(person.company)) out.company = clean(person.company);
  if (clean(person.location)) out.location = clean(person.location);
  if (clean(person.type)) out.type = clean(person.type);
  if (clean(person.source)) out.source = clean(person.source);
  if (person.userId) out.user_id = person.userId;
  if (person.extra) {
    for (const [key, value] of Object.entries(person.extra)) {
      if (value !== undefined) out[key] = value;
    }
  }
  return out;
}

/**
 * The contact to store, given what is on file and who just arrived.
 *
 * `prior` is undefined for somebody new. Everything the arrival states wins;
 * everything it is silent about is kept. The exceptions are the three fields
 * where "newest wins" would lose information:
 *
 *   - `status` is promoted, never demoted. See `bestStatus`.
 *   - `tags` accumulate, because they record how somebody reached us and
 *     there is no later arrival that makes an earlier route untrue.
 *   - `source` keeps the FIRST one. It answers "where did this person come
 *     from", and overwriting it with 'signup' erases the campaign, referral
 *     or application that actually brought them in.
 */
export function mergeCrmContact(
  prior: Record<string, unknown> | undefined,
  person: ArrivingPerson,
  now = new Date().toISOString(),
): Record<string, unknown> {
  const incoming = crmContactFrom(person, now);
  const base = prior || {};

  const priorTags = Array.isArray(base.tags) ? (base.tags as unknown[]).map(clean) : [];
  const newTags = (person.tags || []).map(clean);
  const tags = Array.from(new Set([...priorTags, ...newTags].filter(Boolean)));

  return {
    ...base,
    ...incoming,
    id: base.id || person.userId || `crm_${crypto.randomUUID()}`,
    status: bestStatus(base.status, (person.extra as any)?.status),
    source: clean(base.source) || clean(person.source) || 'crm',
    tags,
    createdAt: base.createdAt || base.created_at || now,
  };
}

/**
 * Put somebody into the CRM, creating or updating their one contact.
 *
 * The array is read, matched on whatever identifies them, and written back —
 * matching how every other writer of this key behaves. Returns what was
 * stored and whether it was new, so a caller can log something true rather
 * than something hopeful, which is the bug this module was written for.
 *
 * `store` is the kv module, passed in rather than imported, so this can be
 * tested without a database and so a caller cannot accidentally point it at
 * a different key.
 */
export async function upsertCrmContact(
  store: { get: (key: string) => Promise<unknown>; set: (key: string, value: unknown) => Promise<unknown> },
  person: ArrivingPerson,
  now = new Date().toISOString(),
): Promise<{ created: boolean; contact: Record<string, unknown> }> {
  const key = contactKeyOf(person);
  if (!key) throw new Error('a CRM contact needs an email or a phone number');

  const contacts = ((await store.get(CRM_CONTACTS_KEY)) as Record<string, unknown>[]) || [];
  /*
   * Matched on the same thing that identified them. A phone-only arrival is
   * compared by number; once they give an email, that becomes the key and
   * the phone match is what joins the two arrivals into one contact.
   */
  const index = contacts.findIndex((c) => (
    key.kind === 'email'
      ? normaliseEmail(c?.email) === key.value
      : phoneDigits(c?.phone) === key.value && !normaliseEmail(c?.email)
  ));
  const contact = mergeCrmContact(index >= 0 ? contacts[index] : undefined, person, now);

  if (index >= 0) contacts[index] = contact;
  else contacts.unshift(contact);

  await store.set(CRM_CONTACTS_KEY, contacts);
  return { created: index < 0, contact };
}

/**
 * Put somebody into the CRM, and never let that failure lose the arrival.
 *
 * Every caller of this is somewhere a person has just been created — an
 * account, a portal grant, an estimate they want ringing back about. That
 * record is the durable part and is already written by the time this runs.
 * A CRM array that cannot be read or written must not turn a successful
 * signup into a failed one: somebody being told their registration failed,
 * with a working account sitting there, is the worse bug.
 *
 * It logs what ACTUALLY happened. That is the part that was missing — the
 * old signup path logged the CRM write unconditionally, and there was no
 * CRM write, so the one place a human might have noticed said it was fine.
 */
export async function putIntoCrmSafely(
  store: { get: (key: string) => Promise<unknown>; set: (key: string, value: unknown) => Promise<unknown> },
  person: ArrivingPerson,
  now = new Date().toISOString(),
): Promise<{ created: boolean; contact: Record<string, unknown> } | null> {
  const who = normaliseEmail(person?.email) || phoneDigits(person?.phone) || '(nobody)';
  try {
    const result = await upsertCrmContact(store, person, now);
    console.log(`[CRM] ${result.created ? 'added' : 'updated'} contact for ${who} from ${person.source || 'crm'}`);
    return result;
  } catch (err: any) {
    console.error(`[CRM] could not write the contact for ${who}: ${err?.message || err}`);
    return null;
  }
}
