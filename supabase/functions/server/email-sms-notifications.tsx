/**
 * Email & SMS Notifications Router
 * 
 * Sends email and SMS alerts to admins when work requests are submitted
 * Supports multiple notification providers:
 * - Email: Resend, SendGrid, or SMTP
 * - SMS: Twilio
 */

import { Hono } from "npm:hono";

const router = new Hono();

// Admin notification settings (from KV store or environment)
interface AdminSettings {
  emails: string[];
  phones: string[];
  emailEnabled: boolean;
  smsEnabled: boolean;
  emailProvider: 'resend' | 'sendgrid' | 'smtp';
  companyName: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Send Email using Resend (recommended - easiest setup)
 */
async function sendEmailViaResend(
  to: string[],
  subject: string,
  html: string,
  fromEmail: string,
  fromName: string
) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: to,
      subject: subject,
      html: html
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Resend API error:', error);
    throw new Error(`Resend API failed: ${error}`);
  }

  return await response.json();
}

/**
 * Send Email using SendGrid
 */
async function sendEmailViaSendGrid(
  to: string[],
  subject: string,
  html: string,
  fromEmail: string,
  fromName: string
) {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
  
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SENDGRID_API_KEY}`
    },
    body: JSON.stringify({
      personalizations: [{
        to: to.map(email => ({ email }))
      }],
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: subject,
      content: [{
        type: 'text/html',
        value: html
      }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ SendGrid API error:', error);
    throw new Error(`SendGrid API failed: ${error}`);
  }

  return { success: true };
}

/**
 * Send SMS using Twilio
 */
async function sendSMSViaTwilio(
  to: string,
  message: string
) {
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
  const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials not configured');
  }

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Body: message
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Twilio API error:', error);
    throw new Error(`Twilio API failed: ${error}`);
  }

  return await response.json();
}

/**
 * Generate professional HTML email template for work request notification
 */
function generateWorkRequestEmailHTML(data: {
  workRequestId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceType: string;
  budgetRange: string;
  hasAIFloorPlan: boolean;
  estimatedCost?: string;
  dimensions?: string;
  companyName: string;
  dashboardUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Work Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0A0A0A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
          
          <!-- Header with Orange Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #ea580c 0%, #fb923c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                🔔 New Work Request
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                A customer has submitted a new project request
              </p>
            </td>
          </tr>

          <!-- Alert Badge -->
          <tr>
            <td style="padding: 30px 30px 0 30px;">
              <div style="background: rgba(234, 88, 12, 0.2); border: 2px solid #ea580c; border-radius: 12px; padding: 16px; text-align: center;">
                <span style="color: #fb923c; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  ⚡ HIGH PRIORITY - ACTION REQUIRED
                </span>
              </div>
            </td>
          </tr>

          <!-- Work Request Details -->
          <tr>
            <td style="padding: 30px;">
              
              <!-- Client Information -->
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 20px 0; color: #ea580c; font-size: 20px; font-weight: bold;">
                  👤 Client Information
                </h2>
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px; width: 120px;">Name:</td>
                    <td style="color: #ffffff; font-size: 15px; font-weight: 600;">${data.clientName}</td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Email:</td>
                    <td style="color: #60A5FA; font-size: 14px;">
                      <a href="mailto:${data.clientEmail}" style="color: #60A5FA; text-decoration: none;">${data.clientEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Phone:</td>
                    <td style="color: #60A5FA; font-size: 14px;">
                      <a href="tel:${data.clientPhone}" style="color: #60A5FA; text-decoration: none;">${data.clientPhone}</a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Project Details -->
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 20px 0; color: #ea580c; font-size: 20px; font-weight: bold;">
                  📋 Project Details
                </h2>
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px; width: 120px;">Request ID:</td>
                    <td style="color: #ffffff; font-size: 14px; font-family: monospace;">${data.workRequestId}</td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Service Type:</td>
                    <td style="color: #ffffff; font-size: 15px; font-weight: 600;">${data.serviceType}</td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Budget Range:</td>
                    <td style="color: #10B981; font-size: 16px; font-weight: bold;">${data.budgetRange}</td>
                  </tr>
                  ${data.estimatedCost ? `
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">AI Estimate:</td>
                    <td style="color: #fb923c; font-size: 15px; font-weight: 600;">${data.estimatedCost}</td>
                  </tr>
                  ` : ''}
                  ${data.dimensions ? `
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Dimensions:</td>
                    <td style="color: #ffffff; font-size: 14px;">${data.dimensions}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              ${data.hasAIFloorPlan ? `
              <!-- AI Analysis Complete -->
              <div style="background: linear-gradient(135deg, rgba(234, 88, 12, 0.2) 0%, rgba(251, 146, 60, 0.2) 100%); border: 2px solid #ea580c; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <div style="text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 10px;">🤖</div>
                  <h3 style="margin: 0 0 10px 0; color: #fb923c; font-size: 18px; font-weight: bold;">
                    AI Analysis Complete
                  </h3>
                  <p style="margin: 0; color: #D1D5DB; font-size: 14px;">
                    Floor plan generated from video analysis<br>
                    Ready for quote generation in Design Studio Pro
                  </p>
                </div>
              </div>
              ` : ''}

              <!-- Action Button -->
              <div style="text-align: center; margin-top: 30px;">
                <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #fb923c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.4);">
                  🚀 Review & Create Quote
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: rgba(0,0,0,0.3); padding: 24px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0 0 8px 0; color: #9CA3AF; font-size: 14px;">
                ${data.companyName} - Enterprise Business Management System
              </p>
              <p style="margin: 0; color: #6B7280; font-size: 12px;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate SMS message for work request notification
 */
function generateWorkRequestSMS(data: {
  clientName: string;
  serviceType: string;
  budgetRange: string;
  workRequestId: string;
}): string {
  return `🔔 NEW WORK REQUEST

👤 ${data.clientName}
📋 ${data.serviceType}
💰 ${data.budgetRange}

ID: ${data.workRequestId}

Review now in admin dashboard.`;
}

/**
 * Generate HTML email template for customer signup notification
 */
function generateCustomerSignupEmailHTML(data: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  signupDate: string;
  companyName: string;
  dashboardUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Customer Signup</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0A0A0A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                👤 New Customer Signup
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                A new customer has created an account
              </p>
            </td>
          </tr>

          <!-- Customer Details -->
          <tr>
            <td style="padding: 30px;">
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 20px 0; color: #10b981; font-size: 20px; font-weight: bold;">
                  Customer Information
                </h2>
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px; width: 120px;">Name:</td>
                    <td style="color: #ffffff; font-size: 15px; font-weight: 600;">${data.customerName}</td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Email:</td>
                    <td style="color: #60A5FA; font-size: 14px;">
                      <a href="mailto:${data.customerEmail}" style="color: #60A5FA; text-decoration: none;">${data.customerEmail}</a>
                    </td>
                  </tr>
                  ${data.customerPhone ? `
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Phone:</td>
                    <td style="color: #60A5FA; font-size: 14px;">
                      <a href="tel:${data.customerPhone}" style="color: #60A5FA; text-decoration: none;">${data.customerPhone}</a>
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Signup Date:</td>
                    <td style="color: #ffffff; font-size: 14px;">${data.signupDate}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #fb923c 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">
                ${data.companyName} - Customer Management System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate HTML email template for subscription added notification
 */
function generateSubscriptionEmailHTML(data: {
  customerName: string;
  customerEmail: string;
  planName: string;
  planPrice: string;
  billingCycle: string;
  startDate: string;
  companyName: string;
  dashboardUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Subscription</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0A0A0A;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                💳 New Subscription
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                A customer has subscribed to a plan
              </p>
            </td>
          </tr>

          <!-- Subscription Details -->
          <tr>
            <td style="padding: 30px;">
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 20px 0; color: #3b82f6; font-size: 20px; font-weight: bold;">
                  Subscription Details
                </h2>
                <table width="100%" cellpadding="8" cellspacing="0">
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px; width: 140px;">Customer:</td>
                    <td style="color: #ffffff; font-size: 15px; font-weight: 600;">${data.customerName}</td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Email:</td>
                    <td style="color: #60A5FA; font-size: 14px;">
                      <a href="mailto:${data.customerEmail}" style="color: #60A5FA; text-decoration: none;">${data.customerEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Plan:</td>
                    <td style="color: #10b981; font-size: 16px; font-weight: 600;">${data.planName}</td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Price:</td>
                    <td style="color: #ffffff; font-size: 15px; font-weight: 600;">${data.planPrice}</td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Billing Cycle:</td>
                    <td style="color: #ffffff; font-size: 14px;">${data.billingCycle}</td>
                  </tr>
                  <tr>
                    <td style="color: #9CA3AF; font-size: 14px;">Start Date:</td>
                    <td style="color: #ffffff; font-size: 14px;">${data.startDate}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${data.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #fb923c 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">
                ${data.companyName} - Subscription Management System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * POST /make-server-3eae23a6/notifications/work-request
 * Send email and SMS notifications for new work requests
 */
router.post('/make-server-3eae23a6/notifications/work-request', async (c) => {
  try {
    const body = await c.req.json();
    const {
      workRequestId,
      clientName,
      clientEmail,
      clientPhone,
      serviceType,
      budgetRange,
      hasAIFloorPlan,
      estimatedCost,
      dimensions
    } = body;

    console.log('📧 Processing work request notifications:', workRequestId);

    // Get admin settings from environment or use defaults
    const adminEmails = Deno.env.get('ADMIN_NOTIFICATION_EMAILS')?.split(',') || [];
    const adminPhones = Deno.env.get('ADMIN_NOTIFICATION_PHONES')?.split(',') || [];
    const companyName = Deno.env.get('COMPANY_NAME') || 'Your Company';
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'notifications@yourdomain.com';
    const fromName = Deno.env.get('NOTIFICATION_FROM_NAME') || companyName;
    const dashboardUrl = Deno.env.get('ADMIN_DASHBOARD_URL') || 'https://yourdomain.com/admin-alerts';

    const results = {
      emailSent: false,
      smsSent: false,
      emailRecipients: [],
      smsRecipients: [],
      errors: []
    };

    // Send Email Notifications
    if (adminEmails.length > 0) {
      try {
        const emailHTML = generateWorkRequestEmailHTML({
          workRequestId,
          clientName,
          clientEmail,
          clientPhone,
          serviceType,
          budgetRange,
          hasAIFloorPlan,
          estimatedCost,
          dimensions,
          companyName,
          dashboardUrl
        });

        const subject = `🔔 New ${serviceType} Request - ${clientName}`;

        // Try Resend first (easiest to set up)
        if (Deno.env.get('RESEND_API_KEY')) {
          console.log('📧 Sending email via Resend to:', adminEmails);
          await sendEmailViaResend(adminEmails, subject, emailHTML, fromEmail, fromName);
          results.emailSent = true;
          results.emailRecipients = adminEmails;
          console.log('✅ Email sent successfully via Resend');
        }
        // Fallback to SendGrid
        else if (Deno.env.get('SENDGRID_API_KEY')) {
          console.log('📧 Sending email via SendGrid to:', adminEmails);
          await sendEmailViaSendGrid(adminEmails, subject, emailHTML, fromEmail, fromName);
          results.emailSent = true;
          results.emailRecipients = adminEmails;
          console.log('✅ Email sent successfully via SendGrid');
        }
        else {
          console.warn('⚠️ No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY)');
          results.errors.push('Email provider not configured');
        }
      } catch (emailError: any) {
        console.error('❌ Email notification failed:', emailError);
        results.errors.push(`Email: ${emailError.message}`);
      }
    } else {
      console.warn('⚠️ No admin emails configured (ADMIN_NOTIFICATION_EMAILS)');
    }

    // Send SMS Notifications
    if (adminPhones.length > 0 && Deno.env.get('TWILIO_ACCOUNT_SID')) {
      const smsMessage = generateWorkRequestSMS({
        clientName,
        serviceType,
        budgetRange,
        workRequestId
      });

      for (const phone of adminPhones) {
        try {
          console.log('📱 Sending SMS to:', phone);
          await sendSMSViaTwilio(phone, smsMessage);
          results.smsRecipients.push(phone);
          console.log('✅ SMS sent successfully to', phone);
        } catch (smsError: any) {
          console.error(`❌ SMS failed for ${phone}:`, smsError);
          results.errors.push(`SMS to ${phone}: ${smsError.message}`);
        }
      }
      results.smsSent = results.smsRecipients.length > 0;
    } else {
      if (adminPhones.length === 0) {
        console.warn('⚠️ No admin phones configured (ADMIN_NOTIFICATION_PHONES)');
      } else {
        console.warn('⚠️ Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
      }
    }

    return c.json({
      success: true,
      workRequestId,
      results
    });

  } catch (error: any) {
    console.error('❌ Work request notification error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * POST /make-server-3eae23a6/notifications/test-email
 * Test email configuration
 */
router.post('/make-server-3eae23a6/notifications/test-email', async (c) => {
  try {
    const { email } = await c.req.json();
    
    const testEmail = email || Deno.env.get('ADMIN_NOTIFICATION_EMAILS')?.split(',')[0];
    
    if (!testEmail) {
      return c.json({
        success: false,
        error: 'No test email provided'
      }, 400);
    }

    const subject = '✅ Email Notification Test - Configuration Successful';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
        <div style="background: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ea580c;">✅ Email Configuration Successful!</h1>
          <p>Your email notification system is properly configured and working.</p>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>Timestamp: ${new Date().toISOString()}</li>
            <li>Recipient: ${testEmail}</li>
            <li>Provider: ${Deno.env.get('RESEND_API_KEY') ? 'Resend' : Deno.env.get('SENDGRID_API_KEY') ? 'SendGrid' : 'Unknown'}</li>
          </ul>
        </div>
      </div>
    `;

    if (Deno.env.get('RESEND_API_KEY')) {
      await sendEmailViaResend([testEmail], subject, html, 'test@notifications.com', 'Test Notification');
    } else if (Deno.env.get('SENDGRID_API_KEY')) {
      await sendEmailViaSendGrid([testEmail], subject, html, 'test@notifications.com', 'Test Notification');
    } else {
      return c.json({
        success: false,
        error: 'No email provider configured'
      }, 400);
    }

    return c.json({
      success: true,
      message: 'Test email sent successfully',
      recipient: testEmail
    });

  } catch (error: any) {
    console.error('❌ Test email failed:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * POST /make-server-3eae23a6/notifications/test-sms
 * Test SMS configuration
 */
router.post('/make-server-3eae23a6/notifications/test-sms', async (c) => {
  try {
    const { phone } = await c.req.json();
    
    const testPhone = phone || Deno.env.get('ADMIN_NOTIFICATION_PHONES')?.split(',')[0];
    
    if (!testPhone) {
      return c.json({
        success: false,
        error: 'No test phone number provided'
      }, 400);
    }

    const message = `✅ SMS Test - Your Twilio configuration is working! Timestamp: ${new Date().toLocaleString()}`;

    await sendSMSViaTwilio(testPhone, message);

    return c.json({
      success: true,
      message: 'Test SMS sent successfully',
      recipient: testPhone
    });

  } catch (error: any) {
    console.error('❌ Test SMS failed:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * POST /make-server-3eae23a6/notifications/customer-signup
 * Send notifications when a new customer signs up
 */
router.post('/make-server-3eae23a6/notifications/customer-signup', async (c) => {
  try {
    const body = await c.req.json();
    const {
      customerName,
      customerEmail,
      customerPhone
    } = body;

    console.log('📧 Processing customer signup notifications:', customerEmail);

    // Get admin settings from environment
    const adminEmails = Deno.env.get('ADMIN_NOTIFICATION_EMAILS')?.split(',') || [];
    const adminPhones = Deno.env.get('ADMIN_NOTIFICATION_PHONES')?.split(',') || [];
    const companyName = Deno.env.get('COMPANY_NAME') || 'Your Company';
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'notifications@yourdomain.com';
    const fromName = Deno.env.get('NOTIFICATION_FROM_NAME') || companyName;
    const dashboardUrl = Deno.env.get('ADMIN_DASHBOARD_URL') || 'https://yourdomain.com/admin-alerts';

    const results = {
      emailSent: false,
      smsSent: false,
      emailRecipients: [],
      smsRecipients: [],
      errors: []
    };

    // Send Email Notifications
    if (adminEmails.length > 0) {
      try {
        const emailHTML = generateCustomerSignupEmailHTML({
          customerName,
          customerEmail,
          customerPhone,
          signupDate: new Date().toLocaleDateString(),
          companyName,
          dashboardUrl
        });

        const subject = `👤 New Customer Signup - ${customerName}`;

        if (Deno.env.get('RESEND_API_KEY')) {
          console.log('📧 Sending signup email via Resend to:', adminEmails);
          await sendEmailViaResend(adminEmails, subject, emailHTML, fromEmail, fromName);
          results.emailSent = true;
          results.emailRecipients = adminEmails;
          console.log('✅ Signup email sent successfully via Resend');
        } else if (Deno.env.get('SENDGRID_API_KEY')) {
          console.log('📧 Sending signup email via SendGrid to:', adminEmails);
          await sendEmailViaSendGrid(adminEmails, subject, emailHTML, fromEmail, fromName);
          results.emailSent = true;
          results.emailRecipients = adminEmails;
          console.log('✅ Signup email sent successfully via SendGrid');
        } else {
          console.warn('⚠️ No email provider configured');
          results.errors.push('Email provider not configured');
        }
      } catch (emailError: any) {
        console.error('❌ Signup email notification failed:', emailError);
        results.errors.push(`Email: ${emailError.message}`);
      }
    }

    // Send SMS Notifications
    if (adminPhones.length > 0 && Deno.env.get('TWILIO_ACCOUNT_SID')) {
      const smsMessage = `👤 NEW CUSTOMER SIGNUP\n\n${customerName}\n${customerEmail}\n\nView dashboard for details.`;

      for (const phone of adminPhones) {
        try {
          console.log('📱 Sending signup SMS to:', phone);
          await sendSMSViaTwilio(phone, smsMessage);
          results.smsRecipients.push(phone);
          console.log('✅ Signup SMS sent successfully to', phone);
        } catch (smsError: any) {
          console.error(`❌ Signup SMS failed for ${phone}:`, smsError);
          results.errors.push(`SMS to ${phone}: ${smsError.message}`);
        }
      }
      results.smsSent = results.smsRecipients.length > 0;
    }

    return c.json({
      success: true,
      customerEmail,
      results
    });

  } catch (error: any) {
    console.error('❌ Customer signup notification error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

/**
 * POST /make-server-3eae23a6/notifications/subscription-added
 * Send notifications when a new subscription is created
 */
router.post('/make-server-3eae23a6/notifications/subscription-added', async (c) => {
  try {
    const body = await c.req.json();
    const {
      customerName,
      customerEmail,
      planName,
      planPrice,
      billingCycle
    } = body;

    console.log('📧 Processing subscription notifications:', customerEmail, planName);

    // Get admin settings from environment
    const adminEmails = Deno.env.get('ADMIN_NOTIFICATION_EMAILS')?.split(',') || [];
    const adminPhones = Deno.env.get('ADMIN_NOTIFICATION_PHONES')?.split(',') || [];
    const companyName = Deno.env.get('COMPANY_NAME') || 'Your Company';
    const fromEmail = Deno.env.get('NOTIFICATION_FROM_EMAIL') || 'notifications@yourdomain.com';
    const fromName = Deno.env.get('NOTIFICATION_FROM_NAME') || companyName;
    const dashboardUrl = Deno.env.get('ADMIN_DASHBOARD_URL') || 'https://yourdomain.com/admin-alerts';

    const results = {
      emailSent: false,
      smsSent: false,
      emailRecipients: [],
      smsRecipients: [],
      errors: []
    };

    // Send Email Notifications
    if (adminEmails.length > 0) {
      try {
        const emailHTML = generateSubscriptionEmailHTML({
          customerName,
          customerEmail,
          planName,
          planPrice,
          billingCycle,
          startDate: new Date().toLocaleDateString(),
          companyName,
          dashboardUrl
        });

        const subject = `💳 New Subscription - ${planName} - ${customerName}`;

        if (Deno.env.get('RESEND_API_KEY')) {
          console.log('📧 Sending subscription email via Resend to:', adminEmails);
          await sendEmailViaResend(adminEmails, subject, emailHTML, fromEmail, fromName);
          results.emailSent = true;
          results.emailRecipients = adminEmails;
          console.log('✅ Subscription email sent successfully via Resend');
        } else if (Deno.env.get('SENDGRID_API_KEY')) {
          console.log('📧 Sending subscription email via SendGrid to:', adminEmails);
          await sendEmailViaSendGrid(adminEmails, subject, emailHTML, fromEmail, fromName);
          results.emailSent = true;
          results.emailRecipients = adminEmails;
          console.log('✅ Subscription email sent successfully via SendGrid');
        } else {
          console.warn('⚠️ No email provider configured');
          results.errors.push('Email provider not configured');
        }
      } catch (emailError: any) {
        console.error('❌ Subscription email notification failed:', emailError);
        results.errors.push(`Email: ${emailError.message}`);
      }
    }

    // Send SMS Notifications
    if (adminPhones.length > 0 && Deno.env.get('TWILIO_ACCOUNT_SID')) {
      const smsMessage = `💳 NEW SUBSCRIPTION\n\n${customerName}\n${planName} - ${planPrice}\n${billingCycle}\n\nView dashboard for details.`;

      for (const phone of adminPhones) {
        try {
          console.log('📱 Sending subscription SMS to:', phone);
          await sendSMSViaTwilio(phone, smsMessage);
          results.smsRecipients.push(phone);
          console.log('✅ Subscription SMS sent successfully to', phone);
        } catch (smsError: any) {
          console.error(`❌ Subscription SMS failed for ${phone}:`, smsError);
          results.errors.push(`SMS to ${phone}: ${smsError.message}`);
        }
      }
      results.smsSent = results.smsRecipients.length > 0;
    }

    return c.json({
      success: true,
      customerEmail,
      planName,
      results
    });

  } catch (error: any) {
    console.error('❌ Subscription notification error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export default router;