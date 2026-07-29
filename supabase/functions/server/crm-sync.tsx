/**
 * Shared CRM Sync Helper
 *
 * Single source of truth for turning ANY onboarding event (customer signup,
 * portal application, service-provider signup, etc.) into CRM records.
 *
 * The platform historically stored CRM data in three unaligned places, and the
 * different CRM screens each read a different one:
 *   - LeadCRM         → `lead:*`               (via crm-content.tsx /crm/leads)
 *   - CustomersNew    → `customer:*`           (via /customers)
 *   - UnifiedCRMHub   → `crm_contacts:default` (via /crm/contacts)
 *
 * To guarantee every new account shows up in every CRM view, this helper writes
 * to ALL THREE stores at once, deduplicated by email so repeated calls (retries,
 * signup + profile create) never create duplicates.
 */

import * as kv from "./kv_store.tsx";

const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// crm-content.tsx only accepts these lead sources; anything else is coerced to
// "email" on read, so we tag the real origin instead of losing it.
const CRM_CONTACTS_KEY = "crm_contacts:default";

export interface CrmSyncInput {
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  /** Portal / account type, e.g. "customer", "service_provider", "vendor". */
  type?: string;
  /** Where the record came from, e.g. "application", "signup". */
  source?: string;
  service?: string;
  value?: number;
  userId?: string;
  /** Extra fields to retain on the customer + contact records for context. */
  extra?: Record<string, any>;
}

export interface CrmSyncResult {
  email: string;
  leadId: string;
  customerId: string;
  contactId: string;
  created: boolean;
}

/**
 * Best-effort extraction of a contact's core fields from an arbitrary
 * application payload (application forms use many different field ids).
 */
export function extractContact(body: Record<string, any>): {
  email: string;
  name: string;
  phone: string;
  city: string;
} {
  const pick = (...candidates: string[]): string => {
    for (const key of Object.keys(body || {})) {
      const lower = key.toLowerCase();
      if (candidates.some((c) => lower === c || lower.includes(c))) {
        const v = body[key];
        if (typeof v === "string" && v.trim()) return v.trim();
        if (typeof v === "number") return String(v);
      }
    }
    return "";
  };

  const email = pick("email").toLowerCase();
  const first = pick("firstname", "first_name");
  const last = pick("lastname", "last_name");
  const combined = [first, last].filter(Boolean).join(" ").trim();
  const name =
    combined ||
    pick("fullname", "full_name", "contactname", "companyname", "businessname", "name") ||
    (email ? email.split("@")[0] : "");
  const phone = pick("phone", "tel", "mobile");
  const city = pick("city", "town");
  return { email, name, phone, city };
}

/**
 * Write a contact into all three CRM stores. Idempotent by email.
 */
export async function syncToCrm(input: CrmSyncInput): Promise<CrmSyncResult> {
  const email = (input.email || "").toLowerCase().trim();
  if (!email) throw new Error("email is required for CRM sync");

  const name = (input.name || "").trim() || email.split("@")[0];
  const phone = input.phone || "";
  const city = input.city || "";
  const type = input.type || "customer";
  const source = input.source || "signup";
  const now = new Date().toISOString();

  // ── 1) LEAD store (`lead:*`) — read by LeadCRM ────────────────────────────
  const existingLeads = (await kv.getByPrefix("lead:")) || [];
  let lead: any = existingLeads.find((l: any) => (l?.email || "").toLowerCase() === email);
  if (!lead) {
    lead = {
      id: uid("lead"),
      name,
      email,
      phone,
      city,
      source: "referral", // shown as-is; unknown sources render as "email"
      service: input.service || type,
      stage: "new",
      score: Math.floor(50 + Math.random() * 30),
      value: Number(input.value) || 0,
      tags: [type, source].filter(Boolean),
      urgent: false,
      status: "new",
      createdAt: Date.now(),
    };
    await kv.set(`lead:${lead.id}`, lead);
  }

  // ── 2) CUSTOMER store (`customer:*`) — read by CustomersNew / /customers ───
  const existingCustomers = (await kv.getByPrefix("customer:")) || [];
  let customer: any = existingCustomers.find(
    (cust: any) => (cust?.email || "").toLowerCase() === email,
  );
  const created = !customer;
  if (!customer) {
    const [firstName, ...rest] = name.split(" ");
    const id = input.userId || `CUST-${Date.now()}`;
    customer = {
      id,
      customer_number: `CUST-${existingCustomers.length + 1}`,
      first_name: firstName || name,
      last_name: rest.join(" "),
      email,
      phone,
      status: "lead",
      source,
      account_type: type,
      total_spent: 0,
      project_count: 0,
      rating: 0,
      tags: [type, source].filter(Boolean),
      user_id: input.userId || null,
      ...(input.extra || {}),
      created_at: now,
      updated_at: now,
    };
    await kv.set(`customer:${id}`, customer);
  }

  // ── 3) CRM CONTACTS store (`crm_contacts:default`) — read by UnifiedCRMHub ─
  const saved: any = (await kv.get(CRM_CONTACTS_KEY)) || { contacts: [], hidden: [] };
  const contacts: any[] = Array.isArray(saved.contacts) ? saved.contacts : [];
  let contact = contacts.find((ct: any) => (ct?.email || "").toLowerCase() === email);
  if (!contact) {
    contact = {
      id: uid("contact"),
      name,
      email,
      phone,
      company: input.extra?.company || "",
      type,
      status: "lead",
      source,
      createdAt: now,
    };
    contacts.push(contact);
    await kv.set(CRM_CONTACTS_KEY, { ...saved, contacts });
  }

  return {
    email,
    leadId: lead.id,
    customerId: customer.id,
    contactId: contact.id,
    created,
  };
}
