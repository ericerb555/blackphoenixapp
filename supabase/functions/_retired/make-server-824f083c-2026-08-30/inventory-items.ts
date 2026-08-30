/**
 * Inventory Items Routes
 * 
 * Server routes for inventory item management.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Inventory key prefixes
const ITEM_PREFIX = 'inventory_item:';
const ITEM_LIST_PREFIX = 'inventory_list:';
const TRANSACTION_PREFIX = 'stock_transaction:';
const TRANSACTION_LIST_PREFIX = 'stock_transactions:';

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

// Helper to create stock transaction
async function createTransaction(
  companyId: string,
  itemId: string,
  type: string,
  quantity: number,
  userId: string,
  item: any,
  additionalData: any = {}
) {
  const transaction = {
    id: crypto.randomUUID(),
    company_id: companyId,
    inventory_item_id: itemId,
    type,
    quantity,
    unit: item.unit,
    quantity_before: item.quantity_on_hand,
    quantity_after: item.quantity_on_hand + quantity,
    unit_cost: item.unit_cost,
    total_cost: Math.abs(quantity) * item.unit_cost,
    performed_by: userId,
    performed_at: new Date().toISOString(),
    ...additionalData,
  };

  await kv.set(`${TRANSACTION_PREFIX}${transaction.id}`, transaction);
  await kv.set(`${TRANSACTION_LIST_PREFIX}${itemId}:${transaction.id}`, transaction);

  return transaction;
}

// ============================================================================
// INVENTORY ITEMS ROUTES
// ============================================================================

// GET /make-server-824f083c/inventory/items - List inventory items
app.get('/make-server-824f083c/inventory/items', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const { 
      search, 
      category, 
      status, 
      vendor_id, 
      location,
      low_stock_only,
      out_of_stock_only,
      reorder_needed,
    } = c.req.query();

    // Get all items for company
    const itemsList = await kv.getByPrefix(`${ITEM_LIST_PREFIX}${companyId}:`);
    let items = itemsList.map((item: any) => item.value);

    // Apply filters
    if (search) {
      const lowerSearch = search.toLowerCase();
      items = items.filter((item: any) => 
        item.name?.toLowerCase().includes(lowerSearch) ||
        item.description?.toLowerCase().includes(lowerSearch) ||
        item.sku?.toLowerCase().includes(lowerSearch) ||
        item.barcode?.toLowerCase().includes(lowerSearch)
      );
    }

    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      items = items.filter((item: any) => categories.includes(item.category));
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      items = items.filter((item: any) => statuses.includes(item.status));
    }

    if (vendor_id) {
      items = items.filter((item: any) => item.preferred_vendor_id === vendor_id);
    }

    if (location) {
      items = items.filter((item: any) => item.warehouse_location === location);
    }

    if (low_stock_only === 'true') {
      items = items.filter((item: any) => 
        item.quantity_on_hand > 0 && item.quantity_on_hand <= item.reorder_point
      );
    }

    if (out_of_stock_only === 'true') {
      items = items.filter((item: any) => item.quantity_on_hand <= 0);
    }

    if (reorder_needed === 'true') {
      items = items.filter((item: any) => 
        item.quantity_on_hand <= item.reorder_point && item.auto_reorder
      );
    }

    return c.json({
      items,
      total: items.length,
    });
  } catch (error: any) {
    console.error('Error fetching inventory items:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/items/:id - Get inventory item
app.get('/make-server-824f083c/inventory/items/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const item = await kv.get(`${ITEM_PREFIX}${id}`);

    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    return c.json(item);
  } catch (error: any) {
    console.error('Error fetching inventory item:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/items - Create inventory item
app.post('/make-server-824f083c/inventory/items', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const data = await c.req.json();

    const item = {
      id: crypto.randomUUID(),
      company_id: companyId,
      quantity_on_hand: 0,
      quantity_available: 0,
      quantity_reserved: 0,
      quantity_on_order: 0,
      auto_reorder: false,
      lot_tracking: false,
      serial_tracking: false,
      expiration_tracking: false,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Calculate available quantity
    item.quantity_available = item.quantity_on_hand - item.quantity_reserved;

    await kv.set(`${ITEM_PREFIX}${item.id}`, item);
    await kv.set(`${ITEM_LIST_PREFIX}${companyId}:${item.id}`, item);

    return c.json(item, 201);
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /make-server-824f083c/inventory/items/:id - Update inventory item
app.put('/make-server-824f083c/inventory/items/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const data = await c.req.json();

    const existing = await kv.get(`${ITEM_PREFIX}${id}`);
    if (!existing) {
      return c.json({ error: 'Item not found' }, 404);
    }

    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Recalculate available quantity
    updated.quantity_available = updated.quantity_on_hand - updated.quantity_reserved;

    await kv.set(`${ITEM_PREFIX}${id}`, updated);
    await kv.set(`${ITEM_LIST_PREFIX}${updated.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /make-server-824f083c/inventory/items/:id - Delete inventory item
app.delete('/make-server-824f083c/inventory/items/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const item = await kv.get(`${ITEM_PREFIX}${id}`);

    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    await kv.del(`${ITEM_PREFIX}${id}`);
    await kv.del(`${ITEM_LIST_PREFIX}${item.company_id}:${id}`);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/items/:id/adjust - Adjust stock
app.post('/make-server-824f083c/inventory/items/:id/adjust', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const id = c.req.param('id');
    const { quantity, reason, notes } = await c.req.json();

    const item = await kv.get(`${ITEM_PREFIX}${id}`);
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    // Create transaction
    const transaction = await createTransaction(
      companyId,
      id,
      'adjustment',
      quantity,
      user.id,
      item,
      { reason, notes }
    );

    // Update item quantities
    const updated = {
      ...item,
      quantity_on_hand: item.quantity_on_hand + quantity,
      quantity_available: (item.quantity_on_hand + quantity) - item.quantity_reserved,
      last_cost: quantity > 0 ? item.unit_cost : item.last_cost,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${ITEM_PREFIX}${id}`, updated);
    await kv.set(`${ITEM_LIST_PREFIX}${companyId}:${id}`, updated);

    return c.json(transaction);
  } catch (error: any) {
    console.error('Error adjusting stock:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/items/:id/transfer - Transfer stock
app.post('/make-server-824f083c/inventory/items/:id/transfer', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const id = c.req.param('id');
    const { quantity, from_location, to_location, notes } = await c.req.json();

    const item = await kv.get(`${ITEM_PREFIX}${id}`);
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    // Create transaction
    const transaction = await createTransaction(
      companyId,
      id,
      'transfer',
      0, // No quantity change
      user.id,
      item,
      { from_location, to_location, notes }
    );

    // Update item location
    const updated = {
      ...item,
      warehouse_location: to_location,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${ITEM_PREFIX}${id}`, updated);
    await kv.set(`${ITEM_LIST_PREFIX}${companyId}:${id}`, updated);

    return c.json(transaction);
  } catch (error: any) {
    console.error('Error transferring stock:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/items/:id/reserve - Reserve stock
app.post('/make-server-824f083c/inventory/items/:id/reserve', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const id = c.req.param('id');
    const { quantity, reference_type, reference_id } = await c.req.json();

    const item = await kv.get(`${ITEM_PREFIX}${id}`);
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    // Check if enough stock available
    if (item.quantity_available < quantity) {
      return c.json({ error: 'Insufficient stock available' }, 400);
    }

    // Update item quantities
    const updated = {
      ...item,
      quantity_reserved: item.quantity_reserved + quantity,
      quantity_available: item.quantity_available - quantity,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${ITEM_PREFIX}${id}`, updated);
    await kv.set(`${ITEM_LIST_PREFIX}${companyId}:${id}`, updated);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error reserving stock:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/items/:id/release - Release stock
app.post('/make-server-824f083c/inventory/items/:id/release', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const id = c.req.param('id');
    const { quantity, reference_type, reference_id } = await c.req.json();

    const item = await kv.get(`${ITEM_PREFIX}${id}`);
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    // Update item quantities
    const updated = {
      ...item,
      quantity_reserved: Math.max(0, item.quantity_reserved - quantity),
      quantity_available: item.quantity_available + quantity,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${ITEM_PREFIX}${id}`, updated);
    await kv.set(`${ITEM_LIST_PREFIX}${companyId}:${id}`, updated);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error releasing stock:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/items/low-stock - Get low stock items
app.get('/make-server-824f083c/inventory/items/low-stock', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const itemsList = await kv.getByPrefix(`${ITEM_LIST_PREFIX}${companyId}:`);
    
    const lowStockItems = itemsList
      .map((item: any) => item.value)
      .filter((item: any) => 
        item.quantity_on_hand > 0 && item.quantity_on_hand <= item.reorder_point
      );

    return c.json(lowStockItems);
  } catch (error: any) {
    console.error('Error fetching low stock items:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/items/reorder-needed - Get items needing reorder
app.get('/make-server-824f083c/inventory/items/reorder-needed', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const itemsList = await kv.getByPrefix(`${ITEM_LIST_PREFIX}${companyId}:`);
    
    const reorderItems = itemsList
      .map((item: any) => item.value)
      .filter((item: any) => 
        item.quantity_on_hand <= item.reorder_point && item.auto_reorder
      );

    return c.json(reorderItems);
  } catch (error: any) {
    console.error('Error fetching reorder items:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
