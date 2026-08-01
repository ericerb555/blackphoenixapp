/**
 * Invoice Service - Supabase CRUD Operations
 * Handles all invoice-related database operations
 * ISO20022 Compliant | App Store Guidelines Compatible
 */

import { supabase } from '../supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Mock data for development (when Supabase tables aren't created yet)
const MOCK_INVOICES: Invoice[] = [
  {
    id: '1',
    invoice_id: 'INV-1001',
    invoice_number: 'INV-2024-001',
    customer_id: '1',
    customer_name: 'John Smith',
    customer_email: 'john.smith@email.com',
    status: 'paid',
    is_draft: false,
    subtotal: 5000,
    tax_amount: 500,
    tax_rate: 10,
    discount_amount: 0,
    total_amount: 5500,
    paid_amount: 5500,
    balance_due: 0,
    issue_date: '2024-01-15',
    due_date: '2024-02-15',
    paid_date: '2024-02-10',
    created_date: '2024-01-15',
    notes: 'Thank you for your business',
    terms: 'Net 30',
    line_items: [
      { id: '1', line_number: 1, description: 'Kitchen Cabinet Installation', quantity: 1, unit_price: 5000, amount: 5000 }
    ],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-02-10T15:30:00Z'
  },
  {
    id: '2',
    invoice_id: 'INV-1002',
    invoice_number: 'INV-2024-002',
    customer_id: '2',
    customer_name: 'Sarah Johnson',
    customer_email: 'sarah.j@email.com',
    status: 'pending',
    is_draft: false,
    subtotal: 3200,
    tax_amount: 320,
    tax_rate: 10,
    discount_amount: 200,
    total_amount: 3320,
    paid_amount: 0,
    balance_due: 3320,
    issue_date: '2024-02-01',
    due_date: '2024-03-01',
    created_date: '2024-02-01',
    notes: 'Payment due within 30 days',
    terms: 'Net 30',
    line_items: [
      { id: '2', line_number: 1, description: 'Bathroom Renovation', quantity: 1, unit_price: 3200, amount: 3200 }
    ],
    created_at: '2024-02-01T09:00:00Z',
    updated_at: '2024-02-01T09:00:00Z'
  },
  {
    id: '3',
    invoice_id: 'INV-1003',
    invoice_number: 'INV-2024-003',
    customer_id: '3',
    customer_name: 'Mike Davis',
    customer_email: 'mike.davis@email.com',
    status: 'overdue',
    is_draft: false,
    subtotal: 1800,
    tax_amount: 180,
    tax_rate: 10,
    discount_amount: 0,
    total_amount: 1980,
    paid_amount: 0,
    balance_due: 1980,
    issue_date: '2024-01-01',
    due_date: '2024-01-31',
    created_date: '2024-01-01',
    notes: 'Please remit payment immediately',
    terms: 'Net 30',
    line_items: [
      { id: '3', line_number: 1, description: 'Plumbing Repairs', quantity: 1, unit_price: 1800, amount: 1800 }
    ],
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T08:00:00Z'
  },
  {
    id: '4',
    invoice_id: 'DRAFT-1004',
    invoice_number: 'DRAFT-2024-001',
    customer_name: '',
    customer_email: '',
    status: 'draft',
    is_draft: true,
    subtotal: 2500,
    tax_amount: 250,
    tax_rate: 10,
    discount_amount: 0,
    total_amount: 2750,
    paid_amount: 0,
    balance_due: 2750,
    issue_date: '2024-02-20',
    due_date: '2024-03-20',
    created_date: '2024-02-20',
    notes: '',
    terms: 'Net 30',
    line_items: [
      { id: '4', line_number: 1, description: 'Electrical Work', quantity: 1, unit_price: 2500, amount: 2500 }
    ],
    created_at: '2024-02-20T14:00:00Z',
    updated_at: '2024-02-20T14:00:00Z'
  }
];

export interface InvoiceLineItem {
  id?: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
  is_taxable?: boolean;
  tax_rate?: number;
}

export interface InvoiceFormData {
  customer_id?: string | null;
  project_id?: string | null;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  /** Physical address where the work/service was performed (may differ from billing). */
  service_address?: string;
  /** Portal that owns this invoice and should receive the in-app payment request. */
  recipient_portal?: 'customer' | 'vendor' | 'advertiser' | 'subcontractor' | 'employee' | 'investor' | 'property_manager' | 'condo_manager' | 'landlord' | 'territory_owner';
  /** Uses the correct connected company Stripe account; services is the default. */
  payment_rail?: 'services' | 'tbpco_ecommerce';
  status?: 'draft' | 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
  is_draft?: boolean;
  tax_rate?: number;
  discount_amount?: number;
  due_date?: string;
  issue_date?: string;
  notes?: string;
  terms?: string;
  internal_notes?: string;
  line_items: InvoiceLineItem[];
}

export interface Invoice extends InvoiceFormData {
  id: string;
  invoice_id: string;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  paid_date?: string;
  created_date: string;
  payment_method?: string;
  payment_reference?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class InvoiceService {
  private static readonly endpoint = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/invoices`;

  private static async headers(contentType = false) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in to manage invoices.');
    return { Authorization: `Bearer ${session.access_token || publicAnonKey}`, ...(contentType ? { 'Content-Type': 'application/json' } : {}) };
  }

  private static normalize(record: any): Invoice {
    const lineItems = record.line_items || record.lineItems || [];
    const subtotal = Number(record.subtotal ?? lineItems.reduce((sum: number, item: any) => sum + Number(item.amount ?? Number(item.quantity || 0) * Number(item.unit_price ?? item.unitPrice ?? 0)), 0));
    const taxAmount = Number(record.tax_amount ?? record.taxAmount ?? 0);
    const total = Number(record.total_amount ?? record.totalAmount ?? subtotal + taxAmount - Number(record.discount_amount ?? record.discountAmount ?? 0));
    const paid = Number(record.paid_amount ?? record.paidAmount ?? 0);
    return { ...record, invoice_id: record.invoice_id || record.invoiceId || `INV-${String(record.id).slice(0, 8).toUpperCase()}`, invoice_number: record.invoice_number || record.invoiceNumber || record.invoice_id || `INV-${String(record.id).slice(0, 8).toUpperCase()}`, customer_id: record.customer_id ?? record.customerId ?? null, customer_name: record.customer_name ?? record.customerName ?? '', customer_email: record.customer_email ?? record.customerEmail ?? '', recipient_portal: record.recipient_portal ?? record.recipientPortal ?? 'customer', payment_rail: record.payment_rail ?? record.paymentRail ?? 'services', is_draft: record.is_draft ?? record.isDraft ?? record.status === 'draft', subtotal, tax_amount: taxAmount, total_amount: total, paid_amount: paid, balance_due: Number(record.balance_due ?? record.balanceDue ?? Math.max(0, total - paid)), discount_amount: Number(record.discount_amount ?? record.discountAmount ?? 0), tax_rate: Number(record.tax_rate ?? record.taxRate ?? 0), line_items: lineItems.map((item: any, index: number) => ({ ...item, line_number: item.line_number ?? index + 1, unit_price: Number(item.unit_price ?? item.unitPrice ?? 0), amount: Number(item.amount ?? Number(item.quantity || 0) * Number(item.unit_price ?? item.unitPrice ?? 0)) })), created_date: record.created_date || record.createdAt || new Date().toISOString().slice(0, 10), created_at: record.created_at || record.createdAt || new Date().toISOString(), updated_at: record.updated_at || record.updatedAt || new Date().toISOString(), status: record.status || 'draft' } as Invoice;
  }

  static validateInvoice(data: InvoiceFormData): { isValid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];
    if (!data.line_items?.length) errors.push({ field: 'line_items', message: 'At least one line item is required' });
    data.line_items?.forEach((item, index) => { if (!item.description?.trim()) errors.push({ field: `line_items.${index}`, message: `Line item ${index + 1}: Description is required` }); if (!(Number(item.quantity) > 0)) errors.push({ field: `line_items.${index}`, message: `Line item ${index + 1}: Quantity must be greater than zero` }); });
    return { isValid: errors.length === 0, errors };
  }

  static async createInvoice(data: InvoiceFormData): Promise<{ data: Invoice | null; error: any }> {
    const validation = this.validateInvoice(data); if (!validation.isValid) return { data: null, error: new Error(validation.errors.map(error => error.message).join(', ')) };
    try { const response = await fetch(this.endpoint, { method: 'POST', headers: await this.headers(true), body: JSON.stringify(data) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Could not create invoice.'); return { data: this.normalize(result.invoice), error: null }; } catch (error) { return { data: null, error }; }
  }

  static async updateInvoice(invoiceId: string, data: Partial<InvoiceFormData>): Promise<{ data: Invoice | null; error: any }> {
    try { const response = await fetch(`${this.endpoint}/${encodeURIComponent(invoiceId)}`, { method: 'PUT', headers: await this.headers(true), body: JSON.stringify(data) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Could not update invoice.'); return { data: this.normalize(result.invoice), error: null }; } catch (error) { return { data: null, error }; }
  }

  static async getInvoiceById(invoiceId: string): Promise<{ data: Invoice | null; error: any }> {
    const result = await this.getInvoices(); if (result.error) return { data: null, error: result.error }; const invoice = result.data?.find(item => item.id === invoiceId) || null; return { data: invoice, error: invoice ? null : new Error('Invoice not found') };
  }

  static async getInvoices(filters?: { status?: string; is_draft?: boolean; search?: string; limit?: number; offset?: number }): Promise<{ data: Invoice[] | null; error: any; count?: number }> {
    try { const response = await fetch(this.endpoint, { headers: await this.headers() }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Could not load invoices.'); let data = (result.invoices || []).map(this.normalize); if (filters?.status && filters.status !== 'all') data = data.filter((invoice: Invoice) => invoice.status === filters.status); if (filters?.is_draft !== undefined) data = data.filter((invoice: Invoice) => invoice.is_draft === filters.is_draft); if (filters?.search) { const term = filters.search.toLowerCase(); data = data.filter((invoice: Invoice) => [invoice.invoice_number, invoice.customer_name, invoice.customer_email].some(value => String(value || '').toLowerCase().includes(term))); } const count = data.length; if (filters?.offset !== undefined) data = data.slice(filters.offset, filters.offset + (filters.limit || 10)); else if (filters?.limit) data = data.slice(0, filters.limit); return { data, error: null, count }; } catch (error) { return { data: null, error, count: 0 }; }
  }

  static async deleteInvoice(invoiceId: string): Promise<{ error: any }> { try { const response = await fetch(`${this.endpoint}/${encodeURIComponent(invoiceId)}`, { method: 'DELETE', headers: await this.headers() }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Could not delete invoice.'); return { error: null }; } catch (error) { return { error }; } }
  static async attachToCustomer(invoiceId: string, customerId: string, dueDate?: string): Promise<{ data: Invoice | null; error: any }> { return this.updateInvoice(invoiceId, { customer_id: customerId, is_draft: false, status: 'pending', due_date: dueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }); }
  static async getInvoiceStats() { const result = await this.getInvoices(); const invoices = result.data || []; return { total: invoices.length, draft: invoices.filter(i => i.is_draft).length, pending: invoices.filter(i => i.status === 'pending').length, paid: invoices.filter(i => i.status === 'paid').length, overdue: invoices.filter(i => i.status === 'overdue').length, totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0), pendingRevenue: invoices.filter(i => ['pending','overdue','partial'].includes(i.status)).reduce((sum, i) => sum + i.balance_due, 0) }; }
}

export default InvoiceService;
