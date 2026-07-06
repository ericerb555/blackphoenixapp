/**
 * Email Receipt Service
 * 
 * Automatically generates and sends professional email receipts
 * to customers after successful payment
 */

import { toast } from 'sonner@2.0.3';

interface PaymentDetails {
  transaction_id: string;
  invoice_id?: string;
  invoice_number?: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  payment_method: string;
  fee: number;
  net_amount: number;
  timestamp: Date;
  confirmation_number: string;
  blockchain_tx_hash?: string;
}

export class EmailReceiptService {
  /**
   * Send receipt email to customer
   */
  static async sendReceipt(payment: PaymentDetails): Promise<boolean> {
    try {
      // Generate receipt HTML
      const receiptHTML = this.generateReceiptHTML(payment);
      
      // In real implementation, this would use an email service like:
      // - SendGrid
      // - Amazon SES
      // - Mailgun
      // - Postmark
      
      console.log('Sending receipt email to:', payment.customer_email);
      console.log('Receipt HTML:', receiptHTML);
      
      // Simulate email send
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Show success notification
      toast.success(`Receipt sent to ${payment.customer_name}`, {
        description: `Email sent to ${payment.customer_email}`
      });
      
      // Log to admin notifications
      this.notifyAdmins(payment);
      
      return true;
    } catch (error) {
      console.error('Failed to send receipt:', error);
      toast.error('Failed to send receipt', {
        description: 'Please try again or contact support'
      });
      return false;
    }
  }

  /**
   * Generate professional HTML receipt
   */
  private static generateReceiptHTML(payment: PaymentDetails): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${payment.confirmation_number}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 10px;
      margin: 20px 0;
    }
    .receipt-details {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-label {
      color: #666;
      font-weight: 600;
    }
    .detail-value {
      color: #333;
      font-weight: bold;
    }
    .total {
      font-size: 24px;
      color: #ea580c;
      padding: 20px 0;
      text-align: center;
      border-top: 2px solid #ea580c;
    }
    .button {
      display: inline-block;
      background: #ea580c;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      padding: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Payment Confirmed</h1>
    <p>Thank you for your payment!</p>
  </div>

  <div class="content">
    <h2>Hi ${payment.customer_name},</h2>
    <p>Your payment has been successfully processed. Here are the details:</p>

    <div class="receipt-details">
      <div class="detail-row">
        <span class="detail-label">Confirmation Number</span>
        <span class="detail-value">${payment.confirmation_number}</span>
      </div>
      ${payment.invoice_number ? `
      <div class="detail-row">
        <span class="detail-label">Invoice Number</span>
        <span class="detail-value">${payment.invoice_number}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">Payment Date</span>
        <span class="detail-value">${payment.timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Method</span>
        <span class="detail-value">${payment.payment_method}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value">${payment.amount.toLocaleString()} ${payment.currency}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Processing Fee</span>
        <span class="detail-value">${payment.fee.toFixed(2)} ${payment.currency}</span>
      </div>
      ${payment.blockchain_tx_hash ? `
      <div class="detail-row">
        <span class="detail-label">Blockchain Transaction</span>
        <span class="detail-value">${payment.blockchain_tx_hash}</span>
      </div>
      ` : ''}
    </div>

    <div class="total">
      Total Paid: ${payment.amount.toLocaleString()} ${payment.currency}
    </div>

    <center>
      <a href="#" class="button">View Transaction Details</a>
    </center>

    <p style="margin-top: 30px; color: #666; font-size: 14px;">
      If you have any questions about this payment, please contact our support team.
    </p>
  </div>

  <div class="footer">
    <p>This is an automated receipt. Please do not reply to this email.</p>
    <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Notify admins of payment received
   */
  private static async notifyAdmins(payment: PaymentDetails): Promise<void> {
    // In real implementation, this would:
    // 1. Send notification to admin dashboard
    // 2. Send email to finance team
    // 3. Log to payment notification system
    // 4. Update analytics/reporting
    
    console.log('Admin notification: Payment received', {
      amount: payment.amount,
      customer: payment.customer_name,
      invoice: payment.invoice_number
    });

    // Create notification in system
    const notification = {
      type: 'payment_received',
      title: `Payment Received: $${payment.amount.toLocaleString()}`,
      message: `${payment.customer_name} paid ${payment.invoice_number || 'invoice'} via ${payment.payment_method}`,
      timestamp: new Date(),
      priority: payment.amount > 10000 ? 'high' : 'medium'
    };

    // Would send to notification system
    console.log('Created admin notification:', notification);
  }

  /**
   * Generate PDF receipt
   */
  static async generatePDF(payment: PaymentDetails): Promise<Blob> {
    // In real implementation, this would use a PDF generation library like:
    // - jsPDF
    // - PDFKit
    // - Puppeteer (headless browser)
    
    console.log('Generating PDF receipt for:', payment.confirmation_number);
    
    // Placeholder: return empty blob
    return new Blob(['PDF Receipt Placeholder'], { type: 'application/pdf' });
  }

  /**
   * Send payment reminder
   */
  static async sendPaymentReminder(
    customerEmail: string,
    invoiceNumber: string,
    amount: number,
    dueDate: Date
  ): Promise<boolean> {
    try {
      const reminderHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Reminder - ${invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #ea580c;
      color: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
    }
    .button {
      display: inline-block;
      background: #ea580c;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏰ Payment Reminder</h1>
  </div>
  <div style="padding: 30px;">
    <p>This is a friendly reminder that invoice ${invoiceNumber} for $${amount.toLocaleString()} is due on ${dueDate.toLocaleDateString()}.</p>
    <center>
      <a href="/unified-payment-center?invoice=${invoiceNumber}" class="button">Pay Now</a>
    </center>
    <p>Thank you for your prompt attention to this matter.</p>
  </div>
</body>
</html>
      `;

      console.log('Sending payment reminder to:', customerEmail);
      console.log('Reminder HTML:', reminderHTML);

      toast.success('Payment reminder sent', {
        description: `Email sent to ${customerEmail}`
      });

      return true;
    } catch (error) {
      console.error('Failed to send reminder:', error);
      return false;
    }
  }

  /**
   * Send overdue notice
   */
  static async sendOverdueNotice(
    customerEmail: string,
    invoiceNumber: string,
    amount: number,
    daysOverdue: number
  ): Promise<boolean> {
    try {
      toast.warning('Overdue notice sent', {
        description: `${invoiceNumber} is ${daysOverdue} days overdue`
      });

      // Notify admins
      console.log('Admin alert: Invoice overdue', {
        invoice: invoiceNumber,
        days: daysOverdue,
        amount
      });

      return true;
    } catch (error) {
      console.error('Failed to send overdue notice:', error);
      return false;
    }
  }
}

export default EmailReceiptService;
