import { supabase } from '../supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export interface Customer {
  id: string;
  customer_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'lead' | 'active' | 'inactive' | 'vip';
  total_spent: number;
  project_count: number;
  rating?: number;
  tags: string[];
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  notes?: string;
  source?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  company_id?: string;
}

export interface CreateCustomerInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  status?: 'lead' | 'active' | 'inactive' | 'vip';
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  tags?: string[];
  notes?: string;
  source?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {
  id: string;
}

export interface CustomerFilters {
  status?: string;
  search?: string;
  tags?: string[];
}

const CUSTOMER_ENDPOINT = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/customers`;

async function apiHeaders(contentType = false) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in as an administrator to manage customer records.');
  return { Authorization: `Bearer ${session.access_token || publicAnonKey}`, ...(contentType ? { 'Content-Type': 'application/json' } : {}) };
}

function normalizeCustomer(record: any): Customer {
  return { ...record, id: String(record.id), customer_number: record.customer_number || `CUST-${String(record.id).slice(-6).toUpperCase()}`, first_name: record.first_name || '', last_name: record.last_name || '', email: record.email || '', status: record.status || 'lead', total_spent: Number(record.total_spent || 0), project_count: Number(record.project_count || 0), tags: Array.isArray(record.tags) ? record.tags : [], created_at: record.created_at || record.createdAt || new Date().toISOString(), updated_at: record.updated_at || record.updatedAt || new Date().toISOString() } as Customer;
}

export async function getCustomers(filters?: CustomerFilters): Promise<Customer[]> {
  const response = await fetch(CUSTOMER_ENDPOINT, { headers: await apiHeaders() });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load customer records.');
  let customers = (result.customers || []).map(normalizeCustomer);
  if (filters?.status && filters.status !== 'all') customers = customers.filter((customer: Customer) => customer.status === filters.status);
  if (filters?.search) { const term = filters.search.toLowerCase(); customers = customers.filter((customer: Customer) => [customer.first_name, customer.last_name, customer.email, customer.company].some(value => String(value || '').toLowerCase().includes(term))); }
  if (filters?.tags?.length) customers = customers.filter((customer: Customer) => filters.tags!.some(tag => customer.tags.includes(tag)));
  return customers;
}

export async function getCustomerById(id: string): Promise<Customer> {
  const customers = await getCustomers(); const customer = customers.find(item => item.id === id);
  if (!customer) throw new Error('Customer not found.'); return customer;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const response = await fetch(CUSTOMER_ENDPOINT, { method: 'POST', headers: await apiHeaders(true), body: JSON.stringify(input) });
  const result = await response.json().catch(() => ({})); if (!response.ok || !result.success) throw new Error(result.error || 'Unable to create customer.'); return normalizeCustomer(result.customer);
}

export async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
  const { id, ...changes } = input; const response = await fetch(`${CUSTOMER_ENDPOINT}/${encodeURIComponent(id)}`, { method: 'PUT', headers: await apiHeaders(true), body: JSON.stringify(changes) });
  const result = await response.json().catch(() => ({})); if (!response.ok || !result.success) throw new Error(result.error || 'Unable to update customer.'); return normalizeCustomer(result.customer);
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const response = await fetch(`${CUSTOMER_ENDPOINT}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: await apiHeaders() });
  const result = await response.json().catch(() => ({})); if (!response.ok || !result.success) throw new Error(result.error || 'Unable to delete customer.'); return true;
}

export async function getCustomerStats() {
  const response = await fetch(`${CUSTOMER_ENDPOINT}/stats`, { headers: await apiHeaders() }); const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load customer statistics.'); return result.stats;
}

export async function searchCustomers(searchTerm: string): Promise<Customer[]> { return getCustomers({ search: searchTerm }); }

export async function updateCustomerSpending(customerId: string, amount: number): Promise<Customer> {
  const customer = await getCustomerById(customerId); return updateCustomer({ id: customerId, total_spent: Number(customer.total_spent || 0) + Number(amount || 0) } as UpdateCustomerInput);
}
