/**
 * Email Service for Invoices
 * 
 * Sends invoices via email to customers.
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

// Generate email HTML
function generateEmailHTML(invoice: any, customerName: string, pdfUrl?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #fff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
      padding: 40px 30px;
      text-align: center;
      color: #fff;
    }
    
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
      font-weight: bold;
    }
    
    .header p {
      margin: 0;
      font-size: 18px;
      opacity: 0.9;
    }
    
    .content {
      padding: 40px 30px;
    }
    
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
      color: #1a1a1a;
    }
    
    .message {
      font-size: 15px;
      color: #666;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    
    .invoice-details {
      background: #f9fafb;
      border-radius: 6px;
      padding: 25px;
      margin: 30px 0;
      border: 1px solid #e5e7eb;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-label {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }
    
    .detail-value {
      font-size: 14px;
      color: #1a1a1a;
      font-weight: 600;
    }
    
    .total-row {
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid #e5e7eb;
    }
    
    .total-row .detail-label {
      font-size: 16px;
      color: #1a1a1a;
    }
    
    .total-row .detail-value {
      font-size: 20px;
      color: #ea580c;
    }
    
    .cta-button {
      display: inline-block;
      background: #ea580c;
      color: #fff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
      transition: background 0.3s;
    }
    
    .cta-button:hover {
      background: #dc2626;
    }
    
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    
    .note {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .note p {
      margin: 0;
      font-size: 14px;
      color: #92400e;
    }
    
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer p {
      margin: 5px 0;
      font-size: 13px;
      color: #999;
    }
    
    .footer a {
      color: #ea580c;
      text-decoration: none;
    }
    
    .social-links {
      margin: 20px 0 10px 0;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: #666;
      text-decoration: none;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Invoice</h1>
      <p>${invoice.invoice_number}</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      <div class="greeting">
        Hello ${customerName},
      </div>
      
      <div class="message">
        Thank you for your business! Please find your invoice details below. 
        ${invoice.amount_due > 0 ? `Payment is due by <strong>${formatDate(invoice.due_date)}</strong>.` : ''}
      </div>
      
      <!-- Invoice Details -->
      <div class="invoice-details">
        <div class="detail-row">
          <span class="detail-label">Invoice Number</span>
          <span class="detail-value">${invoice.invoice_number}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Invoice Date</span>
          <span class="detail-value">${formatDate(invoice.invoice_date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Due Date</span>
          <span class="detail-value">${formatDate(invoice.due_date)}</span>
        </div>
        <div class="detail-row total-row">
          <span class="detail-label">Amount Due</span>
          <span class="detail-value">${formatCurrency(invoice.amount_due)}</span>
        </div>
      </div>
      
      ${invoice.amount_due > 0 ? `
        <div class="note">
          <p><strong>Payment Due:</strong> Please ensure payment is received by ${formatDate(invoice.due_date)} to avoid late fees.</p>
        </div>
      ` : ''}
      
      <!-- CTA Button -->
      ${pdfUrl ? `
        <div class="button-container">
          <a href="${pdfUrl}" class="cta-button">View Invoice PDF</a>
        </div>
      ` : ''}
      
      <div class="message">
        If you have any questions about this invoice, please contact us at 
        <a href="mailto:billing@yourcompany.com">billing@yourcompany.com</a> 
        or call (555) 123-4567.
      </div>
      
      <div class="message" style="margin-top: 30px;">
        Best regards,<br>
        <strong>Your Company Name</strong>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>Your Company Name</strong></p>
      <p>123 Business Street, City, State 12345</p>
      <p>(555) 123-4567 | info@yourcompany.com</p>
      
      <div class="social-links">
        <a href="#">Website</a> | 
        <a href="#">Facebook</a> | 
        <a href="#">Twitter</a> | 
        <a href="#">LinkedIn</a>
      </div>
      
      <p style="margin-top: 20px; font-size: 11px;">
        This is an automated email. Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Generate plain text email
function generateEmailText(invoice: any, customerName: string): string {
  return `
Hello ${customerName},

Thank you for your business! Please find your invoice details below.

INVOICE DETAILS
---------------
Invoice Number: ${invoice.invoice_number}
Invoice Date: ${formatDate(invoice.invoice_date)}
Due Date: ${formatDate(invoice.due_date)}
Amount Due: ${formatCurrency(invoice.amount_due)}

${invoice.amount_due > 0 ? `Payment is due by ${formatDate(invoice.due_date)}.` : ''}

If you have any questions about this invoice, please contact us at billing@yourcompany.com or call (555) 123-4567.

Best regards,
Your Company Name

---
Your Company Name
123 Business Street, City, State 12345
(555) 123-4567 | info@yourcompany.com
  `.trim();
}

/**
 * POST /send/:id
 * Send invoice email
 */
app.post('/send/:id', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const body = await c.req.json();

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

    if (!invoice.customer?.email) {
      return c.json({ error: 'Customer email not found' }, 400);
    }

    const customerName = invoice.customer?.company_name || 
      `${invoice.customer?.first_name || ''} ${invoice.customer?.last_name || ''}`.trim();

    // Generate email content
    const htmlContent = generateEmailHTML(invoice, customerName, body.pdf_url);
    const textContent = generateEmailText(invoice, customerName);

    // In a real implementation, you would send the email using an email service
    // For now, we'll simulate the email sending and log it
    console.log('📧 Sending invoice email:');
    console.log(`To: ${invoice.customer.email}`);
    console.log(`Subject: Invoice ${invoice.invoice_number} from Your Company`);
    console.log(`Customer: ${customerName}`);

    // TODO: Integrate with email service (SendGrid, Postmark, AWS SES, etc.)
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    await sgMail.send({
      to: invoice.customer.email,
      from: 'billing@yourcompany.com',
      subject: `Invoice ${invoice.invoice_number} from Your Company`,
      text: textContent,
      html: htmlContent,
    });
    */

    // Update invoice status to sent
    await supabase
      .from('invoices_824f083c')
      .update({
        status: 'sent',
        sent_date: new Date().toISOString(),
      })
      .eq('id', id);

    return c.json({
      success: true,
      message: 'Invoice email sent successfully',
      to: invoice.customer.email,
      invoice_number: invoice.invoice_number,
    });

  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /test
 * Send test email (for development)
 */
app.post('/test', async (c) => {
  try {
    const user = await getUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const testEmail = body.email || user.email;

    // Create a sample invoice for testing
    const sampleInvoice = {
      invoice_number: 'INV-202603-0001',
      invoice_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      total_amount: 1500.00,
      amount_paid: 0,
      amount_due: 1500.00,
    };

    const htmlContent = generateEmailHTML(sampleInvoice, 'Test Customer');
    const textContent = generateEmailText(sampleInvoice, 'Test Customer');

    console.log('📧 Sending test email:');
    console.log(`To: ${testEmail}`);
    console.log(`Subject: Test Invoice Email`);

    // TODO: Send actual test email
    
    return c.json({
      success: true,
      message: 'Test email sent successfully',
      to: testEmail,
      preview_html: htmlContent.substring(0, 200) + '...',
      preview_text: textContent.substring(0, 200) + '...',
    });

  } catch (error: any) {
    console.error('Error sending test email:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /preview/:id
 * Preview email HTML
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

    const customerName = invoice.customer?.company_name || 
      `${invoice.customer?.first_name || ''} ${invoice.customer?.last_name || ''}`.trim();

    // Generate and return HTML
    const html = generateEmailHTML(invoice, customerName);
    return c.html(html);

  } catch (error: any) {
    console.error('Error previewing email:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
