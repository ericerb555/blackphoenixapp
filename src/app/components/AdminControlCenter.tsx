/**
 * Admin Control Center
 * 
 * CENTRALIZED APPROVAL HUB - All approvals go through this control panel
 * 
 * Manages ALL types of approvals across the entire platform:
 * 1. Quote Approvals - Customer quotes requiring admin sign-off
 * 2. Contract Approvals - Service agreements and contracts
 * 3. Customer Signups - New customer registration approvals
 * 4. Portal Requests - New portal creation requests
 * 5. Content Approvals - Marketing, videos, social media content
 * 6. Subscription Plans - New subscription tier approvals
 * 7. Advertiser Promotions - Paid advertising campaigns
 * 8. Subcontractor Promotions - Subcontractor marketing offers
 * 9. Referral Offers - Referral program configurations
 * 10. Maintenance Plans - Service maintenance packages
 * 11. Reels & Videos - Video content for marketing
 * 12. Social Media - Social media post approvals
 * 13. Contractor Listings - New contractor directory listings
 * 
 * This is the SINGLE source of truth for all approval workflows.
 */

import { useState } from 'react';
import {
  X, Crown, Megaphone, Wrench, Gift, Package, Video, Share2, Users,
  Check, XCircle, Clock, DollarSign, Eye, FileText, Filter, Search,
  TrendingUp, Star, Calendar, AlertCircle, ChevronDown, Edit2, Trash2,
  ExternalLink, Download, Upload, BarChart3, Settings,
  Shield, Zap, Bell, Phone, MapPin, Building, Tag, Award
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from './ui/button/PrimaryButton';
import { DangerButton } from './ui/button/DangerButton';
import { SecondaryButton } from './ui/button/SecondaryButton';
import { DataTable, DataTableColumn } from './ui/table/DataTable';

interface AdminControlCenterProps {
  onClose: () => void;
}

type Section = 
  | 'all-approvals'
  | 'quotes'
  | 'contracts'
  | 'subscriptions'
  | 'customer-signups'
  | 'advertiser-promos'
  | 'subcontractor-promos'
  | 'referral-offers'
  | 'maintenance-plans'
  | 'reels-videos'
  | 'social-media'
  | 'contractor-listings'
  | 'portals'
  | 'content';

interface ApprovalItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedDate: Date;
  amount?: number;
  paymentStatus?: 'paid' | 'pending' | 'unpaid';
  priority: 'high' | 'medium' | 'low';
  data?: any;
}

export default function AdminControlCenter({ onClose }: AdminControlCenterProps) {
  const [activeSection, setActiveSection] = useState<Section>('all-approvals');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);

  // ============================================================================
  // QUOTES & CONTRACTS - ALL QUOTE AND CONTRACT APPROVALS
  // ============================================================================
  const quotes: ApprovalItem[] = [
    {
      id: 'quote1',
      title: 'Kitchen Renovation - Johnson Residence',
      description: 'Complete kitchen remodel with custom cabinets, granite countertops, and new appliances',
      status: 'pending',
      submittedBy: 'Sarah Martinez',
      submittedDate: new Date(Date.now() - 1 * 86400000),
      amount: 45000,
      paymentStatus: 'pending',
      priority: 'high',
      data: { customer: 'Johnson Family', type: 'quote', quoteNumber: 'QT-2026-045' }
    },
    {
      id: 'quote2',
      title: 'Commercial HVAC Installation - ABC Corp',
      description: 'Industrial HVAC system for 10,000 sq ft office building',
      status: 'pending',
      submittedBy: 'Mike Rodriguez',
      submittedDate: new Date(Date.now() - 2 * 86400000),
      amount: 78000,
      paymentStatus: 'pending',
      priority: 'high',
      data: { customer: 'ABC Corporation', type: 'quote', quoteNumber: 'QT-2026-046' }
    }
  ];

  const contracts: ApprovalItem[] = [
    {
      id: 'contract1',
      title: 'Service Agreement - Smith Family',
      description: 'Annual maintenance contract with quarterly inspections',
      status: 'pending',
      submittedBy: 'John Davis',
      submittedDate: new Date(Date.now() - 1 * 86400000),
      amount: 2400,
      paymentStatus: 'pending',
      priority: 'medium',
      data: { customer: 'Smith Family', type: 'contract', contractNumber: 'CT-2026-012' }
    },
    {
      id: 'contract2',
      title: 'Construction Contract - Williams LLC',
      description: 'Major commercial renovation project',
      status: 'pending',
      submittedBy: 'Sarah Chen',
      submittedDate: new Date(Date.now() - 3 * 86400000),
      amount: 250000,
      paymentStatus: 'pending',
      priority: 'high',
      data: { customer: 'Williams LLC', type: 'contract', contractNumber: 'CT-2026-013' }
    }
  ];

  // ============================================================================
  // CUSTOMER SIGNUPS - ALL NEW CUSTOMER APPROVALS
  // ============================================================================
  const customerSignups: ApprovalItem[] = [
    {
      id: 'signup1',
      title: 'New Customer - Emily Davis',
      description: 'Residential customer signup for VIP subscription tier',
      status: 'pending',
      submittedBy: 'Emily Davis',
      submittedDate: new Date(Date.now() - 1 * 86400000),
      priority: 'high',
      data: { email: 'emily.davis@email.com', phone: '(555) 123-4567', tier: 'VIP' }
    },
    {
      id: 'signup2',
      title: 'New Customer - TechStart Industries',
      description: 'Commercial customer signup for enterprise plan',
      status: 'pending',
      submittedBy: 'TechStart Industries',
      submittedDate: new Date(Date.now() - 2 * 86400000),
      priority: 'high',
      data: { email: 'admin@techstart.com', phone: '(555) 987-6543', tier: 'Enterprise' }
    }
  ];

  // ============================================================================
  // PORTALS - PORTAL CREATION APPROVALS
  // ============================================================================
  const portals: ApprovalItem[] = [
    {
      id: 'portal1',
      title: 'Custom Vendor Portal - ABC Suppliers',
      description: 'New portal for ABC Suppliers with custom ordering workflow',
      status: 'pending',
      submittedBy: 'ABC Suppliers',
      submittedDate: new Date(Date.now() - 1 * 86400000),
      priority: 'medium',
      data: { portalType: 'Vendor', features: ['Custom Orders', 'Inventory Sync', 'Invoicing'] }
    },
    {
      id: 'portal2',
      title: 'Investor Dashboard Portal',
      description: 'Financial reporting portal for investors with real-time analytics',
      status: 'pending',
      submittedBy: 'Finance Team',
      submittedDate: new Date(Date.now() - 3 * 86400000),
      priority: 'high',
      data: { portalType: 'Investor', features: ['Financial Reports', 'Analytics', 'Document Access'] }
    }
  ];

  // ============================================================================
  // CONTENT APPROVALS - SOCIAL MEDIA, VIDEOS, MARKETING
  // ============================================================================
  const contentApprovals: ApprovalItem[] = [
    {
      id: 'content1',
      title: 'Marketing Campaign - Spring Promotion',
      description: 'Multi-channel spring promotion campaign with email, social, and web',
      status: 'pending',
      submittedBy: 'Marketing Team',
      submittedDate: new Date(Date.now() - 1 * 86400000),
      amount: 5000,
      priority: 'high',
      data: { channels: ['Email', 'Social Media', 'Website'], duration: '30 days' }
    },
    {
      id: 'content2',
      title: 'Video Content - Customer Testimonial',
      description: 'Customer testimonial video featuring satisfied clients',
      status: 'pending',
      submittedBy: 'Content Team',
      submittedDate: new Date(Date.now() - 2 * 86400000),
      priority: 'medium',
      data: { type: 'Video', duration: '2:30', platform: 'Website & YouTube' }
    }
  ];

  // Sample data for each section
  const subscriptionPlans: ApprovalItem[] = [
    {
      id: 'sub1',
      title: 'Pro Plan',
      description: '8 labor hours/month, priority support, 24/7 emergency service, 15% material discount',
      status: 'pending',
      submittedBy: 'Admin Team',
      submittedDate: new Date(Date.now() - 2 * 86400000),
      amount: 149,
      paymentStatus: 'paid',
      priority: 'high',
      data: { hours: 8, features: ['Priority Support', '24/7 Emergency', '15% Discount'] }
    },
    {
      id: 'sub2',
      title: 'Premium Plan',
      description: '15 labor hours/month, dedicated manager, unlimited support',
      status: 'approved',
      submittedBy: 'Sarah Martinez',
      submittedDate: new Date(Date.now() - 5 * 86400000),
      amount: 299,
      paymentStatus: 'paid',
      priority: 'medium',
      data: { hours: 15, features: ['Dedicated Manager', 'Unlimited Support'] }
    }
  ];

  const advertiserPromos: ApprovalItem[] = [
    {
      id: 'ad1',
      title: 'Winter HVAC Special - Elite HVAC Solutions',
      description: '20% off all HVAC installations. Banner ad on customer dashboard.',
      status: 'pending',
      submittedBy: 'Elite HVAC Solutions',
      submittedDate: new Date(Date.now() - 1 * 86400000),
      amount: 500,
      paymentStatus: 'paid',
      priority: 'high',
      data: { duration: '30 days', placement: 'Dashboard Top', impressions: 0 }
    },
    {
      id: 'ad2',
      title: 'Spring Roofing Promotion - Pro Roofing Co',
      description: 'Free inspection with any roofing service',
      status: 'approved',
      submittedBy: 'Pro Roofing Co',
      submittedDate: new Date(Date.now() - 7 * 86400000),
      amount: 350,
      paymentStatus: 'paid',
      priority: 'medium',
      data: { duration: '45 days', placement: 'Directory', impressions: 1247 }
    }
  ];

  const subcontractorPromos: ApprovalItem[] = [
    {
      id: 'sp1',
      title: 'Spring Plumbing Special - ProPlumb Masters',
      description: '10% off all plumbing services for new customers',
      status: 'pending',
      submittedBy: 'ProPlumb Masters',
      submittedDate: new Date(Date.now() - 3 * 86400000),
      amount: 50,
      paymentStatus: 'pending',
      priority: 'medium',
      data: { duration: '30 days', discount: '10%' }
    }
  ];

  const referralOffers: ApprovalItem[] = [
    {
      id: 'ref1',
      title: 'Universal Referral Program',
      description: 'Referrer earns $50, referee gets $25 off first service',
      status: 'approved',
      submittedBy: 'Marketing Team',
      submittedDate: new Date(Date.now() - 14 * 86400000),
      priority: 'high',
      data: { referrerReward: 50, refereeReward: 25, eligibility: 'All users' }
    }
  ];

  const maintenancePlans: ApprovalItem[] = [
    {
      id: 'mp1',
      title: 'Annual Home Maintenance Package',
      description: '4 seasonal inspections, priority scheduling, 10% parts discount',
      status: 'pending',
      submittedBy: 'Service Team',
      submittedDate: new Date(Date.now() - 4 * 86400000),
      amount: 299,
      priority: 'high',
      data: { visits: 4, frequency: 'Quarterly', discount: '10%' }
    },
    {
      id: 'mp2',
      title: 'Premium HVAC Care Plan',
      description: 'Monthly HVAC inspections, filter replacements, priority emergency service',
      status: 'approved',
      submittedBy: 'HVAC Department',
      submittedDate: new Date(Date.now() - 10 * 86400000),
      amount: 499,
      priority: 'medium',
      data: { visits: 12, frequency: 'Monthly', features: ['Filter Replacement', 'Priority Emergency'] }
    }
  ];

  const reelsVideos: ApprovalItem[] = [
    {
      id: 'rv1',
      title: 'Kitchen Renovation Timelapse',
      description: 'Amazing kitchen transformation in 45 seconds',
      status: 'pending',
      submittedBy: 'Mike Stevens',
      submittedDate: new Date(Date.now() - 1 * 86400000),
      priority: 'medium',
      data: { duration: '0:45', category: 'Before & After', tags: ['kitchen', 'renovation'] }
    },
    {
      id: 'rv2',
      title: 'Bathroom Remodel Showcase',
      description: 'Luxury bathroom renovation before and after',
      status: 'approved',
      submittedBy: 'Jennifer Lee',
      submittedDate: new Date(Date.now() - 8 * 86400000),
      priority: 'low',
      data: { duration: '1:12', category: 'Showcase', tags: ['bathroom', 'luxury'], views: 3421 }
    }
  ];

  const socialMedia: ApprovalItem[] = [
    {
      id: 'sm1',
      title: 'DIY Home Maintenance Tips',
      description: '5 winter maintenance tips every homeowner should know',
      status: 'pending',
      submittedBy: 'Content Team',
      submittedDate: new Date(Date.now() - 2 * 86400000),
      priority: 'medium',
      data: { platform: 'Instagram, Facebook', scheduledFor: 'Tomorrow 10:00 AM' }
    },
    {
      id: 'sm2',
      title: 'Customer Success Story',
      description: 'Featured project: Complete home renovation in 6 weeks',
      status: 'approved',
      submittedBy: 'Marketing Team',
      submittedDate: new Date(Date.now() - 6 * 86400000),
      priority: 'low',
      data: { platform: 'All platforms', engagement: { likes: 847, shares: 123, comments: 56 } }
    }
  ];

  const contractorListings: ApprovalItem[] = [
    {
      id: 'cl1',
      title: 'QuickFix HVAC',
      description: 'Professional HVAC services. EPA Certified, Licensed, Insured. 8 years experience.',
      status: 'pending',
      submittedBy: 'QuickFix HVAC',
      submittedDate: new Date(Date.now() - 3 * 86400000),
      amount: 0,
      priority: 'high',
      data: { category: 'HVAC', rating: 4.6, reviews: 89, certifications: ['EPA', 'Licensed', 'Insured'] }
    },
    {
      id: 'cl2',
      title: 'ProPlumb Masters',
      description: 'Licensed plumbing contractor with 15+ years experience',
      status: 'approved',
      submittedBy: 'ProPlumb Masters',
      submittedDate: new Date(Date.now() - 12 * 86400000),
      amount: 99,
      paymentStatus: 'paid',
      priority: 'medium',
      data: { category: 'Plumbing', rating: 4.8, reviews: 234, tier: 'Featured' }
    }
  ];



  // Get data for current section
  const getCurrentData = (): ApprovalItem[] => {
    switch (activeSection) {
      case 'all-approvals': 
        return [...quotes, ...contracts, ...customerSignups, ...portals, ...contentApprovals, ...subscriptionPlans, ...advertiserPromos, ...subcontractorPromos, ...referralOffers, ...maintenancePlans, ...reelsVideos, ...socialMedia, ...contractorListings];
      case 'quotes': return quotes;
      case 'contracts': return contracts;
      case 'customer-signups': return customerSignups;
      case 'portals': return portals;
      case 'content': return contentApprovals;
      case 'subscriptions': return subscriptionPlans;
      case 'advertiser-promos': return advertiserPromos;
      case 'subcontractor-promos': return subcontractorPromos;
      case 'referral-offers': return referralOffers;
      case 'maintenance-plans': return maintenancePlans;
      case 'reels-videos': return reelsVideos;
      case 'social-media': return socialMedia;
      case 'contractor-listings': return contractorListings;
      default: return [];
    }
  };

  // Filter data
  const filteredData = getCurrentData().filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.submittedBy.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Statistics
  const stats = {
    total: getCurrentData().length,
    pending: getCurrentData().filter(i => i.status === 'pending').length,
    approved: getCurrentData().filter(i => i.status === 'approved').length,
    rejected: getCurrentData().filter(i => i.status === 'rejected').length
  };

  // Handle actions
  const handleApprove = (id: string) => {
    toast.success('Item approved successfully');
    setSelectedItem(null);
  };

  const handleReject = (id: string) => {
    toast.error('Item rejected');
    setSelectedItem(null);
  };

  // Section configurations
  const sections = [
    { id: 'all-approvals' as Section, label: 'All Pending', icon: AlertCircle, color: 'text-orange-400', count: [...quotes, ...contracts, ...customerSignups, ...portals, ...contentApprovals, ...subscriptionPlans, ...advertiserPromos, ...subcontractorPromos, ...referralOffers, ...maintenancePlans, ...reelsVideos, ...socialMedia, ...contractorListings].filter(i => i.status === 'pending').length },
    { id: 'quotes' as Section, label: 'Quote Approvals', icon: FileText, color: 'text-blue-400', count: quotes.filter(i => i.status === 'pending').length },
    { id: 'contracts' as Section, label: 'Contract Approvals', icon: FileText, color: 'text-green-400', count: contracts.filter(i => i.status === 'pending').length },
    { id: 'customer-signups' as Section, label: 'Customer Signups', icon: Users, color: 'text-cyan-400', count: customerSignups.filter(i => i.status === 'pending').length },
    { id: 'portals' as Section, label: 'Portal Requests', icon: Shield, color: 'text-purple-400', count: portals.filter(i => i.status === 'pending').length },
    { id: 'content' as Section, label: 'Content Approvals', icon: Video, color: 'text-pink-400', count: contentApprovals.filter(i => i.status === 'pending').length },
    { id: 'subscriptions' as Section, label: 'Subscription Plans', icon: Crown, color: 'text-yellow-400', count: subscriptionPlans.filter(i => i.status === 'pending').length },
    { id: 'advertiser-promos' as Section, label: 'Advertiser Promotions', icon: Megaphone, color: 'text-blue-400', count: advertiserPromos.filter(i => i.status === 'pending').length },
    { id: 'subcontractor-promos' as Section, label: 'Subcontractor Promos', icon: Wrench, color: 'text-green-400', count: subcontractorPromos.filter(i => i.status === 'pending').length },
    { id: 'referral-offers' as Section, label: 'Referral Offers', icon: Gift, color: 'text-purple-400', count: referralOffers.filter(i => i.status === 'pending').length },
    { id: 'maintenance-plans' as Section, label: 'Maintenance Plans', icon: Package, color: 'text-orange-400', count: maintenancePlans.filter(i => i.status === 'pending').length },
    { id: 'reels-videos' as Section, label: 'Reels & Videos', icon: Video, color: 'text-pink-400', count: reelsVideos.filter(i => i.status === 'pending').length },
    { id: 'social-media' as Section, label: 'Social Media', icon: Share2, color: 'text-cyan-400', count: socialMedia.filter(i => i.status === 'pending').length },
    { id: 'contractor-listings' as Section, label: 'Contractor Listings', icon: Users, color: 'text-indigo-400', count: contractorListings.filter(i => i.status === 'pending').length }
  ];

  // DataTable columns
  const columns: DataTableColumn<ApprovalItem>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-white">{item.title}</div>
          <div className="text-sm text-gray-400 truncate max-w-md">{item.description}</div>
        </div>
      )
    },
    {
      key: 'submittedBy',
      header: 'Submitted By',
      sortable: true,
      render: (item) => <span className="text-gray-300">{item.submittedBy}</span>
    },
    {
      key: 'submittedDate',
      header: 'Date',
      sortable: true,
      sortFn: (a, b) => b.submittedDate.getTime() - a.submittedDate.getTime(),
      render: (item) => (
        <span className="text-gray-400 text-sm">
          {item.submittedDate.toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      sortFn: (a, b) => (a.amount || 0) - (b.amount || 0),
      align: 'right',
      render: (item) => (
        item.amount ? (
          <span className="text-green-400 font-semibold">${item.amount}</span>
        ) : (
          <span className="text-gray-500">—</span>
        )
      )
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      sortable: true,
      render: (item) => (
        item.paymentStatus ? (
          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
            item.paymentStatus === 'paid' ? 'bg-green-600/20 text-green-400' :
            item.paymentStatus === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
            'bg-red-600/20 text-red-400'
          }`}>
            {item.paymentStatus}
          </span>
        ) : (
          <span className="text-gray-500">—</span>
        )
      )
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      sortFn: (a, b) => {
        const priority = { high: 0, medium: 1, low: 2 };
        return priority[a.priority] - priority[b.priority];
      },
      render: (item) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
          item.priority === 'high' ? 'bg-red-600/20 text-red-400' :
          item.priority === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
          'bg-blue-600/20 text-blue-400'
        }`}>
          {item.priority}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => (
        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
          item.status === 'pending' ? 'bg-orange-600/20 text-orange-400' :
          item.status === 'approved' ? 'bg-green-600/20 text-green-400' :
          'bg-red-600/20 text-red-400'
        }`}>
          {item.status}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          {item.status === 'pending' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove(item.id);
                }}
                className="p-1.5 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 transition"
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReject(item.id);
                }}
                className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedItem(item);
            }}
            className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A] border-b border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Control Center</h1>
            <p className="text-gray-400">Manage all subscriptions, promotions, content, and approvals</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                  isActive
                    ? 'bg-orange-600 text-white'
                    : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white hover:border-[#3A3A3A]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : section.color}`} />
                <span className="text-sm font-medium">{section.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-white/20' : 'bg-[#2A2A2A]'
                }`}>
                  {section.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total</span>
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>

          <div className="bg-[#1A1A1A] border border-orange-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-orange-400 text-sm">Pending</span>
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-orange-400">{stats.pending}</div>
          </div>

          <div className="bg-[#1A1A1A] border border-green-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 text-sm">Approved</span>
              <Check className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
          </div>

          <div className="bg-[#1A1A1A] border border-red-600/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-red-400 text-sm">Rejected</span>
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-1">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    statusFilter === filter
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredData}
          defaultSort={{ key: 'submittedDate', direction: 'desc' }}
          pagination={true}
          pageSize={10}
          pageSizeOptions={[5, 10, 25, 50]}
          emptyMessage="No items found"
          onRowClick={(item) => setSelectedItem(item)}
        />
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-2xl w-full p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">{selectedItem.title}</h2>
                <p className="text-gray-400">{selectedItem.description}</p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Submitted By</label>
                  <p className="text-white mt-1">{selectedItem.submittedBy}</p>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Date</label>
                  <p className="text-white mt-1">{selectedItem.submittedDate.toLocaleString()}</p>
                </div>

                {selectedItem.amount && (
                  <div>
                    <label className="text-gray-400 text-sm">Amount</label>
                    <p className="text-green-400 font-semibold mt-1">${selectedItem.amount}</p>
                  </div>
                )}

                {selectedItem.paymentStatus && (
                  <div>
                    <label className="text-gray-400 text-sm">Payment Status</label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                        selectedItem.paymentStatus === 'paid' ? 'bg-green-600/20 text-green-400' :
                        selectedItem.paymentStatus === 'pending' ? 'bg-yellow-600/20 text-yellow-400' :
                        'bg-red-600/20 text-red-400'
                      }`}>
                        {selectedItem.paymentStatus}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-gray-400 text-sm">Priority</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      selectedItem.priority === 'high' ? 'bg-red-600/20 text-red-400' :
                      selectedItem.priority === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-blue-600/20 text-blue-400'
                    }`}>
                      {selectedItem.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-sm">Status</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      selectedItem.status === 'pending' ? 'bg-orange-600/20 text-orange-400' :
                      selectedItem.status === 'approved' ? 'bg-green-600/20 text-green-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      {selectedItem.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedItem.data && (
                <div>
                  <label className="text-gray-400 text-sm">Additional Details</label>
                  <pre className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-4 mt-1 text-sm text-gray-300 overflow-x-auto">
                    {JSON.stringify(selectedItem.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              {selectedItem.status === 'pending' && (
                <>
                  <DangerButton
                    onClick={() => handleReject(selectedItem.id)}
                    icon={<XCircle />}
                  >
                    Reject
                  </DangerButton>
                  <PrimaryButton
                    onClick={() => handleApprove(selectedItem.id)}
                    icon={<Check />}
                  >
                    Approve
                  </PrimaryButton>
                </>
              )}
              <SecondaryButton onClick={() => setSelectedItem(null)}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
