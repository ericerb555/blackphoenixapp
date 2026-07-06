import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { InvoicePDFData } from './pdfService';
import { companyInfo } from '../config/companyInfo';

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  attachmentBase64?: string;
  attachmentName?: string;
}

export class EmailService {
  /**
   * Send an invoice email
   */
  static async sendInvoiceEmail(
    recipientEmail: string,
    invoiceData: InvoicePDFData,
    pdfBase64?: string,
    customMessage?: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const subject = `Invoice ${invoiceData.invoiceNumber} from ${companyInfo.name}`;
      const body = this.generateInvoiceEmailBody(invoiceData, customMessage);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/send-invoice-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            to: recipientEmail,
            subject,
            body,
            attachmentBase64: pdfBase64,
            attachmentName: `Invoice_${invoiceData.invoiceNumber}.pdf`,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message || 'Email sent successfully',
      };
    } catch (error: any) {
      console.error('Error sending invoice email:', error);
      return {
        success: false,
        message: 'Failed to send email',
        error: error.message,
      };
    }
  }

  /**
   * Generate HTML email body for invoice
   */
  private static generateInvoiceEmailBody(
    invoiceData: InvoicePDFData,
    customMessage?: string
  ): string {
    const primaryColor = companyInfo.branding.primaryColor;
    const accentColor = companyInfo.branding.accentColor;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceData.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">${companyInfo.name}</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">${companyInfo.tagline}</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px;">Invoice #${invoiceData.invoiceNumber}</h2>
              
              <p style="margin: 0 0 10px; color: #666666; font-size: 16px; line-height: 1.6;">
                Dear ${invoiceData.customer.name},
              </p>

              ${customMessage 
                ? `<p style="margin: 20px 0; color: #1a1a1a; font-size: 16px; line-height: 1.6; padding: 20px; background-color: #f9f9f9; border-left: 4px solid ${primaryColor}; border-radius: 4px;">${customMessage}</p>`
                : `<p style="margin: 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">Thank you for your business! Please find your invoice attached to this email.</p>`
              }

              <!-- Invoice Summary -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td style="padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px;">Invoice Date:</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right; font-weight: bold;">${invoiceData.date}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px;">Due Date:</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right; font-weight: bold;">${invoiceData.dueDate}</td>
                      </tr>
                      ${invoiceData.project ? `
                      <tr>
                        <td style="padding: 8px 0; color: #666666; font-size: 14px;">Project:</td>
                        <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; text-align: right; font-weight: bold;">${invoiceData.project.name}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td colspan="2" style="padding: 15px 0 0; border-top: 2px solid ${primaryColor};"></td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 0 0; color: #1a1a1a; font-size: 18px; font-weight: bold;">Total Amount:</td>
                        <td style="padding: 15px 0 0; color: ${primaryColor}; font-size: 24px; text-align: right; font-weight: bold;">$${invoiceData.total.toFixed(2)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                Please review the attached PDF for complete invoice details including itemized charges.
              </p>

              ${companyInfo.banking ? `
              <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
                <p style="margin: 0 0 10px; color: #0c4a6e; font-size: 14px; font-weight: bold;">Payment Information:</p>
                <p style="margin: 5px 0; color: #0c4a6e; font-size: 13px;">Bank: ${companyInfo.banking.bankName}</p>
                <p style="margin: 5px 0; color: #0c4a6e; font-size: 13px;">Account: ${companyInfo.banking.accountNumber}</p>
                <p style="margin: 5px 0; color: #0c4a6e; font-size: 13px;">Routing: ${companyInfo.banking.routingNumber}</p>
              </div>
              ` : ''}

              <p style="margin: 30px 0 10px; color: #666666; font-size: 14px; line-height: 1.6;">
                If you have any questions about this invoice, please don't hesitate to contact us.
              </p>

              <p style="margin: 20px 0 0; color: #1a1a1a; font-size: 14px;">
                Best regards,<br>
                <strong>${companyInfo.name}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9f9f9; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0 0 10px; color: #1a1a1a; font-size: 14px; font-weight: bold;">${companyInfo.name}</p>
              <p style="margin: 5px 0; color: #666666; font-size: 13px;">${companyInfo.address.line1}${companyInfo.address.line2 ? `, ${companyInfo.address.line2}` : ''}</p>
              <p style="margin: 5px 0; color: #666666; font-size: 13px;">${companyInfo.address.city}, ${companyInfo.address.state} ${companyInfo.address.zipCode}</p>
              <p style="margin: 15px 0 5px; color: #666666; font-size: 13px;">
                <a href="mailto:${companyInfo.contact.email}" style="color: ${primaryColor}; text-decoration: none;">${companyInfo.contact.email}</a>
              </p>
              <p style="margin: 5px 0; color: #666666; font-size: 13px;">
                <a href="http://${companyInfo.contact.website}" style="color: ${primaryColor}; text-decoration: none;">${companyInfo.contact.website}</a>
              </p>
              <p style="margin: 5px 0; color: #666666; font-size: 13px;">${companyInfo.contact.phone}</p>
            </td>
          </tr>

        </table>

        <!-- Legal Footer -->
        <table role="presentation" style="max-width: 600px; margin: 20px auto 0;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 11px; line-height: 1.6;">
                This is an automated message. Please do not reply directly to this email.
              </p>
              <p style="margin: 10px 0 0; color: #999999; font-size: 11px; line-height: 1.6;">
                ${companyInfo.legalName} | ${companyInfo.tax.taxLabel}: ${companyInfo.tax.taxId}
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Get email history
   */
  static async getEmailHistory(): Promise<any[]> {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/emails`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch email history');
      }

      const emails = await response.json();
      return emails;
    } catch (error) {
      console.error('Error fetching email history:', error);
      return [];
    }
  }
}
