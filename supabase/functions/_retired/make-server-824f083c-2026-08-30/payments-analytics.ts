/**
 * Payment Analytics API
 * 
 * Server-side payment statistics and analytics.
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

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ============================================================================
// GET PAYMENT STATISTICS
// ============================================================================

app.get('/stats', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    // Get all transactions
    const prefix = `transaction:${companyId}:`;
    const allTransactions = await kv.getByPrefix(prefix);

    // Calculate statistics
    const stats = {
      total_transactions: allTransactions.length,
      completed_transactions: 0,
      pending_transactions: 0,
      failed_transactions: 0,
      total_revenue: 0,
      total_refunded: 0,
      net_revenue: 0,
      total_fees: 0,
      average_transaction_amount: 0,
      transactions_this_month: 0,
      revenue_this_month: 0,
      top_payment_methods: [] as Array<{ method: string; count: number; total_amount: number }>,
    };

    const monthStart = getMonthStart();
    const paymentMethodCounts: Record<string, { count: number; total_amount: number }> = {};

    for (const transaction of allTransactions) {
      // Count by status
      if (transaction.status === 'completed') {
        stats.completed_transactions++;
      } else if (transaction.status === 'pending' || transaction.status === 'processing') {
        stats.pending_transactions++;
      } else if (transaction.status === 'failed') {
        stats.failed_transactions++;
      }

      // Revenue calculations (only for completed payments)
      if (transaction.status === 'completed') {
        if (transaction.type === 'payment' || transaction.type === 'charge') {
          stats.total_revenue += transaction.amount;
          stats.total_fees += transaction.fee_amount || 0;
          
          // This month
          const transDate = new Date(transaction.transaction_date);
          if (transDate >= monthStart) {
            stats.transactions_this_month++;
            stats.revenue_this_month += transaction.amount;
          }

          // Payment method tracking
          if (transaction.payment_method_id) {
            const method = await kv.get(`payment_method:${companyId}:${transaction.payment_method_id}`);
            if (method) {
              const methodType = method.type || 'unknown';
              if (!paymentMethodCounts[methodType]) {
                paymentMethodCounts[methodType] = { count: 0, total_amount: 0 };
              }
              paymentMethodCounts[methodType].count++;
              paymentMethodCounts[methodType].total_amount += transaction.amount;
            }
          }
        } else if (transaction.type === 'refund') {
          stats.total_refunded += transaction.amount;
        }
      }
    }

    // Calculate net revenue
    stats.net_revenue = stats.total_revenue - stats.total_fees - stats.total_refunded;

    // Calculate average
    if (stats.completed_transactions > 0) {
      stats.average_transaction_amount = stats.total_revenue / stats.completed_transactions;
    }

    // Format top payment methods
    stats.top_payment_methods = Object.entries(paymentMethodCounts)
      .map(([method, data]) => ({
        method,
        count: data.count,
        total_amount: data.total_amount,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 5);

    return c.json(stats);
  } catch (error: any) {
    console.error('Error fetching payment stats:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET REVENUE CHART DATA
// ============================================================================

app.get('/revenue-chart', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const period = c.req.query('period') || 'month'; // day, week, month, year
    const limit = parseInt(c.req.query('limit') || '30');

    // Get all completed transactions
    const prefix = `transaction:${companyId}:`;
    const allTransactions = await kv.getByPrefix(prefix);
    const completed = allTransactions.filter((t: any) => 
      t.status === 'completed' && (t.type === 'payment' || t.type === 'charge')
    );

    // Group by date
    const dataPoints: Record<string, number> = {};

    for (const transaction of completed) {
      const date = new Date(transaction.transaction_date);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      dataPoints[key] = (dataPoints[key] || 0) + transaction.amount;
    }

    // Convert to array and sort
    const chartData = Object.entries(dataPoints)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);

    return c.json({
      period,
      data: chartData,
    });
  } catch (error: any) {
    console.error('Error fetching revenue chart:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET TRANSACTION TRENDS
// ============================================================================

app.get('/trends', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const days = parseInt(c.req.query('days') || '30');

    // Get all transactions
    const prefix = `transaction:${companyId}:`;
    const allTransactions = await kv.getByPrefix(prefix);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Filter to date range
    const recentTransactions = allTransactions.filter((t: any) => 
      new Date(t.transaction_date) >= cutoffDate
    );

    // Calculate trends
    const trends = {
      period_days: days,
      total_transactions: recentTransactions.length,
      total_revenue: 0,
      total_fees: 0,
      success_rate: 0,
      average_transaction: 0,
      by_status: {
        completed: 0,
        pending: 0,
        failed: 0,
        refunded: 0,
      },
      by_gateway: {} as Record<string, number>,
      daily_averages: {
        transactions: 0,
        revenue: 0,
      },
    };

    let completedCount = 0;

    for (const transaction of recentTransactions) {
      // Status counts
      if (transaction.status === 'completed') {
        trends.by_status.completed++;
        completedCount++;
        
        if (transaction.type === 'payment' || transaction.type === 'charge') {
          trends.total_revenue += transaction.amount;
          trends.total_fees += transaction.fee_amount || 0;
        }
      } else if (transaction.status === 'pending' || transaction.status === 'processing') {
        trends.by_status.pending++;
      } else if (transaction.status === 'failed') {
        trends.by_status.failed++;
      } else if (transaction.status === 'refunded' || transaction.status === 'partially_refunded') {
        trends.by_status.refunded++;
      }

      // Gateway counts
      const gateway = transaction.gateway;
      trends.by_gateway[gateway] = (trends.by_gateway[gateway] || 0) + 1;
    }

    // Calculate rates and averages
    if (recentTransactions.length > 0) {
      trends.success_rate = (completedCount / recentTransactions.length) * 100;
    }

    if (completedCount > 0) {
      trends.average_transaction = trends.total_revenue / completedCount;
    }

    trends.daily_averages.transactions = recentTransactions.length / days;
    trends.daily_averages.revenue = trends.total_revenue / days;

    return c.json(trends);
  } catch (error: any) {
    console.error('Error fetching trends:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET CUSTOMER PAYMENT ANALYTICS
// ============================================================================

app.get('/customer-analytics/:customerId', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { customerId } = c.req.param();

    // Get all transactions for this customer
    const prefix = `transaction:${companyId}:`;
    const allTransactions = await kv.getByPrefix(prefix);
    const customerTransactions = allTransactions.filter((t: any) => t.customer_id === customerId);

    const analytics = {
      customer_id: customerId,
      lifetime_value: 0,
      total_transactions: customerTransactions.length,
      completed_transactions: 0,
      failed_transactions: 0,
      total_refunded: 0,
      average_transaction: 0,
      first_transaction_date: null as string | null,
      last_transaction_date: null as string | null,
      preferred_payment_method: null as string | null,
      payment_methods_used: [] as string[],
    };

    const methodCounts: Record<string, number> = {};
    let completedRevenue = 0;
    let completedCount = 0;

    for (const transaction of customerTransactions) {
      // Dates
      const transDate = transaction.transaction_date;
      if (!analytics.first_transaction_date || transDate < analytics.first_transaction_date) {
        analytics.first_transaction_date = transDate;
      }
      if (!analytics.last_transaction_date || transDate > analytics.last_transaction_date) {
        analytics.last_transaction_date = transDate;
      }

      // Status counts
      if (transaction.status === 'completed') {
        analytics.completed_transactions++;
        completedCount++;
        
        if (transaction.type === 'payment' || transaction.type === 'charge') {
          completedRevenue += transaction.amount;
        } else if (transaction.type === 'refund') {
          analytics.total_refunded += transaction.amount;
        }
      } else if (transaction.status === 'failed') {
        analytics.failed_transactions++;
      }

      // Payment method tracking
      if (transaction.payment_method_id) {
        const method = await kv.get(`payment_method:${companyId}:${transaction.payment_method_id}`);
        if (method) {
          const methodType = method.type;
          methodCounts[methodType] = (methodCounts[methodType] || 0) + 1;
          
          if (!analytics.payment_methods_used.includes(methodType)) {
            analytics.payment_methods_used.push(methodType);
          }
        }
      }
    }

    // Calculate lifetime value and average
    analytics.lifetime_value = completedRevenue - analytics.total_refunded;
    if (completedCount > 0) {
      analytics.average_transaction = completedRevenue / completedCount;
    }

    // Find preferred payment method
    if (Object.keys(methodCounts).length > 0) {
      analytics.preferred_payment_method = Object.entries(methodCounts)
        .sort(([, a], [, b]) => b - a)[0][0];
    }

    return c.json(analytics);
  } catch (error: any) {
    console.error('Error fetching customer analytics:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
