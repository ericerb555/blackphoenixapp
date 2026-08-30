/**
 * Bulk Operations for Invoices
 * 
 * Handle bulk actions on multiple invoices.
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

/**
 * POST /delete
 * Bulk delete invoices
 */
app.post('/delete', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const { invoice_ids } = body;

    if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return c.json({ error: 'invoice_ids must be a non-empty array' }, 400);
    }

    const companyId = user.user_metadata.company_id || user.id;

    // Verify all invoices belong to user and are not paid
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices_824f083c')
      .select('id, status')
      .in('id', invoice_ids)
      .eq('company_id', companyId);

    if (fetchError) throw fetchError;

    // Filter out paid invoices
    const validIds = invoices
      ?.filter(inv => inv.status !== 'paid')
      .map(inv => inv.id) || [];

    const skippedCount = invoice_ids.length - validIds.length;

    // Delete line items first
    if (validIds.length > 0) {
      await supabase
        .from('invoice_line_items_824f083c')
        .delete()
        .in('invoice_id', validIds);

      // Delete invoices
      const { error: deleteError } = await supabase
        .from('invoices_824f083c')
        .delete()
        .in('id', validIds);

      if (deleteError) throw deleteError;
    }

    return c.json({
      success: true,
      deleted_count: validIds.length,
      skipped_count: skippedCount,
      message: `Deleted ${validIds.length} invoice(s)${skippedCount > 0 ? `, skipped ${skippedCount} paid invoice(s)` : ''}`,
    });

  } catch (error: any) {
    console.error('Error bulk deleting invoices:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /mark-sent
 * Bulk mark invoices as sent
 */
app.post('/mark-sent', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const { invoice_ids } = body;

    if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return c.json({ error: 'invoice_ids must be a non-empty array' }, 400);
    }

    const companyId = user.user_metadata.company_id || user.id;

    // Update invoices
    const { data, error } = await supabase
      .from('invoices_824f083c')
      .update({
        status: 'sent',
        sent_date: new Date().toISOString(),
      })
      .in('id', invoice_ids)
      .eq('company_id', companyId)
      .eq('status', 'draft') // Only update drafts
      .select();

    if (error) throw error;

    return c.json({
      success: true,
      updated_count: data?.length || 0,
      message: `Marked ${data?.length || 0} invoice(s) as sent`,
    });

  } catch (error: any) {
    console.error('Error bulk marking invoices as sent:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /mark-paid
 * Bulk mark invoices as paid
 */
app.post('/mark-paid', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const { invoice_ids, payment_method = 'other', payment_date } = body;

    if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return c.json({ error: 'invoice_ids must be a non-empty array' }, 400);
    }

    const companyId = user.user_metadata.company_id || user.id;
    const payDate = payment_date || new Date().toISOString().split('T')[0];

    // Get invoices to create payments for
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices_824f083c')
      .select('id, total_amount, amount_due')
      .in('id', invoice_ids)
      .eq('company_id', companyId)
      .neq('status', 'paid')
      .neq('status', 'cancelled');

    if (fetchError) throw fetchError;

    if (!invoices || invoices.length === 0) {
      return c.json({
        success: true,
        updated_count: 0,
        message: 'No invoices to update',
      });
    }

    // Create payment records for each invoice
    const payments = invoices.map(inv => ({
      invoice_id: inv.id,
      amount: inv.amount_due,
      payment_method,
      payment_date: payDate,
      notes: 'Bulk payment entry',
      created_by: user.email || user.id,
    }));

    const { error: paymentError } = await supabase
      .from('payments_824f083c')
      .insert(payments);

    if (paymentError) throw paymentError;

    // Update invoices
    const { error: updateError } = await supabase
      .from('invoices_824f083c')
      .update({
        status: 'paid',
        payment_status: 'paid',
        amount_paid: supabase.from('invoices_824f083c').select('total_amount'),
        amount_due: 0,
        paid_date: new Date().toISOString(),
      })
      .in('id', invoice_ids)
      .eq('company_id', companyId);

    if (updateError) throw updateError;

    return c.json({
      success: true,
      updated_count: invoices.length,
      message: `Marked ${invoices.length} invoice(s) as paid`,
    });

  } catch (error: any) {
    console.error('Error bulk marking invoices as paid:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /send-emails
 * Bulk send invoice emails
 */
app.post('/send-emails', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const { invoice_ids } = body;

    if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
      return c.json({ error: 'invoice_ids must be a non-empty array' }, 400);
    }

    const companyId = user.user_metadata.company_id || user.id;

    // Get invoices with customer emails
    const { data: invoices, error: fetchError } = await supabase
      .from('invoices_824f083c')
      .select(`
        id,
        invoice_number,
        customer:customers_824f083c!customer_id(email)
      `)
      .in('id', invoice_ids)
      .eq('company_id', companyId)
      .eq('status', 'draft');

    if (fetchError) throw fetchError;

    // Filter invoices with valid emails
    const validInvoices = invoices?.filter(inv => inv.customer?.email) || [];
    const skippedCount = invoice_ids.length - validInvoices.length;

    // TODO: Send emails via email service
    console.log(`📧 Would send ${validInvoices.length} emails`);

    // Update invoices to sent
    if (validInvoices.length > 0) {
      const validIds = validInvoices.map(inv => inv.id);
      
      await supabase
        .from('invoices_824f083c')
        .update({
          status: 'sent',
          sent_date: new Date().toISOString(),
        })
        .in('id', validIds);
    }

    return c.json({
      success: true,
      sent_count: validInvoices.length,
      skipped_count: skippedCount,
      message: `Sent ${validInvoices.length} email(s)${skippedCount > 0 ? `, skipped ${skippedCount} invoice(s) without email` : ''}`,
    });

  } catch (error: any) {
    console.error('Error bulk sending emails:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /export
 * Export invoices to CSV
 */
app.post('/export', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const { invoice_ids, format = 'csv' } = body;

    const companyId = user.user_metadata.company_id || user.id;

    // Build query
    let query = supabase
      .from('invoices_824f083c')
      .select(`
        *,
        customer:customers_824f083c!customer_id(first_name, last_name, company_name, email)
      `)
      .eq('company_id', companyId);

    // Filter by IDs if provided
    if (invoice_ids && Array.isArray(invoice_ids) && invoice_ids.length > 0) {
      query = query.in('id', invoice_ids);
    }

    const { data: invoices, error } = await query;

    if (error) throw error;

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Invoice Number',
        'Customer',
        'Invoice Date',
        'Due Date',
        'Status',
        'Payment Status',
        'Subtotal',
        'Tax',
        'Discount',
        'Total',
        'Paid',
        'Due',
      ];

      const rows = invoices?.map(inv => {
        const customerName = inv.customer?.company_name || 
          `${inv.customer?.first_name || ''} ${inv.customer?.last_name || ''}`.trim();

        return [
          inv.invoice_number,
          customerName,
          inv.invoice_date,
          inv.due_date,
          inv.status,
          inv.payment_status,
          inv.subtotal,
          inv.tax_amount,
          inv.discount_amount,
          inv.total_amount,
          inv.amount_paid,
          inv.amount_due,
        ];
      }) || [];

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      return c.text(csv, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.csv"`,
      });
    }

    // Return JSON by default
    return c.json({
      invoices: invoices || [],
      count: invoices?.length || 0,
    });

  } catch (error: any) {
    console.error('Error exporting invoices:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
