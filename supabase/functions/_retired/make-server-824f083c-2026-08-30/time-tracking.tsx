import { Hono } from "npm:hono";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// Initialize Supabase client
const getSupabase = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// GET /time-entries - Get all time entries
app.get('/time-entries', async (c) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) throw error;

    return c.json(data || []);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /time-entries/:id - Get single time entry
app.get('/time-entries/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return c.json(data);
  } catch (error) {
    console.error('Error fetching time entry:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /time-entries/employee/:employeeId - Get entries by employee
app.get('/time-entries/employee/:employeeId', async (c) => {
  try {
    const employeeId = c.req.param('employeeId');
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', employeeId)
      .order('start_time', { ascending: false });

    if (error) throw error;

    return c.json(data || []);
  } catch (error) {
    console.error('Error fetching employee time entries:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /time-entries/active - Get active time entries (no end_time)
app.get('/time-entries/active', async (c) => {
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .is('end_time', null)
      .eq('status', 'in_progress')
      .order('start_time', { ascending: false });

    if (error) throw error;

    return c.json(data || []);
  } catch (error) {
    console.error('Error fetching active time entries:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /time-entries - Create new time entry (clock in)
app.post('/time-entries', async (c) => {
  try {
    const body = await c.req.json();
    const supabase = getSupabase();

    const newEntry = {
      employee_id: body.employee_id,
      employee_name: body.employee_name,
      project_id: body.project_id || null,
      work_order_id: body.work_order_id || null,
      start_time: body.start_time || new Date().toISOString(),
      status: 'in_progress',
      gps_locations: body.gps_locations || [],
      notes: body.notes || null,
    };

    const { data, error } = await supabase
      .from('time_entries')
      .insert([newEntry])
      .select()
      .single();

    if (error) throw error;

    console.log('Time entry created:', data.id);
    return c.json(data, 201);
  } catch (error) {
    console.error('Error creating time entry:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /time-entries/:id/clock-out - Clock out (end time entry)
app.patch('/time-entries/:id/clock-out', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabase();

    const endTime = body.end_time || new Date().toISOString();

    // Get the entry to calculate duration
    const { data: entry, error: fetchError } = await supabase
      .from('time_entries')
      .select('start_time, gps_locations')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Calculate duration in hours
    const startTime = new Date(entry.start_time);
    const endTimeDate = new Date(endTime);
    const durationMs = endTimeDate.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Update GPS locations if provided
    const gpsLocations = body.gps_locations 
      ? [...(entry.gps_locations || []), ...body.gps_locations]
      : entry.gps_locations;

    const { data, error } = await supabase
      .from('time_entries')
      .update({
        end_time: endTime,
        duration_hours: durationHours,
        status: 'completed',
        gps_locations: gpsLocations,
        notes: body.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('Time entry clocked out:', id);
    return c.json(data);
  } catch (error) {
    console.error('Error clocking out:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PATCH /time-entries/:id - Update time entry
app.patch('/time-entries/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const supabase = getSupabase();

    const updates = {
      ...body,
      updated_at: new Date().toISOString()
    };

    // Remove id from updates if present
    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabase
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('Time entry updated:', id);
    return c.json(data);
  } catch (error) {
    console.error('Error updating time entry:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /time-entries/:id - Delete time entry
app.delete('/time-entries/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const supabase = getSupabase();

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('Time entry deleted:', id);
    return c.json({ success: true, message: 'Time entry deleted' });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /time-entries/report - Get time entries with filters for reporting
app.get('/time-entries/report', async (c) => {
  try {
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');
    const employeeId = c.req.query('employee_id');
    const projectId = c.req.query('project_id');

    const supabase = getSupabase();
    let query = supabase
      .from('time_entries')
      .select('*')
      .order('start_time', { ascending: false });

    if (startDate) {
      query = query.gte('start_time', startDate);
    }
    if (endDate) {
      query = query.lte('start_time', endDate);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return c.json(data || []);
  } catch (error) {
    console.error('Error generating time report:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
