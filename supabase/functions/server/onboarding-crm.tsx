/**
 * Onboarding & CRM Router
 *
 * Implements the create-account / application endpoints the frontend already
 * calls but which were never mounted on the deployed function:
 *   - POST /applications            (+ /applications/submit alias)  — all portal apps
 *   - GET  /applications            — admin list
 *   - POST /signup/universal        — portal card signups
 *   - GET/POST /customers, /customers/:id, /customers/stats
 *   - GET/POST /crm/contacts        — UnifiedCRMHub saved contacts
 *   - GET/POST /intake/my-onboarding + /profile — onboarding checklist
 *
 * Every entry point funnels new people through syncToCrm() so they land in ALL
 * CRM views at once and get an onboarding intake record created.
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { syncToCrm, extractContact } from "./crm-sync.tsx";

const router = new Hono();
const P = "/make-server-57095a78";

const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const APPLICATIONS_KEY = "applications";
const CRM_CONTACTS_KEY = "crm_contacts:default";
const INTAKE = (id: string) => `intake:onboarding:${id}`;
const INTAKE_EMAIL = (email: string) => `intake:email:${email.toLowerCase().trim()}`;

// Default onboarding checklists per portal type.
function defaultRequirements(type: string): Array<{ id: string; label: string; status: string }> {
  const base = [
    { id: "profile", label: "Complete your profile", status: "pending" },
    { id: "agreement", label: "Review & accept agreement", status: "pending" },
  ];
  const byType: Record<string, Array<{ id: string; label: string; status: string }>> = {
    service_provider: [
      { id: "insurance", label: "Upload proof of insurance", status: "pending" },
      { id: "license", label: "Upload trade license", status: "pending" },
      { id: "w9", label: "Submit W-9", status: "pending" },
    ],
    vendor: [{ id: "w9", label: "Submit W-9", status: "pending" }, { id: "catalog", label: "Share product catalog", status: "pending" }],
    subcontractor: [{ id: "insurance", label: "Upload proof of insurance", status: "pending" }, { id: "w9", label: "Submit W-9", status: "pending" }],
    employee: [{ id: "w4", label: "Complete W-4 paperwork", status: "pending" }, { id: "id", label: "Upload photo ID", status: "pending" }],
    customer: [{ id: "property", label: "Add your property details", status: "pending" }],
  };
  return [...base, ...(byType[type] || [])];
}

async function createIntake(params: { email: string; name: string; type: string; applicationId: string; crm: any }) {
  const record = {
    id: params.applicationId,
    applicationId: params.applicationId,
    email: params.email,
    name: params.name,
    portalType: params.type,
    status: "onboarding",
    requirements: defaultRequirements(params.type),
    crmLeadId: params.crm?.leadId,
    crmCustomerId: params.crm?.customerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await kv.set(INTAKE(params.applicationId), record);
  await kv.set(INTAKE_EMAIL(params.email), { applicationId: params.applicationId });
  return record;
}

// ════════════════════════════════════════════════════════════════════════════
// APPLICATIONS  (all portal application forms POST here)
// ════════════════════════════════════════════════════════════════════════════
async function handleApplication(c: any) {
  try {
    const body = await c.req.json();
    const { email, name, phone, city } = extractContact(body);
    if (!email) {
      return c.json({ success: false, error: "An email address is required to submit an application." }, 400);
    }

    const type = body.applicationType || body.portalType || body.type || "applicant";
    const id = `APP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const application = {
      id,
      email,
      name,
      phone,
      city,
      applicationType: type,
      applicationTitle: body.applicationTitle || "",
      status: "pending",
      data: body,
      submittedAt: new Date().toISOString(),
    };

    const all = (await kv.get(APPLICATIONS_KEY)) || [];
    const list = Array.isArray(all) ? all : [];
    list.push(application);
    await kv.set(APPLICATIONS_KEY, list);

    // Sync to every CRM store + kick off the onboarding checklist.
    const crm = await syncToCrm({
      email,
      name,
      phone,
      city,
      type,
      source: "application",
      extra: { company: body.companyName || body.businessName || "" },
    });
    const intake = await createIntake({ email, name, type, applicationId: id, crm });

    return c.json({
      success: true,
      message: "Application submitted successfully. We've started your onboarding.",
      application,
      applicationId: id,
      onboarding: intake,
      crm,
    });
  } catch (e: any) {
    console.log("Application submit error:", e?.message);
    return c.json({ success: false, error: `Failed to submit application: ${e?.message || e}` }, 500);
  }
}

router.post(`${P}/applications`, handleApplication);
router.post(`${P}/applications/submit`, handleApplication);
router.post(`${P}/signup/universal`, handleApplication);

router.get(`${P}/applications`, async (c) => {
  try {
    const all = (await kv.get(APPLICATIONS_KEY)) || [];
    const applications = (Array.isArray(all) ? all : []).sort(
      (a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    return c.json({ success: true, applications });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

router.get(`${P}/applications/:id`, async (c) => {
  try {
    const all = (await kv.get(APPLICATIONS_KEY)) || [];
    const application = (Array.isArray(all) ? all : []).find((a: any) => a.id === c.req.param("id"));
    if (!application) return c.json({ success: false, error: "Application not found" }, 404);
    return c.json({ success: true, application });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

router.patch(`${P}/applications/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const all = (await kv.get(APPLICATIONS_KEY)) || [];
    const list = Array.isArray(all) ? all : [];
    const idx = list.findIndex((a: any) => a.id === id);
    if (idx === -1) return c.json({ success: false, error: "Application not found" }, 404);
    const changes = await c.req.json();
    list[idx] = { ...list[idx], ...changes, id, updatedAt: new Date().toISOString() };
    await kv.set(APPLICATIONS_KEY, list);
    return c.json({ success: true, application: list[idx] });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMERS  (customer registration + admin customer management)
// ════════════════════════════════════════════════════════════════════════════
async function listCustomers() {
  const all = (await kv.getByPrefix("customer:")) || [];
  return all.sort(
    (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
  );
}

router.get(`${P}/customers`, async (c) => {
  try {
    return c.json({ success: true, customers: await listCustomers() });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

router.get(`${P}/customers/stats`, async (c) => {
  try {
    const customers = await listCustomers();
    const stats = {
      total: customers.length,
      active: customers.filter((x: any) => x.status === "active").length,
      leads: customers.filter((x: any) => x.status === "lead").length,
      totalRevenue: customers.reduce((sum: number, x: any) => sum + Number(x.total_spent || 0), 0),
    };
    return c.json({ success: true, stats });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

router.post(`${P}/customers`, async (c) => {
  try {
    const body = await c.req.json();
    const email = (body.email || "").toLowerCase().trim();
    if (!email) return c.json({ success: false, error: "Email is required" }, 400);
    const name = [body.first_name, body.last_name].filter(Boolean).join(" ").trim() || body.name || email.split("@")[0];

    // syncToCrm writes/dedupes the customer record across all CRM stores.
    const crm = await syncToCrm({
      email,
      name,
      phone: body.phone,
      city: body.city,
      type: body.account_type || "customer",
      source: body.source || "signup",
      userId: body.userId,
      extra: {
        address_line1: body.address_line1,
        address_line2: body.address_line2,
        state: body.state,
        zip_code: body.zip_code,
        propertyType: body.propertyType,
        plan: body.plan,
        planPreference: body.planPreference,
        marketingEmails: body.marketingEmails,
        status: body.status || "active",
      },
    });

    // Merge any additional profile fields onto the stored customer record.
    const existing: any = (await kv.getByPrefix("customer:")).find(
      (x: any) => (x?.email || "").toLowerCase() === email,
    );
    if (existing) {
      const updated = { ...existing, ...body, id: existing.id, email, updated_at: new Date().toISOString() };
      await kv.set(`customer:${existing.id}`, updated);
      return c.json({ success: true, customer: updated, crm });
    }
    return c.json({ success: true, crm });
  } catch (e: any) {
    console.log("Customer create error:", e?.message);
    return c.json({ success: false, error: e?.message }, 500);
  }
});

router.get(`${P}/customers/:id`, async (c) => {
  try {
    const customer = await kv.get(`customer:${c.req.param("id")}`);
    if (!customer) return c.json({ success: false, error: "Customer not found" }, 404);
    return c.json({ success: true, customer });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

router.put(`${P}/customers/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const existing: any = await kv.get(`customer:${id}`);
    if (!existing) return c.json({ success: false, error: "Customer not found" }, 404);
    const changes = await c.req.json();
    const updated = { ...existing, ...changes, id, updated_at: new Date().toISOString() };
    await kv.set(`customer:${id}`, updated);
    return c.json({ success: true, customer: updated });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

router.delete(`${P}/customers/:id`, async (c) => {
  try {
    await kv.del(`customer:${c.req.param("id")}`);
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// CRM CONTACTS  (UnifiedCRMHub saved contacts)
// ════════════════════════════════════════════════════════════════════════════
router.get(`${P}/crm/contacts`, async (c) => {
  try {
    const saved: any = (await kv.get(CRM_CONTACTS_KEY)) || { contacts: [], hidden: [] };
    return c.json({ success: true, contacts: saved.contacts || [], hidden: saved.hidden || [] });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

router.post(`${P}/crm/contacts`, async (c) => {
  try {
    const body = await c.req.json();
    const saved: any = (await kv.get(CRM_CONTACTS_KEY)) || { contacts: [], hidden: [] };
    const next = {
      contacts: Array.isArray(body.contacts) ? body.contacts : saved.contacts || [],
      hidden: Array.isArray(body.hidden) ? body.hidden : saved.hidden || [],
    };
    await kv.set(CRM_CONTACTS_KEY, next);
    return c.json({ success: true, ...next });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ONBOARDING INTAKE
// ════════════════════════════════════════════════════════════════════════════
router.get(`${P}/intake/my-onboarding`, async (c) => {
  try {
    const email = (c.req.query("email") || "").toLowerCase().trim();
    if (!email) return c.json({ success: true, onboarding: null });
    const ref: any = await kv.get(INTAKE_EMAIL(email));
    if (!ref?.applicationId) return c.json({ success: true, onboarding: null });
    const onboarding = await kv.get(INTAKE(ref.applicationId));
    return c.json({ success: true, onboarding: onboarding || null });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

// Admin: view any onboarding intake record by application id.
router.get(`${P}/intake/onboarding/:id`, async (c) => {
  try {
    const intake = await kv.get(INTAKE(c.req.param("id")));
    return c.json({ success: true, intake: intake || null });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

router.post(`${P}/intake/my-onboarding/profile`, async (c) => {
  try {
    const body = await c.req.json();
    const email = (body.email || "").toLowerCase().trim();
    const ref: any = email ? await kv.get(INTAKE_EMAIL(email)) : null;
    if (!ref?.applicationId) return c.json({ success: false, error: "No onboarding record found for this account." }, 404);
    const record: any = await kv.get(INTAKE(ref.applicationId));
    if (!record) return c.json({ success: false, error: "Onboarding record not found." }, 404);
    const requirements = (record.requirements || []).map((r: any) =>
      r.id === "profile" ? { ...r, status: "complete" } : r,
    );
    const updated = { ...record, profile: body, requirements, updatedAt: new Date().toISOString() };
    await kv.set(INTAKE(ref.applicationId), updated);
    return c.json({ success: true, onboarding: updated });
  } catch (e: any) {
    return c.json({ success: false, error: e?.message }, 500);
  }
});

export default router;
