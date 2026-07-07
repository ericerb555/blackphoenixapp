import React, { useState } from 'react';
import { Phone, Calendar, Clock, User, AlertCircle, CheckCircle, Bell, Users, Shield } from 'lucide-react';

interface OnCallSchedule {
  id: string;
  adminName: string;
  adminId: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'upcoming' | 'completed';
  role: string;
  contactNumber: string;
  email: string;
  incidents: number;
  responseTime: string;
}

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'resolved';
  timestamp: Date;
  assignedTo: string;
}

export function AdminOnCallManagement() {
  const [schedules, setSchedules] = useState<OnCallSchedule[]>([
    {
      id: '1',
      adminName: 'Marcus Rodriguez',
      adminId: 'ADM-001',
      startDate: new Date('2026-03-16'),
      endDate: new Date('2026-03-23'),
      status: 'active',
      role: 'Primary',
      contactNumber: '+1 (555) 298-4721',
      email: 'marcus.rodriguez@company.com',
      incidents: 7,
      responseTime: '2.8 min',
    },
    {
      id: '2',
      adminName: 'Jennifer Wu',
      adminId: 'ADM-002',
      startDate: new Date('2026-03-16'),
      endDate: new Date('2026-03-23'),
      status: 'active',
      role: 'Backup',
      contactNumber: '+1 (555) 847-3562',
      email: 'jennifer.wu@company.com',
      incidents: 2,
      responseTime: '3.1 min',
    },
    {
      id: '3',
      adminName: 'David Okonkwo',
      adminId: 'ADM-003',
      startDate: new Date('2026-03-23'),
      endDate: new Date('2026-03-30'),
      status: 'upcoming',
      role: 'Primary',
      contactNumber: '+1 (555) 612-9384',
      email: 'david.okonkwo@company.com',
      incidents: 0,
      responseTime: 'N/A',
    },
  ]);

  const [recentIncidents] = useState<Incident[]>([
    {
      id: 'INC-001',
      title: 'Payment Gateway Timeout',
      severity: 'critical',
      status: 'in-progress',
      timestamp: new Date('2026-03-16T14:22:00'),
      assignedTo: 'Marcus Rodriguez',
    },
    {
      id: 'INC-002',
      title: 'Vendor API Rate Limit Exceeded',
      severity: 'high',
      status: 'open',
      timestamp: new Date('2026-03-16T15:10:00'),
      assignedTo: 'Marcus Rodriguez',
    },
    {
      id: 'INC-003',
      title: 'Authentication Service Degradation',
      severity: 'medium',
      status: 'resolved',
      timestamp: new Date('2026-03-16T12:35:00'),
      assignedTo: 'Jennifer Wu',
    },
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/30 border-red-900';
      case 'high': return 'text-orange-400 bg-orange-900/30 border-orange-900';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-900';
      case 'low': return 'text-blue-400 bg-blue-900/30 border-blue-900';
      default: return 'text-zinc-400 bg-zinc-900/30 border-zinc-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-900/30 text-green-400 border-green-900';
      case 'upcoming': return 'bg-blue-900/30 text-blue-400 border-blue-900';
      case 'completed': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const OnCallCard = ({ schedule }: { schedule: OnCallSchedule }) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-[#ea580c] transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{schedule.adminName}</h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(schedule.status)}`}>
                {schedule.status}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/50">
                {schedule.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400">Schedule:</span>
          <span className="text-white">
            {schedule.startDate.toLocaleDateString()} - {schedule.endDate.toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400">Phone:</span>
          <span className="text-white">{schedule.contactNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Bell className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-400">Email:</span>
          <span className="text-white">{schedule.email}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
        <div className="bg-[#0A0A0A] rounded-lg p-3 border border-zinc-800">
          <div className="text-xs text-zinc-500 mb-1">Incidents Handled</div>
          <div className="text-xl font-bold text-white">{schedule.incidents}</div>
        </div>
        <div className="bg-[#0A0A0A] rounded-lg p-3 border border-zinc-800">
          <div className="text-xs text-zinc-500 mb-1">Avg Response</div>
          <div className="text-xl font-bold text-white">{schedule.responseTime}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button className="flex-1 px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#dc2626] transition-colors text-sm font-medium">
          Contact Admin
        </button>
        <button className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm">
          View Details
        </button>
      </div>
    </div>
  );

  const IncidentRow = ({ incident }: { incident: Incident }) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-900/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-white font-medium">{incident.title}</h4>
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
              {incident.severity}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {incident.timestamp.toLocaleTimeString()}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {incident.assignedTo}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {incident.status === 'resolved' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-[#ea580c] to-[#dc2626] rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin On-Call Management</h1>
              <p className="text-zinc-400">Monitor and manage on-call administrators</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-[#ea580c]" />
              <span className="text-sm text-zinc-400">Active On-Call</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {schedules.filter(s => s.status === 'active').length}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-zinc-400">Open Incidents</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {recentIncidents.filter(i => i.status === 'open' || i.status === 'in-progress').length}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-sm text-zinc-400">Resolved Today</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {recentIncidents.filter(i => i.status === 'resolved').length}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-zinc-400">Avg Response</span>
            </div>
            <p className="text-2xl font-bold text-white">4.0 min</p>
          </div>
        </div>

        {/* On-Call Schedules */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Current On-Call Schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.map(schedule => (
              <OnCallCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Incidents</h2>
          <div className="space-y-3">
            {recentIncidents.map(incident => (
              <IncidentRow key={incident.id} incident={incident} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}