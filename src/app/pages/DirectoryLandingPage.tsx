import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Building2, Wrench, ShoppingCart, Trash2, Users, Megaphone,
  Building, TrendingUp, ArrowRight, CheckCircle, Sparkles,
  Clock, User, CheckCircle2, Store, Briefcase, X, Tag, ExternalLink
} from 'lucide-react';
import LogoMarquee from '../components/LogoMarquee';
import AdvertisingMarquee from '../components/AdvertisingMarquee';
import AdvertisingVideoReel from '../components/AdvertisingVideoReel';
import SignUpOptionsModal from '../components/SignUpOptionsModal';
import { DIRECTORY_SECTIONS } from '../config/directoryLandingSections';
import { autoSyncBranding } from '../utils/autoSyncBranding';
import companyLogo from '../../imports/BPB_phoenix_full_color_logo.png';

interface DirectoryLandingPageProps {
  onNavigate?: (page: string) => void;
}

export default function DirectoryLandingPage({ onNavigate }: DirectoryLandingPageProps) {
  console.log('🎯 [DirectoryLandingPage] Component mounting/rendering');
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const companyName = 'The Black Phoenix Company';

  // Live signup counters
  const [customerSignUps, setCustomerSignUps] = useState<number>(() => {
    const stored = localStorage.getItem('signUpCount_customers');
    return stored ? parseInt(stored) : 0;
  });
  const [subcontractorSignUps, setSubcontractorSignUps] = useState<number>(() => {
    const stored = localStorage.getItem('signUpCount_subcontractors');
    return stored ? parseInt(stored) : 0;
  });
  const [advertiserSignUps, setAdvertiserSignUps] = useState<number>(() => {
    const stored = localStorage.getItem('signUpCount_advertisers');
    return stored ? parseInt(stored) : 0;
  });
  const [vendorSignUps, setVendorSignUps] = useState<number>(() => {
    const stored = localStorage.getItem('signUpCount_vendors');
    return stored ? parseInt(stored) : 0;
  });
  const [serviceProviderSignUps, setServiceProviderSignUps] = useState<number>(() => {
    const stored = localStorage.getItem('signUpCount_serviceProviders');
    return stored ? parseInt(stored) : 0;
  });

  // Promotions carousel state
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
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

  // Auto-rotate promotions every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % promotions.length);
    }, 3000);
    return () => clearInterval(interval);
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
    localStorage.setItem('quote_request_cohort', cohortType);

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
    const autoOpenSignup = localStorage.getItem('autoOpenSignup');
    if (autoOpenSignup) {
      localStorage.removeItem('autoOpenSignup');
      setShowSignUpModal(true);
    }
  }, []);

  // Save signup counters to localStorage
  useEffect(() => {
    localStorage.setItem('signUpCount_customers', customerSignUps.toString());
  }, [customerSignUps]);

  useEffect(() => {
    localStorage.setItem('signUpCount_subcontractors', subcontractorSignUps.toString());
  }, [subcontractorSignUps]);

  useEffect(() => {
    localStorage.setItem('signUpCount_advertisers', advertiserSignUps.toString());
  }, [advertiserSignUps]);

  useEffect(() => {
    localStorage.setItem('signUpCount_vendors', vendorSignUps.toString());
  }, [vendorSignUps]);

  // Load sections from localStorage override or use default config
  const [sections, setSections] = useState(() => {
    console.log('🔍 [DirectoryLanding] Initializing sections state...');
    console.log('🔍 [DirectoryLanding] DIRECTORY_SECTIONS imported:', DIRECTORY_SECTIONS?.length || 0, 'sections');
    const override = localStorage.getItem('directory_sections_override');
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
      const override = localStorage.getItem('directory_sections_override');
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
      {/* Logo Bounce Animation - FIXED OUTSIDE NORMAL FLOW */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0, 10, 10, 1] }}
        transition={{
          duration: 4,
          delay: 0.4,
          times: [0, 0.3, 0.6, 1],
          ease: "easeInOut"
        }}
        style={{ display: 'flex' }}
        onAnimationComplete={() => {
          // Hide this element after animation completes
          const el = document.getElementById('bounce-logo');
          if (el) el.style.display = 'none';
        }}
        id="bounce-logo"
        className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center"
      >
        <div className="relative w-40 h-40 bg-black rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-800 overflow-hidden">
          <img
            src={companyLogo}
            alt={companyName}
            className="w-full h-full object-contain p-4"
            style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' }}
          />
        </div>
      </motion.div>

      {/* Sign In Button - Fixed Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
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
                  src={companyLogo}
                  alt={companyName}
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
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-lg font-semibold text-center">Choose Your Path Below</span>
            <Sparkles className="w-5 h-5 animate-pulse" />
          </motion.div>
        </div>
      </motion.div>

      {/* Logo Marquee */}
      <div className="w-full" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div className="w-full" style={{ maxWidth: '100vw' }}>
          <LogoMarquee />
        </div>
      </div>

      {/* Advertising Banner */}
      <div className="w-full" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div className="w-full" style={{ maxWidth: '100vw' }}>
          <AdvertisingMarquee placement="directory-header" dismissible />
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="w-full px-4 py-16 flex justify-center">
        <div className="w-full max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center"
          >
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              onHoverStart={() => setHoveredSection(section.id)}
              onHoverEnd={() => setHoveredSection(null)}
              className="group relative"
            >
              {/* Card */}
              <div className={`relative bg-[#1A1A1A] border-2 border-[#2A2A2A] rounded-2xl overflow-hidden transition-all duration-300 h-full flex flex-col ${
                hoveredSection === section.id ? 'border-opacity-100 shadow-2xl scale-105' : 'border-opacity-50'
              }`}
                style={{
                  borderColor: hoveredSection === section.id ? `var(--${section.glowColor}-500)` : undefined,
                  boxShadow: hoveredSection === section.id ? `0 0 40px rgba(var(--${section.glowColor}-rgb), 0.3)` : undefined,
                  minHeight: '375px'
                }}
              >
                {/* Image */}
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={section.image}
                    alt={section.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${section.gradient} opacity-60 group-hover:opacity-40 transition-opacity`} />

                  {/* Icon */}
                  <div className="absolute top-2 right-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
                      <section.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Number Badge */}
                  <div className="absolute bottom-2 left-2">
                    <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-white">{section.id}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-1">{section.title}</h3>
                  <p className="text-sm text-gray-400 mb-2 font-semibold">{section.subtitle}</p>
                  <p className="text-gray-300 text-sm mb-3 leading-relaxed line-clamp-2">{section.description}</p>

                  {/* Benefits */}
                  <div className="space-y-1.5 mb-3 flex-1">
                    {section.benefits.slice(0, 3).map((benefit, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckCircle className={`w-3 h-3 text-${section.glowColor}-400 flex-shrink-0`} />
                        <span className="text-sm text-gray-400">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Subscription Plans */}
                  {section.subscriptionPlans && (
                    <div className="mb-3 p-2.5 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                      <h4 className="text-sm font-bold text-white mb-2 text-center">Plans</h4>
                      <div className="space-y-1">
                        {section.subscriptionPlans.map((plan: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400 text-sm">{plan.name}</span>
                            <span className={`text-${section.glowColor}-400 font-bold text-sm`}>{plan.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CTA Buttons */}
                  <div className="space-y-2 mt-auto">
                    {section.showQuoteButton && (
                      <button
                        onClick={() => handleGetQuote(section.cohortType)}
                        className={`w-full py-2 px-3 rounded-lg font-semibold text-sm text-white bg-gradient-to-r ${section.gradient} hover:shadow-lg hover:shadow-${section.glowColor}-500/50 transition-all flex items-center justify-center gap-2 group/btn`}
                      >
                        Get Quote
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    )}
                    <button
                      onClick={() => handleNavigate(section.navigate)}
                      className={`w-full py-2 px-3 rounded-lg font-semibold text-sm ${section.showQuoteButton ? 'bg-white/10 hover:bg-white/20' : `bg-gradient-to-r ${section.gradient}`} text-white hover:shadow-lg transition-all flex items-center justify-center gap-2 group/btn`}
                    >
                      {section.showQuoteButton ? 'Learn More' : 'Explore'}
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        </div>
      </div>

      {/* Advertising Video Reel */}
      <div className="w-full" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div className="w-full" style={{ maxWidth: '100vw' }}>
          <AdvertisingVideoReel placement="directory-sections" maxVideos={5} autoPlay={false} />
        </div>
      </div>

      {/* Limited Time Offers */}
      <div className="w-full px-4 py-16 flex justify-center">
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
      </div>

      {/* Featured Promotions Carousel */}
      <div className="w-full px-4 py-12 bg-gradient-to-b from-[#0A0A0A] via-[#1A1A1A] to-[#0A0A0A] flex justify-center">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30 rounded-full mb-4">
              <Tag className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 font-semibold text-sm">EXCLUSIVE MEMBER DEALS</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">
              Featured Promotions & Offers
            </h3>
            <p className="text-gray-400">Special deals from our verified subcontractors, vendors, and partners</p>
          </div>

          {/* Carousel */}
          <motion.div
            key={currentPromoIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="relative bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-gray-800 rounded-2xl overflow-hidden cursor-pointer group w-full"
            onClick={() => {
              setSelectedPromo(promotions[currentPromoIndex]);
              setShowPromoModal(true);
            }}
          >
              <div className="grid md:grid-cols-2 gap-6">
                {/* Image Side */}
                <div className="relative h-64 md:h-auto overflow-hidden">
                  <img
                    src={promotions[currentPromoIndex].image}
                    alt={promotions[currentPromoIndex].title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

                  {/* Discount Badge */}
                  <div className="absolute top-4 left-4">
                    <div className={`px-4 py-2 bg-gradient-to-r ${
                      promotions[currentPromoIndex].color === 'purple' ? 'from-purple-600 to-purple-700' :
                      promotions[currentPromoIndex].color === 'blue' ? 'from-blue-600 to-blue-700' :
                      'from-pink-600 to-pink-700'
                    } text-white font-bold text-xl rounded-lg shadow-lg`}>
                      {promotions[currentPromoIndex].discount}
                    </div>
                  </div>
                </div>

                {/* Content Side */}
                <div className="p-8 flex flex-col justify-center">
                  <div className="mb-4">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      promotions[currentPromoIndex].color === 'purple' ? 'text-purple-400' :
                      promotions[currentPromoIndex].color === 'blue' ? 'text-blue-400' :
                      'text-pink-400'
                    }`}>
                      {promotions[currentPromoIndex].type}
                    </span>
                    <h4 className="text-2xl font-bold text-white mt-2 mb-1">
                      {promotions[currentPromoIndex].title}
                    </h4>
                    <p className="text-lg text-gray-400 mb-1">
                      by {promotions[currentPromoIndex].company}
                    </p>
                  </div>

                  <p className="text-gray-300 mb-6">
                    {promotions[currentPromoIndex].description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>Valid until {promotions[currentPromoIndex].validUntil}</span>
                    </div>
                    <button
                      className={`px-6 py-3 bg-gradient-to-r ${
                        promotions[currentPromoIndex].color === 'purple' ? 'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600' :
                        promotions[currentPromoIndex].color === 'blue' ? 'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600' :
                        'from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600'
                      } text-white font-bold rounded-lg transition-all flex items-center gap-2 group-hover:gap-3`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPromo(promotions[currentPromoIndex]);
                        setShowPromoModal(true);
                      }}
                    >
                      View Details
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {promotions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPromoIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentPromoIndex
                    ? 'w-8 bg-orange-500'
                    : 'w-2 bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

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

      {/* Create Account CTA */}
      <div className="w-full px-4 py-12 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="w-full max-w-7xl flex justify-center"
        >
          <div className="bg-gradient-to-r from-orange-600/20 via-purple-600/20 to-blue-600/20 border-2 border-orange-500/30 rounded-2xl p-12 w-full max-w-4xl">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">Ready to Get Started?</h3>
            <p className="text-xl text-gray-300 mb-8 text-center mx-auto max-w-2xl">
              Join thousands of satisfied customers, contractors, and investors on our platform
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setShowSignUpModal(true)}
                className="px-12 py-5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl font-bold text-xl hover:from-orange-500 hover:to-orange-600 transition-all shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 flex items-center gap-3 group"
              >
                Create Your Account
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Advertising Banner */}
      <div className="w-full" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div className="w-full" style={{ maxWidth: '100vw' }}>
          <AdvertisingMarquee placement="directory-footer" dismissible />
        </div>
      </div>

      {/* Sign Up Modal */}
      <SignUpOptionsModal
        isOpen={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
      />
    </div>
  );
}
