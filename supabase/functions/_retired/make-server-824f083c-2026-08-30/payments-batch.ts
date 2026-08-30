/**
 * Payment Batch Operations API
 * 
 * Server-side batch operations for payments.
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
// BATCH PROCESS PAYMENTS
// ============================================================================

app.post('/batch/process', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { payments } = await c.req.json();

    if (!Array.isArray(payments) || payments.length === 0) {
      return c.json({ error: 'Payments array is required' }, 400);
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      total: payments.length,
    };

    // Process each payment
    for (const payment of payments) {
      try {
        // Get payment method
        const paymentMethod = await kv.get(`payment_method:${companyId}:${payment.payment_method_id}`);
        if (!paymentMethod) {
          results.failed.push({
            ...payment,
            error: 'Payment method not found',
          });
          continue;
        }

        // Create transaction
        const transaction = {
          id: generateId(),
          company_id: companyId,
          customer_id: payment.customer_id || null,
          invoice_id: payment.invoice_id || null,
          payment_method_id: payment.payment_method_id,
          type: 'payment',
          status: 'completed',
          gateway: paymentMethod.gateway,
          gateway_transaction_id: `batch_${generateId().replace(/-/g, '')}`,
          amount: payment.amount,
          currency: payment.currency || 'USD',
          fee_amount: payment.amount * 0.029 + 0.30,
          net_amount: payment.amount - (payment.amount * 0.029 + 0.30),
          description: payment.description || 'Batch payment',
          reference_number: `BATCH-${Date.now()}-${results.successful.length + 1}`,
          transaction_date: getCurrentTimestamp(),
          processed_at: getCurrentTimestamp(),
          metadata: { batch: true, ...payment.metadata },
          created_at: getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
        };

        await kv.set(`transaction:${companyId}:${transaction.id}`, transaction);

        // Update invoice if linked
        if (transaction.invoice_id) {
          const invoice = await kv.get(`invoice:${companyId}:${transaction.invoice_id}`);
          if (invoice) {
            invoice.amount_paid = (invoice.amount_paid || 0) + transaction.amount;
            invoice.status = invoice.amount_paid >= invoice.total_amount ? 'paid' : 'partially_paid';
            invoice.updated_at = getCurrentTimestamp();
            await kv.set(`invoice:${companyId}:${transaction.invoice_id}`, invoice);
          }
        }

        results.successful.push(transaction);
      } catch (error: any) {
        results.failed.push({
          ...payment,
          error: error.message,
        });
      }
    }

    return c.json({
      success: true,
      results,
      summary: {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        success_rate: ((results.successful.length / results.total) * 100).toFixed(2) + '%',
      },
    });
  } catch (error: any) {
    console.error('Error processing batch payments:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// BATCH REFUND TRANSACTIONS
// ============================================================================

app.post('/batch/refund', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const userId = c.req.header('x-user-id');
    
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { transaction_ids, reason, reason_notes } = await c.req.json();

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return c.json({ error: 'Transaction IDs array is required' }, 400);
    }

    const results = {
      successful: [] as any[],
      failed: [] as any[],
      total: transaction_ids.length,
    };

    // Process each refund
    for (const transactionId of transaction_ids) {
      try {
        const transaction = await kv.get(`transaction:${companyId}:${transactionId}`);
        
        if (!transaction) {
          results.failed.push({
            transaction_id: transactionId,
            error: 'Transaction not found',
          });
          continue;
        }

        if (transaction.status !== 'completed') {
          results.failed.push({
            transaction_id: transactionId,
            error: 'Only completed transactions can be refunded',
          });
          continue;
        }

        const alreadyRefunded = transaction.amount_refunded || 0;
        const availableToRefund = transaction.amount - alreadyRefunded;

        if (availableToRefund <= 0) {
          results.failed.push({
            transaction_id: transactionId,
            error: 'Transaction already fully refunded',
          });
          continue;
        }

        // Create refund
        const refund = {
          id: generateId(),
          company_id: companyId,
          transaction_id: transactionId,
          invoice_id: transaction.invoice_id || null,
          customer_id: transaction.customer_id || null,
          status: 'completed',
          reason: reason || 'other',
          reason_notes: reason_notes || 'Batch refund',
          amount: availableToRefund,
          currency: transaction.currency,
          gateway: transaction.gateway,
          gateway_refund_id: `batch_re_${generateId().replace(/-/g, '')}`,
          processed_at: getCurrentTimestamp(),
          created_by: userId || 'system',
          created_at: getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
        };

        await kv.set(`refund:${companyId}:${refund.id}`, refund);

        // Update transaction
        transaction.amount_refunded = transaction.amount;
        transaction.status = 'refunded';
        transaction.updated_at = getCurrentTimestamp();
        await kv.set(`transaction:${companyId}:${transactionId}`, transaction);

        // Update invoice
        if (transaction.invoice_id) {
          const invoice = await kv.get(`invoice:${companyId}:${transaction.invoice_id}`);
          if (invoice) {
            invoice.amount_paid = Math.max(0, (invoice.amount_paid || 0) - availableToRefund);
            invoice.status = invoice.amount_paid === 0 ? 'draft' : 
                            invoice.amount_paid < invoice.total_amount ? 'partially_paid' : 'paid';
            invoice.updated_at = getCurrentTimestamp();
            await kv.set(`invoice:${companyId}:${transaction.invoice_id}`, invoice);
          }
        }

        results.successful.push(refund);
      } catch (error: any) {
        results.failed.push({
          transaction_id: transactionId,
          error: error.message,
        });
      }
    }

    return c.json({
      success: true,
      results,
      summary: {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        success_rate: ((results.successful.length / results.total) * 100).toFixed(2) + '%',
      },
    });
  } catch (error: any) {
    console.error('Error processing batch refunds:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// BATCH UPDATE TRANSACTION STATUS
// ============================================================================

app.post('/batch/update-status', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { transaction_ids, status } = await c.req.json();

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return c.json({ error: 'Transaction IDs array is required' }, 400);
    }

    if (!status) {
      return c.json({ error: 'Status is required' }, 400);
    }

    const results = {
      updated: [] as string[],
      failed: [] as any[],
      total: transaction_ids.length,
    };

    for (const transactionId of transaction_ids) {
      try {
        const transaction = await kv.get(`transaction:${companyId}:${transactionId}`);
        
        if (!transaction) {
          results.failed.push({
            transaction_id: transactionId,
            error: 'Transaction not found',
          });
          continue;
        }

        transaction.status = status;
        transaction.updated_at = getCurrentTimestamp();
        
        if (status === 'completed') {
          transaction.processed_at = getCurrentTimestamp();
        }

        await kv.set(`transaction:${companyId}:${transactionId}`, transaction);
        results.updated.push(transactionId);
      } catch (error: any) {
        results.failed.push({
          transaction_id: transactionId,
          error: error.message,
        });
      }
    }

    return c.json({
      success: true,
      results,
      summary: {
        total: results.total,
        updated: results.updated.length,
        failed: results.failed.length,
      },
    });
  } catch (error: any) {
    console.error('Error updating transaction statuses:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// BATCH DELETE TRANSACTIONS
// ============================================================================

app.post('/batch/delete', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { transaction_ids } = await c.req.json();

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return c.json({ error: 'Transaction IDs array is required' }, 400);
    }

    const results = {
      deleted: [] as string[],
      failed: [] as any[],
      total: transaction_ids.length,
    };

    for (const transactionId of transaction_ids) {
      try {
        const transaction = await kv.get(`transaction:${companyId}:${transactionId}`);
        
        if (!transaction) {
          results.failed.push({
            transaction_id: transactionId,
            error: 'Transaction not found',
          });
          continue;
        }

        // Don't allow deleting completed transactions
        if (transaction.status === 'completed') {
          results.failed.push({
            transaction_id: transactionId,
            error: 'Cannot delete completed transaction',
          });
          continue;
        }

        await kv.del(`transaction:${companyId}:${transactionId}`);
        results.deleted.push(transactionId);
      } catch (error: any) {
        results.failed.push({
          transaction_id: transactionId,
          error: error.message,
        });
      }
    }

    return c.json({
      success: true,
      results,
      summary: {
        total: results.total,
        deleted: results.deleted.length,
        failed: results.failed.length,
      },
    });
  } catch (error: any) {
    console.error('Error deleting transactions:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// EXPORT TRANSACTIONS TO CSV
// ============================================================================

app.post('/batch/export', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { transaction_ids, format } = await c.req.json();

    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return c.json({ error: 'Transaction IDs array is required' }, 400);
    }

    const transactions = [];
    
    for (const transactionId of transaction_ids) {
      const transaction = await kv.get(`transaction:${companyId}:${transactionId}`);
      if (transaction) {
        transactions.push(transaction);
      }
    }

    // Generate CSV
    const headers = [
      'ID',
      'Reference',
      'Date',
      'Customer',
      'Amount',
      'Fee',
      'Net',
      'Status',
      'Type',
      'Gateway',
      'Description',
    ];

    const rows = transactions.map((t: any) => [
      t.id,
      t.reference_number || '',
      t.transaction_date,
      t.customer_id || '',
      t.amount,
      t.fee_amount || 0,
      t.net_amount || t.amount,
      t.status,
      t.type,
      t.gateway,
      t.description || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transactions-export-${Date.now()}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting transactions:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
