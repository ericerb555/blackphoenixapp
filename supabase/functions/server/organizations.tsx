/**
 * organizations — make sure a provisioned portal has an organisation behind it.
 *
 * WHAT WAS WRONG
 *
 * `organizations` rows have only ever been created by one back-fill migration,
 * which ran on 2026-08-15. Nothing creates one when a portal is provisioned. So
 * every account invited since that date has a portal, a feature grant and a
 * login, and no organisation at all.
 *
 * Verified against production on 2026-09-22: eleven organisations exist, while
 * portal_access holds accounts of six types with none — advertiser,
 * condo_manager, investor, property_manager, tenant and territory_owner.
 *
 * WHY THAT MATTERS RATHER THAN BEING UNTIDY
 *
 * Everything in Phoenix Exchange hangs off `org_id`. A bid request is owned by
 * an organisation, an invitation to bid is addressed to one, a bid is submitted
 * by one, and the RLS policies are written in terms of organisation membership.
 * An account with no organisation cannot post work, cannot be invited to quote,
 * and cannot be the party a contract hangs off — silently, because nothing
 * errors. The screen simply has nothing in it.
 *
 * WHAT IS DELIBERATELY NOT AN ORGANISATION
 *
 * Four portal types map to nothing here, each for the reason the original
 * schema gave for excluding employees: they are people or parties *inside*
 * somebody else's organisation, and giving them their own would read wrong the
 * moment a bid or an invoice hangs off `org_id`.
 *
 *   employee         a person inside the operator org; already a membership role
 *   tenant           belongs to a landlord's building — their emergency is work
 *                    on that landlord's property and belongs to that org
 *   investor         funds work, never raises any
 *   territory_owner  plausible, undecided, and nothing needs it yet
 *
 * Returning null for these is the answer, not a failure.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

/**
 * Portal type to organisation type.
 *
 * Spelled out rather than passed through, because `organizations.type` is a
 * Postgres enum and an unknown value is a hard error from the database rather
 * than a row that fails a check later. The back-fill migration casts
 * `portalType::org_type` directly, which is exactly why a portal type outside
 * the enum breaks it.
 */
const ORG_TYPE: Record<string, string> = {
  customer: "customer",
  landlord: "landlord",
  vendor: "vendor",
  subcontractor: "subcontractor",
  advertiser: "advertiser",
  property_manager: "property_manager",
  condo_manager: "condo_manager",
  condo_association: "condo_association",
  operator: "operator",
};

export function orgTypeFor(portalType: string): string | null {
  return ORG_TYPE[String(portalType || "").trim().toLowerCase()] || null;
}

/**
 * The slug, derived the same way the back-fill derived it.
 *
 * From the email local part and the portal type, NOT the person's name: three
 * different people called Mark Sutton would otherwise collide on a unique
 * slug, which is the case the migration already hit in live data. Matching its
 * shape also means the back-fill and this cannot produce two rows for one
 * account.
 */
export function orgSlug(email: string, portalType: string): string {
  const local = String(email || "").split("@")[0].toLowerCase();
  return `${local.replace(/[^a-z0-9]+/g, "-")}-${String(portalType || "").toLowerCase()}`;
}

export interface EnsureResult {
  created: boolean;
  orgId: string | null;
  slug: string | null;
  /** Why nothing was created, when nothing was. */
  reason: string | null;
}

const SKIPPED = (reason: string): EnsureResult => ({
  created: false, orgId: null, slug: null, reason,
});

/**
 * Create the organisation for a provisioned portal, if there should be one.
 *
 * IT MUST NEVER BREAK AN INVITE
 *
 * Every failure here returns rather than throws. The caller is the invite flow,
 * and Eric's standing rule is that every path onto the platform has to work —
 * an account that cannot be invited because a row could not be written is a
 * worse outcome than an account whose organisation is created later by the
 * back-fill. So this reports and the invite carries on.
 */
export async function ensureOrganization(opts: {
  email: string;
  name?: string;
  portalType: string;
}): Promise<EnsureResult> {
  const email = String(opts.email || "").trim().toLowerCase();
  const portalType = String(opts.portalType || "").trim().toLowerCase();
  if (!email) return SKIPPED("no email");

  const type = orgTypeFor(portalType);
  if (!type) return SKIPPED(`${portalType || "that portal type"} is not an organisation`);

  const slug = orgSlug(email, portalType);

  try {
    const existing = await admin
      .from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (existing.data?.id) {
      return { created: false, orgId: String(existing.data.id), slug, reason: "already exists" };
    }

    const { data, error } = await admin
      .from("organizations")
      .insert({
        type,
        // The person's name where there is one; the email is a poor label but a
        // far better one than a blank.
        name: String(opts.name || "").trim() || email,
        slug,
        email,
        status: "active",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      console.log(`[Orgs] could not create ${slug}: ${error.message}`);
      return SKIPPED(error.message);
    }
    console.log(`[Orgs] created ${type} organisation ${slug} for ${email}`);
    return { created: true, orgId: data?.id ? String(data.id) : null, slug, reason: null };
  } catch (e: any) {
    console.log(`[Orgs] ensureOrganization threw for ${slug}: ${e?.message || e}`);
    return SKIPPED(e?.message || "unknown error");
  }
}

export { admin as orgsAdminClient };
