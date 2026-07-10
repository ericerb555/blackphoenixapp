/**
 * Portal Creation Wizard - Constants
 * Centralized configuration and template definitions
 */

import {
  User, Briefcase, Wrench, ShoppingBag, Building2, Crown,
  Zap, Home, Award, Wallet, Sparkles
} from 'lucide-react';
import { PortalTemplate } from './types';

export const PORTAL_TEMPLATES: PortalTemplate[] = [
  {
    id: 'customer',
    name: 'Customer Portal',
    type: 'customer',
    description: 'Customer-facing portal for projects, quotes, invoices, and support',
    icon: User,
    color: 'blue',
    recommendedFor: ['Client Communication', 'Project Tracking', 'Invoice Management'],
    features: ['Dashboard', 'Projects', 'Quotes', 'Invoices', 'Payments', 'Messages', 'Media', 'Subscription'],
    workflows: ['Quote Approval', 'Invoice Payment', 'Project Updates', 'Work Requests'],
    trackingSystems: ['Customer ID', 'Project Codes', 'Invoice Numbers', 'Quote Tracking'],
    aiSuggestion: 'Ideal for B2C businesses needing customer self-service portals'
  },
  {
    id: 'employee',
    name: 'Employee Portal',
    type: 'employee',
    description: 'Internal portal for task management, scheduling, and time tracking',
    icon: Briefcase,
    color: 'green',
    recommendedFor: ['Internal Team', 'Time Tracking', 'Task Management'],
    features: ['Dashboard', 'Tasks', 'Schedule', 'Timesheet', 'Team', 'Resources', 'Payroll', 'Announcements'],
    workflows: ['Clock In/Out', 'Task Assignment', 'Leave Requests', 'Timesheet Approval'],
    trackingSystems: ['Employee ID', 'Time Tracking', 'Task Codes', 'Department Codes'],
    aiSuggestion: 'Perfect for managing internal teams and workforce operations'
  },
  {
    id: 'subcontractor',
    name: 'Subcontractor Portal',
    type: 'subcontractor',
    description: 'Portal for managing subcontractors, jobs, and payments',
    icon: Wrench,
    color: 'orange',
    recommendedFor: ['Contractor Management', 'Job Tracking', 'Payment Processing'],
    features: ['Dashboard', 'Jobs', 'Invoices', 'Schedule', 'Payments', 'Messages', 'Profile', 'Resources'],
    workflows: ['Job Assignment', 'Invoice Submission', 'Payment Processing', 'Schedule Coordination'],
    trackingSystems: ['Contractor ID', 'Job Codes', 'Invoice Tracking', 'Payment Records'],
    aiSuggestion: 'Essential for construction and service businesses with subcontractors'
  },
  {
    id: 'vendor',
    name: 'Vendor Portal',
    type: 'vendor',
    description: 'Advertising and promotion portal for vendor partnerships',
    icon: ShoppingBag,
    color: 'purple',
    recommendedFor: ['Vendor Management', 'Advertising', 'Lead Generation'],
    features: ['Dashboard', 'Promotions', 'Analytics', 'Studio', 'Leads', 'Profile', 'Billing'],
    workflows: ['Promotion Approval', 'Lead Distribution', 'Billing Cycles', 'Content Creation'],
    trackingSystems: ['Vendor ID', 'Promotion Codes', 'Lead Tracking', 'Campaign Analytics'],
    aiSuggestion: 'Great for platforms with advertising or marketplace features'
  },
  {
    id: 'technician',
    name: 'Technician App',
    type: 'technician',
    description: 'Mobile-first app for field technicians with GPS tracking',
    icon: Zap,
    color: 'yellow',
    recommendedFor: ['Field Service', 'Mobile Workforce', 'GPS Tracking'],
    features: ['Dashboard', 'Time Tracking', 'Jobs', 'Messages', 'Referrals', 'Earnings', 'Assets'],
    workflows: ['GPS Clock In', 'Job Check-In', 'Work Completion', 'Photo Upload'],
    trackingSystems: ['Tech ID', 'GPS Tracking', 'Job Codes', 'Time Stamps', 'Asset Tracking'],
    aiSuggestion: 'Optimized for mobile field workers with real-time location tracking'
  },
  {
    id: 'property-manager',
    name: 'Property Manager Portal',
    type: 'property-manager',
    description: 'Portal for property managers to handle maintenance and residents',
    icon: Building2,
    color: 'pink',
    recommendedFor: ['Property Management', 'Maintenance', 'Resident Relations'],
    features: ['Dashboard', 'Maintenance', 'Vendors', 'Budget', 'Residents', 'Reports'],
    workflows: ['Maintenance Requests', 'Vendor Assignment', 'Budget Approval', 'Resident Communication'],
    trackingSystems: ['Property Code', 'Unit Numbers', 'Work Orders', 'Vendor Tracking'],
    aiSuggestion: 'Designed for residential and commercial property management'
  },
  {
    id: 'portfolio-manager',
    name: 'Portfolio Manager Portal',
    type: 'portfolio-manager',
    description: 'Executive portal for managing property portfolios and investments',
    icon: Crown,
    color: 'cyan',
    recommendedFor: ['Executive Management', 'Portfolio Analysis', 'Investment Tracking'],
    features: ['Dashboard', 'Properties', 'Performance', 'Cash Flow', 'Acquisitions', 'Reports'],
    workflows: ['Property Analysis', 'Acquisition Pipeline', 'ROI Tracking', 'Financial Reporting'],
    trackingSystems: ['Portfolio Code', 'Property IDs', 'Investment Tracking', 'Performance Metrics'],
    aiSuggestion: 'For executives managing multiple properties or investments'
  },
  {
    id: 'owners',
    name: 'Owners Portal',
    type: 'owners',
    description: 'High-level portal for business owners and executives',
    icon: Home,
    color: 'indigo',
    recommendedFor: ['Business Owners', 'Executive Dashboard', 'Financial Overview'],
    features: ['Dashboard', 'Projects', 'Properties', 'Cash Flow', 'Performance', 'Analytics', 'Reports'],
    workflows: ['Executive Reporting', 'Financial Analysis', 'Strategic Planning', 'Performance Review'],
    trackingSystems: ['Owner ID', 'Business Metrics', 'Financial KPIs', 'Project Codes'],
    aiSuggestion: 'Perfect for business owners needing high-level oversight'
  },
  {
    id: 'professional',
    name: 'Professional Portal',
    type: 'professional',
    description: 'Portal for licensed professionals and consultants',
    icon: Award,
    color: 'teal',
    recommendedFor: ['Licensed Professionals', 'Consulting', 'Project Management'],
    features: ['Dashboard', 'Projects', 'Clients', 'Documents', 'Billing', 'Calendar', 'Reports'],
    workflows: ['Client Onboarding', 'Project Lifecycle', 'Invoice Generation', 'Document Management'],
    trackingSystems: ['Professional ID', 'License Tracking', 'Project Codes', 'Client IDs'],
    aiSuggestion: 'Tailored for architects, engineers, and consultants'
  },
  {
    id: 'bank',
    name: 'Banking Portal',
    type: 'bank',
    description: 'Financial institution portal with ISO20022 compliance',
    icon: Wallet,
    color: 'emerald',
    recommendedFor: ['Banks', 'Credit Unions', 'Financial Services'],
    features: ['Dashboard', 'Accounts', 'Transactions', 'Payments', 'Documents', 'Support', 'Settings'],
    workflows: ['Account Opening', 'Transaction Processing', 'Loan Applications', 'KYC Verification'],
    trackingSystems: ['Account Numbers', 'Transaction IDs', 'Customer IDs', 'ISO20022 Codes'],
    aiSuggestion: 'Fully compliant with financial industry standards and regulations'
  },
  {
    id: 'custom',
    name: 'Custom Portal',
    type: 'custom',
    description: 'Build a custom portal from scratch with AI assistance',
    icon: Sparkles,
    color: 'gradient',
    recommendedFor: ['Unique Requirements', 'Special Use Cases', 'Custom Solutions'],
    features: [],
    workflows: [],
    trackingSystems: [],
    aiSuggestion: 'Let AI help you design a portal tailored to your specific needs'
  }
];

export const ALL_AVAILABLE_FEATURES = [
  'Dashboard', 'Overview', 'Profile', 'Notifications',
  'Projects', 'Tasks', 'Jobs', 'Work Orders',
  'Quotes', 'Invoices', 'Payments', 'Earnings',
  'Calendar', 'Schedule', 'Appointments',
  'Time Tracking', 'Timesheet', 'Clock In/Out',
  'Messaging', 'Announcements', 'Support',
  'Documents', 'Photos', 'Videos', 'Gallery', 'Media',
  'Reports', 'Analytics', 'Performance',
  'Vendors', 'Promotions', 'Subscription', 'Referrals',
  'Team', 'Resources', 'Payroll', 'Assets',
  'Maintenance', 'Residents', 'Properties',
  'Cash Flow', 'Acquisitions', 'Budget',
  'Studio', 'Leads', 'Billing',
  'AI Assistant', 'Integrations', 'Custom Forms'
];

export const ALL_AVAILABLE_WORKFLOWS = [
  'Quote Approval Workflow',
  'Invoice Payment Processing',
  'Project Status Updates',
  'Work Request Management',
  'Clock In/Out Automation',
  'Task Assignment System',
  'Leave Request Processing',
  'Timesheet Approval Chain',
  'Job Assignment Distribution',
  'Invoice Submission Review',
  'Payment Processing Pipeline',
  'Schedule Coordination',
  'Promotion Approval Flow',
  'Lead Distribution System',
  'Billing Cycle Automation',
  'Content Creation Workflow',
  'GPS Check-In Verification',
  'Job Completion Validation',
  'Photo Upload Processing',
  'Maintenance Request Routing',
  'Vendor Assignment Logic',
  'Budget Approval Chain',
  'Resident Communication Flow',
  'Property Analysis Pipeline',
  'Acquisition Due Diligence',
  'ROI Calculation Automation',
  'Financial Report Generation',
  'Executive Dashboard Updates',
  'Performance Review Scheduling',
  'Strategic Planning Workflow',
  'Contract Approval Process',
  'Document Review Workflow',
  'Compliance Verification',
  'Security Audit Trail'
];

export const DEFAULT_BRANDING = {
  primaryColor: '#ea580c',
  secondaryColor: '#0A0A0A',
  logoUrl: '',
  faviconUrl: '',
  customCss: ''
};

export const DEFAULT_ACCESS_CONTROL = {
  requireLogin: true,
  allowSignup: false,
  twoFactorAuth: false,
  ipWhitelist: [],
  allowedDomains: [],
  sessionTimeout: 3600
};

export const DEFAULT_TRACKING_CONFIG = {
  enabled: true,
  prefix: '',
  systems: []
};

export const DEFAULT_AI_CONFIG = {
  enabled: true,
  assistedCreation: false,
  suggestions: [],
  recommendedFeatures: []
};

export const TEMPLATE_COLORS: Record<string, string> = {
  blue: 'from-blue-600 to-blue-700',
  green: 'from-green-600 to-green-700',
  orange: 'from-orange-600 to-orange-700',
  purple: 'from-purple-600 to-purple-700',
  yellow: 'from-yellow-600 to-yellow-700',
  pink: 'from-pink-600 to-pink-700',
  cyan: 'from-cyan-600 to-cyan-700',
  indigo: 'from-indigo-600 to-indigo-700',
  teal: 'from-teal-600 to-teal-700',
  emerald: 'from-emerald-600 to-emerald-700',
  gradient: 'from-orange-600 via-purple-600 to-pink-600'
};
