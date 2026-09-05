/**
 * The vendor record an approved vendor needs in order to have a portal.
 *
 * WHY IT WAS MISSING
 *
 * Approving a vendor application already did a great deal: an intake record,
 * portal access, an `organizations` row and an `organization_members` row in
 * Postgres, and an invitation to claim it. That is the Phoenix Exchange
 * identity, and it is what lets somebody be invited to price work.
 *
 * The vendor *portal* resolves against something else entirely — a `vendor:`
 * record in the key-value store, matched by `app_metadata.vendorId` or by email.
 * Nothing on the server ever wrote one. The only `createVendor` in the codebase
 * lives in `src/app/lib/supabase-data.ts` and calls `localStorage.setItem`, so a
 * vendor created in the admin UI existed in that browser and nowhere else.
 *
 * The result: an approved vendor could be invited to bid and could not open
 * their own catalogue, purchase orders or billing. Two identity systems, no
 * bridge. This is the bridge, and it is written at approval so identity is
 * created in one place at one moment rather than twice by hand.
 *
 * WHAT IT WILL NOT DO
 *
 * It will not overwrite a vendor record somebody has since edited. Payment
 * terms, a corrected company name and a category are things the office sets
 * afterwards, and an approval being re-saved must not quietly undo them.
 * Existing values win; only genuinely absent fields are filled.
 */

export interface VendorRecord {
  id: string;
  name: string;
  email: string;
  contactEmail: string;
  phone: string;
  category: string;
  status: string;
  /** How this record came to exist, so a hand-made one is distinguishable. */
  source: string;
  applicationId: string;
  /** The Postgres organisation the same approval created, when there was one. */
  exchangeOrgId: string | null;
  paymentTerms: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A stable id derived from the application.
 *
 * Stable because approving twice must not produce two vendors. Derived from the
 * application rather than the clock for the same reason — `VEN-${Date.now()}`,
 * which is what the localStorage version used, gives a different vendor every
 * time somebody presses approve again.
 */
export function vendorIdForApplication(applicationId: string): string {
  const clean = String(applicationId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 48);
  return clean ? `VEN-${clean}` : '';
}

/** The email fields a vendor record is matched on, lowercased. */
function pickEmail(application: Record<string, any>): string {
  for (const v of [application?.email, application?.contactEmail, application?.contact_email]) {
    const s = String(v ?? '').trim().toLowerCase();
    if (s) return s;
  }
  return '';
}

function pickName(application: Record<string, any>): string {
  for (const v of [
    application?.companyName, application?.company, application?.businessName,
    application?.company_name, application?.business_name, application?.name,
  ]) {
    const s = String(v ?? '').trim();
    if (s) return s.slice(0, 160);
  }
  return '';
}

/**
 * Build the record, merged over whatever is already stored.
 *
 * Returns null when there is no email — the portal matches on email, so a
 * record without one can never be resolved by anybody and would sit in the
 * store looking like a linked vendor that is not.
 */
export function vendorRecordFrom(
  application: Record<string, any>,
  existing: Partial<VendorRecord> | null,
  nowIso: string,
  exchangeOrgId: string | null = null,
): VendorRecord | null {
  const id = existing?.id || vendorIdForApplication(String(application?.id || ''));
  const email = pickEmail(application);
  if (!id || !email) return null;

  const keep = (current: unknown, incoming: string) => {
    const c = String(current ?? '').trim();
    return c || incoming;
  };

  return {
    id,
    // Existing values win. The office corrects a company name and sets payment
    // terms after approval; re-saving the application must not undo that.
    name: keep(existing?.name, pickName(application) || email),
    email: keep(existing?.email, email),
    contactEmail: keep(existing?.contactEmail, email),
    phone: keep(existing?.phone, String(application?.phone ?? '').trim()),
    category: keep(existing?.category, String(application?.category ?? application?.serviceType ?? '').trim()),
    status: keep(existing?.status, 'active'),
    source: existing?.source || 'application-approval',
    applicationId: String(application?.id || existing?.applicationId || ''),
    exchangeOrgId: existing?.exchangeOrgId || exchangeOrgId || null,
    // Deliberately not a default. Payment terms are a commercial agreement, and
    // inventing "Net 30" here would put a term on an invoice that nobody agreed.
    paymentTerms: keep(existing?.paymentTerms, ''),
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Would writing this record collide with a different vendor on the same email?
 *
 * Two vendor records sharing an address is worse than none: `vendorActor` takes
 * the first match it finds, so which portal a person sees would depend on the
 * order the store returned them in.
 */
export function conflictingVendor(
  candidates: Array<Partial<VendorRecord>>,
  id: string,
  email: string,
): Partial<VendorRecord> | null {
  const wanted = String(email || '').toLowerCase();
  if (!wanted) return null;
  return candidates.find((v) =>
    String(v?.id || '') !== id
    && [v?.email, v?.contactEmail, (v as any)?.ownerEmail]
      .some((e) => String(e || '').toLowerCase() === wanted),
  ) || null;
}
