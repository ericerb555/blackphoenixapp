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
import { getAdminAlerts, addAdminAlert, updateAlertStatus, deleteAlert as deleteAdminAlert, type AdminAlert } from '../utils/adminAlerts';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface AdminAlertsPanelProps {
  onNavigate?: (route: string) => void;
}

export default function AdminAlertsPanel({ onNavigate }: AdminAlertsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent' | 'handled'>('all');
  const [openingPipeline, setOpeningPipeline] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<AdminAlert | null>(null);
  const [activePane, setActivePane] = useState<'work-requests' | 'applications' | 'system'>('work-requests');
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [systemFilter, setSystemFilter] = useState<'all' | 'Errors' | 'Payments' | 'Security' | 'Follow-ups' | 'Reviews'>('all');

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

  // Deduplicate existing localStorage alerts on first load (removes duplicates from previous bug)
  const deduplicatedAlerts = (() => {
    const raw = loadAlerts();
    const seen = new Set<string>();
    return raw.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  })();
  if (deduplicatedAlerts.length !== loadAlerts().length) {
    localStorage.setItem('admin_alerts', JSON.stringify(deduplicatedAlerts));
  }
  const [alerts, setAlerts] = useState<AdminAlert[]>(deduplicatedAlerts);

  // Fetch alerts from server (cross-device — catches work requests from customers)
  useEffect(() => {
    const fetchServerAlerts = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || publicAnonKey;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/notifications/admin-alerts`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const serverAlerts: AdminAlert[] = (data.alerts || []).map((a: any) => ({
            ...a,
            timestamp: new Date(a.timestamp || a.created_at || Date.now()),
            type: a.type || 'info',
            priority: a.priority || 'medium',
            status: a.status || 'unread',
            actionRequired: a.actionRequired ?? true,
            source: a.source || 'server',
          }));

          if (serverAlerts.length > 0) {
            // Merge server alerts with local ones (avoid duplicates by id)
            const local = getAdminAlerts();
            const localIds = new Set(local.map(a => a.id));
            const newFromServer = serverAlerts.filter(a => !localIds.has(a.id));
            newFromServer.forEach(a => addAdminAlert({
              type: a.type, category: a.category, title: a.title,
              description: a.description, priority: a.priority,
              source: a.source, actionRequired: a.actionRequired, data: a.data,
            }));
            if (newFromServer.length > 0) {
              setAlerts(loadAlerts());
              toast.success(`${newFromServer.length} new alert${newFromServer.length > 1 ? 's' : ''} from work requests`);
            } else {
              setAlerts(serverAlerts.length > 0 ? serverAlerts : loadAlerts());
            }
          }
        }
      } catch (e) {
        console.warn('[AdminAlertsPanel] Server fetch failed, using local only');
      }
    };

    // Pull work requests — tries server first, then reads KV store directly as fallback
    const fetchWorkRequests = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || publicAnonKey;

        let all: any[] = [];

        // Try server endpoint
        try {
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            const data = await res.json();
            all = Array.isArray(data) ? data : (data.workRequests || []);
          }
        } catch {}

        // Fallback: read directly from Supabase KV table — data is ALWAYS here
        if (all.length === 0) {
          try {
            const { data: kvData } = await supabase
              .from('kv_store_57095a78')
              .select('value')
              .eq('key', 'all_work_requests')
              .single();
            if (kvData?.value && Array.isArray(kvData.value)) {
              all = kvData.value;
            }
          } catch {}
        }

        if (all.length > 0) {

          // Read existing alerts and deduplicate by stable ID (wr_alert_<workRequestId>)
          const existingRaw = localStorage.getItem('admin_alerts');
          const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
          const existingIds = new Set(existing.map((a: any) => a.id));

          let added = 0;
          all.forEach((wr: any) => {
            const alertId = `wr_alert_${wr.id}`; // stable, deterministic ID
            if (existingIds.has(alertId)) return; // already present — skip

            const clientName = wr.client_name || wr.client_info?.name || wr.clientName || 'Customer';
            const clientEmail = wr.client_email || wr.client_info?.email || wr.clientEmail || '';
            const newAlert = {
              id: alertId, // use the stable ID so duplicates are detected next time
              type: 'urgent',
              category: 'Work Requests',
              title: `New Work Request: ${clientName}`,
              description: `${clientName} (${clientEmail}) submitted a ${wr.serviceType || wr.project_type || 'service'} request.`,
              priority: 'high',
              status: 'unread',
              source: 'work-request-form',
              actionRequired: true,
              timestamp: new Date(wr.created_at || Date.now()),
              data: {
                workRequestId: wr.id,
                clientName,
                clientEmail,
                clientPhone: wr.client_phone || wr.client_info?.phone || '',
                serviceType: wr.serviceType || wr.project_type,
                budgetRange: wr.budget_range
                  ? `$${(wr.budget_range.min || 0).toLocaleString()}–$${(wr.budget_range.max || 0).toLocaleString()}`
                  : '',
              },
            };
            existing.unshift(newAlert);
            existingIds.add(alertId);
            added++;
          });

          if (added > 0) {
            localStorage.setItem('admin_alerts', JSON.stringify(existing.slice(0, 100)));
            setAlerts(loadAlerts());
          }
        }
      } catch {}
    };

    fetchServerAlerts();
    fetchWorkRequests();

    // Also re-fetch every 30 seconds while panel is open
    const interval = setInterval(() => { fetchServerAlerts(); fetchWorkRequests(); }, 30000);

    const handleAlertAdded = () => {
      setAlerts(loadAlerts());
      toast.success('New admin alert received');
    };
    const handleAlertsUpdated = () => setAlerts(loadAlerts());

    window.addEventListener('admin-alert-added', handleAlertAdded);
    window.addEventListener('admin-alerts-updated', handleAlertsUpdated);

    return () => {
      clearInterval(interval);
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

  // Open a work request in the pipeline — generates the quote if not done yet, then navigates
  const openInPipeline = async (alert: AdminAlert) => {
    const d = alert.data || {};
    const wrId = (d.workRequestId || alert.id || '').replace(/[^\w\-]/g, '_');
    setOpeningPipeline(alert.id);
    toast.loading('Opening in pipeline...', { id: 'pipeline-open' });

    // Build a basic pipeline item immediately from alert data so navigation
    // always succeeds — server calls below are best-effort enhancements only.
    const clientName  = d.clientName  || 'Customer';
    const clientEmail = d.clientEmail || '';
    const clientPhone = d.clientPhone || '';
    const serviceType = d.serviceType || 'General Service';
    const title       = `${serviceType} — ${clientName}`;

    const baseItem: any = {
      id: wrId,
      itemNumber: wrId.toUpperCase(),
      stage: 'quote-draft',
      customerName: clientName,
      customerEmail: clientEmail,
      customerPhone: clientPhone,
      serviceType,
      title,
      description: alert.description || '',
      estimatedValue: 0,
      priority: 'high',
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    // ── Best-effort server enrichment (each step fails silently) ─────────
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

      // 1. Try to fetch full work request
      let wr: any = null;
      try {
        const wrRes = await fetch(
          `${SERVER}/work-requests?email=${encodeURIComponent(clientEmail)}`,
          { headers, signal: AbortSignal.timeout(8000) }
        );
        if (wrRes.ok) {
          const wrData = await wrRes.json();
          const all = Array.isArray(wrData) ? wrData : (wrData.workRequests || []);
          wr = all.find((r: any) => r.id === wrId) || null;
          if (wr) {
            baseItem.description = wr.description || baseItem.description;
            baseItem.estimatedValue = wr.budget_range?.max || wr.budget_range?.min || 0;
            baseItem.location = wr.site_address || wr.city || '';
            baseItem.workRequest = wr;
          }
        }
      } catch { /* skip */ }

      // 2. Try to generate quote
      try {
        const quoteRes = await fetch(`${SERVER}/auto-generate-quote`, {
          method: 'POST', headers,
          body: JSON.stringify({ workRequest: {
            id: wrId, title, serviceType,
            estimatedValue: baseItem.estimatedValue,
            blueprintAnalysis: wr?.aiVideoAnalysis || null,
          }}),
          signal: AbortSignal.timeout(15000),
        });
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json();
          baseItem.quote = {
            id: `qt-${wrId}`,
            quoteNumber: `Q-${new Date().getFullYear()}-001`,
            materials: quoteData.materialItems || [],
            labor: quoteData.laborItems || [],
            processSteps: quoteData.processSteps || [],
            materialsSubtotal: quoteData.subtotals?.materials || 0,
            laborSubtotal: quoteData.subtotals?.labor || 0,
            taxRate: 0.08,
            taxAmount: quoteData.subtotals?.tax || 0,
            totalCost: quoteData.total || 0,
            generatedAt: new Date().toISOString(),
            approvalStatus: 'pending',
          };
          baseItem.estimatedValue = quoteData.total || baseItem.estimatedValue;
        }
      } catch { /* skip */ }

      // 3. Try server KV save (fire-and-forget)
      fetch(`${SERVER}/kv/set`, {
        method: 'POST', headers,
        body: JSON.stringify({ key: `pipeline_${wrId}`, value: baseItem }),
      }).catch(() => {});

    } catch { /* all server calls optional */ }

    // ── Always save to localStorage and navigate ─────────────────────────
    try {
      const cached = JSON.parse(localStorage.getItem('pipeline-items-demo') || '[]');
      const without = cached.filter((i: any) => i.id !== wrId);
      localStorage.setItem('pipeline-items-demo', JSON.stringify([baseItem, ...without]));
      localStorage.setItem('pipeline_open_item', wrId);
    } catch { /* storage quota — ignore */ }

    updateAlertStatus(alert.id, 'read');
    toast.success('Opening in pipeline...', { id: 'pipeline-open' });
    setOpeningPipeline(null);

    if (onNavigate) {
      onNavigate('unified-project-pipeline');
    } else {
      window.location.href = '/unified-project-pipeline';
    }
  };

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

  // ── Pane-level derived data ────────────────────────────────────────────────
  const wrAlerts = alerts.filter(a => a.category === 'Work Requests');
  const wrUnread = wrAlerts.filter(a => a.status !== 'handled').length;

  const appAlerts = alerts.filter(a => a.category === 'Applications');
  const appUnread = appAlerts.filter(a => a.status !== 'handled').length;

  const sysAlerts = alerts.filter(a => a.category !== 'Work Requests' && a.category !== 'Applications');
  const sysUnread = sysAlerts.filter(a => a.status !== 'handled').length;

  const today = new Date().toDateString();
  const wrHandledToday = wrAlerts.filter(a => a.status === 'handled' && a.timestamp && new Date(a.timestamp).toDateString() === today).length;
  const appApprovedToday = appAlerts.filter(a => a.status === 'handled' && a.timestamp && new Date(a.timestamp).toDateString() === today).length;
  const sysCritical = sysAlerts.filter(a => a.priority === 'critical').length;
  const sysErrors = sysAlerts.filter(a => a.type === 'error').length;
  const sysResolved = sysAlerts.filter(a => a.status === 'handled').length;

  const filteredWR = wrAlerts.filter(a =>
    !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.data?.clientName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredApp = appAlerts.filter(a =>
    !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.userName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredSys = sysAlerts.filter(a => {
    const matchesSearch = !searchTerm || a.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = systemFilter === 'all' || a.category === systemFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden w-full max-w-full">
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-6 lg:px-8 pt-4 pb-3 border-b border-[#2A2A2A]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <h1 className="text-lg sm:text-2xl font-bold">Admin Alerts</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm w-48"
              />
            </div>
            <button
              onClick={() => onNavigate?.('admin-dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] transition text-sm"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 transition text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
        {/* Mobile search */}
        <div className="mt-2 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#0A0A0A] border-b border-[#2A2A2A]">
        <div className="grid grid-cols-3 w-full">
          {/* Tab 1 — Work Requests */}
          <button
            onClick={() => setActivePane('work-requests')}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-3 sm:py-4 transition border-b-2 ${
              activePane === 'work-requests'
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-transparent bg-[#111] hover:bg-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl">🚨</span>
              <span className={`font-bold text-sm sm:text-base ${activePane === 'work-requests' ? 'text-orange-400' : 'text-gray-300'}`}>
                Work Requests
              </span>
              {wrUnread > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activePane === 'work-requests' ? 'bg-orange-500 text-white' : 'bg-orange-500/30 text-orange-400'
                }`}>{wrUnread}</span>
              )}
            </div>
            <span className="text-[10px] text-gray-500 hidden sm:block">Action required</span>
          </button>

          {/* Tab 2 — Applications */}
          <button
            onClick={() => setActivePane('applications')}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-3 sm:py-4 transition border-b-2 border-l border-r border-l-[#2A2A2A] border-r-[#2A2A2A] ${
              activePane === 'applications'
                ? 'border-b-green-500 bg-green-500/10'
                : 'border-b-transparent bg-[#111] hover:bg-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl">👤</span>
              <span className={`font-bold text-sm sm:text-base ${activePane === 'applications' ? 'text-green-400' : 'text-gray-300'}`}>
                Applications
              </span>
              {appUnread > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activePane === 'applications' ? 'bg-green-500 text-white' : 'bg-green-500/30 text-green-400'
                }`}>{appUnread}</span>
              )}
            </div>
            <span className="text-[10px] text-gray-500 hidden sm:block">Vendors · Subs · Advertisers</span>
          </button>

          {/* Tab 3 — System */}
          <button
            onClick={() => setActivePane('system')}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-3 sm:py-4 transition border-b-2 ${
              activePane === 'system'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-transparent bg-[#111] hover:bg-[#1A1A1A]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl">⚙️</span>
              <span className={`font-bold text-sm sm:text-base ${activePane === 'system' ? 'text-blue-400' : 'text-gray-300'}`}>
                System
              </span>
              {sysUnread > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activePane === 'system' ? 'bg-blue-500 text-white' : 'bg-blue-500/30 text-blue-400'
                }`}>{sysUnread}</span>
              )}
            </div>
            <span className="text-[10px] text-gray-500 hidden sm:block">Errors · Tech · Payments</span>
          </button>
        </div>
      </div>

      {/* ── Pane Content ───────────────────────────────────────────────────── */}
      <div className="p-3 sm:p-6 lg:p-8">

        {/* ═══ TIER 1 — WORK REQUESTS ══════════════════════════════════════ */}
        {activePane === 'work-requests' && (
          <div className="space-y-5">
            {/* Pane header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-orange-400 flex items-center gap-2">
                  🚨 Incoming Work Requests
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">These stay pinned until you take action</p>
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 transition text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#1A1A1A] border border-orange-500/20 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Total WRs</p>
                <p className="text-2xl font-bold text-white">{wrAlerts.length}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-orange-500/30 rounded-xl p-4">
                <p className="text-xs text-orange-400 mb-1">Unread</p>
                <p className="text-2xl font-bold text-orange-400">{wrAlerts.filter(a => a.status === 'unread').length}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-red-500/30 rounded-xl p-4">
                <p className="text-xs text-red-400 mb-1">Action Required</p>
                <p className="text-2xl font-bold text-red-400">{wrAlerts.filter(a => a.actionRequired && a.status !== 'handled').length}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4">
                <p className="text-xs text-green-400 mb-1">Handled Today</p>
                <p className="text-2xl font-bold text-green-400">{wrHandledToday}</p>
              </div>
            </div>

            {/* Alert cards */}
            {filteredWR.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-10 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-gray-400">No work requests yet</p>
                <p className="text-sm mt-1">They'll appear here the moment a customer submits one.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWR.map(alert => {
                  const d = alert.data || {};
                  return (
                    <div
                      key={alert.id}
                      className={`bg-[#1A1A1A] border rounded-xl p-5 transition ${
                        alert.status === 'unread' ? 'border-orange-500/40' : 'border-[#2A2A2A]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3">
                          {alert.status === 'unread' && (
                            <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-bold text-white">{d.clientName || d.customerName || alert.title}</p>
                            <p className="text-sm text-gray-400">{d.serviceType || d.title || 'Service request'}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                          alert.status === 'unread' ? 'bg-orange-500/20 text-orange-400' :
                          alert.status === 'handled' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {alert.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {(d.clientEmail || d.customerEmail) && (
                          <div className="bg-[#0A0A0A] rounded-lg p-2">
                            <p className="text-[10px] text-gray-500 mb-0.5">Email</p>
                            <p className="text-xs font-medium text-white truncate">{d.clientEmail || d.customerEmail}</p>
                          </div>
                        )}
                        {(d.clientPhone || d.customerPhone) && (
                          <div className="bg-[#0A0A0A] rounded-lg p-2">
                            <p className="text-[10px] text-gray-500 mb-0.5">Phone</p>
                            <p className="text-xs font-medium text-white">{d.clientPhone || d.customerPhone}</p>
                          </div>
                        )}
                        {d.budgetRange && (
                          <div className="bg-[#0A0A0A] rounded-lg p-2">
                            <p className="text-[10px] text-gray-500 mb-0.5">Budget</p>
                            <p className="text-xs font-medium text-green-400">{d.budgetRange}</p>
                          </div>
                        )}
                        <div className="bg-[#0A0A0A] rounded-lg p-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">Received</p>
                          <p className="text-xs font-medium text-white">
                            {alert.timestamp ? new Date(alert.timestamp).toLocaleDateString() : 'Today'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            localStorage.setItem('viewer_open_request', d.workRequestId || alert.id);
                            if (onNavigate) onNavigate('work-request-viewer');
                            else window.location.href = '/work-request-viewer';
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Full Request
                        </button>
                        <button
                          onClick={() => openInPipeline(alert)}
                          disabled={openingPipeline === alert.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-60"
                        >
                          {openingPipeline === alert.id
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Quote...</>
                            : <><ArrowRight className="w-3.5 h-3.5" /> Open in Pipeline + Quote</>
                          }
                        </button>
                        <button
                          onClick={() => handleApprove(alert.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-semibold rounded-lg transition"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark Handled
                        </button>
                        {(d.clientEmail || d.customerEmail) && (
                          <a
                            href={`mailto:${d.clientEmail || d.customerEmail}?subject=Re: Your Work Request — ${d.serviceType || 'Service'}&body=Hi ${d.clientName || d.customerName || 'there'},%0A%0AThank you for submitting your work request.`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-[#2A2A2A] text-gray-400 hover:text-white text-xs font-semibold rounded-lg transition"
                          >
                            <Mail className="w-3.5 h-3.5" /> Reply by Email
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ TIER 2 — APPLICATIONS ═══════════════════════════════════════ */}
        {activePane === 'applications' && (
          <div className="space-y-5">
            {/* Pane header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-green-400 flex items-center gap-2">
                  👤 New Applications
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">Review and approve or reject</p>
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/30 transition text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <p className="text-2xl font-bold text-white">{appAlerts.length}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-yellow-500/30 rounded-xl p-4">
                <p className="text-xs text-yellow-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{appAlerts.filter(a => a.status !== 'handled' && a.status !== 'dismissed').length}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-green-500/30 rounded-xl p-4">
                <p className="text-xs text-green-400 mb-1">Approved Today</p>
                <p className="text-2xl font-bold text-green-400">{appApprovedToday}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-red-500/20 rounded-xl p-4">
                <p className="text-xs text-red-400 mb-1">Rejected</p>
                <p className="text-2xl font-bold text-red-400">{appAlerts.filter(a => a.status === 'dismissed').length}</p>
              </div>
            </div>

            {/* Application cards */}
            {filteredApp.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-10 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-gray-400">No new applications</p>
                <p className="text-sm mt-1">When someone applies to join the network they'll appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApp.map(alert => {
                  const d = alert.data || {};
                  const appType = d.applicantType || d.type || d.role || 'Applicant';
                  const isRejecting = rejectingId === alert.id;
                  return (
                    <div
                      key={alert.id}
                      className={`bg-[#1A1A1A] border rounded-xl p-5 transition ${
                        alert.status === 'unread' ? 'border-green-500/40' :
                        alert.status === 'handled' ? 'border-green-500/20' :
                        alert.status === 'dismissed' ? 'border-red-500/20' :
                        'border-[#2A2A2A]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3">
                          {alert.status === 'unread' && (
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-bold text-white">{alert.userName || d.applicantName || d.name || alert.title}</p>
                            <p className="text-sm text-gray-400">{d.email || d.applicantEmail || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                            {appType}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            alert.status === 'handled' ? 'bg-green-500/20 text-green-400' :
                            alert.status === 'dismissed' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {alert.status === 'handled' ? 'APPROVED' : alert.status === 'dismissed' ? 'REJECTED' : 'PENDING'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {(d.phone || d.applicantPhone) && (
                          <div className="bg-[#0A0A0A] rounded-lg p-2">
                            <p className="text-[10px] text-gray-500 mb-0.5">Phone</p>
                            <p className="text-xs font-medium text-white">{d.phone || d.applicantPhone}</p>
                          </div>
                        )}
                        <div className="bg-[#0A0A0A] rounded-lg p-2">
                          <p className="text-[10px] text-gray-500 mb-0.5">Submitted</p>
                          <p className="text-xs font-medium text-white">
                            {alert.timestamp ? new Date(alert.timestamp).toLocaleDateString() : 'Today'}
                          </p>
                        </div>
                        {d.company && (
                          <div className="bg-[#0A0A0A] rounded-lg p-2">
                            <p className="text-[10px] text-gray-500 mb-0.5">Company</p>
                            <p className="text-xs font-medium text-white truncate">{d.company}</p>
                          </div>
                        )}
                      </div>

                      {/* Inline reject reason */}
                      {isRejecting && (
                        <div className="mb-3 flex gap-2">
                          <input
                            type="text"
                            placeholder="Reason for rejection (optional)..."
                            value={rejectReason[alert.id] || ''}
                            onChange={(e) => setRejectReason(prev => ({ ...prev, [alert.id]: e.target.value }))}
                            className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-red-500/30 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              updateAlertStatus(alert.id, 'dismissed');
                              setAlerts(loadAlerts());
                              setRejectingId(null);
                              toast.error('Application rejected');
                            }}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition"
                          >
                            Confirm Reject
                          </button>
                          <button
                            onClick={() => setRejectingId(null)}
                            className="px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-400 text-xs rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            updateAlertStatus(alert.id, 'handled');
                            setAlerts(loadAlerts());
                            toast.success('Application approved — confirmation email sent');
                          }}
                          disabled={alert.status === 'handled'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-bold rounded-lg transition disabled:opacity-40"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => setRejectingId(isRejecting ? null : alert.id)}
                          disabled={alert.status === 'dismissed'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg transition disabled:opacity-40"
                        >
                          ❌ Reject
                        </button>
                        {(d.email || d.applicantEmail) && (
                          <a
                            href={`mailto:${d.email || d.applicantEmail}?subject=Re: Your Application`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-[#2A2A2A] text-gray-400 hover:text-white text-xs font-semibold rounded-lg transition"
                          >
                            <Mail className="w-3.5 h-3.5" /> 📧 Email Applicant
                          </a>
                        )}
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-semibold rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> 👁 View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ TIER 3 — SYSTEM ═════════════════════════════════════════════ */}
        {activePane === 'system' && (
          <div className="space-y-5">
            {/* Pane header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-blue-400 flex items-center gap-2">
                  ⚙️ System &amp; Technical Alerts
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">Errors, payments, security</p>
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 transition text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#1A1A1A] border border-blue-500/20 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Total</p>
                <p className="text-2xl font-bold text-white">{sysAlerts.length}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-red-500/30 rounded-xl p-4">
                <p className="text-xs text-red-400 mb-1">Critical</p>
                <p className="text-2xl font-bold text-red-400">{sysCritical}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-orange-500/30 rounded-xl p-4">
                <p className="text-xs text-orange-400 mb-1">Errors</p>
                <p className="text-2xl font-bold text-orange-400">{sysErrors}</p>
              </div>
              <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4">
                <p className="text-xs text-green-400 mb-1">Resolved</p>
                <p className="text-2xl font-bold text-green-400">{sysResolved}</p>
              </div>
            </div>

            {/* Filter row */}
            <div className="flex items-center gap-1.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-1 overflow-x-auto">
              {(['all', 'Errors', 'Payments', 'Security', 'Follow-ups', 'Reviews'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSystemFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    systemFilter === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>

            {/* Special panels for Follow-ups / Reviews */}
            {systemFilter === 'Follow-ups' && <FollowUpsPanel />}
            {systemFilter === 'Reviews' && <ReviewsAdminPanel />}

            {/* DataTable for everything else */}
            {systemFilter !== 'Follow-ups' && systemFilter !== 'Reviews' && (
              filteredSys.length === 0 ? (
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-10 text-center text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-semibold text-gray-400">No system alerts</p>
                  <p className="text-sm mt-1">Everything looks good.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable
                    columns={columns}
                    data={filteredSys}
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
                </div>
              )
            )}
          </div>
        )}
      </div>

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
// ── Reviews Admin Panel ───────────────────────────────────────────────────────
function ReviewsAdminPanel() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => { loadReviews(); }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      const res = await fetch(`${SERVER}/reviews?status=all`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setReviews(d.reviews || []); }
    } catch {}
    setLoading(false);
  };

  const updateReview = async (id: string, status: string, response?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      await fetch(`${SERVER}/reviews/${id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, response }),
      });
      toast.success(status === 'approved' ? 'Review approved — now live on landing page!' : 'Review updated');
      loadReviews();
    } catch { toast.error('Failed to update review'); }
  };

  const pending = reviews.filter(r => r.status === 'pending');
  const approved = reviews.filter(r => r.status === 'approved');

  if (loading) return <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-yellow-400 flex items-center gap-2">⭐ Customer Reviews ({reviews.length} total)</h3>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">{pending.length} pending</span>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">{approved.length} live</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 text-center text-gray-500">
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm mt-1">Customer reviews will appear here when submitted</p>
        </div>
      ) : (
        reviews.map(review => (
          <div key={review.id} className={`bg-[#1A1A1A] border rounded-xl p-5 space-y-3 ${review.status === 'pending' ? 'border-yellow-500/40' : review.status === 'approved' ? 'border-green-500/30' : 'border-[#2A2A2A]'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {[1,2,3,4,5].map(s => <span key={s} className={s <= review.rating ? 'text-yellow-400' : 'text-gray-700'}>★</span>)}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${review.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : review.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>{review.status}</span>
                </div>
                <p className="text-sm text-gray-200 italic">"{review.reviewText}"</p>
                <p className="text-xs text-gray-500 mt-1">{review.customerName} · {review.serviceType} · {new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Reply input */}
            <div className="flex gap-2">
              <input
                value={replyText[review.id] || review.response || ''}
                onChange={e => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                placeholder="Write a public response (optional)..."
                className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-xs text-white placeholder-gray-600 focus:border-yellow-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {review.status !== 'approved' && (
                <button onClick={() => updateReview(review.id, 'approved', replyText[review.id] || review.response)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-bold rounded-lg transition">✓ Approve & Publish</button>
              )}
              {review.status === 'approved' && replyText[review.id] !== undefined && (
                <button onClick={() => updateReview(review.id, 'approved', replyText[review.id])} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-lg transition">💬 Save Response</button>
              )}
              {review.status !== 'rejected' && (
                <button onClick={() => updateReview(review.id, 'rejected')} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg transition">✕ Reject</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Follow-Ups Panel ──────────────────────────────────────────────────────────
function FollowUpsPanel() {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadFollowUps();
    processDue(); // Auto-process any due follow-ups when panel opens
  }, []);

  const loadFollowUps = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      const res = await fetch(`${SERVER}/follow-ups`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setFollowUps(d.followUps || []); }
    } catch {}
    setLoading(false);
  };

  const processDue = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      const res = await fetch(`${SERVER}/follow-ups/process`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        if (d.processed > 0) {
          toast.success(`${d.processed} follow-up${d.processed > 1 ? 's' : ''} sent automatically!`);
          loadFollowUps();
        }
      }
    } catch {}
  };

  const sendNow = async (id: string) => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      // Force it due and process
      await fetch(`${SERVER}/follow-ups`, { headers: { Authorization: `Bearer ${token}` } });
      // Update scheduledAt to now then process
      const all = followUps.map(f => f.id === id ? { ...f, scheduledAt: new Date().toISOString() } : f);
      // Store updated list
      setFollowUps(all);
      await processDue();
      toast.success('Follow-up sent!');
    } catch { toast.error('Failed to send'); }
    setProcessing(false);
  };

  const pending = followUps.filter(f => f.status === 'pending');
  const sent = followUps.filter(f => f.status === 'sent');
  const cancelled = followUps.filter(f => f.status === 'cancelled');

  if (loading) return <div className="flex items-center justify-center py-10"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-blue-400 flex items-center gap-2">⏰ Quote Follow-ups</h3>
        <div className="flex gap-2">
          <button onClick={processDue} className="text-xs px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-600/30 transition">
            Process Due Now
          </button>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">{pending.length} pending</span>
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">{sent.length} sent</span>
          </div>
        </div>
      </div>

      {followUps.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 text-center text-gray-500">
          <p className="font-medium">No follow-ups scheduled</p>
          <p className="text-sm mt-1">Follow-ups are automatically scheduled when you send a quote to a customer</p>
        </div>
      ) : (
        [...pending, ...sent, ...cancelled].map(fu => (
          <div key={fu.id} className={`bg-[#1A1A1A] border rounded-xl p-5 space-y-3 ${
            fu.status === 'pending' ? 'border-yellow-500/40' :
            fu.status === 'sent' ? 'border-green-500/30' : 'border-[#2A2A2A]'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    fu.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    fu.status === 'sent' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
                  }`}>{fu.status}</span>
                  <span className="text-xs text-gray-500">{fu.dayLabel} follow-up</span>
                </div>
                <p className="font-semibold text-white text-sm">{fu.clientName}</p>
                <p className="text-xs text-gray-500">{fu.serviceType} · {fu.clientEmail}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-600">{fu.status === 'sent' ? 'Sent' : 'Scheduled'}</p>
                <p className="text-xs text-white font-medium">{new Date(fu.status === 'sent' ? fu.sentAt : fu.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {fu.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => sendNow(fu.id)} disabled={processing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-lg transition disabled:opacity-50">
                  {processing ? <RefreshCw className="w-3 h-3 animate-spin" /> : '📤'} Send Now
                </button>
                {fu.approvalUrl && (
                  <a href={fu.approvalUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-[#2A2A2A] text-gray-400 hover:text-white text-xs rounded-lg transition">
                    View Quote Link
                  </a>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
