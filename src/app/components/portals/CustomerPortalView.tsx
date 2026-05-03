import { useState, useEffect } from 'react';
import {
  Layout, FileText, Briefcase, DollarSign, MessageSquare, Bell,
  User, Settings, Home, Calendar, Clock, MapPin, Phone, Mail,
  Download, Eye, Check, X, Star, TrendingUp, Activity, AlertCircle,
  CheckCircle, Package, ChevronRight, CreditCard, FileCheck, Send,
  ClipboardList, Wrench, Info, AlertTriangle, ShoppingCart, Trash2,
  Recycle, Video, ArrowUpRight, ArrowDownRight, Plus, Filter,
  Upload, Search, Play, Pause, Volume2, VolumeX, ChevronLeft, 
  Sparkles, Zap, Crown, Gift, Trophy, Timer, Users, Target, ExternalLink, Smartphone, Monitor
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import { ConfirmModal } from '../ui/modal/ConfirmModal';
import CustomerMarketplace from '../CustomerMarketplace';
import { VideoCapture } from '../media/VideoCapture';
import type { VideoRecording } from '../media/VideoCapture';
import ClientWorkRequestForm from '../forms/ClientWorkRequestForm';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../lib/apiConfig';
import { publicAnonKey } from '../../utils/supabase/info';
import CustomerSubscriptionSelectionModal from '../CustomerSubscriptionSelectionModal';
import { useUserProfile } from '../../lib/hooks/useUserProfile';
import { useUserData } from '../../lib/hooks/useUserData';

interface Message {
  id: string;
  from: string;
  subject: string;
  preview: string;
  timestamp: string;
  read: boolean;
}

export default function CustomerPortalView() {
  const { user } = useAuth();
  const { profile, displayName } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'quotes' | 'payments' | 'messages' | 'shopping' | 'referrals'>('dashboard');
  const [showWorkRequestModal, setShowWorkRequestModal] = useState(false);
  const [mobileView, setMobileView] = useState(false); // Toggle mobile/desktop view
  const [workRequests, setWorkRequests] = useState<any[]>([]); // Real work requests from API
  const [loadingWorkRequests, setLoadingWorkRequests] = useState(true);
  const [quotes, setQuotes] = useState<any[]>([]); // Real quotes from API
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]); // Real invoices from API
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // Check URL for tab query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['dashboard', 'projects', 'quotes', 'shopping', 'payments', 'messages', 'referrals'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, []);

  // Load work requests from API
  useEffect(() => {
    const loadWorkRequests = async () => {
      if (!user?.id) {
        setLoadingWorkRequests(false);
        setWorkRequests([]);
        return;
      }

      try {
        setLoadingWorkRequests(true);
        const url = new URL(`${API_BASE_URL}/make-server-57095a78/work-requests`);
        url.searchParams.append('userId', user.id);

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Loaded work requests for user:', user.id, data);
          setWorkRequests(data || []);
        } else {
          console.warn('⚠️ Work requests API returned status:', response.status);
          setWorkRequests([]);
        }
      } catch (error: any) {
        // Silently fail - backend might not be deployed yet
        console.log('ℹ️ Work requests API unavailable - using empty state');
        setWorkRequests([]);
      } finally {
        setLoadingWorkRequests(false);
      }
    };

    loadWorkRequests();
  }, [user?.id]);

  // Load quotes from API
  useEffect(() => {
    const loadQuotes = async () => {
      if (!user?.id) {
        setLoadingQuotes(false);
        setQuotes([]);
        return;
      }

      try {
        setLoadingQuotes(true);
        const url = new URL(`${API_BASE_URL}/make-server-57095a78/quotes`);
        url.searchParams.append('userId', user.id);

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Loaded quotes for user:', user.id, data);
          setQuotes(data || []);
        } else {
          console.warn('⚠️ Quotes API returned status:', response.status);
          setQuotes([]);
        }
      } catch (error: any) {
        // Silently fail - backend might not be deployed yet
        console.log('ℹ️ Quotes API unavailable - using empty state');
        setQuotes([]);
      } finally {
        setLoadingQuotes(false);
      }
    };

    loadQuotes();
  }, [user?.id]);

  // Load invoices from API
  useEffect(() => {
    const loadInvoices = async () => {
      if (!user?.id) {
        setLoadingInvoices(false);
        setInvoices([]);
        return;
      }

      try {
        setLoadingInvoices(true);
        const url = new URL(`${API_BASE_URL}/make-server-57095a78/invoices`);
        url.searchParams.append('userId', user.id);

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Loaded invoices for user:', user.id, data);
          setInvoices(data || []);
        } else {
          console.warn('⚠️ Invoices API returned status:', response.status);
          setInvoices([]);
        }
      } catch (error: any) {
        // Silently fail - backend might not be deployed yet
        console.log('ℹ️ Invoices API unavailable - using empty state');
        setInvoices([]);
      } finally {
        setLoadingInvoices(false);
      }
    };

    loadInvoices();
  }, [user?.id]);

  // Customer info derived from profile
  const customerInfo = {
    name: displayName,
    email: user?.email || profile?.email || 'customer@email.com',
    phone: profile?.phone || '(555) 123-4567',
    address: profile?.address || '742 Evergreen Terrace, Springfield',
    memberSince: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently',
    activeProjects: workRequests.length,
    totalSpent: 45600,
    savedAmount: 8400
  };

  // Active notices
  const [activeNotices, setActiveNotices] = useState([
    {
      id: 'notice-1',
      title: 'System Maintenance Scheduled',
      message: 'We will be performing system maintenance on Sunday, Jan 25 from 2:00 AM - 4:00 AM EST.',
      type: 'maintenance',
      dismissible: true
    },
    {
      id: 'notice-2',
      title: 'New Feature: Digital Signatures',
      message: 'You can now sign contracts digitally right from your dashboard!',
      type: 'announcement',
      dismissible: true
    }
  ]);

  // Stats - calculate from real data
  const pendingQuotesCount = quotes.filter(q => q.status === 'pending').length;
  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.amount || inv.total || 0), 0);

  const stats = [
    { label: 'Active Projects', value: workRequests.length.toString(), change: loadingWorkRequests ? 'Loading...' : `${workRequests.length} total`, trend: 'up', icon: Briefcase, color: 'orange' },
    { label: 'Pending Quotes', value: pendingQuotesCount.toString(), change: loadingQuotes ? 'Loading...' : `${quotes.length} total`, trend: pendingQuotesCount > 0 ? 'attention' : 'neutral', icon: FileText, color: 'blue' },
    { label: 'Total Invoiced', value: `$${(totalInvoiceAmount / 1000).toFixed(1)}K`, change: loadingInvoices ? 'Loading...' : `${invoices.length} invoices`, trend: 'neutral', icon: DollarSign, color: 'green' },
    { label: 'Saved via Deals', value: '$8.4K', change: '18% savings', trend: 'up', icon: TrendingUp, color: 'yellow' }
  ];

  // Projects data
  const projects = [
    {
      id: 'proj-001',
      name: 'Kitchen Renovation',
      status: 'in-progress',
      progress: 65,
      startDate: '2026-01-15',
      estimatedCompletion: '2026-03-10',
      amount: 28500,
      address: '742 Evergreen Terrace'
    },
    {
      id: 'proj-002',
      name: 'Bathroom Remodel',
      status: 'in-progress',
      progress: 30,
      startDate: '2026-02-01',
      estimatedCompletion: '2026-04-15',
      amount: 15200,
      address: '742 Evergreen Terrace'
    }
  ];

  // Quotes data is now loaded from API via state (see useEffect above)

  // User-specific messages data
  const [messages, setMessages] = useUserData<Message[]>('customer_messages', []);

  // NEW: Customer subscription plan data
  const [customerSubscription] = useState({
    plan: 'professional', // 'free', 'starter', 'professional', 'gold'
    hoursIncluded: 6,
    hoursUsed: 2.5,
    hoursRollover: 4,
    nextBillingDate: '2026-04-01',
    price: 198
  });

  // NEW: Video Reels data
  const videoReels = [
    {
      id: 'reel-001',
      title: 'Kitchen Remodel Time-lapse',
      thumbnail: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: '0:45',
      views: '2.3K'
    },
    {
      id: 'reel-002',
      title: 'HVAC Maintenance Tips',
      thumbnail: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: '1:20',
      views: '5.1K'
    },
    {
      id: 'reel-003',
      title: 'Bathroom Before & After',
      thumbnail: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=800',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      duration: '0:52',
      views: '3.8K'
    },
    {
      id: 'reel-004',
      title: 'Smart Home Installation',
      thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      duration: '1:15',
      views: '4.2K'
    },
    {
      id: 'reel-005',
      title: 'Deck Building Process',
      thumbnail: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=800',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      duration: '2:10',
      views: '6.7K'
    }
  ];

  // NEW: Featured Services data
  const featuredServices = [
    {
      id: 'service-001',
      title: 'Spring HVAC Tune-Up',
      description: 'Complete system inspection & maintenance',
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
      price: '$149',
      originalPrice: '$199',
      badge: 'LIMITED TIME',
      badgeColor: 'bg-red-500'
    },
    {
      id: 'service-002',
      title: 'Smart Thermostat Install',
      description: 'Professional installation & setup',
      image: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=800',
      price: '$199',
      badge: 'POPULAR',
      badgeColor: 'bg-blue-500'
    },
    {
      id: 'service-003',
      title: 'Plumbing Inspection',
      description: 'Full home plumbing check & report',
      image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800',
      price: '$129',
      originalPrice: '$179',
      badge: 'SAVE 28%',
      badgeColor: 'bg-green-500'
    },
    {
      id: 'service-004',
      title: 'Electrical Safety Audit',
      description: 'Comprehensive electrical system review',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800',
      price: '$99',
      badge: 'NEW',
      badgeColor: 'bg-purple-500'
    }
  ];

  // NEW: Banner Ads data (from advertising system)
  const [bannerAds] = useState([
    {
      id: 'ad-banner-001',
      image: 'https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=800&h=400&fit=crop',
      title: 'Save 25% on All HVAC Services This Month',
      description: 'Professional HVAC maintenance, repair & installation',
      ctaText: 'Get Quote',
      ctaLink: '#',
      sponsorName: 'CoolAir Pro HVAC'
    },
    {
      id: 'ad-banner-002',
      image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&h=400&fit=crop',
      title: 'Premium Tools & Equipment - Free Delivery',
      description: 'Shop professional-grade tools with 2-year warranty',
      ctaText: 'Shop Now',
      ctaLink: '#',
      sponsorName: 'ToolMaster Supply'
    },
    {
      id: 'ad-banner-003',
      image: 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?w=800&h=400&fit=crop',
      title: 'Kitchen Remodeling - 0% Financing Available',
      description: 'Transform your kitchen with our experts',
      ctaText: 'Learn More',
      ctaLink: '#',
      sponsorName: 'DreamKitchen Designs'
    },
    {
      id: 'ad-banner-004',
      image: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&h=400&fit=crop',
      title: 'Smart Home Packages - Starting at $499',
      description: 'Complete smart home automation solutions',
      ctaText: 'Explore',
      ctaLink: '#',
      sponsorName: 'SmartLiving Tech'
    }
  ]);

  // NEW: Giveaways data
  const giveaways = [
    {
      id: 'giveaway-001',
      title: 'Win a Free Kitchen Renovation',
      description: 'Complete kitchen remodel worth $25,000',
      image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800',
      deadline: '2026-03-31',
      entries: 1247,
      requirements: ['Follow us', 'Refer 3 friends', 'Share on social'],
      status: 'active',
      prize: '$25,000 Value'
    }
  ];

  const [currentReelIndex, setCurrentReelIndex] = useState(0);

  // NEW: Auto-rotation state for Banner Ads and Featured Services
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);

  // Auto-rotate Banner Ads every 5 seconds
  useEffect(() => {
    if (bannerAds.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % bannerAds.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [bannerAds.length]);

  // Auto-rotate Featured Services every 5 seconds
  useEffect(() => {
    if (featuredServices.length > 1) {
      const interval = setInterval(() => {
        setCurrentServiceIndex((prev) => (prev + 1) % featuredServices.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [featuredServices.length]);

  // NEW: Quote Builder State
  const [quoteItems, setQuoteItems] = useState<Array<{
    id: string;
    type: 'service' | 'ad';
    title: string;
    description: string;
    price?: string;
    image: string;
    source: string;
  }>>([]);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // NEW: Reel playback state
  const [mutedReels, setMutedReels] = useState<Record<string, boolean>>({
    'reel-001': true,
    'reel-002': true,
    'reel-003': true,
    'reel-004': true,
    'reel-005': true
  });

  const toggleReelSound = (reelId: string) => {
    setMutedReels(prev => ({
      ...prev,
      [reelId]: !prev[reelId]
    }));
    toast.info(mutedReels[reelId] ? 'Sound enabled' : 'Sound muted');
  };

  const addToQuote = (item: {
    id: string;
    type: 'service' | 'ad';
    title: string;
    description: string;
    price?: string;
    image: string;
    source: string;
  }) => {
    // Check if item already exists
    const exists = quoteItems.find(qi => qi.id === item.id);
    if (exists) {
      toast.info('This item is already in your quote request');
      return;
    }
    
    setQuoteItems([...quoteItems, item]);
    toast.success('Added to quote request!');
    setShowQuoteBuilder(true);
  };

  const removeFromQuote = (itemId: string) => {
    setQuoteItems(quoteItems.filter(item => item.id !== itemId));
    toast.success('Removed from quote request');
  };

  const submitQuoteRequest = () => {
    if (quoteItems.length === 0) {
      toast.error('Please add at least one item to your quote request');
      return;
    }
    
    // Here you would send the quote request to your backend
    toast.success(`Quote request submitted for ${quoteItems.length} item(s)! We'll get back to you soon.`);
    setQuoteItems([]);
    setShowQuoteBuilder(false);
  };

  const dismissNotice = (noticeId: string) => {
    setActiveNotices(activeNotices.filter(n => n.id !== noticeId));
  };

  const getNoticeStyle = (type: string) => {
    const styles: Record<string, string> = {
      'info': 'bg-blue-500/10 border-blue-500/30 text-blue-200',
      'warning': 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200',
      'success': 'bg-green-500/10 border-green-500/30 text-green-200',
      'alert': 'bg-red-500/10 border-red-500/30 text-red-200',
      'maintenance': 'bg-orange-500/10 border-orange-500/30 text-orange-200',
      'announcement': 'bg-purple-500/10 border-purple-500/30 text-purple-200'
    };
    return styles[type] || styles['info'];
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'in-progress': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      'completed': 'text-green-400 bg-green-500/10 border-green-500/30',
      'pending': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      'on-hold': 'text-red-400 bg-red-500/10 border-red-500/30',
      'approved': 'text-green-400 bg-green-500/10 border-green-500/30',
      'rejected': 'text-red-400 bg-red-500/10 border-red-500/30',
      'paid': 'text-green-400 bg-green-500/10 border-green-500/30',
      'overdue': 'text-red-400 bg-red-500/10 border-red-500/30'
    };
    return colors[status] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'quotes', label: 'Quotes & Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'shopping', label: 'Shop', icon: ShoppingCart },
    { id: 'referrals', label: 'Referrals', icon: Star }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1A1A1A] via-[#0A0A0A] to-[#0A0A0A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Customer Info */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-transparent">
                Welcome back, {customerInfo.name.split(' ')[0]}
              </h1>
              <p className="text-gray-400">Member since {customerInfo.memberSince}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('shopping')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold transition shadow-lg flex items-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Shop Now
              </button>
              <button className="relative p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 transition">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
              </button>
              <button className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 transition">
                <Settings className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logo Marquee */}
      <LogoMarquee />

      {/* Advertising Text Banner */}
      <AdvertisingMarquee placement="portal-header" dismissible />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Active Notices */}
        {activeNotices.length > 0 && activeTab === 'dashboard' && (
          <div className="space-y-3">
            {activeNotices.map(notice => (
              <div
                key={notice.id}
                className={`rounded-xl border p-4 ${getNoticeStyle(notice.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Info className="w-4 h-4" />
                      <h4 className="font-semibold">{notice.title}</h4>
                    </div>
                    <p className="text-sm opacity-90 mb-2">{notice.message}</p>
                  </div>
                  {notice.dismissible && (
                    <button
                      onClick={() => dismissNotice(notice.id)}
                      className="p-1 hover:bg-white/10 rounded transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-orange-500/30 transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-orange-400" />
                      </div>
                      {stat.trend !== 'neutral' && (
                        <div className={`flex items-center gap-1 text-sm ${
                          stat.trend === 'up' ? 'text-green-400' : stat.trend === 'attention' ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {stat.trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                          {stat.trend === 'attention' && <AlertCircle className="w-4 h-4" />}
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                    <div className="text-xs text-gray-500 mt-2">{stat.change}</div>
                  </div>
                );
              })}
            </div>

            {/* Subscription Hour Tracking Widget */}
            <div className="bg-gradient-to-br from-purple-600/10 to-purple-700/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-400" />
                    {customerSubscription.plan === 'free' && 'Free Plan'}
                    {customerSubscription.plan === 'starter' && 'Starter Plan'}
                    {customerSubscription.plan === 'professional' && 'Professional Plan'}
                    {customerSubscription.plan === 'gold' && 'Gold Member Plan'}
                  </h3>
                  <p className="text-xs text-gray-400">Next billing: {customerSubscription.nextBillingDate}</p>
                </div>
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-xs font-semibold transition"
                >
                  Upgrade
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#0A0A0A] rounded p-2 border border-purple-500/20">
                  <p className="text-xs text-gray-400">Included</p>
                  <p className="text-lg font-bold text-purple-400">{customerSubscription.hoursIncluded}h</p>
                </div>
                <div className="bg-[#0A0A0A] rounded p-2 border border-purple-500/20">
                  <p className="text-xs text-gray-400">Used</p>
                  <p className="text-lg font-bold text-orange-400">{customerSubscription.hoursUsed}h</p>
                </div>
                <div className="bg-[#0A0A0A] rounded p-2 border border-purple-500/20">
                  <p className="text-xs text-gray-400">Rollover</p>
                  <p className="text-lg font-bold text-green-400">{customerSubscription.hoursRollover}h</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Available</span>
                  <span className="text-white font-medium">
                    {customerSubscription.hoursIncluded + customerSubscription.hoursRollover - customerSubscription.hoursUsed}h remaining
                  </span>
                </div>
                <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-gradient-to-r from-orange-600 to-orange-400"
                      style={{ width: `${(customerSubscription.hoursUsed / (customerSubscription.hoursIncluded + customerSubscription.hoursRollover)) * 100}%` }}
                    ></div>
                    <div
                      className="bg-gradient-to-r from-green-600 to-green-400"
                      style={{ width: `${((customerSubscription.hoursIncluded + customerSubscription.hoursRollover - customerSubscription.hoursUsed) / (customerSubscription.hoursIncluded + customerSubscription.hoursRollover)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Row: Featured Reels, Banner Ads, and Featured Services */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Video Reels Carousel */}
              <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4 flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Video className="w-4 h-4 text-orange-400" />
                    Featured Reels
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2 flex-1">
                  {videoReels.slice(0, 3).map(reel => (
                    <div key={reel.id} className="group cursor-pointer flex flex-col h-full">
                      <div className="relative rounded overflow-hidden mb-2 flex-1 bg-[#0A0A0A]">
                        <video
                          src={reel.videoUrl}
                          poster={reel.thumbnail}
                          autoPlay
                          loop
                          muted={mutedReels[reel.id]}
                          playsInline
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                        <div className="absolute bottom-1 left-1 right-1 pointer-events-none">
                          <p className="text-white text-xs font-medium line-clamp-1">{reel.title}</p>
                        </div>
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-xs text-white pointer-events-none">
                          {reel.duration}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReelSound(reel.id);
                          }}
                          className="absolute bottom-1 right-1 p-1 rounded bg-black/60 backdrop-blur-sm hover:bg-orange-600 transition text-white z-10"
                        >
                          {mutedReels[reel.id] ? (
                            <VolumeX className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                        <Eye className="w-3 h-3" />
                        <span>{reel.views}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Banner Ads Section */}
              {bannerAds.length > 0 && (
                <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4 group hover:border-orange-500/30 transition-all flex flex-col min-h-[400px]">
                  <div className="flex flex-col flex-1">
                    <div className="relative flex-1 mb-3 rounded overflow-hidden min-h-[200px]">
                      <img
                        src={bannerAds[currentAdIndex].image}
                        alt={bannerAds[currentAdIndex].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 px-2 py-1 bg-orange-600 text-white text-sm font-bold rounded">
                        SPONSORED
                      </div>
                    </div>
                    <div className="mb-3">
                      <h4 className="text-base font-bold mb-2 group-hover:text-orange-400 transition">{bannerAds[currentAdIndex].title}</h4>
                      <p className="text-sm text-gray-400 mb-3">{bannerAds[currentAdIndex].description}</p>
                    </div>
                    <button
                      onClick={() => addToQuote({
                        id: bannerAds[currentAdIndex].id,
                        type: 'ad',
                        title: bannerAds[currentAdIndex].title,
                        description: bannerAds[currentAdIndex].description,
                        image: bannerAds[currentAdIndex].image,
                        source: bannerAds[currentAdIndex].sponsorName
                      })}
                      className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded transition flex items-center justify-center gap-2"
                    >
                      {bannerAds[currentAdIndex].ctaText}
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Featured Services */}
              <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-4 flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    Featured Services
                  </h3>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="bg-[#0A0A0A] rounded border border-[#2A2A2A] overflow-hidden group hover:border-orange-500/30 transition-all flex flex-col flex-1">
                    <div className="relative flex-1 overflow-hidden min-h-[200px]">
                      <img
                        src={featuredServices[currentServiceIndex].image}
                        alt={featuredServices[currentServiceIndex].title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 ${featuredServices[currentServiceIndex].badgeColor} text-white text-sm font-bold rounded`}>
                          {featuredServices[currentServiceIndex].badge}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-base font-semibold mb-2 group-hover:text-orange-400 transition">{featuredServices[currentServiceIndex].title}</h4>
                      <p className="text-sm text-gray-400 mb-3">{featuredServices[currentServiceIndex].description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-orange-400">{featuredServices[currentServiceIndex].price}</span>
                          {featuredServices[currentServiceIndex].originalPrice && (
                            <span className="text-sm text-gray-500 line-through">{featuredServices[currentServiceIndex].originalPrice}</span>
                          )}
                        </div>
                        <button
                          onClick={() => addToQuote({
                            id: featuredServices[currentServiceIndex].id,
                            type: 'service',
                            title: featuredServices[currentServiceIndex].title,
                            description: featuredServices[currentServiceIndex].description,
                            price: featuredServices[currentServiceIndex].price,
                            image: featuredServices[currentServiceIndex].image,
                            source: 'featured'
                          })}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded text-sm font-semibold transition"
                        >
                          Get Quote
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Giveaways Section */}
            {giveaways.filter(g => g.status === 'active').length > 0 && (
              <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] p-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold flex items-center gap-1">
                    <Gift className="w-3 h-3 text-orange-400" />
                    Active Giveaways
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {giveaways
                    .filter(g => g.status === 'active')
                    .map(giveaway => (
                      <div key={giveaway.id} className="bg-gradient-to-br from-orange-600/10 to-orange-700/10 rounded border border-orange-500/30 overflow-hidden group hover:border-orange-500/50 transition-all">
                        <div className="flex gap-2">
                          <div className="relative w-20 h-20 flex-shrink-0">
                            <img
                              src={giveaway.image}
                              alt={giveaway.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-orange-600 text-white text-xs font-bold rounded flex items-center gap-0.5">
                              <Trophy className="w-2 h-2" />
                            </div>
                          </div>
                          <div className="flex-1 p-2 min-w-0">
                            <h4 className="text-xs font-bold mb-0.5 line-clamp-1">{giveaway.title}</h4>
                            <p className="text-xs text-gray-400 mb-1 line-clamp-1">{giveaway.description}</p>
                            
                            <div className="flex items-center gap-2 mb-1">
                              <div className="text-xs">
                                <span className="text-gray-400">Ends: </span>
                                <span className="text-orange-400 font-semibold">{giveaway.deadline}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => toast.success("You've been entered into the giveaway!")}
                              className="w-full px-2 py-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-xs rounded font-bold transition flex items-center justify-center gap-1"
                            >
                              <Gift className="w-2.5 h-2.5" />
                              Enter
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-400" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <PrimaryButton onClick={() => setShowWorkRequestModal(true)}>
                  <Plus className="w-4 h-4" />
                  New Work Request
                </PrimaryButton>
                <SecondaryButton onClick={() => setActiveTab('quotes')}>
                  <FileText className="w-4 h-4" />
                  View Quotes
                </SecondaryButton>
                <SecondaryButton onClick={() => setActiveTab('shopping')}>
                  <ShoppingCart className="w-4 h-4" />
                  Shop Products
                </SecondaryButton>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Projects */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-orange-400" />
                    Active Projects
                  </h3>
                  <button
                    onClick={() => setActiveTab('projects')}
                    className="text-sm text-orange-400 hover:text-orange-300 transition"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {loadingWorkRequests ? (
                    <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 text-center text-gray-400">
                      Loading your work requests...
                    </div>
                  ) : workRequests.length === 0 ? (
                    <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4 text-center">
                      <p className="text-gray-400 mb-2">No work requests yet</p>
                      <button
                        onClick={() => setShowWorkRequestModal(true)}
                        className="text-orange-400 hover:text-orange-300 text-sm"
                      >
                        Create your first request →
                      </button>
                    </div>
                  ) : (
                    workRequests.slice(0, 2).map(request => (
                      <div key={request.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium mb-1">{request.project_name || request.serviceType || 'Work Request'}</h4>
                            <p className="text-sm text-gray-400">{request.site_address || request.city || 'Address not specified'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(request.status || 'pending')}`}>
                            {request.status || 'pending'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Created</span>
                            <span className="text-white font-medium">
                              {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Messages */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-orange-400" />
                    Recent Messages
                  </h3>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="text-sm text-orange-400 hover:text-orange-300 transition"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`bg-[#0A0A0A] rounded-lg border p-4 cursor-pointer hover:border-orange-500/30 transition ${
                        msg.read ? 'border-[#2A2A2A]' : 'border-orange-500/20 bg-orange-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{msg.from}</h4>
                        <span className="text-xs text-gray-400">{msg.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2">{msg.preview}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Your Work Requests</h3>
                <PrimaryButton onClick={() => setShowWorkRequestModal(true)}>
                  <Plus className="w-4 h-4" />
                  New Request
                </PrimaryButton>
              </div>
              {loadingWorkRequests ? (
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-8 text-center text-gray-400">
                  Loading your work requests...
                </div>
              ) : workRequests.length === 0 ? (
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-8 text-center">
                  <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">You haven't submitted any work requests yet</p>
                  <button
                    onClick={() => setShowWorkRequestModal(true)}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-semibold transition inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create Your First Work Request
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {workRequests.map(request => (
                    <div key={request.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-medium mb-2">{request.project_name || request.serviceType || 'Work Request'}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {request.site_address || request.city || 'Address not specified'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm border ${getStatusColor(request.status || 'pending')}`}>
                          {(request.status || 'pending').replace('-', ' ')}
                        </span>
                      </div>
                      {request.description && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-400">{request.description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Service Type</p>
                          <p className="text-lg font-semibold">{request.serviceType || 'General'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Priority</p>
                          <p className="text-lg font-semibold">{request.priority_level || request.priority || 'Normal'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Timeline</p>
                          <p className="text-lg font-semibold">{request.timeline || 'TBD'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <SecondaryButton>
                          <Eye className="w-4 h-4" />
                          View Details
                        </SecondaryButton>
                        <SecondaryButton>
                          <MessageSquare className="w-4 h-4" />
                          Contact Support
                        </SecondaryButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="space-y-6">
            {/* Quotes Section */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-xl font-semibold mb-6">Quotes</h3>
              {loadingQuotes ? (
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-8 text-center text-gray-400">
                  Loading your quotes...
                </div>
              ) : quotes.length === 0 ? (
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No quotes found</p>
                  <p className="text-sm text-gray-500">Quotes will appear here once your work requests are reviewed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotes.map(quote => (
                    <div key={quote.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-medium mb-2">{quote.title || quote.project_name || 'Quote'}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>Created: {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'Recently'}</span>
                            {quote.expiryDate && <span>Expires: {quote.expiryDate}</span>}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm border ${getStatusColor(quote.status || 'pending')}`}>
                          {quote.status || 'pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Quote Amount</p>
                          <p className="text-2xl font-bold">${(quote.amount || quote.total || 0).toLocaleString()}</p>
                        </div>
                        {quote.items && (
                          <div className="text-right">
                            <p className="text-sm text-gray-400 mb-1">Items</p>
                            <p className="text-lg font-semibold">{quote.items}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {quote.status === 'pending' && (
                          <PrimaryButton>
                            <CheckCircle className="w-4 h-4" />
                            Approve Quote
                          </PrimaryButton>
                        )}
                        <SecondaryButton>
                          <Eye className="w-4 h-4" />
                          View Details
                        </SecondaryButton>
                        <SecondaryButton>
                          <Download className="w-4 h-4" />
                          Download PDF
                        </SecondaryButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices Section */}
            <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
              <h3 className="text-xl font-semibold mb-6">Invoices</h3>
              {loadingInvoices ? (
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-8 text-center text-gray-400">
                  Loading your invoices...
                </div>
              ) : invoices.length === 0 ? (
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-8 text-center">
                  <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No invoices found</p>
                  <p className="text-sm text-gray-500">Invoices will appear here once work is completed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map(invoice => (
                    <div key={invoice.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-medium mb-2">Invoice #{invoice.id}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>Issued: {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'Recently'}</span>
                            {invoice.dueDate && <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm border ${getStatusColor(invoice.status || 'pending')}`}>
                          {invoice.status || 'pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Amount Due</p>
                          <p className="text-2xl font-bold">${(invoice.amount || invoice.total || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                          <PrimaryButton>
                            <CreditCard className="w-4 h-4" />
                            Pay Now
                          </PrimaryButton>
                        )}
                        <SecondaryButton>
                          <Eye className="w-4 h-4" />
                          View Details
                        </SecondaryButton>
                        <SecondaryButton>
                          <Download className="w-4 h-4" />
                          Download PDF
                        </SecondaryButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6">
            <h3 className="text-xl font-semibold mb-6">Messages</h3>
            <div className="space-y-3">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`bg-[#0A0A0A] rounded-lg border p-4 cursor-pointer hover:border-orange-500/30 transition ${
                    msg.read ? 'border-[#2A2A2A]' : 'border-orange-500/20 bg-orange-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {!msg.read && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                      <h4 className="font-medium">{msg.from}</h4>
                    </div>
                    <span className="text-sm text-gray-400">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{msg.preview}</p>
                  <div className="flex gap-2">
                    <SecondaryButton>
                      <Eye className="w-4 h-4" />
                      Read Message
                    </SecondaryButton>
                    <SecondaryButton>
                      <Send className="w-4 h-4" />
                      Reply
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'shopping' && (
          <div>
            <CustomerMarketplace />
          </div>
        )}

        {activeTab === 'referrals' && (
          <div>
            <ReferralRewards />
          </div>
        )}
      </div>

      {/* Work Request Modal */}
      {showWorkRequestModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">New Work Request</h3>
                <button
                  onClick={() => setShowWorkRequestModal(false)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <ClientWorkRequestForm
                onClose={() => setShowWorkRequestModal(false)}
                onProjectCreated={async (projectId) => {
                  toast.success('Work request submitted successfully!');
                  setShowWorkRequestModal(false);
                  console.log('Project created:', projectId);
                  
                  // Reload work requests
                  if (user?.id) {
                    try {
                      const url = new URL(`${API_BASE_URL}/make-server-57095a78/work-requests`);
                      url.searchParams.append('userId', user.id);
                      const response = await fetch(url.toString(), {
                        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
                      });
                      if (response.ok) {
                        const data = await response.json();
                        setWorkRequests(data || []);
                      }
                    } catch (error) {
                      console.error('Error reloading work requests:', error);
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quote Builder Modal */}
      {showQuoteBuilder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Quote Request</h3>
                <button
                  onClick={() => setShowQuoteBuilder(false)}
                  className="p-2 hover:bg-[#2A2A2A] rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Selected Items</h4>
                  <div className="space-y-2">
                    {quoteItems.map(item => (
                      <div key={item.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-8 h-8 object-cover"
                          />
                          <div>
                            <h5 className="text-sm font-medium">{item.title}</h5>
                            <p className="text-xs text-gray-400">{item.description}</p>
                            {item.price && (
                              <p className="text-sm font-bold text-orange-400">{item.price}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromQuote(item.id)}
                          className="p-1 hover:bg-[#2A2A2A] rounded-lg transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <PrimaryButton
                    onClick={submitQuoteRequest}
                  >
                    <Send className="w-4 h-4" />
                    Submit Quote Request
                  </PrimaryButton>
                  <SecondaryButton onClick={() => setShowQuoteBuilder(false)}>
                    Cancel
                  </SecondaryButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Upgrade Modal */}
      <CustomerSubscriptionSelectionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSelectFree={() => {
          toast.info('You are already on a free plan');
          setShowSubscriptionModal(false);
        }}
        onSelectPaid={() => {
          toast.success('Premium subscription activated! Enjoy your new benefits.');
          setShowSubscriptionModal(false);
          // TODO: Integrate with actual payment processing
        }}
      />
    </div>
  );
}