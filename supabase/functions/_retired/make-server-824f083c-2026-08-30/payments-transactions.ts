/**
 * Payment Transactions API
 * 
 * Server-side transaction management and processing.
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
// GET TRANSACTIONS (LIST WITH FILTERS)
// ============================================================================

app.get('/transactions', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    // Get query parameters
    const customerId = c.req.query('customer_id');
    const invoiceId = c.req.query('invoice_id');
    const type = c.req.query('type');
    const status = c.req.query('status');
    const gateway = c.req.query('gateway');
    const dateFrom = c.req.query('date_from');
    const dateTo = c.req.query('date_to');
    const amountMin = c.req.query('amount_min');
    const amountMax = c.req.query('amount_max');
    const search = c.req.query('search');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const sortBy = c.req.query('sort_by') || 'transaction_date';
    const sortOrder = c.req.query('sort_order') || 'desc';

    // Get all transactions for this company
    const prefix = `transaction:${companyId}:`;
    const allTransactions = await kv.getByPrefix(prefix);

    // Filter transactions
    let filtered = allTransactions.filter((t: any) => {
      if (customerId && t.customer_id !== customerId) return false;
      if (invoiceId && t.invoice_id !== invoiceId) return false;
      if (type && t.type !== type) return false;
      if (status && t.status !== status) return false;
      if (gateway && t.gateway !== gateway) return false;
      
      if (dateFrom || dateTo) {
        const transDate = new Date(t.transaction_date);
        if (dateFrom && transDate < new Date(dateFrom)) return false;
        if (dateTo && transDate > new Date(dateTo)) return false;
      }

      if (amountMin && t.amount < parseFloat(amountMin)) return false;
      if (amountMax && t.amount > parseFloat(amountMax)) return false;

      if (search) {
        const searchLower = search.toLowerCase();
        const matchesReference = t.reference_number?.toLowerCase().includes(searchLower);
        const matchesDescription = t.description?.toLowerCase().includes(searchLower);
        const matchesGatewayId = t.gateway_transaction_id?.toLowerCase().includes(searchLower);
        if (!matchesReference && !matchesDescription && !matchesGatewayId) return false;
      }

      return true;
    });

    // Sort transactions
    filtered.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'transaction_date' || sortBy === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    // Get related data for transactions
    const transactionsWithRelations = await Promise.all(
      filtered.map(async (transaction: any) => {
        const relations: any = {};

        // Get customer
        if (transaction.customer_id) {
          const customer = await kv.get(`customer:${companyId}:${transaction.customer_id}`);
          if (customer) relations.customer = customer;
        }

        // Get invoice
        if (transaction.invoice_id) {
          const invoice = await kv.get(`invoice:${companyId}:${transaction.invoice_id}`);
          if (invoice) relations.invoice = invoice;
        }

        // Get payment method
        if (transaction.payment_method_id) {
          const method = await kv.get(`payment_method:${companyId}:${transaction.payment_method_id}`);
          if (method) relations.payment_method = method;
        }

        return { ...transaction, ...relations };
      })
    );

    // Paginate
    const total = transactionsWithRelations.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = transactionsWithRelations.slice(start, end);

    return c.json({
      transactions: paginated,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET SINGLE TRANSACTION
// ============================================================================

app.get('/transactions/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const transaction = await kv.get(`transaction:${companyId}:${id}`);

    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    // Get related data
    const relations: any = {};

    if (transaction.customer_id) {
      const customer = await kv.get(`customer:${companyId}:${transaction.customer_id}`);
      if (customer) relations.customer = customer;
    }

    if (transaction.invoice_id) {
      const invoice = await kv.get(`invoice:${companyId}:${transaction.invoice_id}`);
      if (invoice) relations.invoice = invoice;
    }

    if (transaction.payment_method_id) {
      const method = await kv.get(`payment_method:${companyId}:${transaction.payment_method_id}`);
      if (method) relations.payment_method = method;
    }

    return c.json({ ...transaction, ...relations });
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CREATE TRANSACTION (MANUAL ENTRY)
// ============================================================================

app.post('/transactions', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const data = await c.req.json();

    // Validate required fields
    if (!data.type || !data.gateway || data.amount === undefined) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const transaction = {
      id: generateId(),
      company_id: companyId,
      customer_id: data.customer_id || null,
      invoice_id: data.invoice_id || null,
      payment_method_id: data.payment_method_id || null,
      type: data.type,
      status: 'completed', // Manual entries are pre-completed
      gateway: data.gateway,
      gateway_transaction_id: data.gateway_transaction_id || null,
      amount: data.amount,
      currency: data.currency || 'USD',
      fee_amount: data.fee_amount || 0,
      net_amount: data.net_amount || (data.amount - (data.fee_amount || 0)),
      description: data.description || null,
      reference_number: data.reference_number || `TXN-${Date.now()}`,
      transaction_date: data.transaction_date || getCurrentTimestamp(),
      processed_at: getCurrentTimestamp(),
      metadata: data.metadata || {},
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };

    await kv.set(`transaction:${companyId}:${transaction.id}`, transaction);

    // Update invoice if linked
    if (transaction.invoice_id && transaction.type === 'payment') {
      const invoice = await kv.get(`invoice:${companyId}:${transaction.invoice_id}`);
      if (invoice) {
        invoice.amount_paid = (invoice.amount_paid || 0) + transaction.amount;
        invoice.status = invoice.amount_paid >= invoice.total_amount ? 'paid' : 'partially_paid';
        invoice.updated_at = getCurrentTimestamp();
        await kv.set(`invoice:${companyId}:${transaction.invoice_id}`, invoice);
      }
    }

    return c.json(transaction, 201);
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// PROCESS PAYMENT (STRIPE INTEGRATION)
// ============================================================================

app.post('/process', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const data = await c.req.json();

    // Validate required fields
    if (!data.payment_method_id || data.amount === undefined) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get payment method
    const paymentMethod = await kv.get(`payment_method:${companyId}:${data.payment_method_id}`);
    if (!paymentMethod) {
      return c.json({ error: 'Payment method not found' }, 404);
    }

    // For Stripe payments, would integrate with Stripe API here
    // For now, simulate successful payment
    const isStripe = paymentMethod.gateway === 'stripe';
    
    let gatewayTransactionId = null;
    let status = 'completed';
    let feeAmount = 0;

    if (isStripe) {
      // Simulate Stripe payment
      gatewayTransactionId = `ch_${generateId().replace(/-/g, '')}`;
      feeAmount = (data.amount * 0.029) + 0.30; // 2.9% + $0.30
      
      // In production, would call Stripe API:
      // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      // const charge = await stripe.charges.create({
      //   amount: Math.round(data.amount * 100),
      //   currency: data.currency || 'usd',
      //   source: paymentMethod.gateway_payment_method_id,
      //   description: data.description,
      // });
      // gatewayTransactionId = charge.id;
      // status = charge.status === 'succeeded' ? 'completed' : 'failed';
    }

    const transaction = {
      id: generateId(),
      company_id: companyId,
      customer_id: data.customer_id || null,
      invoice_id: data.invoice_id || null,
      payment_method_id: data.payment_method_id,
      type: 'payment',
      status,
      gateway: paymentMethod.gateway,
      gateway_transaction_id: gatewayTransactionId,
      amount: data.amount,
      currency: data.currency || 'USD',
      fee_amount: feeAmount,
      net_amount: data.amount - feeAmount,
      description: data.description || null,
      reference_number: `PAY-${Date.now()}`,
      transaction_date: getCurrentTimestamp(),
      processed_at: getCurrentTimestamp(),
      metadata: data.metadata || {},
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };

    await kv.set(`transaction:${companyId}:${transaction.id}`, transaction);

    // Update invoice if linked
    if (transaction.invoice_id && status === 'completed') {
      const invoice = await kv.get(`invoice:${companyId}:${transaction.invoice_id}`);
      if (invoice) {
        invoice.amount_paid = (invoice.amount_paid || 0) + transaction.amount;
        invoice.status = invoice.amount_paid >= invoice.total_amount ? 'paid' : 'partially_paid';
        invoice.updated_at = getCurrentTimestamp();
        await kv.set(`invoice:${companyId}:${transaction.invoice_id}`, invoice);
      }
    }

    return c.json({
      success: status === 'completed',
      transaction,
    });
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return c.json({ 
      success: false,
      error: error.message 
    }, 500);
  }
});

// ============================================================================
// UPDATE TRANSACTION STATUS
// ============================================================================

app.patch('/transactions/:id/status', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const { status } = await c.req.json();

    const transaction = await kv.get(`transaction:${companyId}:${id}`);
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    transaction.status = status;
    transaction.updated_at = getCurrentTimestamp();

    if (status === 'completed') {
      transaction.processed_at = getCurrentTimestamp();
    }

    await kv.set(`transaction:${companyId}:${id}`, transaction);

    return c.json(transaction);
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DELETE TRANSACTION
// ============================================================================

app.delete('/transactions/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const transaction = await kv.get(`transaction:${companyId}:${id}`);

    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    // Don't allow deleting completed transactions
    if (transaction.status === 'completed') {
      return c.json({ error: 'Cannot delete completed transaction' }, 400);
    }

    await kv.del(`transaction:${companyId}:${id}`);

    return c.json({ message: 'Transaction deleted' });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
