/**
 * Scheduling Availability Routes
 * 
 * Server routes for availability management.
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `avl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function getAvailabilityKey(companyId: string, availabilityId: string): Promise<string> {
  return `company:${companyId}:availability:${availabilityId}`;
}

async function getCompanyAvailabilityPrefix(companyId: string): Promise<string> {
  return `company:${companyId}:availability:`;
}

function generateTimeSlots(startHour: number, endHour: number, intervalMinutes: number): string[] {
  const slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
}

// ============================================================================
// GET AVAILABLE SLOTS
// ============================================================================

app.get('/', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const technicianId = c.req.query('technician_id');
    const resourceId = c.req.query('resource_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const serviceDuration = parseInt(c.req.query('service_duration_minutes') || '60');

    if (!companyId || !startDate || !endDate) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    // Get appointments in date range
    const appointmentsPrefix = `company:${companyId}:appointment:`;
    const appointments = await kv.getByPrefix(appointmentsPrefix);

    // Filter appointments by date range and technician/resource
    const filteredAppointments = appointments.filter((apt: any) => {
      const aptDate = new Date(apt.start_time);
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (aptDate < start || aptDate > end) return false;

      if (technicianId && !apt.assigned_to?.includes(technicianId)) return false;
      if (resourceId && !apt.resources?.includes(resourceId)) return false;

      return true;
    });

    // Generate available slots for each day
    const result = [];
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);

    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayAppointments = filteredAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.start_time).toISOString().split('T')[0];
        return aptDate === dateStr;
      });

      // Generate time slots (8 AM to 6 PM)
      const timeSlots = generateTimeSlots(8, 18, 30);
      const slots = timeSlots.map((time) => {
        const slotStart = new Date(`${dateStr}T${time}:00`);
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

        // Check if slot is booked
        const isBooked = dayAppointments.some((apt: any) => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);

          return (
            (slotStart >= aptStart && slotStart < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (slotStart <= aptStart && slotEnd >= aptEnd)
          );
        });

        return {
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          available: !isBooked,
          technician_id: technicianId || null,
        };
      });

      result.push({
        date: dateStr,
        slots: slots.filter((s) => s.available),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return c.json(result);
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET USER AVAILABILITY
// ============================================================================

app.get('/user/:userId', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const userId = c.req.param('userId');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const prefix = await getCompanyAvailabilityPrefix(companyId);
    const allAvailability = await kv.getByPrefix(prefix);

    const userAvailability = allAvailability.filter((avl: any) => avl.user_id === userId);

    return c.json(userAvailability);
  } catch (error: any) {
    console.error('Error fetching user availability:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// CREATE AVAILABILITY
// ============================================================================

app.post('/', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const data = await c.req.json();

    const availability = {
      id: generateId(),
      company_id: companyId,
      user_id: data.user_id || null,
      resource_id: data.resource_id || null,
      applies_to: data.applies_to || 'user',
      day_of_week: data.day_of_week ?? null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      is_recurring: data.is_recurring ?? false,
      start_time: data.start_time,
      end_time: data.end_time,
      type: data.type || 'available',
      reason: data.reason || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const key = await getAvailabilityKey(companyId, availability.id);
    await kv.set(key, availability);

    return c.json(availability, 201);
  } catch (error: any) {
    console.error('Error creating availability:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// UPDATE AVAILABILITY
// ============================================================================

app.put('/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const availabilityId = c.req.param('id');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const key = await getAvailabilityKey(companyId, availabilityId);
    const existing = await kv.get(key);

    if (!existing) {
      return c.json({ error: 'Availability not found' }, 404);
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
    console.error('Error updating availability:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// DELETE AVAILABILITY
// ============================================================================

app.delete('/:id', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const availabilityId = c.req.param('id');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const key = await getAvailabilityKey(companyId, availabilityId);
    await kv.del(key);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting availability:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// SET BUSINESS HOURS
// ============================================================================

app.post('/business-hours', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const { user_id, hours } = await c.req.json();

    // Delete existing business hours for this user
    const prefix = await getCompanyAvailabilityPrefix(companyId);
    const existing = await kv.getByPrefix(prefix);
    const userHours = existing.filter((avl: any) => 
      avl.user_id === user_id && avl.is_recurring && avl.type === 'available'
    );

    for (const avl of userHours) {
      const key = await getAvailabilityKey(companyId, avl.id);
      await kv.del(key);
    }

    // Create new business hours
    const created = [];
    for (const hour of hours) {
      const availability = {
        id: generateId(),
        company_id: companyId,
        user_id: user_id || null,
        applies_to: 'user',
        day_of_week: hour.day_of_week,
        is_recurring: true,
        start_time: hour.start_time,
        end_time: hour.end_time,
        type: 'available',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const key = await getAvailabilityKey(companyId, availability.id);
      await kv.set(key, availability);
      created.push(availability);
    }

    return c.json({ success: true, created: created.length });
  } catch (error: any) {
    console.error('Error setting business hours:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
