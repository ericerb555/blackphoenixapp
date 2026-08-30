/**
 * PDF Generator for Invoices
 * 
 * Generates professional invoice PDFs.
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

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Generate HTML for invoice
function generateInvoiceHTML(invoice: any, lineItems: any[]): string {
  const customerName = invoice.customer?.company_name || 
    `${invoice.customer?.first_name || ''} ${invoice.customer?.last_name || ''}`.trim();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      background: #fff;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #fff;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #ea580c;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #ea580c;
      margin-bottom: 8px;
    }
    
    .company-details {
      font-size: 12px;
      color: #666;
      line-height: 1.8;
    }
    
    .invoice-title {
      text-align: right;
      flex: 1;
    }
    
    .invoice-title h1 {
      font-size: 36px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    
    .invoice-number {
      font-size: 18px;
      color: #666;
      margin-bottom: 4px;
    }
    
    .invoice-status {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 8px;
    }
    
    .status-draft { background: #e5e7eb; color: #374151; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .status-partial { background: #fef3c7; color: #92400e; }
    .status-cancelled { background: #f3f4f6; color: #6b7280; }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    
    .info-block {
      flex: 1;
    }
    
    .info-block h3 {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    
    .info-block p {
      font-size: 14px;
      color: #1a1a1a;
      line-height: 1.8;
    }
    
    .info-label {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .table-container {
      margin: 40px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    thead {
      background: #f9fafb;
    }
    
    th {
      text-align: left;
      padding: 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      color: #666;
      border-bottom: 2px solid #e5e7eb;
      letter-spacing: 0.5px;
    }
    
    th.text-right,
    td.text-right {
      text-align: right;
    }
    
    th.text-center,
    td.text-center {
      text-align: center;
    }
    
    tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }
    
    td {
      padding: 16px 12px;
      font-size: 14px;
      color: #1a1a1a;
    }
    
    .description {
      font-weight: 500;
    }
    
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 30px;
    }
    
    .totals-table {
      width: 350px;
    }
    
    .totals-table table {
      margin: 0;
    }
    
    .totals-row td {
      padding: 10px 12px;
      border: none;
    }
    
    .totals-label {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }
    
    .totals-value {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    .total-row {
      border-top: 2px solid #e5e7eb;
      background: #f9fafb;
    }
    
    .total-row td {
      padding: 16px 12px !important;
    }
    
    .total-row .totals-label {
      font-size: 16px;
      font-weight: bold;
      color: #1a1a1a;
    }
    
    .total-row .totals-value {
      font-size: 20px;
      font-weight: bold;
      color: #ea580c;
    }
    
    .amount-due-row {
      background: #fef3c7;
    }
    
    .amount-due-row .totals-value {
      color: #92400e;
    }
    
    .notes-section {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    
    .notes-section h3 {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 12px;
    }
    
    .notes-section p {
      font-size: 13px;
      color: #666;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .container {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-name">Your Company Name</div>
        <div class="company-details">
          123 Business Street<br>
          City, State 12345<br>
          (555) 123-4567<br>
          info@yourcompany.com
        </div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-number">${invoice.invoice_number}</div>
        <span class="invoice-status status-${invoice.status}">${invoice.status.toUpperCase()}</span>
      </div>
    </div>
    
    <!-- Info Section -->
    <div class="info-section">
      <div class="info-block">
        <h3>Bill To</h3>
        <p>
          <strong>${customerName}</strong><br>
          ${invoice.customer?.email || ''}<br>
          ${invoice.customer?.phone || ''}
        </p>
      </div>
      <div class="info-block" style="text-align: right;">
        <div style="margin-bottom: 20px;">
          <div class="info-label">Invoice Date</div>
          <div class="info-value">${formatDate(invoice.invoice_date)}</div>
        </div>
        <div>
          <div class="info-label">Due Date</div>
          <div class="info-value">${formatDate(invoice.due_date)}</div>
        </div>
      </div>
    </div>
    
    <!-- Line Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Description</th>
            <th class="text-center" style="width: 15%;">Quantity</th>
            <th class="text-right" style="width: 17.5%;">Unit Price</th>
            <th class="text-right" style="width: 17.5%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItems.map(item => `
            <tr>
              <td class="description">${item.description}</td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">${formatCurrency(item.unit_price)}</td>
              <td class="text-right">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Totals Section -->
    <div class="totals-section">
      <div class="totals-table">
        <table>
          <tbody>
            <tr class="totals-row">
              <td class="totals-label">Subtotal</td>
              <td class="totals-value text-right">${formatCurrency(invoice.subtotal)}</td>
            </tr>
            ${invoice.tax_rate > 0 ? `
              <tr class="totals-row">
                <td class="totals-label">Tax (${invoice.tax_rate}%)</td>
                <td class="totals-value text-right">${formatCurrency(invoice.tax_amount)}</td>
              </tr>
            ` : ''}
            ${invoice.discount_amount > 0 ? `
              <tr class="totals-row">
                <td class="totals-label">Discount</td>
                <td class="totals-value text-right">-${formatCurrency(invoice.discount_amount)}</td>
              </tr>
            ` : ''}
            <tr class="totals-row total-row">
              <td class="totals-label">Total</td>
              <td class="totals-value text-right">${formatCurrency(invoice.total_amount)}</td>
            </tr>
            ${invoice.amount_paid > 0 ? `
              <tr class="totals-row">
                <td class="totals-label">Amount Paid</td>
                <td class="totals-value text-right" style="color: #059669;">-${formatCurrency(invoice.amount_paid)}</td>
              </tr>
              <tr class="totals-row amount-due-row">
                <td class="totals-label">Amount Due</td>
                <td class="totals-value text-right">${formatCurrency(invoice.amount_due)}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Notes Section -->
    ${invoice.notes || invoice.terms ? `
      <div class="notes-section">
        ${invoice.notes ? `
          <div style="margin-bottom: 20px;">
            <h3>Notes</h3>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}
        
        ${invoice.terms ? `
          <div>
            <h3>Terms & Conditions</h3>
            <p>${invoice.terms}</p>
          </div>
        ` : ''}
      </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      ${invoice.footer || 'Thank you for your business!'}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * POST /generate/:id
 * Generate PDF for invoice
 */
app.post('/generate/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');

    // Fetch invoice with customer data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_824f083c')
      .select(`
        *,
        customer:customers_824f083c!customer_id(*)
      `)
      .eq('id', id)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .single();

    if (invoiceError || !invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items_824f083c')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true });

    // Generate HTML
    const html = generateInvoiceHTML(invoice, lineItems || []);

    // Return HTML (can be converted to PDF client-side or using a PDF service)
    // For now, we return HTML that can be printed to PDF
    return c.html(html);

  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /preview/:id
 * Preview invoice HTML
 */
app.get('/preview/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');

    // Fetch invoice with customer data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices_824f083c')
      .select(`
        *,
        customer:customers_824f083c!customer_id(*)
      `)
      .eq('id', id)
      .eq('company_id', user.user_metadata.company_id || user.id)
      .single();

    if (invoiceError || !invoice) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items_824f083c')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true });

    // Generate and return HTML
    const html = generateInvoiceHTML(invoice, lineItems || []);
    return c.html(html);

  } catch (error: any) {
    console.error('Error previewing invoice:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
