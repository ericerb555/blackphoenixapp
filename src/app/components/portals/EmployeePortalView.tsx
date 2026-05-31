import { useState } from 'react';
import {
  Briefcase, Bell, MessageSquare, Settings, Clock, Star,
  ArrowUpRight, ClipboardList, CheckCircle, Calendar,
  Target, FileText, Download, ChevronRight, Search, Filter,
  Home, BarChart3, Award
} from 'lucide-react';
import { ChartContainer } from '../ChartContainer';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import AdvertisingVideoReel from '../AdvertisingVideoReel';
import ReferralRewards from '../ReferralRewards';

export default function EmployeePortalView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedule' | 'tasks' | 'timesheet' | 'documents' | 'performance' | 'referrals'>('dashboard');

  // Mock employee data
  const employeeInfo = {
    name: 'John Anderson',
    email: 'john.anderson@company.com',
    phone: '(555) 234-5678',
    position: 'Senior Project Manager',
    department: 'Construction',
    employeeId: 'EMP-2024-1842',
    hireDate: 'March 2022',
    manager: 'Sarah Thompson',
    rating: 4.8
  };

  // Work hours data
  const hoursData = [
    { week: 'Week 1', hours: 42, overtime: 2 },
    { week: 'Week 2', hours: 40, overtime: 0 },
    { week: 'Week 3', hours: 45, overtime: 5 },
    { week: 'Week 4', hours: 38, overtime: 0 },
    { week: 'Week 5', hours: 43, overtime: 3 },
    { week: 'Week 6', hours: 40, overtime: 0 },
    { week: 'This Week', hours: 28, overtime: 0 }
  ];

  // Stats
  const stats = [
    { label: 'Hours This Week', value: '28', change: '12h remaining', trend: 'neutral', icon: Clock, color: 'blue' },
    { label: 'Active Tasks', value: '8', change: '3 due today', trend: 'neutral', icon: ClipboardList, color: 'orange' },
    { label: 'Completed Tasks', value: '142', change: '+12 this week', trend: 'up', icon: CheckCircle, color: 'green' },
    { label: 'Performance', value: '4.8', change: '+0.3', trend: 'up', icon: Star, color: 'yellow' }
  ];

  // Today's schedule
  const todaySchedule = [
    {
      id: 'SCH-001',
      title: 'Team Stand-up Meeting',
      time: '9:00 AM',
      duration: '30 min',
      location: 'Conference Room A',
      type: 'meeting',
      status: 'upcoming'
    },
    {
      id: 'SCH-002',
      title: 'Site Inspection - Downtown Office',
      time: '10:30 AM',
      duration: '2 hours',
      location: '123 Main St',
      type: 'field-work',
      status: 'upcoming'
    },
    {
      id: 'SCH-003',
      title: 'Lunch Break',
      time: '12:30 PM',
      duration: '1 hour',
      location: 'Off-site',
      type: 'break',
      status: 'upcoming'
    },
    {
      id: 'SCH-004',
      title: 'Project Review with Client',
      time: '2:00 PM',
      duration: '1 hour',
      location: 'Virtual - Zoom',
      type: 'meeting',
      status: 'upcoming'
    }
  ];

  // Active tasks
  const activeTasks = [
    {
      id: 'TASK-089',
      title: 'Complete safety inspection report',
      project: 'Commercial Office Renovation',
      priority: 'high',
      dueDate: '2024-02-02',
      progress: 75,
      status: 'in-progress'
    },
    {
      id: 'TASK-091',
      title: 'Review contractor bids',
      project: 'Residential Complex Phase 2',
      priority: 'high',
      dueDate: '2024-02-02',
      progress: 40,
      status: 'in-progress'
    },
    {
      id: 'TASK-092',
      title: 'Update project timeline',
      project: 'Retail Space Expansion',
      priority: 'medium',
      dueDate: '2024-02-03',
      progress: 60,
      status: 'in-progress'
    },
    {
      id: 'TASK-093',
      title: 'Prepare material order list',
      project: 'Industrial Facility Upgrade',
      priority: 'medium',
      dueDate: '2024-02-05',
      progress: 20,
      status: 'not-started'
    }
  ];

  // Recent documents
  const recentDocuments = [
    {
      id: 'DOC-156',
      name: 'Safety Training Certificate 2024',
      type: 'certificate',
      uploadedDate: '2024-01-28',
      size: '2.4 MB'
    },
    {
      id: 'DOC-148',
      name: 'Employment Contract - Updated',
      type: 'contract',
      uploadedDate: '2024-01-25',
      size: '1.8 MB'
    },
    {
      id: 'DOC-142',
      name: 'W-2 Form 2023',
      type: 'tax-document',
      uploadedDate: '2024-01-20',
      size: '0.5 MB'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'not-started': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'upcoming': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return '🤝';
      case 'field-work': return '🏗️';
      case 'break': return '☕';
      default: return '📋';
    }
  };

  const getStatColor = (color: string) => {
    switch (color) {
      case 'orange': return 'bg-[#ea580c]/20 text-[#ea580c]';
      case 'green': return 'bg-green-500/20 text-green-400';
      case 'blue': return 'bg-blue-500/20 text-blue-400';
      case 'yellow': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A]">
      {/* Logo Marquee */}
      <LogoMarquee speed={30} />

      {/* Advertising Text Banner */}
      <AdvertisingMarquee placement="employee-portal" dismissible />

      {/* Advertising Video Reel - Floating Widget */}
      <AdvertisingVideoReel placement="employee-portal" maxVideos={5} autoPlay={false} />

      {/* Header */}
      <header className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Employee Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ea580c] to-orange-600 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{employeeInfo.name}</h1>
                <p className="text-xs text-gray-400">{employeeInfo.position}</p>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#ea580c] rounded-full"></span>
              </button>
              <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <MessageSquare className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-1 -mb-px">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'schedule', label: 'Schedule', icon: Calendar },
              { id: 'tasks', label: 'Tasks', icon: ClipboardList },
              { id: 'timesheet', label: 'Timesheet', icon: Clock },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'performance', label: 'Performance', icon: BarChart3 },
              { id: 'referrals', label: 'Referrals', icon: Award }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#ea580c] text-[#ea580c]'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-[#ea580c] to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Good morning, {employeeInfo.name.split(' ')[0]}!</h2>
                  <p className="text-white/90 mb-4">
                    You have {activeTasks.filter(t => t.status === 'in-progress').length} active tasks and {todaySchedule.length} scheduled events today
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-semibold">{employeeInfo.rating}</span>
                      <span className="text-white/80">Performance</span>
                    </div>
                    <div className="w-px h-4 bg-white/30" />
                    <div className="text-white/80">
                      ID: <span className="font-semibold text-white">{employeeInfo.employeeId}</span>
                    </div>
                    <div className="w-px h-4 bg-white/30" />
                    <div className="text-white/80">
                      Employed since {employeeInfo.hireDate}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <PrimaryButton variant="white">
                    <Clock className="w-4 h-4" />
                    Clock In
                  </PrimaryButton>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${getStatColor(stat.color)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.change}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Work Hours Chart */}
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Weekly Hours</h3>
                  <p className="text-sm text-gray-400">Track your work hours and overtime</p>
                </div>
                <SecondaryButton size="sm">
                  <Download className="w-4 h-4" />
                  Export Report
                </SecondaryButton>
              </div>
              <ChartContainer>
                <AreaChart data={hoursData} height={300}>
                  <defs>
                    <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="week" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#ea580c"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#hoursGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Today's Schedule & Active Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Schedule */}
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Today's Schedule</h3>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="text-sm text-[#ea580c] hover:text-orange-400 font-medium flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {todaySchedule.map((event) => (
                    <div key={event.id} className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getTypeIcon(event.type)}</span>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white mb-1">{event.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                            <Clock className="w-3 h-3" />
                            <span>{event.time} • {event.duration}</span>
                          </div>
                          <p className="text-xs text-gray-500">{event.location}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Tasks */}
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white">Active Tasks</h3>
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className="text-sm text-[#ea580c] hover:text-orange-400 font-medium flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {activeTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-white mb-1">{task.title}</h4>
                          <p className="text-xs text-gray-400">{task.project}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{task.id}</span>
                        <span>Due: {task.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-800 rounded-full h-2">
                          <div 
                            className="bg-[#ea580c] h-2 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{task.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">My Schedule</h2>
                <p className="text-sm text-gray-400">View and manage your calendar</p>
              </div>
              <div className="flex gap-3">
                <SecondaryButton>
                  <Filter className="w-4 h-4" />
                  Filter
                </SecondaryButton>
                <PrimaryButton>
                  <Calendar className="w-4 h-4" />
                  Add Event
                </PrimaryButton>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Today's Schedule</h3>
              <div className="space-y-4">
                {todaySchedule.map((event) => (
                  <div key={event.id} className="p-5 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm font-semibold text-[#ea580c]">{event.time.split(' ')[0]}</p>
                        <p className="text-xs text-gray-500">{event.time.split(' ')[1]}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-base font-semibold text-white mb-1">{event.title}</h4>
                            <p className="text-sm text-gray-400">{event.location}</p>
                          </div>
                          <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.duration}
                          </span>
                          <span className="capitalize">{event.type.replace('-', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">My Tasks</h2>
                <p className="text-sm text-gray-400">Manage your assigned tasks</p>
              </div>
              <div className="flex gap-3">
                <SecondaryButton>
                  <Filter className="w-4 h-4" />
                  Filter
                </SecondaryButton>
                <SecondaryButton>
                  <Search className="w-4 h-4" />
                  Search
                </SecondaryButton>
              </div>
            </div>

            <div className="grid gap-4">
              {activeTasks.map((task) => (
                <div key={task.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{task.title}</h3>
                        <span className={`px-3 py-1 text-xs rounded-full border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{task.project}</p>
                      <p className="text-xs text-gray-500">{task.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Due Date</p>
                      <p className="text-sm text-white">{task.dueDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Progress</p>
                      <p className="text-sm text-white">{task.progress}%</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Overall Progress</span>
                      <span>{task.progress}% Complete</span>
                    </div>
                    <div className="bg-gray-800 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-[#ea580c] to-orange-600 h-3 rounded-full transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <PrimaryButton size="sm">
                      <ClipboardList className="w-4 h-4" />
                      View Details
                    </PrimaryButton>
                    <SecondaryButton size="sm">
                      <MessageSquare className="w-4 h-4" />
                      Comments
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timesheet Tab */}
        {activeTab === 'timesheet' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Timesheet</h2>
                <p className="text-sm text-gray-400">Track and submit your work hours</p>
              </div>
              <PrimaryButton>
                <Download className="w-4 h-4" />
                Export Timesheet
              </PrimaryButton>
            </div>

            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Weekly Hours</h3>
              <ChartContainer>
                <AreaChart data={hoursData} height={400}>
                  <defs>
                    <linearGradient id="hoursDetailGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="week" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#ea580c"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#hoursDetailGradient)"
                    name="Regular Hours"
                  />
                  <Area
                    type="monotone"
                    dataKey="overtime"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={0.5}
                    fill="#3b82f6"
                    name="Overtime"
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">My Documents</h2>
                <p className="text-sm text-gray-400">Access your employment documents</p>
              </div>
              <div className="flex gap-3">
                <SecondaryButton>
                  <Search className="w-4 h-4" />
                  Search
                </SecondaryButton>
                <PrimaryButton>
                  <Download className="w-4 h-4" />
                  Upload Document
                </PrimaryButton>
              </div>
            </div>

            <div className="grid gap-4">
              {recentDocuments.map((doc) => (
                <div key={doc.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#ea580c]/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#ea580c]" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white mb-1">{doc.name}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="capitalize">{doc.type.replace('-', ' ')}</span>
                          <span>•</span>
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>Uploaded {doc.uploadedDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <SecondaryButton size="sm">
                        <Download className="w-4 h-4" />
                        Download
                      </SecondaryButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Performance Dashboard</h2>
              <p className="text-sm text-gray-400">Track your performance metrics and goals</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-yellow-500/20 rounded-lg">
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  <span className="text-sm text-gray-400">Overall Rating</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{employeeInfo.rating}</p>
                <p className="text-xs text-green-400">+0.3 this quarter</p>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-sm text-gray-400">Tasks Completed</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">142</p>
                <p className="text-xs text-green-400">+15% from last month</p>
              </div>

              <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-400">Goals Achieved</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">8/10</p>
                <p className="text-xs text-gray-400">80% completion rate</p>
              </div>
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Referral Program</h2>
              <p className="text-sm text-gray-400">Earn rewards by referring talented professionals</p>
            </div>
            <ReferralRewards userType="employee" />
          </div>
        )}
      </main>
    </div>
  );
}