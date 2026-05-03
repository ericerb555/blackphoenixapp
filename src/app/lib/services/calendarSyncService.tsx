/**
 * Calendar & Scheduling Sync Service
 * Centralized service for syncing calendar events across all systems
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  allDay?: boolean;
  
  // Classification
  type: 'appointment' | 'meeting' | 'job' | 'shift' | 'task' | 'call' | 'time-off' | 'project';
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'pending';
  
  // Visual
  color: string;
  icon?: string;
  
  // Location & Participants
  location?: string;
  address?: string;
  attendees?: string[];
  assignedTo?: string[];
  
  // Recurrence
  recurring?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  recurringEndDate?: string;
  recurringDays?: number[]; // 0-6 for Sun-Sat
  
  // Integration References
  projectId?: string;
  jobId?: string;
  customerId?: string;
  invoiceId?: string;
  quoteId?: string;
  workOrderId?: string;
  employeeId?: string;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  // Reminders
  reminders?: {
    time: number; // minutes before
    method: 'email' | 'sms' | 'push' | 'in-app';
  }[];
  
  // Notes
  notes?: string;
  attachments?: string[];
  
  // Conflicts
  hasConflict?: boolean;
  conflictsWith?: string[];
}

export interface SyncSource {
  id: string;
  name: string;
  type: 'work-orders' | 'projects' | 'appointments' | 'meetings' | 'shifts' | 'time-off' | 'tasks';
  enabled: boolean;
  color: string;
  lastSync: string;
}

class CalendarSyncService {
  private storageKey = 'calendar_events_unified';
  private sourcesKey = 'calendar_sync_sources';
  private conflictsKey = 'calendar_conflicts';

  // Get all events
  getAllEvents(): CalendarEvent[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : this.initializeDefaultEvents();
  }

  // Get events for date range
  getEventsForDateRange(startDate: string, endDate: string): CalendarEvent[] {
    const events = this.getAllEvents();
    return events.filter(event => {
      const eventDate = event.date;
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  // Get events for specific date
  getEventsForDate(date: string): CalendarEvent[] {
    return this.getAllEvents().filter(event => event.date === date);
  }

  // Get events by type
  getEventsByType(type: CalendarEvent['type']): CalendarEvent[] {
    return this.getAllEvents().filter(event => event.type === type);
  }

  // Get events by employee
  getEventsByEmployee(employeeId: string): CalendarEvent[] {
    return this.getAllEvents().filter(event => 
      event.employeeId === employeeId || 
      event.assignedTo?.includes(employeeId) ||
      event.attendees?.includes(employeeId)
    );
  }

  // Get events by project/job
  getEventsByProject(projectId: string): CalendarEvent[] {
    return this.getAllEvents().filter(event => 
      event.projectId === projectId || event.jobId === projectId || event.workOrderId === projectId
    );
  }

  // Get events by customer
  getEventsByCustomer(customerId: string): CalendarEvent[] {
    return this.getAllEvents().filter(event => event.customerId === customerId);
  }

  // Add event
  addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): CalendarEvent {
    const events = this.getAllEvents();
    
    const newEvent: CalendarEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Check for conflicts
    this.detectConflicts(newEvent, events);
    
    events.push(newEvent);
    this.saveEvents(events);
    
    // Handle recurring events
    if (newEvent.recurring && newEvent.recurring !== 'none') {
      this.generateRecurringEvents(newEvent);
    }
    
    return newEvent;
  }

  // Update event
  updateEvent(eventId: string, updates: Partial<CalendarEvent>): void {
    const events = this.getAllEvents();
    const index = events.findIndex(e => e.id === eventId);
    
    if (index !== -1) {
      events[index] = {
        ...events[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Recheck conflicts
      this.detectConflicts(events[index], events);
      
      this.saveEvents(events);
    }
  }

  // Delete event
  deleteEvent(eventId: string): void {
    const events = this.getAllEvents();
    const filtered = events.filter(e => e.id !== eventId);
    this.saveEvents(filtered);
  }

  // Sync from work orders
  syncFromWorkOrders(workOrders: any[]): void {
    const events = this.getAllEvents();
    
    workOrders.forEach(wo => {
      // Check if event already exists
      const existingEvent = events.find(e => e.workOrderId === wo.id);
      
      if (existingEvent) {
        // Update existing
        this.updateEvent(existingEvent.id, {
          title: wo.title || wo.customerName,
          description: wo.description,
          date: wo.scheduledDate || wo.startDate,
          startTime: wo.startTime || '09:00',
          endTime: wo.endTime || '17:00',
          status: wo.status === 'completed' ? 'completed' : wo.status === 'in-progress' ? 'in-progress' : 'scheduled',
          location: wo.location || wo.address,
          assignedTo: wo.assignedTechnicians || []
        });
      } else {
        // Create new
        this.addEvent({
          title: wo.title || `Job: ${wo.customerName}`,
          description: wo.description,
          date: wo.scheduledDate || wo.startDate,
          startTime: wo.startTime || '09:00',
          endTime: wo.endTime || '17:00',
          type: 'job',
          category: 'work-orders',
          priority: wo.priority || 'medium',
          status: wo.status === 'completed' ? 'completed' : wo.status === 'in-progress' ? 'in-progress' : 'scheduled',
          color: '#ea580c',
          location: wo.location || wo.address,
          workOrderId: wo.id,
          customerId: wo.customerId,
          assignedTo: wo.assignedTechnicians || [],
          createdBy: 'system'
        });
      }
    });
    
    this.updateSyncSource('work-orders');
  }

  // Sync from projects
  syncFromProjects(projects: any[]): void {
    const events = this.getAllEvents();
    
    projects.forEach(project => {
      const existingEvent = events.find(e => e.projectId === project.id);
      
      if (existingEvent) {
        this.updateEvent(existingEvent.id, {
          title: project.name || project.title,
          description: project.description,
          date: project.startDate,
          endDate: project.endDate,
          status: project.status
        });
      } else {
        this.addEvent({
          title: `Project: ${project.name || project.title}`,
          description: project.description,
          date: project.startDate,
          startTime: '09:00',
          endTime: '17:00',
          type: 'project',
          category: 'projects',
          priority: project.priority || 'medium',
          status: 'scheduled',
          color: '#8b5cf6',
          projectId: project.id,
          customerId: project.customerId,
          assignedTo: project.team || [],
          createdBy: 'system'
        });
      }
    });
    
    this.updateSyncSource('projects');
  }

  // Sync from appointments
  syncFromAppointments(appointments: any[]): void {
    const events = this.getAllEvents();
    
    appointments.forEach(appt => {
      const existingEvent = events.find(e => e.id === appt.id);
      
      if (!existingEvent) {
        this.addEvent({
          title: appt.title || `Appointment: ${appt.customerName}`,
          description: appt.notes,
          date: appt.date,
          startTime: appt.startTime,
          endTime: appt.endTime,
          type: 'appointment',
          category: 'appointments',
          priority: 'medium',
          status: appt.status || 'scheduled',
          color: '#10b981',
          location: appt.location,
          address: appt.address,
          customerId: appt.customerId,
          attendees: [appt.assignedTo],
          createdBy: 'system'
        });
      }
    });
    
    this.updateSyncSource('appointments');
  }

  // Sync from employee shifts
  syncFromShifts(shifts: any[]): void {
    const events = this.getAllEvents();
    
    shifts.forEach(shift => {
      const existingEvent = events.find(e => e.id === shift.id);
      
      if (!existingEvent) {
        this.addEvent({
          title: `Shift: ${shift.position}`,
          description: shift.notes,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          type: shift.status === 'time-off' ? 'time-off' : 'shift',
          category: 'shifts',
          priority: 'low',
          status: shift.status === 'time-off-pending' ? 'pending' : 'scheduled',
          color: shift.color || '#3b82f6',
          employeeId: shift.employeeId,
          assignedTo: [shift.employeeId],
          createdBy: 'system'
        });
      }
    });
    
    this.updateSyncSource('shifts');
  }

  // Detect conflicts
  detectConflicts(newEvent: CalendarEvent, allEvents: CalendarEvent[]): void {
    if (!newEvent.assignedTo && !newEvent.employeeId) return;
    
    const conflicts: string[] = [];
    const assignedIds = newEvent.assignedTo || (newEvent.employeeId ? [newEvent.employeeId] : []);
    
    allEvents.forEach(existingEvent => {
      if (existingEvent.id === newEvent.id) return;
      if (existingEvent.date !== newEvent.date) return;
      
      const existingIds = existingEvent.assignedTo || (existingEvent.employeeId ? [existingEvent.employeeId] : []);
      const hasCommonAssignee = assignedIds.some(id => existingIds.includes(id));
      
      if (hasCommonAssignee) {
        // Check time overlap
        const newStart = this.timeToMinutes(newEvent.startTime);
        const newEnd = this.timeToMinutes(newEvent.endTime);
        const existingStart = this.timeToMinutes(existingEvent.startTime);
        const existingEnd = this.timeToMinutes(existingEvent.endTime);
        
        if (this.hasTimeOverlap(newStart, newEnd, existingStart, existingEnd)) {
          conflicts.push(existingEvent.id);
        }
      }
    });
    
    newEvent.hasConflict = conflicts.length > 0;
    newEvent.conflictsWith = conflicts;
    
    if (conflicts.length > 0) {
      this.logConflict(newEvent, conflicts);
    }
  }

  // Generate recurring events
  generateRecurringEvents(baseEvent: CalendarEvent): void {
    if (!baseEvent.recurring || baseEvent.recurring === 'none') return;
    
    const events = this.getAllEvents();
    const startDate = new Date(baseEvent.date);
    const endDate = baseEvent.recurringEndDate 
      ? new Date(baseEvent.recurringEndDate)
      : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default
    
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + 1); // Start from next occurrence
    
    while (currentDate <= endDate) {
      const shouldCreate = this.shouldCreateRecurrence(baseEvent, currentDate);
      
      if (shouldCreate) {
        const recurringEvent: CalendarEvent = {
          ...baseEvent,
          id: `evt_${currentDate.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
          date: currentDate.toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        events.push(recurringEvent);
      }
      
      // Increment date based on recurrence
      switch (baseEvent.recurring) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }
    
    this.saveEvents(events);
  }

  // Check if recurrence should be created
  shouldCreateRecurrence(baseEvent: CalendarEvent, date: Date): boolean {
    if (!baseEvent.recurringDays || baseEvent.recurringDays.length === 0) {
      return true;
    }
    
    return baseEvent.recurringDays.includes(date.getDay());
  }

  // Get sync sources
  getSyncSources(): SyncSource[] {
    const data = localStorage.getItem(this.sourcesKey);
    return data ? JSON.parse(data) : this.initializeDefaultSources();
  }

  // Update sync source
  updateSyncSource(type: SyncSource['type']): void {
    const sources = this.getSyncSources();
    const source = sources.find(s => s.type === type);
    
    if (source) {
      source.lastSync = new Date().toISOString();
      localStorage.setItem(this.sourcesKey, JSON.stringify(sources));
    }
  }

  // Sync all sources
  syncAllSources(): void {
    // This would be called with actual data from each system
    console.log('Syncing all calendar sources...');
    
    // In a real implementation, this would fetch from each source
    // For now, we'll just update the sync times
    const sources = this.getSyncSources();
    sources.forEach(source => {
      source.lastSync = new Date().toISOString();
    });
    localStorage.setItem(this.sourcesKey, JSON.stringify(sources));
  }

  // Get conflicts
  getConflicts(): any[] {
    const data = localStorage.getItem(this.conflictsKey);
    return data ? JSON.parse(data) : [];
  }

  // Log conflict
  private logConflict(event: CalendarEvent, conflicts: string[]): void {
    const allConflicts = this.getConflicts();
    allConflicts.push({
      eventId: event.id,
      eventTitle: event.title,
      date: event.date,
      conflictsWith: conflicts,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(this.conflictsKey, JSON.stringify(allConflicts));
  }

  // Helper: Convert time to minutes
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper: Check time overlap
  private hasTimeOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && end1 > start2;
  }

  // Save events
  private saveEvents(events: CalendarEvent[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(events));
  }

  // Initialize default events
  private initializeDefaultEvents(): CalendarEvent[] {
    const today = new Date().toISOString().split('T')[0];
    return [
      {
        id: 'evt_1',
        title: 'Team Stand-up',
        description: 'Daily team sync meeting',
        startTime: '09:00',
        endTime: '09:30',
        date: today,
        type: 'meeting',
        category: 'meetings',
        priority: 'medium',
        status: 'scheduled',
        color: '#8b5cf6',
        recurring: 'daily',
        attendees: ['John Doe', 'Sarah Smith', 'Mike Johnson'],
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  // Initialize default sources
  private initializeDefaultSources(): SyncSource[] {
    return [
      {
        id: 'work-orders',
        name: 'Work Orders',
        type: 'work-orders',
        enabled: true,
        color: '#ea580c',
        lastSync: new Date().toISOString()
      },
      {
        id: 'projects',
        name: 'Projects',
        type: 'projects',
        enabled: true,
        color: '#8b5cf6',
        lastSync: new Date().toISOString()
      },
      {
        id: 'appointments',
        name: 'Appointments',
        type: 'appointments',
        enabled: true,
        color: '#10b981',
        lastSync: new Date().toISOString()
      },
      {
        id: 'meetings',
        name: 'Meetings',
        type: 'meetings',
        enabled: true,
        color: '#3b82f6',
        lastSync: new Date().toISOString()
      },
      {
        id: 'shifts',
        name: 'Employee Shifts',
        type: 'shifts',
        enabled: true,
        color: '#f59e0b',
        lastSync: new Date().toISOString()
      },
      {
        id: 'time-off',
        name: 'Time Off',
        type: 'time-off',
        enabled: true,
        color: '#ef4444',
        lastSync: new Date().toISOString()
      }
    ];
  }
}

export const calendarSyncService = new CalendarSyncService();
