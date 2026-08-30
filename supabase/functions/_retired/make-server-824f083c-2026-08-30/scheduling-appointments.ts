/**
 * Scheduling Appointments Routes
 * 
 * Server routes for appointment management.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import * as kv from './kv_store.tsx';

const app = new Hono();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function getAppointmentKey(companyId: string, appointmentId: string): Promise<string> {
  return `company:${companyId}:appointment:${appointmentId}`;
}

async function getCompanyAppointmentsPrefix(companyId: string): Promise<string> {
  return `company:${companyId}:appointment:`;
}

// ============================================================================
// GET ALL APPOINTMENTS
// ============================================================================

app.get('/', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    // Get query parameters
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const technicianId = c.req.query('technician_id');
    const customerId = c.req.query('customer_id');
    const type = c.req.query('type');
    const status = c.req.query('status');
    const search = c.req.query('search');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const sortBy = c.req.query('sort_by') || 'start_time';
    const sortOrder = c.req.query('sort_order') || 'asc';

    // Get all appointments for company
    const prefix = await getCompanyAppointmentsPrefix(companyId);
    const appointments = await kv.getByPrefix(prefix);

    // Filter appointments
    let filtered = appointments.filter((apt: any) => {
      if (startDate && new Date(apt.start_time) < new Date(startDate)) return false;
      if (endDate && new Date(apt.start_time) > new Date(endDate)) return false;
      if (technicianId && !apt.assigned_to?.includes(technicianId)) return false;
      if (customerId && apt.customer_id !== customerId) return false;
      if (type && apt.type !== type) return false;
      if (status && apt.status !== status) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          apt.title?.toLowerCase().includes(searchLower) ||
          apt.description?.toLowerCase().includes(searchLower) ||
          apt.customer_name?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

    // Sort
    filtered.sort((a: any, b: any) => {
      let aVal, bVal;
      if (sortBy === 'start_time') {
        aVal = new Date(a.start_time).getTime();
        bVal = new Date(b.start_time).getTime();
      } else if (sortBy === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else {
        aVal = a[sortBy];
        bVal = b[sortBy];
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Paginate
    const total = filtered.length;
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return c.json({
      appointments: paginated,
      total,
      page,
      pages,
    });
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET SINGLE APPOINTMENT
// ============================================================================

app.get('/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const appointmentId = c.req.param('id');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const key = await getAppointmentKey(companyId, appointmentId);
    const appointment = await kv.get(key);

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    return c.json(appointment);
  } catch (error: any) {
    console.error('Error fetching appointment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CREATE APPOINTMENT
// ============================================================================

app.post('/', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const data = await c.req.json();

    // Validate required fields
    if (!data.title || !data.type || !data.start_time || !data.end_time) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Calculate duration
    const startTime = new Date(data.start_time);
    const endTime = new Date(data.end_time);
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

    // Create appointment
    const appointment = {
      id: generateId(),
      company_id: companyId,
      title: data.title,
      description: data.description || null,
      type: data.type,
      status: 'scheduled',
      start_time: data.start_time,
      end_time: data.end_time,
      duration_minutes: durationMinutes,
      timezone: data.timezone || 'America/New_York',
      customer_id: data.customer_id || null,
      customer_name: data.customer_name || null,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone || null,
      assigned_to: data.assigned_to || [],
      location_type: data.location_type || 'customer_address',
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      work_order_id: data.work_order_id || null,
      quote_id: data.quote_id || null,
      invoice_id: data.invoice_id || null,
      is_recurring: data.is_recurring || false,
      recurrence: data.recurrence || null,
      parent_appointment_id: data.parent_appointment_id || null,
      send_confirmation: data.send_confirmation ?? true,
      resources: data.resources || [],
      notes: data.notes || null,
      internal_notes: data.internal_notes || null,
      estimated_cost: data.estimated_cost || null,
      color: data.color || null,
      tags: data.tags || [],
      priority: data.priority || 'medium',
      metadata: data.metadata || {},
      created_by: 'user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const key = await getAppointmentKey(companyId, appointment.id);
    await kv.set(key, appointment);

    // Handle recurring appointments
    if (appointment.is_recurring && appointment.recurrence) {
      // Create recurring instances (simplified - in production would be more complex)
      const instances = [];
      const maxInstances = Math.min(appointment.recurrence.count || 52, 52);
      
      for (let i = 1; i < maxInstances; i++) {
        const instanceStart = new Date(startTime);
        const instanceEnd = new Date(endTime);

        if (appointment.recurrence.frequency === 'daily') {
          instanceStart.setDate(instanceStart.getDate() + (i * appointment.recurrence.interval));
          instanceEnd.setDate(instanceEnd.getDate() + (i * appointment.recurrence.interval));
        } else if (appointment.recurrence.frequency === 'weekly') {
          instanceStart.setDate(instanceStart.getDate() + (i * 7 * appointment.recurrence.interval));
          instanceEnd.setDate(instanceEnd.getDate() + (i * 7 * appointment.recurrence.interval));
        } else if (appointment.recurrence.frequency === 'monthly') {
          instanceStart.setMonth(instanceStart.getMonth() + (i * appointment.recurrence.interval));
          instanceEnd.setMonth(instanceEnd.getMonth() + (i * appointment.recurrence.interval));
        }

        if (appointment.recurrence.until && instanceStart > new Date(appointment.recurrence.until)) {
          break;
        }

        const instance = {
          ...appointment,
          id: generateId(),
          parent_appointment_id: appointment.id,
          start_time: instanceStart.toISOString(),
          end_time: instanceEnd.toISOString(),
        };

        instances.push(instance);
        const instanceKey = await getAppointmentKey(companyId, instance.id);
        await kv.set(instanceKey, instance);
      }
    }

    return c.json(appointment, 201);
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// UPDATE APPOINTMENT
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const appointmentId = c.req.param('id');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const key = await getAppointmentKey(companyId, appointmentId);
    const existing = await kv.get(key);

    if (!existing) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    const updates = await c.req.json();

    // Recalculate duration if times changed
    let durationMinutes = existing.duration_minutes;
    if (updates.start_time || updates.end_time) {
      const startTime = new Date(updates.start_time || existing.start_time);
      const endTime = new Date(updates.end_time || existing.end_time);
      durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
    }

    const updated = {
      ...existing,
      ...updates,
      duration_minutes: durationMinutes,
      updated_at: new Date().toISOString(),
    };

    await kv.set(key, updated);

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating appointment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DELETE APPOINTMENT
// ============================================================================

app.delete('/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const appointmentId = c.req.param('id');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const key = await getAppointmentKey(companyId, appointmentId);
    await kv.del(key);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting appointment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// STATUS ACTIONS
// ============================================================================

app.post('/:id/confirm', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const appointmentId = c.req.param('id');

    const key = await getAppointmentKey(companyId, appointmentId);
    const appointment = await kv.get(key);

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    appointment.status = 'confirmed';
    appointment.confirmed_at = new Date().toISOString();
    appointment.updated_at = new Date().toISOString();

    await kv.set(key, appointment);

    return c.json(appointment);
  } catch (error: any) {
    console.error('Error confirming appointment:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/:id/start', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const appointmentId = c.req.param('id');

    const key = await getAppointmentKey(companyId, appointmentId);
    const appointment = await kv.get(key);

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    appointment.status = 'in_progress';
    appointment.started_at = new Date().toISOString();
    appointment.updated_at = new Date().toISOString();

    await kv.set(key, appointment);

    return c.json(appointment);
  } catch (error: any) {
    console.error('Error starting appointment:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/:id/complete', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const appointmentId = c.req.param('id');

    const key = await getAppointmentKey(companyId, appointmentId);
    const appointment = await kv.get(key);

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    const data = await c.req.json().catch(() => ({}));

    appointment.status = 'completed';
    appointment.completed_at = new Date().toISOString();
    appointment.updated_at = new Date().toISOString();
    
    if (data.actual_cost !== undefined) {
      appointment.actual_cost = data.actual_cost;
    }
    if (data.notes) {
      appointment.notes = data.notes;
    }

    await kv.set(key, appointment);

    return c.json(appointment);
  } catch (error: any) {
    console.error('Error completing appointment:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/:id/cancel', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const appointmentId = c.req.param('id');

    const key = await getAppointmentKey(companyId, appointmentId);
    const appointment = await kv.get(key);

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    const data = await c.req.json().catch(() => ({}));

    appointment.status = 'cancelled';
    appointment.cancelled_at = new Date().toISOString();
    appointment.cancelled_reason = data.reason || null;
    appointment.updated_at = new Date().toISOString();

    await kv.set(key, appointment);

    return c.json(appointment);
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// RESCHEDULE
// ============================================================================

app.post('/reschedule', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const data = await c.req.json();

    if (!companyId || !data.appointment_id || !data.new_start_time || !data.new_end_time) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const key = await getAppointmentKey(companyId, data.appointment_id);
    const appointment = await kv.get(key);

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    // Calculate new duration
    const startTime = new Date(data.new_start_time);
    const endTime = new Date(data.new_end_time);
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

    appointment.start_time = data.new_start_time;
    appointment.end_time = data.new_end_time;
    appointment.duration_minutes = durationMinutes;
    appointment.updated_at = new Date().toISOString();

    await kv.set(key, appointment);

    return c.json(appointment);
  } catch (error: any) {
    console.error('Error rescheduling appointment:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CHECK CONFLICTS
// ============================================================================

app.post('/check-conflicts', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const data = await c.req.json();

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const prefix = await getCompanyAppointmentsPrefix(companyId);
    const appointments = await kv.getByPrefix(prefix);

    const newStart = new Date(data.start_time);
    const newEnd = new Date(data.end_time);

    const conflicts = [];

    for (const apt of appointments) {
      const aptStart = new Date(apt.start_time);
      const aptEnd = new Date(apt.end_time);

      // Check time overlap
      const hasTimeOverlap = 
        (newStart >= aptStart && newStart < aptEnd) ||
        (newEnd > aptStart && newEnd <= aptEnd) ||
        (newStart <= aptStart && newEnd >= aptEnd);

      if (!hasTimeOverlap) continue;

      // Check technician overlap
      const sharedTechs = data.assigned_to?.filter((id: string) => 
        apt.assigned_to?.includes(id)
      );

      if (sharedTechs && sharedTechs.length > 0) {
        conflicts.push({
          type: 'overlap',
          appointment_id: 'new',
          conflicting_id: apt.id,
          message: `Overlaps with appointment "${apt.title}"`,
          severity: 'error',
        });
      }

      // Check resource overlap
      const sharedResources = data.resources?.filter((id: string) =>
        apt.resources?.includes(id)
      );

      if (sharedResources && sharedResources.length > 0) {
        conflicts.push({
          type: 'resource',
          appointment_id: 'new',
          conflicting_id: apt.id,
          message: `Resource conflict with appointment "${apt.title}"`,
          severity: 'error',
        });
      }
    }

    return c.json({
      has_conflicts: conflicts.length > 0,
      conflicts,
    });
  } catch (error: any) {
    console.error('Error checking conflicts:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

app.post('/bulk-create', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const { appointments } = await c.req.json();

    if (!companyId || !appointments || !Array.isArray(appointments)) {
      return c.json({ error: 'Invalid request' }, 400);
    }

    const successful = [];
    const failed = [];

    for (const data of appointments) {
      try {
        const appointment = {
          id: generateId(),
          company_id: companyId,
          ...data,
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const key = await getAppointmentKey(companyId, appointment.id);
        await kv.set(key, appointment);
        successful.push(appointment);
      } catch (error: any) {
        failed.push({ error: error.message });
      }
    }

    return c.json({ successful, failed });
  } catch (error: any) {
    console.error('Error bulk creating appointments:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/bulk-update', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const { appointment_ids, updates } = await c.req.json();

    if (!companyId || !appointment_ids || !updates) {
      return c.json({ error: 'Invalid request' }, 400);
    }

    let updated = 0;
    let failed = 0;

    for (const id of appointment_ids) {
      try {
        const key = await getAppointmentKey(companyId, id);
        const appointment = await kv.get(key);

        if (appointment) {
          const updatedAppointment = {
            ...appointment,
            ...updates,
            updated_at: new Date().toISOString(),
          };
          await kv.set(key, updatedAppointment);
          updated++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return c.json({ updated, failed });
  } catch (error: any) {
    console.error('Error bulk updating appointments:', error);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/bulk-cancel', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const { appointment_ids, reason } = await c.req.json();

    if (!companyId || !appointment_ids) {
      return c.json({ error: 'Invalid request' }, 400);
    }

    let cancelled = 0;
    let failed = 0;

    for (const id of appointment_ids) {
      try {
        const key = await getAppointmentKey(companyId, id);
        const appointment = await kv.get(key);

        if (appointment) {
          appointment.status = 'cancelled';
          appointment.cancelled_at = new Date().toISOString();
          appointment.cancelled_reason = reason || null;
          appointment.updated_at = new Date().toISOString();
          await kv.set(key, appointment);
          cancelled++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return c.json({ cancelled, failed });
  } catch (error: any) {
    console.error('Error bulk cancelling appointments:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
