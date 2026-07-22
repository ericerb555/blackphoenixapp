/**
 * Calendar Schedule View Component
 * 
 * Reusable calendar component that matches Master Scheduling design
 * Can be used standalone or as a tab in Master Scheduling
 */

import { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Search,
  Filter,
  Edit,
  Trash2,
  MoreVertical,
  Bell,
  Repeat,
  Tag,
  ChevronDown,
  Download,
  Settings,
  Grid,
  List,
  Target
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  category: string;
  color: string;
  description?: string;
  location?: string;
  attendees?: string[];
  type: 'appointment' | 'meeting' | 'call' | 'task' | 'work-order';
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface CalendarCategory {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
  icon?: any;
}

const DEFAULT_CATEGORIES: CalendarCategory[] = [
  { id: 'work', name: 'Work Orders', color: '#ea580c', enabled: true, icon: Target },
  { id: 'meetings', name: 'Meetings', color: '#8b5cf6', enabled: true, icon: Users },
  { id: 'appointments', name: 'Appointments', color: '#10b981', enabled: true, icon: CalendarIcon },
  { id: 'calls', name: 'Calls', color: '#f59e0b', enabled: true, icon: Phone },
  { id: 'personal', name: 'Personal', color: '#3b82f6', enabled: true, icon: Tag },
];

const DEFAULT_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Team Stand-up',
    startTime: '09:00',
    endTime: '09:30',
    date: '2026-01-22',
    category: 'meetings',
    color: '#8b5cf6',
    type: 'meeting',
    attendees: ['John', 'Sarah', 'Mike'],
    recurring: 'daily'
  },
  {
    id: '2',
    title: 'HVAC Installation - Smith Residence',
    startTime: '10:00',
    endTime: '14:00',
    date: '2026-01-22',
    category: 'work',
    color: '#ea580c',
    type: 'work-order',
    location: '123 Oak Street',
    description: 'Install new HVAC system'
  },
  {
    id: '3',
    title: 'Client Consultation',
    startTime: '13:00',
    endTime: '14:00',
    date: '2026-01-23',
    category: 'meetings',
    color: '#8b5cf6',
    type: 'meeting',
    location: 'Office Conference Room A'
  },
  {
    id: '4',
    title: 'Electrical Panel Upgrade',
    startTime: '08:00',
    endTime: '12:00',
    date: '2026-01-23',
    category: 'work',
    color: '#ea580c',
    type: 'work-order',
    location: '456 Elm Drive'
  },
  {
    id: '5',
    title: 'Budget Planning Meeting',
    startTime: '15:00',
    endTime: '16:30',
    date: '2026-01-24',
    category: 'meetings',
    color: '#8b5cf6',
    type: 'meeting'
  },
];

interface CalendarScheduleViewProps {
  embedded?: boolean; // If true, uses compact header for embedding in Master Scheduling
}

export default function CalendarScheduleView({ embedded = false }: CalendarScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 22));
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'day'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [categories, setCategories] = useState<CalendarCategory[]>(DEFAULT_CATEGORIES);
  const [events, setEvents] = useState<CalendarEvent[]>(DEFAULT_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return events.filter(e => 
      e.date === dateStr && 
      categories.find(c => c.id === e.category)?.enabled
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const toggleCategory = (categoryId: string) => {
    setCategories(categories.map(c =>
      c.id === categoryId ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const handleCreateEvent = () => {
    toast.success('Event creation modal would open');
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
    toast.success('Event deleted');
  };

  const weekDays = getWeekDays();
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Calculate stats
  const totalEvents = events.filter(e => categories.find(c => c.id === e.category)?.enabled).length;
  const todayEvents = getEventsForDate(new Date()).length;
  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate > new Date() && categories.find(c => c.id === e.category)?.enabled;
  }).length;

  return (
    <div className={`h-full bg-[#0A0A0A] flex ${embedded ? '' : 'flex-col'} overflow-hidden`}>
      {/* Header - Only show if not embedded */}
      {!embedded && (
        <div className="h-14 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-[#ea580c]" />
              <h1 className="text-xl font-bold text-white">Enterprise Calendar</h1>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#2A2A2A] rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'day'
                    ? 'bg-[#ea580c] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'week'
                    ? 'bg-[#ea580c] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  viewMode === 'month'
                    ? 'bg-[#ea580c] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Stats */}
            <div className="flex items-center gap-4 px-4 py-2 bg-[#2A2A2A] rounded-lg">
              <div className="text-center">
                <div className="text-xs text-gray-400">Today</div>
                <div className="text-lg font-bold text-white">{todayEvents}</div>
              </div>
              <div className="w-px h-8 bg-[#3A3A3A]"></div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Upcoming</div>
                <div className="text-lg font-bold text-orange-400">{upcomingEvents}</div>
              </div>
              <div className="w-px h-8 bg-[#3A3A3A]"></div>
              <div className="text-center">
                <div className="text-xs text-gray-400">Total</div>
                <div className="text-lg font-bold text-green-400">{totalEvents}</div>
              </div>
            </div>

            <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded text-sm transition">
              {viewMode === 'week' ? 'Week' : viewMode === 'month' ? 'Month' : 'Day'}
            </button>
            <button className="p-2 hover:bg-[#2A2A2A] rounded transition">
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-[#2A2A2A] rounded transition">
              <Download className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 bg-[#0F0F0F] border-r border-[#2A2A2A] flex flex-col overflow-hidden">
          {/* Action Button */}
          <div className="p-4 border-b border-[#2A2A2A]">
            <button
              onClick={handleCreateEvent}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-[#2A2A2A]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="p-4 border-b border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase">Upcoming Events</h3>
              <span className="text-xs text-orange-400 font-medium">{upcomingEvents}</span>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events
                .filter(e => {
                  const eventDate = new Date(e.date);
                  return eventDate >= new Date() && categories.find(c => c.id === e.category)?.enabled;
                })
                .slice(0, 5)
                .map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="w-full p-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-left transition"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1.5"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{event.title}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {event.startTime} - {event.endTime}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* View Options */}
          <div className="p-4 border-b border-[#2A2A2A]">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between text-white text-sm font-medium mb-3"
            >
              <span>View Options</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            {showFilters && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="checkbox" defaultChecked className="rounded bg-[#1A1A1A] border-[#2A2A2A]" />
                  <span>Show Event Details</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="checkbox" defaultChecked className="rounded bg-[#1A1A1A] border-[#2A2A2A]" />
                  <span>Show Time Slots</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="checkbox" className="rounded bg-[#1A1A1A] border-[#2A2A2A]" />
                  <span>Show Conflicts</span>
                </label>
              </div>
            )}
          </div>

          {/* Categories Filter */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Event Categories</h3>
              
              <div className="space-y-2">
                {categories.map(category => {
                  const Icon = category.icon;
                  return (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-white cursor-pointer hover:bg-[#1A1A1A] rounded"
                    >
                      <input
                        type="checkbox"
                        checked={category.enabled}
                        onChange={() => toggleCategory(category.id)}
                        className="rounded bg-[#1A1A1A] border-[#2A2A2A]"
                      />
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      {Icon && <Icon className="w-4 h-4" style={{ color: category.color }} />}
                      <span>{category.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Week Navigation */}
          <div className="h-14 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() - 7);
                  setCurrentDate(newDate);
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded transition"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              
              <div className="text-white font-medium">
                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setDate(currentDate.getDate() + 7);
                  setCurrentDate(newDate);
                }}
                className="p-2 hover:bg-[#2A2A2A] rounded transition"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
              
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded text-sm transition"
              >
                TODAY
              </button>
            </div>
          </div>

          {/* Week View Grid */}
          <div className="flex-1 overflow-auto bg-[#0A0A0A]">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-[#1A1A1A] z-10">
                <tr>
                  <th className="w-20 p-2 border-r border-[#2A2A2A] text-xs text-gray-500">Time</th>
                  {weekDays.map((day, index) => {
                    const isToday = formatDate(day) === formatDate(new Date());
                    return (
                      <th
                        key={index}
                        className="p-2 border-r border-[#2A2A2A] text-center"
                      >
                        <div className="text-xs text-gray-500">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`text-lg font-bold ${isToday ? 'text-[#ea580c]' : 'text-white'}`}>
                          {day.getDate()}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.filter((_, i) => i >= 7 && i <= 18).map((time, timeIndex) => (
                  <tr key={time} className="border-t border-[#2A2A2A]">
                    <td className="p-2 border-r border-[#2A2A2A] text-xs text-gray-500 text-right align-top">
                      {time}
                    </td>
                    {weekDays.map((day, dayIndex) => {
                      const dayEvents = getEventsForDate(day).filter(e => {
                        const eventHour = parseInt(e.startTime.split(':')[0]);
                        const slotHour = parseInt(time.split(':')[0]);
                        return eventHour === slotHour;
                      });

                      return (
                        <td
                          key={dayIndex}
                          className="p-1 border-r border-[#2A2A2A] align-top hover:bg-[#1A1A1A] transition cursor-pointer relative h-20"
                          onClick={() => toast.info(`Create event on ${formatDate(day)} at ${time}`)}
                        >
                          {dayEvents.map(event => (
                            <div
                              key={event.id}
                              className="mb-1 p-2 rounded text-xs text-white relative group"
                              style={{ backgroundColor: event.color }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                              }}
                            >
                              <div className="font-medium truncate">{event.title}</div>
                              <div className="text-xs opacity-90">{event.startTime} - {event.endTime}</div>
                              {event.location && (
                                <div className="text-xs opacity-75 truncate flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </div>
                              )}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#2A2A2A]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedEvent.color }}
                    />
                    <span className="text-xs text-gray-400 uppercase">
                      {categories.find(c => c.id === selectedEvent.category)?.name}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{selectedEvent.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-gray-300">
                <Clock className="w-5 h-5 text-[#ea580c]" />
                <div>
                  <div className="text-sm font-medium">
                    {new Date(selectedEvent.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-sm text-gray-400">
                    {selectedEvent.startTime} - {selectedEvent.endTime}
                  </div>
                </div>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-3 text-gray-300">
                  <MapPin className="w-5 h-5 text-[#ea580c]" />
                  <div className="text-sm">{selectedEvent.location}</div>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="flex items-center gap-3 text-gray-300">
                  <Users className="w-5 h-5 text-[#ea580c]" />
                  <div className="text-sm">{selectedEvent.attendees.join(', ')}</div>
                </div>
              )}

              {selectedEvent.description && (
                <div className="pt-4 border-t border-[#2A2A2A]">
                  <p className="text-sm text-gray-300">{selectedEvent.description}</p>
                </div>
              )}

              <div className="pt-4 border-t border-[#2A2A2A] flex gap-3">
                <button
                  onClick={() => toast.info('Edit event')}
                  className="flex-1 px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDeleteEvent(selectedEvent.id);
                    setSelectedEvent(null);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
