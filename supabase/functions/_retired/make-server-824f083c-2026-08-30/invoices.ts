/**
 * Invoice Server Routes
 * 
 * Backend API endpoints for invoice management.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

// Initialize Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Helper to get user from auth token
async function getUser(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  
  return user;
}

// Generate invoice number
function generateInvoiceNumber(count: number): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const number = String(count + 1).padStart(4, '0');
  return `INV-${year}${month}-${number}`;
}

// Calculate invoice totals
function calculateInvoiceTotals(lineItems: any[], taxRate: number, discountAmount: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discountAmount;
  
  return {
    subtotal,
    tax_amount: taxAmount,
    total_amount: total,
  };
}

/**
 * GET /invoices
 * List invoices with filters and pagination
 */
app.get('/', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    
    // Get query parameters
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '20');
    const search = c.req.query('search');
    const status = c.req.query('status')?.split(',');
    const paymentStatus = c.req.query('payment_status')?.split(',');
    const type = c.req.query('type')?.split(',');
    const dateFrom = c.req.query('date_from');
    const dateTo = c.req.query('date_to');
    const amountMin = c.req.query('amount_min');
    const amountMax = c.req.query('amount_max');
    const overdueOnly = c.req.query('overdue_only') === 'true';
    const customerId = c.req.query('customer_id');

    // Build query
    let query = supabase
      .from('invoices_824f083c')
      .select(`
        *,
        customer:customers_824f083c!customer_id(id, first_name, last_name, company_name, email, phone),
        work_order:work_orders_824f083c!work_order_id(id, work_order_number),
        quote:quotes_824f083c!quote_id(id, quote_number)
      `, { count: 'exact' })
      .eq('company_id', user.user_metadata.company_id || user.id);

    // Apply filters
    if (search) {
      query = query.or(`invoice_number.ilike.%${search}%,customer.company_name.ilike.%${search}%,customer.first_name.ilike.%${search}%,customer.last_name.ilike.%${search}%`);
    }

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    if (paymentStatus && paymentStatus.length > 0) {
      query = query.in('payment_status', paymentStatus);
    }

    if (type && type.length > 0) {
      query = query.in('type', type);
    }

    if (dateFrom) {
      query = query.gte('invoice_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('invoice_date', dateTo);
    }

    if (amountMin) {
      query = query.gte('total_amount', parseFloat(amountMin));
    }

    if (amountMax) {
      query = query.lte('total_amount', parseFloat(amountMax));
    }

    if (overdueOnly) {
      const today = new Date().toISOString().split('T')[0];
      query = query.lt('due_date', today).neq('status', 'paid').neq('status', 'cancelled');
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    // Fetch line items for each invoice
    const invoicesWithLineItems = await Promise.all(
      (data || []).map(async (invoice) => {
        const { data: lineItems } = await supabase
          .from('invoice_line_items_824f083c')
          .select('*')
          .eq('invoice_id', invoice.id)
          .order('sort_order', { ascending: true });

        return {
          ...invoice,
          line_items: lineItems || [],
        };
      })
    );

    return c.json({
      invoices: invoicesWithLineItems,
      total: count || 0,
      page,
      page_size: pageSize,
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /invoices/stats
 * Get invoice statistics
 */
app.get('/stats', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const companyId = user.user_metadata.company_id || user.id;

    // Get all invoices for stats
    const { data: invoices, error } = await supabase
      .from('invoices_824f083c')
      .select('*')
      .eq('company_id', companyId);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];

    // Calculate stats
    const stats = {
      total_invoices: invoices?.length || 0,
      draft_count: invoices?.filter(i => i.status === 'draft').length || 0,
      sent_count: invoices?.filter(i => i.status === 'sent').length || 0,
      paid_count: invoices?.filter(i => i.status === 'paid').length || 0,
      overdue_count: invoices?.filter(i => 
        i.due_date < today && i.status !== 'paid' && i.status !== 'cancelled'
      ).length || 0,
      total_revenue: invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0) || 0,
      outstanding_amount: invoices?.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + i.amount_due, 0) || 0,
      average_invoice_amount: invoices?.length ? (invoices.reduce((sum, i) => sum + i.total_amount, 0) / invoices.length) : 0,
      average_payment_days: 0, // TODO: Calculate from payment history
    };

    return c.json(stats);
  } catch (error: any) {
    console.error('Error fetching invoice stats:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /invoices/:id
 * Get single invoice by ID
 */
app.get('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');

    // Fetch invoice
    const { data: invoice, error } = await supabase
      .from('invoices_824f083c')
      .select(`
        *,
        customer:customers_824f083c!customer_id(*),
        work_order:work_orders_824f083c!work_order_id(*),
        quote:quotes_824f083c!quote_id(*)
      `)
      .eq('id', id)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .single();

    if (error) throw error;
    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items_824f083c')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true });

    return c.json({
      ...invoice,
      line_items: lineItems || [],
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /invoices
 * Create new invoice
 */
app.post('/', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();

    // Get count for invoice number
    const { count } = await supabase
      .from('invoices_824f083c')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', user.user_metadata.company_id || user.id);

    const invoiceNumber = generateInvoiceNumber(count || 0);

    // Calculate totals
    const totals = calculateInvoiceTotals(
      body.line_items || [],
      body.tax_rate || 0,
      body.discount_amount || 0
    );

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_824f083c')
      .insert({
        company_id: user.user_metadata.company_id || user.id,
        customer_id: body.customer_id,
        work_order_id: body.work_order_id || null,
        quote_id: body.quote_id || null,
        invoice_number: invoiceNumber,
        invoice_date: body.invoice_date,
        due_date: body.due_date,
        status: 'draft',
        payment_status: 'unpaid',
        type: body.type || 'standard',
        subtotal: totals.subtotal,
        tax_rate: body.tax_rate || 0,
        tax_amount: totals.tax_amount,
        discount_amount: body.discount_amount || 0,
        total_amount: totals.total_amount,
        amount_paid: 0,
        amount_due: totals.total_amount,
        notes: body.notes || null,
        terms: body.terms || null,
        footer: body.footer || null,
        is_recurring: body.is_recurring || false,
        recurring_frequency: body.recurring_frequency || null,
        recurring_start_date: body.recurring_start_date || null,
        recurring_end_date: body.recurring_end_date || null,
        created_by: user.email || user.id,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create line items
    if (body.line_items && body.line_items.length > 0) {
      const lineItemsToInsert = body.line_items.map((item: any, index: number) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
        sort_order: index,
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items_824f083c')
        .insert(lineItemsToInsert);

      if (lineItemsError) throw lineItemsError;
    }

    // Fetch complete invoice with line items
    const { data: completeInvoice } = await supabase
      .from('invoices_824f083c')
      .select(`
        *,
        customer:customers_824f083c!customer_id(*)
      `)
      .eq('id', invoice.id)
      .single();

    const { data: lineItems } = await supabase
      .from('invoice_line_items_824f083c')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('sort_order', { ascending: true });

    return c.json({
      ...completeInvoice,
      line_items: lineItems || [],
    }, 201);
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /invoices/:id
 * Update invoice
 */
app.put('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const body = await c.req.json();

    // Check if invoice exists and belongs to user
    const { data: existingInvoice, error: checkError } = await supabase
      .from('invoices_824f083c')
      .select('*')
      .eq('id', id)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .single();

    if (checkError || !existingInvoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Can't edit paid or cancelled invoices
    if (existingInvoice.status === 'paid' || existingInvoice.status === 'cancelled') {
      return c.json({ error: 'Cannot edit paid or cancelled invoices' }, 400);
    }

    // Calculate new totals
    const totals = calculateInvoiceTotals(
      body.line_items || [],
      body.tax_rate || 0,
      body.discount_amount || 0
    );

    // Update invoice
    const { data: invoice, error: updateError } = await supabase
      .from('invoices_824f083c')
      .update({
        customer_id: body.customer_id,
        invoice_date: body.invoice_date,
        due_date: body.due_date,
        subtotal: totals.subtotal,
        tax_rate: body.tax_rate || 0,
        tax_amount: totals.tax_amount,
        discount_amount: body.discount_amount || 0,
        total_amount: totals.total_amount,
        amount_due: totals.total_amount - existingInvoice.amount_paid,
        notes: body.notes || null,
        terms: body.terms || null,
        footer: body.footer || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update line items - delete old ones and insert new ones
    await supabase
      .from('invoice_line_items_824f083c')
      .delete()
      .eq('invoice_id', id);

    if (body.line_items && body.line_items.length > 0) {
      const lineItemsToInsert = body.line_items.map((item: any, index: number) => ({
        invoice_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
        sort_order: index,
      }));

      await supabase
        .from('invoice_line_items_824f083c')
        .insert(lineItemsToInsert);
    }

    // Fetch complete invoice
    const { data: completeInvoice } = await supabase
      .from('invoices_824f083c')
      .select(`
        *,
        customer:customers_824f083c!customer_id(*)
      `)
      .eq('id', id)
      .single();

    const { data: lineItems } = await supabase
      .from('invoice_line_items_824f083c')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true });

    return c.json({
      ...completeInvoice,
      line_items: lineItems || [],
    });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /invoices/:id
 * Delete invoice
 */
app.delete('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');

    // Check if invoice exists
    const { data: invoice, error: checkError } = await supabase
      .from('invoices_824f083c')
      .select('*')
      .eq('id', id)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .single();

    if (checkError || !invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Can't delete paid invoices
    if (invoice.status === 'paid') {
      return c.json({ error: 'Cannot delete paid invoices' }, 400);
    }

    // Delete line items first
    await supabase
      .from('invoice_line_items_824f083c')
      .delete()
      .eq('invoice_id', id);

    // Delete invoice
    const { error: deleteError } = await supabase
      .from('invoices_824f083c')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /invoices/:id/send
 * Mark invoice as sent
 */
app.post('/:id/send', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');

    const { data: invoice, error } = await supabase
      .from('invoices_824f083c')
      .update({
        status: 'sent',
        sent_date: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .select()
      .single();

    if (error) throw error;

    return c.json(invoice);
  } catch (error: any) {
    console.error('Error sending invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /invoices/:id/void
 * Void an invoice
 */
app.post('/:id/void', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const body = await c.req.json();

    // Check invoice
    const { data: existingInvoice } = await supabase
      .from('invoices_824f083c')
      .select('*')
      .eq('id', id)
      .single();

    if (existingInvoice?.status === 'paid') {
      return c.json({ error: 'Cannot void a paid invoice' }, 400);
    }

    const { data: invoice, error } = await supabase
      .from('invoices_824f083c')
      .update({
        status: 'cancelled',
        void_reason: body.reason || null,
        voided_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .select()
      .single();

    if (error) throw error;

    return c.json(invoice);
  } catch (error: any) {
    console.error('Error voiding invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
