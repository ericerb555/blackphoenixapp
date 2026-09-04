import PortalFeatureGuide from './PortalFeatureGuide';
import SponsoredMarquee from '../SponsoredMarquee';
import PortalTrialBanner from './PortalTrialBanner';
import DealsOffersSection from './DealsOffersSection';
import FeaturedDealsReels from './FeaturedDealsReels';
import MaintenancePlanTracker from './MaintenancePlanTracker';
import PlanBuilderTab from './PlanBuilderTab';
import InvestmentTab from './InvestmentTab';
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
  ClipboardList, Wrench, Info, AlertTriangle, ShoppingCart, Trash2, Hammer,
  Recycle, Video, ArrowUpRight, ArrowDownRight, Plus, Filter,
  Upload, Search, Play, Pause, Volume2, VolumeX, ChevronLeft, 
  Sparkles, Zap, Crown, Gift, Trophy, Timer, Users, Target, ExternalLink, Smartphone, Monitor,
  Megaphone, Tag, Award, BarChart3, Building2, Image as ImageIcon
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
import { PortalDocumentVault } from './PortalDocumentVault';
import FloorVisualiser from './FloorVisualiser';
import HomeVisualiser from './HomeVisualiser';
import CustomerDesignTab from './CustomerDesignTab';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../lib/apiConfig';
import { publicAnonKey, projectId } from '../../utils/supabase/info';

// Module scope: it was declared 1,200 lines into the component, below several
// effects that use it. Those worked only because an effect body runs after
// render; anything reaching for it during render would have thrown.
const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
import { authedHeaders, authedHeadersOrAnon } from '../../utils/authHeaders';
import { VendorProductPicker, type PickedProduct } from './VendorProductPicker';
import { mergeProductLine, catalogKey } from '../../lib/quoteLines';
import { supabase } from '../../lib/supabase';
import { subscribeToPush, isPushSubscribed } from '../../utils/pushNotifications';
import CustomerSubscriptionSelectionModal from '../CustomerSubscriptionSelectionModal';
import { useUserProfile } from '../../lib/hooks/useUserProfile';
import { useUserData } from '../../lib/hooks/useUserData';
import PortalSettings from './PortalSettings';

interface Message {
  id: string;
  from: string;
  subject: string;
  preview: string;
  timestamp: string;
  read: boolean;
}

export default function CustomerPortalView() {
  const { user, session } = useAuth();
  const { profile, displayName } = useUserProfile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'quotes' | 'contracts' | 'payments' | 'plan-tracker' | 'plan-builder' | 'messages' | 'shopping' | 'investments' | 'referrals' | 'documents' | 'floor-visualiser' | 'visualiser' | 'design' | 'deals' | 'guide'>('dashboard');
  const [showPortalSettings, setShowPortalSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'account' | 'notifications'>('account');
  const [showWorkRequestModal, setShowWorkRequestModal] = useState(false);
  const [mobileView, setMobileView] = useState(false); // Toggle mobile/desktop view
  const [workRequests, setWorkRequests] = useState<any[]>([]); // Real work requests from API
  const [loadingWorkRequests, setLoadingWorkRequests] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]); // Real quotes from API
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]); // Real invoices from API
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [signingContractId, setSigningContractId] = useState<string | null>(null);

  // Check URL for tab query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['dashboard', 'projects', 'quotes', 'contracts', 'shopping', 'payments', 'messages', 'referrals'].includes(tab)) {
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
        if (!session?.access_token) throw new Error('Sign in to view your work requests.');

        const url = new URL(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/work-requests`);
        url.searchParams.append('userId', user.id);
        // Also send email as fallback — catches requests where user_id wasn't saved
        if (user.email) url.searchParams.append('email', user.email);

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${session.access_token}` }
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
        const url = new URL(`${API_BASE_URL}/make-server-3eae23a6/quotes`);
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
        const url = new URL(`${API_BASE_URL}/make-server-3eae23a6/invoices`);
        url.searchParams.append('userId', user.id);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sign in to view invoices.');
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Loaded invoices for user:', user.id, data);
          setInvoices(Array.isArray(data) ? data : (data.invoices || []));
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

  // Contracts belong to the same signed-in customer as invoices.  Keep them
  // in the portal so a newly generated contract can actually be signed.
  useEffect(() => {
    const loadContracts = async () => {
      if (!user?.id) { setContracts([]); setLoadingContracts(false); return; }
      setLoadingContracts(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sign in to view contracts.');
        const response = await fetch(`${API_BASE_URL}/make-server-3eae23a6/contracts`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not load contracts.');
        setContracts(data.contracts || []);
      } catch (error) { console.warn('Contracts API unavailable:', error); setContracts([]); }
      finally { setLoadingContracts(false); }
    };
    void loadContracts();
  }, [user?.id]);

  const signContract = async (contract: any) => {
    const signatureName = window.prompt('Type your full legal name to sign this contract:')?.trim();
    if (!signatureName) return;
    setSigningContractId(contract.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Your session has expired. Please sign in again.');
      const response = await fetch(`${API_BASE_URL}/make-server-3eae23a6/contracts/${encodeURIComponent(contract.id)}/sign`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ acceptTerms: true, signatureName }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not sign this contract.');
      setContracts(current => current.map(item => item.id === contract.id ? data.contract : item));
      toast.success('Contract signed. Your project team has been notified.');
    } catch (error: any) { toast.error(error.message || 'Could not sign this contract.'); }
    finally { setSigningContractId(null); }
  };

  // Stripe returns here after checkout. Ask the server to verify the session with
  // Stripe before showing an upgraded plan; query parameters alone never unlock access.
  useEffect(() => {
    const paymentId = new URLSearchParams(window.location.search).get('payment_id');
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!paymentId || !sessionId || !user?.email) return;
    const complete = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`${API_BASE_URL}/make-server-3eae23a6/payments/complete`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentId, sessionId }) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Payment is still being confirmed.');
        if (data.subscription) setCustomerSubscription({ plan: data.subscription.plan || 'premium', hoursIncluded: Number(data.subscription.hoursIncluded || 0), hoursUsed: Number(data.subscription.hoursUsed || 0), hoursRollover: Number(data.subscription.hoursRollover || 0), hoursGifted: Number(data.subscription.hoursGifted || 0), nextBillingDate: data.subscription.renewalDate || '', price: Number(data.subscription.amount || 0) });
        window.history.replaceState({}, '', `${window.location.pathname}?tab=dashboard`);
        toast.success(data.planActivation ? 'Payment confirmed. Your approved plan and service-hour access are active.' : 'Payment confirmed. Your subscription is active.');
      } catch (error: any) { toast.error(error.message || 'Payment confirmation is still pending.'); }
    };
    void complete();
  }, [user?.email]);

  // Customer info derived from profile (or demo profile when role-switching)
  const _demoProfile = (() => { try { const r = localStorage.getItem('demo_role_profile'); return r ? JSON.parse(r) : null; } catch { return null; } })();
  // Placeholder contact details are gone. A customer whose phone is missing was
  // being shown "(214) 555-0284" and an address of "742 Evergreen Terrace,
  // Springfield" — the Simpsons' house — which reads as their own record being
  // wrong rather than as a field nobody has filled in.
  const customerInfo = {
    name: _demoProfile?.name || displayName,
    email: _demoProfile?.email || user?.email || profile?.email || '',
    phone: _demoProfile?.phone || profile?.phone || '',
    address: profile?.address || '',
    memberSince: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '',
    activeProjects: workRequests.length,
    // Counted from the invoices already loaded, rather than the $45,600 and
    // $8,400 that used to be asserted here.
    totalSpent: invoices.reduce((sum: number, inv: any) => sum + Number(inv.total_amount ?? inv.total ?? inv.amount ?? 0), 0),
    savedAmount: null,
  };

  // Active notices
  const [activeNotices, setActiveNotices] = useState(DEFAULT_NOTICES);

  // Stats - calculate from real data
  const pendingQuotesCount = quotes.filter(q => q.status === 'pending').length;
  const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + Number(inv.total_amount ?? inv.total ?? inv.amount ?? 0), 0);

  const stats = [
    { label: 'Active Projects', value: workRequests.length.toString(), change: loadingWorkRequests ? 'Loading...' : `${workRequests.length} total`, trend: 'up', icon: Briefcase, color: 'orange' },
    { label: 'Pending Quotes', value: pendingQuotesCount.toString(), change: loadingQuotes ? 'Loading...' : `${quotes.length} total`, trend: pendingQuotesCount > 0 ? 'attention' : 'neutral', icon: FileText, color: 'blue' },
    { label: 'Total Invoiced', value: `$${(totalInvoiceAmount / 1000).toFixed(1)}K`, change: loadingInvoices ? 'Loading...' : `${invoices.length} invoices`, trend: 'neutral', icon: DollarSign, color: 'green' },
    // "Saved via Deals — $8.4K, 18% savings" was invented, and nothing in the
    // platform computes what a customer saved. Contracts signed is a real count
    // from data already on screen, and is worth as much to them.
    { label: 'Contracts', value: contracts.length.toString(), change: contracts.filter((x: any) => x.status === 'signed' || x.signature).length + ' signed', trend: 'neutral', icon: FileText, color: 'yellow' }
  ];

  // Projects data
  // The  mock that sat here is deleted. It was 22 lines of invented
  // renovations — with a Springfield address — and had zero references: the
  // dashboard renders workRequests, which are real.

  // Quotes data is now loaded from API via state (see useEffect above)

  // User-specific messages data
  const [messages, setMessages] = useUserData<Message[]>('customer_messages', []);

  // NEW: Customer subscription plan data
  const [customerSubscription, setCustomerSubscription] = useState({ plan: 'free', hoursIncluded: 0, hoursUsed: 0, hoursRollover: 0, hoursGifted: 0, nextBillingDate: '', price: 0 });

  useEffect(() => {
    const loadSubscription = async () => {
      if (!user?.email) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`${API_BASE_URL}/make-server-3eae23a6/subscriptions`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const data = await response.json();
        const subscription = (data.subscriptions || []).find((item: any) => item.status === 'active') || data.subscriptions?.[0];
        if (!response.ok || !subscription) return;
        setCustomerSubscription({ plan: subscription.plan || subscription.planName || 'free', hoursIncluded: Number(subscription.hoursIncluded ?? subscription.hours?.included ?? 0), hoursUsed: Number(subscription.hoursUsed ?? subscription.hours?.used ?? 0), hoursRollover: Number(subscription.hoursRollover ?? subscription.hours?.rollover ?? 0), hoursGifted: Number(subscription.hoursGifted ?? subscription.hours?.gifted ?? 0), nextBillingDate: subscription.renewalDate || '', price: Number(subscription.amount ?? subscription.monthlyTotal ?? 0) });
      } catch (error) { console.warn('Subscription summary unavailable:', error); }
    };
    void loadSubscription();
  }, [user?.email]);

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
    // Published reels are public by design and allowlisted as such on the
    // server, so this stays on the anon key.
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/public/reels`, {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
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
  // The published services catalogue. These were hardcoded promotional offers
  // with prices — "Spring HVAC Tune-Up $149" — which a customer would
  // reasonably expect the business to honour. They now come from /services,
  // and the section hides itself when nothing is published.
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // `/services` is not on the server's public allowlist, so the anon key
        // gets a 401 here and the catch below swallows it — which is why this
        // section had been silently rendering empty since AUTH_ENFORCE went on.
        // The person looking at this page is signed in, so send their token.
        const res = await fetch(`${SERVER}/services`, { headers: await authedHeadersOrAnon(publicAnonKey) });
        const j = await res.json().catch(() => ([]));
        const rows = Array.isArray(j) ? j : (Array.isArray(j?.services) ? j.services : []);
        if (!cancelled) setFeaturedServices(rows);
      } catch { /* an empty catalogue simply renders nothing */ }
    })();
    return () => { cancelled = true; };
  }, []);

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
  // Giveaways come from the server. They used to be literals here — including
  // "Win a Free Kitchen Renovation, $25,000 value, 1,247 entries" — while the
  // entry route accepted whatever id the client sent. A customer could hand
  // over their details for a prize draw that existed nowhere and would never
  // be awarded. Entry counts are counted from real entries, not asserted.
  const [giveaways, setGiveaways] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${SERVER}/giveaways`, { headers: await authedHeadersOrAnon(publicAnonKey) });
        const j = await res.json().catch(() => ({}));
        if (!cancelled) setGiveaways(Array.isArray(j?.giveaways) ? j.giveaways : []);
      } catch { /* no giveaways is a fine outcome */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Giveaway entries are loaded from the authenticated account, so they remain
  // correct on another device and cannot be written anonymously.
  const [enteredGiveaways, setEnteredGiveaways] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/giveaways/entries`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (active && response.ok && payload.success) setEnteredGiveaways((payload.entries || []).map((entry: any) => entry.giveawayId));
      } catch { /* The giveaway card remains available; submit will surface any error. */ }
    })();
    return () => { active = false; };
  }, [user?.id]);

  const enterGiveaway = async (giveawayId: string, giveawayTitle: string) => {
    if (enteredGiveaways.includes(giveawayId)) { toast.info("You've already entered this giveaway!"); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in before entering a giveaway.');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/giveaways/entries`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ giveawayId, giveawayTitle }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not enter the giveaway.');
      setEnteredGiveaways((current) => [...current, giveawayId]);
      toast.success("🎉 You're in! Good luck!", { description: `Entry confirmed for: ${giveawayTitle}`, duration: 4000 });
    } catch (error: any) { toast.error(error.message || 'Could not enter the giveaway.'); }
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
    type: 'service' | 'ad' | 'product';
    title: string;
    description: string;
    price?: string;
    image: string;
    source: string;
    // Product lines carry where they came from. A purchase order can then be
    // grouped by vendor with certainty instead of guessing from a supplier
    // name, which is what once matched a two-character string to Home Depot.
    vendorId?: string;
    vendorName?: string;
    sku?: string;
    unit?: string;
    unitPrice?: number;
    quantity?: number;
  }>>([]);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [submittingQuoteRequest, setSubmittingQuoteRequest] = useState(false);

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

  /**
   * A product chosen from a vendor's catalogue, added to the same quote request
   * the customer already builds from services — one request, one submit path.
   *
   * Adding the same product twice raises the quantity rather than creating a
   * second line, because two lines for the same SKU become two lines on the
   * purchase order and the vendor picks it twice.
   */
  const addProductToQuote = (product: PickedProduct) => {
    setQuoteItems(prev => {
      const { items, merged } = mergeProductLine(prev as any, product);
      toast.success(merged
        ? `Quantity updated for ${product.name}`
        : `${product.name} added to your quote request`);
      return items as any;
    });
  };

  const submitQuoteRequest = async () => {
    if (quoteItems.length === 0) { toast.error('Please add at least one item to your quote request'); return; }
    if (!user?.email) { toast.error('Sign in before submitting a quote request.'); return; }
    setSubmittingQuoteRequest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE_URL}/make-server-3eae23a6/work-requests`, { method: 'POST', headers: await authedHeaders(), body: JSON.stringify({ clientEmail: user.email, clientName: displayName || user.user_metadata?.full_name || user.email.split('@')[0], serviceType: 'Quote request', project_name: `Quote request – ${quoteItems.map(item => item.title).join(', ')}`, description: quoteItems.map(item => `${item.title}: ${item.description}`).join('\n'), quoteItems, source: 'customer-portal-quote-builder' }) });
      const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.error || 'Could not submit your quote request.');
      toast.success(`Quote request submitted for ${quoteItems.length} item(s).`); setQuoteItems([]); setShowQuoteBuilder(false);
    } catch (error: any) { toast.error(error.message || 'Could not submit your quote request.'); }
    finally { setSubmittingQuoteRequest(false); }
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
    { id: 'contracts', label: 'Contracts', icon: FileCheck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'plan-tracker', label: 'My Plan', icon: BarChart3 },
    { id: 'plan-builder', label: 'Plans & Add-ons', icon: Sparkles },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'shopping', label: 'Shop', icon: ShoppingCart },
    { id: 'deals', label: 'Deals & Reels', icon: Megaphone },
    { id: 'investments', label: 'Investments', icon: DollarSign },
    { id: 'referrals', label: 'Referrals', icon: Star },
    { id: 'design', label: 'Design Your Project', icon: Hammer },
    { id: 'visualiser', label: 'See It On Your Home', icon: ImageIcon },
    { id: 'floor-visualiser', label: 'Try a Floor', icon: ImageIcon },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'guide', label: 'Portal Guide', icon: FileText },
  ];

  // Unread message count — fetched from server so it's real-time
  const [unreadMessages, setUnreadMessages] = useState(0);
  useEffect(() => {
    const fetchUnread = async () => {
      if (!user?.id && !user?.email) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || publicAnonKey;
        const convUrl = new URL(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/messaging/conversations/${user.id || 'guest'}`);
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
      <Safe><PortalTrialBanner /></Safe>
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
              <button aria-label="Settings" onClick={() => { setSettingsSection('account'); setShowPortalSettings(true); }} className="p-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/30 transition">
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

        {/* See a new floor in your own room. Reached from here because a
            customer stands in the room with their phone, which is exactly
            where this is worth having. */}
        {activeTab === 'visualiser' && (
          <HomeVisualiser customerEmail={user?.email} customerName={user?.user_metadata?.full_name || user?.email} />
        )}
        {/* The design centre, reached with enough context that it does not open
            cold: their address goes with them, because it sets snow load, frost
            depth and which code edition applies. */}
        {activeTab === 'design' && (
          <CustomerDesignTab
            customerEmail={customerInfo.email}
            customerName={customerInfo.name}
            customerAddress={customerInfo.address}
          />
        )}
        {activeTab === 'floor-visualiser' && <FloorVisualiser accent="orange" />}
        {activeTab === 'documents' && <PortalDocumentVault session={session} accent="orange" />}
        {activeTab === 'guide' && <PortalFeatureGuide portal="customer" />}

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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
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
                <div className="bg-[#0A0A0A] rounded p-2 border border-purple-500/20">
                  <p className="text-xs text-gray-400">Gifted</p>
                  <p className="text-lg font-bold text-sky-400">{customerSubscription.hoursGifted}h</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Available</span>
                  <span className="text-white font-medium">
                    {Math.max(0, customerSubscription.hoursIncluded + customerSubscription.hoursRollover + customerSubscription.hoursGifted - customerSubscription.hoursUsed)}h remaining
                  </span>
                </div>
                <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-gradient-to-r from-orange-600 to-orange-400"
                      style={{ width: `${Math.min(100, (customerSubscription.hoursUsed / Math.max(1, customerSubscription.hoursIncluded + customerSubscription.hoursRollover + customerSubscription.hoursGifted)) * 100)}%` }}
                    ></div>
                    <div
                      className="bg-gradient-to-r from-green-600 to-green-400"
                      style={{ width: `${Math.max(0, ((customerSubscription.hoursIncluded + customerSubscription.hoursRollover + customerSubscription.hoursGifted - customerSubscription.hoursUsed) / Math.max(1, customerSubscription.hoursIncluded + customerSubscription.hoursRollover + customerSubscription.hoursGifted)) * 100)}%` }}
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

              {/* Featured Services
                  Guarded on length the same way the banner ads above are.
                  featuredServices starts empty and is filled by a fetch, so
                  this card was indexing [0] of an empty array and throwing
                  `Cannot read properties of undefined (reading 'image')` —
                  which took the whole customer portal down to a blank screen
                  any time that fetch was slow, empty or offline. */}
              {featuredServices.length > 0 && (
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
              )}
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
                {/* Without this the quote builder could only be reached by first
                    adding a service, so a customer who wants materials had no
                    way in. */}
                <SecondaryButton onClick={() => setShowQuoteBuilder(true)}>
                  <Package className="w-4 h-4" />
                  Pick Products
                </SecondaryButton>
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
                    const rawStatus = request.status || 'pending';
                    const currentStatus = ({ reviewed: 'opened', approved: 'opened', assigned: 'in-progress', scheduled: 'in-progress' } as Record<string, string>)[rawStatus] || rawStatus;
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
                          {rawStatus.replace('-', ' ').toUpperCase()}
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
                              const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/payments/create-checkout`, {
                                method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ amount: Math.round((quote.amount || quote.total || 0) * 0.30), description: `30% Deposit — ${quote.title || 'Project'}`, clientName: user?.email, clientEmail: user?.email, workRequestId: quote.workRequestId }),
                              });
                              const data = await res.json();
                              if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
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
                          {(invoice.service_address || invoice.serviceAddress) && (
                            <div className="flex items-start gap-1.5 text-sm text-gray-400 mt-2">
                              <MapPin className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                              <span><span className="text-gray-500">Address of service:</span> {invoice.service_address || invoice.serviceAddress}</span>
                            </div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-sm border ${getStatusColor(invoice.status || 'pending')}`}>
                          {invoice.status || 'pending'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">Amount Due</p>
                          <p className="text-2xl font-bold">${(invoice.balance_due ?? invoice.balanceDue ?? invoice.total_amount ?? invoice.total ?? invoice.amount ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                          <button
                            onClick={async () => {
                              const { data: { session } } = await supabase.auth.getSession();
                              const tok = session?.access_token || publicAnonKey;
                              const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/payments/create-checkout`, {
                                method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ amount: invoice.balance_due ?? invoice.balanceDue ?? invoice.total_amount ?? invoice.total ?? invoice.amount, description: `Invoice #${invoice.invoice_number || invoice.id}`, clientEmail: user?.email, clientName: user?.email?.split('@')[0], invoiceId: invoice.id, workRequestId: invoice.workRequestId }),
                              });
                              const data = await res.json();
                              if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
                              else toast.error(data.error || 'Payment setup required — contact Black Phoenix to set up payments');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition shadow-lg shadow-green-500/20"
                          >
                            <CreditCard className="w-4 h-4" />
                            💳 Pay Now — ${(invoice.balance_due ?? invoice.balanceDue ?? invoice.total_amount ?? invoice.total ?? invoice.amount ?? 0).toLocaleString()}
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

        {/*
          Payments.

          This tab was listed in the navigation and had no render block at all,
          so choosing it produced an empty page. Found by walking every tab and
          measuring what each one drew once the shared header and marquee were
          subtracted — a blank tab still "renders" about 1,800 characters of
          chrome and looks fine until you take that away.

          Built from the invoices already loaded for this customer and the same
          create-checkout call the Quotes tab uses, so it introduces no new
          endpoint and nothing new to secure. The server scopes those invoices
          to the person asking, and checks ownership again before it will start
          a checkout for one.
        */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {(() => {
              const balanceOf = (inv: any) => Number(
                inv.balance_due ?? inv.balanceDue ?? inv.total_amount ?? inv.total ?? inv.amount ?? 0,
              );
              const isSettled = (inv: any) => ['paid', 'completed', 'void', 'cancelled'].includes(String(inv.status || '').toLowerCase());
              const outstanding = invoices.filter((inv: any) => !isSettled(inv) && balanceOf(inv) > 0);
              const settled = invoices.filter(isSettled);
              const dueTotal = outstanding.reduce((sum: number, inv: any) => sum + balanceOf(inv), 0);
              const isOverdue = (inv: any) => {
                const due = inv.due_date || inv.dueDate;
                return due ? Date.parse(String(due)) < Date.now() : false;
              };
              const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

              const payInvoice = async (invoice: any) => {
                const { data: { session } } = await supabase.auth.getSession();
                const tok = session?.access_token || publicAnonKey;
                const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/payments/create-checkout`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    amount: balanceOf(invoice),
                    description: `Invoice #${invoice.invoice_number || invoice.id}`,
                    clientEmail: user?.email,
                    clientName: user?.email?.split('@')[0],
                    invoiceId: invoice.id,
                    workRequestId: invoice.workRequestId,
                  }),
                });
                const data = await res.json().catch(() => ({}));
                if (data.checkoutUrl) window.location.assign(data.checkoutUrl);
                else toast.error(data.error || 'Payment setup required — contact Black Phoenix to set up payments');
              };

              return (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Due now</p>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-white">{money(dueTotal)}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {outstanding.length ? `${outstanding.length} invoice${outstanding.length === 1 ? '' : 's'}` : 'Nothing outstanding'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Overdue</p>
                      <p className={`mt-2 text-2xl font-bold tabular-nums ${outstanding.some(isOverdue) ? 'text-red-400' : 'text-white'}`}>
                        {outstanding.filter(isOverdue).length}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">past the due date</p>
                    </div>
                    <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Settled</p>
                      <p className="mt-2 text-2xl font-bold tabular-nums text-green-400">{settled.length}</p>
                      <p className="mt-1 text-xs text-gray-500">paid in full</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6">
                    <h2 className="text-lg font-bold text-white">Payments</h2>
                    <p className="mt-1 mb-5 text-sm text-gray-400">
                      What you owe, and what has already been settled.
                    </p>

                    {invoices.length === 0 ? (
                      <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-10 text-center">
                        <CreditCard className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                        <p className="font-semibold text-white">Nothing to pay yet</p>
                        <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
                          Invoices appear here once work has been quoted and approved.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#2A2A2A]">
                        {[...outstanding, ...settled].map((invoice: any) => {
                          const overdue = !isSettled(invoice) && isOverdue(invoice);
                          return (
                            <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                              <div className="min-w-0">
                                <p className="font-semibold text-white">
                                  Invoice #{invoice.invoice_number || invoice.id}
                                </p>
                                <p className="mt-0.5 text-sm text-gray-500">
                                  {invoice.due_date || invoice.dueDate ? `Due ${String(invoice.due_date || invoice.dueDate).slice(0, 10)}` : 'No due date'}
                                  {overdue && <span className="ml-2 font-semibold text-red-400">overdue</span>}
                                  {isSettled(invoice) && <span className="ml-2 font-semibold text-green-400">paid</span>}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold tabular-nums text-white">{money(balanceOf(invoice))}</span>
                                {!isSettled(invoice) && balanceOf(invoice) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => payInvoice(invoice)}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-500"
                                  >
                                    <CreditCard className="h-4 w-4" /> Pay now
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'contracts' && (
          <div className="space-y-5">
            <div><h2 className="text-2xl font-bold text-white">Your contracts</h2><p className="mt-1 text-sm text-gray-400">Review and sign contracts connected to your approved quotes.</p></div>
            {loadingContracts ? <div className="rounded-xl border border-[#2A2A2A] p-8 text-center text-gray-400">Loading contracts…</div> : contracts.length === 0 ? <div className="rounded-xl border border-[#2A2A2A] p-8 text-center text-gray-400">No contracts are awaiting your signature.</div> : contracts.map(contract => <article key={contract.id} className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">{contract.title || 'Service Contract'}</h3><p className="mt-1 text-sm text-gray-400">Created {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : 'recently'}</p></div><span className={`rounded-full border px-3 py-1 text-sm font-semibold ${getStatusColor(contract.status || 'pending')}`}>{String(contract.status || 'pending').replace('_', ' ')}</span></div>{contract.terms && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-white/[0.03] p-3 text-sm leading-6 text-gray-300">{contract.terms}</p>}<div className="mt-4 flex items-center justify-between gap-4"><p className="text-lg font-bold text-white">{contract.amount !== undefined && contract.amount !== null ? `$${Number(contract.amount).toLocaleString()}` : 'Amount in contract'}</p>{contract.status !== 'active' ? <button onClick={() => signContract(contract)} disabled={signingContractId === contract.id} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50"><FileCheck className="h-4 w-4" />{signingContractId === contract.id ? 'Signing…' : 'Review & sign'}</button> : <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-400"><CheckCircle className="h-4 w-4" /> Signed {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : ''}</span>}</div></article>)}
          </div>
        )}

        {activeTab === 'messages' && (
          <CustomerMessagesTab userId={user?.id || ''} userEmail={user?.email || ''} userName={user?.email?.split('@')[0] || 'Customer'} />
        )}

        {activeTab === 'plan-tracker' && <MaintenancePlanTracker portalRole="customer" ownerName={customerInfo.name} />}
        {activeTab === 'plan-builder' && <PlanBuilderTab portalType="customer" ownerName={customerInfo.name} />}
        {activeTab === 'investments' && <InvestmentTab portalType="customer" ownerName={customerInfo.name} />}
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
                onProjectCreated={async (workRequestId) => {
                  setShowWorkRequestModal(false);
                  console.log('Work request created:', workRequestId);

                  // Reload with the actual session; an anonymous key cannot read customer-scoped records.
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.access_token) throw new Error('Sign in to reload your work requests.');
                    const response = await fetch(`${API_BASE_URL}/make-server-3eae23a6/work-requests`, {
                      headers: { Authorization: `Bearer ${session.access_token}` },
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Could not reload your work requests.');
                    setWorkRequests(Array.isArray(data) ? data : (data.workRequests || []));
                  } catch (error) {
                    console.error('Error reloading work requests:', error);
                    toast.warning('Your request was saved, but we could not refresh the list yet.');
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
                  <h4 className="text-sm font-semibold mb-1">Add products</h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Search what our vendors actually stock. Prices shown are theirs,
                    so your quote reflects the real cost.
                  </p>
                  <VendorProductPicker
                    theme="dark"
                    onAdd={addProductToQuote}
                    chosenSkus={quoteItems
                      .filter(item => item.type === 'product')
                      .map(item => catalogKey(item))}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Selected Items</h4>
                  {quoteItems.length === 0 && (
                    <p className="text-xs text-gray-400">
                      Nothing added yet. Search above, or add a service from the dashboard.
                    </p>
                  )}
                  <div className="space-y-2">
                    {quoteItems.map(item => (
                      <div key={item.id} className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-8 h-8 object-cover"
                            />
                          ) : (
                            // Catalogue products have no marketing image; a bare
                            // <img src=""> renders as a broken-image icon.
                            <div className="w-8 h-8 rounded bg-[#2A2A2A] flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-orange-400" />
                            </div>
                          )}
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
                    disabled={submittingQuoteRequest}
                  >
                    <Send className="w-4 h-4" />
                    {submittingQuoteRequest ? 'Submitting…' : 'Submit Quote Request'}
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
        onSelectPaid={async () => {
          if (!user?.email) { toast.error('Sign in before selecting a subscription.'); return; }
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE_URL}/make-server-3eae23a6/subscriptions/checkout`, { method: 'POST', headers: await authedHeaders(), body: JSON.stringify({ plan: 'premium', amount: 49, billingCycle: 'monthly', name: displayName || user.user_metadata?.full_name || user.email.split('@')[0] }) });
            const data = await response.json(); if (!response.ok || !data.success || !data.checkoutUrl) throw new Error(data.error || 'Could not start secure checkout.');
            window.location.assign(data.checkoutUrl);
          } catch (error: any) { toast.error(error.message || 'Could not start secure checkout.'); }
        }}
      />

      <PortalSettings
        open={showPortalSettings}
        onClose={() => setShowPortalSettings(false)}
        initialSection={settingsSection}
        portalName="Customer portal"
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
