/**
 * Scheduling Resources Routes
 * 
 * Server routes for resource management.
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function getResourceKey(companyId: string, resourceId: string): Promise<string> {
  return `company:${companyId}:resource:${resourceId}`;
}

async function getCompanyResourcesPrefix(companyId: string): Promise<string> {
  return `company:${companyId}:resource:`;
}

// ============================================================================
// GET ALL RESOURCES
// ============================================================================

app.get('/', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const type = c.req.query('type');

    const prefix = await getCompanyResourcesPrefix(companyId);
    let resources = await kv.getByPrefix(prefix);

    // Filter by type if provided
    if (type) {
      resources = resources.filter((r: any) => r.type === type);
    }

    return c.json({
      resources,
      total: resources.length,
    });
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET SINGLE RESOURCE
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const resourceId = c.req.param('id');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const key = await getResourceKey(companyId, resourceId);
    const resource = await kv.get(key);

    if (!resource) {
      return c.json({ error: 'Resource not found' }, 404);
    }

    return c.json(resource);
  } catch (error: any) {
    console.error('Error fetching resource:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CREATE RESOURCE
// ============================================================================

app.post('/', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const data = await c.req.json();

    if (!data.name || !data.type) {
      return c.json({ error: 'Name and type are required' }, 400);
    }

    const resource = {
      id: generateId(),
      company_id: companyId,
      name: data.name,
      type: data.type,
      description: data.description || null,
      capacity: data.capacity || null,
      location: data.location || null,
      user_id: data.user_id || null,
      skills: data.skills || [],
      hourly_rate: data.hourly_rate || null,
      make: data.make || null,
      model: data.model || null,
      year: data.year || null,
      license_plate: data.license_plate || null,
      serial_number: data.serial_number || null,
      purchase_date: data.purchase_date || null,
      is_active: data.is_active ?? true,
      metadata: data.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const key = await getResourceKey(companyId, resource.id);
    await kv.set(key, resource);

    return c.json(resource, 201);
  } catch (error: any) {
    console.error('Error creating resource:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// UPDATE RESOURCE
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const resourceId = c.req.param('id');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const key = await getResourceKey(companyId, resourceId);
    const existing = await kv.get(key);

    if (!existing) {
      return c.json({ error: 'Resource not found' }, 404);
    }

    const updates = await c.req.json();

    const updated = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await kv.set(key, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating resource:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DELETE RESOURCE
// ============================================================================

app.delete('/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const resourceId = c.req.param('id');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const key = await getResourceKey(companyId, resourceId);
    await kv.del(key);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting resource:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET RESOURCE SCHEDULE
// ============================================================================

app.get('/:id/schedule', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const resourceId = c.req.param('id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    if (!companyId || !startDate || !endDate) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    // Get appointments that use this resource
    const appointmentsPrefix = `company:${companyId}:appointment:`;
    const allAppointments = await kv.getByPrefix(appointmentsPrefix);

    const appointments = allAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.start_time);
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (aptDate < start || aptDate > end) return false;
      if (!apt.resources?.includes(resourceId)) return false;

      return true;
    });

    // Get availability for this resource
    const availabilityPrefix = `company:${companyId}:availability:`;
    const allAvailability = await kv.getByPrefix(availabilityPrefix);

    const availability = allAvailability.filter((avl: any) => avl.resource_id === resourceId);

    return c.json({
      appointments,
      availability,
    });
  } catch (error: any) {
    console.error('Error fetching resource schedule:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
