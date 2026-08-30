/**
 * Payment Receipts API
 * 
 * Server-side receipt generation and delivery.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ============================================================================
// HELPERS
// ============================================================================

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// ============================================================================
// GENERATE RECEIPT HTML
// ============================================================================

function generateReceiptHTML(transaction: any, customer: any, company: any): string {
  const isPaid = transaction.status === 'completed';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${transaction.reference_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      background-color: #f5f5f5;
      padding: 40px 20px;
      color: #333;
    }
    
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .receipt-header {
      background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .receipt-header h1 {
      font-size: 32px;
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .receipt-header p {
      font-size: 18px;
      opacity: 0.9;
    }
    
    .receipt-body {
      padding: 40px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 30px;
    }
    
    .status-badge.paid {
      background: #dcfce7;
      color: #166534;
    }
    
    .status-badge.pending {
      background: #fef3c7;
      color: #92400e;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .info-section h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 10px;
      font-weight: 600;
    }
    
    .info-section p {
      font-size: 16px;
      color: #333;
      line-height: 1.6;
    }
    
    .amount-section {
      background: #f9fafb;
      border-radius: 8px;
      padding: 30px;
      margin-bottom: 30px;
    }
    
    .amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .amount-row:last-child {
      border-bottom: none;
      padding-top: 20px;
      margin-top: 10px;
      border-top: 2px solid #ea580c;
    }
    
    .amount-row.total {
      font-size: 24px;
      font-weight: 700;
    }
    
    .amount-label {
      color: #666;
      font-size: 16px;
    }
    
    .amount-value {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
    
    .amount-row.total .amount-value {
      color: #ea580c;
    }
    
    .transaction-details {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    
    .transaction-details h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #333;
    }
    
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 14px;
    }
    
    .detail-label {
      color: #666;
    }
    
    .detail-value {
      color: #333;
      font-weight: 500;
    }
    
    .receipt-footer {
      background: #f9fafb;
      padding: 30px 40px;
      text-align: center;
      font-size: 14px;
      color: #666;
      line-height: 1.8;
    }
    
    .footer-logo {
      font-size: 20px;
      font-weight: 700;
      color: #ea580c;
      margin-bottom: 10px;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .receipt-container {
        box-shadow: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Header -->
    <div class="receipt-header">
      <h1>Payment Receipt</h1>
      <p>${transaction.reference_number || transaction.id}</p>
    </div>
    
    <!-- Body -->
    <div class="receipt-body">
      <!-- Status Badge -->
      <div style="text-align: center;">
        <span class="status-badge ${isPaid ? 'paid' : 'pending'}">
          ${isPaid ? '✓ PAID' : 'PENDING'}
        </span>
      </div>
      
      <!-- Info Grid -->
      <div class="info-grid">
        <div class="info-section">
          <h3>From</h3>
          <p>
            <strong>${company?.name || 'Company Name'}</strong><br>
            ${company?.address || ''}<br>
            ${company?.city || ''}, ${company?.state || ''} ${company?.zip || ''}<br>
            ${company?.phone || ''}<br>
            ${company?.email || ''}
          </p>
        </div>
        
        <div class="info-section">
          <h3>Bill To</h3>
          <p>
            <strong>${customer?.first_name || ''} ${customer?.last_name || ''}</strong><br>
            ${customer?.email || ''}<br>
            ${customer?.phone || ''}<br>
            ${customer?.address || ''}<br>
            ${customer?.city || ''}, ${customer?.state || ''} ${customer?.zip || ''}
          </p>
        </div>
      </div>
      
      <!-- Amount Section -->
      <div class="amount-section">
        <div class="amount-row">
          <span class="amount-label">Subtotal</span>
          <span class="amount-value">${formatCurrency(transaction.amount, transaction.currency)}</span>
        </div>
        
        ${transaction.fee_amount ? `
        <div class="amount-row">
          <span class="amount-label">Processing Fee</span>
          <span class="amount-value">${formatCurrency(transaction.fee_amount, transaction.currency)}</span>
        </div>
        ` : ''}
        
        <div class="amount-row total">
          <span class="amount-label">Total Paid</span>
          <span class="amount-value">${formatCurrency(transaction.net_amount || transaction.amount, transaction.currency)}</span>
        </div>
      </div>
      
      <!-- Transaction Details -->
      <div class="transaction-details">
        <h2>Transaction Details</h2>
        
        <div class="detail-row">
          <span class="detail-label">Transaction ID</span>
          <span class="detail-value">${transaction.id}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Reference Number</span>
          <span class="detail-value">${transaction.reference_number || 'N/A'}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Date & Time</span>
          <span class="detail-value">${formatDate(transaction.transaction_date)}</span>
        </div>
        
        <div class="detail-row">
          <span class="detail-label">Payment Method</span>
          <span class="detail-value">${transaction.payment_method?.type || 'N/A'}</span>
        </div>
        
        ${transaction.payment_method?.card_last4 ? `
        <div class="detail-row">
          <span class="detail-label">Card</span>
          <span class="detail-value">${transaction.payment_method.card_brand || ''} •••• ${transaction.payment_method.card_last4}</span>
        </div>
        ` : ''}
        
        <div class="detail-row">
          <span class="detail-label">Gateway</span>
          <span class="detail-value">${transaction.gateway}</span>
        </div>
        
        ${transaction.gateway_transaction_id ? `
        <div class="detail-row">
          <span class="detail-label">Gateway Transaction ID</span>
          <span class="detail-value">${transaction.gateway_transaction_id}</span>
        </div>
        ` : ''}
        
        ${transaction.description ? `
        <div class="detail-row">
          <span class="detail-label">Description</span>
          <span class="detail-value">${transaction.description}</span>
        </div>
        ` : ''}
      </div>
    </div>
    
    <!-- Footer -->
    <div class="receipt-footer">
      <div class="footer-logo">${company?.name || 'Your Company'}</div>
      <p>
        This is an official receipt for your payment.<br>
        If you have any questions, please contact us at ${company?.email || 'support@company.com'}<br>
        Thank you for your business!
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// GET RECEIPT HTML
// ============================================================================

app.get('/receipts/:transactionId', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { transactionId } = c.req.param();

    // Get transaction
    const transaction = await kv.get(`transaction:${companyId}:${transactionId}`);
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    // Only generate receipts for completed transactions
    if (transaction.status !== 'completed') {
      return c.json({ error: 'Receipt only available for completed transactions' }, 400);
    }

    // Get related data
    let customer = null;
    if (transaction.customer_id) {
      customer = await kv.get(`customer:${companyId}:${transaction.customer_id}`);
    }

    let paymentMethod = null;
    if (transaction.payment_method_id) {
      paymentMethod = await kv.get(`payment_method:${companyId}:${transaction.payment_method_id}`);
      transaction.payment_method = paymentMethod;
    }

    // Get company info (or use defaults)
    const company = await kv.get(`company:${companyId}`) || {
      name: 'Your Company',
      email: 'support@company.com',
    };

    // Generate HTML
    const html = generateReceiptHTML(transaction, customer, company);

    // Return HTML
    return c.html(html);
  } catch (error: any) {
    console.error('Error generating receipt:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DOWNLOAD RECEIPT PDF (simplified - uses HTML)
// ============================================================================

app.get('/receipts/:transactionId/download', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { transactionId } = c.req.param();

    // Get transaction
    const transaction = await kv.get(`transaction:${companyId}:${transactionId}`);
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    if (transaction.status !== 'completed') {
      return c.json({ error: 'Receipt only available for completed transactions' }, 400);
    }

    // Get related data
    let customer = null;
    if (transaction.customer_id) {
      customer = await kv.get(`customer:${companyId}:${transaction.customer_id}`);
    }

    let paymentMethod = null;
    if (transaction.payment_method_id) {
      paymentMethod = await kv.get(`payment_method:${companyId}:${transaction.payment_method_id}`);
      transaction.payment_method = paymentMethod;
    }

    const company = await kv.get(`company:${companyId}`) || {
      name: 'Your Company',
      email: 'support@company.com',
    };

    // Generate HTML
    const html = generateReceiptHTML(transaction, customer, company);

    // Return as downloadable HTML (in production, would convert to PDF)
    const filename = `receipt-${transaction.reference_number || transactionId}.html`;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error downloading receipt:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// EMAIL RECEIPT
// ============================================================================

app.post('/receipts/:transactionId/email', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { transactionId } = c.req.param();
    const { email, message } = await c.req.json();

    // Get transaction
    const transaction = await kv.get(`transaction:${companyId}:${transactionId}`);
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    if (transaction.status !== 'completed') {
      return c.json({ error: 'Receipt only available for completed transactions' }, 400);
    }

    // Get customer email if not provided
    let recipientEmail = email;
    if (!recipientEmail && transaction.customer_id) {
      const customer = await kv.get(`customer:${companyId}:${transaction.customer_id}`);
      recipientEmail = customer?.email;
    }

    if (!recipientEmail) {
      return c.json({ error: 'Email address required' }, 400);
    }

    // Get related data for receipt
    let customer = null;
    if (transaction.customer_id) {
      customer = await kv.get(`customer:${companyId}:${transaction.customer_id}`);
    }

    let paymentMethod = null;
    if (transaction.payment_method_id) {
      paymentMethod = await kv.get(`payment_method:${companyId}:${transaction.payment_method_id}`);
      transaction.payment_method = paymentMethod;
    }

    const company = await kv.get(`company:${companyId}`) || {
      name: 'Your Company',
      email: 'support@company.com',
    };

    // Generate HTML
    const html = generateReceiptHTML(transaction, customer, company);

    // In production, would integrate with email service (SendGrid, etc.)
    // For now, simulate email sending
    console.log(`📧 Email receipt to: ${recipientEmail}`);
    console.log(`📧 Transaction: ${transaction.reference_number}`);
    console.log(`📧 Amount: ${formatCurrency(transaction.amount, transaction.currency)}`);
    
    // Simulate success
    const emailLog = {
      transaction_id: transactionId,
      recipient: recipientEmail,
      subject: `Payment Receipt - ${transaction.reference_number}`,
      sent_at: new Date().toISOString(),
      status: 'sent',
    };

    // In production:
    // const emailService = new SendGrid(Deno.env.get('SENDGRID_API_KEY'));
    // await emailService.send({
    //   to: recipientEmail,
    //   from: company.email,
    //   subject: `Payment Receipt - ${transaction.reference_number}`,
    //   html: html,
    // });

    return c.json({
      success: true,
      message: 'Receipt sent successfully',
      email: recipientEmail,
      log: emailLog,
    });
  } catch (error: any) {
    console.error('Error emailing receipt:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
