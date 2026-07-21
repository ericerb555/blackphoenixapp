import SponsoredMarquee from '../SponsoredMarquee';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import PlanBuilderTab from './PlanBuilderTab';
import { useState, useEffect, useRef, Component, ReactNode } from 'react';

// Error boundary so SponsoredMarquee can't crash the portal
class Safe extends Component<{children:ReactNode},{e:boolean}> {
  state={e:false};
  static getDerivedStateFromError(){return{e:true};}
  render(){return this.state.e?null:this.props.children;}
}

// Module-level constant — prevents inline array causing render loops
const DEFAULT_NOTICES = [
  { id: 'n1', title: 'Welcome!', message: 'Submit a work request to get started.', type: 'announcement', dismissible: true },
];
import {
  Layout, FileText, Briefcase, DollarSign, MessageSquare, Bell,
  User, Settings, Home, Calendar, Clock, MapPin, Phone, Mail,
  Download, Eye, Check, X, Star, TrendingUp, Activity, AlertCircle,
  CheckCircle, Package, ChevronRight, CreditCard, FileCheck, Send,
  ClipboardList, Wrench, Info, AlertTriangle, ShoppingCart, Trash2,
  Recycle, Video, ArrowUpRight, ArrowDownRight, Plus, Filter,
  Upload, Search, Play, Pause, Volume2, VolumeX, ChevronLeft, 
  Sparkles, Zap, Crown, Gift, Trophy, Timer, Users, Target, ExternalLink, Smartphone, Monitor,
  Megaphone, Tag, Award, BarChart3, Building2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PrimaryButton } from '../ui/button/PrimaryButton';
import { SecondaryButton } from '../ui/button/SecondaryButton';
import LogoMarquee from '../LogoMarquee';
import AdvertisingMarquee from '../AdvertisingMarquee';
import ReferralRewards from '../ReferralRewards';
import { ConfirmModal } from '../ui/modal/ConfirmModal';
import CustomerMarketplace from '../CustomerMarketplace';
// VideoCapture removed — file path was broken (causes module crash)
import ClientWorkRequestForm from '../forms/ClientWorkRequestForm';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../lib/apiConfig';
import { publicAnonKey, projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';
import { subscribeToPush, isPushSubscribed } from '../../utils/pushNotifications';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'quotes' | 'payments' | 'plan-tracker' | 'plan-builder' | 'messages' | 'shopping' | 'referrals'>('dashboard');
  const [showWorkRequestModal, setShowWorkRequestModal] = useState(false);
  const [mobileView, setMobileView] = useState(false); // Toggle mobile/desktop view
  const [workRequests, setWorkRequests] = useState<any[]>([]); // Real work requests from API
  const [loadingWorkRequests, setLoadingWorkRequests] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]); // Real quotes from API
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]); // Real invoices from API
  const [loadingInvoices, setLoadingInvoices] = useState(false);

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

        // Use the user's actual session token so the server can authenticate
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || publicAnonKey;

        const url = new URL(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/work-requests`);
        url.searchParams.append('userId', user.id);
        // Also send email as fallback — catches requests where user_id wasn't saved
        if (user.email) url.searchParams.append('email', user.email);

        const response = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          // Server returns array directly (filtered by userId)
          const requests = Array.isArray(data) ? data : (data.workRequests || []);
          setWorkRequests(requests);
        } else {
          // 404 means the server function hasn't been redeployed yet — silent fallback
          setWorkRequests([]);
        }
      } catch (error: any) {
        console.log('ℹ️ Work requests API unavailable:', error.message);
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

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sign in to view invoices.');
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${session.access_token}` }
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

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sign in to view invoices.');
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${session.access_token}` }
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

  // Customer info derived from profile (or demo profile when role-switching)
  const _demoProfile = (() => { try { const r = localStorage.getItem('demo_role_profile'); return r ? JSON.parse(r) : null; } catch { return null; } })();
  const customerInfo = {
    name: _demoProfile?.name || displayName,
    email: _demoProfile?.email || user?.email || profile?.email || 'customer@email.com',
    phone: _demoProfile?.phone || profile?.phone || '(214) 555-0284',
    address: profile?.address || '742 Evergreen Terrace, Springfield',
    memberSince: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently',
    activeProjects: workRequests.length,
    totalSpent: 45600,
    savedAmount: 8400
  };

  // Active notices
  const [activeNotices, setActiveNotices] = useState(DEFAULT_NOTICES);

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

  // Video Reels — live from vendors/subcontractors/advertisers/content creation
  const STATIC_REELS = [
    {
      id: 'reel-001',
      title: 'Home Renovation Before & After',
      thumbnail: 'https://images.unsplash.com/photo-1753977725475-41b221add2c0?w=800&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      duration: '0:45',
      views: '2.3K',
      advertiser: { name: 'Black Phoenix Builds' },
    },
    {
      id: 'reel-002',
      title: 'Fast Handyman Repairs',
      thumbnail: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=800&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      duration: '1:00',
      views: '5.1K',
      advertiser: { name: 'Black Phoenix Handyman' },
    },
    {
      id: 'reel-003',
      title: 'Trash & Junk Removal',
      thumbnail: 'https://images.unsplash.com/photo-1510251197878-a2e6d2cb590c?w=800&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      duration: '0:52',
      views: '3.8K',
      advertiser: { name: 'Black Phoenix Trash Removal' },
    },
  ];
  const [videoReels, setVideoReels] = useState<any[]>(STATIC_REELS);
  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/public/reels`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then(r => r.ok ? r.json() : { reels: [] })
      .then(data => {
        if (Array.isArray(data.reels) && data.reels.length > 0) {
          // Map server reels to the shape expected by this component
          setVideoReels(data.reels.map((r: any) => ({
            id: r.id,
            title: r.title,
            thumbnail: r.thumbnailUrl || '',
            videoUrl: r.videoUrl || '',
            duration: r.duration || '',
            views: r.views || '0',
            advertiser: r.advertiser,
          })));
        }
      })
      .catch(() => {});
  }, []);

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

  // Track which giveaways the customer has entered (persisted in localStorage)
  const [enteredGiveaways, setEnteredGiveaways] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('entered_giveaways') || '[]'); } catch { return []; }
  });

  const enterGiveaway = async (giveawayId: string, giveawayTitle: string) => {
    if (enteredGiveaways.includes(giveawayId)) {
      toast.info("You've already entered this giveaway!");
      return;
    }
    const updated = [...enteredGiveaways, giveawayId];
    setEnteredGiveaways(updated);
    localStorage.setItem('entered_giveaways', JSON.stringify(updated));

    // Save entry to server KV so admin can see it
    const entry = {
      id: `gentry_${Date.now()}`,
      giveawayId,
      giveawayTitle,
      customerId: user?.id || 'guest',
      customerEmail: user?.email || '',
      customerName: displayName || user?.email || 'Customer',
      enteredAt: new Date().toISOString(),
    };
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/kv/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ key: `giveaway_entry_${entry.id}`, value: entry }),
        signal: AbortSignal.timeout(8000),
      });
      // Add to admin alerts
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/notifications/admin-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          type: 'info', category: 'Giveaways',
          title: `🎁 New Giveaway Entry — ${entry.customerName}`,
          description: `${entry.customerEmail} entered: ${giveawayTitle}`,
          priority: 'low', status: 'unread', source: 'customer-portal',
          data: entry,
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch { /* server unavailable — entry still saved locally */ }

    toast.success("🎉 You're in! Good luck!", {
      description: `Entry confirmed for: ${giveawayTitle}`,
      duration: 4000,
    });
  };

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
    { id: 'plan-tracker', label: 'My Plan', icon: BarChart3 },
    { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'shopping', label: 'Shop', icon: ShoppingCart },
    { id: 'deals', label: 'Deals & Reels', icon: Megaphone },
    { id: 'referrals', label: 'Referrals', icon: Star }
  ];

  // Unread message count — fetched from server so it's real-time
  const [unreadMessages, setUnreadMessages] = useState(0);
  useEffect(() => {
    const fetchUnread = async () => {
      if (!user?.id && !user?.email) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || publicAnonKey;
        const convUrl = new URL(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/messaging/conversations/${user.id || 'guest'}`);
        if (user.email) convUrl.searchParams.set('email', user.email);
        const res = await fetch(convUrl.toString(), { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const convs: any[] = data.conversations || [];
          const total = convs.reduce((sum: number, c: any) => {
            const count = c.unreadCount?.[user.id] || c.unreadCount?.[user.email || ''] || 0;
            return sum + count;
          }, 0);
          setUnreadMessages(total);
        }
      } catch {}
    };
    fetchUnread();
    // Re-check every 15 seconds
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user?.id, user?.email]);

  // Clear unread when messages tab is opened
  useEffect(() => {
    if (activeTab === 'messages') setUnreadMessages(0);
  }, [activeTab]);

  // Show browser notification when new messages arrive (if tab not focused)
  const prevUnreadRef = useRef(0);
  useEffect(() => {
    if (unreadMessages > prevUnreadRef.current && prevUnreadRef.current >= 0 && document.hidden) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New message from Black Phoenix', {
          body: 'You have a new message. Tap to view.',
          icon: '/BPB_phoenix_full_color_logo.png',
          tag: 'bp-message',
        });
      }
    }
    prevUnreadRef.current = unreadMessages;
  }, [unreadMessages]);

  return (
    <div className="w-full min-h-screen bg-[#0A0A0A] text-white pb-12">
      {/* Sponsored Marquee at very top */}
      <Safe><SponsoredMarquee /></Safe>
      <AdvertisingMarquee placement="customer-portal" dismissible />

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
              <button
                onClick={async () => {
                  if (isPushSubscribed()) {
                    toast.info('Push notifications are already enabled');
                    return;
                  }
                  const ok = await subscribeToPush(user?.id, user?.email || '', 'customer');
                  if (ok) toast.success('🔔 Notifications enabled! You\'ll get alerts for quotes, messages, and updates.');
                  else toast.error('Notifications not available in this browser or permission was denied.');
                }}
                title={isPushSubscribed() ? 'Notifications enabled' : 'Enable push notifications'}
                className={`relative p-2 rounded-lg border transition ${isPushSubscribed() ? 'bg-orange-600/20 border-orange-500/50' : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-orange-500/30'}`}
              >
                <Bell className={`w-5 h-5 ${isPushSubscribed() ? 'text-orange-400' : 'text-gray-400'}`} />
                {unreadMessages > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
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
              const isMessages = tab.id === 'messages';
              const hasUnread = isMessages && unreadMessages > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-orange-600 text-white'
                      : hasUnread
                        ? 'bg-orange-600/10 text-orange-300 border border-orange-500/50 hover:bg-orange-600/20'
                        : 'bg-[#0A0A0A] text-gray-400 hover:text-white border border-[#2A2A2A] hover:border-orange-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {hasUnread && (
                    <span className="relative flex">
                      <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-orange-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 items-center justify-center text-[8px] font-bold text-white">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>


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
                        {reel.views ? <><Eye className="w-3 h-3" /><span>{reel.views}</span></> : <span className="truncate text-center">{reel.advertiser?.name}</span>}
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
                              onClick={() => enterGiveaway(giveaway.id, giveaway.title)}
                              disabled={enteredGiveaways.includes(giveaway.id)}
                              className={`w-full px-2 py-1 text-white text-xs rounded font-bold transition flex items-center justify-center gap-1 ${
                                enteredGiveaways.includes(giveaway.id)
                                  ? 'bg-green-600/40 cursor-default'
                                  : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400'
                              }`}
                            >
                              <Gift className="w-2.5 h-2.5" />
                              {enteredGiveaways.includes(giveaway.id) ? '✓ Entered' : 'Enter'}
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
                  {workRequests.map(request => {
                    // Progress steps — shows customer exactly where their request is
                    const STEPS = [
                      { key: 'pending',     label: 'Submitted',    icon: '📋' },
                      { key: 'opened',      label: 'Opened',       icon: '👀' },
                      { key: 'in-progress', label: 'In Progress',  icon: '🔨' },
                      { key: 'quote-sent',  label: 'Quote Sent',   icon: '💰' },
                      { key: 'completed',   label: 'Completed',    icon: '✅' },
                    ];
                    const currentStatus = request.status || 'pending';
                    const currentIdx = STEPS.findIndex(s => s.key === currentStatus);
                    const stepIdx = currentIdx >= 0 ? currentIdx : 0;

                    const statusMessages: Record<string, string> = {
                      pending: 'Your request has been received. We\'ll review it shortly.',
                      opened: '👀 Good news — your request has been opened and is being reviewed!',
                      'in-progress': '🔨 We\'re actively working on your project!',
                      'quote-sent': '💰 A quote has been sent to your email. Check your inbox!',
                      completed: '✅ Your project is complete. Thank you for choosing Black Phoenix!',
                    };

                    return (
                    <div key={request.id} className="bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
                      {/* Header */}
                      <div className="flex items-start justify-between p-5 border-b border-[#2A2A2A]">
                        <div>
                          <h4 className="text-base font-bold text-white mb-1">{request.project_name || request.serviceType || 'Work Request'}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{request.site_address || request.city || 'Address not specified'}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Recently'}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(currentStatus)}`}>
                          {currentStatus.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>

                      {/* Progress tracker */}
                      <div className="px-5 py-4 bg-[#111]">
                        <div className="flex items-center justify-between relative">
                          {/* Progress line */}
                          <div className="absolute left-0 right-0 top-4 h-0.5 bg-[#2A2A2A] z-0" />
                          <div className="absolute left-0 top-4 h-0.5 bg-orange-500 z-0 transition-all duration-500"
                            style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }} />

                          {STEPS.map((step, i) => {
                            const done = i < stepIdx;
                            const active = i === stepIdx;
                            return (
                              <div key={step.key} className="flex flex-col items-center gap-1.5 z-10">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                                  done ? 'bg-orange-600 border-orange-600 text-white' :
                                  active ? 'bg-orange-600/20 border-orange-500 text-orange-400' :
                                  'bg-[#0A0A0A] border-[#2A2A2A] text-gray-600'
                                }`}>
                                  {done ? '✓' : step.icon}
                                </div>
                                <span className={`text-[10px] font-medium text-center leading-tight ${active ? 'text-orange-400' : done ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Status message */}
                        <p className={`text-xs mt-4 text-center ${currentStatus === 'opened' || currentStatus === 'in-progress' ? 'text-green-400' : 'text-gray-400'}`}>
                          {statusMessages[currentStatus] || 'Your request is being processed.'}
                        </p>
                      </div>

                      {/* Leave a Review — shown when project is completed */}
                      {currentStatus === 'completed' && (
                        <div className="px-4 pt-3 border-t border-[#2A2A2A]">
                          <button
                            onClick={() => {
                              // Pre-fill the review form with service type
                              const reviewUrl = `/?tab=reviews&service=${encodeURIComponent(request.serviceType || 'General')}#reviews`;
                              window.open(reviewUrl, '_blank');
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 text-sm font-bold rounded-xl transition"
                          >
                            ⭐ Leave a Review for This Project
                          </button>
                        </div>
                      )}

                      {/* Details */}
                      <div className="grid grid-cols-3 gap-0 border-t border-[#2A2A2A]">
                        <div className="p-4 border-r border-[#2A2A2A]">
                          <p className="text-[10px] text-gray-500 mb-1">Service</p>
                          <p className="text-sm font-semibold text-white">{request.serviceType || 'General'}</p>
                        </div>
                        <div className="p-4 border-r border-[#2A2A2A]">
                          <p className="text-[10px] text-gray-500 mb-1">Priority</p>
                          <p className="text-sm font-semibold text-white">{request.priority_level || 'Normal'}</p>
                        </div>
                        <div className="p-4">
                          <p className="text-[10px] text-gray-500 mb-1">Timeline</p>
                          <p className="text-sm font-semibold text-white">{request.timeline || 'TBD'}</p>
                        </div>
                      </div>
                    </div>
                    );
                  })}
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
                      <div className="flex gap-2 flex-wrap">
                        {quote.status === 'pending' && quote.approvalUrl && (
                          <a href={quote.approvalUrl} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg transition">
                            <CheckCircle className="w-4 h-4" />
                            Review & Sign Quote
                          </a>
                        )}
                        {(quote.status === 'approved' || quote.quote_approved) && !quote.deposit_paid && (
                          <button
                            onClick={async () => {
                              const { data: { session } } = await supabase.auth.getSession();
                              const token = session?.access_token || publicAnonKey;
                              const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/payments/create-checkout`, {
                                method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ amount: Math.round((quote.amount || quote.total || 0) * 0.30), description: `30% Deposit — ${quote.title || 'Project'}`, clientName: user?.email, clientEmail: user?.email, workRequestId: quote.workRequestId }),
                              });
                              const data = await res.json();
                              if (data.url) window.open(data.url, '_blank');
                              else toast.error(data.error || 'Payment setup required — contact Black Phoenix');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition"
                          >
                            <CreditCard className="w-4 h-4" />
                            Pay 30% Deposit
                          </button>
                        )}
                        <SecondaryButton><Eye className="w-4 h-4" />View Details</SecondaryButton>
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
                      <div className="flex gap-2 flex-wrap">
                        {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                          <button
                            onClick={async () => {
                              const { data: { session } } = await supabase.auth.getSession();
                              const tok = session?.access_token || publicAnonKey;
                              const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-57095a78/payments/create-checkout`, {
                                method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ amount: invoice.amount || invoice.total, description: `Invoice #${invoice.id}`, clientEmail: user?.email, clientName: user?.email?.split('@')[0], invoiceId: invoice.id, workRequestId: invoice.workRequestId }),
                              });
                              const data = await res.json();
                              if (data.url) window.open(data.url, '_blank');
                              else toast.error(data.error || 'Payment setup required — contact Black Phoenix to set up payments');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-green-500/20"
                          >
                            <CreditCard className="w-4 h-4" />
                            💳 Pay Now — ${(invoice.amount || invoice.total || 0).toLocaleString()}
                          </button>
                        )}
                        {invoice.status === 'paid' && (
                          <span className="flex items-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 text-sm font-semibold rounded-lg">
                            <CheckCircle className="w-4 h-4" /> Paid
                          </span>
                        )}
                        <SecondaryButton><Download className="w-4 h-4" />Download PDF</SecondaryButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <CustomerMessagesTab userId={user?.id || ''} userEmail={user?.email || ''} userName={user?.email?.split('@')[0] || 'Customer'} />
        )}

        {activeTab === 'plan-tracker' && <MaintenancePlanTracker portalRole="customer" ownerName={customerInfo.name} />}
        {activeTab === 'plan-builder' && <PlanBuilderTab portalType="customer" ownerName={customerInfo.name} />}
        {activeTab === 'shopping' && (
          <div>
            <CustomerMarketplace />
          </div>
        )}

        
        {activeTab === 'deals' && (
          <>
          <FeaturedDealsReels portalType="customer" />
          <DealsOffersSection portalType="advertiser" storageKey="customer_deals" />
          </>
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

// ── Customer Messages Tab — reads from the real messaging server ──────────────
function CustomerMessagesTab({ userId, userEmail, userName }: { userId: string; userEmail?: string; userName: string }) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [convMessages, setConvMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || publicAnonKey;
  };

  useEffect(() => {
    if (userId) {
      loadConversations();
      // Poll for new messages every 20 seconds
      const interval = setInterval(loadConversations, 20000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      // Send both userId AND email so server can match by either
      const convUrl = new URL(`${SERVER}/messaging/conversations/${userId}`);
      if (userEmail) convUrl.searchParams.set('email', userEmail);
      const res = await fetch(convUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || data || []);
      }
    } catch {}
    setLoading(false);
  };

  const openConversation = async (conv: any) => {
    setSelectedConv(conv);
    const token = await getToken();
    const res = await fetch(`${SERVER}/messaging/conversations/${conv.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setConvMessages(data.messages || data || []);
    }
    // Mark as read
    fetch(`${SERVER}/messaging/conversations/${conv.id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).catch(() => {});
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedConv) return;
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${SERVER}/messaging/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          senderId: userId,
          senderName: userName,
          senderRole: 'customer',
          content: reply.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConvMessages(prev => [...prev, data.message || data]);
        setReply('');
      }
    } catch {}
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedConv) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl flex flex-col h-[500px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2A2A]">
          <button onClick={() => { setSelectedConv(null); loadConversations(); }} className="text-gray-400 hover:text-white">←</button>
          <div>
            <p className="font-semibold text-white text-sm">{selectedConv.name || 'Black Phoenix Team'}</p>
            <p className="text-xs text-gray-500">Re: your project</p>
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {convMessages.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-8">No messages yet</p>
          )}
          {convMessages.map((msg: any) => {
            const isMe = msg.senderId === userId || msg.senderRole === 'customer';
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${isMe ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-200 rounded-tl-none'}`}>
                  {!isMe && <p className="text-xs font-semibold text-orange-400 mb-1">{msg.senderName || 'Black Phoenix'}</p>}
                  <p className="leading-relaxed">{msg.content}</p>
                  <p className="text-xs opacity-50 mt-1 text-right">{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        {/* Reply */}
        <div className="flex gap-2 p-3 border-t border-[#2A2A2A]">
          <input
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
            placeholder="Type your reply..."
            className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 rounded-xl text-white text-sm font-semibold transition"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Messages</h3>
        <span className="text-sm text-gray-500">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</span>
      </div>
      {conversations.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-10 text-center">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 font-medium">No messages yet</p>
          <p className="text-sm text-gray-600 mt-1">When Black Phoenix sends you a message it will appear here</p>
        </div>
      ) : (
        conversations.map((conv: any) => {
          const unread = conv.unreadCount?.[userId] || 0;
          return (
            <button key={conv.id} onClick={() => openConversation(conv)} className="w-full text-left bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/40 rounded-xl p-4 transition group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">BP</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm truncate">{conv.name || 'Black Phoenix Team'}</p>
                      {unread > 0 && <span className="w-5 h-5 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0">{unread}</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage || 'No messages yet'}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-600 flex-shrink-0">{conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString() : ''}</span>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
