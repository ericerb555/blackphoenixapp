/**
 * Payment Schedules API
 * 
 * Server-side recurring payment management.
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

function calculateNextChargeDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'annually':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      break;
  }

  return date.toISOString();
}

// ============================================================================
// GET SCHEDULES (LIST WITH FILTERS)
// ============================================================================

app.get('/schedules', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const customerId = c.req.query('customer_id');

    // Get all schedules for this company
    const prefix = `payment_schedule:${companyId}:`;
    const allSchedules = await kv.getByPrefix(prefix);

    // Filter schedules
    let filtered = allSchedules.filter((s: any) => {
      if (customerId && s.customer_id !== customerId) return false;
      return true;
    });

    // Sort by created date (newest first)
    filtered.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Get related data
    const schedulesWithRelations = await Promise.all(
      filtered.map(async (schedule: any) => {
        const relations: any = {};

        // Get customer
        if (schedule.customer_id) {
          const customer = await kv.get(`customer:${companyId}:${schedule.customer_id}`);
          if (customer) relations.customer = customer;
        }

        // Get payment method
        if (schedule.payment_method_id) {
          const method = await kv.get(`payment_method:${companyId}:${schedule.payment_method_id}`);
          if (method) relations.payment_method = method;
        }

        return { ...schedule, ...relations };
      })
    );

    return c.json({
      schedules: schedulesWithRelations,
      total: schedulesWithRelations.length,
    });
  } catch (error: any) {
    console.error('Error fetching payment schedules:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET SINGLE SCHEDULE
// ============================================================================

app.get('/schedules/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const schedule = await kv.get(`payment_schedule:${companyId}:${id}`);

    if (!schedule) {
      return c.json({ error: 'Payment schedule not found' }, 404);
    }

    // Get related data
    const relations: any = {};

    if (schedule.customer_id) {
      const customer = await kv.get(`customer:${companyId}:${schedule.customer_id}`);
      if (customer) relations.customer = customer;
    }

    if (schedule.payment_method_id) {
      const method = await kv.get(`payment_method:${companyId}:${schedule.payment_method_id}`);
      if (method) relations.payment_method = method;
    }

    return c.json({ ...schedule, ...relations });
  } catch (error: any) {
    console.error('Error fetching payment schedule:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CREATE SCHEDULE
// ============================================================================

app.post('/schedules', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const data = await c.req.json();

    // Validate required fields
    if (!data.customer_id || !data.payment_method_id || !data.name || data.amount === undefined || !data.frequency || !data.start_date) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Verify payment method exists
    const paymentMethod = await kv.get(`payment_method:${companyId}:${data.payment_method_id}`);
    if (!paymentMethod) {
      return c.json({ error: 'Payment method not found' }, 404);
    }

    // Verify customer exists
    const customer = await kv.get(`customer:${companyId}:${data.customer_id}`);
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    const schedule = {
      id: generateId(),
      company_id: companyId,
      customer_id: data.customer_id,
      payment_method_id: data.payment_method_id,
      name: data.name,
      description: data.description || null,
      amount: data.amount,
      currency: data.currency || 'USD',
      frequency: data.frequency,
      start_date: data.start_date,
      end_date: data.end_date || null,
      next_charge_date: data.start_date,
      status: 'active',
      total_charges: 0,
      successful_charges: 0,
      failed_charges: 0,
      total_amount_charged: 0,
      metadata: data.metadata || {},
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };

    await kv.set(`payment_schedule:${companyId}:${schedule.id}`, schedule);

    return c.json(schedule, 201);
  } catch (error: any) {
    console.error('Error creating payment schedule:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// PAUSE SCHEDULE
// ============================================================================

app.post('/schedules/:id/pause', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const schedule = await kv.get(`payment_schedule:${companyId}:${id}`);

    if (!schedule) {
      return c.json({ error: 'Payment schedule not found' }, 404);
    }

    if (schedule.status !== 'active') {
      return c.json({ error: 'Can only pause active schedules' }, 400);
    }

    schedule.status = 'paused';
    schedule.updated_at = getCurrentTimestamp();

    await kv.set(`payment_schedule:${companyId}:${id}`, schedule);

    return c.json(schedule);
  } catch (error: any) {
    console.error('Error pausing schedule:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// RESUME SCHEDULE
// ============================================================================

app.post('/schedules/:id/resume', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const schedule = await kv.get(`payment_schedule:${companyId}:${id}`);

    if (!schedule) {
      return c.json({ error: 'Payment schedule not found' }, 404);
    }

    if (schedule.status !== 'paused') {
      return c.json({ error: 'Can only resume paused schedules' }, 400);
    }

    schedule.status = 'active';
    schedule.updated_at = getCurrentTimestamp();

    await kv.set(`payment_schedule:${companyId}:${id}`, schedule);

    return c.json(schedule);
  } catch (error: any) {
    console.error('Error resuming schedule:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CANCEL SCHEDULE
// ============================================================================

app.post('/schedules/:id/cancel', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const schedule = await kv.get(`payment_schedule:${companyId}:${id}`);

    if (!schedule) {
      return c.json({ error: 'Payment schedule not found' }, 404);
    }

    if (schedule.status === 'completed' || schedule.status === 'cancelled') {
      return c.json({ error: 'Schedule is already completed or cancelled' }, 400);
    }

    schedule.status = 'cancelled';
    schedule.updated_at = getCurrentTimestamp();

    await kv.set(`payment_schedule:${companyId}:${id}`, schedule);

    return c.json({ message: 'Payment schedule cancelled' });
  } catch (error: any) {
    console.error('Error cancelling schedule:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// PROCESS DUE CHARGES (CRON JOB)
// ============================================================================

app.post('/schedules/process-due', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const now = new Date();
    const prefix = `payment_schedule:${companyId}:`;
    const allSchedules = await kv.getByPrefix(prefix);

    const processedSchedules = [];
    const errors = [];

    for (const schedule of allSchedules) {
      // Skip non-active schedules
      if (schedule.status !== 'active') continue;

      // Check if charge is due
      const nextChargeDate = new Date(schedule.next_charge_date);
      if (nextChargeDate > now) continue;

      // Check if end date has passed
      if (schedule.end_date && new Date(schedule.end_date) < now) {
        schedule.status = 'completed';
        schedule.updated_at = getCurrentTimestamp();
        await kv.set(`payment_schedule:${companyId}:${schedule.id}`, schedule);
        continue;
      }

      try {
        // Get payment method
        const paymentMethod = await kv.get(`payment_method:${companyId}:${schedule.payment_method_id}`);
        if (!paymentMethod) {
          errors.push({ schedule_id: schedule.id, error: 'Payment method not found' });
          continue;
        }

        // Process charge (simplified - in production would call payment gateway)
        const transactionId = generateId();
        const transaction = {
          id: transactionId,
          company_id: companyId,
          customer_id: schedule.customer_id,
          payment_method_id: schedule.payment_method_id,
          type: 'payment',
          status: 'completed',
          gateway: paymentMethod.gateway,
          gateway_transaction_id: `ch_${generateId().replace(/-/g, '')}`,
          amount: schedule.amount,
          currency: schedule.currency,
          fee_amount: (schedule.amount * 0.029) + 0.30,
          net_amount: schedule.amount - ((schedule.amount * 0.029) + 0.30),
          description: `Recurring payment: ${schedule.name}`,
          reference_number: `REC-${Date.now()}`,
          transaction_date: getCurrentTimestamp(),
          processed_at: getCurrentTimestamp(),
          metadata: { schedule_id: schedule.id },
          created_at: getCurrentTimestamp(),
          updated_at: getCurrentTimestamp(),
        };

        await kv.set(`transaction:${companyId}:${transactionId}`, transaction);

        // Update schedule
        schedule.total_charges += 1;
        schedule.successful_charges += 1;
        schedule.total_amount_charged += schedule.amount;
        schedule.next_charge_date = calculateNextChargeDate(schedule.next_charge_date, schedule.frequency);
        schedule.updated_at = getCurrentTimestamp();

        await kv.set(`payment_schedule:${companyId}:${schedule.id}`, schedule);

        processedSchedules.push({
          schedule_id: schedule.id,
          transaction_id: transactionId,
          amount: schedule.amount,
        });
      } catch (error: any) {
        // Mark as failed charge
        schedule.total_charges += 1;
        schedule.failed_charges += 1;
        schedule.updated_at = getCurrentTimestamp();
        await kv.set(`payment_schedule:${companyId}:${schedule.id}`, schedule);

        errors.push({
          schedule_id: schedule.id,
          error: error.message,
        });
      }
    }

    return c.json({
      processed: processedSchedules.length,
      errors: errors.length,
      details: {
        processed: processedSchedules,
        errors,
      },
    });
  } catch (error: any) {
    console.error('Error processing due charges:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
