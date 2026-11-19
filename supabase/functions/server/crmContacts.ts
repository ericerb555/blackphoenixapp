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
  email: string;
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
  const out: Record<string, unknown> = { email, updatedAt: now };

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
 * The array is read, matched on email, and written back — matching how every
 * other writer of this key behaves. Returns what was stored and whether it
 * was new, so a caller can log something true.
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
  const email = normaliseEmail(person.email);
  if (!email) throw new Error('a CRM contact needs an email');

  const contacts = ((await store.get(CRM_CONTACTS_KEY)) as Record<string, unknown>[]) || [];
  const index = contacts.findIndex((c) => normaliseEmail(c?.email) === email);
  const contact = mergeCrmContact(index >= 0 ? contacts[index] : undefined, person, now);

  if (index >= 0) contacts[index] = contact;
  else contacts.unshift(contact);

  await store.set(CRM_CONTACTS_KEY, contacts);
  return { created: index < 0, contact };
}
