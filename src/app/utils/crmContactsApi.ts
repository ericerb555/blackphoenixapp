/**
 * crmContactsApi — pulls real, signed-in customers/users from the server into the
 * CRM. Signup writes a `customer:` record (see server ensureCrmCustomer), exposed
 * by GET /customers. This bridges those into the CRM Hub's Contact shape so people
 * who have already signed in show up alongside locally-managed contacts.
 */

import { projectId, publicAnonKey } from './supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };
}

export type CrmContactType =
  | 'customer' | 'property_manager' | 'landlord' | 'condo' | 'subcontractor'
  | 'vendor' | 'investor' | 'advertiser' | 'employee' | 'supplier' | 'territory';

export interface CrmContact {
  id: string;
  name: string;
  type: CrmContactType;
  email: string;
  phone: string;
  company?: string;
  location?: string;
  tags: string[];
  lastContact?: string;
  status: 'active' | 'inactive' | 'lead' | 'prospect';
  notes?: string;
  avatar?: string;
  source?: string;
}

const ACCOUNT_TYPE_TO_CONTACT: Record<string, CrmContactType> = {
  customer: 'customer',
  homeowner: 'customer',
  property_manager: 'property_manager',
  landlord: 'landlord',
  condo: 'condo',
  condo_manager: 'condo',
  subcontractor: 'subcontractor',
  service_provider: 'subcontractor',
  vendor: 'vendor',
  supplier: 'supplier',
  investor: 'investor',
  advertiser: 'advertiser',
  employee: 'employee',
};

function toStatus(raw: any): CrmContact['status'] {
  const s = String(raw || '').toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'inactive') return 'inactive';
  if (s === 'prospect') return 'prospect';
  return 'lead';
}

/** Normalize a server customer/user record into a CRM Contact. */
function mapRecord(r: any): CrmContact | null {
  if (!r) return null;
  const email = (r.email || r.emailAddress || '').toLowerCase().trim();
  const first = r.first_name || r.firstName || '';
  const last = r.last_name || r.lastName || '';
  const name = (`${first} ${last}`.trim() || r.name || r.full_name || r.fullName || email).trim();
  if (!name && !email) return null;

  const location =
    r.city && r.state ? `${r.city}, ${r.state}` : r.location || r.address || '';

  const rawType = (r.account_type || r.accountType || r.type || r.role || 'customer')
    .toString()
    .toLowerCase();

  return {
    id: String(r.id || r.user_id || email),
    name: name || email,
    type: ACCOUNT_TYPE_TO_CONTACT[rawType] || 'customer',
    email,
    phone: r.phone || r.phoneNumber || '',
    company: r.company_name || r.company || r.dba || undefined,
    location: location || undefined,
    tags: Array.isArray(r.tags) ? r.tags : [],
    lastContact: r.updated_at || r.updatedAt || r.created_at || r.createdAt,
    status: toStatus(r.status),
    source: r.source || 'account',
  };
}

async function fetchJson(path: string): Promise<any[]> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
    if (!res.ok) {
      console.error(`[crmContactsApi] ${path} failed with ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.customers)) return data.customers;
    if (Array.isArray(data?.users)) return data.users;
    return [];
  } catch (err) {
    console.error(`[crmContactsApi] Error fetching ${path}:`, err);
    return [];
  }
}

/**
 * Fetch all signed-in customers + users from the server and return them as
 * deduped CRM contacts (by email, falling back to id).
 */
/**
 * Load manually-managed CRM contacts and the hidden-id list from the server.
 * Returns null for `contacts` when nothing has been saved yet so callers can seed.
 */
export async function fetchSavedCrm(): Promise<{ contacts: any[] | null; hidden: string[] }> {
  try {
    const res = await fetch(`${BASE}/crm/contacts`, { headers: authHeaders() });
    const json = await res.json();
    if (json.success) {
      return {
        contacts: Array.isArray(json.contacts) ? json.contacts : null,
        hidden: Array.isArray(json.hidden) ? json.hidden : [],
      };
    }
    console.error('[crmContactsApi] fetchSavedCrm failed:', json.error);
  } catch (err) {
    console.error('[crmContactsApi] Error loading saved CRM:', err);
  }
  return { contacts: null, hidden: [] };
}

/** Persist manually-managed CRM contacts and/or the hidden-id list to the server. */
export async function saveSavedCrm(payload: { contacts?: any[]; hidden?: string[] }): Promise<void> {
  try {
    const res = await fetch(`${BASE}/crm/contacts`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.success) console.error('[crmContactsApi] saveSavedCrm failed:', json.error);
  } catch (err) {
    console.error('[crmContactsApi] Error saving CRM:', err);
  }
}

export async function fetchAccountContacts(): Promise<CrmContact[]> {
  const [customers, users] = await Promise.all([
    fetchJson('/customers'),
    fetchJson('/users'),
  ]);

  const merged = [...customers, ...users].map(mapRecord).filter(Boolean) as CrmContact[];

  const byKey = new Map<string, CrmContact>();
  for (const c of merged) {
    const key = (c.email || c.id).toLowerCase();
    const existing = byKey.get(key);
    // Prefer the record with more info (email + phone/name filled).
    if (!existing) byKey.set(key, c);
  }
  return Array.from(byKey.values());
}
