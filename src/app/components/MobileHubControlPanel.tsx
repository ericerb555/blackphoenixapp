/**
 * Portal Control Panel - Enterprise Edition with Live Visual Editor
 * 
 * Integrated with Admin Alerts System
 * Flow: Alert → Admin Alerts → Control Panel → Approve → Active
 * 
 * Features:
 * 1. Pending Approvals - Requests waiting for admin action
 * 2. Active Portals - Approved and running portals
 * 3. Live Visual Editor - Drag and drop with real-time preview
 * 4. AI Studio Link - For vendor advertising
 */

import { useState } from 'react';
import {
  Plus, Edit, Eye, Settings, Save, X, ChevronDown, ChevronUp,
  Layout, Palette, Type, Image, Box, Layers, Move, Trash2,
  CheckCircle, Clock, AlertTriangle, Building2, Users, DollarSign,
  Sparkles, Wand2, ExternalLink, Globe, Smartphone, Monitor,
  Grid3x3, AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  Link, Upload, Download, Copy, RotateCw, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Search, Filter, MoreVertical,
  PlayCircle, StopCircle, RefreshCw, Share2, Mail, Phone,
  MapPin, Calendar, TrendingUp, BarChart3, Award, Target,
  Zap, Crown, Package, ShoppingCart, Tag, Megaphone, Bell,
  Briefcase, Shield
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface MobileHubControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

type ViewMode = 'dashboard' | 'create-portal' | 'edit-portal' | 'pending-approvals' | 'ai-studio-link';
type PortalStatus = 'active' | 'pending' | 'draft' | 'archived';
type Priority = 'urgent' | 'high' | 'medium' | 'low';
type DeviceView = 'desktop' | 'tablet' | 'mobile';

interface PendingApproval {
  id: string;
  portalName: string;
  requestedBy: string;
  requestedByEmail: string;
  company: string;
  priority: Priority;
  requestDate: string;
  estimatedCost: string;
  requestedFeatures: string[];
  description: string;
  status: 'pending' | 'under-review';
}

interface Portal {
  id: string;
  name: string;
  company: string;
  status: PortalStatus;
  url: string;
  createdDate: string;
  lastModified: string;
  users: number;
  sections: PortalSection[];
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
}

interface PortalSection {
  id: string;
  type: 'header' | 'hero' | 'features' | 'content' | 'cta' | 'footer';
  name: string;
  visible: boolean;
  order: number;
  settings: any;
}

export default function MobileHubControlPanel({
  isOpen,
  onClose,
  userRole = 'admin'
}: MobileHubControlPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedPortal, setSelectedPortal] = useState<Portal | null>(null);
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  // Mock pending approvals
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([
    {
      id: 'PA-001',
      portalName: 'Premium Customer Portal',
      requestedBy: 'Sarah Martinez',
      requestedByEmail: 'sarah@techcorp.com',
      company: 'Tech Corporation',
      priority: 'urgent',
      requestDate: '2026-01-25',
      estimatedCost: '$899/month',
      requestedFeatures: ['Advanced CRM', 'Payment Gateway', 'Custom Branding', 'API Access'],
      description: 'Need enterprise-level portal with full customization and white-label capabilities',
      status: 'pending'
    },
    {
      id: 'PA-002',
      portalName: 'Vendor Advertising Portal',
      requestedBy: 'Michael Anderson',
      requestedByEmail: 'michael@vendorco.com',
      company: 'Vendor Co',
      priority: 'high',
      requestDate: '2026-01-24',
      estimatedCost: '$499/month',
      requestedFeatures: ['Product Showcase', 'Deal Creator', 'Analytics Dashboard'],
      description: 'Vendor wants to create and manage product advertisements and special deals',
      status: 'pending'
    },
    {
      id: 'PA-003',
      portalName: 'Subcontractor Hub Upgrade',
      requestedBy: 'David Kim',
      requestedByEmail: 'david@builders.com',
      company: 'Builders United',
      priority: 'medium',
      requestDate: '2026-01-23',
      estimatedCost: '$299/month',
      requestedFeatures: ['Job Tracking', 'Invoice Management', 'Training Videos'],
      description: 'Upgrade existing portal with additional features for subcontractor management',
      status: 'under-review'
    }
  ]);

  // Real built portals
  const [portals, setPortals] = useState<Portal[]>([
    {
      id: 'PRT-001',
      name: 'Customer Portal',
      company: 'Main Company',
      status: 'active',
      url: '/customer-portal',
      createdDate: '2026-01-10',
      lastModified: '2026-03-14',
      users: 1245,
      sections: [
        { id: 'sec-1', type: 'header', name: 'Header Navigation', visible: true, order: 1, settings: {} },
        { id: 'sec-2', type: 'hero', name: 'Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-3', type: 'features', name: 'Projects', visible: true, order: 3, settings: {} },
        { id: 'sec-4', type: 'content', name: 'Shopping', visible: true, order: 4, settings: {} },
        { id: 'sec-5', type: 'cta', name: 'Work Requests', visible: true, order: 5, settings: {} },
        { id: 'sec-6', type: 'footer', name: 'Messages', visible: true, order: 6, settings: {} }
      ],
      theme: {
        primaryColor: '#ea580c',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-002',
      name: 'Subcontractor Portal',
      company: 'Main Company',
      status: 'active',
      url: '/subcontractor-portal',
      createdDate: '2026-01-12',
      lastModified: '2026-03-14',
      users: 156,
      sections: [
        { id: 'sec-7', type: 'header', name: 'Header Navigation', visible: true, order: 1, settings: {} },
        { id: 'sec-8', type: 'hero', name: 'Dashboard Overview', visible: true, order: 2, settings: {} },
        { id: 'sec-9', type: 'content', name: 'Job Board', visible: true, order: 3, settings: {} }
      ],
      theme: {
        primaryColor: '#ea580c',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-003',
      name: 'Employee Portal',
      company: 'Main Company',
      status: 'active',
      url: '/employee-portal',
      createdDate: '2026-01-20',
      lastModified: '2026-03-14',
      users: 45,
      sections: [
        { id: 'sec-10', type: 'header', name: 'Header Navigation', visible: true, order: 1, settings: {} },
        { id: 'sec-11', type: 'hero', name: 'Employee Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-12', type: 'content', name: 'Tasks & Schedule', visible: true, order: 3, settings: {} }
      ],
      theme: {
        primaryColor: '#22c55e',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-004',
      name: 'Vendor Portal',
      company: 'Main Company',
      status: 'active',
      url: '/vendor-portal',
      createdDate: '2026-01-15',
      lastModified: '2026-03-14',
      users: 89,
      sections: [
        { id: 'sec-13', type: 'header', name: 'Header Navigation', visible: true, order: 1, settings: {} },
        { id: 'sec-14', type: 'hero', name: 'Vendor Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-15', type: 'features', name: 'Product Management', visible: true, order: 3, settings: {} },
        { id: 'sec-16', type: 'content', name: 'Analytics & Performance', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#f59e0b',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-005',
      name: 'Property Management Portal',
      company: 'Main Company',
      status: 'active',
      url: '/property-management-portal',
      createdDate: '2026-01-18',
      lastModified: '2026-03-14',
      users: 234,
      sections: [
        { id: 'sec-17', type: 'header', name: 'Header Navigation', visible: true, order: 1, settings: {} },
        { id: 'sec-18', type: 'hero', name: 'Property Overview', visible: true, order: 2, settings: {} },
        { id: 'sec-19', type: 'content', name: 'Maintenance Requests', visible: true, order: 3, settings: {} },
        { id: 'sec-20', type: 'content', name: 'Vendor Management', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#ec4899',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-006',
      name: 'Handyman Portal',
      company: 'Main Company',
      status: 'active',
      url: '/handyman-portal',
      createdDate: '2026-01-22',
      lastModified: '2026-03-14',
      users: 178,
      sections: [
        { id: 'sec-21', type: 'header', name: 'Header Navigation', visible: true, order: 1, settings: {} },
        { id: 'sec-22', type: 'hero', name: 'Job Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-23', type: 'content', name: 'Available Jobs', visible: true, order: 3, settings: {} },
        { id: 'sec-24', type: 'content', name: 'Tools & Resources', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#10b981',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-007',
      name: 'Vendor Super Portal',
      company: 'Main Company',
      status: 'active',
      url: '/vendor-super-portal',
      createdDate: '2026-01-24',
      lastModified: '2026-03-14',
      users: 92,
      sections: [
        { id: 'sec-25', type: 'header', name: 'Header Navigation', visible: true, order: 1, settings: {} },
        { id: 'sec-26', type: 'hero', name: 'Super Portal Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-27', type: 'content', name: 'Advanced Analytics', visible: true, order: 3, settings: {} },
        { id: 'sec-28', type: 'content', name: 'Multi-Company Management', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#3b82f6',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-008',
      name: 'On-Call Emergency Portal',
      company: 'Main Company',
      status: 'active',
      url: '/on-call-portal',
      createdDate: '2026-02-01',
      lastModified: '2026-03-14',
      users: 34,
      sections: [
        { id: 'sec-29', type: 'header', name: 'Emergency Header', visible: true, order: 1, settings: {} },
        { id: 'sec-30', type: 'hero', name: 'Emergency Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-31', type: 'content', name: 'Active Emergencies', visible: true, order: 3, settings: {} }
      ],
      theme: {
        primaryColor: '#ef4444',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-011',
      name: 'Customer Subscription Portal',
      company: 'Main Company',
      status: 'active',
      url: '/customer-subscription-portal',
      createdDate: '2026-02-12',
      lastModified: '2026-03-14',
      users: 456,
      sections: [
        { id: 'sec-39', type: 'header', name: 'Subscription Header', visible: true, order: 1, settings: {} },
        { id: 'sec-40', type: 'hero', name: 'Subscription Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-41', type: 'content', name: 'Plan Management', visible: true, order: 3, settings: {} },
        { id: 'sec-42', type: 'content', name: 'Usage & Billing', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#06b6d4',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-012',
      name: 'Professional Portal',
      company: 'Main Company',
      status: 'draft',
      url: '/professional-portal',
      createdDate: '2026-02-15',
      lastModified: '2026-03-14',
      users: 0,
      sections: [
        { id: 'sec-43', type: 'header', name: 'Professional Header', visible: true, order: 1, settings: {} },
        { id: 'sec-44', type: 'hero', name: 'Professional Dashboard', visible: true, order: 2, settings: {} }
      ],
      theme: {
        primaryColor: '#14b8a6',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-013',
      name: 'Portal Access Gateway',
      company: 'Main Company',
      status: 'active',
      url: '/portal-access',
      createdDate: '2026-02-18',
      lastModified: '2026-03-14',
      users: 2341,
      sections: [
        { id: 'sec-45', type: 'header', name: 'Gateway Header', visible: true, order: 1, settings: {} },
        { id: 'sec-46', type: 'hero', name: 'Role Selection', visible: true, order: 2, settings: {} },
        { id: 'sec-47', type: 'content', name: 'Login System', visible: true, order: 3, settings: {} }
      ],
      theme: {
        primaryColor: '#ea580c',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-014',
      name: 'Vendor Portal Auth',
      company: 'Main Company',
      status: 'active',
      url: '/vendor-portal-auth',
      createdDate: '2026-02-20',
      lastModified: '2026-03-14',
      users: 89,
      sections: [
        { id: 'sec-48', type: 'header', name: 'Auth Header', visible: true, order: 1, settings: {} },
        { id: 'sec-49', type: 'hero', name: 'Vendor Login', visible: true, order: 2, settings: {} }
      ],
      theme: {
        primaryColor: '#f59e0b',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-015',
      name: 'Advertiser Portal',
      company: 'Main Company',
      status: 'active',
      url: '/advertiser-portal',
      createdDate: '2026-03-01',
      lastModified: '2026-03-14',
      users: 234,
      sections: [
        { id: 'sec-50', type: 'header', name: 'Logo Marquee & Ads', visible: true, order: 1, settings: {} },
        { id: 'sec-51', type: 'hero', name: 'Dashboard & Campaigns', visible: true, order: 2, settings: {} },
        { id: 'sec-52', type: 'content', name: 'Analytics & Performance', visible: true, order: 3, settings: {} },
        { id: 'sec-53', type: 'footer', name: 'Referrals', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#ea580c',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-016',
      name: 'Investor Portal',
      company: 'Main Company',
      status: 'active',
      url: '/investor-portal',
      createdDate: '2026-03-02',
      lastModified: '2026-03-14',
      users: 89,
      sections: [
        { id: 'sec-54', type: 'header', name: 'Logo Marquee & Ads', visible: true, order: 1, settings: {} },
        { id: 'sec-55', type: 'hero', name: 'Portfolio Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-56', type: 'content', name: 'Opportunities & Reports', visible: true, order: 3, settings: {} },
        { id: 'sec-57', type: 'footer', name: 'Referrals', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#ea580c',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-017',
      name: 'Landlord Portal',
      company: 'Main Company',
      status: 'active',
      url: '/landlord-portal',
      createdDate: '2026-03-03',
      lastModified: '2026-03-14',
      users: 167,
      sections: [
        { id: 'sec-58', type: 'header', name: 'Logo Marquee & Ads', visible: true, order: 1, settings: {} },
        { id: 'sec-59', type: 'hero', name: 'Property Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-60', type: 'content', name: 'Tenants & Maintenance', visible: true, order: 3, settings: {} },
        { id: 'sec-61', type: 'footer', name: 'Marketing & Referrals', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#ea580c',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-018',
      name: 'Condo Association Portal',
      company: 'Main Company',
      status: 'active',
      url: '/condo-association-portal',
      createdDate: '2026-03-04',
      lastModified: '2026-03-14',
      users: 312,
      sections: [
        { id: 'sec-62', type: 'header', name: 'Logo Marquee & Ads', visible: true, order: 1, settings: {} },
        { id: 'sec-63', type: 'hero', name: 'Association Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-64', type: 'content', name: 'Units & Vendors', visible: true, order: 3, settings: {} },
        { id: 'sec-65', type: 'footer', name: 'Financials & Referrals', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#ea580c',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    },
    {
      id: 'PRT-019',
      name: 'Vendor Portal (Enhanced)',
      company: 'Main Company',
      status: 'active',
      url: '/vendor-portal-new',
      createdDate: '2026-03-05',
      lastModified: '2026-03-14',
      users: 156,
      sections: [
        { id: 'sec-66', type: 'header', name: 'Logo Marquee & Ads', visible: true, order: 1, settings: {} },
        { id: 'sec-67', type: 'hero', name: 'Vendor Dashboard', visible: true, order: 2, settings: {} },
        { id: 'sec-68', type: 'content', name: 'Orders & Products', visible: true, order: 3, settings: {} },
        { id: 'sec-69', type: 'footer', name: 'Performance & Referrals', visible: true, order: 4, settings: {} }
      ],
      theme: {
        primaryColor: '#ea580c',
        secondaryColor: '#0A0A0A',
        fontFamily: 'Inter'
      }
    }
  ]);

  const handleApproveRequest = (id: string) => {
    setPendingApprovals(pendingApprovals.filter(p => p.id !== id));
    toast.success('Portal request approved! Moving to active configuration.');
  };

  const handleRejectRequest = (id: string) => {
    setPendingApprovals(pendingApprovals.filter(p => p.id !== id));
    toast.success('Portal request rejected and notification sent.');
  };

  const handleCreatePortal = () => {
    setViewMode('create-portal');
    toast.info('Opening portal creation wizard...');
  };

  const handleEditPortal = (portal: Portal) => {
    // Navigate to the actual portal page
    if (portal.url) {
      window.location.href = portal.url;
    } else {
      setSelectedPortal(portal);
      setViewMode('edit-portal');
    }
  };

  const handleSavePortal = () => {
    toast.success('Portal configuration saved successfully!');
    setViewMode('dashboard');
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return 'from-red-600 to-red-700';
      case 'high': return 'from-orange-600 to-orange-700';
      case 'medium': return 'from-yellow-600 to-yellow-700';
      case 'low': return 'from-blue-600 to-blue-700';
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600/20 border-red-500/30 text-red-400';
      case 'high': return 'bg-orange-600/20 border-orange-500/30 text-orange-400';
      case 'medium': return 'bg-yellow-600/20 border-yellow-500/30 text-yellow-400';
      case 'low': return 'bg-blue-600/20 border-blue-500/30 text-blue-400';
    }
  };

  const getStatusColor = (status: PortalStatus) => {
    switch (status) {
      case 'active': return 'bg-green-600/20 border-green-500/30 text-green-400';
      case 'pending': return 'bg-yellow-600/20 border-yellow-500/30 text-yellow-400';
      case 'draft': return 'bg-gray-600/20 border-gray-500/30 text-gray-400';
      case 'archived': return 'bg-red-600/20 border-red-500/30 text-red-400';
    }
  };

  // DASHBOARD VIEW
  if (viewMode === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] rounded-2xl border border-[#3A3A3A] p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ea580c] to-[#c2410c] flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                Enterprise Portal Control Panel
              </h1>
              <p className="text-gray-300 text-lg">Complete portal management, creation, and approval system</p>
            </div>
            <button
              onClick={handleCreatePortal}
              className="px-8 py-4 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#ea580c] text-white font-bold rounded-xl transition shadow-lg shadow-orange-500/20 flex items-center gap-3"
            >
              <Plus className="w-6 h-6" />
              <div className="text-left">
                <div className="text-sm font-bold">Create New Portal</div>
                <div className="text-xs opacity-90">Full visual editor</div>
              </div>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Portals', value: portals.filter(p => p.status === 'active').length, icon: Globe, color: 'green', change: '+2 this month' },
            { label: 'Pending Approvals', value: pendingApprovals.length, icon: Clock, color: 'orange', change: `${pendingApprovals.filter(p => p.priority === 'urgent').length} urgent` },
            { label: 'Total Users', value: portals.reduce((sum, p) => sum + p.users, 0).toLocaleString(), icon: Users, color: 'blue', change: '+324 this month' },
            { label: 'Draft Portals', value: portals.filter(p => p.status === 'draft').length, icon: Edit, color: 'purple', change: 'In progress' }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-[#ea580c]/30 transition">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-${stat.color}-600/20 border border-${stat.color}-500/30 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-400`} />
                  </div>
                  <span className="text-xs font-semibold text-green-400">{stat.change}</span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Approvals Section */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  Pending Approvals
                </h2>
                <p className="text-gray-400">Review and approve portal requests</p>
              </div>
              <button
                onClick={() => setViewMode('pending-approvals')}
                className="px-4 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-xl transition flex items-center gap-2"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {pendingApprovals.slice(0, 3).map(approval => (
                <div key={approval.id} className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 hover:border-[#ea580c]/30 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-white">{approval.portalName}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPriorityBadge(approval.priority)}`}>
                          {approval.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{approval.company} • {approval.requestedBy}</p>
                      <p className="text-xs text-gray-500">{approval.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-[#2A2A2A]">
                    <button
                      onClick={() => handleApproveRequest(approval.id)}
                      className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectRequest(approval.id)}
                      className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active & Draft Portals */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  Manage Portals
                </h2>
                <p className="text-gray-400">Edit and configure existing portals</p>
              </div>
            </div>

            <div className="space-y-3">
              {portals.slice(0, 4).map(portal => (
                <div key={portal.id} className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 hover:border-[#ea580c]/30 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-white">{portal.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(portal.status)}`}>
                          {portal.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-1">{portal.company}</p>
                      <p className="text-xs text-gray-500">{portal.users.toLocaleString()} users • Modified {new Date(portal.lastModified).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-[#2A2A2A]">
                    <button
                      onClick={() => handleEditPortal(portal)}
                      className="flex-1 px-3 py-2 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/30 text-[#ea580c] rounded-lg transition text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Portal
                    </button>
                    <button
                      onClick={() => window.location.href = portal.url}
                      className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg transition text-sm font-medium flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Studio Link Section */}
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-2xl border border-purple-500/30 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  AI Studio for Vendors & Subcontractors
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold rounded-full">
                    NEW
                  </span>
                </h2>
                <p className="text-gray-300 mb-2">Create product advertisements, special deals, and promotional content with AI assistance</p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Megaphone className="w-4 h-4" />
                    Ad Creator
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    Deal Manager
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    Performance Analytics
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setViewMode('ai-studio-link')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition shadow-lg shadow-purple-500/20 flex items-center gap-3"
            >
              <Wand2 className="w-6 h-6" />
              <div className="text-left">
                <div className="text-sm font-bold">Open AI Studio</div>
                <div className="text-xs opacity-90">For Advertising</div>
              </div>
              <ExternalLink className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EDIT/CREATE PORTAL VIEW
  if (viewMode === 'edit-portal' || viewMode === 'create-portal') {
    const isEditing = viewMode === 'edit-portal' && selectedPortal;
    const currentPortal = isEditing ? selectedPortal : null;

    return (
      <div className="space-y-6">
        {/* Editor Header */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode('dashboard')}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {isEditing ? `Edit: ${currentPortal?.name}` : 'Create New Portal'}
                </h1>
                <p className="text-gray-400">Click sections to edit, drag to reorder, use handles to resize</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Device Preview Toggle */}
              <div className="flex items-center gap-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-1">
                <button
                  onClick={() => setDeviceView('desktop')}
                  className={`p-2 rounded transition ${deviceView === 'desktop' ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Desktop View"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeviceView('tablet')}
                  className={`p-2 rounded transition ${deviceView === 'tablet' ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Tablet View"
                >
                  <Smartphone className="w-4 h-4 rotate-90" />
                </button>
                <button
                  onClick={() => setDeviceView('mobile')}
                  className={`p-2 rounded transition ${deviceView === 'mobile' ? 'bg-[#ea580c] text-white' : 'text-gray-400 hover:text-white'}`}
                  title="Mobile View"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => toast.info('Preview opened in new window')}
                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-xl transition flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSavePortal}
                className="px-6 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#ea580c] text-white font-bold rounded-xl transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Portal
              </button>
            </div>
          </div>
        </div>

        {/* Editor Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Components */}
          <div className="col-span-2 space-y-4">
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                <Box className="w-4 h-4 text-[#ea580c]" />
                Components
              </h3>
              <div className="space-y-2">
                {[
                  { icon: Layout, label: 'Header', type: 'header' },
                  { icon: Image, label: 'Hero', type: 'hero' },
                  { icon: Grid3x3, label: 'Features', type: 'features' },
                  { icon: AlignLeft, label: 'Content', type: 'content' },
                  { icon: Zap, label: 'CTA', type: 'cta' },
                  { icon: Layout, label: 'Footer', type: 'footer' }
                ].map((component, i) => {
                  const Icon = component.icon;
                  return (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => setDraggedSection(component.type)}
                      className="flex items-center gap-2 p-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg transition cursor-move group"
                    >
                      <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#ea580c] transition" />
                      <span className="text-xs text-gray-300 group-hover:text-white transition">{component.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Theme Settings */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                <Palette className="w-4 h-4 text-[#ea580c]" />
                Theme
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Primary</label>
                  <input
                    type="color"
                    defaultValue="#ea580c"
                    className="w-full h-8 rounded-lg border border-[#2A2A2A] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center - Live Visual Editor Canvas */}
          <div className="col-span-8">
            <div className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] p-4 relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4 text-[#ea580c]" />
                  Live Editor
                  <span className="text-xs text-gray-500">({deviceView})</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 hover:bg-[#2A2A2A] rounded-lg transition" title="Undo">
                    <RotateCw className="w-3.5 h-3.5 text-gray-400 rotate-180" />
                  </button>
                  <button className="p-1.5 hover:bg-[#2A2A2A] rounded-lg transition" title="Redo">
                    <RotateCw className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Live Dashboard Canvas */}
              <div 
                className={`bg-white rounded-xl overflow-hidden shadow-2xl transition-all relative ${
                  deviceView === 'desktop' ? 'mx-0' :
                  deviceView === 'tablet' ? 'mx-12' :
                  'mx-24'
                }`}
                style={{ minHeight: '600px' }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedSection) {
                    toast.success(`Added ${draggedSection} section`);
                    setDraggedSection(null);
                  }
                }}
              >
                {/* Live Portal Preview */}
                <div className="relative">
                  {currentPortal && currentPortal.sections.length > 0 ? (
                    <>
                      {/* Header Section */}
                      <div
                        className={`relative group ${selectedElement === 'header' ? 'ring-4 ring-[#ea580c] ring-offset-2' : ''} ${hoveredElement === 'header' ? 'ring-2 ring-blue-400' : ''}`}
                        onMouseEnter={() => setHoveredElement('header')}
                        onMouseLeave={() => setHoveredElement(null)}
                        onClick={() => setSelectedElement('header')}
                      >
                        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#0A0A0A] border-b border-[#2A2A2A] px-6 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <h1 className="text-xl font-bold text-white">Portal Logo</h1>
                              <nav className="flex items-center gap-4">
                                <a href="#" className="text-gray-300 hover:text-white transition text-xs">Dashboard</a>
                                <a href="#" className="text-gray-300 hover:text-white transition text-xs">Projects</a>
                                <a href="#" className="text-gray-300 hover:text-white transition text-xs">Support</a>
                              </nav>
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="p-1.5 bg-[#2A2A2A] rounded-lg">
                                <Bell className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <div className="w-7 h-7 rounded-full bg-[#ea580c] flex items-center justify-center text-white text-xs font-bold">
                                JD
                              </div>
                            </div>
                          </div>
                        </div>
                        {(selectedElement === 'header' || hoveredElement === 'header') && (
                          <div className="absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-1 bg-[#ea580c] rounded-t-lg z-10">
                            <div className="flex items-center gap-2">
                              <Move className="w-3 h-3 text-white cursor-move" />
                              <span className="text-white text-xs font-bold">Header</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button className="p-1 hover:bg-white/20 rounded">
                                <Edit className="w-3 h-3 text-white" />
                              </button>
                              <button className="p-1 hover:bg-white/20 rounded">
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Hero Section */}
                      <div
                        className={`relative group ${selectedElement === 'hero' ? 'ring-4 ring-[#ea580c] ring-offset-2' : ''} ${hoveredElement === 'hero' ? 'ring-2 ring-blue-400' : ''}`}
                        onMouseEnter={() => setHoveredElement('hero')}
                        onMouseLeave={() => setHoveredElement(null)}
                        onClick={() => setSelectedElement('hero')}
                      >
                        <div className="bg-gradient-to-br from-[#ea580c] to-[#c2410c] px-6 py-12 relative overflow-hidden">
                          <div className="relative z-10 max-w-2xl">
                            <h1 className="text-4xl font-bold text-white mb-3">Welcome to Your Portal</h1>
                            <p className="text-lg text-orange-100 mb-6">Manage projects, track progress, and collaborate with your team.</p>
                            <div className="flex items-center gap-3">
                              <button className="px-5 py-2 bg-white text-[#ea580c] font-bold rounded-lg hover:bg-gray-100 transition text-sm">
                                Get Started
                              </button>
                              <button className="px-5 py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition border border-white/20 text-sm">
                                Learn More
                              </button>
                            </div>
                          </div>
                          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
                        </div>
                        {(selectedElement === 'hero' || hoveredElement === 'hero') && (
                          <>
                            <div className="absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-1 bg-[#ea580c] rounded-t-lg z-10">
                              <div className="flex items-center gap-2">
                                <Move className="w-3 h-3 text-white cursor-move" />
                                <span className="text-white text-xs font-bold">Hero Section</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button className="p-1 hover:bg-white/20 rounded">
                                  <Edit className="w-3 h-3 text-white" />
                                </button>
                                <button className="p-1 hover:bg-white/20 rounded">
                                  <Trash2 className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            </div>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-3 bg-[#ea580c] rounded-full cursor-ns-resize flex items-center justify-center">
                              <div className="w-6 h-0.5 bg-white rounded-full"></div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div
                        className={`relative group ${selectedElement === 'stats' ? 'ring-4 ring-[#ea580c] ring-offset-2' : ''} ${hoveredElement === 'stats' ? 'ring-2 ring-blue-400' : ''}`}
                        onMouseEnter={() => setHoveredElement('stats')}
                        onMouseLeave={() => setHoveredElement(null)}
                        onClick={() => setSelectedElement('stats')}
                      >
                        <div className="bg-gray-50 px-6 py-8">
                          <div className="grid grid-cols-4 gap-4">
                            {[
                              { label: 'Projects', value: '24', icon: Briefcase, color: 'blue' },
                              { label: 'Tasks', value: '156', icon: CheckCircle, color: 'green' },
                              { label: 'Team', value: '12', icon: Users, color: 'purple' },
                              { label: 'Revenue', value: '$48K', icon: DollarSign, color: 'orange' }
                            ].map((stat, i) => {
                              const Icon = stat.icon;
                              return (
                                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                  <div className={`w-8 h-8 rounded-lg bg-${stat.color}-100 flex items-center justify-center mb-2`}>
                                    <Icon className={`w-4 h-4 text-${stat.color}-600`} />
                                  </div>
                                  <p className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
                                  <p className="text-xs text-gray-600">{stat.label}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {(selectedElement === 'stats' || hoveredElement === 'stats') && (
                          <>
                            <div className="absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-1 bg-[#ea580c] rounded-t-lg z-10">
                              <div className="flex items-center gap-2">
                                <Move className="w-3 h-3 text-white cursor-move" />
                                <span className="text-white text-xs font-bold">Stats Grid</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button className="p-1 hover:bg-white/20 rounded">
                                  <Edit className="w-3 h-3 text-white" />
                                </button>
                                <button className="p-1 hover:bg-white/20 rounded">
                                  <Trash2 className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            </div>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-3 bg-[#ea580c] rounded-full cursor-ns-resize flex items-center justify-center">
                              <div className="w-6 h-0.5 bg-white rounded-full"></div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Features Section */}
                      <div
                        className={`relative group ${selectedElement === 'features' ? 'ring-4 ring-[#ea580c] ring-offset-2' : ''} ${hoveredElement === 'features' ? 'ring-2 ring-blue-400' : ''}`}
                        onMouseEnter={() => setHoveredElement('features')}
                        onMouseLeave={() => setHoveredElement(null)}
                        onClick={() => setSelectedElement('features')}
                      >
                        <div className="bg-white px-6 py-10">
                          <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Powerful Features</h2>
                            <p className="text-gray-600">Everything you need for your business</p>
                          </div>
                          <div className="grid grid-cols-3 gap-6">
                            {[
                              { icon: Zap, title: 'Lightning Fast', desc: 'Optimized performance' },
                              { icon: Shield, title: 'Secure', desc: 'Bank-level security' },
                              { icon: TrendingUp, title: 'Analytics', desc: 'Real-time insights' },
                              { icon: Users, title: 'Collaboration', desc: 'Work together' },
                              { icon: Package, title: 'Projects', desc: 'Organize work' },
                              { icon: Award, title: 'Quality', desc: 'Industry standards' }
                            ].map((feature, i) => {
                              const Icon = feature.icon;
                              return (
                                <div key={i} className="text-center">
                                  <div className="w-12 h-12 rounded-full bg-[#ea580c]/10 flex items-center justify-center mx-auto mb-3">
                                    <Icon className="w-6 h-6 text-[#ea580c]" />
                                  </div>
                                  <h3 className="font-bold text-gray-900 mb-1 text-sm">{feature.title}</h3>
                                  <p className="text-gray-600 text-xs">{feature.desc}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {(selectedElement === 'features' || hoveredElement === 'features') && (
                          <>
                            <div className="absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-1 bg-[#ea580c] rounded-t-lg z-10">
                              <div className="flex items-center gap-2">
                                <Move className="w-3 h-3 text-white cursor-move" />
                                <span className="text-white text-xs font-bold">Features</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button className="p-1 hover:bg-white/20 rounded">
                                  <Edit className="w-3 h-3 text-white" />
                                </button>
                                <button className="p-1 hover:bg-white/20 rounded">
                                  <Trash2 className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            </div>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-3 bg-[#ea580c] rounded-full cursor-ns-resize flex items-center justify-center">
                              <div className="w-6 h-0.5 bg-white rounded-full"></div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* CTA Section */}
                      <div
                        className={`relative group ${selectedElement === 'cta' ? 'ring-4 ring-[#ea580c] ring-offset-2' : ''} ${hoveredElement === 'cta' ? 'ring-2 ring-blue-400' : ''}`}
                        onMouseEnter={() => setHoveredElement('cta')}
                        onMouseLeave={() => setHoveredElement(null)}
                        onClick={() => setSelectedElement('cta')}
                      >
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-10">
                          <div className="text-center max-w-2xl mx-auto">
                            <h2 className="text-3xl font-bold text-white mb-3">Ready to Get Started?</h2>
                            <p className="text-blue-100 mb-6">Join thousands of customers transforming their business</p>
                            <div className="flex items-center justify-center gap-3">
                              <button className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition text-sm">
                                Start Free Trial
                              </button>
                              <button className="px-6 py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition border border-white/20 text-sm">
                                Schedule Demo
                              </button>
                            </div>
                          </div>
                        </div>
                        {(selectedElement === 'cta' || hoveredElement === 'cta') && (
                          <>
                            <div className="absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-1 bg-[#ea580c] rounded-t-lg z-10">
                              <div className="flex items-center gap-2">
                                <Move className="w-3 h-3 text-white cursor-move" />
                                <span className="text-white text-xs font-bold">CTA</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button className="p-1 hover:bg-white/20 rounded">
                                  <Edit className="w-3 h-3 text-white" />
                                </button>
                                <button className="p-1 hover:bg-white/20 rounded">
                                  <Trash2 className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            </div>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-12 h-3 bg-[#ea580c] rounded-full cursor-ns-resize flex items-center justify-center">
                              <div className="w-6 h-0.5 bg-white rounded-full"></div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Footer */}
                      <div
                        className={`relative group ${selectedElement === 'footer' ? 'ring-4 ring-[#ea580c] ring-offset-2' : ''} ${hoveredElement === 'footer' ? 'ring-2 ring-blue-400' : ''}`}
                        onMouseEnter={() => setHoveredElement('footer')}
                        onMouseLeave={() => setHoveredElement(null)}
                        onClick={() => setSelectedElement('footer')}
                      >
                        <div className="bg-[#1A1A1A] px-6 py-8 border-t border-[#2A2A2A]">
                          <div className="grid grid-cols-4 gap-6 mb-6">
                            {['Company', 'Product', 'Support', 'Legal'].map((section, i) => (
                              <div key={i}>
                                <h3 className="text-white font-bold mb-3 text-sm">{section}</h3>
                                <ul className="space-y-2">
                                  {['Link 1', 'Link 2', 'Link 3'].map((link, j) => (
                                    <li key={j}><a href="#" className="text-gray-400 hover:text-white transition text-xs">{link}</a></li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                          <div className="pt-6 border-t border-[#2A2A2A] flex items-center justify-between">
                            <p className="text-gray-500 text-xs">© 2026 Your Company</p>
                            <div className="flex items-center gap-3">
                              {['Twitter', 'LinkedIn'].map((social, i) => (
                                <a key={i} href="#" className="text-gray-500 hover:text-white transition text-xs">{social}</a>
                              ))}
                            </div>
                          </div>
                        </div>
                        {(selectedElement === 'footer' || hoveredElement === 'footer') && (
                          <div className="absolute -top-8 left-0 right-0 flex items-center justify-between px-2 py-1 bg-[#ea580c] rounded-t-lg z-10">
                            <div className="flex items-center gap-2">
                              <Move className="w-3 h-3 text-white cursor-move" />
                              <span className="text-white text-xs font-bold">Footer</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button className="p-1 hover:bg-white/20 rounded">
                                <Edit className="w-3 h-3 text-white" />
                              </button>
                              <button className="p-1 hover:bg-white/20 rounded">
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[600px] text-center bg-gray-50">
                      <Box className="w-16 h-16 text-gray-300 mb-4" />
                      <p className="text-gray-600 text-base mb-2">Drag components here to build your portal</p>
                      <p className="text-sm text-gray-500">Start by adding sections from the left</p>
                    </div>
                  )}
                </div>

                {/* Editing Overlay Hint */}
                <div className="absolute top-3 right-3 bg-[#ea580c] text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 z-20">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">LIVE EDITING</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="col-span-2 space-y-4">
            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-[#ea580c]" />
                Properties
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Portal Name</label>
                  <input
                    type="text"
                    defaultValue={currentPortal?.name || 'New Portal'}
                    className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Company</label>
                  <input
                    type="text"
                    defaultValue={currentPortal?.company || ''}
                    className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Status</label>
                  <select className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]/50">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-4">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                <Layers className="w-4 h-4 text-[#ea580c]" />
                Layers
              </h3>
              <div className="space-y-1 text-xs">
                {currentPortal && currentPortal.sections.length > 0 ? (
                  currentPortal.sections.map((section, index) => (
                    <div key={section.id} className="flex items-center gap-2 p-1.5 hover:bg-[#2A2A2A] rounded transition">
                      <Eye className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-300 flex-1">{section.name}</span>
                      <span className="text-xs text-gray-600">{index + 1}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-600 text-center py-3">No sections</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PENDING APPROVALS FULL VIEW
  if (viewMode === 'pending-approvals') {
    return (
      <div className="space-y-6">
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode('dashboard')}
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">Pending Portal Approvals</h1>
                <p className="text-gray-400">{pendingApprovals.length} requests awaiting review</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingApprovals.map(approval => (
            <div key={approval.id} className={`bg-[#1A1A1A] rounded-2xl border-2 ${
              approval.priority === 'urgent' ? 'border-red-500/30' :
              approval.priority === 'high' ? 'border-orange-500/30' :
              'border-[#2A2A2A]'
            } p-6`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-white">{approval.portalName}</h3>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getPriorityBadge(approval.priority)}`}>
                      {approval.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-400 mb-2">{approval.company}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Requested by:</span>
                  <span className="text-white font-medium">{approval.requestedBy}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">{approval.requestedByEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Submitted:</span>
                  <span className="text-white">{new Date(approval.requestDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Cost:</span>
                  <span className="text-white font-bold">{approval.estimatedCost}</span>
                </div>
              </div>

              <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 mb-4">
                <p className="text-sm text-gray-400 mb-3">Requested Features:</p>
                <div className="flex flex-wrap gap-2">
                  {approval.requestedFeatures.map((feature, i) => (
                    <span key={i} className="px-3 py-1 bg-[#ea580c]/20 border border-[#ea580c]/30 text-[#ea580c] text-xs font-medium rounded-lg">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 mb-4">
                <p className="text-xs text-gray-500 mb-2">Description:</p>
                <p className="text-sm text-gray-300">{approval.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleApproveRequest(approval.id)}
                  className="flex-1 px-4 py-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-xl transition font-bold flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Approve & Configure
                </button>
                <button
                  onClick={() => handleRejectRequest(approval.id)}
                  className="flex-1 px-4 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-xl transition font-bold flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // AI STUDIO LINK VIEW
  if (viewMode === 'ai-studio-link') {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-2xl border border-purple-500/30 p-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setViewMode('dashboard')}
              className="p-2 hover:bg-purple-800/30 rounded-lg transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">AI Studio for Vendor Advertising</h1>
                <p className="text-gray-300">Create professional product ads and special deals with AI assistance</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Megaphone,
              title: 'Product Ad Creator',
              description: 'Design eye-catching product advertisements with AI-generated content and visuals',
              color: 'from-blue-600 to-blue-700',
              features: ['AI Copywriting', 'Image Generation', 'Template Library', 'Multi-format Export']
            },
            {
              icon: Tag,
              title: 'Deal & Promotion Manager',
              description: 'Create limited-time offers, seasonal promotions, and exclusive deals for customers',
              color: 'from-green-600 to-green-700',
              features: ['Discount Builder', 'Countdown Timers', 'Bundle Creator', 'Email Integration']
            },
            {
              icon: BarChart3,
              title: 'Performance Analytics',
              description: 'Track ad performance, customer engagement, and ROI for your marketing campaigns',
              color: 'from-purple-600 to-purple-700',
              features: ['Real-time Stats', 'Click Tracking', 'Conversion Metrics', 'A/B Testing']
            }
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-6 hover:border-purple-500/30 transition">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 mb-4">{feature.description}</p>
                <div className="space-y-2 mb-4">
                  {feature.features.map((item, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
                <button className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  Coming Soon
                </button>
              </div>
            );
          })}
        </div>

        <div className="bg-[#1A1A1A] rounded-2xl border border-purple-500/30 p-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/30">
              <Wand2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">AI Studio Platform Coming Next</h2>
            <p className="text-gray-400 mb-6 text-lg">
              We're building a comprehensive AI-powered advertising platform for vendors and subcontractors. 
              This will enable automatic product promotion creation, deal management, and performance tracking 
              that integrates directly with customer portals.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button 
                onClick={() => toast.info('You\'ll be notified when AI Studio launches!')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl transition flex items-center gap-3 shadow-lg shadow-purple-500/20"
              >
                <Bell className="w-5 h-5" />
                Notify Me When Ready
              </button>
              <button 
                onClick={() => setViewMode('dashboard')}
                className="px-8 py-4 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white font-bold rounded-xl transition flex items-center gap-3"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
