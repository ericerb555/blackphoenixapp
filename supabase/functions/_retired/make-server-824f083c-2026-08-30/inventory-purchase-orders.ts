/**
 * Purchase Orders Routes
 * 
 * Server routes for purchase order management.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// PO key prefixes
const PO_PREFIX = 'purchase_order:';
const PO_LIST_PREFIX = 'po_list:';
const PO_COUNTER_PREFIX = 'po_counter:';

// Helper to verify user authentication
async function verifyAuth(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', user: null };
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { error: 'Unauthorized', user: null };
  }

  return { error: null, user };
}

// Get company ID from user metadata
function getCompanyId(user: any): string {
  return user.user_metadata?.company_id || user.id;
}

// Generate PO number
async function generatePONumber(companyId: string): Promise<string> {
  const counterKey = `${PO_COUNTER_PREFIX}${companyId}`;
  const counter = await kv.get(counterKey) || { value: 0 };
  const nextNumber = counter.value + 1;
  
  await kv.set(counterKey, { value: nextNumber });
  
  const year = new Date().getFullYear();
  const paddedNumber = String(nextNumber).padStart(5, '0');
  
  return `PO-${year}-${paddedNumber}`;
}

// ============================================================================
// PURCHASE ORDER ROUTES
// ============================================================================

// GET /make-server-824f083c/inventory/purchase-orders - List purchase orders
app.get('/make-server-824f083c/inventory/purchase-orders', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const { search, status, vendor_id, start_date, end_date, received } = c.req.query();

    // Get all POs for company
    const poList = await kv.getByPrefix(`${PO_LIST_PREFIX}${companyId}:`);
    let purchaseOrders = poList.map((po: any) => po.value);

    // Apply filters
    if (search) {
      const lowerSearch = search.toLowerCase();
      purchaseOrders = purchaseOrders.filter((po: any) => 
        po.po_number?.toLowerCase().includes(lowerSearch) ||
        po.vendor_name?.toLowerCase().includes(lowerSearch)
      );
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      purchaseOrders = purchaseOrders.filter((po: any) => statuses.includes(po.status));
    }

    if (vendor_id) {
      purchaseOrders = purchaseOrders.filter((po: any) => po.vendor_id === vendor_id);
    }

    if (start_date) {
      purchaseOrders = purchaseOrders.filter((po: any) => 
        po.order_date >= start_date
      );
    }

    if (end_date) {
      purchaseOrders = purchaseOrders.filter((po: any) => 
        po.order_date <= end_date
      );
    }

    if (received === 'true') {
      purchaseOrders = purchaseOrders.filter((po: any) => 
        po.status === 'received' || po.status === 'partially_received'
      );
    }

    return c.json({
      purchase_orders: purchaseOrders,
      total: purchaseOrders.length,
    });
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/purchase-orders/:id - Get purchase order
app.get('/make-server-824f083c/inventory/purchase-orders/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const po = await kv.get(`${PO_PREFIX}${id}`);

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    return c.json(po);
  } catch (error: any) {
    console.error('Error fetching purchase order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/purchase-orders - Create purchase order
app.post('/make-server-824f083c/inventory/purchase-orders', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const data = await c.req.json();

    // Generate PO number
    const poNumber = await generatePONumber(companyId);

    const po = {
      id: crypto.randomUUID(),
      company_id: companyId,
      po_number: poNumber,
      status: 'draft',
      payment_status: 'unpaid',
      amount_paid: 0,
      ...data,
      requested_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${PO_PREFIX}${po.id}`, po);
    await kv.set(`${PO_LIST_PREFIX}${companyId}:${po.id}`, po);

    return c.json(po, 201);
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /make-server-824f083c/inventory/purchase-orders/:id - Update purchase order
app.put('/make-server-824f083c/inventory/purchase-orders/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const data = await c.req.json();

    const existing = await kv.get(`${PO_PREFIX}${id}`);
    if (!existing) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    // Don't allow editing if already received
    if (existing.status === 'received' || existing.status === 'closed') {
      return c.json({ error: 'Cannot edit completed purchase order' }, 400);
    }

    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${PO_PREFIX}${id}`, updated);
    await kv.set(`${PO_LIST_PREFIX}${updated.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating purchase order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /make-server-824f083c/inventory/purchase-orders/:id - Delete purchase order
app.delete('/make-server-824f083c/inventory/purchase-orders/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const po = await kv.get(`${PO_PREFIX}${id}`);

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    // Only allow deleting draft POs
    if (po.status !== 'draft') {
      return c.json({ error: 'Can only delete draft purchase orders' }, 400);
    }

    await kv.del(`${PO_PREFIX}${id}`);
    await kv.del(`${PO_LIST_PREFIX}${po.company_id}:${id}`);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting purchase order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/purchase-orders/:id/submit - Submit PO
app.post('/make-server-824f083c/inventory/purchase-orders/:id/submit', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const po = await kv.get(`${PO_PREFIX}${id}`);

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    if (po.status !== 'draft') {
      return c.json({ error: 'Purchase order already submitted' }, 400);
    }

    const updated = {
      ...po,
      status: 'submitted',
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${PO_PREFIX}${id}`, updated);
    await kv.set(`${PO_LIST_PREFIX}${po.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error submitting purchase order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/purchase-orders/:id/approve - Approve PO
app.post('/make-server-824f083c/inventory/purchase-orders/:id/approve', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const { notes } = await c.req.json();

    const po = await kv.get(`${PO_PREFIX}${id}`);

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    if (po.status !== 'submitted') {
      return c.json({ error: 'Purchase order must be submitted first' }, 400);
    }

    const updated = {
      ...po,
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      internal_notes: notes || po.internal_notes,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${PO_PREFIX}${id}`, updated);
    await kv.set(`${PO_LIST_PREFIX}${po.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error approving purchase order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/purchase-orders/:id/send - Send PO
app.post('/make-server-824f083c/inventory/purchase-orders/:id/send', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const { email } = await c.req.json();

    const po = await kv.get(`${PO_PREFIX}${id}`);

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    // In production, send email to vendor here
    console.log(`Sending PO ${po.po_number} to ${email || po.vendor_email}`);

    const updated = {
      ...po,
      status: 'sent',
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${PO_PREFIX}${id}`, updated);
    await kv.set(`${PO_LIST_PREFIX}${po.company_id}:${id}`, updated);

    return c.json({ success: true, message: 'Purchase order sent' });
  } catch (error: any) {
    console.error('Error sending purchase order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/purchase-orders/:id/receive - Receive PO
app.post('/make-server-824f083c/inventory/purchase-orders/:id/receive', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const { line_items } = await c.req.json();

    const po = await kv.get(`${PO_PREFIX}${id}`);

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    // Update line items with received quantities
    const updatedLineItems = po.line_items.map((item: any) => {
      const receivedItem = line_items.find((li: any) => li.id === item.id);
      if (receivedItem) {
        return {
          ...item,
          quantity_received: item.quantity_received + receivedItem.quantity_received,
          quantity_pending: item.quantity_ordered - (item.quantity_received + receivedItem.quantity_received),
          received_date: new Date().toISOString(),
        };
      }
      return item;
    });

    // Check if fully received
    const fullyReceived = updatedLineItems.every((item: any) => 
      item.quantity_received >= item.quantity_ordered
    );

    const partiallyReceived = updatedLineItems.some((item: any) => 
      item.quantity_received > 0
    ) && !fullyReceived;

    const updated = {
      ...po,
      line_items: updatedLineItems,
      status: fullyReceived ? 'received' : partiallyReceived ? 'partially_received' : po.status,
      received_date: fullyReceived ? new Date().toISOString() : po.received_date,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${PO_PREFIX}${id}`, updated);
    await kv.set(`${PO_LIST_PREFIX}${po.company_id}:${id}`, updated);

    // Update inventory quantities (would integrate with inventory-items.ts)
    // This is simplified - in production, create stock transactions
    for (const lineItem of line_items) {
      if (lineItem.inventory_item_id && lineItem.quantity_received > 0) {
        const itemKey = `inventory_item:${lineItem.inventory_item_id}`;
        const item = await kv.get(itemKey);
        if (item) {
          const updatedItem = {
            ...item,
            quantity_on_hand: item.quantity_on_hand + lineItem.quantity_received,
            quantity_available: (item.quantity_on_hand + lineItem.quantity_received) - item.quantity_reserved,
            quantity_on_order: Math.max(0, item.quantity_on_order - lineItem.quantity_received),
            updated_at: new Date().toISOString(),
          };
          await kv.set(itemKey, updatedItem);
          await kv.set(`inventory_list:${item.company_id}:${lineItem.inventory_item_id}`, updatedItem);
        }
      }
    }

    return c.json(updated);
  } catch (error: any) {
    console.error('Error receiving purchase order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/purchase-orders/:id/cancel - Cancel PO
app.post('/make-server-824f083c/inventory/purchase-orders/:id/cancel', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const { reason } = await c.req.json();

    const po = await kv.get(`${PO_PREFIX}${id}`);

    if (!po) {
      return c.json({ error: 'Purchase order not found' }, 404);
    }

    const updated = {
      ...po,
      status: 'cancelled',
      internal_notes: reason ? `Cancelled: ${reason}\n${po.internal_notes || ''}` : po.internal_notes,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${PO_PREFIX}${id}`, updated);
    await kv.set(`${PO_LIST_PREFIX}${po.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error cancelling purchase order:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/purchase-orders/generate-number - Generate PO number
app.get('/make-server-824f083c/inventory/purchase-orders/generate-number', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const poNumber = await generatePONumber(companyId);

    return c.json({ po_number: poNumber });
  } catch (error: any) {
    console.error('Error generating PO number:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
