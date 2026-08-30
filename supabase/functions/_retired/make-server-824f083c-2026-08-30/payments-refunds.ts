/**
 * Payment Refunds API
 * 
 * Server-side refund processing.
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

function generateId() {
  return crypto.randomUUID();
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

// ============================================================================
// GET REFUNDS (LIST WITH FILTERS)
// ============================================================================

app.get('/refunds', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    // Get query parameters
    const transactionId = c.req.query('transaction_id');
    const customerId = c.req.query('customer_id');
    const invoiceId = c.req.query('invoice_id');
    const status = c.req.query('status');
    const reason = c.req.query('reason');
    const dateFrom = c.req.query('date_from');
    const dateTo = c.req.query('date_to');

    // Get all refunds for this company
    const prefix = `refund:${companyId}:`;
    const allRefunds = await kv.getByPrefix(prefix);

    // Filter refunds
    let filtered = allRefunds.filter((r: any) => {
      if (transactionId && r.transaction_id !== transactionId) return false;
      if (customerId && r.customer_id !== customerId) return false;
      if (invoiceId && r.invoice_id !== invoiceId) return false;
      if (status && r.status !== status) return false;
      if (reason && r.reason !== reason) return false;
      
      if (dateFrom || dateTo) {
        const refundDate = new Date(r.created_at);
        if (dateFrom && refundDate < new Date(dateFrom)) return false;
        if (dateTo && refundDate > new Date(dateTo)) return false;
      }

      return true;
    });

    // Sort by created date (newest first)
    filtered.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Get related data
    const refundsWithRelations = await Promise.all(
      filtered.map(async (refund: any) => {
        const relations: any = {};

        // Get transaction
        if (refund.transaction_id) {
          const transaction = await kv.get(`transaction:${companyId}:${refund.transaction_id}`);
          if (transaction) relations.transaction = transaction;
        }

        // Get customer
        if (refund.customer_id) {
          const customer = await kv.get(`customer:${companyId}:${refund.customer_id}`);
          if (customer) relations.customer = customer;
        }

        // Get invoice
        if (refund.invoice_id) {
          const invoice = await kv.get(`invoice:${companyId}:${refund.invoice_id}`);
          if (invoice) relations.invoice = invoice;
        }

        return { ...refund, ...relations };
      })
    );

    return c.json({
      refunds: refundsWithRelations,
      total: refundsWithRelations.length,
    });
  } catch (error: any) {
    console.error('Error fetching refunds:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET SINGLE REFUND
// ============================================================================

app.get('/refunds/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const refund = await kv.get(`refund:${companyId}:${id}`);

    if (!refund) {
      return c.json({ error: 'Refund not found' }, 404);
    }

    // Get related data
    const relations: any = {};

    if (refund.transaction_id) {
      const transaction = await kv.get(`transaction:${companyId}:${refund.transaction_id}`);
      if (transaction) relations.transaction = transaction;
    }

    if (refund.customer_id) {
      const customer = await kv.get(`customer:${companyId}:${refund.customer_id}`);
      if (customer) relations.customer = customer;
    }

    if (refund.invoice_id) {
      const invoice = await kv.get(`invoice:${companyId}:${refund.invoice_id}`);
      if (invoice) relations.invoice = invoice;
    }

    return c.json({ ...refund, ...relations });
  } catch (error: any) {
    console.error('Error fetching refund:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CREATE REFUND (PROCESS)
// ============================================================================

app.post('/refunds', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const userId = c.req.header('x-user-id');
    
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const data = await c.req.json();

    // Validate required fields
    if (!data.transaction_id || !data.reason) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get original transaction
    const transaction = await kv.get(`transaction:${companyId}:${data.transaction_id}`);
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    // Validate transaction can be refunded
    if (transaction.status !== 'completed') {
      return c.json({ error: 'Only completed transactions can be refunded' }, 400);
    }

    // Calculate refund amount
    const refundAmount = data.amount || transaction.amount;
    const alreadyRefunded = transaction.amount_refunded || 0;
    const availableToRefund = transaction.amount - alreadyRefunded;

    if (refundAmount > availableToRefund) {
      return c.json({ 
        error: `Cannot refund ${refundAmount}. Only ${availableToRefund} available to refund.` 
      }, 400);
    }

    if (refundAmount <= 0) {
      return c.json({ error: 'Refund amount must be greater than 0' }, 400);
    }

    // Process refund through gateway
    let gatewayRefundId = null;
    let status = 'completed';
    let failureMessage = null;

    if (transaction.gateway === 'stripe' && transaction.gateway_transaction_id) {
      // In production, would call Stripe API:
      // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      // try {
      //   const refund = await stripe.refunds.create({
      //     charge: transaction.gateway_transaction_id,
      //     amount: Math.round(refundAmount * 100),
      //     reason: data.reason,
      //   });
      //   gatewayRefundId = refund.id;
      //   status = refund.status === 'succeeded' ? 'completed' : 'processing';
      // } catch (error) {
      //   status = 'failed';
      //   failureMessage = error.message;
      // }
      
      // Simulate successful refund
      gatewayRefundId = `re_${generateId().replace(/-/g, '')}`;
    }

    const refund = {
      id: generateId(),
      company_id: companyId,
      transaction_id: data.transaction_id,
      invoice_id: transaction.invoice_id || null,
      customer_id: transaction.customer_id || null,
      status,
      reason: data.reason,
      reason_notes: data.reason_notes || null,
      amount: refundAmount,
      currency: transaction.currency,
      gateway: transaction.gateway,
      gateway_refund_id: gatewayRefundId,
      processed_at: status === 'completed' ? getCurrentTimestamp() : null,
      failure_message: failureMessage,
      created_by: userId || 'system',
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };

    await kv.set(`refund:${companyId}:${refund.id}`, refund);

    // Update original transaction
    if (status === 'completed') {
      transaction.amount_refunded = alreadyRefunded + refundAmount;
      
      // Update transaction status
      if (transaction.amount_refunded >= transaction.amount) {
        transaction.status = 'refunded';
      } else {
        transaction.status = 'partially_refunded';
      }
      
      transaction.updated_at = getCurrentTimestamp();
      await kv.set(`transaction:${companyId}:${transaction.id}`, transaction);

      // Update invoice if linked
      if (transaction.invoice_id) {
        const invoice = await kv.get(`invoice:${companyId}:${transaction.invoice_id}`);
        if (invoice) {
          invoice.amount_paid = Math.max(0, (invoice.amount_paid || 0) - refundAmount);
          
          // Recalculate invoice status
          if (invoice.amount_paid === 0) {
            invoice.status = 'draft';
          } else if (invoice.amount_paid < invoice.total_amount) {
            invoice.status = 'partially_paid';
          } else {
            invoice.status = 'paid';
          }
          
          invoice.updated_at = getCurrentTimestamp();
          await kv.set(`invoice:${companyId}:${transaction.invoice_id}`, invoice);
        }
      }
    }

    return c.json(refund, 201);
  } catch (error: any) {
    console.error('Error creating refund:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CANCEL REFUND
// ============================================================================

app.post('/refunds/:id/cancel', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const refund = await kv.get(`refund:${companyId}:${id}`);

    if (!refund) {
      return c.json({ error: 'Refund not found' }, 404);
    }

    // Can only cancel pending refunds
    if (refund.status !== 'pending' && refund.status !== 'processing') {
      return c.json({ error: 'Can only cancel pending or processing refunds' }, 400);
    }

    refund.status = 'cancelled';
    refund.updated_at = getCurrentTimestamp();

    await kv.set(`refund:${companyId}:${id}`, refund);

    return c.json(refund);
  } catch (error: any) {
    console.error('Error cancelling refund:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
