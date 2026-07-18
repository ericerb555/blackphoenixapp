/**
 * Time Tracking API Routes
 * Handles employee time entries, GPS tracking, and payroll integration
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const timeTrackingRouter = new Hono();

// Get all employees with time tracking status
timeTrackingRouter.get("/employees", async (c) => {
  try {
    const employees = await kv.getByPrefix("time_employee:");
    
    // Get active time entries for each employee
    const activeEntries = await kv.getByPrefix("time_entry_active:");
    
    // Merge employee data with active entries
    const employeesWithStatus = employees.map((emp: any) => {
      const activeEntry = activeEntries.find((entry: any) => 
        entry.employeeId === emp.id && entry.status === 'active'
      );
      
      return {
        ...emp,
        currentEntry: activeEntry || null,
        isActive: !!activeEntry
      };
    });
    
    return c.json({
      success: true,
      employees: employeesWithStatus,
      count: employeesWithStatus.length
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get specific employee
timeTrackingRouter.get("/employees/:id", async (c) => {
  try {
    const employeeId = c.req.param("id");
    const employee = await kv.get(`time_employee:${employeeId}`);
    
    if (!employee) {
      return c.json({ success: false, error: "Employee not found" }, 404);
    }
    
    // Get active entry
    const activeEntry = await kv.get(`time_entry_active:${employeeId}`);
    
    // Get recent entries (last 30 days)
    const allEntries = await kv.getByPrefix(`time_entry_history:${employeeId}:`);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentEntries = allEntries.filter((entry: any) => 
      new Date(entry.punchIn).getTime() > thirtyDaysAgo
    );
    
    return c.json({
      success: true,
      employee,
      activeEntry: activeEntry || null,
      recentEntries
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create/Update employee
timeTrackingRouter.post("/employees", async (c) => {
  try {
    const body = await c.req.json();
    const { id, name, role, department, phoneNumber, payRate, assignedProject } = body;
    
    if (!id || !name) {
      return c.json({ success: false, error: "Employee ID and name are required" }, 400);
    }
    
    const employee = {
      id,
      name,
      role: role || 'Employee',
      department: department || 'General',
      phoneNumber: phoneNumber || '',
      payRate: payRate || 0,
      assignedProject: assignedProject || null,
      status: 'clocked-out',
      hoursToday: 0,
      hoursWeek: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`time_employee:${id}`, employee);
    
    return c.json({
      success: true,
      employee
    });
  } catch (error) {
    console.error("Error creating/updating employee:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Punch In
timeTrackingRouter.post("/punch-in", async (c) => {
  try {
    const body = await c.req.json();
    const { employeeId, location, projectId, notes } = body;
    
    if (!employeeId) {
      return c.json({ success: false, error: "Employee ID is required" }, 400);
    }
    
    // Get employee
    const employee = await kv.get(`time_employee:${employeeId}`);
    if (!employee) {
      return c.json({ success: false, error: "Employee not found" }, 404);
    }
    
    // Check if already clocked in
    const activeEntry = await kv.get(`time_entry_active:${employeeId}`);
    if (activeEntry) {
      return c.json({ 
        success: false, 
        error: "Employee is already clocked in",
        activeEntry 
      }, 400);
    }
    
    const now = new Date();
    const entryId = `ENTRY-${employeeId}-${now.getTime()}`;
    
    // Create time entry
    const timeEntry = {
      id: entryId,
      employeeId,
      employeeName: employee.name,
      punchIn: now.toISOString(),
      punchOut: null,
      breakMinutes: 0,
      totalHours: 0,
      location: {
        punchInLocation: location || { lat: 0, lng: 0, address: 'Unknown' }
      },
      projectId: projectId || employee.assignedProject,
      notes: notes || '',
      status: 'active',
      approved: false,
      createdAt: now.toISOString()
    };
    
    // Store active entry
    await kv.set(`time_entry_active:${employeeId}`, timeEntry);
    
    // Update employee status
    employee.status = 'clocked-in';
    employee.lastPunch = now.toISOString();
    employee.currentShiftStart = now.toISOString();
    employee.location = location;
    employee.updatedAt = now.toISOString();
    
    await kv.set(`time_employee:${employeeId}`, employee);
    
    console.log(`✅ ${employee.name} punched in at ${location?.address || 'unknown location'}`);
    
    return c.json({
      success: true,
      timeEntry,
      employee
    });
  } catch (error) {
    console.error("Error punching in:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Punch Out
timeTrackingRouter.post("/punch-out", async (c) => {
  try {
    const body = await c.req.json();
    const { employeeId, location, notes } = body;
    
    if (!employeeId) {
      return c.json({ success: false, error: "Employee ID is required" }, 400);
    }
    
    // Get employee
    const employee = await kv.get(`time_employee:${employeeId}`);
    if (!employee) {
      return c.json({ success: false, error: "Employee not found" }, 404);
    }
    
    // Get active entry
    const activeEntry = await kv.get(`time_entry_active:${employeeId}`);
    if (!activeEntry) {
      return c.json({ 
        success: false, 
        error: "No active time entry found. Employee is not clocked in." 
      }, 400);
    }
    
    const now = new Date();
    const punchInTime = new Date(activeEntry.punchIn);
    const hoursWorked = (now.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);
    const totalHours = Math.round((hoursWorked - activeEntry.breakMinutes / 60) * 100) / 100;
    
    // Complete time entry
    const completedEntry = {
      ...activeEntry,
      punchOut: now.toISOString(),
      totalHours,
      location: {
        ...activeEntry.location,
        punchOutLocation: location || { lat: 0, lng: 0, address: 'Unknown' }
      },
      notes: notes || activeEntry.notes,
      status: 'completed',
      completedAt: now.toISOString()
    };
    
    // Store in history
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    await kv.set(
      `time_entry_history:${employeeId}:${dateKey}:${activeEntry.id}`, 
      completedEntry
    );
    
    // Remove active entry
    await kv.del(`time_entry_active:${employeeId}`);
    
    // Update employee status and hours
    employee.status = 'clocked-out';
    employee.lastPunch = now.toISOString();
    employee.currentShiftStart = null;
    employee.hoursToday = (employee.hoursToday || 0) + totalHours;
    employee.hoursWeek = (employee.hoursWeek || 0) + totalHours;
    employee.location = location;
    employee.updatedAt = now.toISOString();
    
    await kv.set(`time_employee:${employeeId}`, employee);
    
    console.log(`✅ ${employee.name} punched out. Worked ${totalHours} hours`);
    
    return c.json({
      success: true,
      timeEntry: completedEntry,
      employee,
      hoursWorked: totalHours
    });
  } catch (error) {
    console.error("Error punching out:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Start/End Break
timeTrackingRouter.post("/break", async (c) => {
  try {
    const body = await c.req.json();
    const { employeeId, action } = body; // action: 'start' | 'end'
    
    if (!employeeId || !action) {
      return c.json({ 
        success: false, 
        error: "Employee ID and action (start/end) are required" 
      }, 400);
    }
    
    // Get employee
    const employee = await kv.get(`time_employee:${employeeId}`);
    if (!employee) {
      return c.json({ success: false, error: "Employee not found" }, 404);
    }
    
    const now = new Date();
    
    if (action === 'start') {
      // Start break
      employee.status = 'on-break';
      employee.breakStart = now.toISOString();
      employee.lastPunch = now.toISOString();
      employee.updatedAt = now.toISOString();
      
      await kv.set(`time_employee:${employeeId}`, employee);
      
      console.log(`☕ ${employee.name} started break`);
      
      return c.json({
        success: true,
        message: "Break started",
        employee
      });
    } else if (action === 'end') {
      // End break
      if (!employee.breakStart) {
        return c.json({ success: false, error: "No active break found" }, 400);
      }
      
      const breakStart = new Date(employee.breakStart);
      const breakDuration = (now.getTime() - breakStart.getTime()) / (1000 * 60); // minutes
      
      // Update active time entry with break minutes
      const activeEntry = await kv.get(`time_entry_active:${employeeId}`);
      if (activeEntry) {
        activeEntry.breakMinutes = (activeEntry.breakMinutes || 0) + breakDuration;
        await kv.set(`time_entry_active:${employeeId}`, activeEntry);
      }
      
      employee.status = 'clocked-in';
      employee.breakStart = null;
      employee.lastPunch = now.toISOString();
      employee.updatedAt = now.toISOString();
      
      await kv.set(`time_employee:${employeeId}`, employee);
      
      console.log(`✅ ${employee.name} ended break (${Math.round(breakDuration)} minutes)`);
      
      return c.json({
        success: true,
        message: "Break ended",
        employee,
        breakDuration: Math.round(breakDuration)
      });
    } else {
      return c.json({ success: false, error: "Invalid action. Use 'start' or 'end'" }, 400);
    }
  } catch (error) {
    console.error("Error managing break:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get time entries for date range
timeTrackingRouter.get("/entries", async (c) => {
  try {
    const employeeId = c.req.query("employeeId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    
    let entries: any[] = [];
    
    if (employeeId) {
      // Get entries for specific employee
      entries = await kv.getByPrefix(`time_entry_history:${employeeId}:`);
    } else {
      // Get all entries
      entries = await kv.getByPrefix("time_entry_history:");
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Date.now();
      
      entries = entries.filter((entry: any) => {
        const entryTime = new Date(entry.punchIn).getTime();
        return entryTime >= start && entryTime <= end;
      });
    }
    
    // Sort by date descending
    entries.sort((a: any, b: any) => 
      new Date(b.punchIn).getTime() - new Date(a.punchIn).getTime()
    );
    
    return c.json({
      success: true,
      entries,
      count: entries.length
    });
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Approve time entry (for payroll)
timeTrackingRouter.post("/entries/:id/approve", async (c) => {
  try {
    const entryId = c.req.param("id");
    
    // Find entry across all employee histories
    const allEntries = await kv.getByPrefix("time_entry_history:");
    const entry = allEntries.find((e: any) => e.id === entryId);
    
    if (!entry) {
      return c.json({ success: false, error: "Time entry not found" }, 404);
    }
    
    // Update entry approval status
    entry.approved = true;
    entry.approvedAt = new Date().toISOString();
    
    // Reconstruct the key
    const dateKey = new Date(entry.punchIn).toISOString().split('T')[0];
    const key = `time_entry_history:${entry.employeeId}:${dateKey}:${entry.id}`;
    
    await kv.set(key, entry);
    
    console.log(`✅ Time entry ${entryId} approved for payroll`);
    
    return c.json({
      success: true,
      entry
    });
  } catch (error) {
    console.error("Error approving time entry:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get payroll report
timeTrackingRouter.get("/payroll-report", async (c) => {
  try {
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    
    if (!startDate || !endDate) {
      return c.json({ 
        success: false, 
        error: "Start date and end date are required" 
      }, 400);
    }
    
    // Get all entries in date range
    const allEntries = await kv.getByPrefix("time_entry_history:");
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    const entriesInRange = allEntries.filter((entry: any) => {
      const entryTime = new Date(entry.punchIn).getTime();
      return entryTime >= start && entryTime <= end;
    });
    
    // Get all employees
    const employees = await kv.getByPrefix("time_employee:");
    
    // Calculate payroll by employee
    const payrollByEmployee = employees.map((emp: any) => {
      const employeeEntries = entriesInRange.filter((e: any) => 
        e.employeeId === emp.id
      );
      
      const totalHours = employeeEntries.reduce((sum: number, e: any) => 
        sum + (e.totalHours || 0), 0
      );
      
      const grossPay = totalHours * (emp.payRate || 0);
      
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        department: emp.department,
        payRate: emp.payRate,
        totalHours: Math.round(totalHours * 100) / 100,
        grossPay: Math.round(grossPay * 100) / 100,
        entries: employeeEntries.length,
        approvedEntries: employeeEntries.filter((e: any) => e.approved).length
      };
    });
    
    // Calculate totals
    const totals = {
      totalHours: payrollByEmployee.reduce((sum, e) => sum + e.totalHours, 0),
      totalGrossPay: payrollByEmployee.reduce((sum, e) => sum + e.grossPay, 0),
      totalEmployees: payrollByEmployee.length,
      totalEntries: entriesInRange.length
    };
    
    return c.json({
      success: true,
      startDate,
      endDate,
      payrollByEmployee,
      totals
    });
  } catch (error) {
    console.error("Error generating payroll report:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Reset daily/weekly hours (run via cron)
timeTrackingRouter.post("/reset-hours", async (c) => {
  try {
    const resetType = c.req.query("type"); // 'daily' | 'weekly'
    
    const employees = await kv.getByPrefix("time_employee:");
    
    for (const employee of employees) {
      if (resetType === 'daily') {
        employee.hoursToday = 0;
      } else if (resetType === 'weekly') {
        employee.hoursWeek = 0;
      }
      employee.updatedAt = new Date().toISOString();
      
      await kv.set(`time_employee:${employee.id}`, employee);
    }
    
    console.log(`✅ Reset ${resetType} hours for ${employees.length} employees`);
    
    return c.json({
      success: true,
      message: `Reset ${resetType} hours for ${employees.length} employees`
    });
  } catch (error) {
    console.error("Error resetting hours:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default timeTrackingRouter;
