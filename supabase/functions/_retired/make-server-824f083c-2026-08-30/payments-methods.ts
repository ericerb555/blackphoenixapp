/**
 * Payment Methods API
 * 
 * Server-side payment method management.
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
// GET PAYMENT METHODS (LIST WITH FILTERS)
// ============================================================================

app.get('/methods', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    // Get query parameters
    const customerId = c.req.query('customer_id');
    const type = c.req.query('type');
    const gateway = c.req.query('gateway');
    const isDefault = c.req.query('is_default');

    // Get all payment methods for this company
    const prefix = `payment_method:${companyId}:`;
    const allMethods = await kv.getByPrefix(prefix);

    // Filter methods
    let filtered = allMethods.filter((m: any) => {
      if (customerId && m.customer_id !== customerId) return false;
      if (type && m.type !== type) return false;
      if (gateway && m.gateway !== gateway) return false;
      if (isDefault !== undefined) {
        const defaultBool = isDefault === 'true';
        if (m.is_default !== defaultBool) return false;
      }
      return true;
    });

    // Sort by default first, then by created date
    filtered.sort((a: any, b: any) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return c.json({
      payment_methods: filtered,
      total: filtered.length,
    });
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET SINGLE PAYMENT METHOD
// ============================================================================

app.get('/methods/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const method = await kv.get(`payment_method:${companyId}:${id}`);

    if (!method) {
      return c.json({ error: 'Payment method not found' }, 404);
    }

    return c.json(method);
  } catch (error: any) {
    console.error('Error fetching payment method:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CREATE PAYMENT METHOD
// ============================================================================

app.post('/methods', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const data = await c.req.json();

    // Validate required fields
    if (!data.type) {
      return c.json({ error: 'Payment method type is required' }, 400);
    }

    // For Stripe, would create payment method via API
    let gatewayPaymentMethodId = data.gateway_payment_method_id;
    
    if (data.gateway === 'stripe' && !gatewayPaymentMethodId) {
      // In production, would call Stripe API to create payment method:
      // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      // const paymentMethod = await stripe.paymentMethods.create({
      //   type: 'card',
      //   card: { token: data.stripe_token },
      // });
      // gatewayPaymentMethodId = paymentMethod.id;
      
      // For now, simulate
      gatewayPaymentMethodId = `pm_${generateId().replace(/-/g, '')}`;
    }

    const method = {
      id: generateId(),
      company_id: companyId,
      customer_id: data.customer_id || null,
      type: data.type,
      gateway: data.gateway || 'manual',
      gateway_payment_method_id: gatewayPaymentMethodId,
      is_default: data.is_default || false,
      
      // Card details (display only)
      card_brand: data.card_brand || null,
      card_last4: data.card_last4 || null,
      card_exp_month: data.card_exp_month || null,
      card_exp_year: data.card_exp_year || null,
      
      // Bank details
      bank_name: data.bank_name || null,
      bank_account_last4: data.bank_account_last4 || null,
      bank_account_type: data.bank_account_type || null,
      bank_routing_number: data.bank_routing_number || null,
      
      // Billing details
      billing_name: data.billing_name || null,
      billing_email: data.billing_email || null,
      billing_phone: data.billing_phone || null,
      billing_address_line1: data.billing_address_line1 || null,
      billing_address_line2: data.billing_address_line2 || null,
      billing_city: data.billing_city || null,
      billing_state: data.billing_state || null,
      billing_zip: data.billing_zip || null,
      billing_country: data.billing_country || 'US',
      
      metadata: data.metadata || {},
      created_at: getCurrentTimestamp(),
      updated_at: getCurrentTimestamp(),
    };

    // If this is set as default, unset other defaults
    if (method.is_default && method.customer_id) {
      const prefix = `payment_method:${companyId}:`;
      const allMethods = await kv.getByPrefix(prefix);
      
      for (const m of allMethods) {
        if (m.customer_id === method.customer_id && m.is_default && m.id !== method.id) {
          m.is_default = false;
          m.updated_at = getCurrentTimestamp();
          await kv.set(`payment_method:${companyId}:${m.id}`, m);
        }
      }
    }

    await kv.set(`payment_method:${companyId}:${method.id}`, method);

    return c.json(method, 201);
  } catch (error: any) {
    console.error('Error creating payment method:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// UPDATE PAYMENT METHOD
// ============================================================================

app.put('/methods/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const data = await c.req.json();

    const method = await kv.get(`payment_method:${companyId}:${id}`);
    if (!method) {
      return c.json({ error: 'Payment method not found' }, 404);
    }

    // Update allowed fields
    const updatableFields = [
      'billing_name',
      'billing_email',
      'billing_phone',
      'billing_address_line1',
      'billing_address_line2',
      'billing_city',
      'billing_state',
      'billing_zip',
      'billing_country',
      'metadata',
    ];

    for (const field of updatableFields) {
      if (data[field] !== undefined) {
        method[field] = data[field];
      }
    }

    method.updated_at = getCurrentTimestamp();

    await kv.set(`payment_method:${companyId}:${id}`, method);

    return c.json(method);
  } catch (error: any) {
    console.error('Error updating payment method:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// SET DEFAULT PAYMENT METHOD
// ============================================================================

app.post('/methods/:id/set-default', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const { customer_id } = await c.req.json();

    const method = await kv.get(`payment_method:${companyId}:${id}`);
    if (!method) {
      return c.json({ error: 'Payment method not found' }, 404);
    }

    if (method.customer_id !== customer_id) {
      return c.json({ error: 'Payment method does not belong to this customer' }, 400);
    }

    // Unset other defaults for this customer
    const prefix = `payment_method:${companyId}:`;
    const allMethods = await kv.getByPrefix(prefix);
    
    for (const m of allMethods) {
      if (m.customer_id === customer_id && m.is_default && m.id !== id) {
        m.is_default = false;
        m.updated_at = getCurrentTimestamp();
        await kv.set(`payment_method:${companyId}:${m.id}`, m);
      }
    }

    // Set this method as default
    method.is_default = true;
    method.updated_at = getCurrentTimestamp();
    await kv.set(`payment_method:${companyId}:${id}`, method);

    return c.json(method);
  } catch (error: any) {
    console.error('Error setting default payment method:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DELETE PAYMENT METHOD
// ============================================================================

app.delete('/methods/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { id } = c.req.param();
    const method = await kv.get(`payment_method:${companyId}:${id}`);

    if (!method) {
      return c.json({ error: 'Payment method not found' }, 404);
    }

    // If Stripe, would detach from customer:
    // if (method.gateway === 'stripe' && method.gateway_payment_method_id) {
    //   const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    //   await stripe.paymentMethods.detach(method.gateway_payment_method_id);
    // }

    await kv.del(`payment_method:${companyId}:${id}`);

    return c.json({ message: 'Payment method deleted' });
  } catch (error: any) {
    console.error('Error deleting payment method:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// VERIFY CARD (LUHN ALGORITHM)
// ============================================================================

app.post('/methods/verify-card', async (c) => {
  try {
    const { card_number } = await c.req.json();

    if (!card_number) {
      return c.json({ error: 'Card number required' }, 400);
    }

    // Luhn algorithm
    const cleaned = card_number.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    const valid = sum % 10 === 0;

    // Detect card brand
    let brand = null;
    if (/^4/.test(cleaned)) brand = 'visa';
    else if (/^(5[1-5]|2[2-7])/.test(cleaned)) brand = 'mastercard';
    else if (/^3[47]/.test(cleaned)) brand = 'amex';
    else if (/^6(?:011|5)/.test(cleaned)) brand = 'discover';

    return c.json({
      valid,
      brand,
      last4: cleaned.slice(-4),
    });
  } catch (error: any) {
    console.error('Error verifying card:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
