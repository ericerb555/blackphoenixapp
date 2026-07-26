/**
 * Enterprise Master Scheduling System - Enhanced with Weather
 * 
 * Professional scheduling with:
 * - Visual weekly calendar timeline
 * - Employee shift management
 * - Job/Work Order scheduling
 * - Employee assignment to jobs
 * - Color-coded blocks
 * - Drag-and-drop capabilities
 * - Time-off tracking
 * - Conflict detection
 * - Multi-view support (Employee, Jobs, Combined)
 * - Auto-schedule capabilities
 * - Publish & notify system
 * - Weather overlay with multiple sources
 * - Weather-based delay tracking
 */

import { useState, useEffect } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Users, Clock, Filter,
  Search, Plus, Settings, Download, Check, Eye, EyeOff, Bell,
  MoreHorizontal, Edit2, Trash2, Copy, AlertCircle, User,
  CheckCircle, X, RefreshCw, Zap, FileText, ChevronDown,
  Wrench, MapPin, DollarSign, Briefcase, UserCheck, Grid,
  List, Target, TrendingUp, Activity, Phone, Mail, Cloud,
  CloudRain, Sun, Wind, Droplets, CloudSnow, Thermometer, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../components/ui/button/PrimaryButton';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/ui/modal';
import CalendarScheduleView from '../components/CalendarScheduleView';
import { projectId } from '../utils/supabase/info';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Employee {
  id: string;
  name: string;
  avatar: string;
  positions: string[];
  availability: string;
  hoursScheduled: number;
  maxHours: number;
  phone?: string;
  email?: string;
  skills: string[];
}

interface Shift {
  id: string;
  employeeId: string;
  position: string;
  startTime: string;
  endTime: string;
  date: string;
  color: string;
  status: 'scheduled' | 'pending' | 'time-off' | 'time-off-pending';
  jobId?: string; // Link to job if this shift is for a job
}

interface Job {
  id: string;
  title: string;
  customer: string;
  status: 'scheduled' | 'in-progress' | 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string;
  endDate: string;
  estimatedHours: number;
  assignedEmployees: string[];
  location: string;
  value: number;
  description: string;
  color: string;
  requiredSkills: string[];
  appointmentId?: string;
  weatherSensitivity?: 'low' | 'medium' | 'high' | 'critical';
  latitude?: number;
  longitude?: number;
}

interface Position {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
}

interface WeatherData {
  date: string;
  condition: string;
  temp: number;
  precipChance: number;
  precipAmount: number;
  windSpeed: number;
  workableHours: number;
  alerts: string[];
}

export default function MasterScheduling() {
  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'employees' | 'jobs' | 'combined'>('employees');
  const [showFilters, setShowFilters] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJobModal, setShowJobModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAutoScheduleModal, setShowAutoScheduleModal] = useState(false);
  const [autoScheduleSettings, setAutoScheduleSettings] = useState({
    prioritizeUrgent: true,
    respectMaxHours: true,
    matchSkills: true,
    distributeEvenly: true,
    shiftLength: 8,
    startTime: '8:00 AM',
    includeWeekends: false
  });
  const [schedulingResults, setSchedulingResults] = useState<any>(null);

  // Weather integration
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(true);
  const [weatherSource, setWeatherSource] = useState<'openweather' | 'weathergov' | 'weatherapi' | 'demo'>('demo');
  const [showWeatherSettings, setShowWeatherSettings] = useState(false);
  const [weatherData, setWeatherData] = useState<Map<string, WeatherData>>(new Map());
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Position definitions with colors
  const [positions, setPositions] = useState<Position[]>([
    { id: 'project-manager', name: 'Project Manager', color: '#8b7355', enabled: true },
    { id: 'lead-tech', name: 'Lead Technician', color: '#c2185b', enabled: true },
    { id: 'technician', name: 'Technician', color: '#4a5f7f', enabled: true },
    { id: 'electrician', name: 'Electrician', color: '#00acc1', enabled: true },
    { id: 'plumber', name: 'Plumber', color: '#0d9488', enabled: true },
    { id: 'carpenter', name: 'Carpenter', color: '#b8860b', enabled: true },
    { id: 'hvac-tech', name: 'HVAC Tech', color: '#7cb342', enabled: true },
  ]);

  // Enhanced employees with skills
  const [employees] = useState<Employee[]>([
    { id: 'e1', name: 'John Smith', avatar: 'JS', positions: ['project-manager'], availability: 'Full Time', hoursScheduled: 40, maxHours: 40, phone: '555-0101', email: 'john@example.com', skills: ['Project Management', 'Customer Relations'] },
    { id: 'e2', name: 'Mike Rodriguez', avatar: 'MR', positions: ['lead-tech'], availability: 'Full Time', hoursScheduled: 38, maxHours: 40, phone: '555-0102', email: 'mike@example.com', skills: ['HVAC', 'Electrical', 'Plumbing'] },
    { id: 'e3', name: 'Lisa Martinez', avatar: 'LM', positions: ['electrician'], availability: 'Full Time', hoursScheduled: 36, maxHours: 40, phone: '555-0103', email: 'lisa@example.com', skills: ['Electrical', 'Low Voltage'] },
    { id: 'e4', name: 'David Chen', avatar: 'DC', positions: ['plumber'], availability: 'Full Time', hoursScheduled: 35, maxHours: 40, phone: '555-0104', email: 'david@example.com', skills: ['Plumbing', 'Gas Lines'] },
    { id: 'e5', name: 'Sarah Johnson', avatar: 'SJ', positions: ['technician'], availability: 'Part Time', hoursScheduled: 20, maxHours: 30, phone: '555-0105', email: 'sarah@example.com', skills: ['General Maintenance', 'Painting'] },
    { id: 'e6', name: 'Robert Williams', avatar: 'RW', positions: ['carpenter'], availability: 'Full Time', hoursScheduled: 38, maxHours: 40, phone: '555-0106', email: 'robert@example.com', skills: ['Carpentry', 'Framing', 'Finish Work'] },
    { id: 'e7', name: 'Emily Davis', avatar: 'ED', positions: ['hvac-tech'], availability: 'Full Time', hoursScheduled: 40, maxHours: 40, phone: '555-0107', email: 'emily@example.com', skills: ['HVAC', 'Refrigeration'] },
    { id: 'e8', name: 'James Wilson', avatar: 'JW', positions: ['technician'], availability: 'Full Time', hoursScheduled: 32, maxHours: 40, phone: '555-0108', email: 'james@example.com', skills: ['General Repairs', 'Electrical'] },
  ]);

  // Jobs/Work Orders
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 'WO-501',
      title: 'Kitchen Renovation - TechCorp',
      customer: 'Sarah Johnson',
      status: 'in-progress',
      priority: 'high',
      startDate: '2026-01-20',
      endDate: '2026-01-24',
      estimatedHours: 80,
      assignedEmployees: ['e1', 'e2', 'e6'],
      location: '123 Main St, Suite 400',
      value: 45000,
      description: 'Complete kitchen renovation including cabinets, countertops, and appliances',
      color: '#c2185b',
      requiredSkills: ['Project Management', 'Carpentry', 'Electrical', 'Plumbing']
    },
    {
      id: 'WO-502',
      title: 'HVAC Replacement - Downtown Office',
      customer: 'Robert Chen',
      status: 'scheduled',
      priority: 'urgent',
      startDate: '2026-01-22',
      endDate: '2026-01-23',
      estimatedHours: 24,
      assignedEmployees: ['e7', 'e3'],
      location: '456 Oak Avenue',
      value: 12500,
      description: 'Replace commercial HVAC system',
      color: '#7cb342',
      requiredSkills: ['HVAC', 'Electrical']
    },
    {
      id: 'WO-503',
      title: 'Bathroom Remodel - Residential',
      customer: 'Emily Williams',
      status: 'scheduled',
      priority: 'medium',
      startDate: '2026-01-23',
      endDate: '2026-01-26',
      estimatedHours: 60,
      assignedEmployees: ['e4', 'e8'],
      location: '789 Elm Street',
      value: 18000,
      description: 'Full bathroom renovation with tile work and fixtures',
      color: '#0d9488',
      requiredSkills: ['Plumbing', 'Electrical', 'Tile Work']
    },
    {
      id: 'WO-504',
      title: 'Electrical Panel Upgrade',
      customer: 'Michael Brown',
      status: 'pending',
      priority: 'high',
      startDate: '2026-01-25',
      endDate: '2026-01-25',
      estimatedHours: 8,
      assignedEmployees: ['e3'],
      location: '321 Pine Road',
      value: 5500,
      description: 'Upgrade main electrical panel to 200 amp service',
      color: '#00acc1',
      requiredSkills: ['Electrical']
    },
    {
      id: 'WO-505',
      title: 'Deck Construction',
      customer: 'Jennifer Martinez',
      status: 'scheduled',
      priority: 'low',
      startDate: '2026-01-21',
      endDate: '2026-01-24',
      estimatedHours: 48,
      assignedEmployees: ['e6', 'e8'],
      location: '555 Maple Drive',
      value: 22000,
      description: 'Build 20x16 composite deck with railings',
      color: '#b8860b',
      requiredSkills: ['Carpentry', 'Framing']
    }
  ]);

  // Shifts - Employee schedules
  const [shifts, setShifts] = useState<Shift[]>([
    // John Smith - Project Manager
    { id: 's1', employeeId: 'e1', position: 'project-manager', startTime: '8a', endTime: '5p', date: '2026-01-20', color: '#8b7355', status: 'scheduled', jobId: 'WO-501' },
    { id: 's2', employeeId: 'e1', position: 'project-manager', startTime: '8a', endTime: '5p', date: '2026-01-21', color: '#8b7355', status: 'scheduled', jobId: 'WO-501' },
    { id: 's3', employeeId: 'e1', position: 'project-manager', startTime: '8a', endTime: '5p', date: '2026-01-22', color: '#8b7355', status: 'scheduled', jobId: 'WO-501' },
    { id: 's4', employeeId: 'e1', position: 'project-manager', startTime: '8a', endTime: '12p', date: '2026-01-23', color: '#8b7355', status: 'scheduled', jobId: 'WO-501' },
    
    // Mike Rodriguez - Lead Tech
    { id: 's5', employeeId: 'e2', position: 'lead-tech', startTime: '7a', endTime: '4p', date: '2026-01-20', color: '#c2185b', status: 'scheduled', jobId: 'WO-501' },
    { id: 's6', employeeId: 'e2', position: 'lead-tech', startTime: '7a', endTime: '4p', date: '2026-01-21', color: '#c2185b', status: 'scheduled', jobId: 'WO-501' },
    { id: 's7', employeeId: 'e2', position: 'lead-tech', startTime: '7a', endTime: '4p', date: '2026-01-22', color: '#c2185b', status: 'scheduled', jobId: 'WO-501' },
    
    // Lisa Martinez - Electrician
    { id: 's8', employeeId: 'e3', position: 'electrician', startTime: '8a', endTime: '5p', date: '2026-01-22', color: '#00acc1', status: 'scheduled', jobId: 'WO-502' },
    { id: 's9', employeeId: 'e3', position: 'electrician', startTime: '8a', endTime: '5p', date: '2026-01-23', color: '#00acc1', status: 'scheduled', jobId: 'WO-502' },
    { id: 's10', employeeId: 'e3', position: 'electrician', startTime: '8a', endTime: '4p', date: '2026-01-25', color: '#00acc1', status: 'scheduled', jobId: 'WO-504' },
    
    // David Chen - Plumber
    { id: 's11', employeeId: 'e4', position: 'plumber', startTime: '8a', endTime: '5p', date: '2026-01-23', color: '#0d9488', status: 'scheduled', jobId: 'WO-503' },
    { id: 's12', employeeId: 'e4', position: 'plumber', startTime: '8a', endTime: '5p', date: '2026-01-24', color: '#0d9488', status: 'scheduled', jobId: 'WO-503' },
    { id: 's13', employeeId: 'e4', position: 'plumber', startTime: '8a', endTime: '5p', date: '2026-01-25', color: '#0d9488', status: 'scheduled', jobId: 'WO-503' },
    
    // Robert Williams - Carpenter
    { id: 's14', employeeId: 'e6', position: 'carpenter', startTime: '7a', endTime: '4p', date: '2026-01-20', color: '#b8860b', status: 'scheduled', jobId: 'WO-501' },
    { id: 's15', employeeId: 'e6', position: 'carpenter', startTime: '7a', endTime: '4p', date: '2026-01-21', color: '#b8860b', status: 'scheduled', jobId: 'WO-505' },
    { id: 's16', employeeId: 'e6', position: 'carpenter', startTime: '7a', endTime: '4p', date: '2026-01-22', color: '#b8860b', status: 'scheduled', jobId: 'WO-505' },
    { id: 's17', employeeId: 'e6', position: 'carpenter', startTime: '7a', endTime: '4p', date: '2026-01-23', color: '#b8860b', status: 'scheduled', jobId: 'WO-505' },
    
    // Emily Davis - HVAC Tech
    { id: 's18', employeeId: 'e7', position: 'hvac-tech', startTime: '7a', endTime: '6p', date: '2026-01-22', color: '#7cb342', status: 'scheduled', jobId: 'WO-502' },
    { id: 's19', employeeId: 'e7', position: 'hvac-tech', startTime: '7a', endTime: '6p', date: '2026-01-23', color: '#7cb342', status: 'scheduled', jobId: 'WO-502' },
    
    // James Wilson - Technician
    { id: 's20', employeeId: 'e8', position: 'technician', startTime: '8a', endTime: '4p', date: '2026-01-21', color: '#4a5f7f', status: 'scheduled', jobId: 'WO-505' },
    { id: 's21', employeeId: 'e8', position: 'technician', startTime: '8a', endTime: '5p', date: '2026-01-23', color: '#4a5f7f', status: 'scheduled', jobId: 'WO-503' },
    { id: 's22', employeeId: 'e8', position: 'technician', startTime: '8a', endTime: '5p', date: '2026-01-24', color: '#4a5f7f', status: 'scheduled', jobId: 'WO-503' },
  ]);

  // Customer bookings are stored in the shared appointment ledger. Load them into
  // the operational calendar so the Master Schedule and customer portal never drift.
  useEffect(() => {
    let active = true;
    const loadSharedAppointments = async () => {
      if (!user) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const response = await fetch(`${API_BASE}/schedule/appointments`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load shared appointments.');
        const appointments = Array.isArray(result.appointments) ? result.appointments : [];
        const appointmentJobs: Job[] = appointments.map((appointment: any) => ({
          id: `appointment-${appointment.id}`,
          appointmentId: String(appointment.id),
          title: String(appointment.serviceTitle || appointment.title || 'Service appointment'),
          customer: String(appointment.customerName || appointment.customer_name || appointment.customerEmail || 'Customer'),
          status: ['scheduled', 'pending', 'completed', 'in-progress'].includes(appointment.status) ? appointment.status : 'scheduled',
          priority: ['low', 'medium', 'high', 'urgent'].includes(appointment.priority) ? appointment.priority : 'medium',
          startDate: String(appointment.date),
          endDate: String(appointment.date),
          estimatedHours: Number(String(appointment.estimatedDuration || '').match(/\d+/)?.[0] || 1),
          assignedEmployees: appointment.employeeId ? [String(appointment.employeeId)] : [],
          location: String(appointment.location || 'Location pending'),
          value: Number(appointment.depositAmount || 0),
          description: `Customer appointment • ${String(appointment.time || 'time pending')}`,
          color: '#ea580c',
          requiredSkills: [],
        }));
        const appointmentShifts: Shift[] = appointments.filter((appointment: any) => appointment.employeeId && appointment.date).map((appointment: any) => ({
          id: `appointment-shift-${appointment.id}`,
          employeeId: String(appointment.employeeId),
          position: 'technician',
          startTime: String(appointment.time || '8:00 AM'),
          endTime: String(appointment.time || '8:00 AM'),
          date: String(appointment.date),
          color: '#ea580c',
          status: appointment.status === 'pending' ? 'pending' : 'scheduled',
          jobId: `appointment-${appointment.id}`,
        }));
        if (!active) return;
        setJobs((current) => [...current.filter((job) => !job.appointmentId), ...appointmentJobs]);
        setShifts((current) => [...current.filter((shift) => !shift.id.startsWith('appointment-shift-')), ...appointmentShifts]);
      } catch (error) {
        console.error('Error loading shared appointments:', error);
        if (active) toast.error(error instanceof Error ? error.message : 'Unable to load shared appointments.');
      }
    };
    void loadSharedAppointments();
    return () => { active = false; };
  }, [API_BASE, user]);

  const updateSharedAppointmentStatus = async (job: Job, status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled') => {
    if (!job.appointmentId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Please sign in to update this appointment.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/schedule/appointments/${job.appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update appointment status.');
      const nextStatus = status === 'confirmed' ? 'scheduled' : status as Job['status'];
      setJobs((current) => current.map((item) => item.appointmentId === job.appointmentId ? { ...item, status: nextStatus } : item));
      setShifts((current) => current.map((item) => item.jobId === job.id ? { ...item, status: status === 'pending' ? 'pending' : 'scheduled' } : item));
      setSelectedJob((current) => current?.appointmentId === job.appointmentId ? { ...current, status: nextStatus } : current);
      toast.success('Appointment status saved to the master schedule.');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to update appointment status.');
    }
  };

  // Load weather data when date changes or source changes
  useEffect(() => {
    if (showWeatherOverlay) {
      loadWeatherData();
    }
  }, [currentDate, weatherSource, showWeatherOverlay]);

  const loadWeatherData = async () => {
    setLoadingWeather(true);
    try {
      const weekDays = getWeekDays();
      const weatherMap = new Map<string, WeatherData>();

      // Simulate different weather data based on source
      weekDays.forEach((day, index) => {
        const dateStr = formatDate(day);
        const isBadWeather = index === 2; // Wednesday

        let temp, precipChance, windSpeed;
        
        // Simulate different sources returning slightly different data
        switch (weatherSource) {
          case 'openweather':
            temp = Math.floor(Math.random() * 20) + 48;
            precipChance = isBadWeather ? 85 : Math.floor(Math.random() * 30);
            windSpeed = isBadWeather ? 25 : Math.floor(Math.random() * 15) + 5;
            break;
          case 'weathergov':
            temp = Math.floor(Math.random() * 20) + 50;
            precipChance = isBadWeather ? 80 : Math.floor(Math.random() * 25);
            windSpeed = isBadWeather ? 22 : Math.floor(Math.random() * 12) + 4;
            break;
          case 'weatherapi':
            temp = Math.floor(Math.random() * 20) + 52;
            precipChance = isBadWeather ? 90 : Math.floor(Math.random() * 35);
            windSpeed = isBadWeather ? 28 : Math.floor(Math.random() * 18) + 6;
            break;
          default: // demo
            temp = Math.floor(Math.random() * 20) + 50;
            precipChance = isBadWeather ? 85 : Math.floor(Math.random() * 30);
            windSpeed = isBadWeather ? 25 : Math.floor(Math.random() * 15) + 5;
        }

        weatherMap.set(dateStr, {
          date: dateStr,
          condition: isBadWeather ? 'rain' : ['clear', 'clouds', 'clouds'][index % 3],
          temp,
          precipChance,
          precipAmount: isBadWeather ? 1.2 : 0,
          windSpeed,
          workableHours: isBadWeather ? 2 : 8,
          alerts: isBadWeather ? ['Heavy Rain Warning', 'High Wind Advisory'] : []
        });
      });

      setWeatherData(weatherMap);
    } catch (error) {
      console.error('Error loading weather data:', error);
      toast.error('Failed to load weather data');
    } finally {
      setLoadingWeather(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'rain': return CloudRain;
      case 'snow': return CloudSnow;
      case 'clear': return Sun;
      case 'clouds': return Cloud;
      default: return Cloud;
    }
  };

  const getWeatherRiskLevel = (job: Job, dateStr: string): 'none' | 'low' | 'medium' | 'high' | 'critical' => {
    const weather = weatherData.get(dateStr);
    if (!weather || !job.weatherSensitivity) return 'none';

    const { precipChance, windSpeed, workableHours } = weather;

    // Critical weather sensitivity
    if (job.weatherSensitivity === 'critical') {
      if (precipChance > 50 || windSpeed > 20 || workableHours < 6) return 'critical';
      if (precipChance > 30 || windSpeed > 15) return 'high';
      if (precipChance > 20) return 'medium';
    }

    // High weather sensitivity
    if (job.weatherSensitivity === 'high') {
      if (precipChance > 60 || windSpeed > 25) return 'high';
      if (precipChance > 40 || windSpeed > 20) return 'medium';
      if (precipChance > 30) return 'low';
    }

    // Medium weather sensitivity
    if (job.weatherSensitivity === 'medium') {
      if (precipChance > 70 || windSpeed > 30) return 'medium';
      if (precipChance > 50) return 'low';
    }

    return 'none';
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Start on Monday
    
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

  const getShiftsForEmployeeAndDate = (employeeId: string, date: Date) => {
    const dateStr = formatDate(date);
    return shifts.filter(s => s.employeeId === employeeId && s.date === dateStr);
  };

  const getJobsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return jobs.filter(job => {
      const start = new Date(job.startDate);
      const end = new Date(job.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
  };

  const togglePosition = (positionId: string) => {
    setPositions(positions.map(p =>
      p.id === positionId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const filteredEmployees = employees.filter(emp => {
    if (searchQuery) {
      return emp.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleAssignEmployee = (jobId: string, employeeId: string, date: string) => {
    toast.success('Employee assigned to job');
    // Logic to assign employee
  };

  const handleCreateJob = () => {
    setShowJobModal(true);
  };

  const handleAutoSchedule = () => {
    const { prioritizeUrgent, respectMaxHours, matchSkills, distributeEvenly, shiftLength, startTime, includeWeekends } = autoScheduleSettings;
    
    // Get unscheduled or pending jobs
    const jobsToSchedule = jobs.filter(j => j.status === 'pending' || j.assignedEmployees.length === 0);
    
    if (jobsToSchedule.length === 0) {
      toast.info('No jobs need scheduling');
      return;
    }

    // Sort jobs by priority if enabled
    let sortedJobs = [...jobsToSchedule];
    if (prioritizeUrgent) {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      sortedJobs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }

    // Calculate employee availability
    const employeeHours: Record<string, number> = {};
    employees.forEach(emp => {
      employeeHours[emp.id] = emp.hoursScheduled;
    });

    const newShifts: Shift[] = [];
    const newJobAssignments: Record<string, string[]> = {};
    const schedulingSummary = {
      scheduled: 0,
      failed: 0,
      reasons: [] as string[]
    };

    // Schedule each job
    sortedJobs.forEach(job => {
      // Find best employee matches based on skills
      let eligibleEmployees = employees.filter(emp => {
        if (respectMaxHours && employeeHours[emp.id] + shiftLength > emp.maxHours) {
          return false;
        }
        
        if (matchSkills) {
          // Check if employee has required skills
          const hasRequiredSkills = job.requiredSkills.some(skill => 
            emp.skills.includes(skill)
          );
          return hasRequiredSkills;
        }
        
        return true;
      });

      // Score employees by skill match
      if (matchSkills) {
        eligibleEmployees = eligibleEmployees.sort((a, b) => {
          const aMatches = job.requiredSkills.filter(skill => a.skills.includes(skill)).length;
          const bMatches = job.requiredSkills.filter(skill => b.skills.includes(skill)).length;
          return bMatches - aMatches;
        });
      }

      // Distribute evenly by selecting least-busy employees
      if (distributeEvenly) {
        eligibleEmployees.sort((a, b) => employeeHours[a.id] - employeeHours[b.id]);
      }

      if (eligibleEmployees.length > 0) {
        // Assign top employee(s) based on job requirements
        const assignCount = Math.min(2, eligibleEmployees.length); // Assign 1-2 employees per job
        const assignedEmployees = eligibleEmployees.slice(0, assignCount);

        newJobAssignments[job.id] = assignedEmployees.map(e => e.id);

        // Create shifts for the job duration
        const startDate = new Date(job.startDate);
        const endDate = new Date(job.endDate);
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();
          
          // Skip weekends if not included
          if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }

          assignedEmployees.forEach(emp => {
            const position = positions.find(p => emp.positions.includes(p.id));
            
            newShifts.push({
              id: `auto-${Date.now()}-${emp.id}-${currentDate.getTime()}`,
              employeeId: emp.id,
              position: emp.positions[0],
              startTime: startTime.replace(':00 ', '').toLowerCase(),
              endTime: calculateEndTime(startTime, shiftLength),
              date: formatDate(currentDate),
              color: position?.color || '#4a5f7f',
              status: 'scheduled',
              jobId: job.id
            });

            employeeHours[emp.id] += shiftLength;
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }

        schedulingSummary.scheduled++;
      } else {
        schedulingSummary.failed++;
        schedulingSummary.reasons.push(`${job.title}: No eligible employees available`);
      }
    });

    setSchedulingResults({
      summary: schedulingSummary,
      newShifts,
      newJobAssignments
    });
  };

  const calculateEndTime = (startTime: string, hours: number): string => {
    const [time, period] = startTime.split(' ');
    const [hour] = time.split(':');
    let startHour = parseInt(hour);
    
    if (period === 'PM' && startHour !== 12) startHour += 12;
    if (period === 'AM' && startHour === 12) startHour = 0;
    
    let endHour = startHour + hours;
    let endPeriod = 'AM';
    
    if (endHour >= 12) {
      endPeriod = 'PM';
      if (endHour > 12) endHour -= 12;
    }
    if (endHour === 0) endHour = 12;
    
    return `${endHour}${endPeriod.toLowerCase()}`;
  };

  const applyAutoSchedule = () => {
    if (!schedulingResults) return;

    // Add new shifts
    setShifts([...shifts, ...schedulingResults.newShifts]);

    // Update job assignments
    const updatedJobs = jobs.map(job => {
      if (schedulingResults.newJobAssignments[job.id]) {
        return {
          ...job,
          assignedEmployees: schedulingResults.newJobAssignments[job.id],
          status: 'scheduled' as any
        };
      }
      return job;
    });
    setJobs(updatedJobs);

    toast.success(`Auto-scheduled ${schedulingResults.summary.scheduled} jobs successfully!`);
    setShowAutoScheduleModal(false);
    setSchedulingResults(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in-progress': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const weekDays = getWeekDays();
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  // Calculate stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.status === 'in-progress' || j.status === 'scheduled').length;
  const totalHours = shifts.length * 8; // Approximate
  const employeesWorking = new Set(shifts.map(s => s.employeeId)).size;

  return (
    <div className="h-screen bg-[#0A0A0A] flex flex-col overflow-hidden">
      {/* Top Header */}
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
            <h1 className="text-xl font-bold text-white">Enterprise Master Scheduling</h1>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#2A2A2A] rounded-lg p-1">
            <button
              onClick={() => setViewMode('employees')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'employees'
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 inline mr-1" />
              Employees
            </button>
            <button
              onClick={() => setViewMode('jobs')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'jobs'
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Wrench className="w-4 h-4 inline mr-1" />
              Jobs
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                viewMode === 'combined'
                  ? 'bg-[#ea580c] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4 inline mr-1" />
              Combined
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Weather Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWeatherOverlay(!showWeatherOverlay)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition ${
                showWeatherOverlay
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
              }`}
            >
              {showWeatherOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Weather
            </button>
            <button
              onClick={() => setShowWeatherSettings(true)}
              className="px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-400 rounded-lg flex items-center gap-2 text-sm transition"
              title="Weather Source Settings"
            >
              <Cloud className="w-4 h-4" />
              {weatherSource === 'demo' ? 'Demo' : 
               weatherSource === 'openweather' ? 'OpenWeather' :
               weatherSource === 'weathergov' ? 'Weather.gov' : 'WeatherAPI'}
            </button>
            {loadingWeather && (
              <div className="animate-spin">
                <RefreshCw className="w-4 h-4 text-blue-400" />
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 px-4 py-2 bg-[#2A2A2A] rounded-lg">
            <div className="text-center">
              <div className="text-sm text-gray-400">Active Jobs</div>
              <div className="text-lg font-bold text-white">{activeJobs}</div>
            </div>
            <div className="w-px h-8 bg-[#3A3A3A]"></div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Working</div>
              <div className="text-lg font-bold text-orange-400">{employeesWorking}</div>
            </div>
            <div className="w-px h-8 bg-[#3A3A3A]"></div>
            <div className="text-center">
              <div className="text-sm text-gray-400">Hours</div>
              <div className="text-lg font-bold text-green-400">{totalHours}</div>
            </div>
          </div>

          <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded text-sm transition">
            Week
          </button>
          <button className="p-2 hover:bg-[#2A2A2A] rounded transition">
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 hover:bg-[#2A2A2A] rounded transition">
            <Download className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Content - Scrollable Container */}
      <div className="flex-1 overflow-y-auto">
        {/* Schedule Section */}
        <div className="flex h-[600px]">
        {/* Left Sidebar */}
        <div className="w-80 bg-[#0F0F0F] border-r border-[#2A2A2A] flex flex-col overflow-hidden">
          {/* Action Buttons */}
          <div className="p-4 space-y-2 border-b border-[#2A2A2A]">
            <button
              onClick={handleCreateJob}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              Schedule New Job
            </button>
            <button className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2">
              <Bell className="w-4 h-4" />
              Publish & Notify
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-[#2A2A2A]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
          </div>

          {/* Upcoming Jobs Section */}
          <div className="p-4 border-b border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase">Upcoming Jobs</h3>
              <span className="text-sm text-orange-400 font-medium">{jobs.filter(j => j.status !== 'completed').length}</span>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {jobs.filter(j => j.status !== 'completed').map(job => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className="w-full p-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-left transition"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5"
                      style={{ backgroundColor: job.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{job.title}</div>
                      <div className="text-sm text-gray-400">{job.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm px-2 py-0.5 rounded ${getPriorityColor(job.priority)}`}>
                      {job.priority}
                    </span>
                    <span className="text-sm text-gray-500">
                      {job.assignedEmployees.length} assigned
                    </span>
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
                  <span>Show Employee Names</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="checkbox" defaultChecked className="rounded bg-[#1A1A1A] border-[#2A2A2A]" />
                  <span>Show Job Details</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="checkbox" className="rounded bg-[#1A1A1A] border-[#2A2A2A]" />
                  <span>Show Conflicts</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="checkbox" className="rounded bg-[#1A1A1A] border-[#2A2A2A]" />
                  <span>Show Time-Off</span>
                </label>
              </div>
            )}
          </div>

          {/* Positions Filter */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Positions / Skills</h3>
              
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-[#1A1A1A] rounded transition">
                  Select All
                </button>
                
                {positions.map(position => (
                  <label
                    key={position.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-white cursor-pointer hover:bg-[#1A1A1A] rounded"
                  >
                    <input
                      type="checkbox"
                      checked={position.enabled}
                      onChange={() => togglePosition(position.id)}
                      className="rounded bg-[#1A1A1A] border-[#2A2A2A]"
                    />
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: position.color }}
                    />
                    <span>{position.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Schedule Grid */}
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
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAutoScheduleModal(true)}
                className="px-3 py-1 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded text-sm transition flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Auto-Schedule
              </button>
              <button className="px-3 py-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded text-sm transition flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Copy Week
              </button>
            </div>
          </div>

          {/* Schedule Content */}
          <div className="flex-1 overflow-auto bg-[#0A0A0A]">
            {viewMode === 'employees' && (
              <EmployeeScheduleView
                weekDays={weekDays}
                employees={filteredEmployees}
                shifts={shifts}
                jobs={jobs}
                getShiftsForEmployeeAndDate={getShiftsForEmployeeAndDate}
                showWeatherOverlay={showWeatherOverlay}
                weatherData={weatherData}
                getWeatherIcon={getWeatherIcon}
              />
            )}
            
            {viewMode === 'jobs' && (
              <JobScheduleView
                weekDays={weekDays}
                jobs={jobs}
                employees={employees}
                getJobsForDate={getJobsForDate}
                showWeatherOverlay={showWeatherOverlay}
                weatherData={weatherData}
                getWeatherIcon={getWeatherIcon}
              />
            )}
            
            {viewMode === 'combined' && (
              <CombinedScheduleView
                weekDays={weekDays}
                employees={filteredEmployees}
                jobs={jobs}
                shifts={shifts}
                getShiftsForEmployeeAndDate={getShiftsForEmployeeAndDate}
                getJobsForDate={getJobsForDate}
                showWeatherOverlay={showWeatherOverlay}
                weatherData={weatherData}
                getWeatherIcon={getWeatherIcon}
              />
            )}
          </div>
        </div>
        </div>

        {/* Calendar Section Below Main Schedule */}
        <div className="border-t-4 border-[#ea580c]/30 bg-[#0F0F0F]">
          <div className="h-14 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#ea580c]" />
              <h2 className="text-lg font-bold text-white">Calendar View</h2>
              <span className="text-sm text-gray-500 ml-2">Integrated Event & Appointment Scheduling</span>
            </div>
          </div>
          <div className="h-[600px]">
            <CalendarScheduleView embedded={true} />
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          employees={employees}
          onClose={() => setSelectedJob(null)}
          onAssign={handleAssignEmployee}
          onUpdateAppointmentStatus={updateSharedAppointmentStatus}
        />
      )}

      {/* Create Job Modal */}
      {showJobModal && (
        <CreateJobModal
          onClose={() => setShowJobModal(false)}
          employees={employees}
          positions={positions}
        />
      )}

      {/* Auto-Schedule Modal */}
      {showAutoScheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#ea580c]/20 to-orange-500/20 border-b border-[#ea580c]/30 p-6 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#ea580c]/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-[#ea580c]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Auto-Schedule Jobs</h2>
                    <p className="text-gray-400">Intelligently assign employees to pending jobs</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAutoScheduleModal(false);
                    setSchedulingResults(null);
                  }}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {!schedulingResults ? (
                <>
                  {/* Configuration Settings */}
                  <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Scheduling Preferences</h3>
                    
                    <div className="space-y-4">
                      {/* Toggle Options */}
                      <div className="space-y-3">
                        <label className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] cursor-pointer hover:border-[#ea580c]/30 transition">
                          <div>
                            <p className="text-white font-semibold">Prioritize Urgent Jobs</p>
                            <p className="text-sm text-gray-400">Schedule high-priority jobs first</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={autoScheduleSettings.prioritizeUrgent}
                            onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, prioritizeUrgent: e.target.checked })}
                            className="w-5 h-5"
                          />
                        </label>

                        <label className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] cursor-pointer hover:border-[#ea580c]/30 transition">
                          <div>
                            <p className="text-white font-semibold">Respect Max Hours</p>
                            <p className="text-sm text-gray-400">Don't exceed employee maximum hours</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={autoScheduleSettings.respectMaxHours}
                            onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, respectMaxHours: e.target.checked })}
                            className="w-5 h-5"
                          />
                        </label>

                        <label className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] cursor-pointer hover:border-[#ea580c]/30 transition">
                          <div>
                            <p className="text-white font-semibold">Match Skills</p>
                            <p className="text-sm text-gray-400">Assign employees with matching skills to jobs</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={autoScheduleSettings.matchSkills}
                            onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, matchSkills: e.target.checked })}
                            className="w-5 h-5"
                          />
                        </label>

                        <label className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] cursor-pointer hover:border-[#ea580c]/30 transition">
                          <div>
                            <p className="text-white font-semibold">Distribute Evenly</p>
                            <p className="text-sm text-gray-400">Balance workload across all employees</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={autoScheduleSettings.distributeEvenly}
                            onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, distributeEvenly: e.target.checked })}
                            className="w-5 h-5"
                          />
                        </label>

                        <label className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] cursor-pointer hover:border-[#ea580c]/30 transition">
                          <div>
                            <p className="text-white font-semibold">Include Weekends</p>
                            <p className="text-sm text-gray-400">Schedule shifts on Saturday and Sunday</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={autoScheduleSettings.includeWeekends}
                            onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, includeWeekends: e.target.checked })}
                            className="w-5 h-5"
                          />
                        </label>
                      </div>

                      {/* Shift Configuration */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2A2A2A]">
                        <div>
                          <label className="block text-sm font-semibold text-gray-400 mb-2">
                            Default Shift Length (hours)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={autoScheduleSettings.shiftLength}
                            onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, shiftLength: parseInt(e.target.value) || 8 })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-400 mb-2">
                            Default Start Time
                          </label>
                          <select
                            value={autoScheduleSettings.startTime}
                            onChange={(e) => setAutoScheduleSettings({ ...autoScheduleSettings, startTime: e.target.value })}
                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#ea580c]/50 focus:outline-none"
                          >
                            <option value="6:00 AM">6:00 AM</option>
                            <option value="7:00 AM">7:00 AM</option>
                            <option value="8:00 AM">8:00 AM</option>
                            <option value="9:00 AM">9:00 AM</option>
                            <option value="10:00 AM">10:00 AM</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Jobs Preview */}
                  <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Jobs to Schedule</h3>
                    <div className="space-y-2">
                      {jobs.filter(j => j.status === 'pending' || j.assignedEmployees.length === 0).map(job => (
                        <div key={job.id} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                          <div>
                            <p className="text-white font-semibold">{job.title}</p>
                            <p className="text-sm text-gray-400">{job.requiredSkills.join(', ')}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
                            job.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                            job.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            job.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {job.priority.toUpperCase()}
                          </span>
                        </div>
                      ))}
                      {jobs.filter(j => j.status === 'pending' || j.assignedEmployees.length === 0).length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                          <p>All jobs are already scheduled!</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                    <button
                      onClick={() => setShowAutoScheduleModal(false)}
                      className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAutoSchedule}
                      disabled={jobs.filter(j => j.status === 'pending' || j.assignedEmployees.length === 0).length === 0}
                      className="flex-1 px-6 py-3 bg-[#ea580c] hover:bg-[#c2410c] disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
                    >
                      <Zap className="w-5 h-5" />
                      Generate Schedule
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Results View */}
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6">
                      <h3 className="text-xl font-bold text-white mb-4">Scheduling Results</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-[#0A0A0A] rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <p className="text-sm text-gray-400">Successfully Scheduled</p>
                          </div>
                          <p className="text-3xl font-bold text-green-400">{schedulingResults.summary.scheduled}</p>
                        </div>
                        
                        <div className="bg-[#0A0A0A] rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <p className="text-sm text-gray-400">Unable to Schedule</p>
                          </div>
                          <p className="text-3xl font-bold text-red-400">{schedulingResults.summary.failed}</p>
                        </div>
                      </div>

                      {schedulingResults.summary.failed > 0 && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                          <p className="text-sm font-semibold text-red-400 mb-2">Issues Found:</p>
                          <ul className="space-y-1">
                            {schedulingResults.summary.reasons.map((reason: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-300">• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* New Shifts Preview */}
                    <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-6">
                      <h3 className="text-lg font-bold text-white mb-4">
                        New Shifts Created ({schedulingResults.newShifts.length})
                      </h3>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {schedulingResults.newShifts.slice(0, 10).map((shift: Shift, idx: number) => {
                          const employee = employees.find((e: Employee) => e.id === shift.employeeId);
                          const job = jobs.find((j: Job) => j.id === shift.jobId);
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                              <div>
                                <p className="text-white font-semibold">{employee?.name}</p>
                                <p className="text-sm text-gray-400">{job?.title}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-white">{shift.date}</p>
                                <p className="text-sm text-gray-400">{shift.startTime} - {shift.endTime}</p>
                              </div>
                            </div>
                          );
                        })}
                        {schedulingResults.newShifts.length > 10 && (
                          <p className="text-center text-sm text-gray-400 py-2">
                            + {schedulingResults.newShifts.length - 10} more shifts
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                      <button
                        onClick={() => setSchedulingResults(null)}
                        className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-white font-bold transition"
                      >
                        Back to Settings
                      </button>
                      <button
                        onClick={applyAutoSchedule}
                        className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold transition flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Apply Schedule
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weather Settings Modal */}
      <Modal
        isOpen={showWeatherSettings}
        onClose={() => setShowWeatherSettings(false)}
        size="md"
      >
        <ModalHeader
          title="Weather Data Source"
          icon={Cloud}
          onClose={() => setShowWeatherSettings(false)}
        />
        <ModalBody>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Select your preferred weather data provider. Different sources may provide varying accuracy and update frequencies.
            </p>

            <div className="space-y-3">
              {/* Demo Mode */}
              <button
                onClick={() => {
                  setWeatherSource('demo');
                  toast.success('Weather source set to Demo Mode');
                }}
                className={`w-full p-4 rounded-lg border-2 transition text-left ${
                  weatherSource === 'demo'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">Demo Mode</span>
                  </div>
                  {weatherSource === 'demo' && (
                    <CheckCircle className="w-5 h-5 text-[#ea580c]" />
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  Simulated weather data for testing and demonstrations
                </p>
              </button>

              {/* OpenWeather */}
              <button
                onClick={() => {
                  setWeatherSource('openweather');
                  toast.success('Weather source set to OpenWeather');
                }}
                className={`w-full p-4 rounded-lg border-2 transition text-left ${
                  weatherSource === 'openweather'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-orange-400" />
                    <span className="font-medium">OpenWeather</span>
                  </div>
                  {weatherSource === 'openweather' && (
                    <CheckCircle className="w-5 h-5 text-[#ea580c]" />
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  Global weather data with hourly forecasts
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Requires API key • 15-minute updates
                </p>
              </button>

              {/* Weather.gov */}
              <button
                onClick={() => {
                  setWeatherSource('weathergov');
                  toast.success('Weather source set to Weather.gov');
                }}
                className={`w-full p-4 rounded-lg border-2 transition text-left ${
                  weatherSource === 'weathergov'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">Weather.gov (NOAA)</span>
                  </div>
                  {weatherSource === 'weathergov' && (
                    <CheckCircle className="w-5 h-5 text-[#ea580c]" />
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  US National Weather Service official forecasts
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Free • US only • Hourly updates
                </p>
              </button>

              {/* WeatherAPI */}
              <button
                onClick={() => {
                  setWeatherSource('weatherapi');
                  toast.success('Weather source set to WeatherAPI');
                }}
                className={`w-full p-4 rounded-lg border-2 transition text-left ${
                  weatherSource === 'weatherapi'
                    ? 'border-[#ea580c] bg-[#ea580c]/10'
                    : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-purple-400" />
                    <span className="font-medium">WeatherAPI</span>
                  </div>
                  {weatherSource === 'weatherapi' && (
                    <CheckCircle className="w-5 h-5 text-[#ea580c]" />
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  Real-time weather with extended forecasts
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Requires API key • Real-time updates
                </p>
              </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="text-sm text-gray-300">
                  <p className="font-medium mb-1">Production Setup</p>
                  <p className="text-gray-400">
                    In production, configure your API keys in the environment settings. Weather data will update automatically based on your selected source.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter
          onCancel={() => setShowWeatherSettings(false)}
          cancelText="Close"
        />
      </Modal>
    </div>
  );
}

// Employee Schedule View Component
function EmployeeScheduleView({ weekDays, employees, shifts, jobs, getShiftsForEmployeeAndDate, showWeatherOverlay, weatherData, getWeatherIcon }: any) {
  return (
    <div className="min-w-max">
      {/* Calendar Header */}
      <div className="sticky top-0 z-10 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="flex">
          <div className="w-48 p-3 border-r border-[#2A2A2A]">
            <span className="text-sm font-medium text-gray-400">EMPLOYEE</span>
          </div>
          {weekDays.map((day: Date, i: number) => {
            const dateStr = day.toISOString().split('T')[0];
            const weather = weatherData?.get(dateStr);
            const WeatherIconComponent = weather ? getWeatherIcon(weather.condition) : Cloud;
            
            return (
              <div key={i} className="flex-1 min-w-[140px] border-r border-[#2A2A2A]">
                <div className="p-3 text-center">
                  <div className="text-sm text-gray-400 uppercase">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                
                {/* Weather Strip */}
                {showWeatherOverlay && weather && (
                  <div className="px-2 pb-2 border-t border-[#2A2A2A]/50">
                    <div className="flex items-center justify-center gap-1.5 py-1.5">
                      <WeatherIconComponent className={`w-4 h-4 ${
                        weather.condition === 'rain' ? 'text-blue-400' :
                        weather.condition === 'snow' ? 'text-cyan-300' :
                        weather.condition === 'clear' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`} />
                      <span className="text-sm font-medium text-white">
                        {weather.temp}°F
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
                      <Droplets className="w-3 h-3" />
                      <span>{weather.precipChance}%</span>
                    </div>
                    {weather.alerts.length > 0 && (
                      <div className="mt-1 px-1.5 py-0.5 bg-yellow-500/20 rounded text-[9px] text-yellow-400 text-center">
                        ⚠️ Alert
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Employee Rows */}
      <div>
        {employees.map((employee: any) => (
          <div key={employee.id} className="flex border-b border-[#2A2A2A] hover:bg-[#1A1A1A]/50">
            {/* Employee Info */}
            <div className="w-48 p-3 border-r border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white text-sm font-bold">
                  {employee.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{employee.name}</div>
                  <div className="text-sm text-gray-500">{employee.hoursScheduled}h / {employee.maxHours}h</div>
                </div>
              </div>
            </div>

            {/* Day Cells */}
            {weekDays.map((day: Date, i: number) => {
              const dayShifts = getShiftsForEmployeeAndDate(employee.id, day);
              return (
                <div key={i} className="flex-1 min-w-[140px] p-2 border-r border-[#2A2A2A]">
                  {dayShifts.map((shift: any) => {
                    const job = shift.jobId ? jobs.find((j: any) => j.id === shift.jobId) : null;
                    return (
                      <div
                        key={shift.id}
                        className="mb-1 p-2 rounded text-sm cursor-pointer hover:opacity-80 transition"
                        style={{ backgroundColor: shift.color + '40', borderLeft: `3px solid ${shift.color}` }}
                      >
                        <div className="font-medium text-white">{shift.startTime} - {shift.endTime}</div>
                        {job && (
                          <div className="text-gray-300 text-[10px] mt-1 truncate">{job.title}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Job Schedule View Component
function JobScheduleView({ weekDays, jobs, employees, getJobsForDate, showWeatherOverlay, weatherData, getWeatherIcon }: any) {
  return (
    <div className="min-w-max">
      {/* Calendar Header */}
      <div className="sticky top-0 z-10 bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="flex">
          <div className="w-64 p-3 border-r border-[#2A2A2A]">
            <span className="text-sm font-medium text-gray-400">JOB / PROJECT</span>
          </div>
          {weekDays.map((day: Date, i: number) => {
            const dateStr = day.toISOString().split('T')[0];
            const weather = weatherData?.get(dateStr);
            const WeatherIconComponent = weather ? getWeatherIcon(weather.condition) : Cloud;
            
            return (
              <div key={i} className="flex-1 min-w-[140px] border-r border-[#2A2A2A]">
                <div className="p-3 text-center">
                  <div className="text-sm text-gray-400 uppercase">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                
                {/* Weather Strip */}
                {showWeatherOverlay && weather && (
                  <div className="px-2 pb-2 border-t border-[#2A2A2A]/50">
                    <div className="flex items-center justify-center gap-1.5 py-1.5">
                      <WeatherIconComponent className={`w-4 h-4 ${
                        weather.condition === 'rain' ? 'text-blue-400' :
                        weather.condition === 'snow' ? 'text-cyan-300' :
                        weather.condition === 'clear' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`} />
                      <span className="text-sm font-medium text-white">
                        {weather.temp}°F
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400">
                      <Droplets className="w-3 h-3" />
                      <span>{weather.precipChance}%</span>
                    </div>
                    {weather.alerts.length > 0 && (
                      <div className="mt-1 px-1.5 py-0.5 bg-yellow-500/20 rounded text-[9px] text-yellow-400 text-center">
                        ⚠️ Alert
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Job Rows */}
      <div>
        {jobs.map((job: any) => (
          <div key={job.id} className="flex border-b border-[#2A2A2A] hover:bg-[#1A1A1A]/50">
            {/* Job Info */}
            <div className="w-64 p-3 border-r border-[#2A2A2A]">
              <div className="flex items-start gap-2">
                <div
                  className="w-3 h-3 rounded-full mt-1"
                  style={{ backgroundColor: job.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{job.title}</div>
                  <div className="text-sm text-gray-500 mt-1">{job.id}</div>
                  <div className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {job.assignedEmployees.length} assigned
                  </div>
                </div>
              </div>
            </div>

            {/* Day Cells */}
            {weekDays.map((day: Date, i: number) => {
              const dateStr = day.toISOString().split('T')[0];
              const isJobDay = dateStr >= job.startDate && dateStr <= job.endDate;
              
              return (
                <div key={i} className="flex-1 min-w-[140px] p-2 border-r border-[#2A2A2A]">
                  {isJobDay && (
                    <div
                      className="p-2 rounded text-sm"
                      style={{ backgroundColor: job.color + '30', borderLeft: `3px solid ${job.color}` }}
                    >
                      <div className="font-medium text-white text-[10px]">
                        {job.assignedEmployees.map((empId: string) => {
                          const emp = employees.find((e: any) => e.id === empId);
                          return emp ? emp.avatar : '';
                        }).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Combined Schedule View Component
function CombinedScheduleView({ weekDays, employees, jobs, shifts, getShiftsForEmployeeAndDate, getJobsForDate, showWeatherOverlay, weatherData, getWeatherIcon }: any) {
  return (
    <div className="p-6 space-y-6">
      {/* Weather Overview Strip */}
      {showWeatherOverlay && (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-400" />
            Weekly Weather Forecast
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day: Date, i: number) => {
              const dateStr = day.toISOString().split('T')[0];
              const weather = weatherData?.get(dateStr);
              const WeatherIconComponent = weather ? getWeatherIcon(weather.condition) : Cloud;
              
              return (
                <div key={i} className="bg-[#0F0F0F] rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-400 uppercase mb-1">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm font-medium text-white mb-2">
                    {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  
                  {weather && (
                    <>
                      <div className="flex items-center justify-center mb-2">
                        <WeatherIconComponent className={`w-8 h-8 ${
                          weather.condition === 'rain' ? 'text-blue-400' :
                          weather.condition === 'snow' ? 'text-cyan-300' :
                          weather.condition === 'clear' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`} />
                      </div>
                      <div className="text-lg font-bold text-white mb-1">
                        {weather.temp}°F
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 mb-1">
                        <Droplets className="w-3 h-3" />
                        <span>{weather.precipChance}%</span>
                      </div>
                      {weather.windSpeed > 15 && (
                        <div className="flex items-center justify-center gap-1 text-[10px] text-orange-400">
                          <Wind className="w-3 h-3" />
                          <span>{weather.windSpeed}mph</span>
                        </div>
                      )}
                      {weather.alerts.length > 0 && (
                        <div className="mt-2 px-2 py-1 bg-yellow-500/20 rounded text-[9px] text-yellow-400">
                          ⚠️ {weather.alerts[0].substring(0, 15)}...
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Jobs Section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-orange-400" />
          Active Jobs This Week
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.filter((job: any) => job.status !== 'completed').map((job: any) => (
            <div key={job.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500/30 transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2">
                  <div
                    className="w-4 h-4 rounded mt-0.5"
                    style={{ backgroundColor: job.color }}
                  />
                  <div>
                    <h3 className="text-sm font-medium text-white">{job.title}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">{job.id} • {job.customer}</p>
                  </div>
                </div>
                <span className={`text-sm px-2 py-1 rounded ${
                  job.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                  job.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                  job.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {job.priority}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(job.startDate).toLocaleDateString()} - {new Date(job.endDate).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Users className="w-3 h-3" />
                  {job.assignedEmployees.length} employees assigned
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="w-3 h-3" />
                  {job.estimatedHours} hours estimated
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Schedule Section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-400" />
          Employee Schedule
        </h2>
        <EmployeeScheduleView
          weekDays={weekDays}
          employees={employees}
          shifts={shifts}
          jobs={jobs}
          getShiftsForEmployeeAndDate={getShiftsForEmployeeAndDate}
          showWeatherOverlay={showWeatherOverlay}
          weatherData={weatherData}
          getWeatherIcon={getWeatherIcon}
        />
      </div>
    </div>
  );
}

// Job Details Modal
function JobDetailsModal({ job, employees, onClose, onAssign, onUpdateAppointmentStatus }: any) {
  const assignedEmps = employees.filter((e: any) => job.assignedEmployees.includes(e.id));
  const availableEmps = employees.filter((e: any) => !job.assignedEmployees.includes(e.id));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: job.color + '40' }}
              >
                <Wrench className="w-5 h-5" style={{ color: job.color }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{job.title}</h2>
                <p className="text-sm text-gray-400 mt-1">{job.id} • {job.customer}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#0F0F0F] rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <div className={`text-sm font-medium px-2 py-1 rounded inline-block ${
                job.status === 'in-progress' ? 'bg-orange-500/20 text-orange-400' :
                job.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {job.status}
              </div>
            </div>
            
            <div className="p-4 bg-[#0F0F0F] rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Priority</div>
              <div className={`text-sm font-medium px-2 py-1 rounded inline-block ${
                job.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                job.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                job.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {job.priority}
              </div>
            </div>
            
            <div className="p-4 bg-[#0F0F0F] rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Start Date</div>
              <div className="text-sm font-medium text-white">
                {new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            
            <div className="p-4 bg-[#0F0F0F] rounded-lg">
              <div className="text-sm text-gray-400 mb-1">End Date</div>
              <div className="text-sm font-medium text-white">
                {new Date(job.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            
            <div className="p-4 bg-[#0F0F0F] rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Estimated Hours</div>
              <div className="text-sm font-medium text-white">{job.estimatedHours} hours</div>
            </div>
            
            <div className="p-4 bg-[#0F0F0F] rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Job Value</div>
              <div className="text-sm font-medium text-green-400">${job.value.toLocaleString()}</div>
            </div>
          </div>

          {/* Location */}
          <div className="p-4 bg-[#0F0F0F] rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-white">{job.location}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Description</h3>
            <p className="text-sm text-gray-300">{job.description}</p>
          </div>

          {job.appointmentId && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-orange-200">Saved customer appointment</h3>
                  <p className="text-xs text-orange-100/70 mt-1">Status updates are written to the shared schedule immediately.</p>
                </div>
                <select
                  value={job.status === 'in-progress' ? 'scheduled' : job.status}
                  onChange={(event) => onUpdateAppointmentStatus(job, event.target.value)}
                  className="bg-[#0F0F0F] border border-orange-500/30 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          )}

          {/* Required Skills */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.requiredSkills.map((skill: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-[#2A2A2A] text-gray-300 rounded text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Assigned Employees */}
          <div>
            <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Assigned Employees ({assignedEmps.length})</h3>
            <div className="space-y-2">
              {assignedEmps.map((emp: any) => (
                <div key={emp.id} className="flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white text-sm font-bold">
                      {emp.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{emp.name}</div>
                      <div className="text-sm text-gray-400">{emp.positions.join(', ')}</div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-[#2A2A2A] rounded-lg transition">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Available Employees */}
          {availableEmps.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Available Employees</h3>
              <div className="space-y-2">
                {availableEmps.slice(0, 3).map((emp: any) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-sm font-bold">
                        {emp.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{emp.name}</div>
                        <div className="text-sm text-gray-400">{emp.positions.join(', ')}</div>
                      </div>
                    </div>
                    <PrimaryButton
                      onClick={() => toast.success(`${emp.name} assigned to job`)}
                      size="sm"
                      className="transition"
                    >
                      Assign
                    </PrimaryButton>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2A2A2A] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              Edit Job
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg transition">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Job Modal
function CreateJobModal({ onClose, employees, positions }: any) {
  const [formData, setFormData] = useState({
    title: '',
    customer: '',
    startDate: '',
    endDate: '',
    estimatedHours: '',
    priority: 'medium',
    location: '',
    value: '',
    description: '',
    assignedEmployees: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Job created and scheduled successfully!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Schedule New Job</h2>
                <p className="text-sm text-gray-400">Create and assign a new work order</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">Job Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="Kitchen Renovation - ABC Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Customer</label>
              <input
                type="text"
                required
                value={formData.customer}
                onChange={(e) => setFormData({...formData, customer: e.target.value})}
                className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="Customer name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Estimated Hours</label>
              <input
                type="number"
                required
                value={formData.estimatedHours}
                onChange={(e) => setFormData({...formData, estimatedHours: e.target.value})}
                className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Job Value ($)</label>
              <input
                type="number"
                required
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: e.target.value})}
                className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="15000"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">Location</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="123 Main Street, Suite 400"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                placeholder="Describe the job details..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">Assign Employees</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {employees.map((emp: any) => (
                  <label key={emp.id} className="flex items-center gap-3 p-3 bg-[#0F0F0F] rounded-lg cursor-pointer hover:bg-[#2A2A2A] transition">
                    <input
                      type="checkbox"
                      checked={formData.assignedEmployees.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, assignedEmployees: [...formData.assignedEmployees, emp.id]});
                        } else {
                          setFormData({...formData, assignedEmployees: formData.assignedEmployees.filter(id => id !== emp.id)});
                        }
                      }}
                      className="rounded bg-[#1A1A1A] border-[#2A2A2A]"
                    />
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white text-sm font-bold">
                      {emp.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{emp.name}</div>
                      <div className="text-sm text-gray-400">{emp.positions.join(', ')}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-[#2A2A2A] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg transition font-medium"
          >
            Create & Schedule Job
          </button>
        </div>
      </div>
    </div>
  );
}
