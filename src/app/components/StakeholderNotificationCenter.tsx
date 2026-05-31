/**
 * Stakeholder Notification Center
 * 
 * Features:
 * - Real-time notifications for stakeholders
 * - Multiple notification types (info, warning, alert, success)
 * - Priority levels
 * - Mark as read/unread
 * - Filter by type and status
 * - Integration with stakeholder_activity table
 * - Portal integration ready
 * - Admin notification management
 */

import { useState, useEffect } from 'react';
import {
  Bell, X, Check, Clock, AlertCircle, CheckCircle, Info,
  AlertTriangle, MessageSquare, FileText, DollarSign, Calendar,
  Users, Settings, Star, Flag, Eye, EyeOff, Trash2, Archive,
  Filter, Search, ChevronDown, ChevronRight, Mail, Phone,
  Package, Briefcase, TrendingUp, Activity, Zap, Shield, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

type NotificationType = 'info' | 'success' | 'warning' | 'alert' | 'message' | 'task' | 'payment' | 'schedule' | 'document';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
type NotificationStatus = 'unread' | 'read' | 'archived';

interface Notification {
  id: string;
  stakeholder_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  action_label?: string;
  action_url?: string;
  sender_id?: string;
  sender_name?: string;
  metadata?: any;
  created_at: string;
  read_at?: string;
  archived_at?: string;
}

interface StakeholderNotificationCenterProps {
  stakeholderId?: string;
  isPortalView?: boolean; // If true, shows stakeholder view; if false, shows admin view
  onNotificationClick?: (notification: Notification) => void;
}

export default function StakeholderNotificationCenter({
  stakeholderId,
  isPortalView = false,
  onNotificationClick
}: StakeholderNotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);

  useEffect(() => {
    if (stakeholderId) {
      loadNotifications();
    }
  }, [stakeholderId, filter, typeFilter]);

  const loadNotifications = async () => {
    if (!stakeholderId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('stakeholder_notifications')
        .select('*')
        .eq('stakeholder_id', stakeholderId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter === 'unread') {
        query = query.eq('status', 'unread');
      } else if (filter === 'read') {
        query = query.eq('status', 'read');
      } else if (filter === 'archived') {
        query = query.eq('status', 'archived');
      }

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('stakeholder_notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'read', read_at: new Date().toISOString() } : n)
      );

      toast.success('Notification marked as read');
    } catch (error: any) {
      console.error('Error marking as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('stakeholder_notifications')
        .update({
          status: 'unread',
          read_at: null
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'unread', read_at: undefined } : n)
      );

      toast.success('Notification marked as unread');
    } catch (error: any) {
      console.error('Error marking as unread:', error);
      toast.error('Failed to update notification');
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('stakeholder_notifications')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );

      toast.success('Notification archived');
    } catch (error: any) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('stakeholder_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );

      toast.success('Notification deleted');
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const markAllAsRead = async () => {
    if (!stakeholderId) return;

    try {
      const { error } = await supabase
        .from('stakeholder_notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('stakeholder_id', stakeholderId)
        .eq('status', 'unread');

      if (error) throw error;

      loadNotifications();
      toast.success('All notifications marked as read');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'info': return Info;
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'alert': return AlertCircle;
      case 'message': return MessageSquare;
      case 'task': return CheckCircle;
      case 'payment': return DollarSign;
      case 'schedule': return Calendar;
      case 'document': return FileText;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'info': return 'text-blue-400 bg-blue-500/20';
      case 'success': return 'text-green-400 bg-green-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      case 'alert': return 'text-red-400 bg-red-500/20';
      case 'message': return 'text-purple-400 bg-purple-500/20';
      case 'task': return 'text-cyan-400 bg-cyan-500/20';
      case 'payment': return 'text-emerald-400 bg-emerald-500/20';
      case 'schedule': return 'text-orange-400 bg-orange-500/20';
      case 'document': return 'text-indigo-400 bg-indigo-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 border-red-500';
      case 'high': return 'text-orange-400 border-orange-500';
      case 'medium': return 'text-yellow-400 border-yellow-500';
      case 'low': return 'text-gray-400 border-gray-500';
      default: return 'text-gray-400 border-gray-500';
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    if (priority === 'urgent' || priority === 'high') {
      return (
        <span className={`px-2 py-0.5 text-xs font-medium border rounded ${getPriorityColor(priority)}`}>
          {priority.toUpperCase()}
        </span>
      );
    }
    return null;
  };

  const filteredNotifications = notifications.filter(n => {
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !n.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  if (!stakeholderId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Bell size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No stakeholder selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={24} className="text-[#ea580c]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Notifications</h2>
            <p className="text-sm text-gray-400">
              {unreadCount} unread · {notifications.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadNotifications}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-gray-400" />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 text-sm bg-[#ea580c]/20 text-[#ea580c] hover:bg-[#ea580c]/30 rounded-lg transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-[#ea580c]/20 text-[#ea580c]' : 'hover:bg-white/10 text-gray-400'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] text-sm"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] text-sm"
              >
                <option value="all">All Types</option>
                <option value="info">Info</option>
                <option value="message">Message</option>
                <option value="task">Task</option>
                <option value="payment">Payment</option>
                <option value="schedule">Schedule</option>
                <option value="document">Document</option>
                <option value="alert">Alert</option>
                <option value="warning">Warning</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ea580c]"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Bell size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No notifications found</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              const isExpanded = expandedNotification === notification.id;

              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-white/5 transition-colors ${
                    notification.status === 'unread' ? 'bg-white/5 border-l-2 border-[#ea580c]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                      <Icon size={20} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{notification.title}</h3>
                            {getPriorityBadge(notification.priority)}
                          </div>
                          {notification.sender_name && (
                            <p className="text-xs text-gray-400 mb-1">
                              From: {notification.sender_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setExpandedNotification(isExpanded ? null : notification.id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                        {notification.message}
                      </p>

                      {isExpanded && (
                        <div className="space-y-3 mt-3 pt-3 border-t border-white/10">
                          <p className="text-sm text-gray-300">
                            {notification.message}
                          </p>

                          {notification.action_label && notification.action_url && (
                            <button
                              onClick={() => onNotificationClick && onNotificationClick(notification)}
                              className="px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-[#ea580c]/80 transition-colors text-sm font-medium"
                            >
                              {notification.action_label}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock size={14} />
                          {new Date(notification.created_at).toLocaleString()}
                        </div>

                        <div className="flex items-center gap-1">
                          {notification.status === 'unread' ? (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1.5 hover:bg-white/10 rounded transition-colors"
                              title="Mark as read"
                            >
                              <Eye size={16} className="text-gray-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => markAsUnread(notification.id)}
                              className="p-1.5 hover:bg-white/10 rounded transition-colors"
                              title="Mark as unread"
                            >
                              <EyeOff size={16} className="text-gray-400" />
                            </button>
                          )}
                          <button
                            onClick={() => archiveNotification(notification.id)}
                            className="p-1.5 hover:bg-white/10 rounded transition-colors"
                            title="Archive"
                          >
                            <Archive size={16} className="text-gray-400" />
                          </button>
                          {isPortalView === false && (
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1.5 hover:bg-white/10 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} className="text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
