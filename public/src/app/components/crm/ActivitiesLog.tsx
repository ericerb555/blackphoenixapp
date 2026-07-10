import { useState } from 'react';
import {
  Phone, Mail, Calendar, MessageSquare, FileText, Coffee,
  Video, CheckCircle, Clock, User, Building2, Filter,
  Search, Plus, Download, Eye, Edit, Trash2
} from 'lucide-react';
import { Select } from '../ui/input/Select';

export function ActivitiesLog() {
  const [filterType, setFilterType] = useState('all');
  const [userFilter, setUserFilter] = useState('All Users');
  const [timeRangeFilter, setTimeRangeFilter] = useState('Last 7 Days');

  const activityTypes = [
    { id: 'all', label: 'All Activities', icon: Clock },
    { id: 'call', label: 'Calls', icon: Phone },
    { id: 'email', label: 'Emails', icon: Mail },
    { id: 'meeting', label: 'Meetings', icon: Calendar },
    { id: 'note', label: 'Notes', icon: FileText },
    { id: 'task', label: 'Tasks', icon: CheckCircle },
  ];

  const activities = [
    {
      id: 1,
      type: 'call',
      icon: Phone,
      title: 'Phone call with Sarah Johnson',
      description: 'Discussed enterprise CRM requirements and pricing options. Scheduled product demo for next week.',
      contact: 'Sarah Johnson',
      company: 'Tech Solutions Inc',
      user: 'John Smith',
      duration: '45 minutes',
      time: '2 hours ago',
      date: '2026-01-21 10:30 AM',
      status: 'completed',
      tags: ['Sales', 'Discovery'],
      color: 'green'
    },
    {
      id: 2,
      type: 'email',
      icon: Mail,
      title: 'Sent proposal to Michael Chen',
      description: 'Detailed proposal for cloud migration project including timeline, deliverables, and pricing.',
      contact: 'Michael Chen',
      company: 'Global Enterprises',
      user: 'Amanda White',
      time: '3 hours ago',
      date: '2026-01-21 09:15 AM',
      status: 'sent',
      tags: ['Proposal', 'Follow-up'],
      color: 'blue'
    },
    {
      id: 3,
      type: 'meeting',
      icon: Video,
      title: 'Product demo scheduled',
      description: 'Virtual product demonstration for Innovation Labs team. Includes Q&A session.',
      contact: 'Emily Rodriguez',
      company: 'Innovation Labs',
      user: 'Robert Taylor',
      duration: '60 minutes',
      time: '5 hours ago',
      date: '2026-01-21 08:00 AM',
      status: 'scheduled',
      tags: ['Demo', 'Product'],
      color: 'purple'
    },
    {
      id: 4,
      type: 'note',
      icon: FileText,
      title: 'Contract negotiation notes',
      description: 'Key points from negotiation: pricing adjustments, implementation timeline, support requirements.',
      contact: 'David Park',
      company: 'StartupXYZ',
      user: 'Jennifer Martinez',
      time: '1 day ago',
      date: '2026-01-20 03:45 PM',
      status: 'completed',
      tags: ['Negotiation', 'Contract'],
      color: 'yellow'
    },
    {
      id: 5,
      type: 'meeting',
      icon: Coffee,
      title: 'Coffee meeting with Lisa Anderson',
      description: 'Informal meeting to discuss potential collaboration opportunities and introduce new features.',
      contact: 'Lisa Anderson',
      company: 'Enterprise Corp',
      user: 'James Wilson',
      duration: '30 minutes',
      time: '1 day ago',
      date: '2026-01-20 02:00 PM',
      status: 'completed',
      tags: ['Relationship', 'Casual'],
      color: 'orange'
    },
    {
      id: 6,
      type: 'task',
      icon: CheckCircle,
      title: 'Follow-up email completed',
      description: 'Sent follow-up email with additional pricing information and case studies.',
      contact: 'Robert Taylor',
      company: 'Media Corporation',
      user: 'Sarah Williams',
      time: '2 days ago',
      date: '2026-01-19 11:30 AM',
      status: 'completed',
      tags: ['Follow-up', 'Documentation'],
      color: 'green'
    },
    {
      id: 7,
      type: 'call',
      icon: Phone,
      title: 'Discovery call scheduled',
      description: 'Initial discovery call to understand business needs and pain points.',
      contact: 'Alex Johnson',
      company: 'Tech Innovators',
      user: 'Michael Brown',
      duration: '30 minutes',
      time: '2 days ago',
      date: '2026-01-19 09:00 AM',
      status: 'scheduled',
      tags: ['Discovery', 'New Lead'],
      color: 'green'
    },
  ];

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    scheduled: 'bg-blue-100 text-blue-800',
    sent: 'bg-purple-100 text-purple-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  const filteredActivities = filterType === 'all' 
    ? activities 
    : activities.filter(a => a.type === filterType);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={userFilter}
              onChange={setUserFilter}
              options={[
                { value: 'All Users', label: 'All Users' },
                { value: 'John Smith', label: 'John Smith' },
                { value: 'Amanda White', label: 'Amanda White' },
                { value: 'Robert Taylor', label: 'Robert Taylor' }
              ]}
            />
            <Select
              value={timeRangeFilter}
              onChange={setTimeRangeFilter}
              options={[
                { value: 'Last 7 Days', label: 'Last 7 Days' },
                { value: 'Last 30 Days', label: 'Last 30 Days' },
                { value: 'Last 90 Days', label: 'Last 90 Days' },
                { value: 'Custom Range', label: 'Custom Range' }
              ]}
            />
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Log Activity
            </button>
          </div>
        </div>
      </div>

      {/* Activity Type Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {activityTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                filterType === type.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Activities Timeline */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="divide-y divide-gray-200">
          {filteredActivities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-${activity.color}-100 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 text-${activity.color}-600`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{activity.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{activity.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-400" />
                            {activity.contact}
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {activity.company}
                          </div>
                          {activity.duration && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {activity.duration}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[activity.status]}`}>
                            {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                          </span>
                          {activity.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600">{activity.time}</span>
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">{activity.date}</p>
                        <p className="text-xs text-gray-500 mt-1">by {activity.user}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Load More */}
      <div className="text-center">
        <button className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          Load More Activities
        </button>
      </div>
    </div>
  );
}
