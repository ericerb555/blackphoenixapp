/**
 * Service Scheduling - Integrated with Master Schedule
 * 
 * Customer-facing appointment scheduling that feeds into
 * the Enterprise Master Scheduling system
 */

import { useState, useEffect } from 'react';
import {
  Calendar, Clock, User, MapPin, CheckCircle2, AlertCircle, Star, 
  Phone, Mail, ChevronLeft, ChevronRight, Grid, List, Filter,
  Search, Plus, Wrench, DollarSign, Eye, Settings, RefreshCw,
  Check, X, Users, Target, Activity, TrendingUp, FileText,
  Cloud, Sun, CloudRain, Wind, Zap, Bell, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';

interface Employee {
  id: string;
  name: string;
  avatar: string;
  positions: string[];
  specialty: string;
  rating: number;
  completed: number;
  certified: boolean;
  availability: string[];
  phone?: string;
  email?: string;
  skills: string[];
}

interface TimeSlot {
  time: string;
  available: boolean;
  employeeId?: string;
}

interface ServiceAppointment {
  id: string;
  contractNumber: string;
  serviceTitle: string;
  location: string;
  customerName: string;
  estimatedDuration: string;
  depositAmount: number;
  depositPaid: boolean;
  date: string;
  time: string;
  employeeId: string;
  status: 'scheduled' | 'pending' | 'confirmed' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface WeatherData {
  date: string;
  condition: string;
  temp: number;
  precipChance: number;
}

export default function ServiceScheduling() {
  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherData, setWeatherData] = useState<Map<string, WeatherData>>(new Map());
  const [selectedService, setSelectedService] = useState('hvac-repair');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Available services to schedule
  const availableServices = [
    { id: 'hvac-repair', name: 'HVAC System Repair', category: 'HVAC', duration: '4-6 hours', deposit: 796.96 },
    { id: 'hvac-install', name: 'HVAC Installation', category: 'HVAC', duration: '6-8 hours', deposit: 1500.00 },
    { id: 'hvac-maintenance', name: 'HVAC Maintenance', category: 'HVAC', duration: '2-3 hours', deposit: 350.00 },
    { id: 'plumbing-repair', name: 'Plumbing Repair', category: 'Plumbing', duration: '2-4 hours', deposit: 450.00 },
    { id: 'plumbing-install', name: 'Plumbing Installation', category: 'Plumbing', duration: '4-6 hours', deposit: 850.00 },
    { id: 'electrical-repair', name: 'Electrical Repair', category: 'Electrical', duration: '2-3 hours', deposit: 400.00 },
    { id: 'electrical-install', name: 'Electrical Installation', category: 'Electrical', duration: '4-6 hours', deposit: 900.00 },
    { id: 'general-maintenance', name: 'General Maintenance', category: 'Maintenance', duration: '1-2 hours', deposit: 200.00 },
    { id: 'emergency-service', name: 'Emergency Service Call', category: 'Emergency', duration: '1-4 hours', deposit: 500.00 },
  ];

  const selectedServiceData = availableServices.find(s => s.id === selectedService) || availableServices[0];

  const contractData = {
    contractNumber: 'CT-20260122-0045',
    serviceTitle: selectedServiceData.name,
    location: '123 Main St, New York, NY 10001',
    customerName: String(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Customer'),
    estimatedDuration: selectedServiceData.duration,
    depositAmount: selectedServiceData.deposit,
    depositPaid: true,
    priority: 'medium' as const,
  };

  // Enhanced technicians with more details matching master schedule
  const technicians: Employee[] = [
    { 
      id: 'e1', 
      name: 'Mike Johnson', 
      avatar: 'MJ',
      positions: ['hvac-tech'],
      specialty: 'HVAC Specialist', 
      rating: 4.9, 
      completed: 342, 
      certified: true,
      availability: ['2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30'],
      phone: '555-0201',
      email: 'mike.j@example.com',
      skills: ['HVAC', 'Refrigeration', 'Heating Systems']
    },
    { 
      id: 'e2', 
      name: 'Sarah Martinez', 
      avatar: 'SM',
      positions: ['hvac-tech'],
      specialty: 'HVAC Expert', 
      rating: 4.8, 
      completed: 298, 
      certified: true,
      availability: ['2026-01-27', '2026-01-28', '2026-01-31'],
      phone: '555-0202',
      email: 'sarah.m@example.com',
      skills: ['HVAC', 'Air Quality', 'Commercial Systems']
    },
    { 
      id: 'e3', 
      name: 'David Chen', 
      avatar: 'DC',
      positions: ['lead-tech'],
      specialty: 'Senior Technician', 
      rating: 4.7, 
      completed: 256, 
      certified: true,
      availability: ['2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31'],
      phone: '555-0203',
      email: 'david.c@example.com',
      skills: ['HVAC', 'Electrical', 'Plumbing']
    }
  ];

  // Get week days
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const availableDates = getWeekDays().map(date => ({
    date: date.toISOString().split('T')[0],
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    dayNum: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    slots: Math.floor(Math.random() * 5) + 2,
    isToday: date.toDateString() === new Date().toDateString(),
  }));

  const timeSlots: TimeSlot[] = [
    { time: '08:00 AM', available: true },
    { time: '10:00 AM', available: true },
    { time: '12:00 PM', available: false },
    { time: '02:00 PM', available: true },
    { time: '04:00 PM', available: true }
  ];

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  useEffect(() => {
    let active = true;
    const loadAppointments = async () => {
      if (!user) {
        if (active) setAppointments([]);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const response = await fetch(`${API_BASE}/schedule/appointments`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load scheduled appointments.');
        if (active) setAppointments(Array.isArray(result.appointments) ? result.appointments : []);
      } catch (error) {
        console.error('Error loading appointments:', error);
        if (active) toast.error(error instanceof Error ? error.message : 'Unable to load scheduled appointments.');
      }
    };
    void loadAppointments();
    return () => { active = false; };
  }, [API_BASE, user]);

  const handleConfirmAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedTechnician) {
      toast.error('Please select all required fields');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token || !user?.email) {
      toast.error('Please sign in before scheduling an appointment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/schedule/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...contractData,
          customerEmail: user.email,
          date: selectedDate,
          time: selectedTime,
          employeeId: selectedTechnician,
          status: 'scheduled',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to schedule this appointment.');
      const appointment = result.appointment as ServiceAppointment;
      setAppointments((current) => [...current.filter((item) => item.id !== appointment.id), appointment]);
      toast.success('Appointment scheduled successfully!', {
        description: 'It is saved to the master schedule.',
      });
      setSelectedDate('');
      setSelectedTime('');
      setSelectedTechnician('');
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to schedule appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    if (condition.includes('rain')) return <CloudRain className="w-4 h-4" />;
    if (condition.includes('cloud')) return <Cloud className="w-4 h-4" />;
    if (condition.includes('wind')) return <Wind className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
  };

  const weekStart = availableDates[0];
  const weekEnd = availableDates[6];
  const totalAppointments = appointments.length;
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmed').length;

  return (
    <div className="h-screen bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* Top Header - Matching Master Schedule */}
      <div className="h-14 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              window.location.href = '/unified-dashboard';
            }}
            className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Back to Unified Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#ea580c]" />
            <h1 className="text-xl font-bold text-white">Service Scheduling</h1>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#2A2A2A] rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'calendar'
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4 inline mr-1" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'list'
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4 inline mr-1" />
              List
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          <div className="flex items-center gap-4 px-4 py-2 bg-[#2A2A2A] rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-400">Scheduled</div>
              <div className="text-lg font-bold text-white">{totalAppointments}</div>
            </div>
            <div className="w-px h-8 bg-[#3A3A3A]"></div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Confirmed</div>
              <div className="text-lg font-bold text-green-400">{confirmedAppointments}</div>
            </div>
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded text-sm transition flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button className="p-2 hover:bg-[#2A2A2A] rounded transition">
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={() => window.location.href = '/master-scheduling'}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View Master Schedule
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Filters Modal */}
        {showFilters && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Service Selection & Filters</h2>
                  <p className="text-sm text-gray-400">Choose the service you want to schedule</p>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Service Selection */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-[#ea580c]" />
                    Select Service Type
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {availableServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service.id);
                          // Reset selections when changing service
                          setSelectedDate('');
                          setSelectedTime('');
                          setSelectedTechnician('');
                        }}
                        className={`p-4 rounded-xl border-2 transition text-left ${
                          selectedService === service.id
                            ? 'bg-gradient-to-br from-orange-600/20 to-orange-700/20 border-orange-500'
                            : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-orange-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="text-sm text-gray-500 mb-1">{service.category}</div>
                            <h4 className="font-bold text-white text-sm">{service.name}</h4>
                          </div>
                          {selectedService === service.id && (
                            <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-sm text-gray-400">{service.duration}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-3 h-3 text-gray-500" />
                            <span className="text-sm text-gray-400">${service.deposit.toFixed(2)} deposit</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Filter */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Search className="w-5 h-5 text-[#ea580c]" />
                    Search
                  </h3>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search appointments, customers, or technicians..."
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">Appointment Status</h3>
                  <div className="flex gap-2">
                    {['all', 'scheduled', 'pending', 'confirmed', 'completed'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          filterStatus === status
                            ? 'bg-[#ea580c] text-white'
                            : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Filter */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">Priority Level</h3>
                  <div className="flex gap-2">
                    {['all', 'low', 'medium', 'high', 'urgent'].map((priority) => (
                      <button
                        key={priority}
                        onClick={() => setFilterPriority(priority)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          filterPriority === priority
                            ? 'bg-[#ea580c] text-white'
                            : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                        }`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#2A2A2A] p-6 flex items-center justify-between">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                    setFilterPriority('all');
                  }}
                  className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition"
                >
                  Apply & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contract Info Bar */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-white mb-1">{contractData.serviceTitle}</h2>
                <p className="text-sm text-gray-400">Contract #{contractData.contractNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                  DEPOSIT PAID
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                  contractData.priority === 'urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  contractData.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                  contractData.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                  'bg-green-500/10 text-green-400 border-green-500/20'
                }`}>
                  {contractData.priority.toUpperCase()} PRIORITY
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                  <User className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="text-sm font-medium text-white">{contractData.customerName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                  <MapPin className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-sm font-medium text-white">{contractData.location}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                  <Clock className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-sm font-medium text-white">{contractData.estimatedDuration}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600/20 to-orange-700/20 flex items-center justify-center border border-orange-500/20">
                  <DollarSign className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Deposit</p>
                  <p className="text-sm font-medium text-white">${contractData.depositAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Scheduling Area */}
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Week Navigator */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Select Appointment Date & Time</h3>
                <p className="text-sm text-gray-400">
                  {weekStart.month} {weekStart.dayNum} - {weekEnd.month} {weekEnd.dayNum}, 2026
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevWeek}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg text-sm transition"
                >
                  Today
                </button>
                <button
                  onClick={handleNextWeek}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Calendar Week View */}
            <div className="grid grid-cols-7 gap-2">
              {availableDates.map((dateOption) => (
                <button
                  key={dateOption.date}
                  onClick={() => setSelectedDate(dateOption.date)}
                  className={`p-4 rounded-xl border-2 transition ${
                    selectedDate === dateOption.date
                      ? 'bg-gradient-to-br from-orange-600/20 to-orange-700/20 border-orange-500'
                      : dateOption.isToday
                      ? 'bg-[#0A0A0A] border-blue-500/50'
                      : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-orange-500/30'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-1">{dateOption.day}</div>
                    <div className="text-2xl font-bold text-white mb-1">{dateOption.dayNum}</div>
                    <div className="text-sm text-gray-500">{dateOption.month}</div>
                    {dateOption.isToday && (
                      <div className="mt-2">
                        <span className="text-sm px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">Today</span>
                      </div>
                    )}
                    {selectedDate === dateOption.date && (
                      <CheckCircle2 className="w-5 h-5 text-orange-400 mx-auto mt-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#ea580c]" />
                Available Time Slots
              </h3>
              <div className="grid grid-cols-5 gap-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                    className={`p-4 rounded-xl border-2 transition ${
                      selectedTime === slot.time
                        ? 'bg-gradient-to-br from-orange-600/20 to-orange-700/20 border-orange-500'
                        : slot.available
                        ? 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-orange-500/30'
                        : 'bg-[#0A0A0A] border-[#2A2A2A] opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <p className={`font-bold text-center ${
                      selectedTime === slot.time 
                        ? 'text-orange-400' 
                        : slot.available 
                        ? 'text-white' 
                        : 'text-gray-500'
                    }`}>
                      {slot.time}
                    </p>
                    {!slot.available && (
                      <p className="text-sm text-gray-500 mt-1 text-center">Booked</p>
                    )}
                    {selectedTime === slot.time && (
                      <CheckCircle2 className="w-5 h-5 text-orange-400 mx-auto mt-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Technician Selection */}
          {selectedDate && selectedTime && (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#ea580c]" />
                Select Technician
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {technicians
                  .filter(tech => tech.availability.includes(selectedDate))
                  .map((tech) => (
                    <button
                      key={tech.id}
                      onClick={() => setSelectedTechnician(tech.id)}
                      className={`p-6 rounded-xl border-2 transition text-left ${
                        selectedTechnician === tech.id
                          ? 'bg-gradient-to-br from-orange-600/10 to-orange-700/10 border-orange-500'
                          : 'bg-[#0A0A0A] border-[#2A2A2A] hover:border-orange-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white font-bold text-lg">
                          {tech.avatar}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{tech.name}</h4>
                          <p className="text-sm text-gray-400">{tech.specialty}</p>
                        </div>
                        {selectedTechnician === tech.id && (
                          <CheckCircle2 className="w-6 h-6 text-orange-400" />
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-orange-400 fill-orange-400" />
                          <span className="text-sm text-white">{tech.rating} Rating</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-white">{tech.completed} Completed</span>
                        </div>
                        {tech.certified && (
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-blue-400">Certified</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-3 border-t border-[#2A2A2A]">
                        <p className="text-sm text-gray-500 mb-2">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {tech.skills.map((skill, i) => (
                            <span key={i} className="px-2 py-1 bg-[#2A2A2A] text-gray-400 rounded text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Confirmation */}
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] rounded-xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {selectedDate && selectedTime && selectedTechnician
                    ? 'Ready to Schedule Appointment'
                    : 'Complete All Steps to Continue'}
                </h3>
                <p className="text-sm text-gray-400">
                  {selectedDate && selectedTime && selectedTechnician
                    ? `${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${selectedTime} with ${technicians.find(t => t.id === selectedTechnician)?.name}`
                    : 'Please select a date, time, and technician to schedule your service'}
                </p>
              </div>
              
              <button
                onClick={handleConfirmAppointment}
                disabled={!selectedDate || !selectedTime || !selectedTechnician || isSubmitting}
                className={`px-10 py-4 rounded-xl font-bold transition shadow-lg flex items-center gap-3 ${
                  selectedDate && selectedTime && selectedTechnician
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-orange-500/20'
                    : 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
                }`}
              >
                <Check className="w-6 h-6" />
                {isSubmitting ? 'Saving Appointment…' : 'Confirm & Schedule'}
              </button>
            </div>
          </div>

          {/* Upcoming Appointments */}
          {appointments.length > 0 && (
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#ea580c]" />
                Your Scheduled Appointments
              </h3>
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{apt.serviceTitle}</h4>
                        <p className="text-sm text-gray-400">
                          {new Date(apt.date).toLocaleDateString()} at {apt.time} • 
                          {' '}{technicians.find(t => t.id === apt.employeeId)?.name}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      apt.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      apt.status === 'scheduled' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {apt.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}