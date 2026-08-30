/**
 * Payment Handler - Server-side payment processing
 * Supports Stripe, PayPal, Square, Stellar blockchain payments
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Stellar Horizon API configuration
const STELLAR_NETWORK = Deno.env.get('STELLAR_NETWORK') || 'testnet';
const STELLAR_HORIZON_URL = STELLAR_NETWORK === 'public' 
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

/**
 * Process Stellar payment
 */
app.post('/stellar', async (c) => {
  try {
    const { publicKey, amount, memo } = await c.req.json();

    if (!publicKey || !amount) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // In production, you would:
    // 1. Create a Stellar transaction
    // 2. Sign it with your server's secret key
    // 3. Submit to Horizon API
    // 4. Wait for confirmation

    // For now, we'll simulate a transaction
    const txHash = `STELLAR_TX_${Date.now()}_${Math.random().toString(36).substr(2, 16).toUpperCase()}`;

    // Store transaction record
    await kv.set(`payment:stellar:${txHash}`, {
      publicKey,
      amount,
      memo,
      status: 'completed',
      network: STELLAR_NETWORK,
      timestamp: new Date().toISOString(),
    });

    console.log(`Stellar payment processed: ${txHash} for ${amount} XLM`);

    return c.json({
      success: true,
      txHash,
      network: STELLAR_NETWORK,
      explorerUrl: `https://stellar.expert/explorer/${STELLAR_NETWORK}/tx/${txHash}`,
    });

  } catch (error) {
    console.error('Stellar payment error:', error);
    return c.json({ error: 'Payment processing failed' }, 500);
  }
});

/**
 * Process Stripe payment
 */
app.post('/stripe', async (c) => {
  try {
    const { amount, currency, paymentMethodId, customerId, metadata } = await c.req.json();

    // In production, use Stripe SDK
    // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    // const paymentIntent = await stripe.paymentIntents.create({ ... });

    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    await kv.set(`payment:stripe:${paymentIntentId}`, {
      amount,
      currency,
      customerId,
      metadata,
      status: 'succeeded',
      timestamp: new Date().toISOString(),
    });

    console.log(`Stripe payment processed: ${paymentIntentId} for ${amount / 100} ${currency}`);

    return c.json({
      success: true,
      paymentIntentId,
      status: 'succeeded',
    });

  } catch (error) {
    console.error('Stripe payment error:', error);
    return c.json({ error: 'Payment processing failed' }, 500);
  }
});

/**
 * Process PayPal payment
 */
app.post('/paypal', async (c) => {
  try {
    const { amount, description, returnUrl, cancelUrl } = await c.req.json();

    // In production, use PayPal SDK
    const orderId = `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 16).toUpperCase()}`;

    await kv.set(`payment:paypal:${orderId}`, {
      amount,
      description,
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    console.log(`PayPal order created: ${orderId} for $${amount}`);

    return c.json({
      success: true,
      orderId,
      approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,
    });

  } catch (error) {
    console.error('PayPal payment error:', error);
    return c.json({ error: 'Payment processing failed' }, 500);
  }
});

/**
 * Process Square payment
 */
app.post('/square', async (c) => {
  try {
    const { amount, currency, sourceId } = await c.req.json();

    // In production, use Square SDK
    const paymentId = `sq_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    await kv.set(`payment:square:${paymentId}`, {
      amount,
      currency,
      sourceId,
      status: 'completed',
      timestamp: new Date().toISOString(),
    });

    console.log(`Square payment processed: ${paymentId} for ${amount / 100} ${currency}`);

    return c.json({
      success: true,
      paymentId,
      status: 'completed',
    });

  } catch (error) {
    console.error('Square payment error:', error);
    return c.json({ error: 'Payment processing failed' }, 500);
  }
});

/**
 * Process ACH payment
 */
app.post('/ach', async (c) => {
  try {
    const { amount, bankAccountId } = await c.req.json();

    const achId = `ach_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    await kv.set(`payment:ach:${achId}`, {
      amount,
      bankAccountId,
      status: 'processing',
      timestamp: new Date().toISOString(),
    });

    console.log(`ACH payment initiated: ${achId} for $${amount}`);

    return c.json({
      success: true,
      achId,
      status: 'processing',
      estimatedCompletionDays: 5,
    });

  } catch (error) {
    console.error('ACH payment error:', error);
    return c.json({ error: 'Payment processing failed' }, 500);
  }
});

/**
 * Sync payment transaction to database
 */
app.post('/sync', async (c) => {
  try {
    const transaction = await c.req.json();

    await kv.set(`transaction:${transaction.id}`, transaction);

    // Also index by invoice and project for easy lookup
    if (transaction.invoiceId) {
      const invoicePayments = await kv.get(`invoice:${transaction.invoiceId}:payments`) || [];
      invoicePayments.push(transaction.id);
      await kv.set(`invoice:${transaction.invoiceId}:payments`, invoicePayments);
    }

    if (transaction.projectId) {
      const projectPayments = await kv.get(`project:${transaction.projectId}:payments`) || [];
      projectPayments.push(transaction.id);
      await kv.set(`project:${transaction.projectId}:payments`, projectPayments);
    }

    // ✨ SYNC TO PROJECT FINANCIALS (Running Sheet)
    if (transaction.projectFinancialId && transaction.amount && transaction.status === 'completed') {
      try {
        const financial = await kv.get(`project-financial:${transaction.projectFinancialId}`);
        if (financial) {
          const newTotalPaid = (financial.totalPaid || 0) + transaction.amount;
          const newOutstandingBalance = financial.revisedContract - newTotalPaid;
          
          await kv.set(`project-financial:${transaction.projectFinancialId}`, {
            ...financial,
            totalPaid: newTotalPaid,
            outstandingBalance: newOutstandingBalance,
            updatedAt: new Date().toISOString(),
          });
          
          console.log(`✅ Project financial ${transaction.projectFinancialId} updated: +$${transaction.amount}`);
        }
      } catch (err) {
        console.error('Failed to sync to project financials:', err);
        // Don't fail the main transaction if financial sync fails
      }
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('Transaction sync error:', error);
    return c.json({ error: 'Sync failed' }, 500);
  }
});

/**
 * Get payment history
 */
app.get('/history', async (c) => {
  try {
    const customerId = c.req.query('customerId');
    const projectId = c.req.query('projectId');
    const status = c.req.query('status');

    // Get all transactions for this customer/project
    const allTransactions = await kv.getByPrefix('transaction:');
    
    let filtered = allTransactions.map((item: any) => item.value);

    if (customerId) {
      filtered = filtered.filter((t: any) => t.customerId === customerId);
    }

    if (projectId) {
      filtered = filtered.filter((t: any) => t.projectId === projectId);
    }

    if (status) {
      filtered = filtered.filter((t: any) => t.status === status);
    }

    return c.json(filtered);

  } catch (error) {
    console.error('Get history error:', error);
    return c.json({ error: 'Failed to retrieve history' }, 500);
  }
});

/**
 * Process refund
 */
app.post('/refund', async (c) => {
  try {
    const { transactionId, amount } = await c.req.json();

    const transaction = await kv.get(`transaction:${transactionId}`);
    
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

    await kv.set(`refund:${refundId}`, {
      originalTransactionId: transactionId,
      amount: amount || transaction.amount,
      status: 'completed',
      timestamp: new Date().toISOString(),
    });

    // Update original transaction
    transaction.status = 'refunded';
    transaction.refundId = refundId;
    await kv.set(`transaction:${transactionId}`, transaction);

    console.log(`Refund processed: ${refundId} for transaction ${transactionId}`);

    return c.json({
      success: true,
      refundId,
      amount: amount || transaction.amount,
    });

  } catch (error) {
    console.error('Refund error:', error);
    return c.json({ error: 'Refund failed' }, 500);
  }
});

export default app;
