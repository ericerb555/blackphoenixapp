/**
 * Equipment Management Routes
 * 
 * Server routes for equipment management.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Equipment key prefix
const EQUIPMENT_PREFIX = 'equipment:';
const EQUIPMENT_LIST_PREFIX = 'equipment_list:';

// Helper to get Supabase client
function getSupabaseClient(authHeader: string | null) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  return supabase;
}

// Helper to verify user authentication
async function verifyAuth(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', user: null };
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabaseClient(authHeader);
  
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
// EQUIPMENT ROUTES
// ============================================================================

// GET /make-server-824f083c/inventory/equipment - List equipment
app.get('/make-server-824f083c/inventory/equipment', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const { search, type, status, condition, assigned_to, location, maintenance_due, tags } = c.req.query();

    // Get all equipment for company
    const equipmentList = await kv.getByPrefix(`${EQUIPMENT_LIST_PREFIX}${companyId}:`);
    
    let equipment = equipmentList.map((item: any) => item.value);

    // Apply filters
    if (search) {
      const lowerSearch = search.toLowerCase();
      equipment = equipment.filter((eq: any) => 
        eq.name?.toLowerCase().includes(lowerSearch) ||
        eq.description?.toLowerCase().includes(lowerSearch) ||
        eq.serial_number?.toLowerCase().includes(lowerSearch) ||
        eq.model_number?.toLowerCase().includes(lowerSearch)
      );
    }

    if (type) {
      const types = Array.isArray(type) ? type : [type];
      equipment = equipment.filter((eq: any) => types.includes(eq.type));
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      equipment = equipment.filter((eq: any) => statuses.includes(eq.status));
    }

    if (condition) {
      const conditions = Array.isArray(condition) ? condition : [condition];
      equipment = equipment.filter((eq: any) => conditions.includes(eq.condition));
    }

    if (assigned_to) {
      equipment = equipment.filter((eq: any) => eq.assigned_to === assigned_to);
    }

    if (location) {
      equipment = equipment.filter((eq: any) => eq.location === location);
    }

    if (maintenance_due === 'true') {
      const today = new Date();
      equipment = equipment.filter((eq: any) => {
        if (!eq.next_maintenance_date) return false;
        return new Date(eq.next_maintenance_date) <= today;
      });
    }

    return c.json({
      equipment,
      total: equipment.length,
    });
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/equipment/:id - Get equipment
app.get('/make-server-824f083c/inventory/equipment/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const equipment = await kv.get(`${EQUIPMENT_PREFIX}${id}`);

    if (!equipment) {
      return c.json({ error: 'Equipment not found' }, 404);
    }

    return c.json(equipment);
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/equipment - Create equipment
app.post('/make-server-824f083c/inventory/equipment', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const data = await c.req.json();

    const equipment = {
      id: crypto.randomUUID(),
      company_id: companyId,
      ...data,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save equipment
    await kv.set(`${EQUIPMENT_PREFIX}${equipment.id}`, equipment);
    await kv.set(`${EQUIPMENT_LIST_PREFIX}${companyId}:${equipment.id}`, equipment);

    return c.json(equipment, 201);
  } catch (error: any) {
    console.error('Error creating equipment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /make-server-824f083c/inventory/equipment/:id - Update equipment
app.put('/make-server-824f083c/inventory/equipment/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const data = await c.req.json();

    const existing = await kv.get(`${EQUIPMENT_PREFIX}${id}`);
    if (!existing) {
      return c.json({ error: 'Equipment not found' }, 404);
    }

    const updated = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${EQUIPMENT_PREFIX}${id}`, updated);
    await kv.set(`${EQUIPMENT_LIST_PREFIX}${updated.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating equipment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /make-server-824f083c/inventory/equipment/:id - Delete equipment
app.delete('/make-server-824f083c/inventory/equipment/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const equipment = await kv.get(`${EQUIPMENT_PREFIX}${id}`);

    if (!equipment) {
      return c.json({ error: 'Equipment not found' }, 404);
    }

    await kv.del(`${EQUIPMENT_PREFIX}${id}`);
    await kv.del(`${EQUIPMENT_LIST_PREFIX}${equipment.company_id}:${id}`);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting equipment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/equipment/:id/assign - Assign equipment
app.post('/make-server-824f083c/inventory/equipment/:id/assign', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const { user_id } = await c.req.json();

    const equipment = await kv.get(`${EQUIPMENT_PREFIX}${id}`);
    if (!equipment) {
      return c.json({ error: 'Equipment not found' }, 404);
    }

    const updated = {
      ...equipment,
      assigned_to: user_id,
      assigned_at: new Date().toISOString(),
      status: 'in_use',
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${EQUIPMENT_PREFIX}${id}`, updated);
    await kv.set(`${EQUIPMENT_LIST_PREFIX}${equipment.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error assigning equipment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/equipment/:id/unassign - Unassign equipment
app.post('/make-server-824f083c/inventory/equipment/:id/unassign', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const equipment = await kv.get(`${EQUIPMENT_PREFIX}${id}`);

    if (!equipment) {
      return c.json({ error: 'Equipment not found' }, 404);
    }

    const updated = {
      ...equipment,
      assigned_to: null,
      assigned_at: null,
      status: 'available',
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${EQUIPMENT_PREFIX}${id}`, updated);
    await kv.set(`${EQUIPMENT_LIST_PREFIX}${equipment.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error unassigning equipment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/equipment/:id/status - Update status
app.post('/make-server-824f083c/inventory/equipment/:id/status', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const { status, notes } = await c.req.json();

    const equipment = await kv.get(`${EQUIPMENT_PREFIX}${id}`);
    if (!equipment) {
      return c.json({ error: 'Equipment not found' }, 404);
    }

    const updated = {
      ...equipment,
      status,
      notes: notes || equipment.notes,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${EQUIPMENT_PREFIX}${id}`, updated);
    await kv.set(`${EQUIPMENT_LIST_PREFIX}${equipment.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating equipment status:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /make-server-824f083c/inventory/equipment/:id/retire - Retire equipment
app.post('/make-server-824f083c/inventory/equipment/:id/retire', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const { reason } = await c.req.json();

    const equipment = await kv.get(`${EQUIPMENT_PREFIX}${id}`);
    if (!equipment) {
      return c.json({ error: 'Equipment not found' }, 404);
    }

    const updated = {
      ...equipment,
      status: 'retired',
      notes: reason ? `Retired: ${reason}` : equipment.notes,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`${EQUIPMENT_PREFIX}${id}`, updated);
    await kv.set(`${EQUIPMENT_LIST_PREFIX}${equipment.company_id}:${id}`, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error retiring equipment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/equipment/:id/depreciation - Calculate depreciation
app.get('/make-server-824f083c/inventory/equipment/:id/depreciation', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const id = c.req.param('id');
    const equipment = await kv.get(`${EQUIPMENT_PREFIX}${id}`);

    if (!equipment) {
      return c.json({ error: 'Equipment not found' }, 404);
    }

    if (!equipment.purchase_price || !equipment.purchase_date) {
      return c.json({
        current_value: equipment.current_value || 0,
        depreciation_amount: 0,
      });
    }

    // Calculate depreciation
    const purchaseDate = new Date(equipment.purchase_date);
    const now = new Date();
    const monthsOwned = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + 
                       (now.getMonth() - purchaseDate.getMonth());

    let depreciation = 0;
    
    if (equipment.depreciation_method === 'straight_line') {
      const usefulLife = 5; // 5 years
      const annualDepreciation = (equipment.purchase_price - (equipment.salvage_value || 0)) / usefulLife;
      depreciation = (annualDepreciation / 12) * monthsOwned;
    } else if (equipment.depreciation_method === 'declining_balance') {
      const rate = (equipment.depreciation_rate || 20) / 100;
      const years = monthsOwned / 12;
      depreciation = equipment.purchase_price * (1 - Math.pow(1 - rate, years));
    }

    const currentValue = Math.max(
      equipment.purchase_price - depreciation,
      equipment.salvage_value || 0
    );

    return c.json({
      current_value: Math.round(currentValue * 100) / 100,
      depreciation_amount: Math.round(depreciation * 100) / 100,
    });
  } catch (error: any) {
    console.error('Error calculating depreciation:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
