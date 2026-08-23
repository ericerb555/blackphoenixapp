/**
 * Turning an approved vendor or subcontractor into somebody who can be invited
 * to bid.
 *
 * THE GAP THIS CLOSES
 *
 * Approving an application wrote an intake record and a portal access grant,
 * both in the key-value store, and stopped there. Phoenix Exchange does not read
 * the key-value store — invitations, bids and the provider directory all live in
 * Postgres, behind row-level security. So an approved subcontractor existed
 * everywhere except the one place that would let them price work, and the
 * directory could never fill itself no matter how many people applied.
 *
 * Nothing in the server had ever inserted into `organizations` or
 * `organization_members`; the rows that exist came from a one-off backfill.
 *
 * TWO THINGS THIS IS CAREFUL ABOUT
 *
 * It is idempotent. Approving twice — which happens, because approval is a
 * button somebody can press again — must not leave two organisations with the
 * same company in them, so an existing match is reused and returned.
 *
 * An organisation with no member is useless and, worse, silent: you can invite
 * it, the row is written, and no human is ever notified. When the contact has no
 * account yet the organisation is still created so it can be invited, and the
 * caller is told to send an invitation so the contact can claim it. That state
 * is reported rather than hidden.
 */

export type ProviderType = 'vendor' | 'subcontractor';

/**
 * Resolve an email to an auth user id.
 *
 * Paginated on purpose. `listUsers()` with no arguments returns only the first
 * page, so on a growing account it quietly stops finding people who signed up
 * later — and the failure mode is silent: the organisation is created with no
 * member, and the person is told to claim an account they already have.
 */
export function makeUserFinder(auth: any) {
  return async function findUserIdByEmail(email: string): Promise<string | null> {
    const wanted = String(email || '').trim().toLowerCase();
    if (!wanted) return null;
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await auth.admin.listUsers({ page, perPage: 200 });
      if (error) return null;
      const users = data?.users || [];
      const hit = users.find((u: any) => String(u?.email || '').trim().toLowerCase() === wanted);
      if (hit) return String(hit.id);
      if (users.length < 200) return null;   // last page reached
    }
    return null;
  };
}

export interface ProviderOrgDeps {
  /** Service-role Postgres client. */
  db: any;
  /** Resolve an email to an auth user id, or null when they have no account. */
  findUserIdByEmail: (email: string) => Promise<string | null>;
}

export interface ProviderOrgResult {
  created: boolean;
  reused: boolean;
  orgId: string | null;
  slug: string | null;
  /** True when the organisation has no member and somebody must claim it. */
  needsClaim: boolean;
  memberUserId: string | null;
  error?: string;
}

/** Only these two bid on work. Everyone else keeps the portal they already had. */
export function isProviderType(portalType: unknown): portalType is ProviderType {
  return portalType === 'vendor' || portalType === 'subcontractor';
}

/**
 * A URL-safe slug. Collisions are resolved by the caller, which appends a short
 * suffix — `slug` is unique in the schema, so a clash is an error rather than a
 * silent overwrite.
 */
export function slugify(input: string): string {
  const base = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'provider';
}

/** The company name to use, preferring what they actually typed. */
export function providerName(application: Record<string, any>): string {
  const candidates = [
    application?.companyName, application?.company, application?.businessName,
    application?.company_name, application?.business_name, application?.name,
  ];
  for (const c of candidates) {
    const v = String(c ?? '').trim();
    if (v) return v.slice(0, 160);
  }
  return '';
}

export function providerEmail(application: Record<string, any>): string {
  const candidates = [application?.email, application?.contactEmail, application?.contact_email];
  for (const c of candidates) {
    const v = String(c ?? '').trim().toLowerCase();
    if (v) return v;
  }
  return '';
}

export async function ensureProviderOrg(
  deps: ProviderOrgDeps,
  application: Record<string, any>,
  portalType: unknown,
): Promise<ProviderOrgResult> {
  const nothing: ProviderOrgResult = {
    created: false, reused: false, orgId: null, slug: null, needsClaim: false, memberUserId: null,
  };

  if (!isProviderType(portalType)) return nothing;

  const name = providerName(application);
  const email = providerEmail(application);
  // Without a company name there is nothing to call the organisation, and an
  // organisation named after an email address is worse than none.
  if (!name) return { ...nothing, error: 'The application has no company name, so no organisation was created.' };

  try {
    // ── reuse before creating ────────────────────────────────────────────────
    //
    // The contact email is the identity, and when there is one it is the ONLY
    // thing matched on. Falling back to the company name whenever the email
    // missed was wrong in a way a test caught: two genuinely different firms
    // that happen to share a name — two "Apex Tile"s at different addresses —
    // were merged into a single organisation, which would put one company's
    // people inside the other's, reading their sealed bids.
    //
    // The name is only consulted when the application carries no email at all,
    // where it is the best identity available and a duplicate is the lesser
    // risk than an organisation nobody can be matched to.
    let existing: any = null;

    if (email) {
      const { data } = await deps.db
        .from('organizations')
        .select('id, slug, name, type')
        .eq('type', portalType)
        .ilike('email', email)
        .limit(1);
      existing = data?.[0] || null;
    } else {
      const { data } = await deps.db
        .from('organizations')
        .select('id, slug, name, type')
        .eq('type', portalType)
        .ilike('name', name)
        .limit(1);
      existing = data?.[0] || null;
    }

    let orgId: string;
    let slug: string;
    let created = false;

    if (existing) {
      orgId = String(existing.id);
      slug = String(existing.slug || '');
    } else {
      // `slug` is unique across every organisation, not just providers, so a
      // second "Granite Tile" needs its own. Two attempts then give up rather
      // than looping against the database.
      const wanted = slugify(name);
      let inserted: any = null;
      let lastError: any = null;

      for (const candidate of [wanted, `${wanted}-${Math.random().toString(36).slice(2, 6)}`]) {
        const { data, error } = await deps.db
          .from('organizations')
          .insert({
            type: portalType,
            name,
            slug: candidate,
            email: email || null,
            phone: String(application?.phone ?? application?.contactPhone ?? '').trim() || null,
            website: String(application?.website ?? '').trim() || null,
            status: 'active',
          })
          .select('id, slug')
          .limit(1);
        if (!error && data?.[0]) { inserted = data[0]; break; }
        lastError = error;
      }

      if (!inserted) {
        return { ...nothing, error: lastError?.message || 'Could not create the organisation.' };
      }
      orgId = String(inserted.id);
      slug = String(inserted.slug);
      created = true;
    }

    // ── attach the person ────────────────────────────────────────────────────
    let memberUserId: string | null = null;
    if (email) {
      memberUserId = await deps.findUserIdByEmail(email).catch(() => null);
    }

    if (memberUserId) {
      // onConflict on (org_id, user_id) so re-approval does not error, and an
      // existing membership is left as it is rather than being downgraded.
      await deps.db
        .from('organization_members')
        .upsert(
          { org_id: orgId, user_id: memberUserId, role: 'owner', status: 'active' },
          { onConflict: 'org_id,user_id', ignoreDuplicates: true },
        );
    }

    // Whether anybody can actually see this organisation is a question about the
    // organisation, not about this call — a reused org may already have members
    // even when this applicant has no account.
    const { count } = await deps.db
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'active');

    return {
      created,
      reused: !created,
      orgId,
      slug,
      memberUserId,
      needsClaim: !(Number(count) > 0),
    };
  } catch (error: any) {
    return { ...nothing, error: error?.message || 'Could not set up the provider organisation.' };
  }
}
