/**
 * Scheduling Notifications Routes
 * 
 * Server routes for appointment notifications and reminders.
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ============================================================================
// SEND APPOINTMENT NOTIFICATION
// ============================================================================

app.post('/send', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const data = await c.req.json();
    const { appointment_id, type, recipient, channels } = data;

    if (!appointment_id || !type || !recipient || !channels) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get appointment
    const appointmentKey = `company:${companyId}:appointment:${appointment_id}`;
    const appointment = await kv.get(appointmentKey);

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    const sent = [];

    // Simulate sending notifications (in production, integrate with real services)
    for (const channel of channels) {
      if (channel === 'email') {
        // Send email notification
        console.log(`Sending ${type} email to ${appointment.customer_email}`);
        sent.push('email');
      } else if (channel === 'sms') {
        // Send SMS notification
        console.log(`Sending ${type} SMS to ${appointment.customer_phone}`);
        sent.push('sms');
      } else if (channel === 'push') {
        // Send push notification
        console.log(`Sending ${type} push notification`);
        sent.push('push');
      }
    }

    return c.json({
      success: true,
      sent,
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// SEND APPOINTMENT REMINDERS
// ============================================================================

app.post('/reminders/:appointmentId?', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const appointmentId = c.req.param('appointmentId');

    let appointments = [];

    if (appointmentId) {
      // Send reminder for specific appointment
      const key = `company:${companyId}:appointment:${appointmentId}`;
      const appointment = await kv.get(key);
      if (appointment) {
        appointments = [appointment];
      }
    } else {
      // Send reminders for all upcoming appointments
      const prefix = `company:${companyId}:appointment:`;
      const allAppointments = await kv.getByPrefix(prefix);

      // Filter upcoming appointments (within next 24 hours)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      appointments = allAppointments.filter((apt: any) => {
        const aptTime = new Date(apt.start_time);
        return aptTime > now && 
               aptTime < tomorrow && 
               ['scheduled', 'confirmed'].includes(apt.status);
      });
    }

    let sent = 0;
    let failed = 0;

    for (const appointment of appointments) {
      try {
        // Simulate sending reminders
        if (appointment.customer_email) {
          console.log(`Sending reminder email for appointment ${appointment.id}`);
          sent++;
        }
        if (appointment.customer_phone) {
          console.log(`Sending reminder SMS for appointment ${appointment.id}`);
          sent++;
        }
      } catch {
        failed++;
      }
    }

    return c.json({ sent, failed });
  } catch (error: any) {
    console.error('Error sending reminders:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// UPDATE REMINDER SETTINGS
// ============================================================================

app.put('/:appointmentId/reminders', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const appointmentId = c.req.param('appointmentId');

    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const key = `company:${companyId}:appointment:${appointmentId}`;
    const appointment = await kv.get(key);

    if (!appointment) {
      return c.json({ error: 'Appointment not found' }, 404);
    }

    const { reminders } = await c.req.json();

    appointment.reminders = reminders.map((r: any, index: number) => ({
      id: `reminder_${index}`,
      type: r.type,
      minutes_before: r.minutes_before,
      sent: false,
    }));

    appointment.updated_at = new Date().toISOString();

    await kv.set(key, appointment);

    return c.json(appointment);
  } catch (error: any) {
    console.error('Error updating reminder settings:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
