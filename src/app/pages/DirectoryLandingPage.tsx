import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Building2, Wrench, ShoppingCart, Trash2, Users, Megaphone,
  Building, TrendingUp, ArrowRight, CheckCircle, Sparkles,
  Clock, User, CheckCircle2, Store, Briefcase, X, Tag, ExternalLink, Play, UserPlus
} from 'lucide-react';
import AdvertisingVideoReel from '../components/AdvertisingVideoReel';
import SignUpOptionsModal from '../components/SignUpOptionsModal';
import phoenixLogo from '../../imports/BPB_phoenix_full_color_logo-5.png';
import { DIRECTORY_SECTIONS } from '../config/directoryLandingSections';
import { loadBrandingWithFallback } from '../utils/loadPublicBranding';
import ReviewsSection from '../components/ReviewsSection';
import GalleryPreview from '../components/GalleryPreview';
import SponsoredMarquee from '../components/SponsoredMarquee';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DirectoryLandingPageProps {
  onNavigate?: (page: string) => void;
}

// The landing page is rendered once before browser storage is guaranteed to be
// available. These guards keep the page visible in previews, SSR, and browsers
// that block storage while preserving its existing stored settings when allowed.
const readLandingStorage = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
};

const writeLandingStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, value); } catch { /* storage unavailable */ }
};

const removeLandingStorage = (key: string) => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ }
};

export default function DirectoryLandingPage({ onNavigate }: DirectoryLandingPageProps) {
  console.log('🎯 [DirectoryLandingPage] Component mounting/rendering');
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('The Black Phoenix Company');

  // Live signup counters
  const [customerSignUps, setCustomerSignUps] = useState<number>(() => {
    const stored = readLandingStorage('signUpCount_customers');
    return stored ? parseInt(stored) : 0;
  });
  const [subcontractorSignUps, setSubcontractorSignUps] = useState<number>(() => {
    const stored = readLandingStorage('signUpCount_subcontractors');
    return stored ? parseInt(stored) : 0;
  });
  const [advertiserSignUps, setAdvertiserSignUps] = useState<number>(() => {
    const stored = readLandingStorage('signUpCount_advertisers');
    return stored ? parseInt(stored) : 0;
  });
  const [vendorSignUps, setVendorSignUps] = useState<number>(() => {
    const stored = readLandingStorage('signUpCount_vendors');
    return stored ? parseInt(stored) : 0;
  });
  const [serviceProviderSignUps, setServiceProviderSignUps] = useState<number>(() => {
    const stored = readLandingStorage('signUpCount_serviceProviders');
    return stored ? parseInt(stored) : 0;
  });

  // Live reels from vendors / subcontractors / advertisers / content creation
  const [liveReels, setLiveReels] = useState<any[]>([]);
  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/public/reels`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then(r => r.ok ? r.json() : { reels: [] })
      .then(data => { if (Array.isArray(data.reels) && data.reels.length > 0) setLiveReels(data.reels); })
      .catch(() => {});
  }, []);

  // Promotions carousel state
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  /**
   * Whether the opening logo flourish is finished with the screen.
   *
   * Held in state rather than poked into the DOM, so the overlay is genuinely
   * unmounted rather than merely hidden by an attribute that React may
   * reconcile away or that never gets set at all.
   */
  const [bounceDone, setBounceDone] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<any>(null);

  // Mock promotions data
  const promotions = [
    {
      id: 1,
      type: 'subcontractor',
      company: 'Elite Plumbing Services',
      title: '15% Off All Emergency Repairs',
      description: 'Professional plumbing services available 24/7',
      discount: '15% OFF',
      validUntil: 'June 30, 2026',
      image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400',
      color: 'purple'
    },
    {
      id: 2,
      type: 'vendor',
      company: 'BuildPro Supply Co.',
      title: 'Summer Sale - Building Materials',
      description: '20% off lumber, drywall, and roofing materials',
      discount: '20% OFF',
      validUntil: 'July 15, 2026',
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400',
      color: 'blue'
    },
    {
      id: 3,
      type: 'advertiser',
      company: 'TechTools Inc.',
      title: 'Professional Power Tools Rental',
      description: 'Weekly rentals starting at $49',
      discount: '$49/week',
      validUntil: 'August 1, 2026',
      image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400',
      color: 'pink'
    },
    {
      id: 4,
      type: 'subcontractor',
      company: 'Pro Painters LLC',
      title: 'Interior Painting Special',
      description: 'Free color consultation + 10% off labor',
      discount: '10% OFF',
      validUntil: 'June 20, 2026',
      image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400',
      color: 'purple'
    },
    {
      id: 5,
      type: 'vendor',
      company: 'Premium Flooring Depot',
      title: 'Hardwood & Tile Clearance',
      description: 'Up to 40% off select inventory',
      discount: 'UP TO 40% OFF',
      validUntil: 'July 30, 2026',
      image: 'https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=400',
      color: 'blue'
    }
  ];

  /**
   * The flourish comes off the screen after five seconds whatever happens.
   *
   * The animation is 4s after a 0.4s delay, so this only ever fires when the
   * animation did not finish — which is exactly the case that used to leave a
   * full-screen overlay sitting over the sign-in button indefinitely. Belt and
   * braces on a decorative effect, because the cost of it sticking is that
   * nobody can get into the app.
   */
  useEffect(() => {
    const t = setTimeout(() => setBounceDone(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // Auto-rotate promotions every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % promotions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Load company logo and name from branding profile
  useEffect(() => {
    const loadBranding = async () => {
      try {
        console.log('🎨 [DirectoryLandingPage] Loading company branding...');

        // Load from server with localStorage fallback
        const profile = await loadBrandingWithFallback();

        if (profile) {
          console.log('📦 [DirectoryLandingPage] Branding profile found:', profile);

          // Try multiple company name fields
          const name = profile.company_name || profile.dbaName || profile.businessName;
          if (name) {
            setCompanyName(name);
            console.log('✅ [DirectoryLandingPage] Company name loaded:', name);
          }
        } else {
          console.log('⚠️ [DirectoryLandingPage] No branding profile found');
        }
      } catch (error) {
        console.error('❌ [DirectoryLandingPage] Error loading branding:', error);
      }
    };

    loadBranding();

    // Listen for branding updates
    const handleBrandingUpdate = () => {
      console.log('🔔 [DirectoryLandingPage] Received brandingUpdated event - reloading');
      loadBranding();
    };
    window.addEventListener('brandingUpdated', handleBrandingUpdate);

    return () => {
      window.removeEventListener('brandingUpdated', handleBrandingUpdate);
    };
  }, []);

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      window.location.href = `/${page}`;
    }
  };

  // Route to the correct quote form based on cohort type
  const handleGetQuote = (cohortType: string) => {
    // Store the cohort type for the quote request
    writeLandingStorage('quote_request_cohort', cohortType);

    // Route to appropriate form based on service type
    const quoteRoutes: Record<string, string> = {
      'construction': 'request-service', // Construction projects → Work request form with signup
      'handyman': 'request-service', // Handyman services → Work request form with signup
      'demolition': 'request-service', // Demolition services → Work request form with signup
      'ecommerce': 'public-store', // Marketplace - go to store
      'contractor': 'service-provider-application', // Contractor network signup
      'service-provider': 'service-provider-application', // Service provider application
      'subcontractor': 'subcontractor-application', // Subcontractor application
      'vendor': 'vendor-application', // Vendor application
      'advertiser': 'advertiser-application', // Advertiser application
      'property-management': 'request-service', // Property services → Work request form with signup
      'investor': 'investment-opportunities', // Investment opportunities
    };

    const route = quoteRoutes[cohortType] || 'request-service';
    handleNavigate(route);
  };


  // Check for auto-open signup flag
  useEffect(() => {
    const autoOpenSignup = readLandingStorage('autoOpenSignup');
    if (autoOpenSignup) {
      removeLandingStorage('autoOpenSignup');
      setShowSignUpModal(true);
    }
  }, []);

  // Save signup counters to localStorage
  useEffect(() => {
    writeLandingStorage('signUpCount_customers', customerSignUps.toString());
  }, [customerSignUps]);

  useEffect(() => {
    writeLandingStorage('signUpCount_subcontractors', subcontractorSignUps.toString());
  }, [subcontractorSignUps]);

  useEffect(() => {
    writeLandingStorage('signUpCount_advertisers', advertiserSignUps.toString());
  }, [advertiserSignUps]);

  useEffect(() => {
    writeLandingStorage('signUpCount_vendors', vendorSignUps.toString());
  }, [vendorSignUps]);

  // Load sections from localStorage override or use default config
  const [sections, setSections] = useState(() => {
    console.log('🔍 [DirectoryLanding] Initializing sections state...');
    console.log('🔍 [DirectoryLanding] DIRECTORY_SECTIONS imported:', DIRECTORY_SECTIONS?.length || 0, 'sections');
    const override = readLandingStorage('directory_sections_override');
    if (override) {
      try {
        const parsed = JSON.parse(override);
        console.log('✅ [DirectoryLanding] Loaded sections from override:', parsed.length);
        return parsed;
      } catch (e) {
        console.error('Failed to parse directory sections override:', e);
        console.log('✅ [DirectoryLanding] Using default sections:', DIRECTORY_SECTIONS.length);
        return DIRECTORY_SECTIONS;
      }
    }
    console.log('✅ [DirectoryLanding] Using default sections:', DIRECTORY_SECTIONS.length);
    return DIRECTORY_SECTIONS;
  });

  // Listen for changes to directory sections
  useEffect(() => {
    const handleStorageChange = () => {
      const override = readLandingStorage('directory_sections_override');
      if (override) {
        try {
          setSections(JSON.parse(override));
        } catch (e) {
          console.error('Failed to parse directory sections override:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  console.log('🔍 [DirectoryLanding] About to render with', sections.length, 'sections');

  const limitedOffers = [
    {
      title: 'Early Bird - Customers',
      discount: '50% Off First Month',
      badge: 'FIRST 20',
      spots: 8,
      total: 20,
      type: 'customer',
      cohortId: 'early-bird-customer',
      gradient: 'from-blue-600 to-cyan-600',
      badgeColor: 'bg-blue-600',
      borderColor: 'border-blue-500/30',
      hoverBorder: 'hover:border-blue-500/60',
      shadowColor: 'hover:shadow-blue-500/20',
      textColor: 'text-blue-400'
    },
    {
      title: 'Early Bird - Subcontractors',
      discount: 'Free Premium for 3 Months',
      badge: 'FIRST 10',
      spots: 3,
      total: 10,
      type: 'subcontractor',
      cohortId: 'early-bird-subcontractor',
      gradient: 'from-purple-600 to-indigo-600',
      badgeColor: 'bg-purple-600',
      borderColor: 'border-purple-500/30',
      hoverBorder: 'hover:border-purple-500/60',
      shadowColor: 'hover:shadow-purple-500/20',
      textColor: 'text-purple-400'
    },
    {
      title: 'Early Bird - Service Providers',
      discount: 'Free Premium for 3 Months',
      badge: 'FIRST 10',
      spots: 2,
      total: 10,
      type: 'service-provider',
      cohortId: 'early-bird-service-provider',
      gradient: 'from-amber-600 to-orange-600',
      badgeColor: 'bg-amber-600',
      borderColor: 'border-amber-500/30',
      hoverBorder: 'hover:border-amber-500/60',
      shadowColor: 'hover:shadow-amber-500/20',
      textColor: 'text-amber-400'
    },
    {
      title: 'Early Bird - Advertisers',
      discount: '75% Off Ad Space',
      badge: 'FIRST 6',
      spots: 2,
      total: 6,
      type: 'advertiser',
      cohortId: 'early-bird-advertiser',
      gradient: 'from-green-600 to-emerald-600',
      badgeColor: 'bg-green-600',
      borderColor: 'border-green-500/30',
      hoverBorder: 'hover:border-green-500/60',
      shadowColor: 'hover:shadow-green-500/20',
      textColor: 'text-green-400'
    },
    {
      title: 'Early Bird - Vendors',
      discount: 'No Commission for 6 Months',
      badge: 'FIRST 15',
      spots: 6,
      total: 15,
      type: 'vendor',
      cohortId: 'early-bird-vendor',
      gradient: 'from-orange-600 to-red-600',
      badgeColor: 'bg-orange-600',
      borderColor: 'border-orange-500/30',
      hoverBorder: 'hover:border-orange-500/60',
      shadowColor: 'hover:shadow-orange-500/20',
      textColor: 'text-orange-400'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] w-full" style={{ width: '100%', maxWidth: '100vw', overflow: 'visible' }}>
      {/*
        The opening logo flourish.

        This is a full-viewport overlay at z-10000 — far above everything on the
        page, including the sign-in button — so while it is on screen it covers
        the lot. That is fine for four seconds and not fine for any longer.

        It used to remove itself by reaching into the DOM from an animation
        callback and setting display none on its own node. That works right up
        until the callback does not fire: a tab backgrounded during load, an
        interrupted animation, a browser that declines to run it. Then a
        full-screen overlay sits over the page permanently and the sign-in
        button is buried underneath, present in the DOM and impossible to see.

        So it is unmounted from React state instead, with a timer that removes
        it regardless of whether the animation ever reports finishing. A
        decorative flourish must never be able to outlive itself and take the
        way into the app down with it.
      */}
      {!bounceDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0, 10, 10, 1] }}
          transition={{
            duration: 4,
            delay: 0.4,
            times: [0, 0.3, 0.6, 1],
            ease: "easeInOut"
          }}
          onAnimationComplete={() => setBounceDone(true)}
          id="bounce-logo"
          className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center"
        >
          <div className="relative w-40 h-40 bg-black rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-800 overflow-hidden">
            <img
                    src={phoenixLogo}
                    alt={companyName || 'Black Phoenix'}
                    className="w-full h-full object-contain p-4"
                    style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}
                  />
          </div>
        </motion.div>
      )}

      {/*
        Sign In — fixed top right.

        It sits over the hero, and the company name behind it is enormous white
        display type that overflows the viewport. At common laptop widths the
        button lands directly on those letters, and an orange control on top of
        white lettering on a photograph reads as part of the headline rather
        than as a button — reported, reasonably, as the sign-in button being
        gone.

        Two things fix that and neither changes the page's design. The button
        gets its own dark ground so it always separates from whatever is behind
        it, and it starts fully opaque rather than fading in — the only control
        that lets anybody into the app should never depend on an animation
        having run.
      */}
      <div className="fixed top-4 right-4 z-[60] rounded-2xl bg-black/70 p-1.5 shadow-xl shadow-black/50 ring-1 ring-white/15 backdrop-blur-md">
        <motion.button
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => handleNavigate('login')}
          className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all flex items-center gap-2 group"
        >
          <User className="w-5 h-5" />
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>

      {/* Hero Section with Company Name & Logo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative pt-12 pb-12 px-4 overflow-hidden"
        style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
      >
        {/* Scrolling Project Images Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-transparent to-[#0A0A0A] z-10" />
          <div
            className="absolute inset-0 flex flex-col"
            style={{
              animation: 'scrollUp 60s linear infinite',
            }}
          >
            {/* First set of images */}
            <div className="flex flex-col opacity-20" style={{ display: 'block' }}>
              <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80" alt="Construction project" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80" alt="Building site" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1590496793907-03f36e3d0b5f?w=1200&q=80" alt="Modern construction" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80" alt="Architecture" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1581094794329-c8112c4e5190?w=1200&q=80" alt="Renovation project" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80" alt="Modern home" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
            </div>
            {/* Duplicate set for seamless loop */}
            <div className="flex flex-col opacity-20" style={{ display: 'block' }}>
              <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80" alt="Construction project" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80" alt="Building site" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1590496793907-03f36e3d0b5f?w=1200&q=80" alt="Modern construction" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1200&q=80" alt="Architecture" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1581094794329-c8112c4e5190?w=1200&q=80" alt="Renovation project" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
              <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80" alt="Modern home" className="w-full h-64 object-cover" style={{ display: 'block', margin: 0, padding: 0 }} />
            </div>
          </div>
        </div>

        <style>{`
          @keyframes scrollUp {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(-50%);
            }
          }
        `}</style>

        <div className="relative w-full max-w-7xl px-4 flex flex-col items-center z-20" style={{ margin: '0 auto' }}>
          {/* Company Name */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold mb-8 bg-gradient-to-r from-orange-400 via-red-400 to-purple-400 bg-clip-text text-transparent text-center w-full"
            style={{ textAlign: 'center' }}
          >
            {companyName}
          </motion.h1>

          {/* Logo placeholder - actual logo animates from fixed position above */}
          <div className="flex justify-center mb-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 4.2 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 rounded-full blur-2xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-40 h-40 bg-black rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-800 overflow-hidden">
                <img
                  src={phoenixLogo}
                  alt={companyName || 'Black Phoenix'}
                  className="w-full h-full object-contain p-4"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}
                />
              </div>
            </motion.div>
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-2xl md:text-3xl text-gray-300 mb-4 max-w-4xl mx-auto text-center w-full"
            style={{ textAlign: 'center' }}
          >
            Building Dreams, Transforming Spaces, Creating Opportunities
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex items-center justify-center gap-2 text-orange-400 w-full"
            style={{ justifyContent: 'center', textAlign: 'center' }}
          >
            <span className="text-lg font-semibold text-center">Family Owned &amp; Operated</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.95 }}
            className="flex items-center justify-center gap-2 text-orange-400 w-full"
            style={{ justifyContent: 'center', textAlign: 'center' }}
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-lg font-semibold text-center">Choose Your Path Below</span>
            <Sparkles className="w-5 h-5 animate-pulse" />
          </motion.div>
        </div>
      </motion.div>

      {/* ── UNIFIED MARQUEE — sponsors, logos, offers, all in one ─────────── */}
      <SponsoredMarquee onNavigate={handleNavigate} />

      {/* ── DEALS ZONE (moved to sign-up modal) ────────────────────────────── */}
      {false && <div className="w-full px-4 py-10 flex justify-center">
        <div className="w-full max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
              <span className="text-white font-bold text-lg uppercase tracking-wider">Promotions & Offers</span>
              <Sparkles className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-full">
              <Clock className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-300 font-semibold text-xs">Spots filling fast — founding member rates</span>
            </div>
          </div>

          {/* Limited Time Offers — full-width readable grid */}
          <div className="bg-gradient-to-br from-orange-600/10 via-purple-600/5 to-pink-600/10 border border-orange-500/30 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-orange-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Limited Time Founding Member Offers — Lock In Your Rate Now!
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

              {/* Customers */}
              <button onClick={() => setShowSignUpModal(true)} className="relative text-left p-4 bg-[#1A1A1A] border border-orange-500/40 rounded-xl hover:border-orange-400 hover:bg-orange-500/5 transition-all group">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-orange-600 text-white text-[10px] font-bold rounded-full">FIRST 20</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-sm font-bold text-white">Customers</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400">Signed up:</span>
                  <motion.span key={customerSignUps} initial={{ scale: 1.3, color: '#4ade80' }} animate={{ scale: 1, color: '#fff' }} className="text-sm font-bold text-white">{customerSignUps}</motion.span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-300 mb-3">
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" /><span><span className="font-bold text-white">6 hrs/mo</span> service credit</span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" /><span>Same price guaranteed</span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" /><span className="font-bold text-orange-300">Rate locked 1 full year</span></li>
                </ul>
                <span className="text-xs text-orange-400 font-semibold group-hover:underline">Claim Offer →</span>
              </button>

              {/* Subcontractors */}
              <button onClick={() => setShowSignUpModal(true)} className="relative text-left p-4 bg-[#1A1A1A] border border-purple-500/40 rounded-xl hover:border-purple-400 hover:bg-purple-500/5 transition-all group">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">FIRST 10</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-sm font-bold text-white">Subcontractors</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400">Signed up:</span>
                  <motion.span key={subcontractorSignUps} initial={{ scale: 1.3, color: '#4ade80' }} animate={{ scale: 1, color: '#fff' }} className="text-sm font-bold text-white">{subcontractorSignUps}</motion.span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-300 mb-3">
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" /><span><span className="font-bold text-white">6 months FREE</span></span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" /><span>Next 6 months 50% off</span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" /><span className="font-bold text-purple-300">Risk-free trial</span></li>
                </ul>
                <span className="text-xs text-purple-400 font-semibold group-hover:underline">Claim Offer →</span>
              </button>

              {/* Service Providers */}
              <button onClick={() => setShowSignUpModal(true)} className="relative text-left p-4 bg-[#1A1A1A] border border-orange-500/40 rounded-xl hover:border-orange-400 hover:bg-orange-500/5 transition-all group">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-orange-600 text-white text-[10px] font-bold rounded-full">FIRST 10</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-sm font-bold text-white">Service Providers</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400">Signed up:</span>
                  <motion.span key={serviceProviderSignUps} initial={{ scale: 1.3, color: '#4ade80' }} animate={{ scale: 1, color: '#fff' }} className="text-sm font-bold text-white">{serviceProviderSignUps}</motion.span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-300 mb-3">
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" /><span><span className="font-bold text-white">6 months FREE</span></span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" /><span>Next 6 months 50% off</span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" /><span className="font-bold text-orange-300">Pro networking access</span></li>
                </ul>
                <span className="text-xs text-orange-400 font-semibold group-hover:underline">Claim Offer →</span>
              </button>

              {/* Advertisers */}
              <button onClick={() => setShowSignUpModal(true)} className="relative text-left p-4 bg-[#1A1A1A] border border-pink-500/40 rounded-xl hover:border-pink-400 hover:bg-pink-500/5 transition-all group">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-pink-600 text-white text-[10px] font-bold rounded-full">FIRST 6</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-pink-400" />
                  </div>
                  <p className="text-sm font-bold text-white">Advertisers</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400">Signed up:</span>
                  <motion.span key={advertiserSignUps} initial={{ scale: 1.3, color: '#4ade80' }} animate={{ scale: 1, color: '#fff' }} className="text-sm font-bold text-white">{advertiserSignUps}</motion.span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-300 mb-3">
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-pink-400 flex-shrink-0 mt-0.5" /><span><span className="font-bold text-white">3 months FREE</span></span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-pink-400 flex-shrink-0 mt-0.5" /><span>Next 9 months 50% off</span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-pink-400 flex-shrink-0 mt-0.5" /><span className="font-bold text-pink-300">30% off forever after</span></li>
                </ul>
                <span className="text-xs text-pink-400 font-semibold group-hover:underline">Claim Offer →</span>
              </button>

              {/* Vendors */}
              <button onClick={() => setShowSignUpModal(true)} className="relative text-left p-4 bg-[#1A1A1A] border border-blue-500/40 rounded-xl hover:border-blue-400 hover:bg-blue-500/5 transition-all group">
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">FIRST 15</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Store className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-sm font-bold text-white">Vendors</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg mb-3">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400">Signed up:</span>
                  <motion.span key={vendorSignUps} initial={{ scale: 1.3, color: '#4ade80' }} animate={{ scale: 1, color: '#fff' }} className="text-sm font-bold text-white">{vendorSignUps}</motion.span>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-300 mb-3">
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" /><span><span className="font-bold text-white">4 months FREE</span></span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" /><span>Next 8 months 50% off</span></li>
                  <li className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" /><span className="font-bold text-blue-300">Premium placement</span></li>
                </ul>
                <span className="text-xs text-blue-400 font-semibold group-hover:underline">Claim Offer →</span>
              </button>

            </div>
            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-full">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="text-red-300 font-semibold text-sm">Spots filling fast! Don't miss out on these exclusive founding member rates.</span>
              </div>
            </div>
          </div>

          {/* Featured Promotions — two cards side by side, scroll in sync */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-400 uppercase tracking-wider">Featured Deals</span>
              </div>
              {/* Shared carousel nav */}
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPromoIndex((currentPromoIndex - 1 + promotions.length) % promotions.length)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 text-white rotate-180" />
                </button>
                <div className="flex gap-1">
                  {promotions.map((_, i) => (
                    <button key={i} onClick={() => setCurrentPromoIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${i === currentPromoIndex ? 'w-5 bg-orange-500' : 'w-1.5 bg-gray-600'}`} />
                  ))}
                </div>
                <button onClick={() => setCurrentPromoIndex((currentPromoIndex + 1) % promotions.length)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>

            {/* Two cards in sync */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[currentPromoIndex, (currentPromoIndex + 1) % promotions.length].map((idx, slot) => {
                const promo = promotions[idx];
                const colorClass = promo.color === 'purple' ? 'from-purple-600 to-purple-700' :
                                   promo.color === 'blue'   ? 'from-blue-600 to-blue-700'   : 'from-pink-600 to-pink-700';
                const textColor  = promo.color === 'purple' ? 'text-purple-400' :
                                   promo.color === 'blue'   ? 'text-blue-400'   : 'text-pink-400';
                return (
                  <motion.div
                    key={`${idx}-${slot}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: slot * 0.08 }}
                    className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-gray-800 rounded-2xl overflow-hidden cursor-pointer group hover:border-gray-600 transition-colors"
                    onClick={() => { setSelectedPromo(promo); setShowPromoModal(true); }}
                  >
                    {/* Image */}
                    <div className="relative h-36 overflow-hidden">
                      <img src={promo.image} alt={promo.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className={`absolute top-3 left-3 px-3 py-1 bg-gradient-to-r ${colorClass} text-white font-bold text-sm rounded-lg shadow`}>
                        {promo.discount}
                      </div>
                    </div>
                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${textColor}`}>{promo.type}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{promo.title}</h4>
                      <p className="text-xs text-gray-400 mb-2">by {promo.company}</p>
                      <p className="text-xs text-gray-300 line-clamp-2 mb-3">{promo.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>Until {promo.validUntil}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPromo(promo); setShowPromoModal(true); }}
                          className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-gradient-to-r ${colorClass} flex items-center gap-1`}
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>{/* end featured promotions */}

        </div>
      </div>}
      {/* ── END DEALS ZONE ──────────────────────────────────────────────────── */}

      {/* ── TWO BIG CTAs ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes gridFloat {
          0%, 100% { opacity: 0.04; transform: translateY(0px); }
          50% { opacity: 0.08; transform: translateY(-6px); }
        }
        .cta-scanline { animation: scanline 3s linear infinite; }
        .cta-corner { animation: cornerPulse 2s ease-in-out infinite; }
        .cta-grid { animation: gridFloat 4s ease-in-out infinite; }
      `}</style>

      <div className="w-full px-4 pt-10 pb-6 flex justify-center">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* ── SHOP THE STORE ── */}
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            onClick={() => handleNavigate('public-store')}
            className="group relative overflow-hidden text-left"
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0800 50%, #0a0a0a 100%)',
              border: '1px solid rgba(251,146,60,0.35)',
              boxShadow: '0 0 0 0 rgba(251,146,60,0), inset 0 0 60px rgba(251,146,60,0.04)',
              transition: 'box-shadow 0.4s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(251,146,60,0.25), 0 0 120px rgba(251,146,60,0.1), inset 0 0 60px rgba(251,146,60,0.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(251,146,60,0), inset 0 0 60px rgba(251,146,60,0.04)';
            }}
          >
            {/* Animated grid bg */}
            <div className="cta-grid absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(251,146,60,1) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.05,
              }} />

            {/* Scan line */}
            <div className="cta-scanline absolute left-0 right-0 h-16 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(251,146,60,0.06), transparent)' }} />

            {/* Corner brackets */}
            <div className="cta-corner absolute top-3 left-3 w-5 h-5 pointer-events-none"
              style={{ borderTop: '2px solid #fb923c', borderLeft: '2px solid #fb923c' }} />
            <div className="cta-corner absolute top-3 right-3 w-5 h-5 pointer-events-none"
              style={{ borderTop: '2px solid #fb923c', borderRight: '2px solid #fb923c', animationDelay: '0.5s' }} />
            <div className="cta-corner absolute bottom-3 left-3 w-5 h-5 pointer-events-none"
              style={{ borderBottom: '2px solid #fb923c', borderLeft: '2px solid #fb923c', animationDelay: '1s' }} />
            <div className="cta-corner absolute bottom-3 right-3 w-5 h-5 pointer-events-none"
              style={{ borderBottom: '2px solid #fb923c', borderRight: '2px solid #fb923c', animationDelay: '1.5s' }} />

            {/* Background product image */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&q=70')",
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: 0.12,
                mixBlendMode: 'luminosity',
              }} />

            {/* Diagonal accent slash */}
            <div className="absolute -right-8 top-0 bottom-0 w-32 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 40%, rgba(251,146,60,0.08) 40%, rgba(251,146,60,0.12) 60%, transparent 60%)',
                transform: 'skewX(-8deg)',
              }} />

            {/* Content */}
            <div className="relative z-10 p-8 pb-7">
              {/* Top label */}
              <div className="flex items-center gap-2 mb-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-500/40" />
                <span className="text-[10px] font-black tracking-[0.25em] text-orange-500 uppercase">Black Phoenix Store</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-500/40" />
              </div>

              <div className="flex items-start gap-5 mb-5">
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(251,146,60,0.05))', border: '1px solid rgba(251,146,60,0.4)' }}>
                    <ShoppingCart className="w-8 h-8 text-orange-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-[7px] font-black text-white">NEW</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl font-black text-white leading-none mb-1"
                    style={{ textShadow: '0 0 30px rgba(251,146,60,0.3)' }}>
                    Shop the Store
                  </h2>
                  <p className="text-orange-400/80 text-xs font-mono tracking-widest uppercase">Products · Tools · Supplies</p>
                </div>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                Browse hundreds of products — tools, home goods, trending drops, and supplies — all shipped fast to your door.
              </p>

              {/* Stat chips */}
              <div className="flex gap-3 mb-6 flex-wrap">
                {['Fast Shipping', 'Top Brands', 'New Arrivals Daily'].map(t => (
                  <span key={t} className="text-[11px] font-semibold text-orange-300 px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}>
                    {t}
                  </span>
                ))}
              </div>

              {/* CTA strip */}
              <div className="flex items-center justify-between pt-4"
                style={{ borderTop: '1px solid rgba(251,146,60,0.2)' }}>
                <span className="text-xs font-mono text-orange-500/60 tracking-widest">[ ENTER STORE ]</span>
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm text-black group-hover:gap-3 transition-all"
                  style={{ background: 'linear-gradient(90deg, #f97316, #fb923c)' }}>
                  Browse Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.button>

          {/* ── REQUEST WORK ── */}
          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onClick={() => handleNavigate('request-service')}
            className="group relative overflow-hidden text-left"
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0a0a0a 0%, #00081a 50%, #0a0a0a 100%)',
              border: '1px solid rgba(96,165,250,0.35)',
              boxShadow: '0 0 0 0 rgba(96,165,250,0), inset 0 0 60px rgba(96,165,250,0.04)',
              transition: 'box-shadow 0.4s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(96,165,250,0.25), 0 0 120px rgba(96,165,250,0.1), inset 0 0 60px rgba(96,165,250,0.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(96,165,250,0), inset 0 0 60px rgba(96,165,250,0.04)';
            }}
          >
            {/* Animated grid bg */}
            <div className="cta-grid absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.05,
                animationDelay: '2s',
              }} />

            {/* Scan line */}
            <div className="cta-scanline absolute left-0 right-0 h-16 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(96,165,250,0.06), transparent)', animationDelay: '1.5s' }} />

            {/* Corner brackets */}
            <div className="cta-corner absolute top-3 left-3 w-5 h-5 pointer-events-none"
              style={{ borderTop: '2px solid #60a5fa', borderLeft: '2px solid #60a5fa' }} />
            <div className="cta-corner absolute top-3 right-3 w-5 h-5 pointer-events-none"
              style={{ borderTop: '2px solid #60a5fa', borderRight: '2px solid #60a5fa', animationDelay: '0.5s' }} />
            <div className="cta-corner absolute bottom-3 left-3 w-5 h-5 pointer-events-none"
              style={{ borderBottom: '2px solid #60a5fa', borderLeft: '2px solid #60a5fa', animationDelay: '1s' }} />
            <div className="cta-corner absolute bottom-3 right-3 w-5 h-5 pointer-events-none"
              style={{ borderBottom: '2px solid #60a5fa', borderRight: '2px solid #60a5fa', animationDelay: '1.5s' }} />

            {/* Background construction image */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=900&q=70')",
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: 0.12,
                mixBlendMode: 'luminosity',
              }} />

            {/* Diagonal accent slash */}
            <div className="absolute -right-8 top-0 bottom-0 w-32 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 40%, rgba(96,165,250,0.08) 40%, rgba(96,165,250,0.12) 60%, transparent 60%)',
                transform: 'skewX(-8deg)',
              }} />

            {/* Content */}
            <div className="relative z-10 p-8 pb-7">
              {/* Top label */}
              <div className="flex items-center gap-2 mb-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-500/40" />
                <span className="text-[10px] font-black tracking-[0.25em] text-blue-400 uppercase">Professional Services</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-500/40" />
              </div>

              <div className="flex items-start gap-5 mb-5">
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(96,165,250,0.05))', border: '1px solid rgba(96,165,250,0.4)' }}>
                    <Wrench className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-[7px] font-black text-white">FREE</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl font-black text-white leading-none mb-1"
                    style={{ textShadow: '0 0 30px rgba(96,165,250,0.3)' }}>
                    Request Work
                  </h2>
                  <p className="text-blue-400/80 text-xs font-mono tracking-widest uppercase">Repairs · Builds · Handyman</p>
                </div>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                Home repairs, full builds, handyman jobs — submit a request and get a free quote from our licensed team fast.
              </p>

              {/* Stat chips */}
              <div className="flex gap-3 mb-6 flex-wrap">
                {['Free Quote', 'Licensed & Insured', 'Same-Day Response'].map(t => (
                  <span key={t} className="text-[11px] font-semibold text-blue-300 px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    {t}
                  </span>
                ))}
              </div>

              {/* CTA strip */}
              <div className="flex items-center justify-between pt-4"
                style={{ borderTop: '1px solid rgba(96,165,250,0.2)' }}>
                <span className="text-xs font-mono text-blue-400/60 tracking-widest">[ SUBMIT REQUEST ]</span>
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm text-white group-hover:gap-3 transition-all"
                  style={{ background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }}>
                  Get a Free Quote
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.button>

          {/* ── JOIN / CREATE ACCOUNT ── */}
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={() => setShowSignUpModal(true)}
            className="group relative overflow-hidden text-left"
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0a0a0a 0%, #021206 50%, #0a0a0a 100%)',
              border: '1px solid rgba(34,197,94,0.35)',
              boxShadow: '0 0 0 0 rgba(34,197,94,0), inset 0 0 60px rgba(34,197,94,0.04)',
              transition: 'box-shadow 0.4s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(34,197,94,0.25), 0 0 120px rgba(34,197,94,0.1), inset 0 0 60px rgba(34,197,94,0.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(34,197,94,0), inset 0 0 60px rgba(34,197,94,0.04)';
            }}
          >
            {/* Animated grid bg */}
            <div className="cta-grid absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(34,197,94,1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.05,
                animationDelay: '1s',
              }} />

            {/* Scan line */}
            <div className="cta-scanline absolute left-0 right-0 h-16 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(34,197,94,0.06), transparent)', animationDelay: '0.75s' }} />

            {/* Corner brackets */}
            <div className="cta-corner absolute top-3 left-3 w-5 h-5 pointer-events-none"
              style={{ borderTop: '2px solid #22c55e', borderLeft: '2px solid #22c55e' }} />
            <div className="cta-corner absolute top-3 right-3 w-5 h-5 pointer-events-none"
              style={{ borderTop: '2px solid #22c55e', borderRight: '2px solid #22c55e', animationDelay: '0.5s' }} />
            <div className="cta-corner absolute bottom-3 left-3 w-5 h-5 pointer-events-none"
              style={{ borderBottom: '2px solid #22c55e', borderLeft: '2px solid #22c55e', animationDelay: '1s' }} />
            <div className="cta-corner absolute bottom-3 right-3 w-5 h-5 pointer-events-none"
              style={{ borderBottom: '2px solid #22c55e', borderRight: '2px solid #22c55e', animationDelay: '1.5s' }} />

            {/* Background team image */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=70')",
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: 0.12,
                mixBlendMode: 'luminosity',
              }} />

            {/* Diagonal accent slash */}
            <div className="absolute -right-8 top-0 bottom-0 w-32 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 40%, rgba(34,197,94,0.08) 40%, rgba(34,197,94,0.12) 60%, transparent 60%)',
                transform: 'skewX(-8deg)',
              }} />

            {/* Content */}
            <div className="relative z-10 p-8 pb-7">
              {/* Top label */}
              <div className="flex items-center gap-2 mb-5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-green-500/40" />
                <span className="text-[10px] font-black tracking-[0.25em] text-green-400 uppercase">Join The Network</span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-green-500/40" />
              </div>

              <div className="flex items-start gap-5 mb-5">
                {/* Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.4)' }}>
                    <UserPlus className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-[7px] font-black text-white">JOIN</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-3xl font-black text-white leading-none mb-1"
                    style={{ textShadow: '0 0 30px rgba(34,197,94,0.3)' }}>
                    Create Account
                  </h2>
                  <p className="text-green-400/80 text-xs font-mono tracking-widest uppercase">Subs · Vendors · Advertisers</p>
                </div>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                Subs, vendors, advertisers, and service providers — pick how you want to join and start earning with us.
              </p>

              {/* Stat chips */}
              <div className="flex gap-3 mb-6 flex-wrap">
                {['Free to Join', 'Fast Onboarding', 'Grow With Us'].map(t => (
                  <span key={t} className="text-[11px] font-semibold text-green-300 px-2.5 py-1 rounded-md"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    {t}
                  </span>
                ))}
              </div>

              {/* CTA strip */}
              <div className="flex items-center justify-between pt-4"
                style={{ borderTop: '1px solid rgba(34,197,94,0.2)' }}>
                <span className="text-xs font-mono text-green-500/60 tracking-widest">[ CHOOSE PATH ]</span>
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-sm text-black group-hover:gap-3 transition-all"
                  style={{ background: 'linear-gradient(90deg, #16a34a, #22c55e)' }}>
                  Create Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.button>

        </div>
      </div>

      {/* ── SERVICE PILLS ROW ────────────────────────────────────────────────── */}
      <div className="w-full px-4 pb-10 flex justify-center">
        <div className="w-full max-w-4xl mx-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold text-center mb-4">Explore Everything We Offer</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { label: 'Home Services', icon: Building, navigate: 'handyman-landing-page' },
              { label: 'Builds & Renovation', icon: Building2, navigate: 'builds-landing-page' },
              { label: 'Junk Removal', icon: Trash2, navigate: 'demo-landing-page' },
              { label: 'Property Management', icon: Building, navigate: 'property-management-landing-page' },
              { label: 'Contractor Network', icon: Users, navigate: 'contractor-network-landing-page' },
              { label: 'Advertise With Us', icon: Megaphone, navigate: 'advertiser-application' },
              { label: 'Become a Vendor', icon: Store, navigate: 'vendor-application' },
              { label: 'Investment', icon: TrendingUp, navigate: 'investment-opportunities' },
              { label: 'Join as Sub', icon: Briefcase, navigate: 'subcontractor-application' },
            ].map((pill, i) => (
              <motion.button
                key={pill.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.05 * i }}
                onClick={() => handleNavigate(pill.navigate)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/50 hover:bg-[#2A2A2A] text-gray-300 hover:text-white text-sm font-semibold transition-all"
              >
                <pill.icon className="w-3.5 h-3.5 text-orange-400" />
                {pill.label}
              </motion.button>
            ))}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.45 }}
              onClick={() => setShowSignUpModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-600/20 border border-orange-500/40 hover:bg-orange-600/30 text-orange-300 hover:text-white text-sm font-bold transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Founding Member Offers
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── REELS STRIP — vendor / subcontractor / advertiser / content creation ── */}
      <div className="w-full px-4 py-8 flex justify-center">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-orange-400" fill="currentColor" />
              <span className="text-white font-bold text-sm uppercase tracking-wider">
                {liveReels.length > 0 ? 'Featured Reels' : 'Explore Our Services'}
              </span>
            </div>
            <span className="text-xs text-gray-500">Swipe to explore →</span>
          </div>

          {/* Horizontal scroll strip */}
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">

            {liveReels.length > 0
              ? /* ── LIVE REELS from vendors/subcontractors/advertisers/content ── */
                liveReels.map((reel, i) => {
                  const typeColors: Record<string, string> = {
                    vendor: 'from-blue-600 to-cyan-700',
                    subcontractor: 'from-purple-600 to-violet-700',
                    advertiser: 'from-pink-600 to-rose-700',
                    content: 'from-orange-600 to-red-700',
                  };
                  const typeLabels: Record<string, string> = {
                    vendor: '🏪 Vendor',
                    subcontractor: '🔧 Subcontractor',
                    advertiser: '📢 Advertiser',
                    content: '🎬 Featured',
                  };
                  const color = typeColors[reel.advertiser?.type] || 'from-orange-600 to-red-700';
                  const typeLabel = typeLabels[reel.advertiser?.type] || '🎬 Featured';

                  return (
                    <motion.div
                      key={reel.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      viewport={{ once: true }}
                      className="flex-shrink-0 w-44 sm:w-52 snap-start cursor-pointer group"
                      onClick={() => reel.linkUrl && window.open(reel.linkUrl, '_blank')}
                    >
                      <div className={`relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.03]`}>
                        {reel.thumbnailUrl
                          ? <img src={reel.thumbnailUrl} alt={reel.title} className="w-full h-full object-cover" />
                          : <div className={`w-full h-full bg-gradient-to-br ${color}`} />
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Publisher badge */}
                        <div className="absolute top-2 left-2">
                          <span className="text-[9px] font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">{typeLabel}</span>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          {reel.advertiser?.logo && (
                            <img src={reel.advertiser.logo} alt={reel.advertiser.name} className="w-6 h-6 rounded-full object-contain bg-white mb-1" />
                          )}
                          <p className="text-white font-bold text-xs leading-tight mb-0.5 line-clamp-2">{reel.title}</p>
                          <p className="text-white/60 text-[10px]">{reel.advertiser?.name}</p>
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-5 h-5 text-white" fill="white" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              : /* ── TEMP reels with real photos until custom reels are published ── */
                [
                  {
                    title: 'Home Renovation',
                    subtitle: 'Black Phoenix Builds',
                    tag: '🏗️ Builds',
                    img: 'https://images.unsplash.com/photo-1753977725475-41b221add2c0?w=400&q=80',
                    navigate: 'builds-landing-page',
                  },
                  {
                    title: 'House Extension',
                    subtitle: 'Before & After',
                    tag: '🏗️ Builds',
                    img: 'https://images.unsplash.com/photo-1768321902047-2296fd495fa4?w=400&q=80',
                    navigate: 'builds-landing-page',
                  },
                  {
                    title: 'Handyman Services',
                    subtitle: 'Fast & Reliable Repairs',
                    tag: '🔧 Handyman',
                    img: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=400&q=80',
                    navigate: 'handyman-landing-page',
                  },
                  {
                    title: 'Tools of the Trade',
                    subtitle: 'Professional Equipment',
                    tag: '🔧 Handyman',
                    img: 'https://images.unsplash.com/photo-1645651964715-d200ce0939cc?w=400&q=80',
                    navigate: 'handyman-landing-page',
                  },
                  {
                    title: 'Trash & Junk Removal',
                    subtitle: 'Same-Day Service',
                    tag: '🗑️ Removal',
                    img: 'https://images.unsplash.com/photo-1510251197878-a2e6d2cb590c?w=400&q=80',
                    navigate: 'demo-landing-page',
                  },
                  {
                    title: 'Property Management',
                    subtitle: 'For Landlords & Investors',
                    tag: '🏠 Property',
                    img: 'https://images.unsplash.com/photo-1612637968894-660373e23b03?w=400&q=80',
                    navigate: 'property-management-landing-page',
                  },
                  {
                    title: 'Join Our Contractor Network',
                    subtitle: 'Grow With Black Phoenix',
                    tag: '🤝 Contractors',
                    img: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&q=80',
                    navigate: 'contractor-network-landing-page',
                  },
                  {
                    title: 'Investment Opportunities',
                    subtitle: 'Real Estate & More',
                    tag: '📈 Invest',
                    img: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=400&q=80',
                    navigate: 'investment-opportunities',
                  },
                ].map((reel, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    viewport={{ once: true }}
                    className="flex-shrink-0 w-44 sm:w-52 snap-start cursor-pointer group"
                    onClick={() => handleNavigate(reel.navigate)}
                  >
                    <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-[1.03]">
                      <img src={reel.img} alt={reel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {/* Tag badge */}
                      <div className="absolute top-2 left-2">
                        <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">{reel.tag}</span>
                      </div>
                      {/* Bottom info */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white font-bold text-xs leading-tight mb-0.5">{reel.title}</p>
                        <p className="text-white/60 text-[10px] mb-2">{reel.subtitle}</p>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/20 w-fit">
                          <Play className="w-2.5 h-2.5 text-white" fill="white" />
                          <span className="text-white text-[9px] font-semibold">Explore</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
            }
          </div>
        </div>
      </div>
      {/* ── END REELS STRIP ───────────────────────────────────────────────── */}

      <AdvertisingVideoReel placement="directory-sections" maxVideos={5} autoPlay={false} />


      {/* Limited Time Offers — moved to Deals Zone above hero sections */}
      {false && <div className="w-full px-4 py-16 flex justify-center">
        <div className="w-full max-w-7xl mx-auto">
          <div className="relative p-6 bg-gradient-to-br from-orange-600/20 via-purple-600/10 to-pink-600/20 border-2 border-orange-500/50 rounded-2xl overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-purple-600/10 animate-pulse" />

          <div className="relative z-10">
            {/* Header Badge */}
            <div className="flex items-center justify-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 rounded-full shadow-lg shadow-orange-600/50">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
                <span className="text-white font-bold text-sm uppercase tracking-wider">Limited Time Offers</span>
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-center mb-6 text-white">
              Lock In Your Early Bird Discount Now!
            </h3>

            <div className="flex justify-center w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 justify-items-center w-full max-w-[1200px]">
              {/* Customers Offer */}
              <div className="relative p-3 bg-[#1A1A1A]/80 backdrop-blur-sm border border-orange-500/30 rounded-lg hover:border-orange-500 transition-all group w-full max-w-[220px]">
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-0.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-bold rounded-full">
                    FIRST 20
                  </div>
                </div>

                <div className="mb-2">
                  <User className="w-6 h-6 text-orange-400 mb-1" />
                  <h4 className="text-sm font-bold text-white">Customers</h4>

                  {/* Live Counter */}
                  <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="relative">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                    </div>
                    <span className="text-xs text-gray-400">Live:</span>
                    <motion.span
                      key={customerSignUps}
                      initial={{ scale: 1.3, color: '#4ade80' }}
                      animate={{ scale: 1, color: '#ffffff' }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-bold text-white tabular-nums"
                    >
                      {customerSignUps}
                    </motion.span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span><span className="font-bold text-white">6 hrs/mo</span></span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span>Same price</span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-orange-400">Locked 1 year</span>
                  </div>
                </div>
              </div>

              {/* Subcontractors Offer */}
              <div className="relative p-3 bg-[#1A1A1A]/80 backdrop-blur-sm border border-purple-500/30 rounded-lg hover:border-purple-500 transition-all group w-full max-w-[220px]">
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-bold rounded-full">
                    FIRST 10
                  </div>
                </div>

                <div className="mb-2">
                  <Wrench className="w-6 h-6 text-purple-400 mb-1" />
                  <h4 className="text-sm font-bold text-white">Subcontractors</h4>

                  {/* Live Counter */}
                  <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="relative">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                    </div>
                    <span className="text-xs text-gray-400">Live:</span>
                    <motion.span
                      key={subcontractorSignUps}
                      initial={{ scale: 1.3, color: '#4ade80' }}
                      animate={{ scale: 1, color: '#ffffff' }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-bold text-white tabular-nums"
                    >
                      {subcontractorSignUps}
                    </motion.span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-white">6 mo FREE</span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>Next 6mo 50% off</span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-purple-400">Risk-free</span>
                  </div>
                </div>
              </div>

              {/* Service Providers Offer */}
              <div className="relative p-3 bg-[#1A1A1A]/80 backdrop-blur-sm border border-orange-500/30 rounded-lg hover:border-orange-500 transition-all group w-full max-w-[220px]">
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-0.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-bold rounded-full">
                    FIRST 10
                  </div>
                </div>

                <div className="mb-2">
                  <Briefcase className="w-6 h-6 text-orange-400 mb-1" />
                  <h4 className="text-sm font-bold text-white">Service Providers</h4>

                  {/* Live Counter */}
                  <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="relative">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                    </div>
                    <span className="text-xs text-gray-400">Live:</span>
                    <motion.span
                      key={serviceProviderSignUps}
                      initial={{ scale: 1.3, color: '#4ade80' }}
                      animate={{ scale: 1, color: '#ffffff' }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-bold text-white tabular-nums"
                    >
                      {serviceProviderSignUps}
                    </motion.span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-white">6 mo FREE</span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span>Next 6mo 50% off</span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-orange-400">Pro networking</span>
                  </div>
                </div>
              </div>

              {/* Advertisers Offer */}
              <div className="relative p-3 bg-[#1A1A1A]/80 backdrop-blur-sm border border-pink-500/30 rounded-lg hover:border-pink-500 transition-all group w-full max-w-[220px]">
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-0.5 bg-gradient-to-r from-pink-600 to-pink-700 text-white text-xs font-bold rounded-full">
                    FIRST 6
                  </div>
                </div>

                <div className="mb-2">
                  <TrendingUp className="w-6 h-6 text-pink-400 mb-1" />
                  <h4 className="text-sm font-bold text-white">Advertisers</h4>

                  {/* Live Counter */}
                  <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="relative">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                    </div>
                    <span className="text-xs text-gray-400">Live:</span>
                    <motion.span
                      key={advertiserSignUps}
                      initial={{ scale: 1.3, color: '#4ade80' }}
                      animate={{ scale: 1, color: '#ffffff' }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-bold text-white tabular-nums"
                    >
                      {advertiserSignUps}
                    </motion.span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-pink-400 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-white">3 mo FREE</span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-pink-400 flex-shrink-0 mt-0.5" />
                    <span>Next 9mo 50% off</span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-pink-400 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-pink-400">30% off forever</span>
                  </div>
                </div>
              </div>

              {/* Vendors Offer */}
              <div className="relative p-3 bg-[#1A1A1A]/80 backdrop-blur-sm border border-blue-500/30 rounded-lg hover:border-blue-500 transition-all group w-full max-w-[220px]">
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold rounded-full">
                    FIRST 15
                  </div>
                </div>

                <div className="mb-2">
                  <Store className="w-6 h-6 text-blue-400 mb-1" />
                  <h4 className="text-sm font-bold text-white">Vendors</h4>

                  {/* Live Counter */}
                  <div className="flex items-center gap-1 mt-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded">
                    <div className="relative">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                    </div>
                    <span className="text-xs text-gray-400">Live:</span>
                    <motion.span
                      key={vendorSignUps}
                      initial={{ scale: 1.3, color: '#4ade80' }}
                      animate={{ scale: 1, color: '#ffffff' }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-bold text-white tabular-nums"
                    >
                      {vendorSignUps}
                    </motion.span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-white">4 mo FREE</span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>Next 8mo 50% off</span>
                  </div>
                  <div className="flex items-start gap-1 text-gray-300">
                    <CheckCircle2 className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-blue-400">Premium placement</span>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Urgency Message */}
            <div className="mt-6 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-full">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="text-red-300 font-semibold text-sm">Spots filling fast! Don't miss out on these exclusive founding member rates.</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>}

      {/* Promo Detail Modal */}
      {showPromoModal && selectedPromo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0A0A0A] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header Image */}
            <div className="relative h-64 overflow-hidden">
              <img
                src={selectedPromo.image}
                alt={selectedPromo.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-black/50 to-transparent" />

              {/* Close Button */}
              <button
                onClick={() => setShowPromoModal(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Discount Badge */}
              <div className="absolute bottom-4 left-4">
                <div className={`px-6 py-3 bg-gradient-to-r ${
                  selectedPromo.color === 'purple' ? 'from-purple-600 to-purple-700' :
                  selectedPromo.color === 'blue' ? 'from-blue-600 to-blue-700' :
                  'from-pink-600 to-pink-700'
                } text-white font-bold text-2xl rounded-lg shadow-lg`}>
                  {selectedPromo.discount}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="mb-6">
                <span className={`text-sm font-bold uppercase tracking-wider ${
                  selectedPromo.color === 'purple' ? 'text-purple-400' :
                  selectedPromo.color === 'blue' ? 'text-blue-400' :
                  'text-pink-400'
                }`}>
                  {selectedPromo.type}
                </span>
                <h2 className="text-3xl font-bold text-white mt-2 mb-2">
                  {selectedPromo.title}
                </h2>
                <p className="text-xl text-gray-400">
                  by {selectedPromo.company}
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-2">About This Offer</h3>
                <p className="text-gray-300 leading-relaxed">
                  {selectedPromo.description}
                </p>
              </div>

              <div className="mb-6 p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span>Valid until {selectedPromo.validUntil}</span>
                </div>
                <p className="text-xs text-gray-500">
                  Terms and conditions apply. Offer subject to availability.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowPromoModal(false);
                    handleNavigate('request-service');
                  }}
                  className={`flex-1 px-6 py-4 bg-gradient-to-r ${
                    selectedPromo.color === 'purple' ? 'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600' :
                    selectedPromo.color === 'blue' ? 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600' :
                    'from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600'
                  } text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2`}
                >
                  <CheckCircle className="w-5 h-5" />
                  Request Work Order
                </button>
                <button
                  onClick={() => {
                    setShowPromoModal(false);
                    setShowSignUpModal(true);
                  }}
                  className="flex-1 px-6 py-4 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-gray-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  Sign Up to Save
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Customer Reviews */}
      {/* Before/After Gallery Preview */}
      <GalleryPreview onNavigate={handleNavigate} />

      <ReviewsSection />


      {/* Create Account CTA */}
      <div className="w-full px-4 py-12 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="w-full max-w-6xl"
        >
          <button
            onClick={() => setShowSignUpModal(true)}
            className="group relative overflow-hidden w-full text-left"
            style={{
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0000 50%, #0a0a0a 100%)',
              border: '1px solid rgba(239,68,68,0.35)',
              boxShadow: '0 0 0 0 rgba(239,68,68,0), inset 0 0 60px rgba(239,68,68,0.04)',
              transition: 'box-shadow 0.4s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 60px rgba(239,68,68,0.25), 0 0 120px rgba(239,68,68,0.1), inset 0 0 60px rgba(239,68,68,0.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(239,68,68,0), inset 0 0 60px rgba(239,68,68,0.04)';
            }}
          >
            {/* Animated grid bg */}
            <div className="cta-grid absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(239,68,68,1) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                opacity: 0.05,
                animationDelay: '1s',
              }} />

            {/* Scan line */}
            <div className="cta-scanline absolute left-0 right-0 h-20 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(239,68,68,0.06), transparent)', animationDelay: '0.8s' }} />

            {/* Corner brackets */}
            <div className="cta-corner absolute top-3 left-3 w-6 h-6 pointer-events-none"
              style={{ borderTop: '2px solid #ef4444', borderLeft: '2px solid #ef4444' }} />
            <div className="cta-corner absolute top-3 right-3 w-6 h-6 pointer-events-none"
              style={{ borderTop: '2px solid #ef4444', borderRight: '2px solid #ef4444', animationDelay: '0.5s' }} />
            <div className="cta-corner absolute bottom-3 left-3 w-6 h-6 pointer-events-none"
              style={{ borderBottom: '2px solid #ef4444', borderLeft: '2px solid #ef4444', animationDelay: '1s' }} />
            <div className="cta-corner absolute bottom-3 right-3 w-6 h-6 pointer-events-none"
              style={{ borderBottom: '2px solid #ef4444', borderRight: '2px solid #ef4444', animationDelay: '1.5s' }} />

            {/* Background hero image */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1400&q=70')",
                backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: 0.1,
                mixBlendMode: 'luminosity',
              }} />

            {/* Diagonal accent slash */}
            <div className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, transparent 30%, rgba(239,68,68,0.06) 30%, rgba(239,68,68,0.1) 60%, transparent 60%)',
                transform: 'skewX(-8deg)',
              }} />

            {/* Content */}
            <div className="relative z-10 p-10 flex flex-col sm:flex-row items-center gap-8">

              {/* Left: text */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
                  <div className="h-px w-10 bg-gradient-to-r from-transparent to-red-500/60" />
                  <span className="text-[10px] font-black tracking-[0.25em] text-red-500 uppercase">Join Black Phoenix</span>
                  <div className="h-px w-10 bg-gradient-to-l from-transparent to-red-500/60" />
                </div>

                <h3 className="text-4xl md:text-5xl font-black text-white mb-3 leading-none"
                  style={{ textShadow: '0 0 40px rgba(239,68,68,0.25)' }}>
                  Ready to Get Started?
                </h3>
                <p className="text-gray-400 text-base max-w-xl leading-relaxed">
                  Join customers, contractors, and investors already on the platform. Create your free account in under 2 minutes.
                </p>

                <div className="flex flex-wrap gap-3 mt-5 justify-center sm:justify-start">
                  {['Free to Join', 'No Credit Card', 'Instant Access'].map(t => (
                    <span key={t} className="text-[11px] font-semibold text-red-300 px-2.5 py-1 rounded-md"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: big button */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-3 px-10 py-5 rounded-xl font-black text-lg text-white group-hover:gap-4 transition-all"
                  style={{ background: 'linear-gradient(90deg, #dc2626, #ef4444)', boxShadow: '0 0 30px rgba(239,68,68,0.35)' }}>
                  Create Your Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
                <span className="text-xs font-mono text-red-500/50 tracking-widest">[ INITIALIZE ACCOUNT ]</span>
              </div>

            </div>
          </button>
        </motion.div>
      </div>


      {/* Sign Up Modal */}
      <SignUpOptionsModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
      />
    </div>
  );
}
