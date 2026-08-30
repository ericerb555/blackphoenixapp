/**
 * Vendor Management Routes
 * 
 * Server routes for vendor management.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Vendor key prefixes
const VENDOR_PREFIX = 'vendor:';
const VENDOR_LIST_PREFIX = 'vendor_list:';
const CATALOG_PREFIX = 'vendor_catalog:';

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

// ============================================================================
// VENDOR ROUTES
// ============================================================================

// GET /make-server-824f083c/inventory/vendors - List vendors
app.get('/make-server-824f083c/inventory/vendors', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const { search, category } = c.req.query();

    // Get all vendors for company
    const vendorList = await kv.getByPrefix(`${VENDOR_LIST_PREFIX}${companyId}:`);
    let vendors = vendorList.map((vendor: any) => vendor.value);

    // Apply filters
    if (search) {
      const lowerSearch = search.toLowerCase();
      vendors = vendors.filter((vendor: any) => 
        vendor.name?.toLowerCase().includes(lowerSearch) ||
        vendor.contact_name?.toLowerCase().includes(lowerSearch) ||
        vendor.email?.toLowerCase().includes(lowerSearch)
      );
    }

    if (category) {
      vendors = vendors.filter((vendor: any) => vendor.category === category);
    }

    return c.json({
      vendors,
      total: vendors.length,
    });
  } catch (error: any) {
    console.error('Error fetching vendors:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/vendors/:id - Get vendor
app.get('/make-server-824f083c/inventory/vendors/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const vendor = await kv.get(`${VENDOR_PREFIX}${id}`);

    if (!vendor) {
      return c.json({ error: 'Vendor not found' }, 404);
    }

    return c.json(vendor);
  } catch (error: any) {
    console.error('Error fetching vendor:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/vendors - Create vendor
app.post('/make-server-824f083c/inventory/vendors', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const data = await c.req.json();

    const vendor = {
      id: crypto.randomUUID(),
      company_id: companyId,
      status: 'active',
      rating: 0,
      on_time_delivery_rate: 0,
      quality_rating: 0,
      total_spent: 0,
      total_orders: 0,
      average_order_value: 0,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${VENDOR_PREFIX}${vendor.id}`, vendor);
    await kv.set(`${VENDOR_LIST_PREFIX}${companyId}:${vendor.id}`, vendor);

    return c.json(vendor, 201);
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /make-server-824f083c/inventory/vendors/:id - Update vendor
app.put('/make-server-824f083c/inventory/vendors/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const data = await c.req.json();

    const existing = await kv.get(`${VENDOR_PREFIX}${id}`);
    if (!existing) {
      return c.json({ error: 'Vendor not found' }, 404);
    }

    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${VENDOR_PREFIX}${id}`, updated);
    await kv.set(`${VENDOR_LIST_PREFIX}${updated.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /make-server-824f083c/inventory/vendors/:id - Delete vendor
app.delete('/make-server-824f083c/inventory/vendors/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const vendor = await kv.get(`${VENDOR_PREFIX}${id}`);

    if (!vendor) {
      return c.json({ error: 'Vendor not found' }, 404);
    }

    await kv.del(`${VENDOR_PREFIX}${id}`);
    await kv.del(`${VENDOR_LIST_PREFIX}${vendor.company_id}:${id}`);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting vendor:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// VENDOR CATALOG ROUTES
// ============================================================================

// GET /make-server-824f083c/inventory/vendors/:vendorId/catalog - Get vendor catalog
app.get('/make-server-824f083c/inventory/vendors/:vendorId/catalog', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const vendorId = c.req.param('vendorId');
    const { search } = c.req.query();

    // Get catalog items for vendor
    const catalogList = await kv.getByPrefix(`${CATALOG_PREFIX}${vendorId}:`);
    let items = catalogList.map((item: any) => item.value);

    // Apply search
    if (search) {
      const lowerSearch = search.toLowerCase();
      items = items.filter((item: any) => 
        item.name?.toLowerCase().includes(lowerSearch) ||
        item.description?.toLowerCase().includes(lowerSearch) ||
        item.vendor_sku?.toLowerCase().includes(lowerSearch)
      );
    }

    return c.json(items);
  } catch (error: any) {
    console.error('Error fetching vendor catalog:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/vendors/:vendorId/catalog - Add catalog item
app.post('/make-server-824f083c/inventory/vendors/:vendorId/catalog', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const vendorId = c.req.param('vendorId');
    const data = await c.req.json();

    const catalogItem = {
      id: crypto.randomUUID(),
      vendor_id: vendorId,
      available: true,
      ...data,
      last_updated: new Date().toISOString(),
    };

    await kv.set(`${CATALOG_PREFIX}${vendorId}:${catalogItem.id}`, catalogItem);

    return c.json(catalogItem, 201);
  } catch (error: any) {
    console.error('Error adding catalog item:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /make-server-824f083c/inventory/vendors/:vendorId/catalog/:itemId - Update catalog item
app.put('/make-server-824f083c/inventory/vendors/:vendorId/catalog/:itemId', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const vendorId = c.req.param('vendorId');
    const itemId = c.req.param('itemId');
    const data = await c.req.json();

    const existing = await kv.get(`${CATALOG_PREFIX}${vendorId}:${itemId}`);
    if (!existing) {
      return c.json({ error: 'Catalog item not found' }, 404);
    }

    const updated = {
      ...existing,
      ...data,
      last_updated: new Date().toISOString(),
    };

    await kv.set(`${CATALOG_PREFIX}${vendorId}:${itemId}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating catalog item:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
