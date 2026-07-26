/**
 * Supabase Data Layer
 * Centralized data access for all app entities using localStorage
 * (Previously used API endpoints, now using browser storage for prototyping)
 */

import { supabase } from './supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function serverRequest(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in to manage subscription records.');
  const response = await fetch(`${SERVER}${path}`, { ...init, headers: { Authorization: `Bearer ${session.access_token || publicAnonKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || 'Subscription request failed.');
  return data;
}

function normalizeSubscription(record: any): Subscription {
  return { ...record, id: record.id, stakeholderId: record.stakeholderId || record.stakeholderEmail, stakeholderName: record.stakeholderName || record.ownerName || record.stakeholderEmail || '', stakeholderEmail: record.stakeholderEmail || record.ownerEmail || '', type: record.type || 'customer', plan: record.plan || record.planName || '', status: record.status || 'pending', billingCycle: record.billingCycle || 'monthly', amount: Number(record.amount ?? record.monthlyTotal ?? 0), startDate: record.startDate || record.createdAt || new Date().toISOString(), renewalDate: record.renewalDate || record.renewsOn || '', hoursIncluded: Number(record.hoursIncluded ?? record.hours?.included ?? 0), hoursUsed: Number(record.hoursUsed ?? record.hours?.used ?? 0), hoursRollover: Number(record.hoursRollover ?? record.hours?.rollover ?? 0), hoursGifted: Number(record.hoursGifted ?? record.hours?.gifted ?? 0), autoRenew: record.autoRenew ?? true, paymentMethod: record.paymentMethod || '', createdAt: record.createdAt || new Date().toISOString(), updatedAt: record.updatedAt || new Date().toISOString() };
}

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Helper to get data from localStorage with prefix
function getFromStorage<T>(prefix: string): T[] {
  if (!isBrowser) return [];
  
  const items: T[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const item = JSON.parse(localStorage.getItem(key) || '');
        items.push(item);
      } catch (error) {
        console.error(`Error parsing ${key}:`, error);
      }
    }
  }
  return items;
}

// Helper to save data to localStorage
function saveToStorage(key: string, data: any): void {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(data));
}

// Helper to remove from localStorage
function removeFromStorage(key: string): void {
  if (!isBrowser) return;
  localStorage.removeItem(key);
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export interface Subscription {
  id: string;
  type: 'customer' | 'subcontractor' | 'vendor' | 'advertiser';
  stakeholderId: string;
  stakeholderName: string;
  stakeholderEmail: string;
  plan: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired' | 'pending';
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  amount: number;
  startDate: string;
  renewalDate: string;
  hoursIncluded?: number;
  hoursUsed?: number;
  hoursRollover?: number;
  hoursGifted?: number;
  autoRenew: boolean;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const data = await serverRequest('/subscriptions');
  return (data.subscriptions || []).map(normalizeSubscription);
}

export async function getSubscription(id: string): Promise<Subscription> {
  const subscriptions = await getSubscriptions();
  const subscription = subscriptions.find(item => item.id === id);
  if (!subscription) throw new Error('Subscription not found');
  return subscription;
}

export async function createSubscription(data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
  const result = await serverRequest('/subscriptions', { method: 'POST', body: JSON.stringify(data) });
  return normalizeSubscription(result.subscription);
}

export async function updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription> {
  const result = await serverRequest(`/subscriptions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
  return normalizeSubscription(result.subscription);
}

export async function deleteSubscription(id: string): Promise<void> {
  await updateSubscription(id, { status: 'cancelled' });
}

// ============================================================================
// REFERRALS
// ============================================================================

export interface Referral {
  id: string;
  referrerId: string;
  referrerType: string;
  referrerName: string;
  referredId: string;
  referredType: string;
  referredName: string;
  status: 'pending' | 'completed' | 'paid';
  rewardAmount: number;
  dateReferred: string;
  dateCompleted?: string;
  datePaid?: string;
  conversionValue?: number;
  createdAt: string;
  updatedAt: string;
}

export async function getReferrals(): Promise<Referral[]> {
  const data = await serverRequest('/referrals');
  return (data.referrals || []).map(normalizeReferral);
}

function normalizeReferral(item: any): Referral {
  return { id: item.id, referrerId: item.referrerId || item.referrerEmail || '', referrerType: item.referrerType || (item.source === 'affiliate' ? 'Affiliate' : 'Customer'), referrerName: item.referrerName || item.referrer || item.referrerEmail || '', referredId: item.referredId || item.referredEmail || '', referredType: item.referredType || 'Customer', referredName: item.referredName || item.referred || item.referredEmail || '', status: item.status === 'converted' ? 'completed' : item.status === 'paid' ? 'paid' : 'pending', rewardAmount: Number(item.rewardAmount ?? item.reward ?? 0), dateReferred: item.dateReferred || item.date || item.createdAt || new Date().toISOString(), dateCompleted: item.dateCompleted || item.convertedAt || undefined, datePaid: item.datePaid || item.paidAt || undefined, conversionValue: Number(item.conversionValue ?? item.orderAmount ?? 0), createdAt: item.createdAt || item.date || new Date().toISOString(), updatedAt: item.updatedAt || item.date || new Date().toISOString() };
}

export async function createReferral(data: Omit<Referral, 'id' | 'createdAt' | 'updatedAt'>): Promise<Referral> {
  const result = await serverRequest('/referrals/records', { method: 'POST', body: JSON.stringify(data) });
  return normalizeReferral(result.referral);
}

export async function updateReferral(id: string, data: Partial<Referral>): Promise<Referral> {
  const result = await serverRequest(`/referrals/records/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) });
  return normalizeReferral(result.referral);
}

// ============================================================================
// GIFT CARDS
// ============================================================================

export interface GiftCard {
  id: string;
  code: string;
  type: 'dollar' | 'hours' | 'subscription';
  value: number;
  balance: number;
  purchasedBy: string;
  recipientEmail?: string;
  recipientName?: string;
  status: 'active' | 'redeemed' | 'expired';
  purchaseDate: string;
  expiryDate: string;
  redeemedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getGiftCards(): Promise<GiftCard[]> {
  const data = await serverRequest('/gift-cards');
  return (data.cards || []).map((item: any) => ({ id: item.id, code: item.code, type: item.type || 'dollar', value: Number(item.initialBalance ?? item.value ?? 0), balance: Number(item.balance ?? 0), purchasedBy: item.purchaserEmail || item.senderName || '', recipientEmail: item.recipientEmail, recipientName: item.recipientName, status: item.status || 'active', purchaseDate: item.purchasedAt || item.createdAt || new Date().toISOString(), expiryDate: item.expiryDate || '', redeemedDate: item.redeemedAt, createdAt: item.createdAt || new Date().toISOString(), updatedAt: item.updatedAt || item.createdAt || new Date().toISOString() }));
}

export async function getGiftCard(code: string): Promise<GiftCard> {
  if (!isBrowser) throw new Error('Not in browser environment');
  const data = localStorage.getItem(`giftcard:${code}`);
  if (!data) throw new Error('Gift card not found');
  return JSON.parse(data);
}

export async function createGiftCard(data: Omit<GiftCard, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<GiftCard> {
  const id = `GC-${Date.now()}`;
  const code = `GC${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const giftCard: GiftCard = {
    ...data,
    id,
    code,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`giftcard:${code}`, giftCard);
  return giftCard;
}

export async function redeemGiftCard(code: string, amount: number): Promise<GiftCard> {
  const giftCard = await getGiftCard(code);
  const updated: GiftCard = {
    ...giftCard,
    balance: giftCard.balance - amount,
    status: giftCard.balance - amount <= 0 ? 'redeemed' : giftCard.status,
    redeemedDate: giftCard.balance - amount <= 0 ? new Date().toISOString() : giftCard.redeemedDate,
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`giftcard:${code}`, updated);
  return updated;
}

// ============================================================================
// CUSTOMERS
// ============================================================================

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: 'active' | 'inactive' | 'potential';
  subscriptionId?: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export async function getCustomers(): Promise<Customer[]> {
  return getFromStorage<Customer>('customer:');
}

export async function getCustomer(id: string): Promise<Customer> {
  if (!isBrowser) throw new Error('Not in browser environment');
  const data = localStorage.getItem(`customer:${id}`);
  if (!data) throw new Error('Customer not found');
  return JSON.parse(data);
}

export async function createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
  const id = `CUST-${Date.now()}`;
  const customer: Customer = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`customer:${id}`, customer);
  return customer;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const existing = await getCustomer(id);
  const updated: Customer = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`customer:${id}`, updated);
  return updated;
}

// ============================================================================
// WORK ORDERS
// ============================================================================

export interface WorkOrder {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  scheduledDate?: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours?: number;
  materials: Array<{ name: string; quantity: number; cost: number }>;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

function normalizeWorkOrder(record: any): WorkOrder {
  return { id: record.id, customerId: record.customerId || record.client_email || record.clientEmail || '', customerName: record.customerName || record.client_name || record.clientName || '', title: record.title || record.project_name || 'Work request', description: record.description || '', status: ['pending','in-progress','completed','cancelled'].includes(record.status) ? record.status : 'pending', priority: ['low','medium','high','urgent'].includes(record.priority) ? record.priority : 'medium', assignedTo: record.assignedTo || record.schedule?.assignedTo, scheduledDate: record.scheduledDate || record.schedule?.startAt || record.projectSchedule?.tasks?.[0]?.startDate, completedDate: record.completedDate || record.completionDate, estimatedHours: Number(record.estimatedHours || 0), actualHours: Number(record.actualHours || 0) || undefined, materials: Array.isArray(record.materials) ? record.materials : [], totalCost: Number(record.totalCost || record.quote?.totalCost || 0), createdAt: record.created_at || record.createdAt || new Date().toISOString(), updatedAt: record.updated_at || record.updatedAt || new Date().toISOString() };
}
export async function getWorkOrders(): Promise<WorkOrder[]> { const data = await serverRequest('/work-requests'); return (Array.isArray(data) ? data : data.workRequests || []).map(normalizeWorkOrder); }
export async function getWorkOrder(id: string): Promise<WorkOrder> { const data = await serverRequest(`/work-requests/${encodeURIComponent(id)}`); return normalizeWorkOrder(data.workRequest || data); }
export async function createWorkOrder(data: Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkOrder> { const result = await serverRequest('/work-requests', { method: 'POST', body: JSON.stringify({ ...data, clientEmail: data.customerId.includes('@') ? data.customerId : '', clientName: data.customerName, serviceType: data.title, project_type: data.title }) }); return normalizeWorkOrder(result.workRequest); }
export async function updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<WorkOrder> { const result = await serverRequest(`/work-requests/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }); return normalizeWorkOrder(result.workRequest); }

// ============================================================================
// INVOICES
// ============================================================================

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  workOrderId?: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  items: Array<{ description: string; quantity: number; rate: number; amount: number }>;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeInvoice(record: any): Invoice {
  const lineItems = Array.isArray(record.line_items) ? record.line_items : (Array.isArray(record.items) ? record.items : []);
  return { id: record.id, customerId: record.customerId || record.customerEmail || record.clientEmail || '', customerName: record.customerName || record.customer_name || record.clientName || '', workOrderId: record.workOrderId || record.work_request_id || record.workRequestId || undefined, amount: Number(record.subtotal ?? record.amount ?? 0), tax: Number(record.tax_amount ?? record.tax ?? 0), total: Number(record.total_amount ?? record.total ?? 0), status: record.status === 'pending' ? 'sent' : record.status, dueDate: record.due_date || record.dueDate || '', paidDate: record.paidAt || record.paidDate || undefined, items: lineItems.map((item: any) => ({ description: item.description || '', quantity: Number(item.quantity || 0), rate: Number(item.unit_price ?? item.rate ?? 0), amount: Number(item.amount || 0) })), notes: record.notes || '', createdAt: record.createdAt || new Date().toISOString(), updatedAt: record.updatedAt || new Date().toISOString() } as Invoice;
}
export async function getInvoices(): Promise<Invoice[]> { const data = await serverRequest('/invoices'); return (data.invoices || []).map(normalizeInvoice); }
export async function getInvoice(id: string): Promise<Invoice> { const invoices = await getInvoices(); const invoice = invoices.find((item) => item.id === id); if (!invoice) throw new Error('Invoice not found'); return invoice; }
export async function createInvoice(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> { const customerEmail = data.customerId.includes('@') ? data.customerId : ''; const result = await serverRequest('/invoices', { method: 'POST', body: JSON.stringify({ customerEmail, customerName: data.customerName, workRequestId: data.workOrderId, line_items: data.items.map((item, index) => ({ line_number: index + 1, description: item.description, quantity: item.quantity, unit_price: item.rate, amount: item.amount })), tax_amount: data.tax, total_amount: data.total, dueDate: data.dueDate, notes: data.notes, is_draft: !customerEmail, status: !customerEmail ? 'draft' : 'pending' }) }); return normalizeInvoice(result.invoice); }
export async function updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> { const result = await serverRequest(`/invoices/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ ...data, line_items: data.items?.map((item, index) => ({ line_number: index + 1, description: item.description, quantity: item.quantity, unit_price: item.rate, amount: item.amount })) }) }); return normalizeInvoice(result.invoice); }

// ============================================================================
// SUBCONTRACTORS
// ============================================================================

export interface Subcontractor {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  specialty: string[];
  rating: number;
  status: 'active' | 'inactive' | 'suspended';
  subscriptionId?: string;
  certifications: string[];
  insuranceExpiry: string;
  createdAt: string;
  updatedAt: string;
}

export async function getSubcontractors(): Promise<Subcontractor[]> {
  return getFromStorage<Subcontractor>('subcontractor:');
}

export async function createSubcontractor(data: Omit<Subcontractor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subcontractor> {
  const id = `SUB-${Date.now()}`;
  const subcontractor: Subcontractor = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`subcontractor:${id}`, subcontractor);
  return subcontractor;
}

export async function updateSubcontractor(id: string, data: Partial<Subcontractor>): Promise<Subcontractor> {
  if (!isBrowser) throw new Error('Not in browser environment');
  const existing = JSON.parse(localStorage.getItem(`subcontractor:${id}`) || '{}');
  const updated: Subcontractor = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`subcontractor:${id}`, updated);
  return updated;
}

// ============================================================================
// VENDORS
// ============================================================================

export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  category: string;
  website?: string;
  status: 'active' | 'inactive';
  subscriptionId?: string;
  paymentTerms: string;
  createdAt: string;
  updatedAt: string;
}

export async function getVendors(): Promise<Vendor[]> {
  return getFromStorage<Vendor>('vendor:');
}

export async function createVendor(data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
  const id = `VEN-${Date.now()}`;
  const vendor: Vendor = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`vendor:${id}`, vendor);
  return vendor;
}

// ============================================================================
// ADVERTISERS
// ============================================================================

export interface Advertiser {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  subscriptionId?: string;
  adPlacements: Array<{ location: string; startDate: string; endDate: string }>;
  budget: number;
  spent: number;
  createdAt: string;
  updatedAt: string;
}

export async function getAdvertisers(): Promise<Advertiser[]> {
  return getFromStorage<Advertiser>('advertiser:');
}

export async function createAdvertiser(data: Omit<Advertiser, 'id' | 'createdAt' | 'updatedAt'>): Promise<Advertiser> {
  const id = `ADV-${Date.now()}`;
  const advertiser: Advertiser = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`advertiser:${id}`, advertiser);
  return advertiser;
}

// ============================================================================
// HOUR BANKING OPERATIONS
// ============================================================================

export interface HourTransaction {
  id: string;
  subscriptionId: string;
  customerId: string;
  customerName: string;
  type: 'used' | 'rollover' | 'gifted' | 'promotional' | 'adjustment';
  hours: number;
  reason: string;
  performedBy: string;
  date: string;
  createdAt: string;
}

export interface SubscriptionHourBalance {
  included: number;
  rollover: number;
  gifted: number;
  used: number;
  available: number;
  remaining: number;
  overageHours: number;
}

export async function getHourTransactions(subscriptionId: string): Promise<HourTransaction[]> {
  const data = await serverRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/hours`);
  return data.transactions || [];
}

export async function getSubscriptionHourBalance(subscriptionId: string): Promise<SubscriptionHourBalance> {
  const data = await serverRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/hours`);
  return data.balance;
}

export async function addHourTransaction(data: Omit<HourTransaction, 'id' | 'createdAt'>): Promise<HourTransaction> {
  if (data.type !== 'used') throw new Error('Only service-hour usage can be posted through this workflow.');
  const result = await serverRequest(`/subscriptions/${encodeURIComponent(data.subscriptionId)}/log-hours`, {
    method: 'POST',
    body: JSON.stringify({ hours: data.hours, description: data.reason, reason: data.reason, date: data.date, workOrderId: (data as any).workOrderId, invoiceId: (data as any).invoiceId, sourceId: (data as any).sourceId }),
  });
  return result.transaction;
}

export async function giftHours(subscriptionId: string, hours: number, reason: string, giftedBy?: string): Promise<void> {
  await serverRequest(`/subscriptions/${encodeURIComponent(subscriptionId)}/gift-hours`, { method: 'POST', body: JSON.stringify({ hours, reason, giftedBy }) });
}

export async function processRollovers(): Promise<{ processed: number; totalHours: number }> {
  const data = await serverRequest('/subscriptions/process-rollovers', { method: 'POST', body: JSON.stringify({}) });
  return { processed: Number(data.processed || 0), totalHours: Number(data.totalHours || 0) };
}

// ============================================================================
// GIFT HOURS REQUESTS & APPROVALS
// ============================================================================

export interface GiftHoursRequest {
  id: string;
  subscriptionId: string;
  customerName: string;
  customerEmail: string;
  hours: number;
  reason: string;
  urgency: 'standard' | 'urgent';
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getGiftHoursRequests(): Promise<GiftHoursRequest[]> {
  const data = await serverRequest('/gift-hour-requests');
  return data.requests || [];
}

export async function createGiftHoursRequest(data: Omit<GiftHoursRequest, 'id' | 'createdAt' | 'updatedAt' | 'requestedAt' | 'customerName' | 'customerEmail'>): Promise<GiftHoursRequest> {
  const result = await serverRequest('/gift-hour-requests', { method: 'POST', body: JSON.stringify(data) });
  return result.request;
}

export async function approveGiftHoursRequest(id: string, _reviewedBy: string, notes?: string): Promise<GiftHoursRequest> {
  const result = await serverRequest(`/gift-hour-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved', reviewNotes: notes || '' }) });
  return result.request;
}

export async function rejectGiftHoursRequest(id: string, _reviewedBy: string, notes: string): Promise<GiftHoursRequest> {
  const result = await serverRequest(`/gift-hour-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected', reviewNotes: notes }) });
  return result.request;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface SubscriptionAnalytics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
  customerLifetimeValue: number;
  revenueByType: Record<string, number>;
  revenueGrowth: Array<{ month: string; revenue: number; subscriptions: number }>;
}

export async function getSubscriptionAnalytics(): Promise<SubscriptionAnalytics> {
  const subscriptions = await getSubscriptions();
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  
  const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const monthlyRecurringRevenue = activeSubscriptions
    .filter(s => s.billingCycle === 'monthly')
    .reduce((sum, sub) => sum + sub.amount, 0);
  
  const revenueByType = activeSubscriptions.reduce((acc, sub) => {
    acc[sub.type] = (acc[sub.type] || 0) + sub.amount;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalRevenue,
    monthlyRecurringRevenue,
    activeSubscriptions: activeSubscriptions.length,
    churnRate: 0,
    averageRevenuePerUser: activeSubscriptions.length > 0 ? totalRevenue / activeSubscriptions.length : 0,
    customerLifetimeValue: 0,
    revenueByType,
    revenueGrowth: [],
  };
}

export interface ReferralAnalytics {
  totalReferrals: number;
  completedReferrals: number;
  totalRewards: number;
  conversionValue: number;
  conversionRate: number;
}

export async function getReferralAnalytics(): Promise<ReferralAnalytics> {
  const referrals = await getReferrals();
  const completed = referrals.filter(r => r.status === 'completed' || r.status === 'paid');
  
  return {
    totalReferrals: referrals.length,
    completedReferrals: completed.length,
    totalRewards: referrals.reduce((sum, ref) => sum + ref.rewardAmount, 0),
    conversionValue: completed.reduce((sum, ref) => sum + (ref.conversionValue || 0), 0),
    conversionRate: referrals.length > 0 ? completed.length / referrals.length : 0,
  };
}

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
  description?: string;
}

export interface SubscriptionPlan {
  id: string;
  category: 'customer' | 'subcontractor' | 'vendor' | 'advertiser';
  name: string;
  description: string;
  tagline: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  features: PlanFeature[];
  hoursIncluded?: number;
  prioritySupport: boolean;
  popular?: boolean;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return getFromStorage<SubscriptionPlan>('plan:');
}

export async function getSubscriptionPlan(id: string): Promise<SubscriptionPlan> {
  if (!isBrowser) throw new Error('Not in browser environment');
  const data = localStorage.getItem(`plan:${id}`);
  if (!data) throw new Error('Plan not found');
  return JSON.parse(data);
}

export async function createSubscriptionPlan(data: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
  const id = `PLAN-${Date.now()}`;
  const plan: SubscriptionPlan = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`plan:${id}`, plan);
  return plan;
}

export async function updateSubscriptionPlan(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  const existing = await getSubscriptionPlan(id);
  const updated: SubscriptionPlan = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(`plan:${id}`, updated);
  return updated;
}

export async function deleteSubscriptionPlan(id: string): Promise<void> {
  removeFromStorage(`plan:${id}`);
}

