/**
 * Stakeholder Audit Log Viewer
 * Day 7: Complete audit trail system
 * 
 * Features:
 * - System-wide audit log
 * - User action tracking
 * - Permission changes
 * - Data modifications
 * - Security events
 * - Export capabilities
 * - Advanced filtering
 */

import { useState, useEffect } from 'react';
import {
  Shield, Eye, Clock, User, FileText, Settings, AlertTriangle,
  CheckCircle, XCircle, Edit, Trash2, Plus, Download, Filter,
  Search, Calendar, RefreshCw, Database, Lock, Unlock, Key,
  Users, Bell, Mail, Phone, Activity, TrendingUp, ChevronDown,
  ChevronRight, ExternalLink, Copy
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

type AuditEventType =
  | 'stakeholder_created'
  | 'stakeholder_updated'
  | 'stakeholder_deleted'
  | 'permission_granted'
  | 'permission_revoked'
  | 'notification_sent'
  | 'file_uploaded'
  | 'file_deleted'
  | 'portal_accessed'
  | 'portal_login'
  | 'portal_logout'
  | 'data_exported'
  | 'settings_changed'
  | 'user_invited'
  | 'user_removed'
  | 'security_event';

type AuditSeverity = 'info' | 'warning' | 'critical';

interface AuditLog {
  id: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  target_type: string;
  target_id: string;
  target_name: string;
  action_description: string;
  changes: any;
  metadata: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export default function StakeholderAuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, [eventTypeFilter, severityFilter, dateRange]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();

      let query = supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(500);

      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data, error } = await query;

      if (error) {
        // If table doesn't exist, create mock data for demonstration
        console.log('Audit logs table not found, using activity data');
        await loadFromActivity();
        return;
      }

      setLogs(data || []);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      await loadFromActivity();
    } finally {
      setLoading(false);
    }
  };

  const loadFromActivity = async () => {
    try {
      const dateFilter = getDateFilter();

      const { data } = await supabase
        .from('stakeholder_activity')
        .select(`
          *,
          stakeholders!inner(
            id,
            name,
            type,
            email
          )
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(200);

      // Convert activity to audit log format
      const auditLogs: AuditLog[] = (data || []).map((activity: any) => ({
        id: activity.id,
        event_type: mapActivityTypeToEventType(activity.activity_type),
        severity: getSeverityForActivity(activity.activity_type),
        actor_id: activity.stakeholder_id,
        actor_name: activity.stakeholders?.name || 'Unknown',
        actor_email: activity.stakeholders?.email || '',
        target_type: 'stakeholder',
        target_id: activity.stakeholder_id,
        target_name: activity.stakeholders?.name || 'Unknown',
        action_description: activity.description || activity.activity_type,
        changes: activity.metadata || {},
        metadata: activity.metadata || {},
        ip_address: '0.0.0.0',
        user_agent: 'Unknown',
        created_at: activity.created_at
      }));

      setLogs(auditLogs);
    } catch (error) {
      console.error('Error loading from activity:', error);
      setLogs([]);
    }
  };

  const mapActivityTypeToEventType = (activityType: string): AuditEventType => {
    const mapping: { [key: string]: AuditEventType } = {
      'portal_login': 'portal_login',
      'portal_logout': 'portal_logout',
      'notification_received': 'notification_sent',
      'file_accessed': 'portal_accessed',
      'file_uploaded': 'file_uploaded',
      'permission_changed': 'permission_granted',
      'profile_updated': 'stakeholder_updated'
    };
    return mapping[activityType] || 'portal_accessed';
  };

  const getSeverityForActivity = (activityType: string): AuditSeverity => {
    const critical = ['permission_changed', 'stakeholder_deleted', 'user_removed'];
    const warning = ['file_deleted', 'permission_revoked', 'security_event'];
    
    if (critical.includes(activityType)) return 'critical';
    if (warning.includes(activityType)) return 'warning';
    return 'info';
  };

  const getEventIcon = (eventType: AuditEventType) => {
    const iconMap: { [key: string]: any } = {
      'stakeholder_created': Plus,
      'stakeholder_updated': Edit,
      'stakeholder_deleted': Trash2,
      'permission_granted': Key,
      'permission_revoked': Lock,
      'notification_sent': Bell,
      'file_uploaded': FileText,
      'file_deleted': Trash2,
      'portal_accessed': Eye,
      'portal_login': User,
      'portal_logout': User,
      'data_exported': Download,
      'settings_changed': Settings,
      'user_invited': Users,
      'user_removed': XCircle,
      'security_event': AlertTriangle
    };
    return iconMap[eventType] || Activity;
  };

  const getSeverityColor = (severity: AuditSeverity) => {
    const colorMap: { [key: string]: string } = {
      'info': 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      'warning': 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
      'critical': 'text-red-400 bg-red-500/20 border-red-500/30'
    };
    return colorMap[severity] || colorMap['info'];
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Event Type', 'Severity', 'Actor', 'Action', 'Target'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.event_type,
        log.severity,
        log.actor_name,
        log.action_description,
        log.target_name
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${Date.now()}.csv`;
    a.click();
    toast.success('Audit log exported');
  };

  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.actor_name.toLowerCase().includes(query) ||
        log.action_description.toLowerCase().includes(query) ||
        log.target_name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const eventTypes = Array.from(new Set(logs.map(l => l.event_type)));
  const severities = Array.from(new Set(logs.map(l => l.severity)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield size={32} className="text-[#ea580c]" />
            Audit Log Viewer
          </h1>
          <p className="text-gray-400">Complete system audit trail and security monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
          <button
            onClick={loadAuditLogs}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: logs.length.toLocaleString(), icon: Activity, severity: 'info' },
          {
            label: 'Critical Events',
            value: logs.filter(l => l.severity === 'critical').length.toLocaleString(),
            icon: AlertTriangle,
            severity: 'critical'
          },
          {
            label: 'Warnings',
            value: logs.filter(l => l.severity === 'warning').length.toLocaleString(),
            icon: AlertTriangle,
            severity: 'warning'
          },
          {
            label: 'Information',
            value: logs.filter(l => l.severity === 'info').length.toLocaleString(),
            icon: CheckCircle,
            severity: 'info'
          }
        ].map((stat, i) => {
          const Icon = stat.icon;
          const colorClass = getSeverityColor(stat.severity as AuditSeverity);
          return (
            <div key={i} className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
              <div className={`inline-flex p-3 rounded-xl mb-4 ${colorClass}`}>
                <Icon size={24} />
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit logs..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              showFilters ? 'bg-[#ea580c]/20 text-[#ea580c]' : 'bg-white/5 text-gray-400'
            }`}
          >
            <Filter size={18} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-white/10">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Event Type</label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] text-sm"
              >
                <option value="all">All Events</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] text-sm"
              >
                <option value="all">All Severities</option>
                {severities.map(severity => (
                  <option key={severity} value={severity}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea580c] text-sm"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log List */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        <div className="divide-y divide-white/10 max-h-[800px] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ea580c] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center">
              <Shield size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">No audit logs found</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const Icon = getEventIcon(log.event_type);
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getSeverityColor(log.severity)}`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-white">{log.action_description}</p>
                          <p className="text-sm text-gray-400 mt-1">
                            by <span className="text-white">{log.actor_name}</span>
                            {log.actor_email && <span className="text-gray-500"> ({log.actor_email})</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                          </span>
                          <button
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database size={12} />
                          {log.event_type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400 mb-1">Event ID</p>
                              <p className="text-white font-mono text-xs">{log.id}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Target</p>
                              <p className="text-white">{log.target_name}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">IP Address</p>
                              <p className="text-white font-mono text-xs">{log.ip_address}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">User Agent</p>
                              <p className="text-white text-xs truncate">{log.user_agent}</p>
                            </div>
                          </div>

                          {Object.keys(log.changes || {}).length > 0 && (
                            <div>
                              <p className="text-gray-400 mb-2 text-sm">Changes</p>
                              <div className="p-3 bg-white/5 rounded-lg">
                                <pre className="text-xs text-gray-300 overflow-x-auto">
                                  {JSON.stringify(log.changes, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
