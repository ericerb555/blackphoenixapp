/**
 * Scheduling Analytics Routes
 * 
 * Server routes for scheduling analytics and reporting.
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ============================================================================
// GET SCHEDULING STATS
// ============================================================================

app.get('/stats', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    if (!companyId) {
      return c.json({ error: 'Company ID required' }, 400);
    }

    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    const prefix = `company:${companyId}:appointment:`;
    let appointments = await kv.getByPrefix(prefix);

    // Filter by date range if provided
    if (startDate || endDate) {
      appointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.start_time);
        if (startDate && aptDate < new Date(startDate)) return false;
        if (endDate && aptDate > new Date(endDate)) return false;
        return true;
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count by time periods
    const todayAppointments = appointments.filter((apt: any) => {
      const aptDate = new Date(apt.start_time);
      return aptDate >= today && aptDate < new Date(today.getTime() + 86400000);
    }).length;

    const weekAppointments = appointments.filter((apt: any) => {
      const aptDate = new Date(apt.start_time);
      return aptDate >= weekStart;
    }).length;

    const monthAppointments = appointments.filter((apt: any) => {
      const aptDate = new Date(apt.start_time);
      return aptDate >= monthStart;
    }).length;

    const upcomingAppointments = appointments.filter((apt: any) => {
      return new Date(apt.start_time) > now && 
        ['scheduled', 'confirmed'].includes(apt.status);
    }).length;

    // Count by status
    const byStatus: Record<string, number> = {};
    appointments.forEach((apt: any) => {
      byStatus[apt.status] = (byStatus[apt.status] || 0) + 1;
    });

    // Count by type
    const byType: Record<string, number> = {};
    appointments.forEach((apt: any) => {
      byType[apt.type] = (byType[apt.type] || 0) + 1;
    });

    // Calculate average duration
    const totalMinutes = appointments.reduce((sum: number, apt: any) => sum + (apt.duration_minutes || 0), 0);
    const avgDuration = appointments.length > 0 ? totalMinutes / appointments.length : 0;

    // Calculate rates
    const completedCount = byStatus.completed || 0;
    const cancelledCount = byStatus.cancelled || 0;
    const noShowCount = byStatus.no_show || 0;
    const total = appointments.length || 1;

    const onTimeRate = ((completedCount / total) * 100) || 0;
    const cancellationRate = ((cancelledCount / total) * 100) || 0;
    const noShowRate = ((noShowCount / total) * 100) || 0;

    // Calculate utilization (simplified - hours booked / total available hours)
    const totalHours = appointments.reduce((sum: number, apt: any) => {
      return sum + (apt.duration_minutes / 60);
    }, 0);
    const workingDays = 20; // Approximate working days per month
    const hoursPerDay = 8;
    const totalAvailableHours = workingDays * hoursPerDay;
    const utilizationRate = (totalHours / totalAvailableHours) * 100;

    // Calculate revenue
    const revenueThisMonth = appointments
      .filter((apt: any) => {
        const aptDate = new Date(apt.start_time);
        return aptDate >= monthStart && apt.status === 'completed';
      })
      .reduce((sum: number, apt: any) => sum + (apt.actual_cost || apt.estimated_cost || 0), 0);

    const revenueForecast = appointments
      .filter((apt: any) => {
        const aptDate = new Date(apt.start_time);
        return aptDate >= now && ['scheduled', 'confirmed'].includes(apt.status);
      })
      .reduce((sum: number, apt: any) => sum + (apt.estimated_cost || 0), 0);

    return c.json({
      total_appointments: appointments.length,
      upcoming_appointments: upcomingAppointments,
      today_appointments: todayAppointments,
      this_week_appointments: weekAppointments,
      this_month_appointments: monthAppointments,
      by_status: byStatus,
      by_type: byType,
      avg_duration_minutes: Math.round(avgDuration),
      utilization_rate: Math.round(utilizationRate * 10) / 10,
      on_time_rate: Math.round(onTimeRate * 10) / 10,
      cancellation_rate: Math.round(cancellationRate * 10) / 10,
      no_show_rate: Math.round(noShowRate * 10) / 10,
      revenue_this_month: revenueThisMonth,
      revenue_forecast: revenueForecast,
    });
  } catch (error: any) {
    console.error('Error fetching scheduling stats:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET TECHNICIAN SCHEDULES
// ============================================================================

app.get('/technician-schedules', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const date = c.req.query('date');

    if (!companyId || !date) {
      return c.json({ error: 'Company ID and date required' }, 400);
    }

    const prefix = `company:${companyId}:appointment:`;
    const allAppointments = await kv.getByPrefix(prefix);

    // Filter appointments for the specified date
    const dateStr = new Date(date).toISOString().split('T')[0];
    const appointments = allAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.start_time).toISOString().split('T')[0];
      return aptDate === dateStr;
    });

    // Group by technician
    const technicianMap = new Map();

    appointments.forEach((apt: any) => {
      if (!apt.assigned_to || apt.assigned_to.length === 0) return;

      apt.assigned_to.forEach((techId: string) => {
        if (!technicianMap.has(techId)) {
          technicianMap.set(techId, {
            technician_id: techId,
            technician_name: `Technician ${techId.slice(-4)}`,
            date: dateStr,
            appointments: [],
            total_appointments: 0,
            total_hours: 0,
            available_hours: 8,
            utilization_percentage: 0,
          });
        }

        const schedule = technicianMap.get(techId);
        schedule.appointments.push(apt);
        schedule.total_appointments++;
        schedule.total_hours += apt.duration_minutes / 60;
      });
    });

    // Calculate utilization
    const schedules = Array.from(technicianMap.values()).map((schedule) => {
      schedule.utilization_percentage = Math.round((schedule.total_hours / schedule.available_hours) * 100);
      return schedule;
    });

    return c.json(schedules);
  } catch (error: any) {
    console.error('Error fetching technician schedules:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================================================
// GET UTILIZATION REPORT
// ============================================================================

app.get('/utilization', async (c) => {
  try {
    const companyId = c.req.header('x-company-id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const technicianId = c.req.query('technician_id');

    if (!companyId || !startDate || !endDate) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }

    const prefix = `company:${companyId}:appointment:`;
    let appointments = await kv.getByPrefix(prefix);

    // Filter by date range
    appointments = appointments.filter((apt: any) => {
      const aptDate = new Date(apt.start_time);
      return aptDate >= new Date(startDate) && aptDate <= new Date(endDate);
    });

    // Filter by technician if specified
    if (technicianId) {
      appointments = appointments.filter((apt: any) => 
        apt.assigned_to?.includes(technicianId)
      );
    }

    // Calculate total hours
    const totalHours = appointments.reduce((sum: number, apt: any) => {
      return sum + (apt.duration_minutes / 60);
    }, 0);

    // Calculate billable hours (completed appointments)
    const billableHours = appointments
      .filter((apt: any) => apt.status === 'completed')
      .reduce((sum: number, apt: any) => {
        return sum + (apt.duration_minutes / 60);
      }, 0);

    // Calculate date range in days
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const workingDays = days * 0.71; // Approximate working days
    const totalAvailableHours = workingDays * 8;

    const utilizationRate = (totalHours / totalAvailableHours) * 100;

    // Group by technician
    const techMap = new Map();

    appointments.forEach((apt: any) => {
      if (!apt.assigned_to) return;

      apt.assigned_to.forEach((techId: string) => {
        if (!techMap.has(techId)) {
          techMap.set(techId, {
            technician_id: techId,
            technician_name: `Technician ${techId.slice(-4)}`,
            total_hours: 0,
            billable_hours: 0,
            utilization_rate: 0,
          });
        }

        const tech = techMap.get(techId);
        tech.total_hours += apt.duration_minutes / 60;
        if (apt.status === 'completed') {
          tech.billable_hours += apt.duration_minutes / 60;
        }
      });
    });

    // Calculate utilization for each technician
    const byTechnician = Array.from(techMap.values()).map((tech) => {
      const techAvailableHours = workingDays * 8;
      tech.utilization_rate = Math.round((tech.total_hours / techAvailableHours) * 100);
      tech.total_hours = Math.round(tech.total_hours * 10) / 10;
      tech.billable_hours = Math.round(tech.billable_hours * 10) / 10;
      return tech;
    });

    return c.json({
      total_hours: Math.round(totalHours * 10) / 10,
      billable_hours: Math.round(billableHours * 10) / 10,
      utilization_rate: Math.round(utilizationRate * 10) / 10,
      by_technician: byTechnician,
    });
  } catch (error: any) {
    console.error('Error fetching utilization report:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
