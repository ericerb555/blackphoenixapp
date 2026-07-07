import { useState } from 'react';
import {
  Target, Clock, DollarSign, Users, CheckCircle, XCircle, 
  AlertCircle, TrendingUp, Calendar, Search, Filter, 
  Eye, Award, Star, MessageSquare, FileText, ChevronDown,
  MapPin, Phone, Mail, Briefcase, BarChart3, Download,
  RefreshCw, Bell, Send, User, Building2, Zap, Timer,
  ThumbsUp, ThumbsDown, Flag, Info, Settings as SettingsIcon, ChevronRight,
  Upload, X, Plus, Image, Video, File
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import AIBidAssistant from '../components/AIBidAssistant';
import { BackToDashboard } from '../components/BackToDashboard';
import { JOB_CATEGORY_NAMES, DEFAULT_AUTO_POST_CONFIG } from '../lib/constants/jobCategories';
import { suggestJobCategory, estimateQualifiedContractors } from '../lib/bidRoomAutoPost';
import BidRoomAutoPostSettings from '../components/BidRoomAutoPostSettings';

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
  status: 'pending' | 'accepted' | 'rejected';
  materials: { name: string; cost: number }[];
  labor: number;
  warranty: string;
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

export default function BidRoom() {
  const [activeSection, setActiveSection] = useState<'quotes' | 'emergency'>('quotes');
  const [activeTab, setActiveTab] = useState<'active' | 'awarded' | 'closed'>('active');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'budget' | 'bids'>('deadline');
  
  // Auto-Post Settings
  const [showAutoPostSettings, setShowAutoPostSettings] = useState(false);
  const [autoPostConfig, setAutoPostConfig] = useState(DEFAULT_AUTO_POST_CONFIG);
  
  // Post New Job Modal State
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [newJobForm, setNewJobForm] = useState({
    title: '',
    description: '',
    type: 'quote' as 'quote' | 'work-request' | 'emergency',
    jobCategory: '' as string,
    customerName: '',
    customerLocation: '',
    budgetMin: '',
    budgetMax: '',
    deadline: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    requirements: [''],
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

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
      name: 'Sarah Chen',
      company: 'Elite Electric Services',
      rating: 4.9,
      completedJobs: 203,
      responseRate: 98,
      phone: '(555) 234-5678',
      email: 'sarah@eliteelectric.com',
      specialties: ['Electrical', 'Smart Home', 'Solar'],
      location: 'North Side'
    },
    'c3': {
      id: 'c3',
      name: 'Tom Rodriguez',
      company: 'Rodriguez HVAC Experts',
      rating: 4.7,
      completedJobs: 134,
      responseRate: 92,
      phone: '(555) 345-6789',
      email: 'tom@rodriguezHVAC.com',
      specialties: ['HVAC', 'Heating', 'Air Conditioning'],
      location: 'West End'
    }
  };

  // Mock jobs data
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 'j1',
      title: 'Commercial Kitchen Plumbing Repair',
      description: 'Emergency plumbing repair needed for commercial kitchen. Main drainage line backup causing operational shutdown.',
      type: 'emergency',
      status: 'bidding',
      customerName: 'Downtown Restaurant Group',
      customerLocation: '123 Main St, Downtown',
      postedDate: '2024-02-25T08:30:00',
      deadline: '2024-02-25T18:00:00',
      budget: { min: 2500, max: 5000 },
      priority: 'urgent',
      requirements: [
        'Licensed plumber required',
        'Available for immediate start',
        'Commercial experience preferred',
        'After-hours availability'
      ],
      attachments: ['kitchen-layout.pdf', 'drainage-photos.jpg'],
      viewCount: 12,
      bids: [
        {
          id: 'b1',
          contractorId: 'c1',
          amount: 3800,
          estimatedDuration: '6-8 hours',
          proposedStartDate: '2024-02-25T10:00:00',
          notes: 'Can start immediately. Have dealt with similar commercial kitchen issues. Will bring backup crew to expedite.',
          submittedAt: '2024-02-25T08:45:00',
          status: 'pending',
          materials: [
            { name: 'PVC Piping', cost: 450 },
            { name: 'Drain Fittings', cost: 280 },
            { name: 'Sealants & Adhesives', cost: 120 }
          ],
          labor: 2950,
          warranty: '90-day labor warranty, parts manufacturer warranty'
        },
        {
          id: 'b2',
          contractorId: 'c3',
          amount: 4200,
          estimatedDuration: '8-10 hours',
          proposedStartDate: '2024-02-25T12:00:00',
          notes: 'Experienced with commercial setups. Can provide same-day service with premium materials.',
          submittedAt: '2024-02-25T09:15:00',
          status: 'pending',
          materials: [
            { name: 'Commercial Grade Piping', cost: 680 },
            { name: 'Industrial Fittings', cost: 420 },
            { name: 'Professional Sealants', cost: 180 }
          ],
          labor: 2920,
          warranty: '1-year full warranty'
        }
      ]
    },
    {
      id: 'j2',
      title: 'Office Building Electrical Upgrade',
      description: 'Panel upgrade and rewiring for 3-story office building. Need to upgrade to 400A service.',
      type: 'quote',
      status: 'open',
      customerName: 'Metro Business Complex',
      customerLocation: '456 Business Pkwy, Suite 300',
      postedDate: '2024-02-24T14:00:00',
      deadline: '2024-02-27T17:00:00',
      budget: { min: 8000, max: 15000 },
      priority: 'high',
      quoteNumber: 'QUO-2024-003',
      requirements: [
        'Master electrician license required',
        'Commercial electrical experience',
        'Must coordinate with building management',
        'Work during off-hours preferred'
      ],
      attachments: ['electrical-plans.pdf', 'current-panel.jpg'],
      viewCount: 8,
      bids: [
        {
          id: 'b3',
          contractorId: 'c2',
          amount: 12500,
          estimatedDuration: '3-4 days',
          proposedStartDate: '2024-02-28T07:00:00',
          notes: 'Extensive experience with commercial electrical upgrades. Can work nights and weekends. All materials included.',
          submittedAt: '2024-02-24T16:30:00',
          status: 'pending',
          materials: [
            { name: '400A Panel', cost: 2800 },
            { name: 'Wiring & Conduit', cost: 3200 },
            { name: 'Breakers & Hardware', cost: 1500 }
          ],
          labor: 5000,
          warranty: '2-year full warranty on labor and materials'
        }
      ]
    },
    {
      id: 'j3',
      title: 'Residential HVAC System Installation',
      description: 'Full HVAC system installation for 2500 sq ft home. Existing system is 15 years old.',
      type: 'work-request',
      status: 'open',
      customerName: 'Williams Residence',
      customerLocation: '789 Oak Avenue',
      postedDate: '2024-02-23T10:00:00',
      deadline: '2024-02-28T17:00:00',
      budget: { min: 6000, max: 12000 },
      priority: 'medium',
      requirements: [
        'HVAC certified technician',
        'Energy efficient system options',
        'Flexible scheduling',
        'Free consultation required'
      ],
      attachments: ['home-specs.pdf'],
      viewCount: 15,
      bids: []
    },
    {
      id: 'j4',
      title: 'Emergency Water Heater Replacement',
      description: 'Water heater burst in apartment building basement. Flooding risk. Need immediate replacement.',
      type: 'emergency',
      status: 'bidding',
      customerName: 'Riverside Apartments',
      customerLocation: '2145 River Road',
      postedDate: '2024-02-26T06:00:00',
      deadline: '2024-02-26T14:00:00',
      budget: { min: 1800, max: 3500 },
      priority: 'urgent',
      requirements: [
        'Available immediately',
        'Licensed plumber',
        'Commercial water heater experience',
        '24/7 emergency service'
      ],
      attachments: ['basement-photos.jpg'],
      viewCount: 18,
      bids: [
        {
          id: 'b4',
          contractorId: 'c1',
          amount: 2400,
          estimatedDuration: '4-5 hours',
          proposedStartDate: '2024-02-26T07:30:00',
          notes: 'Can be there in 30 minutes. Have 50-gallon commercial units in stock.',
          submittedAt: '2024-02-26T06:15:00',
          status: 'pending',
          materials: [
            { name: '50-Gal Commercial Water Heater', cost: 1200 },
            { name: 'Piping & Connections', cost: 350 },
            { name: 'Emergency Service Fee', cost: 200 }
          ],
          labor: 650,
          warranty: '2-year parts and labor warranty'
        }
      ]
    },
    {
      id: 'j5',
      title: 'Power Outage - Electrical Panel Failure',
      description: 'Total power loss in retail store. Electrical panel tripped and will not reset. Losing business revenue.',
      type: 'emergency',
      status: 'open',
      customerName: 'Downtown Electronics Store',
      customerLocation: '567 Commerce Street',
      postedDate: '2024-02-26T09:30:00',
      deadline: '2024-02-26T16:00:00',
      budget: { min: 1500, max: 4000 },
      priority: 'urgent',
      requirements: [
        'Master electrician',
        'Immediate availability',
        'Commercial electrical license',
        'Panel replacement capability'
      ],
      attachments: ['panel-photo.jpg', 'store-layout.pdf'],
      viewCount: 9,
      bids: []
    }
  ]);

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400';
      case 'high': return 'from-orange-500/20 to-yellow-500/20 border-orange-500/30 text-orange-400';
      case 'medium': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400';
      case 'low': return 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400';
      default: return 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'emergency': return Zap;
      case 'quote': return FileText;
      case 'work-request': return Briefcase;
      default: return FileText;
    }
  };

  const filteredJobs = jobs
    .filter(job => {
      // Filter by section - quotes vs emergency
      const matchesSection = 
        (activeSection === 'quotes' && (job.type === 'quote' || job.type === 'work-request')) ||
        (activeSection === 'emergency' && job.type === 'emergency');
      
      const matchesTab = 
        (activeTab === 'active' && (job.status === 'open' || job.status === 'bidding')) ||
        (activeTab === 'awarded' && job.status === 'awarded') ||
        (activeTab === 'closed' && job.status === 'closed');
      
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPriority = filterPriority === 'all' || job.priority === filterPriority;
      
      return matchesSection && matchesTab && matchesSearch && matchesPriority;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      } else if (sortBy === 'budget') {
        return b.budget.max - a.budget.max;
      } else {
        return b.bids.length - a.bids.length;
      }
    });

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  const handleViewBid = (bid: Bid, job: Job) => {
    setSelectedBid(bid);
    setSelectedJob(job);
    setShowBidModal(true);
  };

  const handleAcceptBid = (bidId: string) => {
    if (confirm('Accept this bid? This will notify the contractor and close other bids.')) {
      setJobs(jobs.map(job => 
        job.id === selectedJob?.id
          ? {
              ...job,
              status: 'awarded',
              bids: job.bids.map(b => ({
                ...b,
                status: b.id === bidId ? 'accepted' : 'rejected'
              }))
            }
          : job
      ));
      toast.success('Bid accepted! Contractor has been notified.');
      setShowBidModal(false);
    }
  };

  const handleRejectBid = (bidId: string) => {
    if (confirm('Reject this bid?')) {
      setJobs(jobs.map(job =>
        job.id === selectedJob?.id
          ? {
              ...job,
              bids: job.bids.map(b => 
                b.id === bidId ? { ...b, status: 'rejected' } : b
              )
            }
          : job
      ));
      toast.success('Bid rejected.');
      setShowBidModal(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const validTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      // Documents
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv'
    ];

    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        return false;
      }
      // 50MB file size limit
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 50MB`);
        return false;
      }
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
    toast.success(`${validFiles.length} file(s) added`);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
  };

  const addRequirement = () => {
    setNewJobForm(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
  };

  const updateRequirement = (index: number, value: string) => {
    setNewJobForm(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => i === index ? value : req)
    }));
  };

  const removeRequirement = (index: number) => {
    setNewJobForm(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const handlePostJob = () => {
    // Validate form
    if (!newJobForm.title.trim()) {
      toast.error('Please enter a job title');
      return;
    }
    if (!newJobForm.description.trim()) {
      toast.error('Please enter a job description');
      return;
    }
    if (!newJobForm.jobCategory) {
      toast.error('Please select a job category to notify the right contractors');
      return;
    }
    if (!newJobForm.customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    if (!newJobForm.customerLocation.trim()) {
      toast.error('Please enter customer location');
      return;
    }
    if (!newJobForm.budgetMin || !newJobForm.budgetMax) {
      toast.error('Please enter budget range');
      return;
    }
    if (parseFloat(newJobForm.budgetMin) > parseFloat(newJobForm.budgetMax)) {
      toast.error('Minimum budget cannot be greater than maximum budget');
      return;
    }
    if (!newJobForm.deadline) {
      toast.error('Please select a deadline');
      return;
    }

    const filteredRequirements = newJobForm.requirements.filter(req => req.trim() !== '');
    if (filteredRequirements.length === 0) {
      toast.error('Please add at least one requirement');
      return;
    }

    // Create new job
    const newJob: Job = {
      id: `j${jobs.length + 1}`,
      title: newJobForm.title,
      description: newJobForm.description,
      type: newJobForm.type,
      jobCategory: newJobForm.jobCategory,
      status: 'open',
      customerName: newJobForm.customerName,
      customerLocation: newJobForm.customerLocation,
      postedDate: new Date().toISOString(),
      deadline: newJobForm.deadline,
      budget: {
        min: parseFloat(newJobForm.budgetMin),
        max: parseFloat(newJobForm.budgetMax)
      },
      priority: newJobForm.priority,
      requirements: filteredRequirements,
      attachments: uploadedFiles.map(file => file.name),
      viewCount: 0,
      bids: []
    };

    setJobs([newJob, ...jobs]);
    
    toast.success(`Job posted successfully to ${newJobForm.jobCategory} contractors!`, {
      description: `Notifications sent to all contractors specializing in ${newJobForm.jobCategory}`
    });

    // Reset form
    setNewJobForm({
      title: '',
      description: '',
      type: 'quote',
      jobCategory: '',
      customerName: '',
      customerLocation: '',
      budgetMin: '',
      budgetMax: '',
      deadline: '',
      priority: 'medium',
      requirements: [''],
    });
    setUploadedFiles([]);
    setShowPostJobModal(false);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // AI Category Suggestion
  const handleAISuggestCategory = () => {
    if (!newJobForm.title && !newJobForm.description) {
      toast.error('Please enter a title and description first');
      return;
    }
    
    const suggestedCategory = suggestJobCategory(newJobForm.description, newJobForm.title);
    if (suggestedCategory) {
      setNewJobForm(prev => ({ ...prev, jobCategory: suggestedCategory }));
      const contractorCount = estimateQualifiedContractors(suggestedCategory);
      toast.success(`AI suggested: ${suggestedCategory}`, {
        description: `~${contractorCount} qualified contractors available`
      });
    } else {
      toast.info('Could not detect category from description', {
        description: 'Please select manually'
      });
    }
  };

  // Filter jobs based on current section
  const sectionJobs = jobs.filter(job => 
    (activeSection === 'quotes' && (job.type === 'quote' || job.type === 'work-request')) ||
    (activeSection === 'emergency' && job.type === 'emergency')
  );

  const stats = {
    activeJobs: sectionJobs.filter(j => j.status === 'open' || j.status === 'bidding').length,
    totalBids: sectionJobs.reduce((sum, j) => sum + j.bids.length, 0),
    avgBidsPerJob: sectionJobs.length > 0 ? (sectionJobs.reduce((sum, j) => sum + j.bids.length, 0) / sectionJobs.length).toFixed(1) : '0',
    pendingReview: sectionJobs.reduce((sum, j) => sum + j.bids.filter(b => b.status === 'pending').length, 0)
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#ea580c] to-orange-600 rounded-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackToDashboard />
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Target className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">Bid Room</h1>
                <p className="text-orange-100">Manage contractor bids on quotes and emergency services</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAutoPostSettings(!showAutoPostSettings)}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl transition-all border border-white/20"
                title="AI Auto-Post Settings"
              >
                <SettingsIcon className="w-5 h-5" />
                {autoPostConfig.enabled && (
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </button>
              <button 
                onClick={() => setShowPostJobModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-[#ea580c] rounded-xl hover:bg-orange-50 transition-all font-semibold shadow-lg"
              >
                <Send className="w-5 h-5" />
                Post New Job
              </button>
            </div>
          </div>
        </div>

        {/* AI Auto-Post Settings Panel */}
        {showAutoPostSettings && (
          <BidRoomAutoPostSettings
            config={autoPostConfig}
            onSave={(newConfig) => {
              setAutoPostConfig(newConfig);
              setShowAutoPostSettings(false);
            }}
          />
        )}

        {/* Section Selector - Quotes vs Emergency Services */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveSection('quotes');
                setActiveTab('active'); // Reset to active tab when switching sections
              }}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-bold text-lg transition-all ${
                activeSection === 'quotes'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
              }`}
            >
              <FileText className="w-6 h-6" />
              <div className="text-left">
                <div>Quotes & Work Requests</div>
                <div className={`text-sm font-normal ${activeSection === 'quotes' ? 'text-blue-100' : 'text-gray-500'}`}>
                  Regular scheduled work
                </div>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveSection('emergency');
                setActiveTab('active'); // Reset to active tab when switching sections
              }}
              className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-bold text-lg transition-all ${
                activeSection === 'emergency'
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
              }`}
            >
              <Zap className="w-6 h-6" />
              <div className="text-left">
                <div>Emergency Services</div>
                <div className={`text-sm font-normal ${activeSection === 'emergency' ? 'text-orange-100' : 'text-gray-500'}`}>
                  Urgent immediate response
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeSection === 'quotes' ? (
              <>
                <FileText className="w-6 h-6 text-blue-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Quotes & Work Requests</h2>
                  <p className="text-sm text-gray-400">Regular scheduled work opportunities</p>
                </div>
              </>
            ) : (
              <>
                <Zap className="w-6 h-6 text-red-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">Emergency Services</h2>
                  <p className="text-sm text-gray-400">Urgent immediate response opportunities</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#ea580c]/20 to-orange-600/20 border border-[#ea580c]/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-orange-300">Active Jobs</p>
              <Briefcase className="w-6 h-6 text-[#ea580c]" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.activeJobs}</p>
            <p className="text-sm text-gray-400 mt-1">Currently accepting bids</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-blue-300">Total Bids</p>
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.totalBids}</p>
            <p className="text-sm text-gray-400 mt-1">Received from contractors</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-300">Avg Bids/Job</p>
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.avgBidsPerJob}</p>
            <p className="text-sm text-gray-400 mt-1">Competitive interest</p>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-green-300">Pending Review</p>
              <Eye className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.pendingReview}</p>
            <p className="text-sm text-gray-400 mt-1">Awaiting decision</p>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2">
          <div className="flex gap-2">
            {[
              { id: 'active', label: 'Active Jobs', count: stats.activeJobs },
              { id: 'awarded', label: 'Awarded', count: sectionJobs.filter(j => j.status === 'awarded').length },
              { id: 'closed', label: 'Closed', count: sectionJobs.filter(j => j.status === 'closed').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#ea580c] text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-[#0A0A0A]'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-sm font-bold ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-[#2A2A2A]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search jobs or customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]/50"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
              >
                <option value="deadline">Sort by Deadline</option>
                <option value="budget">Sort by Budget</option>
                <option value="bids">Sort by Bids</option>
              </select>
              <button className="px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 rounded-xl hover:border-[#ea580c]/50 hover:text-white transition-all">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((job) => {
            const TypeIcon = getTypeIcon(job.type);
            const timeRemaining = getTimeRemaining(job.deadline);
            const isExpired = timeRemaining === 'Expired';
            
            return (
              <div
                key={job.id}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-[#ea580c]/30 transition-all"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Section - Job Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <TypeIcon className="w-5 h-5 text-[#ea580c]" />
                          <span className="text-sm font-semibold text-gray-400 uppercase">
                            {job.type}
                            {job.quoteNumber && ` · ${job.quoteNumber}`}
                          </span>
                          {job.jobCategory && (
                            <>
                              <span className="text-gray-600">·</span>
                              <span className="px-2 py-0.5 bg-[#ea580c]/20 text-[#ea580c] text-sm font-bold rounded border border-[#ea580c]/30">
                                {job.jobCategory}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{job.title}</h3>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{job.description}</p>
                        
                        <div className="flex flex-wrap gap-3 text-sm">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Building2 className="w-4 h-4" />
                            {job.customerName}
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <MapPin className="w-4 h-4" />
                            {job.customerLocation}
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <Eye className="w-4 h-4" />
                            {job.viewCount} views
                          </div>
                        </div>
                      </div>

                      <div className={`px-3 py-1 rounded-lg border bg-gradient-to-br ${getPriorityColor(job.priority)} font-semibold text-sm`}>
                        {job.priority.toUpperCase()}
                      </div>
                    </div>

                    {/* Budget & Deadline */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <div>
                          <p className="text-sm text-gray-400">Budget Range</p>
                          <p className="font-semibold text-white">
                            ${job.budget.min.toLocaleString()} - ${job.budget.max.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
                        isExpired 
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-[#0A0A0A] border-[#2A2A2A]'
                      }`}>
                        <Clock className={`w-4 h-4 ${isExpired ? 'text-red-400' : 'text-blue-400'}`} />
                        <div>
                          <p className="text-sm text-gray-400">Time Remaining</p>
                          <p className={`font-semibold ${isExpired ? 'text-red-400' : 'text-white'}`}>
                            {timeRemaining}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div>
                      <p className="text-sm font-semibold text-gray-400 mb-2">REQUIREMENTS</p>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.slice(0, 3).map((req, idx) => (
                          <span key={idx} className="px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 text-sm rounded">
                            {req}
                          </span>
                        ))}
                        {job.requirements.length > 3 && (
                          <span className="px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300 text-sm rounded">
                            +{job.requirements.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Bids */}
                  <div className="lg:w-80 border-l border-[#2A2A2A] lg:pl-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#ea580c]" />
                        <span className="font-semibold text-white">
                          {job.bids.length} Bid{job.bids.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => handleViewJob(job)}
                        className="px-4 py-2 bg-[#ea580c] text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold"
                      >
                        View Details
                      </button>
                    </div>

                    {job.bids.length > 0 ? (
                      <div className="space-y-3">
                        {job.bids.slice(0, 2).map((bid) => {
                          const contractor = contractors[bid.contractorId];
                          return (
                            <div
                              key={bid.id}
                              className="p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg hover:border-[#ea580c]/30 transition-all cursor-pointer"
                              onClick={() => handleViewBid(bid, job)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-white text-sm">{contractor.name}</p>
                                  <p className="text-sm text-gray-400">{contractor.company}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                  <span className="text-sm font-semibold text-white">{contractor.rating}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-400">Bid Amount</p>
                                  <p className="text-lg font-bold text-green-400">${bid.amount.toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-400">Duration</p>
                                  <p className="text-sm font-semibold text-white">{bid.estimatedDuration}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {job.bids.length > 2 && (
                          <button
                            onClick={() => handleViewJob(job)}
                            className="w-full py-2 text-sm text-[#ea580c] hover:text-orange-400 font-semibold"
                          >
                            View {job.bids.length - 2} more bid{job.bids.length - 2 !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No bids yet</p>
                        <p className="text-gray-500 text-sm mt-1">Waiting for contractors</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Assistant Panel - Full Width Below */}
                <div className="mt-6">
                  <AIBidAssistant 
                    job={{
                      id: job.id,
                      title: job.title,
                      description: job.description,
                      requirements: job.requirements,
                      type: job.type
                    }}
                    onRouted={() => {
                      toast.success('Providers notified!');
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {filteredJobs.length === 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-12 text-center">
            <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Jobs Found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Bid Detail Modal */}
      {showBidModal && selectedBid && selectedJob && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Bid Details</h2>
                <button
                  onClick={() => setShowBidModal(false)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contractor Info */}
              <div className="bg-gradient-to-br from-[#ea580c]/20 to-orange-600/20 border border-[#ea580c]/30 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#ea580c] rounded-xl">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                      {contractors[selectedBid.contractorId].name}
                    </h3>
                    <p className="text-orange-200 mb-3">{contractors[selectedBid.contractorId].company}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-orange-200 mb-1">Rating</p>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-bold text-white">{contractors[selectedBid.contractorId].rating}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-orange-200 mb-1">Completed Jobs</p>
                        <p className="font-bold text-white">{contractors[selectedBid.contractorId].completedJobs}</p>
                      </div>
                      <div>
                        <p className="text-sm text-orange-200 mb-1">Response Rate</p>
                        <p className="font-bold text-white">{contractors[selectedBid.contractorId].responseRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-orange-200 mb-1">Location</p>
                        <p className="font-bold text-white">{contractors[selectedBid.contractorId].location}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm text-orange-200 mb-2">Specialties</p>
                      <div className="flex flex-wrap gap-2">
                        {contractors[selectedBid.contractorId].specialties.map((spec, idx) => (
                          <span key={idx} className="px-2 py-1 bg-white/10 text-white text-sm rounded-lg">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bid Amount Breakdown */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Cost Breakdown</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-[#2A2A2A]">
                    <span className="text-gray-400">Labor</span>
                    <span className="font-semibold text-white">${selectedBid.labor.toLocaleString()}</span>
                  </div>
                  
                  {selectedBid.materials.map((material, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-[#2A2A2A]">
                      <span className="text-gray-400">{material.name}</span>
                      <span className="font-semibold text-white">${material.cost.toLocaleString()}</span>
                    </div>
                  ))}

                  <div className="flex items-center justify-between py-3 mt-3 border-t-2 border-[#ea580c]/30">
                    <span className="text-lg font-bold text-white">Total Bid Amount</span>
                    <span className="text-2xl font-bold text-green-400">${selectedBid.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Timeline & Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#ea580c]" />
                    <p className="text-sm font-semibold text-gray-400">Proposed Start Date</p>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {new Date(selectedBid.proposedStartDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className="w-4 h-4 text-[#ea580c]" />
                    <p className="text-sm font-semibold text-gray-400">Estimated Duration</p>
                  </div>
                  <p className="text-lg font-bold text-white">{selectedBid.estimatedDuration}</p>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-[#ea580c]" />
                  <p className="text-sm font-semibold text-gray-400">Contractor Notes</p>
                </div>
                <p className="text-white leading-relaxed">{selectedBid.notes}</p>
              </div>

              {/* Warranty */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-[#ea580c]" />
                  <p className="text-sm font-semibold text-gray-400">Warranty</p>
                </div>
                <p className="text-white">{selectedBid.warranty}</p>
              </div>

              {/* Actions */}
              {selectedBid.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAcceptBid(selectedBid.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Accept Bid
                  </button>
                  <button
                    onClick={() => handleRejectBid(selectedBid.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject Bid
                  </button>
                </div>
              )}

              {selectedBid.status === 'accepted' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="font-semibold text-green-400">This bid has been accepted</p>
                  </div>
                </div>
              )}

              {selectedBid.status === 'rejected' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <p className="font-semibold text-red-400">This bid has been rejected</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const TypeIcon = getTypeIcon(selectedJob.type);
                    return <TypeIcon className="w-6 h-6 text-[#ea580c]" />;
                  })()}
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedJob.title}</h2>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <p className="text-sm text-gray-400">
                        {selectedJob.type.toUpperCase()}
                        {selectedJob.quoteNumber && ` · ${selectedJob.quoteNumber}`}
                      </p>
                      {selectedJob.jobCategory && (
                        <>
                          <span className="text-gray-600">·</span>
                          <span className="px-2 py-1 bg-[#ea580c]/20 text-[#ea580c] text-sm font-bold rounded border border-[#ea580c]/30">
                            📋 {selectedJob.jobCategory}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowJobModal(false)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Job Status & Priority */}
              <div className="flex flex-wrap gap-3">
                <div className={`px-4 py-2 rounded-lg border bg-gradient-to-br ${getPriorityColor(selectedJob.priority)} font-semibold`}>
                  {selectedJob.priority.toUpperCase()} PRIORITY
                </div>
                <div className="px-4 py-2 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] text-white font-semibold">
                  {selectedJob.status.toUpperCase()}
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="text-sm text-blue-300 mb-1">Customer Name</p>
                      <p className="font-semibold text-white">{selectedJob.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="text-sm text-blue-300 mb-1">Location</p>
                      <p className="font-semibold text-white">{selectedJob.customerLocation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Details */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Description</h3>
                <p className="text-gray-300 leading-relaxed">{selectedJob.description}</p>
              </div>

              {/* Budget & Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <p className="text-sm font-semibold text-gray-400">Budget Range</p>
                  </div>
                  <p className="text-xl font-bold text-white">
                    ${selectedJob.budget.min.toLocaleString()} - ${selectedJob.budget.max.toLocaleString()}
                  </p>
                </div>

                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-semibold text-gray-400">Posted Date</p>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {new Date(selectedJob.postedDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <p className="text-sm font-semibold text-gray-400">Deadline</p>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {getTimeRemaining(selectedJob.deadline)}
                  </p>
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedJob.requirements.map((req, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              {selectedJob.attachments.length > 0 && (
                <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Attachments</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.attachments.map((attachment, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-gray-300 text-sm">
                        <FileText className="w-4 h-4 text-[#ea580c]" />
                        {attachment}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bids Section */}
              <div className="bg-gradient-to-br from-[#ea580c]/10 to-orange-600/10 border border-[#ea580c]/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">
                    Received Bids ({selectedJob.bids.length})
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Eye className="w-4 h-4" />
                    {selectedJob.viewCount} views
                  </div>
                </div>

                {selectedJob.bids.length > 0 ? (
                  <div className="space-y-3">
                    {selectedJob.bids.map((bid) => {
                      const contractor = contractors[bid.contractorId];
                      return (
                        <div
                          key={bid.id}
                          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#ea580c]/50 transition-all cursor-pointer"
                          onClick={() => handleViewBid(bid, selectedJob)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-[#ea580c]/20 rounded-lg">
                                <User className="w-5 h-5 text-[#ea580c]" />
                              </div>
                              <div>
                                <p className="font-bold text-white">{contractor.name}</p>
                                <p className="text-sm text-gray-400">{contractor.company}</p>
                                <div className="flex items-center gap-3 mt-2 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                    <span className="text-white font-semibold">{contractor.rating}</span>
                                  </div>
                                  <span className="text-gray-400">·</span>
                                  <span className="text-gray-400">{contractor.completedJobs} jobs</span>
                                  <span className="text-gray-400">·</span>
                                  <span className="text-gray-400">{contractor.responseRate}% response</span>
                                </div>
                              </div>
                            </div>

                            <div className={`px-3 py-1 rounded-lg text-sm font-bold ${
                              bid.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                              bid.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {bid.status.toUpperCase()}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Bid Amount</p>
                              <p className="text-xl font-bold text-green-400">${bid.amount.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Duration</p>
                              <p className="text-sm font-semibold text-white">{bid.estimatedDuration}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Start Date</p>
                              <p className="text-sm font-semibold text-white">
                                {new Date(bid.proposedStartDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>

                          {bid.notes && (
                            <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                              <p className="text-sm text-gray-400 mb-1">Notes:</p>
                              <p className="text-sm text-gray-300">{bid.notes}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-semibold mb-1">No bids received yet</p>
                    <p className="text-sm text-gray-500">Contractors are reviewing this job</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJobModal(false)}
                  className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    toast.success('Job details exported!');
                  }}
                  className="px-6 py-3 bg-[#ea580c] hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post New Job Modal */}
      {showPostJobModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Post New Job to Bid Room</h2>
                  <p className="text-sm text-gray-400 mt-1">Create a job opportunity for contractors to bid on</p>
                </div>
                <button
                  onClick={() => {
                    setShowPostJobModal(false);
                    setNewJobForm({
                      title: '',
                      description: '',
                      type: 'quote',
                      customerName: '',
                      customerLocation: '',
                      budgetMin: '',
                      budgetMax: '',
                      deadline: '',
                      priority: 'medium',
                      requirements: [''],
                    });
                    setUploadedFiles([]);
                  }}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Job Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Job Type *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setNewJobForm(prev => ({ ...prev, type: 'quote' }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      newJobForm.type === 'quote'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-blue-500/50'
                    }`}
                  >
                    <FileText className={`w-6 h-6 mx-auto mb-2 ${newJobForm.type === 'quote' ? 'text-blue-400' : 'text-gray-400'}`} />
                    <p className={`font-semibold text-sm ${newJobForm.type === 'quote' ? 'text-blue-400' : 'text-gray-400'}`}>
                      Quote
                    </p>
                  </button>
                  <button
                    onClick={() => setNewJobForm(prev => ({ ...prev, type: 'work-request' }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      newJobForm.type === 'work-request'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-green-500/50'
                    }`}
                  >
                    <Briefcase className={`w-6 h-6 mx-auto mb-2 ${newJobForm.type === 'work-request' ? 'text-green-400' : 'text-gray-400'}`} />
                    <p className={`font-semibold text-sm ${newJobForm.type === 'work-request' ? 'text-green-400' : 'text-gray-400'}`}>
                      Work Request
                    </p>
                  </button>
                  <button
                    onClick={() => setNewJobForm(prev => ({ ...prev, type: 'emergency' }))}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      newJobForm.type === 'emergency'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-red-500/50'
                    }`}
                  >
                    <Zap className={`w-6 h-6 mx-auto mb-2 ${newJobForm.type === 'emergency' ? 'text-red-400' : 'text-gray-400'}`} />
                    <p className={`font-semibold text-sm ${newJobForm.type === 'emergency' ? 'text-red-400' : 'text-gray-400'}`}>
                      Emergency
                    </p>
                  </button>
                </div>
              </div>

              {/* Job Category Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-white">
                    Job Category * 
                    <span className="text-gray-400 font-normal text-sm ml-2">
                      (Helps notify the right contractors)
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAISuggestCategory}
                    className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-bold rounded-lg transition-all"
                  >
                    <Zap className="w-3 h-3" />
                    AI Suggest
                  </button>
                </div>
                <select
                  value={newJobForm.jobCategory}
                  onChange={(e) => setNewJobForm(prev => ({ ...prev, jobCategory: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23ea580c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '20px',
                    paddingRight: '40px'
                  }}
                >
                  <option value="" disabled>Select job category...</option>
                  {JOB_CATEGORY_NAMES.map((category) => (
                    <option key={category} value={category} className="bg-[#1A1A1A]">
                      {category}
                    </option>
                  ))}
                </select>
                <div className="flex items-start gap-2 mt-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">
                      💡 Selecting the correct category ensures notifications are sent to contractors with matching specialties
                    </p>
                  </div>
                  {newJobForm.jobCategory && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-sm font-bold rounded border border-green-500/30 whitespace-nowrap">
                      ~{estimateQualifiedContractors(newJobForm.jobCategory)} contractors
                    </span>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Job Title *</label>
                  <input
                    type="text"
                    value={newJobForm.title}
                    onChange={(e) => setNewJobForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Commercial HVAC Installation"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]/50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-2">Description *</label>
                  <textarea
                    value={newJobForm.description}
                    onChange={(e) => setNewJobForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Provide detailed description of the work needed..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={newJobForm.customerName}
                    onChange={(e) => setNewJobForm(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="e.g., ABC Corporation"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Location *</label>
                  <input
                    type="text"
                    value={newJobForm.customerLocation}
                    onChange={(e) => setNewJobForm(prev => ({ ...prev, customerLocation: e.target.value }))}
                    placeholder="e.g., 123 Main St, City, State"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]/50"
                  />
                </div>
              </div>

              {/* Budget & Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Min Budget ($) *</label>
                  <input
                    type="number"
                    value={newJobForm.budgetMin}
                    onChange={(e) => setNewJobForm(prev => ({ ...prev, budgetMin: e.target.value }))}
                    placeholder="5000"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Max Budget ($) *</label>
                  <input
                    type="number"
                    value={newJobForm.budgetMax}
                    onChange={(e) => setNewJobForm(prev => ({ ...prev, budgetMax: e.target.value }))}
                    placeholder="10000"
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Deadline *</label>
                  <input
                    type="datetime-local"
                    value={newJobForm.deadline}
                    onChange={(e) => setNewJobForm(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[#ea580c]/50"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Priority *</label>
                <div className="grid grid-cols-4 gap-3">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setNewJobForm(prev => ({ ...prev, priority }))}
                      className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                        newJobForm.priority === priority
                          ? priority === 'urgent' ? 'border-red-500 bg-red-500/10 text-red-400' :
                            priority === 'high' ? 'border-orange-500 bg-orange-500/10 text-orange-400' :
                            priority === 'medium' ? 'border-blue-500 bg-blue-500/10 text-blue-400' :
                            'border-gray-500 bg-gray-500/10 text-gray-400'
                          : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400 hover:border-[#ea580c]/50'
                      }`}
                    >
                      {priority.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">Requirements *</label>
                <div className="space-y-3">
                  {newJobForm.requirements.map((req, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={req}
                        onChange={(e) => updateRequirement(index, e.target.value)}
                        placeholder={`Requirement ${index + 1}`}
                        className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#ea580c]/50"
                      />
                      {newJobForm.requirements.length > 1 && (
                        <button
                          onClick={() => removeRequirement(index)}
                          className="p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addRequirement}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border-2 border-dashed border-[#2A2A2A] hover:border-[#ea580c]/50 rounded-xl text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Requirement
                  </button>
                </div>
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  Attachments (Photos, Videos, Documents)
                </label>
                
                <div className="border-2 border-dashed border-[#2A2A2A] rounded-xl p-6 bg-[#0A0A0A] hover:border-[#ea580c]/50 transition-all">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-white font-semibold mb-1">Click to upload files</p>
                    <p className="text-sm text-gray-400 mb-2">or drag and drop</p>
                    <div className="flex flex-wrap gap-2 justify-center text-sm text-gray-500">
                      <span className="px-2 py-1 bg-[#1A1A1A] rounded">Images (JPG, PNG, GIF, WebP, SVG)</span>
                      <span className="px-2 py-1 bg-[#1A1A1A] rounded">Videos (MP4, MOV, AVI, WebM)</span>
                      <span className="px-2 py-1 bg-[#1A1A1A] rounded">Documents (PDF, DOC, XLS, PPT, TXT)</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Maximum file size: 50MB per file</p>
                  </label>
                </div>

                {/* Uploaded Files Display */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-semibold text-white mb-2">
                      Uploaded Files ({uploadedFiles.length})
                    </p>
                    {uploadedFiles.map((file, index) => {
                      const FileIcon = getFileIcon(file);
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl hover:border-[#ea580c]/30 transition-all"
                        >
                          <div className="p-2 bg-[#ea580c]/10 rounded-lg">
                            <FileIcon className="w-5 h-5 text-[#ea580c]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{file.name}</p>
                            <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-400 mb-1">Job Posting Guidelines</p>
                    <ul className="text-sm text-blue-300 space-y-1 list-disc list-inside">
                      <li>Provide clear and detailed job requirements</li>
                      <li>Upload relevant photos, videos, or documents to help contractors understand the scope</li>
                      <li>Set realistic budget ranges and deadlines</li>
                      <li>Contractors will be notified immediately upon posting</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#2A2A2A]">
                <button
                  onClick={() => {
                    setShowPostJobModal(false);
                    setNewJobForm({
                      title: '',
                      description: '',
                      type: 'quote',
                      customerName: '',
                      customerLocation: '',
                      budgetMin: '',
                      budgetMax: '',
                      deadline: '',
                      priority: 'medium',
                      requirements: [''],
                    });
                    setUploadedFiles([]);
                  }}
                  className="flex-1 px-6 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostJob}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-orange-600 hover:to-[#ea580c] text-white rounded-xl font-semibold transition-all shadow-lg shadow-[#ea580c]/30 flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Post Job to Bid Room
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}