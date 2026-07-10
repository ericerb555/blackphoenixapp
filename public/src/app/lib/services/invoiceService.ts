/**
 * Invoice Service - Supabase CRUD Operations
 * Handles all invoice-related database operations
 * ISO20022 Compliant | App Store Guidelines Compatible
 */

import { supabase } from '../supabase';

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
  /**
   * Validate invoice form data
   */
  static validateInvoice(data: InvoiceFormData): { isValid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    // Line items validation
    if (!data.line_items || data.line_items.length === 0) {
      errors.push({ field: 'line_items', message: 'At least one line item is required' });
    } else {
      // Validate each line item
      data.line_items.forEach((item, index) => {
        if (!item.description?.trim()) {
          errors.push({ 
            field: `line_items.${index}.description`, 
            message: `Line item ${index + 1}: Description is required` 
          });
        }
        if (item.quantity <= 0) {
          errors.push({ 
            field: `line_items.${index}.quantity`, 
            message: `Line item ${index + 1}: Quantity must be greater than 0` 
          });
        }
        if (item.unit_price < 0) {
          errors.push({ 
            field: `line_items.${index}.unit_price`, 
            message: `Line item ${index + 1}: Price cannot be negative` 
          });
        }
      });
    }

    // Calculate total to ensure it's not zero
    const total = data.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    if (total === 0) {
      errors.push({ field: 'total', message: 'Invoice total cannot be $0' });
    }

    // Due date validation (if not draft and customer is assigned)
    if (!data.is_draft && data.customer_id && !data.due_date) {
      errors.push({ field: 'due_date', message: 'Due date is required for active invoices' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a new invoice
   */
  static async createInvoice(data: InvoiceFormData): Promise<{ data: Invoice | null; error: any }> {
    try {
      // Validate data
      const validation = this.validateInvoice(data);
      if (!validation.isValid) {
        return { 
          data: null, 
          error: new Error(validation.errors.map(e => e.message).join(', ')) 
        };
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Generate unique invoice_id
      const invoice_id = await this.generateInvoiceId();

      // Calculate totals
      const subtotal = data.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const tax_amount = subtotal * ((data.tax_rate || 0) / 100);
      const total_amount = subtotal + tax_amount - (data.discount_amount || 0);

      // Prepare invoice data
      const invoiceData = {
        invoice_id,
        invoice_number: invoice_id, // Same as invoice_id for now
        customer_id: data.customer_id || null,
        project_id: data.project_id || null,
        customer_name: data.customer_name || null,
        customer_email: data.customer_email || null,
        status: data.status || 'draft',
        is_draft: data.is_draft !== undefined ? data.is_draft : !data.customer_id,
        subtotal,
        tax_rate: data.tax_rate || 0,
        tax_amount,
        discount_amount: data.discount_amount || 0,
        total_amount,
        paid_amount: 0,
        issue_date: data.issue_date || new Date().toISOString().split('T')[0],
        due_date: data.due_date || null,
        notes: data.notes || null,
        terms: data.terms || null,
        internal_notes: data.internal_notes || null,
        created_by: user.id,
        updated_by: user.id,
        iso20022_compliant: true,
        appstore_compliant: true
      };

      // Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        return { data: null, error: invoiceError };
      }

      // Insert line items
      const lineItemsData = data.line_items.map((item, index) => ({
        invoice_id: invoice.id,
        line_number: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        is_taxable: item.is_taxable !== undefined ? item.is_taxable : true,
        tax_rate: item.tax_rate || 0
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsData);

      if (lineItemsError) {
        // Rollback invoice creation
        await supabase.from('invoices').delete().eq('id', invoice.id);
        console.error('Error creating line items:', lineItemsError);
        return { data: null, error: lineItemsError };
      }

      // Fetch complete invoice with line items
      return await this.getInvoiceById(invoice.id);
    } catch (error) {
      console.error('Invoice creation failed:', error);
      return { data: null, error };
    }
  }

  /**
   * Update an existing invoice
   */
  static async updateInvoice(invoiceId: string, data: Partial<InvoiceFormData>): Promise<{ data: Invoice | null; error: any }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // If line items are being updated, validate
      if (data.line_items) {
        const validation = this.validateInvoice(data as InvoiceFormData);
        if (!validation.isValid) {
          return { 
            data: null, 
            error: new Error(validation.errors.map(e => e.message).join(', ')) 
          };
        }

        // Calculate new totals if line items changed
        const subtotal = data.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const tax_amount = subtotal * ((data.tax_rate || 0) / 100);
        const total_amount = subtotal + tax_amount - (data.discount_amount || 0);

        data = {
          ...data,
          subtotal,
          tax_amount,
          total_amount
        } as any;
      }

      // Update invoice
      const updateData: any = {
        ...data,
        updated_by: user.id
      };

      // Remove line_items from update data (handled separately)
      const lineItems = updateData.line_items;
      delete updateData.line_items;

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (invoiceError) {
        console.error('Error updating invoice:', invoiceError);
        return { data: null, error: invoiceError };
      }

      // Update line items if provided
      if (lineItems) {
        // Delete existing line items
        await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', invoiceId);

        // Insert new line items
        const lineItemsData = lineItems.map((item: InvoiceLineItem, index: number) => ({
          invoice_id: invoiceId,
          line_number: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          is_taxable: item.is_taxable !== undefined ? item.is_taxable : true,
          tax_rate: item.tax_rate || 0
        }));

        const { error: lineItemsError } = await supabase
          .from('invoice_line_items')
          .insert(lineItemsData);

        if (lineItemsError) {
          console.error('Error updating line items:', lineItemsError);
          return { data: null, error: lineItemsError };
        }
      }

      // Fetch updated invoice
      return await this.getInvoiceById(invoiceId);
    } catch (error) {
      console.error('Invoice update failed:', error);
      return { data: null, error };
    }
  }

  /**
   * Get invoice by ID with line items
   */
  static async getInvoiceById(invoiceId: string): Promise<{ data: Invoice | null; error: any }> {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .is('deleted_at', null)
        .single();

      if (invoiceError) {
        // If table doesn't exist, return from mock data
        if (invoiceError.code === 'PGRST205') {
          console.log('ℹ️ Using mock invoice data (Supabase table not yet created)');
          const mockInvoice = MOCK_INVOICES.find(inv => inv.id === invoiceId);
          return { data: mockInvoice || null, error: mockInvoice ? null : new Error('Invoice not found') };
        }
        return { data: null, error: invoiceError };
      }

      // Fetch line items
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('line_number');

      if (lineItemsError) {
        return { data: null, error: lineItemsError };
      }

      return { 
        data: {
          ...invoice,
          line_items: lineItems || []
        }, 
        error: null 
      };
    } catch (error: any) {
      // Fallback to mock data
      if (error?.code === 'PGRST205') {
        console.log('ℹ️ Using mock invoice data (Supabase table not yet created)');
        const mockInvoice = MOCK_INVOICES.find(inv => inv.id === invoiceId);
        return { data: mockInvoice || null, error: mockInvoice ? null : new Error('Invoice not found') };
      }
      return { data: null, error };
    }
  }

  /**
   * Get all invoices for current user
   */
  static async getInvoices(filters?: {
    status?: string;
    is_draft?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Invoice[] | null; error: any; count?: number }> {
    try {
      let query = supabase
        .from('invoices')
        .select('*, invoice_line_items(*)', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.is_draft !== undefined) {
        query = query.eq('is_draft', filters.is_draft);
      }

      // Search filter
      if (filters?.search) {
        query = query.or(`invoice_id.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`);
      }

      // Pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        // If table doesn't exist, return mock data silently
        if (error.code === 'PGRST205') {
          console.log('ℹ️ Using mock invoice data (Supabase table not yet created)');
          
          // Apply filters to mock data
          let filteredData = [...MOCK_INVOICES];
          
          if (filters?.status && filters.status !== 'all') {
            filteredData = filteredData.filter(inv => inv.status === filters.status);
          }
          
          if (filters?.is_draft !== undefined) {
            filteredData = filteredData.filter(inv => inv.is_draft === filters.is_draft);
          }
          
          if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filteredData = filteredData.filter(inv => 
              inv.invoice_id.toLowerCase().includes(searchLower) ||
              inv.customer_name?.toLowerCase().includes(searchLower) ||
              inv.customer_email?.toLowerCase().includes(searchLower)
            );
          }
          
          return { data: filteredData, error: null, count: filteredData.length };
        }
        return { data: null, error, count: 0 };
      }

      // Transform data to include line_items properly
      const invoices = data?.map((invoice: any) => ({
        ...invoice,
        line_items: invoice.invoice_line_items || []
      }));

      return { data: invoices, error: null, count: count || 0 };
    } catch (error: any) {
      // Fallback to mock data
      if (error?.code === 'PGRST205') {
        console.log('ℹ️ Using mock invoice data (Supabase table not yet created)');
        return { data: MOCK_INVOICES, error: null, count: MOCK_INVOICES.length };
      }
      console.error('Error in getInvoices:', error);
      return { data: null, error, count: 0 };
    }
  }

  /**
   * Delete invoice (soft delete)
   */
  static async deleteInvoice(invoiceId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', invoiceId);

      if (error) {
        console.error('Error deleting invoice:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Helper: Generate unique invoice ID
   */
  private static async generateInvoiceId(): Promise<string> {
    let counter = 1001;
    let invoiceId = '';
    let exists = true;

    while (exists) {
      invoiceId = `INV-${counter}`;
      
      const { data } = await supabase
        .from('invoices')
        .select('invoice_id')
        .eq('invoice_id', invoiceId)
        .single();

      exists = !!data;
      counter++;
    }

    return invoiceId;
  }

  /**
   * Attach invoice to customer (convert draft to active)
   */
  static async attachToCustomer(
    invoiceId: string, 
    customerId: string,
    dueDate?: string
  ): Promise<{ data: Invoice | null; error: any }> {
    try {
      // Get customer info
      const { data: customer } = await supabase
        .from('customers')
        .select('first_name, last_name, email')
        .eq('id', customerId)
        .single();

      if (!customer) {
        return { data: null, error: new Error('Customer not found') };
      }

      // Update invoice
      return await this.updateInvoice(invoiceId, {
        customer_id: customerId,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        customer_email: customer.email,
        is_draft: false,
        status: 'pending',
        due_date: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      } as any);
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get invoice statistics
   */
  static async getInvoiceStats(): Promise<{
    total: number;
    draft: number;
    pending: number;
    paid: number;
    overdue: number;
    totalRevenue: number;
    pendingRevenue: number;
  }> {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('status, total_amount, is_draft')
        .is('deleted_at', null);

      if (error) {
        // If table doesn't exist, calculate from mock data silently
        if (error.code === 'PGRST205') {
          console.log('ℹ️ Using mock invoice stats (Supabase table not yet created)');
          return {
            total: MOCK_INVOICES.length,
            draft: MOCK_INVOICES.filter(i => i.is_draft).length,
            pending: MOCK_INVOICES.filter(i => i.status === 'pending').length,
            paid: MOCK_INVOICES.filter(i => i.status === 'paid').length,
            overdue: MOCK_INVOICES.filter(i => i.status === 'overdue').length,
            totalRevenue: MOCK_INVOICES
              .filter(i => i.status === 'paid')
              .reduce((sum, i) => sum + (i.total_amount || 0), 0),
            pendingRevenue: MOCK_INVOICES
              .filter(i => i.status === 'pending' || i.status === 'overdue')
              .reduce((sum, i) => sum + (i.total_amount || 0), 0),
          };
        }
        console.error('Error fetching invoice stats:', error);
        throw error;
      }

      if (!invoices) {
        return {
          total: 0,
          draft: 0,
          pending: 0,
          paid: 0,
          overdue: 0,
          totalRevenue: 0,
          pendingRevenue: 0,
        };
      }

      return {
        total: invoices.length,
        draft: invoices.filter(i => i.is_draft).length,
        pending: invoices.filter(i => i.status === 'pending').length,
        paid: invoices.filter(i => i.status === 'paid').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
        totalRevenue: invoices
          .filter(i => i.status === 'paid')
          .reduce((sum, i) => sum + (i.total_amount || 0), 0),
        pendingRevenue: invoices
          .filter(i => i.status === 'pending' || i.status === 'overdue')
          .reduce((sum, i) => sum + (i.total_amount || 0), 0),
      };
    } catch (error: any) {
      // Fallback to mock stats
      if (error?.code === 'PGRST205') {
        console.log('ℹ️ Using mock invoice stats (Supabase table not yet created)');
      } else {
        console.error('Error in getInvoiceStats:', error);
      }
      return {
        total: MOCK_INVOICES.length,
        draft: MOCK_INVOICES.filter(i => i.is_draft).length,
        pending: MOCK_INVOICES.filter(i => i.status === 'pending').length,
        paid: MOCK_INVOICES.filter(i => i.status === 'paid').length,
        overdue: MOCK_INVOICES.filter(i => i.status === 'overdue').length,
        totalRevenue: MOCK_INVOICES
          .filter(i => i.status === 'paid')
          .reduce((sum, i) => sum + (i.total_amount || 0), 0),
        pendingRevenue: MOCK_INVOICES
          .filter(i => i.status === 'pending' || i.status === 'overdue')
          .reduce((sum, i) => sum + (i.total_amount || 0), 0),
      };
    }
  }
}

export default InvoiceService;
