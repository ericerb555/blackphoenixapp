/**
 * Payment Webhooks API
 * 
 * Server-side webhook handling for payment gateways.
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

function getCurrentTimestamp() {
  return new Date().toISOString();
}

// ============================================================================
// STRIPE WEBHOOK HANDLER
// ============================================================================

app.post('/webhooks/stripe', async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    const body = await c.req.text();

    console.log('📨 Stripe webhook received');

    // In production, verify webhook signature:
    // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    // const event = stripe.webhooks.constructEvent(
    //   body,
    //   signature,
    //   Deno.env.get('STRIPE_WEBHOOK_SECRET')
    // );

    // For now, parse the body
    const event = JSON.parse(body);

    console.log(`📨 Event type: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.type, event.data.object);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return c.json({ error: error.message }, 400);
  }
});

// ============================================================================
// SQUARE WEBHOOK HANDLER
// ============================================================================

app.post('/webhooks/square', async (c) => {
  try {
    const signature = c.req.header('x-square-signature');
    const body = await c.req.json();

    console.log('📨 Square webhook received');
    console.log(`📨 Event type: ${body.type}`);

    // In production, verify webhook signature

    switch (body.type) {
      case 'payment.created':
        await handleSquarePaymentCreated(body.data);
        break;

      case 'payment.updated':
        await handleSquarePaymentUpdated(body.data);
        break;

      case 'refund.created':
        await handleSquareRefundCreated(body.data);
        break;

      default:
        console.log(`⚠️ Unhandled Square event: ${body.type}`);
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error('❌ Square webhook error:', error);
    return c.json({ error: error.message }, 400);
  }
});

// ============================================================================
// PAYPAL WEBHOOK HANDLER
// ============================================================================

app.post('/webhooks/paypal', async (c) => {
  try {
    const body = await c.req.json();

    console.log('📨 PayPal webhook received');
    console.log(`📨 Event type: ${body.event_type}`);

    // In production, verify webhook signature with PayPal

    switch (body.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePayPalPaymentCompleted(body.resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await handlePayPalPaymentDenied(body.resource);
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePayPalRefund(body.resource);
        break;

      default:
        console.log(`⚠️ Unhandled PayPal event: ${body.event_type}`);
    }

    return c.json({ received: true });
  } catch (error: any) {
    console.error('❌ PayPal webhook error:', error);
    return c.json({ error: error.message }, 400);
  }
});

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

async function handlePaymentSucceeded(paymentIntent: any) {
  console.log('✅ Payment succeeded:', paymentIntent.id);

  // Find transaction by gateway ID
  const allTransactions = await kv.getByPrefix('transaction:');
  const transaction = allTransactions.find(
    (t: any) => t.gateway_transaction_id === paymentIntent.id
  );

  if (transaction) {
    transaction.status = 'completed';
    transaction.processed_at = getCurrentTimestamp();
    transaction.updated_at = getCurrentTimestamp();

    await kv.set(`transaction:${transaction.company_id}:${transaction.id}`, transaction);
    console.log('✅ Updated transaction status to completed');

    // Update invoice if linked
    if (transaction.invoice_id) {
      const invoice = await kv.get(`invoice:${transaction.company_id}:${transaction.invoice_id}`);
      if (invoice) {
        invoice.amount_paid = (invoice.amount_paid || 0) + transaction.amount;
        invoice.status = invoice.amount_paid >= invoice.total_amount ? 'paid' : 'partially_paid';
        invoice.updated_at = getCurrentTimestamp();
        await kv.set(`invoice:${transaction.company_id}:${transaction.invoice_id}`, invoice);
        console.log('✅ Updated invoice status');
      }
    }
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  console.log('❌ Payment failed:', paymentIntent.id);

  const allTransactions = await kv.getByPrefix('transaction:');
  const transaction = allTransactions.find(
    (t: any) => t.gateway_transaction_id === paymentIntent.id
  );

  if (transaction) {
    transaction.status = 'failed';
    transaction.failure_message = paymentIntent.last_payment_error?.message || 'Payment failed';
    transaction.failure_code = paymentIntent.last_payment_error?.code || null;
    transaction.updated_at = getCurrentTimestamp();

    await kv.set(`transaction:${transaction.company_id}:${transaction.id}`, transaction);
    console.log('✅ Updated transaction status to failed');
  }
}

async function handleChargeSucceeded(charge: any) {
  console.log('✅ Charge succeeded:', charge.id);
  // Similar to payment succeeded
}

async function handleChargeRefunded(charge: any) {
  console.log('🔄 Charge refunded:', charge.id);

  const allTransactions = await kv.getByPrefix('transaction:');
  const transaction = allTransactions.find(
    (t: any) => t.gateway_transaction_id === charge.id
  );

  if (transaction) {
    const refundAmount = charge.amount_refunded / 100; // Stripe uses cents
    transaction.amount_refunded = refundAmount;
    
    if (refundAmount >= transaction.amount) {
      transaction.status = 'refunded';
    } else {
      transaction.status = 'partially_refunded';
    }
    
    transaction.updated_at = getCurrentTimestamp();
    await kv.set(`transaction:${transaction.company_id}:${transaction.id}`, transaction);
    console.log('✅ Updated transaction refund status');
  }
}

async function handleSubscriptionEvent(eventType: string, subscription: any) {
  console.log(`📋 Subscription event: ${eventType}`, subscription.id);
  
  // Find payment schedule by subscription ID
  const allSchedules = await kv.getByPrefix('payment_schedule:');
  const schedule = allSchedules.find(
    (s: any) => s.metadata?.stripe_subscription_id === subscription.id
  );

  if (schedule) {
    if (eventType === 'customer.subscription.deleted') {
      schedule.status = 'cancelled';
    } else if (eventType === 'customer.subscription.updated') {
      // Update schedule based on subscription status
      if (subscription.status === 'active') {
        schedule.status = 'active';
      } else if (subscription.status === 'paused') {
        schedule.status = 'paused';
      }
    }
    
    schedule.updated_at = getCurrentTimestamp();
    await kv.set(`payment_schedule:${schedule.company_id}:${schedule.id}`, schedule);
    console.log('✅ Updated payment schedule');
  }
}

async function handleSquarePaymentCreated(payment: any) {
  console.log('✅ Square payment created:', payment.id);
  // Similar handling for Square
}

async function handleSquarePaymentUpdated(payment: any) {
  console.log('🔄 Square payment updated:', payment.id);
  // Update transaction status based on Square payment status
}

async function handleSquareRefundCreated(refund: any) {
  console.log('🔄 Square refund created:', refund.id);
  // Handle Square refund
}

async function handlePayPalPaymentCompleted(payment: any) {
  console.log('✅ PayPal payment completed:', payment.id);
  // Handle PayPal payment completion
}

async function handlePayPalPaymentDenied(payment: any) {
  console.log('❌ PayPal payment denied:', payment.id);
  // Handle PayPal payment denial
}

async function handlePayPalRefund(refund: any) {
  console.log('🔄 PayPal refund:', refund.id);
  // Handle PayPal refund
}

// ============================================================================
// GET WEBHOOK LOGS
// ============================================================================

app.get('/webhooks/logs', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const gateway = c.req.query('gateway');
    const limit = parseInt(c.req.query('limit') || '50');

    // Get webhook logs
    const prefix = `webhook_log:${companyId}:`;
    let logs = await kv.getByPrefix(prefix);

    if (gateway) {
      logs = logs.filter((log: any) => log.gateway === gateway);
    }

    // Sort by timestamp (newest first)
    logs.sort((a: any, b: any) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Limit results
    logs = logs.slice(0, limit);

    return c.json({
      logs,
      total: logs.length,
    });
  } catch (error: any) {
    console.error('Error fetching webhook logs:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
