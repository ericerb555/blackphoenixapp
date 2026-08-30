/**
 * Recurring Invoice Processor
 * 
 * Automatically generates invoices based on recurring schedules.
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

// Calculate next recurring date
function calculateNextDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semiannually':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setMonth(date.getMonth() + 1); // Default to monthly
  }
  
  return date.toISOString().split('T')[0];
}

// Generate invoice number
function generateInvoiceNumber(count: number): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const number = String(count + 1).padStart(4, '0');
  return `INV-${year}${month}-${number}`;
}

// Calculate due date
function calculateDueDate(invoiceDate: string, daysUntilDue: number = 30): string {
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + daysUntilDue);
  return date.toISOString().split('T')[0];
}

/**
 * POST /process
 * Process all due recurring invoices
 */
app.post('/process', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    const companyId = user.user_metadata.company_id || user.id;

    console.log('🔄 Processing recurring invoices for company:', companyId);

    // Find all recurring invoices that are due
    const { data: recurringInvoices, error: fetchError } = await supabase
      .from('invoices_824f083c')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_recurring', true)
      .lte('next_recurring_date', today)
      .is('recurring_end_date', null)
      .or(`recurring_end_date.gte.${today}`);

    if (fetchError) throw fetchError;

    if (!recurringInvoices || recurringInvoices.length === 0) {
      console.log('ℹ️ No recurring invoices due');
      return c.json({
        success: true,
        processed: 0,
        message: 'No recurring invoices due for processing',
      });
    }

    console.log(`📋 Found ${recurringInvoices.length} recurring invoice(s) to process`);

    const results = [];
    const errors = [];

    for (const parentInvoice of recurringInvoices) {
      try {
        // Get line items from parent invoice
        const { data: lineItems } = await supabase
          .from('invoice_line_items_824f083c')
          .select('*')
          .eq('invoice_id', parentInvoice.id)
          .order('sort_order', { ascending: true });

        // Get count for new invoice number
        const { count } = await supabase
          .from('invoices_824f083c')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId);

        const newInvoiceNumber = generateInvoiceNumber(count || 0);
        const invoiceDate = today;
        const dueDate = calculateDueDate(invoiceDate);

        // Create new invoice
        const { data: newInvoice, error: invoiceError } = await supabase
          .from('invoices_824f083c')
          .insert({
            company_id: companyId,
            customer_id: parentInvoice.customer_id,
            parent_invoice_id: parentInvoice.id,
            invoice_number: newInvoiceNumber,
            invoice_date: invoiceDate,
            due_date: dueDate,
            status: 'draft',
            payment_status: 'unpaid',
            type: 'recurring',
            subtotal: parentInvoice.subtotal,
            tax_rate: parentInvoice.tax_rate,
            tax_amount: parentInvoice.tax_amount,
            discount_amount: parentInvoice.discount_amount,
            total_amount: parentInvoice.total_amount,
            amount_paid: 0,
            amount_due: parentInvoice.total_amount,
            notes: parentInvoice.notes,
            terms: parentInvoice.terms,
            footer: parentInvoice.footer,
            is_recurring: false,
            created_by: 'system-recurring-processor',
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;

        // Copy line items
        if (lineItems && lineItems.length > 0) {
          const newLineItems = lineItems.map(item => ({
            invoice_id: newInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount,
            sort_order: item.sort_order,
          }));

          const { error: lineItemsError } = await supabase
            .from('invoice_line_items_824f083c')
            .insert(newLineItems);

          if (lineItemsError) throw lineItemsError;
        }

        // Update parent invoice's next recurring date
        const nextDate = calculateNextDate(
          parentInvoice.next_recurring_date || today,
          parentInvoice.recurring_frequency || 'monthly'
        );

        await supabase
          .from('invoices_824f083c')
          .update({ next_recurring_date: nextDate })
          .eq('id', parentInvoice.id);

        console.log(`✅ Created invoice ${newInvoiceNumber} from recurring invoice ${parentInvoice.invoice_number}`);

        results.push({
          parent_invoice_number: parentInvoice.invoice_number,
          new_invoice_number: newInvoiceNumber,
          new_invoice_id: newInvoice.id,
          customer_id: parentInvoice.customer_id,
          total_amount: parentInvoice.total_amount,
          next_date: nextDate,
        });

      } catch (error: any) {
        console.error(`❌ Error processing recurring invoice ${parentInvoice.invoice_number}:`, error);
        errors.push({
          invoice_number: parentInvoice.invoice_number,
          error: error.message,
        });
      }
    }

    return c.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      message: `Processed ${results.length} recurring invoice(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
    });

  } catch (error: any) {
    console.error('❌ Error processing recurring invoices:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /due
 * Get list of recurring invoices due for processing
 */
app.get('/due', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    const companyId = user.user_metadata.company_id || user.id;

    const { data: invoices, error } = await supabase
      .from('invoices_824f083c')
      .select(`
        *,
        customer:customers_824f083c!customer_id(id, first_name, last_name, company_name, email)
      `)
      .eq('company_id', companyId)
      .eq('is_recurring', true)
      .lte('next_recurring_date', today)
      .or(`recurring_end_date.is.null,recurring_end_date.gte.${today}`);

    if (error) throw error;

    return c.json({
      invoices: invoices || [],
      count: invoices?.length || 0,
    });

  } catch (error: any) {
    console.error('❌ Error fetching due recurring invoices:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /pause/:id
 * Pause a recurring invoice
 */
app.post('/pause/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const companyId = user.user_metadata.company_id || user.id;

    const { data: invoice, error } = await supabase
      .from('invoices_824f083c')
      .update({
        recurring_end_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .eq('is_recurring', true)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      success: true,
      invoice,
      message: 'Recurring invoice paused',
    });

  } catch (error: any) {
    console.error('❌ Error pausing recurring invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /resume/:id
 * Resume a paused recurring invoice
 */
app.post('/resume/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const companyId = user.user_metadata.company_id || user.id;

    // Get current invoice to calculate next date
    const { data: currentInvoice } = await supabase
      .from('invoices_824f083c')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentInvoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    const today = new Date().toISOString().split('T')[0];
    const nextDate = calculateNextDate(today, currentInvoice.recurring_frequency || 'monthly');

    const { data: invoice, error } = await supabase
      .from('invoices_824f083c')
      .update({
        recurring_end_date: null,
        next_recurring_date: nextDate,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .eq('is_recurring', true)
      .select()
      .single();

    if (error) throw error;

    return c.json({
      success: true,
      invoice,
      message: 'Recurring invoice resumed',
    });

  } catch (error: any) {
    console.error('❌ Error resuming recurring invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /history/:id
 * Get history of invoices generated from a recurring invoice
 */
app.get('/history/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const companyId = user.user_metadata.company_id || user.id;

    const { data: invoices, error } = await supabase
      .from('invoices_824f083c')
      .select(`
        *,
        customer:customers_824f083c!customer_id(id, first_name, last_name, company_name)
      `)
      .eq('parent_invoice_id', id)
      .eq('company_id', companyId)
      .order('invoice_date', { ascending: false });

    if (error) throw error;

    return c.json({
      invoices: invoices || [],
      count: invoices?.length || 0,
    });

  } catch (error: any) {
    console.error('❌ Error fetching recurring invoice history:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
