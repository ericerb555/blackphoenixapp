import { useState } from 'react';
import {
  CheckCircle, Circle, Clock, Calendar, User, Building2,
  AlertCircle, Flag, Plus, Filter, Search, MoreVertical,
  Edit, Trash2, Eye
} from 'lucide-react';
import { Select } from '../ui/input/Select';

export function TasksManager() {
  const [viewMode, setViewMode] = useState<'all' | 'today' | 'upcoming' | 'overdue'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('All Assignees');
  const [priorityFilter, setPriorityFilter] = useState('All Priorities');

  const tasks = [
    {
      id: 1,
      title: 'Follow up on proposal - Tech Solutions Inc',
      description: 'Send follow-up email regarding the enterprise CRM proposal sent last week',
      contact: 'Sarah Johnson',
      company: 'Tech Solutions Inc',
      assignee: 'John Smith',
      dueDate: '2026-01-21',
      priority: 'high',
      status: 'pending',
      type: 'follow-up',
      relatedDeal: 'Enterprise CRM System - $45K'
    },
    {
      id: 2,
      title: 'Prepare product demo materials',
      description: 'Create customized demo presentation and prepare test environment for Innovation Labs',
      contact: 'Emily Rodriguez',
      company: 'Innovation Labs',
      assignee: 'Robert Taylor',
      dueDate: '2026-01-22',
      priority: 'high',
      status: 'in-progress',
      type: 'preparation',
      relatedDeal: 'Software Development Services - $125K'
    },
    {
      id: 3,
      title: 'Schedule contract review meeting',
      description: 'Set up meeting with legal team to review contract terms for StartupXYZ deal',
      contact: 'David Park',
      company: 'StartupXYZ',
      assignee: 'Jennifer Martinez',
      dueDate: '2026-01-23',
      priority: 'medium',
      status: 'pending',
      type: 'meeting',
      relatedDeal: 'IT Consulting Package - $52K'
    },
    {
      id: 4,
      title: 'Send case studies to Global Enterprises',
      description: 'Compile and send relevant case studies for cloud migration projects',
      contact: 'Michael Chen',
      company: 'Global Enterprises',
      assignee: 'Amanda White',
      dueDate: '2026-01-20',
      priority: 'high',
      status: 'overdue',
      type: 'follow-up',
      relatedDeal: 'Cloud Migration Project - $78K'
    },
    {
      id: 5,
      title: 'Update CRM records',
      description: 'Update contact information and meeting notes from last week\'s discussions',
      contact: 'Lisa Anderson',
      company: 'Enterprise Corp',
      assignee: 'James Wilson',
      dueDate: '2026-01-24',
      priority: 'low',
      status: 'pending',
      type: 'admin',
      relatedDeal: 'Digital Transformation - $180K'
    },
    {
      id: 6,
      title: 'Prepare pricing proposal',
      description: 'Create detailed pricing breakdown for marketing automation package',
      contact: 'Robert Taylor',
      company: 'Media Corporation',
      assignee: 'Sarah Williams',
      dueDate: '2026-01-21',
      priority: 'high',
      status: 'pending',
      type: 'proposal',
      relatedDeal: 'Marketing Automation - $95K'
    },
    {
      id: 7,
      title: 'Quarterly business review',
      description: 'Prepare QBR presentation with performance metrics and roadmap',
      contact: 'Jennifer Lee',
      company: 'Tech Innovators',
      assignee: 'Michael Brown',
      dueDate: '2026-01-25',
      priority: 'medium',
      status: 'in-progress',
      type: 'review',
      relatedDeal: 'Data Analytics Platform - $210K'
    },
  ];

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-800 border-red-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
  };

  const getTasksByView = () => {
    const today = new Date('2026-01-21');
    today.setHours(0, 0, 0, 0);

    switch (viewMode) {
      case 'today':
        return tasks.filter(t => {
          const taskDate = new Date(t.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() === today.getTime();
        });
      case 'upcoming':
        return tasks.filter(t => {
          const taskDate = new Date(t.dueDate);
          taskDate.setHours(0, 0, 0, 0);
          return taskDate.getTime() > today.getTime();
        });
      case 'overdue':
        return tasks.filter(t => t.status === 'overdue');
      default:
        return tasks;
    }
  };

  const filteredTasks = getTasksByView();

  const stats = [
    { label: 'Total Tasks', value: tasks.length, color: 'blue' },
    { label: 'Due Today', value: tasks.filter(t => t.dueDate === '2026-01-21').length, color: 'purple' },
    { label: 'Overdue', value: tasks.filter(t => t.status === 'overdue').length, color: 'red' },
    { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: 'green' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 text-${stat.color}-600`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={[
                { value: 'All Assignees', label: 'All Assigne es' },
                { value: 'John Smith', label: 'John Smith' },
                { value: 'Amanda White', label: 'Amanda White' },
                { value: 'Robert Taylor', label: 'Robert Taylor' }
              ]}
            />
            <Select
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: 'All Priorities', label: 'All Priorities' },
                { value: 'High', label: 'High' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Low', label: 'Low' }
              ]}
            />
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All Tasks' },
          { id: 'today', label: 'Due Today' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'overdue', label: 'Overdue' },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setViewMode(view.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === view.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {filteredTasks.map((task) => (
          <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex gap-4">
              {/* Checkbox */}
              <div className="flex-shrink-0 pt-1">
                <button className="w-5 h-5 rounded border-2 border-gray-300 hover:border-blue-500 flex items-center justify-center">
                  {task.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4 text-gray-400" />
                        {task.contact}
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {task.company}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${priorityColors[task.priority]}`}>
                        <Flag className="w-3 h-3" />
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.status]}`}>
                        {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {task.type}
                      </span>
                    </div>

                    {task.relatedDeal && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 inline-flex">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        <span>Related Deal: {task.relatedDeal}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    <div className="text-right mr-4">
                      <p className="text-xs text-gray-500 mb-1">Assigned to</p>
                      <p className="text-sm font-medium text-gray-900">{task.assignee}</p>
                    </div>
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
          <p className="text-gray-600">No tasks match the current filter criteria.</p>
        </div>
      )}
    </div>
  );
}
