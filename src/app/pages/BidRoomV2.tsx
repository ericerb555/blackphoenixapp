import { useState, useMemo } from 'react';
import {
  Target, Clock, DollarSign, Users, CheckCircle, XCircle, 
  AlertCircle, TrendingUp, Calendar, Search, Filter, 
  Eye, Award, Star, MessageSquare, FileText, ChevronDown,
  MapPin, Phone, Mail, Briefcase, BarChart3, Download,
  RefreshCw, Bell, Send, User, Building2, Zap, Timer,
  ThumbsUp, ThumbsDown, Flag, Info, Settings as SettingsIcon, ChevronRight,
  Upload, X, Plus, Image, Video, File, Edit2, Save, AlertTriangle,
  Grid, List, Columns, SlidersHorizontal, ArrowUpDown, Bookmark, TrendingDown
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import AIBidAssistant from '../components/AIBidAssistant';
import { BackToDashboard } from '../components/BackToDashboard';

interface Contractor {
  id: string;
  name: string;
  company: string;
  rating: number;
  completedJobs: number;
  responseRate: number;
  phone: string;
  email: string;
  specialties: string[];
  location: string;
  avatar?: string;
}

interface Bid {
  id: string;
  contractorId: string;
  amount: number;
  estimatedDuration: string;
  proposedStartDate: string;
  notes: string;
  submittedAt: string;
  status: 'pending_owner' | 'editing' | 'approved' | 'rejected' | 'sent_to_customer';
  materials: { name: string; cost: number }[];
  labor: number;
  warranty: string;
  // Territory Owner Approval & Editing
  ownerStatus: 'pending' | 'reviewing' | 'editing' | 'approved' | 'rejected';
  ownerNotes?: string;
  ownerEdits?: {
    amount?: number;
    notes?: string;
    materials?: { name: string; cost: number }[];
    labor?: number;
    editedAt?: string;
  };
  sendTo?: 'customer' | 'subcontractor';
}

interface Job {
  id: string;
  title: string;
  description: string;
  type: 'quote' | 'work-request' | 'emergency';
  jobCategory?: string;
  status: 'open' | 'bidding' | 'awarded' | 'closed';
  customerName: string;
  customerLocation: string;
  postedDate: string;
  deadline: string;
  budget: { min: number; max: number };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requirements: string[];
  attachments: string[];
  bids: Bid[];
  quoteNumber?: string;
  viewCount: number;
}

type ViewMode = 'grid' | 'list' | 'kanban';
type SortOption = 'price-low' | 'price-high' | 'rating-high' | 'rating-low' | 'timeline' | 'newest';

interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

interface FilterState {
  priceMin: number;
  priceMax: number;
  ratingMin: number;
  priority: string[];
  categories: string[];
  contractorRatingMin: number;
  responseRateMin: number;
}

export default function BidRoomV2() {
  const [activeTab, setActiveTab] = useState<'pending_approval' | 'approved' | 'sent' | 'all_jobs'>('pending_approval');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(true);
  
  // Editing state
  const [isEditingBid, setIsEditingBid] = useState(false);
  const [editedBid, setEditedBid] = useState<Partial<Bid>>({});

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    priceMin: 0,
    priceMax: 50000,
    ratingMin: 0,
    priority: [],
    categories: [],
    contractorRatingMin: 0,
    responseRateMin: 0,
  });

  // Filter presets
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([
    {
      id: 'urgent',
      name: '🔥 Urgent Jobs',
      filters: { ...filters, priority: ['urgent'] }
    },
    {
      id: 'budget',
      name: '💰 Budget Friendly',
      filters: { ...filters, priceMax: 5000 }
    },
    {
      id: 'premium',
      name: '⭐ Premium Contractors',
      filters: { ...filters, contractorRatingMin: 4.5, responseRateMin: 90 }
    }
  ]);

  // Mock contractors data
  const contractors: Record<string, Contractor> = {
    'c1': {
      id: 'c1',
      name: 'Mike Johnson',
      company: 'Johnson Plumbing Co.',
      rating: 4.8,
      completedJobs: 156,
      responseRate: 95,
      phone: '(555) 123-4567',
      email: 'mike@johnsonplumbing.com',
      specialties: ['Plumbing', 'HVAC', 'Water Heaters'],
      location: 'Downtown District'
    },
    'c2': {
      id: 'c2',
      name: 'Sarah Williams',
      company: 'Elite Electric Services',
      rating: 4.9,
      completedJobs: 203,
      responseRate: 98,
      phone: '(555) 234-5678',
      email: 'sarah@eliteelectric.com',
      specialties: ['Electrical', 'Solar', 'Smart Home'],
      location: 'North Side'
    },
    'c3': {
      id: 'c3',
      name: 'David Chen',
      company: 'Chen Construction Group',
      rating: 4.7,
      completedJobs: 89,
      responseRate: 92,
      phone: '(555) 345-6789',
      email: 'david@chenconstruction.com',
      specialties: ['General Contracting', 'Remodeling', 'Roofing'],
      location: 'West End'
    }
  };

  // Mock jobs data
  const mockJobs: Job[] = [
    {
      id: 'j1',
      title: 'Commercial HVAC System Installation',
      description: 'Full HVAC replacement for 5,000 sq ft office building',
      type: 'quote',
      jobCategory: 'HVAC',
      status: 'bidding',
      customerName: 'Acme Corp',
      customerLocation: '123 Business Blvd',
      postedDate: '2024-01-15',
      deadline: '2024-01-25',
      budget: { min: 15000, max: 25000 },
      priority: 'high',
      requirements: ['Licensed HVAC contractor', '5+ years experience', 'Commercial insurance'],
      attachments: ['blueprint.pdf', 'specs.pdf'],
      quoteNumber: 'Q-2024-001',
      viewCount: 24,
      bids: [
        {
          id: 'b1',
          contractorId: 'c1',
          amount: 18500,
          estimatedDuration: '2 weeks',
          proposedStartDate: '2024-02-01',
          notes: 'Includes premium Carrier units with 10-year warranty. We can start immediately.',
          submittedAt: '2024-01-16T10:30:00',
          status: 'pending_owner',
          ownerStatus: 'pending',
          materials: [
            { name: 'Carrier HVAC Unit', cost: 12000 },
            { name: 'Ductwork & Fittings', cost: 2500 },
            { name: 'Controls & Sensors', cost: 1500 }
          ],
          labor: 2500,
          warranty: '10 years parts, 2 years labor'
        },
        {
          id: 'b2',
          contractorId: 'c2',
          amount: 22000,
          estimatedDuration: '3 weeks',
          proposedStartDate: '2024-02-05',
          notes: 'Premium Trane system with advanced climate control. Energy efficient.',
          submittedAt: '2024-01-16T14:20:00',
          status: 'pending_owner',
          ownerStatus: 'pending',
          materials: [
            { name: 'Trane HVAC System', cost: 14000 },
            { name: 'Smart Thermostat', cost: 800 },
            { name: 'Installation Materials', cost: 3200 }
          ],
          labor: 4000,
          warranty: '12 years parts, 3 years labor'
        }
      ]
    },
    {
      id: 'j2',
      title: 'Emergency Electrical Panel Upgrade',
      description: 'Urgent electrical panel replacement due to safety concerns',
      type: 'emergency',
      jobCategory: 'Electrical',
      status: 'bidding',
      customerName: 'Smith Residence',
      customerLocation: '456 Oak Street',
      postedDate: '2024-01-16',
      deadline: '2024-01-18',
      budget: { min: 2000, max: 4000 },
      priority: 'urgent',
      requirements: ['Licensed electrician', 'Same-day availability', 'City permits'],
      attachments: ['current_panel.jpg'],
      quoteNumber: 'Q-2024-002',
      viewCount: 18,
      bids: [
        {
          id: 'b3',
          contractorId: 'c2',
          amount: 3200,
          estimatedDuration: '1 day',
          proposedStartDate: '2024-01-17',
          notes: 'Can start tomorrow morning. Will handle all permits.',
          submittedAt: '2024-01-16T16:45:00',
          status: 'pending_owner',
          ownerStatus: 'pending',
          materials: [
            { name: '200A Panel', cost: 800 },
            { name: 'Breakers & Wiring', cost: 600 },
            { name: 'Permits', cost: 300 }
          ],
          labor: 1500,
          warranty: '5 years'
        }
      ]
    },
    {
      id: 'j3',
      title: 'Office Renovation - Complete Remodel',
      description: 'Full office renovation including walls, flooring, and paint',
      type: 'work-request',
      jobCategory: 'General Contracting',
      status: 'bidding',
      customerName: 'Tech Startup Inc',
      customerLocation: '789 Innovation Way',
      postedDate: '2024-01-14',
      deadline: '2024-01-28',
      budget: { min: 30000, max: 45000 },
      priority: 'medium',
      requirements: ['General contractor license', 'Portfolio of similar work', 'References'],
      attachments: ['floor_plan.pdf', 'inspiration.jpg'],
      quoteNumber: 'Q-2024-003',
      viewCount: 31,
      bids: [
        {
          id: 'b4',
          contractorId: 'c3',
          amount: 38500,
          estimatedDuration: '4 weeks',
          proposedStartDate: '2024-02-10',
          notes: 'Experienced in modern office design. Portfolio available.',
          submittedAt: '2024-01-15T09:15:00',
          status: 'pending_owner',
          ownerStatus: 'pending',
          materials: [
            { name: 'Flooring Materials', cost: 8000 },
            { name: 'Drywall & Paint', cost: 5000 },
            { name: 'Fixtures & Hardware', cost: 4500 }
          ],
          labor: 21000,
          warranty: '2 years workmanship'
        }
      ]
    }
  ];

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = mockJobs.filter(job => {
      // Tab filter
      const tabMatch = 
        activeTab === 'all_jobs' ? true :
        activeTab === 'pending_approval' ? job.bids.some(b => b.ownerStatus === 'pending') :
        activeTab === 'approved' ? job.bids.some(b => b.ownerStatus === 'approved') :
        activeTab === 'sent' ? job.bids.some(b => b.status === 'sent_to_customer') :
        true;

      if (!tabMatch) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchMatch = 
          job.title.toLowerCase().includes(query) ||
          job.customerName.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.quoteNumber?.toLowerCase().includes(query);
        if (!searchMatch) return false;
      }

      // Priority filter
      if (filters.priority.length > 0 && !filters.priority.includes(job.priority)) {
        return false;
      }

      // Category filter
      if (filters.categories.length > 0 && job.jobCategory && !filters.categories.includes(job.jobCategory)) {
        return false;
      }

      // Price filter (check if any bid falls in range)
      const hasBidInRange = job.bids.some(bid => 
        bid.amount >= filters.priceMin && bid.amount <= filters.priceMax
      );
      if (!hasBidInRange && job.bids.length > 0) return false;

      // Contractor rating filter
      const hasHighRatedContractor = job.bids.some(bid => {
        const contractor = contractors[bid.contractorId];
        return contractor.rating >= filters.contractorRatingMin;
      });
      if (!hasHighRatedContractor && filters.contractorRatingMin > 0 && job.bids.length > 0) return false;

      // Response rate filter
      const hasHighResponseRate = job.bids.some(bid => {
        const contractor = contractors[bid.contractorId];
        return contractor.responseRate >= filters.responseRateMin;
      });
      if (!hasHighResponseRate && filters.responseRateMin > 0 && job.bids.length > 0) return false;

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          const aMinPrice = Math.min(...a.bids.map(bid => bid.amount));
          const bMinPrice = Math.min(...b.bids.map(bid => bid.amount));
          return aMinPrice - bMinPrice;
        case 'price-high':
          const aMaxPrice = Math.max(...a.bids.map(bid => bid.amount));
          const bMaxPrice = Math.max(...b.bids.map(bid => bid.amount));
          return bMaxPrice - aMaxPrice;
        case 'rating-high':
          const aMaxRating = Math.max(...a.bids.map(bid => contractors[bid.contractorId].rating));
          const bMaxRating = Math.max(...b.bids.map(bid => contractors[bid.contractorId].rating));
          return bMaxRating - aMaxRating;
        case 'rating-low':
          const aMinRating = Math.min(...a.bids.map(bid => contractors[bid.contractorId].rating));
          const bMinRating = Math.min(...b.bids.map(bid => contractors[bid.contractorId].rating));
          return aMinRating - bMinRating;
        case 'timeline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'newest':
        default:
          return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
      }
    });

    return filtered;
  }, [mockJobs, activeTab, searchQuery, filters, sortBy, contractors]);

  const handleViewBid = (bid: Bid, job: Job) => {
    setSelectedBid(bid);
    setSelectedJob(job);
    setShowBidModal(true);
    setIsEditingBid(false);
    setEditedBid({});
  };

  const handleEditBid = (bid: Bid) => {
    setIsEditingBid(true);
    setEditedBid({
      amount: bid.amount,
      notes: bid.notes,
      materials: bid.materials,
      labor: bid.labor
    });
  };

  const handleSaveEdit = () => {
    toast.success('Bid edits saved successfully');
    setIsEditingBid(false);
    // In production, save to backend
  };

  const handleApproveBid = (sendTo: 'customer' | 'subcontractor') => {
    toast.success(`Bid approved and sent to ${sendTo}`);
    setShowBidModal(false);
    // In production, update backend
  };

  const handleRejectBid = () => {
    toast.error('Bid rejected');
    setShowBidModal(false);
    // In production, update backend
  };

  const applyFilterPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
    toast.success(`Applied filter: ${preset.name}`);
  };

  const resetFilters = () => {
    setFilters({
      priceMin: 0,
      priceMax: 50000,
      ratingMin: 0,
      priority: [],
      categories: [],
      contractorRatingMin: 0,
      responseRateMin: 0,
    });
    toast.info('Filters reset');
  };

  const getOwnerStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-semibold rounded-full">⏳ Pending Review</span>;
      case 'reviewing':
        return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-semibold rounded-full">👀 Reviewing</span>;
      case 'editing':
        return <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-sm font-semibold rounded-full">✏️ Editing</span>;
      case 'approved':
        return <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-semibold rounded-full">✅ Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-semibold rounded-full">❌ Rejected</span>;
      default:
        return null;
    }
  };

  // Stats
  const stats = {
    pendingApproval: mockJobs.reduce((sum, job) => sum + job.bids.filter(b => b.ownerStatus === 'pending').length, 0),
    approved: mockJobs.reduce((sum, job) => sum + job.bids.filter(b => b.ownerStatus === 'approved').length, 0),
    sent: mockJobs.reduce((sum, job) => sum + job.bids.filter(b => b.status === 'sent_to_customer').length, 0),
    editing: mockJobs.reduce((sum, job) => sum + job.bids.filter(b => b.ownerStatus === 'editing').length, 0),
    totalBids: mockJobs.reduce((sum, job) => sum + job.bids.length, 0)
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <BackToDashboard />
      
      {/* Header */}
      <div className="bg-[#0A0A0A] border-b-2 border-orange-500/50 p-8 shadow-2xl">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🏆 Bid Management Center</h1>
              <p className="text-gray-400">Review, edit, and approve contractor bids with advanced filtering</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all">
                <Bell className="w-5 h-5" />
                <span className="font-semibold">3 New</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-100">Pending</p>
                <Clock className="w-5 h-5 text-yellow-300" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.pendingApproval}</p>
              <p className="text-sm text-orange-100 mt-1">Awaiting review</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-100">Approved</p>
                <CheckCircle className="w-5 h-5 text-green-300" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.approved}</p>
              <p className="text-sm text-orange-100 mt-1">Ready to send</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-100">Sent</p>
                <Send className="w-5 h-5 text-blue-300" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.sent}</p>
              <p className="text-sm text-orange-100 mt-1">Delivered</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-100">Editing</p>
                <Edit2 className="w-5 h-5 text-purple-300" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.editing}</p>
              <p className="text-sm text-orange-100 mt-1">In progress</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-100">Total Bids</p>
                <BarChart3 className="w-5 h-5 text-blue-300" />
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalBids}</p>
              <p className="text-sm text-orange-100 mt-1">All responses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-6">
        {/* Top Controls */}
        <div className="flex items-center gap-4 mb-6">
          {/* Tab Navigation */}
          <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('pending_approval')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                  activeTab === 'pending_approval'
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/50'
                    : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                ⏳ Pending ({stats.pendingApproval})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                  activeTab === 'approved'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                ✅ Approved ({stats.approved})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                  activeTab === 'sent'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                📤 Sent
              </button>
              <button
                onClick={() => setActiveTab('all_jobs')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm ${
                  activeTab === 'all_jobs'
                    ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                📋 All Jobs
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2 flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30' : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
              }`}
              title="Grid View"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30' : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
              }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'kanban' ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30' : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
              }`}
              title="Kanban View"
            >
              <Columns className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              showFilters 
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/30' 
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            Filters
          </button>
        </div>

        {/* Search & Sort Bar */}
        <div className="flex items-center gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-3.5">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs, customers, quote numbers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-3.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white outline-none appearance-none pr-10 cursor-pointer hover:border-orange-500/50 transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating-high">Rating: High to Low</option>
              <option value="rating-low">Rating: Low to High</option>
              <option value="timeline">Deadline: Soonest</option>
            </select>
            <ArrowUpDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Results Count */}
          <div className="px-4 py-3.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-gray-400 font-medium">
            {filteredAndSortedJobs.length} {filteredAndSortedJobs.length === 1 ? 'result' : 'results'}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-80 flex-shrink-0 space-y-4">
              {/* Filter Presets */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-orange-500" />
                    Quick Filters
                  </h3>
                </div>
                <div className="space-y-2">
                  {filterPresets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => applyFilterPreset(preset)}
                      className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-left text-white hover:border-orange-500/50 hover:bg-[#1A1A1A] transition-all font-medium"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  Price Range
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Min: ${filters.priceMin.toLocaleString()}</label>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="1000"
                      value={filters.priceMin}
                      onChange={(e) => setFilters({ ...filters, priceMin: parseInt(e.target.value) })}
                      className="w-full accent-orange-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Max: ${filters.priceMax.toLocaleString()}</label>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="1000"
                      value={filters.priceMax}
                      onChange={(e) => setFilters({ ...filters, priceMax: parseInt(e.target.value) })}
                      className="w-full accent-orange-600"
                    />
                  </div>
                </div>
              </div>

              {/* Contractor Rating */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  Contractor Rating
                </h3>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Min Rating: {filters.contractorRatingMin > 0 ? filters.contractorRatingMin.toFixed(1) : 'Any'}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={filters.contractorRatingMin}
                    onChange={(e) => setFilters({ ...filters, contractorRatingMin: parseFloat(e.target.value) })}
                    className="w-full accent-orange-600"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Any</span>
                    <span>⭐ 5.0</span>
                  </div>
                </div>
              </div>

              {/* Response Rate */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Response Rate
                </h3>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    Min: {filters.responseRateMin}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={filters.responseRateMin}
                    onChange={(e) => setFilters({ ...filters, responseRateMin: parseInt(e.target.value) })}
                    className="w-full accent-orange-600"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Priority Filter */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-400" />
                  Priority
                </h3>
                <div className="space-y-2">
                  {['urgent', 'high', 'medium', 'low'].map(priority => (
                    <label key={priority} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.priority.includes(priority)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, priority: [...filters.priority, priority] });
                          } else {
                            setFilters({ ...filters, priority: filters.priority.filter(p => p !== priority) });
                          }
                        }}
                        className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] checked:bg-orange-600 checked:border-orange-600 cursor-pointer"
                      />
                      <span className="text-white capitalize group-hover:text-orange-400 transition-colors">
                        {priority === 'urgent' && '🔥'} {priority === 'high' && '⚠️'} {priority === 'medium' && '📊'} {priority === 'low' && '📋'} {priority}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-400" />
                  Categories
                </h3>
                <div className="space-y-2">
                  {['HVAC', 'Electrical', 'Plumbing', 'General Contracting'].map(category => (
                    <label key={category} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({ ...filters, categories: [...filters.categories, category] });
                          } else {
                            setFilters({ ...filters, categories: filters.categories.filter(c => c !== category) });
                          }
                        }}
                        className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] checked:bg-orange-600 checked:border-orange-600 cursor-pointer"
                      />
                      <span className="text-white group-hover:text-orange-400 transition-colors">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetFilters}
                className="w-full px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-all font-semibold flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Reset All Filters
              </button>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Jobs Grid/List View */}
            {filteredAndSortedJobs.length === 0 ? (
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-300 mb-3">No Matching Bids</h3>
                <p className="text-gray-400 mb-6">
                  {activeTab === 'pending_approval' && 'No pending bids match your filters'}
                  {activeTab === 'approved' && 'No approved bids match your filters'}
                  {activeTab === 'sent' && 'No sent bids match your filters'}
                  {activeTab === 'all_jobs' && 'No jobs match your current filters'}
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all font-semibold"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' ? 'grid grid-cols-1 gap-5' :
                viewMode === 'list' ? 'space-y-3' :
                'grid grid-cols-3 gap-4'
              }>
                {filteredAndSortedJobs.map(job => (
                  <div 
                    key={job.id} 
                    className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10 transition-all group"
                  >
                    {/* Job Header with Gradient Accent */}
                    <div className="bg-gradient-to-r from-orange-600/10 to-orange-700/10 border-b border-[#2A2A2A] p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                              {job.title}
                            </h3>
                            {job.quoteNumber && (
                              <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-bold rounded-full">
                                {job.quoteNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-3 py-1 text-sm font-bold rounded-full flex items-center gap-1 ${
                              job.priority === 'urgent' ? 'bg-red-500/20 border border-red-500/30 text-red-300' :
                              job.priority === 'high' ? 'bg-orange-500/20 border border-orange-500/30 text-orange-300' :
                              job.priority === 'medium' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300' :
                              'bg-gray-500/20 border border-gray-500/30 text-gray-300'
                            }`}>
                              {job.priority === 'urgent' && '🔥'}
                              {job.priority === 'high' && '⚠️'}
                              {job.priority === 'medium' && '📊'}
                              {job.priority === 'low' && '📋'}
                              {job.priority.toUpperCase()}
                            </span>
                            {job.jobCategory && (
                              <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-bold rounded-full">
                                {job.jobCategory}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Eye className="w-4 h-4" />
                          <span>{job.viewCount}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-5 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">{job.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-500" />
                          <span>{job.customerLocation}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <span className="font-semibold text-green-300">
                            ${job.budget.min.toLocaleString()} - ${job.budget.max.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-300 font-medium">
                            Due {new Date(job.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bids List */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                          Contractor Bids ({job.bids.length})
                        </h4>
                      </div>
                      
                      {job.bids.map(bid => {
                        const contractor = contractors[bid.contractorId];
                        return (
                          <div
                            key={bid.id}
                            onClick={() => handleViewBid(bid, job)}
                            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer transition-all group/bid"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                {/* Avatar */}
                                <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                  {contractor.name.charAt(0)}
                                </div>
                                
                                {/* Contractor Info */}
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1.5">
                                    <h4 className="font-bold text-white text-lg group-hover/bid:text-orange-400 transition-colors">
                                      {contractor.company}
                                    </h4>
                                    {getOwnerStatusBadge(bid.ownerStatus)}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                      <span className="font-semibold text-yellow-300">{contractor.rating}</span>
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle className="w-4 h-4 text-green-400" />
                                      <span>{contractor.completedJobs} jobs</span>
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1.5">
                                      <TrendingUp className="w-4 h-4 text-blue-400" />
                                      <span>{contractor.responseRate}% response</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Bid Amount */}
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-green-400">
                                    ${bid.amount.toLocaleString()}
                                  </div>
                                  <div className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {bid.estimatedDuration}
                                  </div>
                                </div>

                                {/* Arrow */}
                                <ChevronRight className="w-6 h-6 text-gray-500 group-hover/bid:text-orange-400 transition-colors flex-shrink-0" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bid Detail Modal */}
      {showBidModal && selectedBid && selectedJob && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-[#2A2A2A] rounded-3xl max-w-5xl w-full my-8 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 p-6 flex items-center justify-between rounded-t-3xl border-b border-orange-700/30">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1.5 flex items-center gap-3">
                  🔍 Bid Review & Approval
                </h2>
                <p className="text-orange-100 text-lg">{selectedJob.title}</p>
              </div>
              <button
                onClick={() => setShowBidModal(false)}
                className="p-3 hover:bg-white/20 rounded-xl transition-all"
              >
                <X className="w-7 h-7 text-white" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              {/* Contractor Info Card */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-orange-500" />
                  Contractor Information
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Company</p>
                    <p className="text-white font-bold text-lg">{contractors[selectedBid.contractorId].company}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Contact Person</p>
                    <p className="text-white font-semibold">{contractors[selectedBid.contractorId].name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Rating</p>
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-white font-bold text-lg">{contractors[selectedBid.contractorId].rating}</span>
                      <span className="text-gray-400">/ 5.0</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Completed Jobs</p>
                    <p className="text-white font-bold text-lg">{contractors[selectedBid.contractorId].completedJobs}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Response Rate</p>
                    <p className="text-white font-bold text-lg">{contractors[selectedBid.contractorId].responseRate}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Location</p>
                    <p className="text-white font-semibold">{contractors[selectedBid.contractorId].location}</p>
                  </div>
                </div>
              </div>

              {/* Bid Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Bid Amount */}
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-7 h-7 text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Bid Amount</h3>
                  </div>
                  {isEditingBid ? (
                    <input
                      type="number"
                      value={editedBid.amount || selectedBid.amount}
                      onChange={(e) => setEditedBid({ ...editedBid, amount: parseFloat(e.target.value) })}
                      className="w-full px-5 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-3xl font-bold text-white outline-none focus:border-orange-500"
                    />
                  ) : (
                    <p className="text-4xl font-bold text-green-400">
                      ${(selectedBid.ownerEdits?.amount || selectedBid.amount).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Timeline */}
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Timeline</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Duration</p>
                      <p className="text-2xl font-bold text-blue-300">{selectedBid.estimatedDuration}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Start Date</p>
                      <p className="text-lg font-semibold text-white">
                        {new Date(selectedBid.proposedStartDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Materials Breakdown */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-purple-400" />
                  Materials Breakdown
                </h3>
                <div className="space-y-3">
                  {(selectedBid.ownerEdits?.materials || selectedBid.materials).map((material, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl">
                      <span className="text-white font-medium">{material.name}</span>
                      <span className="text-green-400 font-bold text-lg">${material.cost.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
                    <span className="text-white font-bold">Labor Cost</span>
                    <span className="text-orange-400 font-bold text-lg">
                      ${(selectedBid.ownerEdits?.labor || selectedBid.labor).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warranty */}
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-3">
                  <Award className="w-6 h-6 text-purple-400" />
                  Warranty
                </h3>
                <p className="text-purple-200 text-lg font-medium">{selectedBid.warranty}</p>
              </div>

              {/* Notes */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                  Contractor Notes
                </h3>
                {isEditingBid ? (
                  <textarea
                    value={editedBid.notes || selectedBid.notes}
                    onChange={(e) => setEditedBid({ ...editedBid, notes: e.target.value })}
                    rows={5}
                    className="w-full px-5 py-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white resize-none outline-none focus:border-orange-500"
                  />
                ) : (
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {selectedBid.ownerEdits?.notes || selectedBid.notes}
                  </p>
                )}
              </div>

              {/* Owner Notes */}
              {selectedBid.ownerNotes && (
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-yellow-400" />
                    <h3 className="text-xl font-bold text-yellow-300">Your Review Notes</h3>
                  </div>
                  <p className="text-yellow-100 text-lg leading-relaxed">{selectedBid.ownerNotes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                {isEditingBid ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl hover:shadow-2xl hover:shadow-purple-500/40 transition-all font-bold text-lg"
                    >
                      <Save className="w-6 h-6" />
                      Save Edits
                    </button>
                    <button
                      onClick={() => setIsEditingBid(false)}
                      className="px-8 py-5 bg-[#2A2A2A] text-white rounded-2xl hover:bg-[#3A3A3A] transition-all font-bold text-lg"
                    >
                      Cancel
                    </button>
                  </>
                ) : selectedBid.ownerStatus === 'approved' ? (
                  <div className="flex-1 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-2xl p-8 text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <p className="text-green-300 font-bold text-xl mb-2">✅ This bid has been approved</p>
                    <p className="text-gray-400">
                      {selectedBid.sendTo === 'customer' ? 'Sent to customer' : 'Sent to subcontractor'}
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleEditBid(selectedBid)}
                      className="flex items-center gap-3 px-6 py-5 bg-purple-500/20 border-2 border-purple-500/40 text-purple-300 rounded-2xl hover:bg-purple-500/30 transition-all font-bold text-lg"
                    >
                      <Edit2 className="w-6 h-6" />
                      Edit Bid
                    </button>
                    <button
                      onClick={() => handleApproveBid('customer')}
                      className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl hover:shadow-2xl hover:shadow-green-500/40 transition-all font-bold text-lg"
                    >
                      <CheckCircle className="w-6 h-6" />
                      Approve & Send to Customer
                    </button>
                    <button
                      onClick={() => handleApproveBid('subcontractor')}
                      className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl hover:shadow-2xl hover:shadow-blue-500/40 transition-all font-bold text-lg"
                    >
                      <Send className="w-6 h-6" />
                      Send to Subcontractor
                    </button>
                    <button
                      onClick={handleRejectBid}
                      className="px-6 py-5 bg-red-500/20 border-2 border-red-500/40 text-red-300 rounded-2xl hover:bg-red-500/30 transition-all font-bold text-lg"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
