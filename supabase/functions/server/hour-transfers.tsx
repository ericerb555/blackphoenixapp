/**
 * Hour Transfer System - Customer-to-Customer with Admin Approval
 * Handles transfer requests, approvals, and execution
 */

import { Hono } from 'npm:hono@4.13.19';
import * as kv from './kv_store.tsx';
import { verifiedActor } from './requireStaff.ts';
import { sendTextMessage } from './sendSms.ts';

const app = new Hono();

export interface HourTransferRequest {
  id: string;
  fromSubscriptionId: string;
  fromCustomerName: string;
  fromCustomerPhone?: string;
  toSubscriptionId: string;
  toCustomerName: string;
  hours: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied' | 'completed';
  requestedAt: string;
  requestedBy: string; // customer who initiated
  verifiedAt?: string; // when SMS was verified
  reviewedAt?: string;
  reviewedBy?: string; // admin who approved/denied
  reviewNotes?: string;
  completedAt?: string;
}

interface VerificationCode {
  code: string;
  phone: string;
  fromSubscriptionId: string;
  toSubscriptionId: string;
  hours: number;
  reason: string;
  requestedBy: string;
  fromCustomerName: string;
  toCustomerName: string;
  expiresAt: string;
  createdAt: string;
}

// Generate 6-digit verification code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification code (SMS simulation)
/**
 * STAFF ONLY, AND THE CODE IS NO LONGER HANDED BACK.
 *
 * This route had no authorisation of any kind and returned the verification
 * code in its own response as debugCode, with a comment admitting it:
 * "ONLY FOR TESTING - REMOVE IN PRODUCTION". HourTransferModal then printed
 * it on screen. So the SMS check verified nothing: the server told the caller
 * the secret and the caller typed it back.
 *
 * What that bought anybody is the dangerous part. verify-and-request stamps
 * verifiedAt on the transfer it creates, and an approver reads that as "the
 * customer confirmed this by text". That record could be produced for ANY
 * subscription id, from any signed-in portal account, asserting any
 * requestedBy, without the customer's phone being involved at all. A forged
 * record an approver trusts is worse than a broken button.
 *
 * Three changes, and the middle one is the control:
 *   - staff only; the only caller is SubscriptionHub, a staff page
 *   - the code is SENT, by sendTextMessage, and never returned
 *   - requestedBy comes from the verified token, not the body, so the record
 *     says who actually asked
 *
 * If the text cannot be sent the route REFUSES. Falling back to returning the
 * code would restore exactly the hole this closes, and a transfer nobody can
 * verify is one that should not be raised.
 */
app.post('/send-verification', async (c) => {
  try {
    const who = await verifiedActor(c);
    if (!who?.staff) {
      return c.json({ error: 'Company access is required to raise an hour transfer.' }, 403);
    }

    const body = await c.req.json();
    const { phone, fromSubscriptionId, toSubscriptionId, hours, reason, fromCustomerName, toCustomerName } = body;
    // Never from the body. This is read later as who asked for the transfer.
    const requestedBy = who.email;

    // Validate required fields
    if (!phone || !fromSubscriptionId || !toSubscriptionId || !hours || !reason) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return c.json({ error: 'Invalid phone number format' }, 400);
    }

    // Validate hours is positive
    if (hours <= 0) {
      return c.json({ error: 'Hours must be greater than 0' }, 400);
    }

    // Get source subscription to check available hours
    const fromSub = await kv.get(`subscription:${fromSubscriptionId}`);
    if (!fromSub) {
      return c.json({ error: 'Source subscription not found' }, 404);
    }

    const availableHours = (fromSub.totalHours || 0) - (fromSub.usedHours || 0);
    if (availableHours < hours) {
      return c.json({ 
        error: `Insufficient hours. Available: ${availableHours}, Requested: ${hours}` 
      }, 400);
    }

    // Verify target subscription exists
    const toSub = await kv.get(`subscription:${toSubscriptionId}`);
    if (!toSub) {
      return c.json({ error: 'Target subscription not found' }, 404);
    }

    // Generate verification code
    const code = generateCode();
    const verificationId = `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const verification: VerificationCode = {
      code,
      phone,
      fromSubscriptionId,
      toSubscriptionId,
      hours,
      reason,
      requestedBy,
      fromCustomerName,
      toCustomerName,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      createdAt: new Date().toISOString()
    };

    await kv.set(`verification:${verificationId}`, verification);

    /*
     * Sent, not logged and not returned. The code is the whole control, so it
     * goes to the customer's phone and nowhere else - not into the response,
     * and not into the function logs, which staff can read.
     */
    const sms = await sendTextMessage(
      phone,
      `Black Phoenix: your code to approve transferring ${hours} hours is ${code}. `
      + 'It expires in 10 minutes. If you did not ask for this, ignore it and tell us.',
      'transactional',
    );

    if (!sms.ok) {
      // The verification is void, so it must not sit there waiting to be used.
      await kv.del(`verification:${verificationId}`);
      return c.json({
        error: sms.blocked
          ? `That number cannot be texted: ${sms.error || 'not permitted'}`
          : 'Could not send the verification text, so the transfer was not raised.',
      }, 502);
    }

    console.log(`[hour-transfers] code texted for ${hours}h transfer, raised by ${requestedBy}`);

    return c.json({
      success: true,
      verificationId,
      message: 'Verification code sent to the customer by text.',
    });

  } catch (error) {
    console.error('Error sending verification code:', error);
    return c.json({ error: 'Failed to send verification code', details: error.message }, 500);
  }
});

// Verify code and create transfer request
/**
 * Staff only, for the same reason as the route above: these two halves are one
 * action, and gating the first while leaving the second open would mean a
 * verification raised by staff could be completed by anybody holding the id.
 */
app.post('/verify-and-request', async (c) => {
  try {
    const who = await verifiedActor(c);
    if (!who?.staff) {
      return c.json({ error: 'Company access is required to raise an hour transfer.' }, 403);
    }
    const body = await c.req.json();
    const { verificationId, code } = body;

    if (!verificationId || !code) {
      return c.json({ error: 'Missing verification ID or code' }, 400);
    }

    // Get verification data
    const verification = await kv.get(`verification:${verificationId}`) as VerificationCode;
    if (!verification) {
      return c.json({ error: 'Verification not found or expired' }, 404);
    }

    // Check if expired
    if (new Date(verification.expiresAt) < new Date()) {
      await kv.del(`verification:${verificationId}`);
      return c.json({ error: 'Verification code expired. Please request a new code.' }, 400);
    }

    // Verify code matches
    if (verification.code !== code.toString()) {
      return c.json({ error: 'Invalid verification code' }, 400);
    }

    // Code is valid! Re-verify hours are still available
    const fromSub = await kv.get(`subscription:${verification.fromSubscriptionId}`);
    if (!fromSub) {
      return c.json({ error: 'Source subscription not found' }, 404);
    }

    const availableHours = (fromSub.totalHours || 0) - (fromSub.usedHours || 0);
    if (availableHours < verification.hours) {
      return c.json({ 
        error: `Insufficient hours. Available: ${availableHours}, Requested: ${verification.hours}` 
      }, 400);
    }

    // Create transfer request (now verified)
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transfer: HourTransferRequest = {
      id: transferId,
      fromSubscriptionId: verification.fromSubscriptionId,
      fromCustomerName: verification.fromCustomerName,
      fromCustomerPhone: verification.phone,
      toSubscriptionId: verification.toSubscriptionId,
      toCustomerName: verification.toCustomerName,
      hours: verification.hours,
      reason: verification.reason,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      requestedBy: verification.requestedBy,
      verifiedAt: new Date().toISOString()
    };

    await kv.set(`hour_transfer:${transferId}`, transfer);
    
    // Add to pending transfers list
    const pendingTransfers = await kv.get('hour_transfers:pending') || [];
    pendingTransfers.push(transferId);
    await kv.set('hour_transfers:pending', pendingTransfers);

    // Delete used verification code
    await kv.del(`verification:${verificationId}`);

    console.log(`✅ Hour transfer request created after SMS verification: ${transferId}`);
    return c.json({ success: true, transfer });

  } catch (error) {
    console.error('Error verifying and creating transfer:', error);
    return c.json({ error: 'Failed to verify and create transfer', details: error.message }, 500);
  }
});

// Create a new transfer request (OLD ENDPOINT - DEPRECATED, keeping for backward compatibility)
app.post('/request', async (c) => {
  try {
    const body = await c.req.json();
    const { fromSubscriptionId, fromCustomerName, toSubscriptionId, toCustomerName, hours, reason, requestedBy } = body;

    // Validate required fields
    if (!fromSubscriptionId || !toSubscriptionId || !hours || !reason || !requestedBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Validate hours is positive
    if (hours <= 0) {
      return c.json({ error: 'Hours must be greater than 0' }, 400);
    }

    // Get source subscription to check available hours
    const fromSub = await kv.get(`subscription:${fromSubscriptionId}`);
    if (!fromSub) {
      return c.json({ error: 'Source subscription not found' }, 404);
    }

    const availableHours = (fromSub.totalHours || 0) - (fromSub.usedHours || 0);
    if (availableHours < hours) {
      return c.json({ 
        error: `Insufficient hours. Available: ${availableHours}, Requested: ${hours}` 
      }, 400);
    }

    // Verify target subscription exists
    const toSub = await kv.get(`subscription:${toSubscriptionId}`);
    if (!toSub) {
      return c.json({ error: 'Target subscription not found' }, 404);
    }

    // Create transfer request
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transfer: HourTransferRequest = {
      id: transferId,
      fromSubscriptionId,
      fromCustomerName: fromCustomerName || fromSub.customerName,
      toSubscriptionId,
      toCustomerName: toCustomerName || toSub.customerName,
      hours,
      reason,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      requestedBy
    };

    await kv.set(`hour_transfer:${transferId}`, transfer);
    
    // Add to pending transfers list for easier querying
    const pendingTransfers = await kv.get('hour_transfers:pending') || [];
    pendingTransfers.push(transferId);
    await kv.set('hour_transfers:pending', pendingTransfers);

    console.log(`Hour transfer request created: ${transferId}`);
    return c.json({ success: true, transfer });

  } catch (error) {
    console.error('Error creating transfer request:', error);
    return c.json({ error: 'Failed to create transfer request', details: error.message }, 500);
  }
});

// Get all pending transfer requests
app.get('/pending', async (c) => {
  try {
    const pendingIds = await kv.get('hour_transfers:pending') || [];
    const transfers = await Promise.all(
      pendingIds.map(async (id: string) => {
        const transfer = await kv.get(`hour_transfer:${id}`);
        return transfer;
      })
    );

    // Filter out null values and only return pending transfers
    const validTransfers = transfers.filter(t => t && t.status === 'pending');

    return c.json({ transfers: validTransfers });
  } catch (error) {
    console.error('Error fetching pending transfers:', error);
    return c.json({ error: 'Failed to fetch pending transfers', details: error.message }, 500);
  }
});

// Get all transfer requests (all statuses)
app.get('/all', async (c) => {
  try {
    const allTransfers = await kv.getByPrefix('hour_transfer:');
    const transfers = allTransfers.sort((a: HourTransferRequest, b: HourTransferRequest) => {
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });

    return c.json({ transfers });
  } catch (error) {
    console.error('Error fetching all transfers:', error);
    return c.json({ error: 'Failed to fetch transfers', details: error.message }, 500);
  }
});

// Get transfers for a specific subscription
app.get('/subscription/:subscriptionId', async (c) => {
  try {
    /*
     * Staff only.
     *
     * A subscription id is not a credential, and this returns every transfer
     * in or out of one — who gave hours to whom, when, and how many. Scoping
     * it to an owner would need both ends of each transfer resolved to an
     * account, and the only screens that call it are the staff approval
     * panels, so the honest answer is the narrow one.
     */
    const who = await verifiedActor(c);
    if (!who?.staff) {
      return c.json({ error: 'Company access is required for this.' }, 403);
    }

    const subscriptionId = c.req.param('subscriptionId');
    const allTransfers = await kv.getByPrefix('hour_transfer:');
    
    const relatedTransfers = allTransfers.filter((t: HourTransferRequest) => 
      t.fromSubscriptionId === subscriptionId || t.toSubscriptionId === subscriptionId
    );

    return c.json({ transfers: relatedTransfers });
  } catch (error) {
    console.error('Error fetching subscription transfers:', error);
    return c.json({ error: 'Failed to fetch subscription transfers', details: error.message }, 500);
  }
});

// Approve or deny a transfer request
app.post('/review/:transferId', async (c) => {
  try {
    /*
     * Staff only, and the reviewer is the token — not the body.
     *
     * This route moves billable hours between subscriptions, and it took both
     * the decision AND the name of whoever made it from the request. Any
     * signed-in account could approve anybody's transfer and sign it with a
     * name they typed, which is worse than the approval itself: the record of
     * who authorised the movement was whatever the caller claimed.
     *
     * Both callers are staff screens — TransferApprovalPanel appears in the
     * Owners Dashboard and in RewardsPerksHub, which passes `adminName` and
     * `userRole="owner"` — so nothing legitimate is narrowed by this.
     */
    const who = await verifiedActor(c);
    if (!who?.staff) {
      return c.json({ error: 'Company access is required for this.' }, 403);
    }

    const transferId = c.req.param('transferId');
    const body = await c.req.json();
    const { action, reviewNotes } = body;
    // Signed by the verified account, so the audit trail says who really did it.
    const reviewedBy = who.email;

    if (!action) {
      return c.json({ error: 'Missing required field (action)' }, 400);
    }

    if (action !== 'approve' && action !== 'deny') {
      return c.json({ error: 'Action must be "approve" or "deny"' }, 400);
    }

    // Get the transfer request
    const transfer = await kv.get(`hour_transfer:${transferId}`);
    if (!transfer) {
      return c.json({ error: 'Transfer request not found' }, 404);
    }

    if (transfer.status !== 'pending') {
      return c.json({ error: `Transfer already ${transfer.status}` }, 400);
    }

    // Update transfer status
    transfer.status = action === 'approve' ? 'approved' : 'denied';
    transfer.reviewedAt = new Date().toISOString();
    transfer.reviewedBy = reviewedBy;
    transfer.reviewNotes = reviewNotes || '';

    // If approved, execute the transfer
    if (action === 'approve') {
      // Get both subscriptions
      const fromSub = await kv.get(`subscription:${transfer.fromSubscriptionId}`);
      const toSub = await kv.get(`subscription:${transfer.toSubscriptionId}`);

      if (!fromSub || !toSub) {
        return c.json({ error: 'One or both subscriptions not found' }, 404);
      }

      // Verify hours are still available
      const availableHours = (fromSub.totalHours || 0) - (fromSub.usedHours || 0);
      if (availableHours < transfer.hours) {
        transfer.status = 'denied';
        transfer.reviewNotes = `Insufficient hours at approval time. Available: ${availableHours}`;
        await kv.set(`hour_transfer:${transferId}`, transfer);
        return c.json({ 
          error: 'Insufficient hours', 
          details: transfer.reviewNotes 
        }, 400);
      }

      // Execute the transfer
      // Deduct from source
      fromSub.usedHours = (fromSub.usedHours || 0) + transfer.hours;
      
      // Add to target
      toSub.totalHours = (toSub.totalHours || 0) + transfer.hours;

      // Save updated subscriptions
      await kv.set(`subscription:${transfer.fromSubscriptionId}`, fromSub);
      await kv.set(`subscription:${transfer.toSubscriptionId}`, toSub);

      // Mark as completed
      transfer.status = 'completed';
      transfer.completedAt = new Date().toISOString();

      // Log the transfer in history
      const fromHistory = fromSub.hourHistory || [];
      fromHistory.push({
        date: new Date().toISOString(),
        type: 'transfer_out',
        hours: -transfer.hours,
        description: `Transferred ${transfer.hours}h to ${transfer.toCustomerName}`,
        transferId: transferId,
        approvedBy: reviewedBy
      });
      fromSub.hourHistory = fromHistory;
      await kv.set(`subscription:${transfer.fromSubscriptionId}`, fromSub);

      const toHistory = toSub.hourHistory || [];
      toHistory.push({
        date: new Date().toISOString(),
        type: 'transfer_in',
        hours: transfer.hours,
        description: `Received ${transfer.hours}h from ${transfer.fromCustomerName}`,
        transferId: transferId,
        approvedBy: reviewedBy
      });
      toSub.hourHistory = toHistory;
      await kv.set(`subscription:${transfer.toSubscriptionId}`, toSub);
    }

    // Save updated transfer
    await kv.set(`hour_transfer:${transferId}`, transfer);

    // Remove from pending list
    const pendingTransfers = await kv.get('hour_transfers:pending') || [];
    const updatedPending = pendingTransfers.filter((id: string) => id !== transferId);
    await kv.set('hour_transfers:pending', updatedPending);

    console.log(`Transfer ${transferId} ${action === 'approve' ? 'approved and executed' : 'denied'} by ${reviewedBy}`);
    return c.json({ success: true, transfer });

  } catch (error) {
    console.error('Error reviewing transfer:', error);
    return c.json({ error: 'Failed to review transfer', details: error.message }, 500);
  }
});

// Get transfer by ID
app.get('/:transferId', async (c) => {
  try {
    const transferId = c.req.param('transferId');
    const transfer = await kv.get(`hour_transfer:${transferId}`);
    
    if (!transfer) {
      return c.json({ error: 'Transfer not found' }, 404);
    }

    return c.json({ transfer });
  } catch (error) {
    console.error('Error fetching transfer:', error);
    return c.json({ error: 'Failed to fetch transfer', details: error.message }, 500);
  }
});

export default app;