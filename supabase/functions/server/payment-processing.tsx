/**
 * Unified Payment Processing System
 * Handles both eCommerce orders and subscription payments with tracking codes
 */

import { Hono } from 'npm:hono@4.13.19';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import * as kv from './kv_store.tsx';
import { recordEntitlementEvent } from './entitlements.tsx';
import { isTrustedStaff } from './trustedRole.ts';
import { mayReadRecord } from './recordOwnership.ts';

const app = new Hono();

/**
 * Who is asking, and are they staff.
 *
 * WHY THIS FILE NEEDED ONE AT ALL
 *
 * Every route here passed the auth wall in `index.tsx` and then checked
 * nothing. The wall only establishes that somebody is signed in, and every
 * portal customer, tenant, vendor and subcontractor is signed in — so
 * `/payment/ecommerce/orders/customer/:email` returned any customer's full
 * order history to anyone who typed their address into the path, and
 * `/payment/ecommerce/order/:orderId/status` let any of them mark an unpaid
 * order shipped. Six of the twenty-five findings in
 * `docs/server-route-authorization.md` are in this one file.
 *
 * One lookup, both answers. `isTrustedStaff` reads `app_metadata` only, which
 * is the bag an account cannot write for itself — see `trustedRole.ts` for the
 * eleven checks that used to read `user_metadata` and what that allowed.
 */
let cachedAdmin: any = null;
function adminClient() {
  if (!cachedAdmin) {
    cachedAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );
  }
  return cachedAdmin;
}

async function actor(c: any): Promise<{ email: string; staff: boolean } | null> {
  const token = String(c.req.header('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const { data, error } = await adminClient().auth.getUser(token);
    if (error || !data?.user) return null;
    return {
      email: String(data.user.email || '').toLowerCase(),
      staff: isTrustedStaff(data.user),
    };
  } catch {
    // Fail closed. An identity we could not establish is not an identity.
    return null;
  }
}

/**
 * May this caller see this record?
 *
 * Staff see everything. Everybody else sees their own and nothing else, and
 * "not yours" is answered exactly like "does not exist" — telling a stranger
 * that an order code is real but belongs to somebody else is still telling
 * them something.
 *
 * The rule itself lives in `recordOwnership.ts`, which has no imports so that
 * `tests/recordOwnership.test.ts` can load it. This file cannot be tested that
 * way — it imports `npm:` specifiers — and the unowned-record case in
 * particular fails open if written the obvious way.
 */
const mayRead = mayReadRecord;

// Generate unique tracking codes
function generateOrderCode(): string {
  const prefix = 'ORD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generatePaymentCode(): string {
  const prefix = 'PAY';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function generateTransactionId(): string {
  const prefix = 'TXN';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export interface EcommerceOrder {
  orderId: string;
  orderCode: string; // ORD-XXX-XXX
  transactionId: string; // TXN-XXX-XXX
  type: 'ecommerce';
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  customer: {
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  billingAddress: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    vendorId: string;
    vendorName: string;
  }>;
  pricing: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
  };
  payment: {
    method: string;
    last4: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    transactionId: string;
    processedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
  tracking?: {
    carrier?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  };
}

export interface SubscriptionPayment {
  paymentId: string;
  paymentCode: string; // PAY-XXX-XXX
  transactionId: string; // TXN-XXX-XXX
  type: 'subscription';
  subscriptionId: string;
  subscriptionName: string;
  planName: string;
  amount: number;
  billingCycle: string;
  customer: {
    name: string;
    email: string;
  };
  payment: {
    method: string;
    last4: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    transactionId: string;
    processedAt?: string;
  };
  invoiceUrl?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  paidDate?: string;
}

// ============================================================================
// ECOMMERCE ORDER PROCESSING
// ============================================================================

// Create eCommerce order
app.post('/ecommerce/create-order', async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, customer, shippingAddress, billingAddress, payment, items, pricing } = body;

    // Validate required fields
    if (!customer || !shippingAddress || !items || !pricing) {
      return c.json({ error: 'Missing required order information' }, 400);
    }

    // Generate tracking codes
    const orderCode = generateOrderCode();
    const transactionId = generateTransactionId();
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const order: EcommerceOrder = {
      orderId,
      orderCode,
      transactionId,
      type: 'ecommerce',
      status: 'pending',
      customer,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      items,
      pricing,
      payment: {
        method: payment.method,
        last4: payment.last4,
        status: 'pending',
        transactionId
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save order
    await kv.set(`ecommerce_order:${orderId}`, order);
    await kv.set(`order_code:${orderCode}`, orderId); // Lookup by code
    await kv.set(`transaction:${transactionId}`, { orderId, type: 'ecommerce' });

    // Add to customer's orders
    const customerOrders = await kv.get(`customer_orders:${customer.email}`) || [];
    customerOrders.push(orderId);
    await kv.set(`customer_orders:${customer.email}`, customerOrders);

    // Process payment (simulate)
    await processEcommercePayment(orderId, order);

    console.log(`✅ eCommerce order created: ${orderCode} (${orderId})`);

    return c.json({ 
      success: true, 
      order: {
        orderId,
        orderCode,
        transactionId,
        status: order.status,
        total: order.pricing.total
      }
    });

  } catch (error) {
    console.error('Error creating eCommerce order:', error);
    return c.json({ error: 'Failed to create order', details: error.message }, 500);
  }
});

// Get eCommerce order by code
app.get('/ecommerce/order/:orderCode', async (c) => {
  try {
    const orderCode = c.req.param('orderCode');
    
    // Lookup order ID by code
    const orderId = await kv.get(`order_code:${orderCode}`);
    if (!orderId) {
      return c.json({ error: 'Order not found' }, 404);
    }

    const order = await kv.get(`ecommerce_order:${orderId}`);
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    // Theirs, or staff. Same answer as a missing order, deliberately — an
    // order code is short enough to guess at, and "that one exists but is not
    // yours" is a confirmation worth nothing to its owner and something to
    // everybody else.
    if (!mayRead(await actor(c), order)) {
      return c.json({ error: 'Order not found' }, 404);
    }

    return c.json({ order });
  } catch (error) {
    console.error('Error fetching order:', error);
    return c.json({ error: 'Failed to fetch order', details: error.message }, 500);
  }
});

// Get customer's eCommerce orders
app.get('/ecommerce/orders/customer/:email', async (c) => {
  try {
    const email = c.req.param('email');

    /*
     * Your own history, or staff.
     *
     * This was the plainest of the twenty-five: the email came out of the path
     * and nothing compared it to the caller. Any signed-in account — a tenant,
     * a vendor, a subcontractor, anyone who completed signup — got a named
     * customer's complete order history, with items, totals and addresses, by
     * typing their address into the URL.
     *
     * Compared case-insensitively because the path carries whatever the
     * browser sent and the token carries whatever Supabase stored.
     */
    /*
     * THIS DENIAL IS INVISIBLE FROM OUTSIDE, SO IT HAS TO BE VISIBLE FROM IN.
     *
     * The empty list is deliberate — a stranger asking about an address with
     * no orders and a stranger asking about somebody else's orders get the
     * same answer, which is the point. But it made the fix unverifiable: the
     * authorisation probe recorded this route as a 200 and scored it as a
     * breach, because from the outside a correct refusal and an empty history
     * are the same bytes. Only reading the code could tell them apart.
     *
     * A control nobody can verify in production is not much of a control. The
     * 403 guards are covered by the denial logger in `index.tsx`; this branch
     * is not, because it answers 200. So it says so itself.
     */
    const who = await actor(c);
    if (!who || (!who.staff && who.email !== String(email || '').toLowerCase())) {
      console.warn(
        `[authz] DENIED-200 GET /payment/ecommerce/orders/customer/:email` +
        ` actor=${who?.email || 'unresolved'} asked-about=${String(email || '').toLowerCase()}`,
      );
      return c.json({ orders: [] });
    }

    const orderIds = await kv.get(`customer_orders:${email}`) || [];
    
    const orders = await Promise.all(
      orderIds.map(async (id: string) => await kv.get(`ecommerce_order:${id}`))
    );

    // Filter out null and sort by date
    const validOrders = orders
      .filter(o => o)
      .sort((a: EcommerceOrder, b: EcommerceOrder) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return c.json({ orders: validOrders });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return c.json({ error: 'Failed to fetch orders', details: error.message }, 500);
  }
});

// Update order status
app.patch('/ecommerce/order/:orderId/status', async (c) => {
  try {
    /*
     * Staff only, and not the customer whose order it is.
     *
     * Fulfilment state is the company's claim about what it has done, not the
     * buyer's. Scoping this to the owner the way the reads above are scoped
     * would still let a customer mark their own unpaid order "delivered" and
     * attach a tracking number to it — which is the same hole with a smaller
     * blast radius, not a fix.
     */
    const who = await actor(c);
    if (!who?.staff) {
      return c.json({ error: 'Company access is required for this.' }, 403);
    }

    const orderId = c.req.param('orderId');
    const { status, tracking } = await c.req.json();

    const order = await kv.get(`ecommerce_order:${orderId}`) as EcommerceOrder;
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    if (tracking) {
      order.tracking = tracking;
    }

    await kv.set(`ecommerce_order:${orderId}`, order);

    console.log(`📦 Order ${order.orderCode} status updated to: ${status}`);

    return c.json({ success: true, order });
  } catch (error) {
    console.error('Error updating order status:', error);
    return c.json({ error: 'Failed to update order', details: error.message }, 500);
  }
});

// ============================================================================
// SUBSCRIPTION PAYMENT PROCESSING
// ============================================================================

// Process subscription payment
app.post('/subscription/process-payment', async (c) => {
  try {
    const body = await c.req.json();
    const { subscriptionId, amount, paymentMethod, customer } = body;

    if (!subscriptionId || !amount || !paymentMethod) {
      return c.json({ error: 'Missing required payment information' }, 400);
    }

    // Get subscription details
    const subscription = await kv.get(`subscription:${subscriptionId}`);
    if (!subscription) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    // Generate tracking codes
    const paymentCode = generatePaymentCode();
    const transactionId = generateTransactionId();
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payment: SubscriptionPayment = {
      paymentId,
      paymentCode,
      transactionId,
      type: 'subscription',
      subscriptionId,
      subscriptionName: subscription.customerName || subscription.stakeholderName,
      planName: subscription.planName || subscription.plan,
      amount,
      billingCycle: subscription.billingCycle || 'monthly',
      customer: {
        name: customer.name || subscription.customerName,
        email: customer.email || subscription.stakeholderEmail
      },
      payment: {
        method: paymentMethod.type,
        last4: paymentMethod.last4,
        status: 'pending',
        transactionId
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: new Date().toISOString()
    };

    // Save payment
    await kv.set(`subscription_payment:${paymentId}`, payment);
    await kv.set(`payment_code:${paymentCode}`, paymentId);
    await kv.set(`transaction:${transactionId}`, { paymentId, type: 'subscription' });

    // Add to subscription's payment history
    const paymentHistory = subscription.paymentHistory || [];
    paymentHistory.push({
      paymentId,
      paymentCode,
      transactionId,
      amount,
      date: new Date().toISOString(),
      status: 'pending',
      method: paymentMethod.type
    });
    subscription.paymentHistory = paymentHistory;
    await kv.set(`subscription:${subscriptionId}`, subscription);

    // Do not simulate success or grant hours from a browser request. A verified
    // processor confirmation must use the protected /payments/confirm route.
    payment.payment.status = 'pending';
    await kv.set(`subscription_payment:${paymentId}`, payment);
    console.log(`💳 Subscription payment awaiting confirmation: ${paymentCode} (${paymentId})`);

    return c.json({ 
      success: true, 
      payment: {
        paymentId,
        paymentCode,
        transactionId,
        status: payment.payment.status,
        amount: payment.amount
      }
    });

  } catch (error) {
    console.error('Error processing subscription payment:', error);
    return c.json({ error: 'Failed to process payment', details: error.message }, 500);
  }
});

// Get subscription payment by code
app.get('/subscription/payment/:paymentCode', async (c) => {
  try {
    const paymentCode = c.req.param('paymentCode');
    
    const paymentId = await kv.get(`payment_code:${paymentCode}`);
    if (!paymentId) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    const payment = await kv.get(`subscription_payment:${paymentId}`);
    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    // Theirs, or staff. "Not yours" answers as "not found", as above.
    if (!mayRead(await actor(c), payment)) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    return c.json({ payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return c.json({ error: 'Failed to fetch payment', details: error.message }, 500);
  }
});

// Get subscription's payment history
app.get('/subscription/:subscriptionId/payments', async (c) => {
  try {
    const subscriptionId = c.req.param('subscriptionId');
    
    const subscription = await kv.get(`subscription:${subscriptionId}`);
    if (!subscription) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    // The subscription's own holder, or staff. A subscription id is not a
    // credential, and this is a financial record.
    if (!mayRead(await actor(c), subscription)) {
      return c.json({ error: 'Subscription not found' }, 404);
    }

    const paymentHistory = subscription.paymentHistory || [];

    return c.json({ payments: paymentHistory });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return c.json({ error: 'Failed to fetch payments', details: error.message }, 500);
  }
});

// ============================================================================
// TRANSACTION LOOKUP (UNIFIED)
// ============================================================================

// Get transaction by ID (works for both eCommerce and subscriptions)
app.get('/transaction/:transactionId', async (c) => {
  try {
    const transactionId = c.req.param('transactionId');
    
    const transaction = await kv.get(`transaction:${transactionId}`);
    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    let details;
    if (transaction.type === 'ecommerce') {
      details = await kv.get(`ecommerce_order:${transaction.orderId}`);
    } else if (transaction.type === 'subscription') {
      details = await kv.get(`subscription_payment:${transaction.paymentId}`);
    }

    /*
     * Checked against the record this transaction points AT, not the
     * transaction itself.
     *
     * A transaction row carries ids, not an email, so asking whether the
     * caller owns the transaction would always answer no and lock out the
     * customer along with everybody else. The order or the subscription
     * payment behind it is the thing that knows whose it is — and it is also
     * the part this route actually returns.
     *
     * A transaction whose details could not be loaded is refused rather than
     * returned bare: there is then nothing to check ownership against, and
     * handing back a record because we failed to find out who owns it is the
     * wrong direction to fail in.
     */
    if (!details || !mayRead(await actor(c), details)) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    return c.json({
      transaction: {
        ...transaction,
        details
      }
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return c.json({ error: 'Failed to fetch transaction', details: error.message }, 500);
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function processEcommercePayment(orderId: string, order: EcommerceOrder) {
  // Simulate payment processing
  setTimeout(async () => {
    const updatedOrder = await kv.get(`ecommerce_order:${orderId}`) as EcommerceOrder;
    if (updatedOrder) {
      updatedOrder.payment.status = 'completed';
      updatedOrder.payment.processedAt = new Date().toISOString();
      updatedOrder.status = 'processing';
      updatedOrder.updatedAt = new Date().toISOString();
      await kv.set(`ecommerce_order:${orderId}`, updatedOrder);
      console.log(`✅ Payment completed for order: ${updatedOrder.orderCode}`);
    }
  }, 2000);
}

// Subscription renewals are now recorded only through the protected
// /make-server-3eae23a6/payments/confirm handler in the main server.
// Keeping this module from auto-completing payments prevents duplicate hours.


export default app;
