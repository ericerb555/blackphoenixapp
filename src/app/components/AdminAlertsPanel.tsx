/**
 * Admin Alerts Panel
 * 
 * Full-page alert management system with DataTable integration
 * Features:
 * - Comprehensive alert tracking with sorting & pagination
 * - Multiple alert categories (Security, Payment, Users, System, etc.)
 * - Priority levels (Critical, High, Medium, Low)
 * - Action workflows (Approve, Reject, Handle, Dismiss)
 * - Real-time notifications
 * - Search and filtering
 * - Deep orange dark theme
 */

import { useState, useEffect } from 'react';
import {
  AlertCircle, Bell, CheckCircle, Clock, XCircle, AlertTriangle,
  UserPlus, UserX, FileText, CreditCard, Settings, Shield,
  Users, Calendar, DollarSign, TrendingUp, Database, Activity,
  RefreshCw, Archive, Trash2, Eye, Check, X, Filter, Search,
  ArrowRight, Zap, Info, Star, Flag, MessageSquare, Mail,
  ChevronDown, Ban, ThumbsUp, ThumbsDown, AlertOctagon, Home
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from './ui/button/PrimaryButton';
import { DangerButton } from './ui/button/DangerButton';
import { SecondaryButton } from './ui/button/SecondaryButton';
import { DataTable, DataTableColumn } from './ui/table/DataTable';
import { getAdminAlerts, updateAlertStatus, deleteAlert as deleteAdminAlert, type AdminAlert } from '../utils/adminAlerts';

interface AdminAlertsPanelProps {
  onNavigate?: (route: string) => void;
}

export default function AdminAlertsPanel({ onNavigate }: AdminAlertsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent' | 'handled'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<AdminAlert | null>(null);

  // Demo alerts for reference (used when no alerts exist)
  const demoAlerts: AdminAlert[] = [
    // L-SHAPED KITCHEN REMODEL - READY FOR QUOTE CREATION
    {
      id: 'wr-kitchen-2026-005',
      type: 'urgent',
      category: 'Work Requests',
      title: 'NEW: L-Shaped Kitchen Complete Remodel - $42,000',
      description: 'High-priority kitchen renovation request from Michael & Jennifer Rodriguez. Budget: $42,000. Full scope includes custom cabinets, quartz countertops, new appliances, flooring, electrical, and plumbing. 168 sq ft L-shaped layout. AI floor plan already generated. Ready for quote creation.',
      priority: 'critical',
      status: 'unread',
      timestamp: new Date(Date.now() - 2 * 60000), // 2 minutes ago
      source: 'Work Request System',
      userId: 'rodriguez-2026',
      userName: 'Michael and Jennifer Rodriguez',
      actionRequired: true,
      data: {
        workRequestId: 'WR-2026-005',
        requestNumber: 'WR-2026-005',
        serviceType: 'Kitchen Renovation',
        title: 'L-Shaped Kitchen Complete Remodel',
        customerName: 'Michael and Jennifer Rodriguez',
        customerEmail: 'rodriguez.family2026@email.com',
        customerPhone: '(555) 987-6543',
        location: '2847 Maple Grove Lane, Oakville Heights, CA 94582',
        estimatedCost: 42000,
        budgetRange: '$40,000 - $45,000',
        urgency: 'high',
        dimensions: '14ft x 12ft (168 sq ft)',
        hasAIFloorPlan: true,
        description: 'Full L-shaped kitchen renovation for a 14ft x 12ft space with 9ft ceilings. Includes: custom white shaker cabinets with soft-close hinges, quartz countertops (Caesarstone Snow), stainless steel appliances (Bosch/KitchenAid preferred), under-cabinet LED lighting, subway tile backsplash, hardwood flooring, upgraded electrical, new plumbing, recessed lighting, and painting. Modern farmhouse style with brushed nickel hardware.',
        details: [
          'Custom white shaker-style cabinets with soft-close hinges',
          'Quartz countertops (Caesarstone Snow or similar)',
          'New stainless steel appliances (refrigerator, range, microwave, dishwasher)',
          'Under-cabinet LED lighting',
          'White 3x6 subway tile backsplash with grey grout',
          'Red oak hardwood flooring (natural finish)',
          'Upgraded electrical with dedicated circuits',
          'New plumbing for sink and dishwasher',
          '6 recessed lighting cans with dimmers',
          'Painting (Benjamin Moore Simply White)',
          'Apron-front farmhouse sink (33 inch)',
          'Pull-out trash/recycle bins, lazy Susan corner cabinet',
          'Deep drawers for pots/pans, built-in spice rack, crown molding'
        ],
        notes: 'Customers moving out during renovation. Full property access. Energy-efficient appliances required. Waste removal needed for old cabinets and countertops. Gas line relocation may be needed.',
        preferredDate: '2026-04-15',
        timeline: '3-4 weeks'
      }
    },
    // QUOTE APPROVALS - ALL QUOTES GO THROUGH ADMIN ALERTS
    {
      id: 'q1',
      type: 'approval',
      category: 'Quotes',
      title: 'Quote Approval Required - $45,000',
      description: 'Quote #QT-20260314-0001 for ABC Corporation (HVAC Installation) requires admin approval before sending to customer.',
      priority: 'high',
      status: 'unread',
      timestamp: new Date(Date.now() - 10 * 60000),
      source: 'Quote System',
      userId: 'q1',
      userName: 'John Smith',
      actionRequired: true,
      data: { 
        quoteNumber: 'QT-20260314-0001',
        customerName: 'ABC Corporation',
        serviceType: 'HVAC Installation',
        amount: 45000,
        assignedTo: 'Mike Johnson',
        quoteId: 'q1'
      }
    },
    {
      id: 'q2',
      type: 'approval',
      category: 'Quotes',
      title: 'Quote Ready for Review - $125,000',
      description: 'Quote #QT-20260314-0002 for Tech Innovations Inc (Data Center Electrical) completed by Lisa Anderson. High-value quote requires admin review.',
      priority: 'critical',
      status: 'unread',
      timestamp: new Date(Date.now() - 25 * 60000),
      source: 'Quote System',
      userId: 'q3',
      userName: 'Robert Chen',
      actionRequired: true,
      data: { 
        quoteNumber: 'QT-20260314-0002',
        customerName: 'Tech Innovations Inc',
        serviceType: 'Data Center Electrical',
        amount: 125000,
        assignedTo: 'Lisa Anderson',
        quoteId: 'q3'
      }
    },
    {
      id: 'q3',
      type: 'pending',
      category: 'Quotes',
      title: 'Work Request Needs Quote - Kitchen Remodel',
      description: 'Work Request #WR-20260314-0045 from Sarah Johnson requires quote preparation. Estimated value: $15,000.',
      priority: 'high',
      status: 'unread',
      timestamp: new Date(Date.now() - 45 * 60000),
      source: 'Work Request System',
      userId: 'wr001',
      userName: 'Sarah Johnson',
      actionRequired: true,
      data: { 
        requestNumber: 'WR-20260314-0045',
        customerName: 'Sarah Johnson',
        serviceType: 'Kitchen Remodel',
        estimatedValue: 15000,
        location: '456 Oak Street, Anytown'
      }
    },
    {
      id: 'q4',
      type: 'approval',
      category: 'Quotes',
      title: 'Quote Response Received - $8,500',
      description: 'Customer Sarah Williams responded to Quote #QT-20260311-0002 (Bathroom Renovation). Requires review and follow-up.',
      priority: 'medium',
      status: 'unread',
      timestamp: new Date(Date.now() - 90 * 60000),
      source: 'Quote Response System',
      userId: 'qr002',
      userName: 'Sarah Williams',
      actionRequired: true,
      data: { 
        quoteNumber: 'QT-20260311-0002',
        customerName: 'Sarah Williams',
        serviceType: 'Bathroom Renovation',
        amount: 8500,
        responseType: 'Questions',
        responseId: 'QR-002'
      }
    },
    {
      id: 'a1',
      type: 'urgent',
      category: 'Security',
      title: 'Multiple Failed Login Attempts',
      description: 'User account "john.smith@company.com" has 5 failed login attempts in the last 10 minutes from IP 192.168.1.45',
      priority: 'critical',
      status: 'unread',
      timestamp: new Date(Date.now() - 5 * 60000),
      source: 'Security System',
      userId: 'u123',
      userName: 'John Smith',
      actionRequired: true,
      data: { attempts: 5, ip: '192.168.1.45' }
    },
    {
      id: 'a2',
      type: 'urgent',
      category: 'Payment',
      title: 'Payment Processing Failure',
      description: 'Critical: Payment gateway connection failed. 3 transactions pending, total value $12,450.',
      priority: 'critical',
      status: 'unread',
      timestamp: new Date(Date.now() - 15 * 60000),
      source: 'Payment System',
      actionRequired: true,
      data: { pendingTransactions: 3, totalValue: 12450 }
    },
    {
      id: 'a3',
      type: 'approval',
      category: 'Users',
      title: 'New User Registration Pending',
      description: 'Sarah Martinez requesting Administrator access. Company: NewCo Industries',
      priority: 'high',
      status: 'unread',
      timestamp: new Date(Date.now() - 30 * 60000),
      source: 'User Management',
      userId: 'u456',
      userName: 'Sarah Martinez',
      actionRequired: true,
      data: { email: 'sarah.martinez@newcompany.com', requestedRole: 'Administrator' }
    },
    {
      id: 'a4',
      type: 'approval',
      category: 'Financial',
      title: 'Large Invoice Approval Required',
      description: 'Invoice #INV-2024-1892 for $24,500 requires executive approval. Client: Acme Corporation',
      priority: 'high',
      status: 'unread',
      timestamp: new Date(Date.now() - 60 * 60000),
      source: 'Billing System',
      actionRequired: true,
      data: { invoiceId: 'INV-2024-1892', amount: 24500, client: 'Acme Corporation' }
    },
    {
      id: 'a5',
      type: 'error',
      category: 'System',
      title: 'Database Backup Failed',
      description: 'Automated backup failed at 2:00 AM. Last successful backup was 48 hours ago.',
      priority: 'critical',
      status: 'unread',
      timestamp: new Date(Date.now() - 360 * 60000),
      source: 'Backup System',
      actionRequired: true,
      data: { lastBackup: new Date(Date.now() - 48 * 3600000), dbSize: '2.4 GB' }
    },
    {
      id: 'a6',
      type: 'warning',
      category: 'System',
      title: 'High Server Load Detected',
      description: 'Server CPU usage at 85% for past 20 minutes. Consider scaling.',
      priority: 'medium',
      status: 'unread',
      timestamp: new Date(Date.now() - 120 * 60000),
      source: 'Monitoring System',
      actionRequired: false,
      data: { cpuUsage: 85, duration: '20 minutes' }
    },
    {
      id: 'a7',
      type: 'info',
      category: 'Users',
      title: 'New Customer Signup',
      description: '10 new customers signed up in the last hour. Welcome emails sent.',
      priority: 'low',
      status: 'read',
      timestamp: new Date(Date.now() - 180 * 60000),
      source: 'User Management',
      actionRequired: false,
      data: { newUsers: 10 }
    },
    {
      id: 'a8',
      type: 'approval',
      category: 'Projects',
      title: 'Project Extension Request',
      description: 'Project "Downtown Renovation" requesting 2-week extension and $5,000 additional budget.',
      priority: 'high',
      status: 'unread',
      timestamp: new Date(Date.now() - 240 * 60000),
      source: 'Project Management',
      actionRequired: true,
      data: { project: 'Downtown Renovation', extension: '2 weeks', additionalBudget: 5000 }
    },
    {
      id: 'a9',
      type: 'warning',
      category: 'Payment',
      title: 'Subscription Renewal Failing',
      description: '3 subscription renewals failed due to expired credit cards. Auto-retry scheduled.',
      priority: 'medium',
      status: 'read',
      timestamp: new Date(Date.now() - 480 * 60000),
      source: 'Subscription System',
      actionRequired: false,
      data: { failedRenewals: 3 }
    },
    {
      id: 'a10',
      type: 'info',
      category: 'Reports',
      title: 'Weekly Report Generated',
      description: 'Weekly performance report for Jan 15-21 is ready for review.',
      priority: 'low',
      status: 'handled',
      timestamp: new Date(Date.now() - 1440 * 60000),
      source: 'Reporting System',
      actionRequired: false,
      data: { reportId: 'RPT-2024-03', period: 'Jan 15-21' }
    }
  ];

  // Load alerts from localStorage
  const loadAlerts = () => {
    const loadedAlerts = getAdminAlerts().map(alert => ({
      ...alert,
      timestamp: new Date(alert.timestamp)
    }));

    // Add demo alerts if no alerts exist
    if (loadedAlerts.length === 0) {
      return demoAlerts;
    }

    return loadedAlerts;
  };

  const [alerts, setAlerts] = useState<AdminAlert[]>(loadAlerts());

  // Listen for real-time alert updates
  useEffect(() => {
    const handleAlertAdded = () => {
      setAlerts(loadAlerts());
      toast.success('New admin alert received');
    };

    const handleAlertsUpdated = () => {
      setAlerts(loadAlerts());
    };

    window.addEventListener('admin-alert-added', handleAlertAdded);
    window.addEventListener('admin-alerts-updated', handleAlertsUpdated);

    return () => {
      window.removeEventListener('admin-alert-added', handleAlertAdded);
      window.removeEventListener('admin-alerts-updated', handleAlertsUpdated);
    };
  }, []);

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    // Status filter
    if (activeFilter === 'unread' && alert.status !== 'unread') return false;
    if (activeFilter === 'urgent' && alert.type !== 'urgent') return false;
    if (activeFilter === 'handled' && alert.status !== 'handled') return false;

    // Category filter
    if (selectedCategory !== 'all' && alert.category !== selectedCategory) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        alert.title.toLowerCase().includes(search) ||
        alert.description.toLowerCase().includes(search) ||
        alert.category.toLowerCase().includes(search) ||
        alert.source.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(alerts.map(a => a.category)))];

  // Alert statistics
  const stats = {
    total: alerts.length,
    unread: alerts.filter(a => a.status === 'unread').length,
    urgent: alerts.filter(a => a.type === 'urgent').length,
    critical: alerts.filter(a => a.priority === 'critical').length,
    actionRequired: alerts.filter(a => a.actionRequired && a.status === 'unread').length
  };

  // Handle alert actions
  const handleApprove = (alertId: string) => {
    updateAlertStatus(alertId, 'handled');
    setAlerts(loadAlerts());
    toast.success('Alert approved successfully');
    setSelectedAlert(null);
  };

  const handleReject = (alertId: string) => {
    updateAlertStatus(alertId, 'dismissed');
    setAlerts(loadAlerts());
    toast.error('Alert rejected');
    setSelectedAlert(null);
  };

  const handleMarkAsRead = (alertId: string) => {
    updateAlertStatus(alertId, 'read');
    setAlerts(loadAlerts());
  };

  const handleDelete = (alertId: string) => {
    deleteAdminAlert(alertId);
    setAlerts(loadAlerts());
    toast.success('Alert deleted');
    setSelectedAlert(null);
  };

  const handleRefresh = () => {
    setAlerts(loadAlerts());
    toast.success('Alerts refreshed');
  };

  // Navigate to the appropriate section based on alert category
  const navigateToAlertSource = (alert: AdminAlert) => {
    if (!onNavigate) {
      toast.info('Navigation not available');
      return;
    }

    // Map categories to their respective pages/sections
    switch (alert.category) {
      case 'Work Requests':
        // Navigate to unified project pipeline (single-page workflow)
        onNavigate('unified-project-pipeline');
        break;
      
      case 'Quotes':
        // Navigate to unified project pipeline
        onNavigate('unified-project-pipeline');
        break;
      
      case 'Payment':
      case 'Financial':
        // Navigate to unified payment center (financial management)
        onNavigate('unified-payment-center');
        break;

      case 'Security':
        // Navigate to settings
        onNavigate('settings');
        break;

      case 'Users':
        // Navigate to user management
        onNavigate('user-management');
        break;

      case 'System':
        // Navigate to settings
        onNavigate('settings');
        break;
      
      case 'Projects':
        // Navigate to projects
        onNavigate('projects');
        break;
      
      case 'Reports':
        // Navigate to reports
        onNavigate('reports');
        break;
      
      default:
        toast.info(`Opening ${alert.category} section...`);
        onNavigate('unified-dashboard');
    }

    toast.success(`Opening in ${alert.category}`, {
      description: alert.title
    });
    setSelectedAlert(null);
  };

  // Get icon for alert type
  const getTypeIcon = (type: AdminAlert['type']) => {
    switch (type) {
      case 'urgent': return <AlertOctagon className="w-5 h-5" />;
      case 'approval': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      case 'pending': return <Clock className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  // Get color for priority
  const getPriorityColor = (priority: AdminAlert['priority']) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/20';
    }
  };

  // DataTable columns
  const columns: DataTableColumn<AdminAlert>[] = [
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      width: '80px',
      render: (alert) => (
        <div className={`flex items-center justify-center ${
          alert.type === 'urgent' ? 'text-red-400' :
          alert.type === 'approval' ? 'text-green-400' :
          alert.type === 'error' ? 'text-red-400' :
          alert.type === 'warning' ? 'text-yellow-400' :
          'text-blue-400'
        }`}>
          {getTypeIcon(alert.type)}
        </div>
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      sortFn: (a, b) => {
        const priority = { critical: 0, high: 1, medium: 2, low: 3 };
        return priority[a.priority] - priority[b.priority];
      },
      render: (alert) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold uppercase ${getPriorityColor(alert.priority)}`}>
          {alert.priority}
        </span>
      )
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (alert) => (
        <span className="text-gray-300">{alert.category}</span>
      )
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (alert) => (
        <div>
          <div className="font-semibold text-white">{alert.title}</div>
          <div className="text-sm text-gray-400 truncate max-w-md">{alert.description}</div>
        </div>
      )
    },
    {
      key: 'source',
      header: 'Source',
      sortable: true,
      render: (alert) => (
        <span className="text-gray-400 text-sm">{alert.source}</span>
      )
    },
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      sortFn: (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      render: (alert) => {
        const minutesAgo = Math.floor((Date.now() - alert.timestamp.getTime()) / 60000);
        const hoursAgo = Math.floor(minutesAgo / 60);
        const daysAgo = Math.floor(hoursAgo / 24);
        
        let timeText = '';
        if (daysAgo > 0) timeText = `${daysAgo}d ago`;
        else if (hoursAgo > 0) timeText = `${hoursAgo}h ago`;
        else timeText = `${minutesAgo}m ago`;

        return <span className="text-gray-400 text-sm">{timeText}</span>;
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (alert) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
          alert.status === 'unread' ? 'bg-orange-600/20 text-orange-400' :
          alert.status === 'read' ? 'bg-blue-600/20 text-blue-400' :
          alert.status === 'handled' ? 'bg-green-600/20 text-green-400' :
          'bg-gray-600/20 text-gray-400'
        }`}>
          {alert.status}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (alert) => (
        <div className="flex items-center justify-end gap-2">
          {alert.actionRequired && alert.status === 'unread' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(alert.id);
                }}
                className="p-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition"
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(alert.id);
                }}
                className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {alert.status === 'unread' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMarkAsRead(alert.id);
              }}
              className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition"
              title="Mark as Read"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(alert.id);
            }}
            className="p-1.5 rounded-lg bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 transition"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Bell className="w-8 h-8 text-orange-600" />
              <h1 className="text-4xl font-bold">Admin Alerts & Tracking</h1>
            </div>
            <p className="text-gray-400">Monitor and manage all system alerts, approvals, and notifications</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate?.('admin-dashboard')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] transition"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Alerts</span>
              <Bell className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-3xl font-bold">{stats.total}</div>
          </div>

          <div className="bg-[#1A1A1A] border border-orange-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-400 text-sm">Unread</span>
              <AlertCircle className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-3xl font-bold text-orange-400">{stats.unread}</div>
          </div>

          <div className="bg-[#1A1A1A] border border-red-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 text-sm">Urgent</span>
              <AlertOctagon className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-400">{stats.urgent}</div>
          </div>

          <div className="bg-[#1A1A1A] border border-red-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 text-sm">Critical</span>
              <Zap className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-400">{stats.critical}</div>
          </div>

          <div className="bg-[#1A1A1A] border border-yellow-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-400 text-sm">Action Required</span>
              <Flag className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-yellow-400">{stats.actionRequired}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-1">
            {(['all', 'unread', 'urgent', 'handled'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeFilter === filter
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Alerts Table */}
      <DataTable
        columns={columns}
        data={filteredAlerts}
        defaultSort={{ key: 'timestamp', direction: 'desc' }}
        pagination={true}
        pageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
        emptyMessage="No alerts found"
        onRowClick={(alert) => setSelectedAlert(alert)}
        rowClassName={(alert) => 
          alert.status === 'unread' ? 'bg-[#1A1A1A]' : ''
        }
      />

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-8">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`${
                  selectedAlert.type === 'urgent' ? 'text-red-400' :
                  selectedAlert.type === 'approval' ? 'text-green-400' :
                  selectedAlert.type === 'error' ? 'text-red-400' :
                  selectedAlert.type === 'warning' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  {getTypeIcon(selectedAlert.type)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedAlert.title}</h2>
                  <p className="text-gray-400 text-sm">{selectedAlert.source}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-gray-400 text-sm">Description</label>
                <p className="text-white mt-1">{selectedAlert.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Priority</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getPriorityColor(selectedAlert.priority)}`}>
                      {selectedAlert.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Category</label>
                  <p className="text-white mt-1">{selectedAlert.category}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Status</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      selectedAlert.status === 'unread' ? 'bg-orange-600/20 text-orange-400' :
                      selectedAlert.status === 'read' ? 'bg-blue-600/20 text-blue-400' :
                      selectedAlert.status === 'handled' ? 'bg-green-600/20 text-green-400' :
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {selectedAlert.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedAlert.userName && (
                <div>
                  <label className="text-gray-400 text-sm">User</label>
                  <p className="text-white mt-1">{selectedAlert.userName}</p>
                </div>
              )}

              {selectedAlert.data && (
                <div>
                  <label className="text-gray-400 text-sm">Additional Details</label>
                  <pre className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 mt-1 text-sm text-gray-300 overflow-x-auto">
                    {JSON.stringify(selectedAlert.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              {/* Universal "Open in [Section]" button - appears for ALL alerts */}
              <SecondaryButton 
                onClick={() => navigateToAlertSource(selectedAlert)}
                icon={<ArrowRight />}
              >
                Open in {selectedAlert.category}
              </SecondaryButton>

              {selectedAlert.actionRequired && selectedAlert.status === 'unread' && (
                <>
                  <DangerButton
                    onClick={() => handleReject(selectedAlert.id)}
                    icon={<X />}
                  >
                    Reject
                  </DangerButton>
                  
                  <PrimaryButton
                    onClick={() => handleApprove(selectedAlert.id)}
                    icon={<Check />}
                  >
                    Approve
                  </PrimaryButton>
                </>
              )}
              
              {selectedAlert.status === 'unread' && !selectedAlert.actionRequired && (
                <PrimaryButton
                  onClick={() => handleMarkAsRead(selectedAlert.id)}
                  icon={<Eye />}
                >
                  Mark as Read
                </PrimaryButton>
              )}
              <SecondaryButton onClick={() => setSelectedAlert(null)}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}