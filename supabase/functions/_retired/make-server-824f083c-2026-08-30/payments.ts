/**
 * Payment Server Routes
 * 
 * Backend API endpoints for invoice payment management.
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

// Update invoice payment status
async function updateInvoicePaymentStatus(invoiceId: string) {
  const supabase = getSupabaseClient();

  // Get invoice
  const { data: invoice } = await supabase
    .from('invoices_824f083c')
    .select('total_amount, amount_paid')
    .eq('id', invoiceId)
    .single();

  if (!invoice) return;

  // Get all payments
  const { data: payments } = await supabase
    .from('payments_824f083c')
    .select('amount')
    .eq('invoice_id', invoiceId);

  const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);
  const amountDue = invoice.total_amount - totalPaid;

  // Determine payment status
  let paymentStatus = 'unpaid';
  let status = invoice.total_amount === totalPaid ? 'paid' : 'sent';
  
  if (totalPaid === 0) {
    paymentStatus = 'unpaid';
  } else if (totalPaid >= invoice.total_amount) {
    paymentStatus = 'paid';
    status = 'paid';
  } else {
    paymentStatus = 'partial';
  }

  // Update invoice
  await supabase
    .from('invoices_824f083c')
    .update({
      amount_paid: totalPaid,
      amount_due: amountDue,
      payment_status: paymentStatus,
      status: status,
      paid_date: paymentStatus === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId);
}

/**
 * GET /payments
 * List all payments (optionally filtered by invoice)
 */
app.get('/', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const invoiceId = c.req.query('invoice_id');

    let query = supabase
      .from('payments_824f083c')
      .select(`
        *,
        invoice:invoices_824f083c!invoice_id(
          id,
          invoice_number,
          customer:customers_824f083c!customer_id(id, first_name, last_name, company_name)
        )
      `)
      .order('payment_date', { ascending: false });

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return c.json({ payments: data || [] });
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /payments/:id
 * Get single payment
 */
app.get('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');

    const { data, error } = await supabase
      .from('payments_824f083c')
      .select(`
        *,
        invoice:invoices_824f083c!invoice_id(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    return c.json(data);
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /payments
 * Create new payment
 */
app.post('/', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();

    // Verify invoice exists and belongs to user
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_824f083c')
      .select('*')
      .eq('id', body.invoice_id)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .single();

    if (invoiceError || !invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return c.json({ error: 'Invoice is already fully paid' }, 400);
    }

    // Create payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments_824f083c')
      .insert({
        invoice_id: body.invoice_id,
        amount: body.amount,
        payment_method: body.payment_method,
        payment_date: body.payment_date || new Date().toISOString().split('T')[0],
        reference_number: body.reference_number || null,
        notes: body.notes || null,
        created_by: user.email || user.id,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update invoice payment status
    await updateInvoicePaymentStatus(body.invoice_id);

    return c.json(payment, 201);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /payments/:id
 * Delete payment
 */
app.delete('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');

    // Get payment to check invoice
    const { data: payment, error: paymentError } = await supabase
      .from('payments_824f083c')
      .select('invoice_id')
      .eq('id', id)
      .single();

    if (paymentError || !payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    // Verify invoice belongs to user
    const { data: invoice } = await supabase
      .from('invoices_824f083c')
      .select('id')
      .eq('id', payment.invoice_id)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .single();

    if (!invoice) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Delete payment
    const { error: deleteError } = await supabase
      .from('payments_824f083c')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Update invoice payment status
    await updateInvoicePaymentStatus(payment.invoice_id);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting payment:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /payments/invoice/:invoiceId
 * Get all payments for an invoice
 */
app.get('/invoice/:invoiceId', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const invoiceId = c.req.param('invoiceId');

    // Verify invoice belongs to user
    const { data: invoice } = await supabase
      .from('invoices_824f083c')
      .select('id')
      .eq('id', invoiceId)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .single();

    if (!invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Get payments
    const { data: payments, error } = await supabase
      .from('payments_824f083c')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return c.json({ payments: payments || [] });
  } catch (error: any) {
    console.error('Error fetching invoice payments:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
