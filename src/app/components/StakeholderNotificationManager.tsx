/**
 * Stakeholder Notification Manager - Admin Interface
 * 
 * Features:
 * - Send notifications to individual stakeholders or groups
 * - Bulk notification sending
 * - Template management
 * - Schedule notifications
 * - Track delivery and read status
 * - Integration with email and SMS
 */

import { useState, useEffect } from 'react';
import {
  Send, Users, Mail, MessageSquare, Bell, Plus, X, Check,
  Calendar, Clock, Filter, Search, Edit, Copy, Trash2, Eye,
  AlertCircle, CheckCircle, Info, AlertTriangle, DollarSign,
  FileText, Package, Briefcase, Target, Zap, Star, Flag,
  ChevronDown, ChevronRight, Download, Upload, RefreshCw,
  Settings, Phone, Globe, Building2, UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

type NotificationType = 'info' | 'success' | 'warning' | 'alert' | 'message' | 'task' | 'payment' | 'schedule' | 'document';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Stakeholder {
  id: string;
  type: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  action_label?: string;
  action_url?: string;
}

interface StakeholderNotificationManagerProps {
  selectedStakeholderId?: string;
  onClose?: () => void;
}

export default function StakeholderNotificationManager({
  selectedStakeholderId,
  onClose
}: StakeholderNotificationManagerProps) {
  const [activeTab, setActiveTab] = useState<'send' | 'templates' | 'history'>('send');
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [selectedStakeholders, setSelectedStakeholders] = useState<string[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stakeholderTypeFilter, setStakeholderTypeFilter] = useState<string>('all');

  // Notification form
  const [notificationForm, setNotificationForm] = useState({
    type: 'info' as NotificationType,
    priority: 'medium' as NotificationPriority,
    title: '',
    message: '',
    action_label: '',
    action_url: '',
    send_email: false,
    send_sms: false,
    schedule: false,
    scheduled_at: ''
  });

  useEffect(() => {
    loadStakeholders();
    loadTemplates();

    if (selectedStakeholderId) {
      setSelectedStakeholders([selectedStakeholderId]);
    }
  }, [selectedStakeholderId]);

  const loadStakeholders = async () => {
    try {
      const { data, error } = await supabase
        .from('stakeholders')
        .select('id, type, name, email, phone, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setStakeholders(data || []);
    } catch (error: any) {
      console.error('Error loading stakeholders:', error);
      toast.error('Failed to load stakeholders');
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('name');

      if (error) {
        // Table might not exist yet, create default templates
        setTemplates(getDefaultTemplates());
        return;
      }
      setTemplates(data || getDefaultTemplates());
    } catch (error: any) {
      console.error('Error loading templates:', error);
      setTemplates(getDefaultTemplates());
    }
  };

  const getDefaultTemplates = (): NotificationTemplate[] => [
    {
      id: 'welcome',
      name: 'Welcome Message',
      type: 'info',
      priority: 'medium',
      title: 'Welcome to Our Platform',
      message: 'Welcome! We\'re excited to have you on board. Your portal is now active and ready to use.',
      action_label: 'View Portal',
      action_url: '/portal'
    },
    {
      id: 'payment-due',
      name: 'Payment Due Reminder',
      type: 'payment',
      priority: 'high',
      title: 'Payment Due Soon',
      message: 'You have an upcoming payment due. Please review and submit payment at your earliest convenience.',
      action_label: 'View Invoice',
      action_url: '/invoices'
    },
    {
      id: 'task-assigned',
      name: 'Task Assigned',
      type: 'task',
      priority: 'medium',
      title: 'New Task Assigned',
      message: 'A new task has been assigned to you. Please review the details and update the status.',
      action_label: 'View Task',
      action_url: '/tasks'
    },
    {
      id: 'document-uploaded',
      name: 'Document Uploaded',
      type: 'document',
      priority: 'low',
      title: 'New Document Available',
      message: 'A new document has been uploaded to your folder. Please review when you get a chance.',
      action_label: 'View Documents',
      action_url: '/files'
    },
    {
      id: 'urgent-alert',
      name: 'Urgent Alert',
      type: 'alert',
      priority: 'urgent',
      title: 'Urgent: Action Required',
      message: 'This is an urgent notification requiring your immediate attention. Please respond as soon as possible.',
      action_label: 'Take Action',
      action_url: '/'
    },
    {
      id: 'meeting-reminder',
      name: 'Meeting Reminder',
      type: 'schedule',
      priority: 'high',
      title: 'Meeting Reminder',
      message: 'You have a scheduled meeting coming up. Please confirm your attendance.',
      action_label: 'View Schedule',
      action_url: '/calendar'
    }
  ];

  const toggleStakeholder = (stakeholderId: string) => {
    setSelectedStakeholders(prev =>
      prev.includes(stakeholderId)
        ? prev.filter(id => id !== stakeholderId)
        : [...prev, stakeholderId]
    );
  };

  const selectAllFiltered = () => {
    const filtered = getFilteredStakeholders();
    const allSelected = filtered.every(s => selectedStakeholders.includes(s.id));
    
    if (allSelected) {
      setSelectedStakeholders(prev =>
        prev.filter(id => !filtered.find(s => s.id === id))
      );
    } else {
      setSelectedStakeholders(prev => [
        ...prev,
        ...filtered.filter(s => !prev.includes(s.id)).map(s => s.id)
      ]);
    }
  };

  const applyTemplate = (template: NotificationTemplate) => {
    setNotificationForm(prev => ({
      ...prev,
      type: template.type,
      priority: template.priority,
      title: template.title,
      message: template.message,
      action_label: template.action_label || '',
      action_url: template.action_url || ''
    }));
    setActiveTab('send');
    toast.success(`Template "${template.name}" applied`);
  };

  const sendNotifications = async () => {
    if (selectedStakeholders.length === 0) {
      toast.error('Please select at least one stakeholder');
      return;
    }

    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      toast.error('Please provide title and message');
      return;
    }

    setSending(true);
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();

      const notifications = selectedStakeholders.map(stakeholderId => ({
        stakeholder_id: stakeholderId,
        type: notificationForm.type,
        priority: notificationForm.priority,
        status: 'unread',
        title: notificationForm.title,
        message: notificationForm.message,
        action_label: notificationForm.action_label || null,
        action_url: notificationForm.action_url || null,
        sender_id: user?.id || null,
        sender_name: user?.email || 'Admin',
        metadata: {
          send_email: notificationForm.send_email,
          send_sms: notificationForm.send_sms,
          scheduled: notificationForm.schedule,
          scheduled_at: notificationForm.scheduled_at || null
        },
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('stakeholder_notifications')
        .insert(notifications);

      if (error) throw error;

      // Log activity for each stakeholder
      const activities = selectedStakeholders.map(stakeholderId => ({
        stakeholder_id: stakeholderId,
        activity_type: 'notification_sent',
        description: `Notification sent: ${notificationForm.title}`,
        metadata: {
          notification_type: notificationForm.type,
          priority: notificationForm.priority
        },
        created_at: new Date().toISOString()
      }));

      // Store activities in localStorage instead of database
      const existingActivities = localStorage.getItem('stakeholder_activities');
      const allActivities = existingActivities ? JSON.parse(existingActivities) : [];
      allActivities.push(...activities);
      localStorage.setItem('stakeholder_activities', JSON.stringify(allActivities));

      toast.success(`Notification sent to ${selectedStakeholders.length} stakeholder(s)`);

      // Reset form
      setNotificationForm({
        type: 'info',
        priority: 'medium',
        title: '',
        message: '',
        action_label: '',
        action_url: '',
        send_email: false,
        send_sms: false,
        schedule: false,
        scheduled_at: ''
      });
      setSelectedStakeholders([]);
    } catch (error: any) {
      console.error('Error sending notifications:', error);
      toast.error('Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  const getFilteredStakeholders = () => {
    return stakeholders.filter(s => {
      if (stakeholderTypeFilter !== 'all' && s.type !== stakeholderTypeFilter) {
        return false;
      }
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  };

  const filteredStakeholders = getFilteredStakeholders();
  const stakeholderTypes = Array.from(new Set(stakeholders.map(s => s.type)));

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#ea580c]/20 rounded-xl">
            <Bell size={24} className="text-[#ea580c]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Notification Manager</h2>
            <p className="text-sm text-gray-400">Send notifications to stakeholders</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pt-4 border-b border-white/10">
        {[
          { id: 'send', label: 'Send Notification', icon: Send },
          { id: 'templates', label: 'Templates', icon: FileText },
          { id: 'history', label: 'History', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-[#ea580c]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ea580c]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Send Tab */}
        {activeTab === 'send' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stakeholder Selection */}
            <div className="lg:col-span-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Select Recipients</h3>
                
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search stakeholders..."
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                    />
                  </div>

                  <select
                    value={stakeholderTypeFilter}
                    onChange={(e) => setStakeholderTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  >
                    <option value="all">All Types</option>
                    {stakeholderTypes.map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={selectAllFiltered}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm"
                  >
                    {filteredStakeholders.every(s => selectedStakeholders.includes(s.id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="text-sm text-gray-400 mb-2">
                  {selectedStakeholders.length} of {filteredStakeholders.length} selected
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredStakeholders.map(stakeholder => (
                    <label
                      key={stakeholder.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStakeholders.includes(stakeholder.id)
                          ? 'bg-[#ea580c]/20 border-[#ea580c]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStakeholders.includes(stakeholder.id)}
                        onChange={() => toggleStakeholder(stakeholder.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#ea580c] focus:ring-[#ea580c]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white">{stakeholder.name}</div>
                        <div className="text-xs text-gray-400 capitalize">
                          {stakeholder.type.replace('_', ' ')}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Notification Form */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Notification Details</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Type</label>
                  <select
                    value={notificationForm.type}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, type: e.target.value as NotificationType }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  >
                    <option value="info">Info</option>
                    <option value="message">Message</option>
                    <option value="task">Task</option>
                    <option value="payment">Payment</option>
                    <option value="schedule">Schedule</option>
                    <option value="document">Document</option>
                    <option value="warning">Warning</option>
                    <option value="alert">Alert</option>
                    <option value="success">Success</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Priority</label>
                  <select
                    value={notificationForm.priority}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, priority: e.target.value as NotificationPriority }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Notification title..."
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Message *</label>
                <textarea
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Notification message..."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Action Button Label</label>
                  <input
                    type="text"
                    value={notificationForm.action_label}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, action_label: e.target.value }))}
                    placeholder="View Details"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Action URL</label>
                  <input
                    type="text"
                    value={notificationForm.action_url}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, action_url: e.target.value }))}
                    placeholder="/tasks"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationForm.send_email}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, send_email: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#ea580c] focus:ring-[#ea580c]"
                  />
                  <Mail size={18} className="text-gray-400" />
                  <span className="text-white">Also send via Email</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationForm.send_sms}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, send_sms: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#ea580c] focus:ring-[#ea580c]"
                  />
                  <Phone size={18} className="text-gray-400" />
                  <span className="text-white">Also send via SMS</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationForm.schedule}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, schedule: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-[#ea580c] focus:ring-[#ea580c]"
                  />
                  <Calendar size={18} className="text-gray-400" />
                  <span className="text-white">Schedule for later</span>
                </label>

                {notificationForm.schedule && (
                  <div className="ml-7">
                    <input
                      type="datetime-local"
                      value={notificationForm.scheduled_at}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={sendNotifications}
                disabled={sending || selectedStakeholders.length === 0}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Send to {selectedStakeholders.length} Recipient(s)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Notification Templates</h3>
              <button className="px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#ea580c]/80 transition-colors flex items-center gap-2">
                <Plus size={18} />
                Create Template
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-white">{template.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded ${
                      template.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                      template.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      template.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {template.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{template.title}</p>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-3">{template.message}</p>
                  <button
                    onClick={() => applyTemplate(template)}
                    className="w-full px-4 py-2 bg-[#ea580c]/20 text-[#ea580c] hover:bg-[#ea580c]/30 rounded-lg transition-colors text-sm font-medium"
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-6">Notification History</h3>
            <div className="text-center py-12 text-gray-400">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>Notification history will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
