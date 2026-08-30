/**
 * Invoice Templates API
 * 
 * Manage reusable invoice templates.
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
 * GET /
 * List all invoice templates
 */
app.get('/', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const companyId = user.user_metadata.company_id || user.id;

    const { data: templates, error } = await supabase
      .from('invoice_templates_824f083c')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return c.json({
      templates: templates || [],
      count: templates?.length || 0,
    });

  } catch (error: any) {
    console.error('Error fetching invoice templates:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /:id
 * Get single invoice template
 */
app.get('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const companyId = user.user_metadata.company_id || user.id;

    const { data: template, error } = await supabase
      .from('invoice_templates_824f083c')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;

    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    return c.json(template);

  } catch (error: any) {
    console.error('Error fetching invoice template:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /
 * Create new invoice template
 */
app.post('/', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const companyId = user.user_metadata.company_id || user.id;

    const { data: template, error } = await supabase
      .from('invoice_templates_824f083c')
      .insert({
        company_id: companyId,
        name: body.name,
        line_items: body.line_items || [],
        tax_rate: body.tax_rate || 0,
        terms: body.terms || null,
        footer: body.footer || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json(template, 201);

  } catch (error: any) {
    console.error('Error creating invoice template:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /:id
 * Update invoice template
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
    const companyId = user.user_metadata.company_id || user.id;

    const { data: template, error } = await supabase
      .from('invoice_templates_824f083c')
      .update({
        name: body.name,
        line_items: body.line_items,
        tax_rate: body.tax_rate,
        terms: body.terms,
        footer: body.footer,
        notes: body.notes,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) throw error;

    return c.json(template);

  } catch (error: any) {
    console.error('Error updating invoice template:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /:id
 * Delete invoice template
 */
app.delete('/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const companyId = user.user_metadata.company_id || user.id;

    const { error } = await supabase
      .from('invoice_templates_824f083c')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;

    return c.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting invoice template:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /:id/apply
 * Apply template to create new invoice
 */
app.post('/:id/apply', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const templateId = c.req.param('id');
    const body = await c.req.json();
    const companyId = user.user_metadata.company_id || user.id;

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('invoice_templates_824f083c')
      .select('*')
      .eq('id', templateId)
      .eq('company_id', companyId)
      .single();

    if (templateError || !template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    // Get count for invoice number
    const { count } = await supabase
      .from('invoices_824f083c')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const number = String((count || 0) + 1).padStart(4, '0');
    const invoiceNumber = `INV-${year}${month}-${number}`;

    // Calculate totals from template line items
    const lineItems = template.line_items || [];
    const subtotal = lineItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    const taxAmount = subtotal * (template.tax_rate / 100);
    const totalAmount = subtotal + taxAmount;

    // Create invoice from template
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_824f083c')
      .insert({
        company_id: companyId,
        customer_id: body.customer_id,
        invoice_number: invoiceNumber,
        invoice_date: body.invoice_date || new Date().toISOString().split('T')[0],
        due_date: body.due_date,
        status: 'draft',
        payment_status: 'unpaid',
        type: 'standard',
        subtotal,
        tax_rate: template.tax_rate,
        tax_amount: taxAmount,
        discount_amount: 0,
        total_amount: totalAmount,
        amount_paid: 0,
        amount_due: totalAmount,
        notes: template.notes || body.notes || null,
        terms: template.terms || body.terms || null,
        footer: template.footer || body.footer || null,
        created_by: user.email || user.id,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create line items from template
    if (lineItems.length > 0) {
      const invoiceLineItems = lineItems.map((item: any, index: number) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price,
        sort_order: index,
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items_824f083c')
        .insert(invoiceLineItems);

      if (lineItemsError) throw lineItemsError;
    }

    return c.json({
      success: true,
      invoice_id: invoice.id,
      invoice_number: invoiceNumber,
      message: `Invoice created from template "${template.name}"`,
    }, 201);

  } catch (error: any) {
    console.error('Error applying invoice template:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
