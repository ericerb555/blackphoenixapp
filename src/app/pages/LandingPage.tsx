import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Users, 
  Phone,
  Mail,
  MapPin,
  Star,
  Quote,
  Hammer,
  Wrench,
  PaintBucket,
  Zap,
  Droplets,
  Home,
  Shield,
  Clock,
  Award,
  TrendingUp,
  MessageSquare,
  Calendar,
  Menu,
  X,
  Briefcase,
  HardHat,
  DollarSign,
  Key,
  ClipboardList,
  Building,
  AlertTriangle,
  Wind,
  Trash2,
  Ruler,
  Trees,
  AirVent,
  Boxes,
  Settings,
  FileText,
  ArrowLeft,
  Sparkles,
  Edit2,
  User,
  Clipboard,
  Camera,
  GraduationCap,
  CheckSquare
} from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '../components/ui/button';
import AdvertisingMarquee from '../components/AdvertisingMarquee';
import AdvertisingBanner from '../components/AdvertisingBanner';
import LogoMarquee from '../components/LogoMarquee';
import { GenericApplicationForm } from '../components/GenericApplicationForm'; // Replaced SkilledTradesApplicationForm (named export)
import GiveawayWidget from '../components/GiveawayWidget';
import PropertyManagerDemo from '../components/PropertyManagerDemo';
import LandlordPortalDemo from '../components/LandlordPortalDemo';
import SignUpOptionsModal from '../components/SignUpOptionsModal';
import VideoReelsShowcase from '../components/VideoReelsShowcase';
import { BrandingService, BrandingProfile } from '../lib/services/brandingService';
import { getPortfolioProjects, PortfolioProject } from '../lib/services/portfolioService';
import { initializeSampleWorkRequests } from '../lib/services/sampleWorkRequestsWithMedia';

export default function LandingPage({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showPropertyManagerDemo, setShowPropertyManagerDemo] = useState(false);
  const [showLandlordDemo, setShowLandlordDemo] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingProfile | null>(null);
  const [loadingBranding, setLoadingBranding] = useState(true);
  const [landingContent, setLandingContent] = useState<any>(null);
  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [applicationConfig, setApplicationConfig] = useState<any>(null);

  // Detect mobile device to optimize animations
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load landing page content from Website Settings
  useEffect(() => {
    const stored = localStorage.getItem('landingPageContent');
    if (stored) {
      setLandingContent(JSON.parse(stored));
    }
    
    // Load application form config
    const formConfig = localStorage.getItem('applicationFormConfig');
    if (formConfig) {
      try {
        setApplicationConfig(JSON.parse(formConfig));
      } catch (error) {
        console.error('Failed to load application form config:', error);
      }
    }
  }, []);

  // Load branding profile from localStorage (used by Company Profile page)
  useEffect(() => {
    const loadBranding = async () => {
      try {
        // First try localStorage (primary source for landing page)
        const stored = localStorage.getItem('company_branding_profile');
        if (stored) {
          setBranding(JSON.parse(stored));
          setLoadingBranding(false);
          console.log('✅ Landing page loaded branding:', JSON.parse(stored));
          return;
        }

        // Fallback: try server (but don't show errors if it fails)
        const { data } = await BrandingService.getBrandingProfile();
        if (data) {
          setBranding(data);
          // Cache to localStorage for faster future loads
          localStorage.setItem('company_branding_profile', JSON.stringify(data));
        }
      } catch (error) {
        // Silently fail - landing page works without branding
      } finally {
        setLoadingBranding(false);
      }
    };
    loadBranding();
  }, []);

  // Load portfolio projects from completed work requests
  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        setLoadingProjects(true);

        // Clean up any corrupted localStorage data
        const keysToCheck = ['work_requests', 'work_requests_anonymous'];
        keysToCheck.forEach(key => {
          try {
            const stored = localStorage.getItem(key);
            if (stored === 'undefined' || stored === 'null' || stored === '') {
              console.warn(`Clearing corrupted ${key} from localStorage`);
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        });

        // Initialize sample work requests if none exist
        initializeSampleWorkRequests();
        // Load portfolio from completed work requests
        const projects = await getPortfolioProjects({ limit: 6 });
        setPortfolioProjects(projects);
      } catch (error) {
        console.error('Error loading portfolio projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };
    loadPortfolio();
  }, []);

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = `/${path}`;
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  // Get company info from branding or Website Settings content
  // PRIORITY: Brand Creator data comes FIRST, then Website Settings, then defaults
  const companyName = branding?.company_name || landingContent?.hero?.title || 'Black Phoenix Builds';
  const companyTagline = branding?.company_tagline || landingContent?.hero?.subtitle || 'Excellence in Construction & Remodeling';
  const companyPhone = branding?.phone || landingContent?.contact?.phone || '(555) 123-4567';
  const companyEmail = branding?.email || landingContent?.contact?.email || 'info@eliteconstruction.com';
  const companyAddress = landingContent?.contact?.address || branding 
    ? `${branding.city}, ${branding.state} ${branding.zip_code}` 
    : 'Nashua, NH 03060';
  const fullAddress = branding
    ? BrandingService.getFormattedAddress(branding)
    : 'Nashua, Manchester, Salem & Surrounding Areas';
  const primaryColor = branding?.primary_color || '#ea580c';
  const logoUrl = branding?.logo_url;

  // Debug logging
  console.log('🎨 Landing Page Brand Data:', {
    companyName,
    companyTagline,
    logoUrl: logoUrl ? 'Logo loaded ✓' : 'No logo ✗',
    brandingData: branding
  });

  // Services offered
  const services = [
    {
      icon: <Hammer className="w-8 h-8" />,
      title: 'General Carpentry',
      description: 'Custom woodwork, framing, trim installation, and finish carpentry',
      image: 'https://images.unsplash.com/photo-1684406401783-b599f9e03d64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXJwZW50cnklMjB3b29kd29yayUyMGN1c3RvbXxlbnwxfHx8fDE3NzE4NjY0NjR8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <Home className="w-8 h-8" />,
      title: 'Kitchen Remodeling',
      description: 'Complete kitchen renovations, cabinet installation, countertops',
      image: 'https://images.unsplash.com/photo-1749704647283-3ad79f4acc6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwcmVub3ZhdGlvbiUyMG1vZGVybnxlbnwxfHx8fDE3NzE3ODQ4MTl8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <Droplets className="w-8 h-8" />,
      title: 'Bathroom Renovation',
      description: 'Modern bathroom remodels, tile work, fixture installation',
      image: 'https://images.unsplash.com/photo-1758448018619-4cbe2250b9ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXRocm9vbSUyMHJlbW9kZWwlMjBsdXh1cnl8ZW58MXx8fHwxNzcxODY2NDYzfDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <PaintBucket className="w-8 h-8" />,
      title: 'Painting & Finishing',
      description: 'Interior and exterior painting, drywall repair, texture work',
      image: 'https://images.unsplash.com/photo-1759406066673-f76869a4e6db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwZXh0ZXJpb3IlMjBwYWludGluZ3xlbnwxfHx8fDE3NzE4NjY0OTF8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Electrical Services',
      description: 'Licensed electrical work, wiring, lighting, panel upgrades',
      image: 'https://images.unsplash.com/photo-1751486289947-4f5f5961b3aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVjdHJpY2FsJTIwd2lyaW5nJTIwaW5zdGFsbGF0aW9ufGVufDF8fHx8MTc3MTc4MzM4NXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <Wrench className="w-8 h-8" />,
      title: 'Plumbing Services',
      description: 'Professional plumbing repairs, fixture installation, pipe work',
      image: 'https://images.unsplash.com/photo-1761353855019-05f2f3ed9c43?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbHVtYmluZyUyMGZpeHR1cmUlMjBtb2Rlcm58ZW58MXx8fHwxNzcxODY2NDkzfDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <Building2 className="w-8 h-8" />,
      title: 'Flooring Installation',
      description: 'Hardwood, tile, laminate, and vinyl flooring installation',
      image: 'https://images.unsplash.com/photo-1693948568453-a3564f179a84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbG9vcmluZyUyMGluc3RhbGxhdGlvbiUyMGhhcmR3b29kfGVufDF8fHx8MTc3MTc4MTY1MXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <Home className="w-8 h-8" />,
      title: 'Roofing & Repairs',
      description: 'Roof installation, repairs, maintenance, and inspections',
      image: 'https://images.unsplash.com/photo-1760331840361-d751cfc1becf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb29mJTIwcmVwYWlyJTIwY29uc3RydWN0aW9ufGVufDF8fHx8MTc3MTg2MzUyM3ww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <Building className="w-8 h-8" />,
      title: 'Condo Association Maintenance',
      description: 'HOA maintenance, common area repairs, scheduled maintenance plans',
      image: 'https://images.unsplash.com/photo-1760478869977-a1b4cf15e929?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25kbyUyMGJ1aWxkaW5nJTIwZXh0ZXJpb3IlMjBtb2Rlcm58ZW58MXx8fHwxNzcxODczOTUyfDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <Key className="w-8 h-8" />,
      title: 'Landlord Property Services',
      description: 'Rental property maintenance, tenant turnover repairs, emergency services',
      image: 'https://images.unsplash.com/photo-1758836113725-a1b082c622bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcGFydG1lbnQlMjBtYWludGVuYW5jZSUyMHJlcGFpciUyMHdvcmtlcnxlbnwxfHx8fDE3NzE4NzM5NTJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <ClipboardList className="w-8 h-8" />,
      title: 'Property Management Solutions',
      description: 'Multi-unit maintenance, preventive maintenance programs, vendor coordination',
      image: 'https://images.unsplash.com/photo-1758448721162-0c77cf477d6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9wZXJ0eSUyMG1hbmFnZW1lbnQlMjBidWlsZGluZyUyMGxvYmJ5fGVufDF8fHx8MTc3MTg3Mzk1Mnww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      icon: <Wind className="w-8 h-8" />,
      title: 'Power Washing',
      description: 'High-pressure cleaning for driveways, siding, decks, and exterior surfaces',
      image: 'https://images.unsplash.com/photo-1735399588751-3cdd6effeac4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3dlciUyMHdhc2hpbmclMjBob3VzZSUyMGV4dGVyaW9yfGVufDF8fHx8MTc3MjM4MjE5OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      icon: <HardHat className="w-8 h-8" />,
      title: 'Demolition Services',
      description: 'Safe and efficient demolition, interior tear-outs, structural removal',
      image: 'https://images.unsplash.com/photo-1678944827354-fb54b9040a04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZW1vbGl0aW9uJTIwY29uc3RydWN0aW9uJTIwc2l0ZXxlbnwxfHx8fDE3NzIzODIxOTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      icon: <Trash2 className="w-8 h-8" />,
      title: 'Trash Removal & Hauling',
      description: 'Construction debris removal, junk hauling, dumpster rental services',
      image: 'https://images.unsplash.com/photo-1680847307417-b6ae9b78cda6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFzaCUyMHJlbW92YWwlMjBkdW1wc3RlcnxlbnwxfHx8fDE3NzIzODIxOTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      icon: <Boxes className="w-8 h-8" />,
      title: 'Clean Outs & Organizing',
      description: 'Estate clean outs, hoarding cleanup, garage and basement organization',
      image: 'https://images.unsplash.com/photo-1709831917664-804b57448953?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwY2xlYW5vdXQlMjBqdW5rJTIwcmVtb3ZhbHxlbnwxfHx8fDE3NzIzODIxOTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      icon: <Home className="w-8 h-8" />,
      title: 'Home Additions',
      description: 'Room additions, second story construction, bump-outs, and expansions',
      image: 'https://images.unsplash.com/photo-1685425481910-71c174ad7341?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob3VzZSUyMGFkZGl0aW9uJTIwY29uc3RydWN0aW9uJTIwbmV3fGVufDF8fHx8MTc3MjM4MjIwM3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      icon: <Ruler className="w-8 h-8" />,
      title: 'Design & Build',
      description: 'Custom home design, architectural planning, 3D rendering, and build services',
      image: 'https://images.unsplash.com/photo-1721244653757-b76cc4679dfb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcmNoaXRlY3R1cmFsJTIwZGVzaWduJTIwYmx1ZXByaW50fGVufDF8fHx8MTc3MjMzNjI2NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      icon: <Trees className="w-8 h-8" />,
      title: 'Landscaping & Yard Work',
      description: 'Lawn care, garden design, hardscaping, irrigation, and landscape maintenance',
      image: 'https://images.unsplash.com/photo-1728881667082-06be928f08d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYW5kc2NhcGluZyUyMHlhcmQlMjB3b3JrfGVufDF8fHx8MTc3MjM4MjIwMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    {
      icon: <AirVent className="w-8 h-8" />,
      title: 'HVAC Services',
      description: 'Heating and cooling installation, repairs, maintenance, and system upgrades',
      image: 'https://images.unsplash.com/photo-1761642119720-1ce47b16d09b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxodmFjJTIwYWlyJTIwY29uZGl0aW9uaW5nJTIwaW5zdGFsbGF0aW9ufGVufDF8fHx8MTc3MjM4MjIwMHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
  ];

  // Featured projects
  const featuredProjects = [
    {
      title: 'Modern Kitchen Transformation',
      category: 'Kitchen Remodel',
      image: 'https://images.unsplash.com/photo-1749704647283-3ad79f4acc6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxraXRjaGVuJTIwcmVub3ZhdGlvbiUyMG1vZGVybnxlbnwxfHx8fDE3NzE3ODQ4MTl8MA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Complete kitchen renovation with custom cabinetry and quartz countertops'
    },
    {
      title: 'Luxury Bathroom Renovation',
      category: 'Bathroom Remodel',
      image: 'https://images.unsplash.com/photo-1758448018619-4cbe2250b9ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXRocm9vbSUyMHJlbW9kZWwlMjBsdXh1cnl8ZW58MXx8fHwxNzcxODY2NDYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Spa-like bathroom with premium tile work and modern fixtures'
    },
    {
      title: 'Outdoor Deck Construction',
      category: 'Deck Building',
      image: 'https://images.unsplash.com/photo-1630807284621-9c1e13de79ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWNrJTIwY29uc3RydWN0aW9uJTIwYmFja3lhcmR8ZW58MXx8fHwxNzcxODY2NDkyfDA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Custom outdoor living space with composite decking'
    },
    {
      title: 'Hardwood Flooring Installation',
      category: 'Flooring',
      image: 'https://images.unsplash.com/photo-1693948568453-a3564f179a84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbG9vcmluZyUyMGluc3RhbGxhdGlvbiUyMGhhcmR3b29kfGVufDF8fHx8MTc3MTc4MTY1MXww&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Beautiful oak hardwood flooring throughout main living areas'
    },
    {
      title: 'Custom Tile Work',
      category: 'Tile Installation',
      image: 'https://images.unsplash.com/photo-1664227430687-9299c593e3da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aWxlJTIwaW5zdGFsbGF0aW9uJTIwYmF0aHJvb218ZW58MXx8fHwxNzcxODY2NDk0fDA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Precision tile installation with custom pattern design'
    },
    {
      title: 'Exterior Painting Project',
      category: 'Painting',
      image: 'https://images.unsplash.com/photo-1759406066673-f76869a4e6db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxob21lJTIwZXh0ZXJpb3IlMjBwYWludGluZ3xlbnwxfHx8fDE3NzE4NjY0OTF8MA&ixlib=rb-4.1.0&q=80&w=1080',
      description: 'Complete exterior painting with premium weather-resistant paint'
    },
  ];

  const testimonials = [
    {
      name: 'Jennifer Martinez',
      location: 'Nashua, NH',
      rating: 5,
      text: 'The team did an amazing job on our kitchen remodel. Professional, on-time, and the quality exceeded our expectations. Highly recommend!',
      project: 'Kitchen Remodel',
      avatar: 'JM'
    },
    {
      name: 'Robert Thompson',
      location: 'Manchester, NH',
      rating: 5,
      text: 'Outstanding craftsmanship on our bathroom renovation. They handled everything from plumbing to tile work perfectly. Worth every penny.',
      project: 'Bathroom Renovation',
      avatar: 'RT'
    },
    {
      name: 'Susan Chen',
      location: 'Salem, NH',
      rating: 5,
      text: 'Built a beautiful deck for us last summer. The attention to detail and quality materials used really shows. We love spending time outdoors now!',
      project: 'Deck Construction',
      avatar: 'SC'
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white w-full overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#2a2a2a] z-40 flex justify-center">
        <div className="w-full max-w-7xl px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3 group">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-12 w-auto" />
              ) : (
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(to bottom right, ${primaryColor}, #dc2626)` 
                  }}
                >
                  <HardHat className="w-7 h-7 text-white" />
                </div>
              )}
              <div>
                <div 
                  className="text-xl font-bold bg-clip-text text-transparent"
                  style={{ 
                    backgroundImage: `linear-gradient(to right, ${primaryColor}, #f97316)` 
                  }}
                >
                  {companyName}
                </div>
                <div className="text-xs text-gray-400">{companyTagline}</div>
              </div>
              {/* Edit Brand Button - Shows on Hover */}
              <button
                onClick={() => onNavigate?.('company-profile')}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-orange-600/20 hover:bg-orange-600/30 rounded-lg border border-orange-500/30"
                title="Edit Brand & Logo"
              >
                <Edit2 className="w-4 h-4 text-orange-400" />
              </button>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              {/* Navigation Links */}
              <div className="flex items-center gap-5">
                <button 
                  onClick={() => handleNavigate('marketing-hub')} 
                  className="text-sm text-gray-300 hover:text-white transition-colors font-medium"
                >
                  For Businesses
                </button>
                <button 
                  onClick={() => scrollToSection('services')} 
                  className="text-sm text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Services
                </button>
                <button
                  onClick={() => scrollToSection('property-management')}
                  className="text-sm text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Property Mgmt
                </button>
                <button
                  onClick={() => scrollToSection('invest')}
                  className="text-sm text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Invest
                </button>
                <button
                  onClick={() => scrollToSection('portfolio')}
                  className="text-sm text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Portfolio
                </button>
                <button 
                  onClick={() => scrollToSection('testimonials')} 
                  className="text-sm text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Reviews
                </button>
              </div>
              
              {/* Divider */}
              <div className="w-px h-8 bg-zinc-700"></div>
              
              {/* Action Buttons Group */}
              <div className="flex items-center gap-2.5">
                <a 
                  href={`tel:${companyPhone.replace(/\D/g, '')}`} 
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden xl:inline">{companyPhone}</span>
                </a>
                
                <button
                  onClick={() => handleNavigate('dashboard')}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg font-medium transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Dashboard
                </button>
                
                <button
                  onClick={() => handleNavigate('public-store')}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all"
                >
                  Shop Store
                </button>
                
                <button
                  onClick={() => scrollToSection('contact')}
                  className="px-5 py-2 text-sm bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-bold transition-all shadow-lg shadow-orange-600/20"
                >
                  Free Quote
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden py-4 border-t border-[#2a2a2a]"
            >
              <div className="flex flex-col space-y-4">
                <button onClick={() => handleNavigate('marketing-hub')} className="text-gray-300 text-left font-semibold">
                  For Businesses
                </button>
                <button onClick={() => scrollToSection('services')} className="text-gray-300 text-left">
                  Services
                </button>
                <button onClick={() => scrollToSection('property-management')} className="text-gray-300 text-left">
                  Property Management
                </button>
                <button onClick={() => { scrollToSection('invest'); setMobileMenuOpen(false); }} className="text-gray-300 text-left">
                  Invest
                </button>
                <button onClick={() => scrollToSection('portfolio')} className="text-gray-300 text-left">
                  Portfolio
                </button>
                <button onClick={() => scrollToSection('testimonials')} className="text-gray-300 text-left">
                  Reviews
                </button>
                <button onClick={() => scrollToSection('careers')} className="text-gray-300 text-left">
                  Careers
                </button>
                <button onClick={() => scrollToSection('contact')} className="text-gray-300 text-left">
                  Contact
                </button>
                <button
                  onClick={() => handleNavigate('dashboard')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#ea580c] hover:bg-[#dc2626] text-white rounded-lg font-semibold transition-all shadow-lg"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to App
                </button>
                <button
                  onClick={() => handleNavigate('public-store')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#ea580c] to-orange-600 hover:from-[#dc2626] hover:to-red-600 text-white rounded-lg font-semibold transition-all shadow-lg"
                >
                  🛍️ Shop Now
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate?.('sign-up') || (window.location.href = '/sign-up');
                  }}
                  className="w-full px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-white rounded-lg font-semibold transition-all"
                >
                  Sign Up
                </button>
                <PrimaryButton onClick={() => scrollToSection('contact')} className="w-full">
                  Get Free Quote
                </PrimaryButton>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Spacer for fixed navigation */}
      <div className="h-32"></div>

      {/* NEW: Subscription & Maintenance Plans Hero Section */}
      <section className="min-h-screen pt-32 pb-20 px-4 relative overflow-hidden flex items-center justify-center">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-[#0A0A0A] to-purple-600/10" />

        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600/20 to-purple-600/20 border border-orange-500/30 rounded-full mb-6">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold text-sm text-orange-300">
                    Flexible Payment Plans Available
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Build Your Dream{' '}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-purple-500">
                    One Hour at a Time
                  </span>
                </h1>

                <p className="text-xl text-gray-300 mb-6 leading-relaxed">
                  Subscribe to our maintenance plans and build prepaid hours for your next big project.
                  Specializing in <span className="text-orange-400 font-semibold">bathroom and kitchen renovations</span>,
                  we handle all your home and condo maintenance needs.
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-600/20 border border-orange-500/50 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Monthly Maintenance Plans</h3>
                      <p className="text-gray-400 text-sm">Build prepaid hours each month toward future renovations</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-600/20 border border-orange-500/50 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Payment Over Time</h3>
                      <p className="text-gray-400 text-sm">Spread the cost of big projects without the stress</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-600/20 border border-orange-500/50 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Vetted Quality Vendors</h3>
                      <p className="text-gray-400 text-sm">Access our network of trusted, certified professionals</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-600/20 border border-orange-500/50 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Full-Service Solutions</h3>
                      <p className="text-gray-400 text-sm">From minor repairs to complete kitchen & bathroom transformations</p>
                    </div>
                  </div>
                </div>

                {/* LIMITED TIME OFFERS */}
                <div className="relative my-8 p-6 bg-gradient-to-br from-orange-600/20 via-purple-600/10 to-pink-600/20 border-2 border-orange-500/50 rounded-2xl overflow-hidden">
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

                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Customers Offer */}
                      <div className="relative p-5 bg-[#1A1A1A]/80 backdrop-blur-sm border border-orange-500/30 rounded-xl hover:border-orange-500 transition-all group">
                        <div className="absolute top-3 right-3">
                          <div className="px-3 py-1 bg-gradient-to-r from-orange-600 to-orange-700 text-white text-xs font-bold rounded-full">
                            FIRST 20
                          </div>
                        </div>

                        <div className="mb-3">
                          <User className="w-8 h-8 text-orange-400 mb-2" />
                          <h4 className="text-lg font-bold text-white">Customers</h4>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <span><span className="font-bold text-white">6 hours/month</span> (instead of 4)</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <span>Same basic plan price</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                            <span><span className="font-bold text-orange-400">Locked in for 1 full year</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Subcontractors Offer */}
                      <div className="relative p-5 bg-[#1A1A1A]/80 backdrop-blur-sm border border-purple-500/30 rounded-xl hover:border-purple-500 transition-all group">
                        <div className="absolute top-3 right-3">
                          <div className="px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-bold rounded-full">
                            FIRST 10
                          </div>
                        </div>

                        <div className="mb-3">
                          <Wrench className="w-8 h-8 text-purple-400 mb-2" />
                          <h4 className="text-lg font-bold text-white">Subcontractors</h4>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span><span className="font-bold text-white">First 6 months FREE</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span>Next 6 months 50% off</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span><span className="font-bold text-purple-400">Build your business risk-free</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Advertisers Offer */}
                      <div className="relative p-5 bg-[#1A1A1A]/80 backdrop-blur-sm border border-pink-500/30 rounded-xl hover:border-pink-500 transition-all group">
                        <div className="absolute top-3 right-3">
                          <div className="px-3 py-1 bg-gradient-to-r from-pink-600 to-pink-700 text-white text-xs font-bold rounded-full">
                            FIRST 6
                          </div>
                        </div>

                        <div className="mb-3">
                          <TrendingUp className="w-8 h-8 text-pink-400 mb-2" />
                          <h4 className="text-lg font-bold text-white">Advertisers</h4>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-pink-400 flex-shrink-0" />
                            <span><span className="font-bold text-white">3 months FREE</span></span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-pink-400 flex-shrink-0" />
                            <span>Next 9 months 50% off</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-300">
                            <CheckCircle2 className="w-4 h-4 text-pink-400 flex-shrink-0" />
                            <span><span className="font-bold text-pink-400">Lifetime 30% off forever</span></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Urgency Message */}
                    <div className="mt-6 text-center">
                      <p className="text-gray-300 text-sm">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-full">
                          <Clock className="w-4 h-4 text-red-400" />
                          <span className="text-red-300 font-semibold">Spots filling fast! Don't miss out on these exclusive founding member rates.</span>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* View Plans & Pricing Button */}
                  <button
                    onClick={() => handleNavigate('pricing')}
                    className="group relative px-6 py-4 bg-[#1A1A1A] border-2 border-orange-500/50 rounded-xl font-semibold text-white hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">View Plans & Pricing</span>
                    <ArrowRight className="w-5 h-5 relative z-10" />
                  </button>

                  {/* View Our Work Button */}
                  <button
                    onClick={() => scrollToSection('portfolio')}
                    className="group relative px-6 py-4 bg-[#1A1A1A] border-2 border-orange-600/50 rounded-xl font-semibold text-white hover:border-orange-600 hover:shadow-lg hover:shadow-orange-600/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">View Our Work</span>
                  </button>

                  {/* Create Account Button */}
                  <button
                    onClick={() => setShowSignUpModal(true)}
                    className="group relative px-6 py-4 bg-[#1A1A1A] border-2 border-purple-600/50 rounded-xl font-semibold text-white hover:border-purple-600 hover:shadow-lg hover:shadow-purple-600/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">Create Account</span>
                    <User className="w-5 h-5 relative z-10" />
                  </button>

                  {/* Get Free Quote Button */}
                  <button
                    onClick={() => scrollToSection('contact')}
                    className="group relative px-6 py-4 bg-[#1A1A1A] border-2 border-green-600/50 rounded-xl font-semibold text-white hover:border-green-600 hover:shadow-lg hover:shadow-green-600/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">Get Free Quote</span>
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Scrolling Project Gallery */}
            <div className="relative h-[600px] overflow-hidden rounded-2xl">
              {/* Gradient Overlays for fade effect */}
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0A0A0A] to-transparent z-10 pointer-events-none" />

              {/* Scrolling Images Container */}
              <motion.div
                className="flex flex-col gap-4"
                animate={{
                  y: [0, -1000]
                }}
                transition={{
                  y: {
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }
                }}
              >
                {/* First set of images */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative h-64 rounded-xl overflow-hidden group">
                    <img
                      src="https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&q=80"
                      alt="Modern Kitchen Renovation"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white font-semibold">Kitchen Renovation</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative h-64 rounded-xl overflow-hidden group">
                    <img
                      src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80"
                      alt="Luxury Bathroom Remodel"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white font-semibold">Bathroom Remodel</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative h-80 rounded-xl overflow-hidden group">
                  <img
                    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
                    alt="Custom Kitchen Design"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-semibold text-lg">Custom Kitchen Design</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative h-64 rounded-xl overflow-hidden group">
                    <img
                      src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=600&q=80"
                      alt="Modern Bathroom"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white font-semibold">Spa-Style Bathroom</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative h-64 rounded-xl overflow-hidden group">
                    <img
                      src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600&q=80"
                      alt="Home Maintenance"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white font-semibold">Property Maintenance</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Duplicate set for seamless loop */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative h-64 rounded-xl overflow-hidden group">
                    <img
                      src="https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&q=80"
                      alt="Modern Kitchen Renovation"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  <div className="relative h-64 rounded-xl overflow-hidden group">
                    <img
                      src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80"
                      alt="Luxury Bathroom Remodel"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                </div>

                <div className="relative h-80 rounded-xl overflow-hidden group">
                  <img
                    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
                    alt="Custom Kitchen Design"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Original Hero Section */}
      <section className="min-h-screen pt-32 md:pt-44 pb-20 px-4 relative overflow-hidden flex items-center justify-center">
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/80 via-[#0A0A0A]/70 to-[#0A0A0A] z-10" />
          <img
            src="https://images.unsplash.com/photo-1759922378219-1d31edb644f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjB3b3JrZXIlMjBoYXJkaGF0JTIwc2l0ZXxlbnwxfHx8fDE3NzE4NjY0OTF8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Construction"
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover opacity-30"
            style={{ willChange: 'auto' }}
          />
        </div>

        {/* Company Logo - Top Left of Hero Section */}
        {logoUrl && (
          <div className="absolute top-8 left-8 z-30">
            <div className="bg-[#0A0A0A]/80 backdrop-blur-sm border border-[#2A2A2A] rounded-2xl p-4 shadow-2xl">
              <img
                src={logoUrl}
                alt={companyName}
                className="h-24 w-auto object-contain"
              />
            </div>
          </div>
        )}

        <div className="relative z-20 w-full flex justify-center">
          <div className="w-full max-w-7xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Content */}
              <div className="text-center lg:text-left">
                
                <div 
                  className="inline-flex items-center gap-2 px-4 py-2 border rounded-full mb-6"
                  style={{ 
                    backgroundColor: `${primaryColor}20`,
                    borderColor: `${primaryColor}30`
                  }}
                >
                  <Star className="w-4 h-4" style={{ color: primaryColor, fill: primaryColor }} />
                  <span className="font-semibold text-sm" style={{ color: primaryColor }}>
                    Quality work. Built to last.
                  </span>
                </div>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  The Black Phoenix Company Platform &{' '}
                  <span 
                    className="bg-clip-text text-transparent"
                    style={{ 
                      backgroundImage: `linear-gradient(to right, ${primaryColor}, #f97316)` 
                    }}
                  >
                    Professional Services
                  </span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                  All-in-one enterprise platform with CRM, hybrid eCommerce marketplace, AI blueprint analyzer, 13+ mobile portals, automatic quote generation, comprehensive vendor API integration, subscription management, referral rewards, video reels, invoicing, payroll, and 60+ business management tools.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  {/* Get Free Estimate Button */}
                  <button
                    onClick={() => scrollToSection('contact')}
                    className="group relative px-6 py-4 bg-[#1A1A1A] border-2 border-orange-500/50 rounded-xl font-semibold text-white hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">Get Free Estimate</span>
                    <ArrowRight className="w-5 h-5 relative z-10" />
                  </button>

                  {/* Shop Marketplace Button */}
                  <button
                    onClick={() => handleNavigate('public-store')}
                    className="group relative px-6 py-4 bg-[#1A1A1A] border-2 border-orange-600/50 rounded-xl font-semibold text-white hover:border-orange-600 hover:shadow-lg hover:shadow-orange-600/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">🛍️ Shop Marketplace</span>
                  </button>

                  {/* Create Account Button */}
                  <button
                    onClick={() => setShowSignUpModal(true)}
                    className="group relative px-6 py-4 bg-[#1A1A1A] border-2 border-purple-600/50 rounded-xl font-semibold text-white hover:border-purple-600 hover:shadow-lg hover:shadow-purple-600/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">Create Account</span>
                    <Users className="w-5 h-5 relative z-10" />
                  </button>

                  {/* View Services Button */}
                  <button
                    onClick={() => scrollToSection('services')}
                    className="group relative px-6 py-4 bg-[#1A1A1A] border-2 border-gray-600/50 rounded-xl font-semibold text-white hover:border-gray-500 hover:shadow-lg hover:shadow-gray-500/30 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10">View Services</span>
                  </button>
                </div>

                {/* Trust Indicators */}
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-[#2a2a2a]">
                  <div>
                    <div className="text-3xl font-bold mb-1" style={{ color: primaryColor }}>60+</div>
                    <div className="text-sm text-gray-400">Platform Modules</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold mb-1" style={{ color: primaryColor }}>13</div>
                    <div className="text-sm text-gray-400">Mobile Portals</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold mb-1" style={{ color: primaryColor }}>100%</div>
                    <div className="text-sm text-gray-400">Cloud-Based</div>
                  </div>
                </div>
              </div>

              {/* Right Column - Company Photo */}
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500/30 shadow-2xl shadow-orange-500/20">
                  <img 
                    src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHRlYW0lMjBvZmZpY2V8ZW58MXx8fHwxNzQ1MTc5NTIwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Black Phoenix Company Team"
                    className="w-full h-auto object-cover"
                  />
                  {/* Glow Effect Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-50" />
                </div>
                
                {/* Floating Stats Card */}
                <div className="absolute -bottom-6 -left-6 bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-orange-500/30 rounded-xl p-6 shadow-xl backdrop-blur-sm hidden lg:block">
                  <div className="text-lg font-bold mb-1" style={{ color: primaryColor }}>Quality work.</div>
                  <div className="text-sm text-gray-400">Built to last.</div>
                </div>
              </div>
            </div>
          </div>
          </div>
      </section>

      {/* Logo Marquee - Partner Brands */}
      <LogoMarquee speed={30} />

      {/* Advertising Banner */}
      <section className="py-8 px-4 flex justify-center">
        <div className="w-full max-w-7xl">
          <AdvertisingBanner placement="landing-after-logos" variant="horizontal" />
        </div>
      </section>

      {/* Enterprise Platform Features */}
      <section className="py-20 px-4 bg-[#0A0A0A] flex justify-center">
        <div className="w-full max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Complete <span style={{ color: primaryColor }}>Enterprise Platform</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl">
              60+ integrated modules for comprehensive business management
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* eCommerce & Marketplace */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">eCommerce Platform</h3>
              <p className="text-sm text-gray-400">Full marketplace with vendor storefronts, shopping cart, and secure checkout</p>
            </motion.div>

            {/* Dropshipper Integration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Dropshipper System</h3>
              <p className="text-sm text-gray-400">15+ REST APIs, product catalog import, and ad creator integration</p>
            </motion.div>

            {/* Mobile Portal Hub */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">13+ Mobile Portals</h3>
              <p className="text-sm text-gray-400">Customer, employee, subcontractor, landlord, vendor, and more</p>
            </motion.div>

            {/* CRM System */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">CRM Management</h3>
              <p className="text-sm text-gray-400">Complete customer relationship management with pipeline tracking</p>
            </motion.div>

            {/* Invoice Management */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-600 to-yellow-700 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Invoice System</h3>
              <p className="text-sm text-gray-400">Automated invoicing, payment tracking, and financial reporting</p>
            </motion.div>

            {/* Time & Payroll */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Time & Payroll</h3>
              <p className="text-sm text-gray-400">Employee time tracking, payroll processing, and HR management</p>
            </motion.div>

            {/* Vendor Advertising Hub */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Advertising Hub</h3>
              <p className="text-sm text-gray-400">Campaign management, analytics, and ROI tracking for vendors</p>
            </motion.div>

            {/* AI Blueprint Analyzer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Blueprint Analyzer</h3>
              <p className="text-sm text-gray-400">GPT-4 Vision analyzes blueprints, extracts measurements, and generates accurate quotes</p>
            </motion.div>

            {/* Automatic Quote Generation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.9 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Auto Quote Generator</h3>
              <p className="text-sm text-gray-400">Intelligent quote generation from customer requests with labor rates and materials</p>
            </motion.div>

            {/* Vendor API Integration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.0 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-600 to-pink-700 flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Vendor API Hub</h3>
              <p className="text-sm text-gray-400">15+ REST API integrations: Grainger, Home Depot, Lowe's, and more</p>
            </motion.div>

            {/* Subscription Management */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.1 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-600 to-violet-700 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Subscription Plans</h3>
              <p className="text-sm text-gray-400">Multi-tier subscription management with hour tracking and rollover</p>
            </motion.div>

            {/* Referral & Rewards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.2 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Referral Rewards</h3>
              <p className="text-sm text-gray-400">Automated referral tracking, rewards, and customer giveaway campaigns</p>
            </motion.div>

            {/* Video Reels & Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.3 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose-600 to-rose-700 flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Video Reels</h3>
              <p className="text-sm text-gray-400">Featured project reels, auto-rotating carousels, and media showcase</p>
            </motion.div>

            {/* Multi-Tenant SaaS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.4 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 hover:border-orange-500/30 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Tenant SaaS</h3>
              <p className="text-sm text-gray-400">Enterprise-grade cohort management with role-based access control</p>
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => handleNavigate('dashboard')}
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold rounded-xl shadow-lg transition-all inline-flex items-center gap-2"
            >
              Explore Full Platform
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Business Solutions Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-black to-[#1a1a1a] flex justify-center">
        <div className="w-full max-w-7xl">
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                <span style={{ color: primaryColor }}>Business Solutions</span> for Every Professional
              </h2>
              <p className="text-lg md:text-xl text-gray-400 max-w-3xl">
                Powerful platforms designed for trades workers, subcontractors, and vendors
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Trades Worker Portal */}
            <div className="group relative bg-[#0A0A0A] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all duration-300">
              <div className="aspect-video overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop" 
                  alt="Trades Worker Platform"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  style={{ willChange: 'transform' }}
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Hammer className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Trades Workers</h3>
                </div>
                <p className="text-gray-400 mb-6">
                  All-in-one platform for handymen and contractors. Manage clients, schedule jobs, send invoices, and grow your business.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-orange-500" />
                    Smart Scheduling & Invoicing
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-orange-500" />
                    Client Management
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-orange-500" />
                    Professional Branding
                  </li>
                </ul>
                <button
                  onClick={() => handleNavigate('marketing-trades-worker')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold hover:from-orange-500 hover:to-red-500 transition-all duration-300 shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40"
                >
                  Learn More
                  <ArrowRight className="inline-block ml-2 w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vendor Portal */}
            <div className="group relative bg-[#0A0A0A] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-300">
              <div className="aspect-video overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&h=400&fit=crop" 
                  alt="Vendor Advertising Hub"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  style={{ willChange: 'transform' }}
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Vendors</h3>
                </div>
                <p className="text-gray-400 mb-6">
                  Advertising hub for suppliers and vendors. Reach 50,000+ active professionals with targeted marketing.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                    Product Catalog Management
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                    Targeted Advertising
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                    Analytics Dashboard
                  </li>
                </ul>
                <button
                  onClick={() => handleNavigate('marketing-vendor')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all duration-300 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40"
                >
                  Learn More
                  <ArrowRight className="inline-block ml-2 w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subcontractor Portal */}
            <div className="group relative bg-[#0A0A0A] border border-[#2a2a2a] rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300">
              <div className="aspect-video overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&h=400&fit=crop" 
                  alt="Subcontractor Hub"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  style={{ willChange: 'transform' }}
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <HardHat className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Subcontractors</h3>
                </div>
                <p className="text-gray-400 mb-6">
                  Connect with general contractors, bid on quality projects, and manage your entire subcontracting business.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    Bid Management
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    Contractor Network
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                    Project Tracking
                  </li>
                </ul>
                <button
                  onClick={() => handleNavigate('marketing-subcontractor')}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40"
                >
                  Learn More
                  <ArrowRight className="inline-block ml-2 w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 bg-[#1a1a1a] flex justify-center">
        <div className="w-full max-w-7xl">
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Our <span style={{ color: primaryColor }}>Professional Services</span>
              </h2>
              <p className="text-lg md:text-xl text-gray-400 max-w-3xl">
                Power washing, demolition, trash removal, clean outs, home additions, design services, HVAC, landscaping, and much more. Comprehensive solutions for all your construction, renovation, and property needs.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-[#0A0A0A] border border-[#2a2a2a] rounded-xl overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => setSelectedService(service.title)}
                style={{
                  borderColor: selectedService === service.title ? `${primaryColor}50` : ''
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = `${primaryColor}50`}
                onMouseLeave={(e) => {
                  if (selectedService !== service.title) {
                    e.currentTarget.style.borderColor = '#2a2a2a';
                  }
                }}
              >
                <div className="aspect-video overflow-hidden">
                  <img 
                    src={service.image} 
                    alt={service.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    style={{ willChange: 'transform' }}
                  />
                </div>
                <div className="p-6">
                  <div 
                    className="w-14 h-14 rounded-lg flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform"
                    style={{ 
                      background: `linear-gradient(to bottom right, ${primaryColor}, #dc2626)` 
                    }}
                  >
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                  <p className="text-gray-400 text-sm">{service.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <PrimaryButton onClick={() => scrollToSection('contact')} className="text-lg px-8 py-4 h-auto">
              Request a Quote
              <ArrowRight className="w-5 h-5 ml-2" />
            </PrimaryButton>
          </div>
        </div>
      </section>

      {/* Advertising Banner - After Services */}
      <section className="py-8 px-4 bg-[#1a1a1a] flex justify-center">
        <div className="w-full max-w-7xl">
          <AdvertisingBanner placement="landing-after-services" variant="horizontal" />
        </div>
      </section>

      {/* Property Management Services Section */}
      <section id="property-management" className="py-20 px-4 bg-[#0A0A0A] flex justify-center">
        <div className="w-full max-w-7xl">
          <div className="flex flex-col items-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col items-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <Building className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-400">Property Management Specialists</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Professional Services for <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">Property Managers</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl text-center">
                Specialized maintenance solutions for condo associations, landlords, and property management companies
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Condo Associations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 hover:border-emerald-500/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Condo Associations</h3>
              <p className="text-gray-400 mb-6">
                Comprehensive maintenance programs designed specifically for HOAs and condo communities.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Common area maintenance and repairs</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Scheduled preventive maintenance plans</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Board-approved vendor management</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Detailed reporting and documentation</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>24/7 emergency response services</span>
                </li>
              </ul>
              <button
                onClick={() => scrollToSection('contact')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all duration-300"
              >
                Learn More
              </button>
            </motion.div>

            {/* Landlords */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 hover:border-cyan-500/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Key className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Landlord Portal & Services</h3>
              <p className="text-gray-400 mb-6">
                Complete property management solution with advanced portfolio tracking, budget management, and social media marketing tools.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>Portfolio Tracker with ROI analytics</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>Budget Manager with expense tracking</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>Social media marketing for rentals</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>Emergency repair response (24/7)</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>Multi-platform rental advertising</span>
                </li>
              </ul>
              <button
                onClick={() => setShowLandlordDemo(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
              >
                Access Portal
              </button>
            </motion.div>

            {/* Property Management Companies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 hover:border-teal-500/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Property Managers</h3>
              <p className="text-gray-400 mb-6">
                Enterprise solutions for professional property management companies managing multiple properties.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <span>Multi-unit portfolio maintenance</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <span>Preventive maintenance programs</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <span>Vendor coordination and management</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <span>Online portal for tracking and reporting</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <span>Volume pricing and service agreements</span>
                </li>
              </ul>
              <button
                onClick={() => setShowPropertyManagerDemo(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold hover:from-teal-500 hover:to-emerald-500 transition-all duration-300"
              >
                View Demo
              </button>
            </motion.div>
          </div>

          {/* Property Management Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-8 md:p-12"
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-4">Why Property Managers Choose Us</h3>
                <p className="text-gray-400 mb-6">
                  We understand the unique challenges of property management. Our specialized services are designed to minimize vacancy periods, reduce tenant complaints, and maintain property values.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-[#0A0A0A] rounded-xl">
                    <div className="text-3xl font-bold text-emerald-500 mb-1">500+</div>
                    <div className="text-sm text-gray-400">Properties Serviced</div>
                  </div>
                  <div className="text-center p-4 bg-[#0A0A0A] rounded-xl">
                    <div className="text-3xl font-bold text-cyan-500 mb-1">24/7</div>
                    <div className="text-sm text-gray-400">Emergency Service</div>
                  </div>
                  <div className="text-center p-4 bg-[#0A0A0A] rounded-xl">
                    <div className="text-3xl font-bold text-teal-500 mb-1">98%</div>
                    <div className="text-sm text-gray-400">Client Satisfaction</div>
                  </div>
                  <div className="text-center p-4 bg-[#0A0A0A] rounded-xl">
                    <div className="text-3xl font-bold text-emerald-500 mb-1">&lt;4hr</div>
                    <div className="text-sm text-gray-400">Avg Response Time</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Licensed & Insured</h4>
                    <p className="text-sm text-gray-400">Full liability coverage for your protection</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Priority Scheduling</h4>
                    <p className="text-sm text-gray-400">Dedicated service windows for property managers</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-[#0A0A0A] rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-teal-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Volume Discounts</h4>
                    <p className="text-sm text-gray-400">Special pricing for high-volume clients</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Landlord Portal Features Section */}
      <section className="py-20 px-4 bg-[#0F0F0F] flex justify-center">
        <div className="w-full max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <Key className="w-5 h-5 text-cyan-500" />
              <span className="text-sm font-semibold text-cyan-400">Enterprise Landlord Platform</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Advanced Tools for <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Smart Landlords</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl">
              Manage your rental properties with professional-grade tools for portfolio tracking, budget management, and social media marketing
            </p>
          </motion.div>

          {/* Three Main Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Portfolio Tracker */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 hover:border-cyan-500/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Portfolio Tracker</h3>
              <p className="text-gray-400 mb-6">
                Real-time analytics and performance monitoring for your entire property portfolio
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>Portfolio value & equity tracking</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>ROI calculations per property</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>Cash flow analysis & projections</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>Property type distribution charts</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                  <span>Individual property performance metrics</span>
                </li>
              </ul>
            </motion.div>

            {/* Budget Manager */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 hover:border-blue-500/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Budget Manager</h3>
              <p className="text-gray-400 mb-6">
                Comprehensive expense tracking and budget management across all properties
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>10+ budget categories tracked</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Real-time variance analysis</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Budget vs actual comparisons</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Automated savings & overrun alerts</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>Export reports for accounting</span>
                </li>
              </ul>
            </motion.div>

            {/* Social Marketing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 hover:border-purple-500/50 transition-all group"
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Social Marketing</h3>
              <p className="text-gray-400 mb-6">
                Market your rentals professionally across multiple social media platforms
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span>Post to Facebook, Instagram, Twitter, LinkedIn</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span>Track views, inquiries & conversions</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span>Upload photos & videos per property</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span>Automated campaign management</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span>Real-time performance analytics</span>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Portal Access CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 rounded-2xl p-8 md:p-12 flex flex-col items-center"
          >
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Property Management?
            </h3>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl">
              Join hundreds of landlords using our platform to maximize ROI, streamline budgets, and fill vacancies faster
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleNavigate('portal-demo-selector')}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 text-lg"
              >
                Access Portal Views
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="px-8 py-4 rounded-xl bg-[#1a1a1a] border border-cyan-500/30 text-white font-semibold hover:bg-cyan-500/10 transition-all duration-300 text-lg"
              >
                Schedule Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 24/7 On-Call Emergency Portal Section */}
      <section className="py-20 px-4 bg-[#0A0A0A] flex justify-center">
        <div className="w-full max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-semibold text-red-400">24/7 Emergency Response</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              AI-Powered <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">Emergency Dispatch</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl">
              Never miss an emergency call. Our AI instantly assesses severity, identifies the issue, and dispatches the right contractor — automatically
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Left: Key Features */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 hover:border-red-500/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">AI Triage System</h3>
                    <p className="text-gray-400 text-sm mb-3">
                      Advanced AI analyzes every emergency call to determine severity level and required service type
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-red-400" />
                        Instant severity assessment
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-red-400" />
                        Service category identification
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-red-400" />
                        Safety risk detection
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 hover:border-orange-500/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Smart Contractor Routing</h3>
                    <p className="text-gray-400 text-sm mb-3">
                      Automatically matches emergencies with the best available contractor
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-orange-400" />
                        Specialty-based matching
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-orange-400" />
                        Proximity optimization
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-orange-400" />
                        Real-time availability tracking
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: Stats & Benefits */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-2xl p-8">
                <h3 className="text-2xl font-bold text-white mb-6">Emergency Response Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0A0A0A] rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-red-400 mb-1">&lt;12min</div>
                    <div className="text-sm text-gray-400">Avg Response Time</div>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-orange-400 mb-1">24/7</div>
                    <div className="text-sm text-gray-400">Always Available</div>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-1">98%</div>
                    <div className="text-sm text-gray-400">First-Call Resolution</div>
                  </div>
                  <div className="bg-[#0A0A0A] rounded-xl p-4 text-center">
                    <div className="text-3xl font-bold text-green-400 mb-1">50+</div>
                    <div className="text-sm text-gray-400">Certified Contractors</div>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Perfect For</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg">
                    <Building2 className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-white font-medium">Property Management Companies</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg">
                    <Key className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <span className="text-white font-medium">Landlords & Multi-Unit Owners</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg">
                    <Home className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <span className="text-white font-medium">Condo Associations & HOAs</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg">
                    <Building className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-white font-medium">Commercial Property Owners</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 border border-red-500/20 rounded-2xl p-8 md:p-12 flex flex-col items-center"
          >
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Connect Your Properties to 24/7 Emergency Support
            </h3>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl">
              Protect your assets with instant AI-powered emergency response. Setup takes less than 5 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleNavigate('on-call-portal')}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold hover:from-red-500 hover:to-orange-500 transition-all duration-300 text-lg shadow-lg shadow-red-500/20"
              >
                Access Emergency Portal
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="px-8 py-4 rounded-xl bg-[#1a1a1a] border border-red-500/30 text-white font-semibold hover:bg-red-500/10 transition-all duration-300 text-lg"
              >
                Schedule Setup Call
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Why Choose <span style={{ color: primaryColor }}>{companyName}?</span>
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto text-center block">
                We're committed to delivering exceptional craftsmanship and customer service on every project.
              </p>

              <div className="space-y-4">
                {[
                  { 
                    icon: <Shield className="w-6 h-6" />, 
                    text: branding?.license_number ? `Licensed #${branding.license_number}` : 'Fully Licensed & Insured' 
                  },
                  { icon: <Award className="w-6 h-6" />, text: '25+ Years of Experience' },
                  { icon: <Clock className="w-6 h-6" />, text: 'On-Time Project Completion' },
                  { icon: <DollarSign className="w-6 h-6" />, text: 'Competitive Pricing' },
                  { icon: <CheckCircle2 className="w-6 h-6" />, text: 'Quality Guarantee' },
                  { icon: <Users className="w-6 h-6" />, text: 'Professional Team' },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = `${primaryColor}50`}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                  >
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                    >
                      {item.icon}
                    </div>
                    <span className="text-lg">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <img 
                  src="https://images.unsplash.com/photo-1684406401783-b599f9e03d64?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXJwZW50cnklMjB3b29kd29yayUyMGN1c3RvbXxlbnwxfHx8fDE3NzE4NjY0NjR8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Carpentry work"
                  className="rounded-xl border border-[#2a2a2a] h-64 object-cover"
                />
                <img 
                  src="https://images.unsplash.com/photo-1751486403890-793880b12adb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcnl3YWxsJTIwaW5zdGFsbGF0aW9uJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc3MTg2NjQ5M3ww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Drywall work"
                  className="rounded-xl border border-[#2a2a2a] h-64 object-cover mt-8"
                />
              </div>
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0A0A0A] rounded-2xl p-8 shadow-2xl"
                style={{ borderWidth: '4px', borderColor: primaryColor }}
              >
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2" style={{ color: primaryColor }}>100%</div>
                  <div className="text-sm font-semibold">Satisfaction<br />Guaranteed</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Advertising Banner */}
      <section className="py-8 px-4 bg-[#0A0A0A] flex justify-center">
        <div className="w-full max-w-7xl">
          <AdvertisingBanner placement="landing-mid-page" variant="horizontal" />
        </div>
      </section>

      {/* Portfolio Section */}
      <section id="portfolio" className="py-20 px-4 bg-[#1a1a1a] flex justify-center">
        <div className="w-full max-w-7xl">
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Featured <span style={{ color: primaryColor }}>Projects</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl">
                {portfolioProjects.length > 0 
                  ? 'Real projects from our completed work. Every project showcases our commitment to quality and attention to detail.'
                  : 'Take a look at some of our recent work. Every project showcases our commitment to quality and attention to detail.'
                }
              </p>
              {portfolioProjects.length > 0 && (
                <div className="flex items-center gap-2 mt-4 text-sm text-orange-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Automatically sourced from completed work requests</span>
                </div>
              )}
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(portfolioProjects.length > 0 ? portfolioProjects : featuredProjects).map((project, index) => (
              <motion.div
                key={project.id || index}
                initial={isMobile ? false : { opacity: 0, y: 20 }}
                whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
                viewport={isMobile ? undefined : { once: true, margin: "-50px" }}
                transition={isMobile ? undefined : { delay: index * 0.1 }}
                className="bg-[#0A0A0A] border border-[#2a2a2a] rounded-xl overflow-hidden transition-all group"
                onMouseEnter={(e) => e.currentTarget.style.borderColor = `${primaryColor}50`}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    style={{ willChange: 'transform' }}
                  />
                  {project.videoUrl && (
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-xs text-white">
                      <Sparkles className="w-3 h-3" />
                      Video Tour
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="text-sm font-semibold mb-2" style={{ color: primaryColor }}>
                    {project.category}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{project.title}</h3>
                  <p className="text-gray-400 text-sm">{project.description}</p>
                  {project.location && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {project.location}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <SecondaryButton onClick={() => scrollToSection('contact')} className="text-lg px-8 py-4 h-auto">
              View More Projects
              <ArrowRight className="w-5 h-5 ml-2" />
            </SecondaryButton>
          </div>
        </div>
      </section>

      {/* Advertising Banner - After Portfolio */}
      <section className="py-8 px-4 bg-[#0A0A0A] flex justify-center">
        <div className="w-full max-w-7xl">
          <AdvertisingBanner placement="landing-after-portfolio" variant="horizontal" />
        </div>
      </section>

      {/* Video Reels Showcase Section */}
      <VideoReelsShowcase primaryColor={primaryColor} />

      {/* Advertising Banner - After Video Reels */}
      <section className="py-8 px-4 bg-[#0A0A0A] flex justify-center">
        <div className="w-full max-w-7xl">
          <AdvertisingBanner placement="landing-after-reels" variant="horizontal" />
        </div>
      </section>

      {/* Investment Opportunities Section */}
      <section id="invest" className="py-20 px-4 flex justify-center bg-gradient-to-b from-[#0A0A0A] to-[#1A1A1A]">
        <div className="w-full max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Investment <span style={{ color: primaryColor }}>Opportunities</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto text-center">
              Partner with us to build wealth through strategic real estate and company equity investments
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {/* Fix & Flip Syndication */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-orange-600/10 to-red-600/10 border border-orange-500/30 rounded-2xl p-8 hover:border-orange-500/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-orange-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Home className="w-7 h-7 text-orange-400" />
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  88% Funded
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">Fix & Flip Syndication</h3>
              <p className="text-gray-400 mb-6">Pool funds for profitable house flipping projects with proven track record</p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Projected ROI</span>
                  <span className="font-bold text-green-400">35%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Min Investment</span>
                  <span className="font-bold text-white">$50K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Term</span>
                  <span className="font-bold text-white">18 months</span>
                </div>
              </div>

              <div className="pt-4 border-t border-orange-500/20">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-orange-400" />
                  <span>Silent passive investment</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <span>Quick returns in 18 months</span>
                </div>
              </div>
            </motion.div>

            {/* Multi-Family REIT Fund */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 border border-blue-500/30 rounded-2xl p-8 hover:border-blue-500/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-blue-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-7 h-7 text-blue-400" />
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  92% Funded
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">Multi-Family REIT Fund</h3>
              <p className="text-gray-400 mb-6">Diversified portfolio of 50+ rental properties with monthly dividends</p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Projected ROI</span>
                  <span className="font-bold text-green-400">22%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Min Investment</span>
                  <span className="font-bold text-white">$10K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Term</span>
                  <span className="font-bold text-white">Ongoing</span>
                </div>
              </div>

              <div className="pt-4 border-t border-blue-500/20">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>Monthly dividend payments</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Low $10K minimum entry</span>
                </div>
              </div>
            </motion.div>

            {/* Ground-Up Development */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-2xl p-8 hover:border-purple-500/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-purple-600/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building className="w-7 h-7 text-purple-400" />
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  34% Funded
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">Ground-Up Development</h3>
              <p className="text-gray-400 mb-6">New construction of 24-unit luxury apartment building in Denver</p>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Projected ROI</span>
                  <span className="font-bold text-green-400">48%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Min Investment</span>
                  <span className="font-bold text-white">$200K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Term</span>
                  <span className="font-bold text-white">4 years</span>
                </div>
              </div>

              <div className="pt-4 border-t border-purple-500/20">
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <span>Highest return potential</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span>Tax advantages included</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-orange-600/10 via-purple-600/10 to-blue-600/10 border border-orange-500/30 rounded-2xl p-8 text-center"
          >
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Start Building Wealth?</h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto text-center">
              Join our community of investors and gain access to exclusive real estate and company equity opportunities with professional management and transparent reporting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('investment-opportunities');
                  } else {
                    window.location.href = '/investment-opportunities';
                  }
                }}
                className="group relative px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-orange-500/50 transition-all overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  View All Opportunities
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => setShowSignUpModal(true)}
                className="px-8 py-4 bg-[#1A1A1A] border-2 border-orange-500/30 rounded-xl font-semibold text-white hover:border-orange-500/50 transition-all"
              >
                Become an Investor
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-800">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-orange-600/20 flex items-center justify-center mb-3">
                  <Shield className="w-6 h-6 text-orange-400" />
                </div>
                <p className="text-sm font-semibold text-white">Vetted Opportunities</p>
                <p className="text-xs text-gray-500">Professionally managed</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-white">Full Transparency</p>
                <p className="text-xs text-gray-500">Quarterly financial reports</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <p className="text-sm font-semibold text-white">157+ Investors</p>
                <p className="text-xs text-gray-500">Join our community</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 flex justify-center">
        <div className="w-full max-w-7xl">
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                What Our Clients <span style={{ color: primaryColor }}>Say</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl">Real feedback from real customers</p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.borderColor = `${primaryColor}50`}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5" style={{ fill: primaryColor, color: primaryColor }} />
                  ))}
                </div>
                <Quote className="w-10 h-10 mb-4" style={{ color: `${primaryColor}30` }} />
                <p className="text-gray-300 mb-6 leading-relaxed">{testimonial.text}</p>
                <div className="flex items-center gap-3 pt-6 border-t border-[#2a2a2a]">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ 
                      background: `linear-gradient(to bottom right, ${primaryColor}, #dc2626)` 
                    }}
                  >
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-bold">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.location}</div>
                    <div className="text-xs" style={{ color: primaryColor }}>{testimonial.project}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advertising Banner */}
      <section className="py-8 px-4 bg-[#0A0A0A] flex justify-center">
        <div className="w-full max-w-7xl">
          <AdvertisingBanner placement="landing-before-careers" variant="horizontal" />
        </div>
      </section>

      {/* Careers Section - Employment Application */}
      <section id="careers" className="py-20 px-4 bg-[#1a1a1a] flex justify-center">
        <div className="w-full max-w-7xl">
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 border rounded-full mb-6"
                style={{ 
                  backgroundColor: `${primaryColor}20`,
                  borderColor: `${primaryColor}30`
                }}
              >
                <Briefcase className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="font-medium text-sm" style={{ color: primaryColor }}>We're Hiring!</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Join Our <span style={{ color: primaryColor }}>Team</span>
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl">
                We're always looking for skilled tradespeople to join our growing team. Competitive pay, flexible schedules, and quality projects.
              </p>
            </motion.div>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {[
              {
                icon: <DollarSign className="w-8 h-8" />,
                title: 'Competitive Pay',
                description: 'Top industry rates',
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: 'Flexible Hours',
                description: 'Work-life balance',
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: 'Career Growth',
                description: 'Advancement opportunities',
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: 'Benefits Package',
                description: 'Health & insurance',
              },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#0A0A0A] border border-[#2a2a2a] rounded-xl p-6 text-center"
              >
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 text-white"
                  style={{ 
                    background: `linear-gradient(to bottom right, ${primaryColor}, #dc2626)` 
                  }}
                >
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{benefit.title}</h3>
                <p className="text-gray-400 text-sm">{benefit.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Application Form Toggle */}
          {!showApplicationForm ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div 
                className="rounded-2xl p-12 border flex flex-col items-center"
                style={{ 
                  backgroundColor: `${primaryColor}20`,
                  borderColor: `${primaryColor}30`
                }}
              >
                <HardHat className="w-16 h-16 mb-6" style={{ color: primaryColor }} />
                <h3 className="text-3xl font-bold mb-4">Ready to Apply?</h3>
                <p className="text-gray-400 mb-8 max-w-2xl">
                  Fill out our employment application and showcase your skills, experience, and past work. We'll review your application and get back to you within 48 hours.
                </p>
                <PrimaryButton
                  onClick={() => setShowApplicationForm(true)}
                  className="text-lg px-10 py-4 h-auto"
                >
                  <Briefcase className="w-5 h-5 mr-2" />
                  Start Application
                </PrimaryButton>
                
                {/* Admin Quick Access */}
                <div className="mt-8 pt-8 border-t border-[#2A2A2A]">
                  <p className="text-sm text-gray-500 mb-4 text-center">Admin Quick Access</p>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => {
                        window.location.href = '/application-form-editor';
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm hover:border-[#ea580c] transition"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Edit Form</span>
                    </button>
                    <button
                      onClick={() => {
                        window.location.href = '/application-submissions';
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white text-sm hover:border-[#ea580c] transition"
                    >
                      <FileText className="w-4 h-4" />
                      <span>View Submissions</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GenericApplicationForm 
                config={applicationConfig || {
                  title: "Maintenance & Carpentry Application",
                  description: "Join our team of skilled maintenance professionals",
                  color: primaryColor,
                  apiEndpoint: "/applications/submit",
                  steps: [
                    {
                      title: "Personal Information",
                      description: "Tell us about yourself",
                      icon: User,
                      fields: [
                        { id: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'John Smith' },
                        { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'john@example.com' },
                        { id: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '(603) 555-0123' },
                        { id: 'address', label: 'Street Address', type: 'text', required: true, placeholder: '123 Main Street' },
                        { id: 'city', label: 'City', type: 'text', required: true, placeholder: 'Nashua' },
                        { id: 'state', label: 'State', type: 'text', required: true, placeholder: 'NH' },
                        { id: 'zip', label: 'ZIP Code', type: 'text', required: true, placeholder: '03060' },
                      ]
                    },
                    {
                      title: "Maintenance Skills & Experience",
                      description: "Select skills you have and describe your experience level",
                      icon: Wrench,
                      fields: [
                        {
                          id: 'maintenance_skills',
                          label: 'Maintenance Man Skills',
                          type: 'skill',
                          required: false,
                          skills: [
                            { id: 'roofing_maintenance', label: 'Roofing Maintenance', description: 'Inspect and repair roof leaks, replace shingles, clean gutters' },
                            { id: 'plumbing_repairs', label: 'Plumbing Repairs', description: 'Fix leaks, unclog drains, repair or replace faucets and pipes' },
                            { id: 'electrical_maintenance', label: 'Electrical Maintenance', description: 'Replace light bulbs, repair wiring, install fixtures' },
                            { id: 'hvac_maintenance', label: 'HVAC Maintenance', description: 'Clean and service heating, ventilation, and air conditioning systems' },
                            { id: 'pool_maintenance', label: 'Pool Maintenance', description: 'Clean pool filters, check chemical levels, repair pumps and heaters' },
                            { id: 'groundskeeping', label: 'Groundskeeping', description: 'Lawn mowing, snow removal, landscaping, trimming bushes' },
                            { id: 'painting_walls', label: 'Painting and Wall Repairs', description: 'Patch holes, repaint walls, touch up surfaces' },
                            { id: 'carpentry_repairs', label: 'Carpentry Repairs', description: 'Fix doors, windows, cabinets, and furniture' },
                            { id: 'general_cleaning', label: 'General Cleaning', description: 'Maintain cleanliness in common areas, remove debris' },
                            { id: 'equipment_maintenance', label: 'Equipment Maintenance', description: 'Service machinery and tools used in the facility' },
                            { id: 'safety_checks', label: 'Safety Checks', description: 'Inspect fire extinguishers, alarms, emergency exits' },
                          ]
                        }
                      ]
                    },
                    {
                      title: "Carpentry Skills & Experience",
                      description: "Select carpentry skills and describe your experience level",
                      icon: Hammer,
                      fields: [
                        {
                          id: 'carpentry_skills',
                          label: 'Carpenter Skills',
                          type: 'skill',
                          required: false,
                          skills: [
                            { id: 'framing', label: 'Framing', description: 'Build structural frames for walls, floors, and roofs' },
                            { id: 'roofing', label: 'Roofing', description: 'Install roof trusses, sheathing, and sometimes shingles' },
                            { id: 'door_window', label: 'Door and Window Installation', description: 'Measure, order, fit and hang doors and windows' },
                            { id: 'cabinetry', label: 'Cabinetry', description: 'Build and install cabinets, shelves, and countertops' },
                            { id: 'finish_carpentry', label: 'Finish Carpentry', description: 'Install baseboards, moldings, trim, and decorative woodwork' },
                            { id: 'deck_building', label: 'Deck Building', description: 'Construct outdoor decks, patios, and porches' },
                            { id: 'furniture', label: 'Furniture Making and Repair', description: 'Build or fix wooden furniture' },
                            { id: 'formwork', label: 'Formwork for Concrete', description: 'Build wooden molds for concrete pouring' },
                            { id: 'flooring', label: 'Flooring Installation', description: 'Lay hardwood floors, subfloors, or laminate' },
                            { id: 'restoration', label: 'Restoration Work', description: 'Repair or restore old wooden structures or features' },
                          ]
                        }
                      ]
                    },
                    {
                      title: "Work Portfolio",
                      description: "Drag and drop photos to showcase your work",
                      icon: Camera,
                      fields: [
                        { id: 'portfolio_photos', label: 'Upload Photos of Your Work (Drag & Drop or Click to Browse)', type: 'file', accept: 'image/*', multiple: true, dragDrop: true },
                        { id: 'portfolio_description', label: 'Describe Your Work Portfolio', type: 'textarea', placeholder: 'Tell us about the photos you uploaded. What projects do they represent? What was your role? What challenges did you overcome?', rows: 6, required: true },
                        { id: 'years_experience', label: 'Total Years of Experience', type: 'number', required: true, placeholder: '5' },
                        { id: 'best_project', label: 'What is your proudest project and why?', type: 'textarea', required: true, placeholder: 'Describe your most impressive or challenging completed project', rows: 5 },
                      ]
                    },
                    {
                      title: "Availability & References",
                      description: "Your schedule and professional references",
                      icon: Clipboard,
                      fields: [
                        { id: 'availability', label: 'Availability', type: 'select', required: true, options: ['', 'Full-time (40+ hours/week)', 'Part-time (20-30 hours/week)', 'Weekends Only', 'Flexible/As Needed'] },
                        { id: 'start_date', label: 'Earliest Start Date', type: 'text', required: true, placeholder: 'MM/DD/YYYY' },
                        { id: 'transportation', label: 'Reliable Transportation', type: 'select', required: true, options: ['', 'Yes - Own Vehicle', 'Yes - Public Transit', 'Need Assistance'] },
                        { id: 'reference_1_name', label: 'Reference 1 - Name', type: 'text', required: true, placeholder: 'Full Name' },
                        { id: 'reference_1_phone', label: 'Reference 1 - Phone', type: 'tel', required: true, placeholder: '(603) 555-0123' },
                        { id: 'reference_2_name', label: 'Reference 2 - Name', type: 'text', required: true, placeholder: 'Full Name' },
                        { id: 'reference_2_phone', label: 'Reference 2 - Phone', type: 'tel', required: true, placeholder: '(603) 555-0123' },
                        { id: 'why_join', label: 'Why do you want to join our team?', type: 'textarea', required: true, placeholder: 'Tell us what motivates you', rows: 5 },
                      ]
                    }
                  ]
                }}
                onNavigate={onNavigate}
              />
            </motion.div>
          )}
        </div>
      </section>

      {/* Territory Licensing Section - Become a Territory Admin */}
      <section className="py-24 px-4 bg-gradient-to-br from-red-950/30 via-[#0A0A0A] to-orange-950/20 border-t border-red-900/20 flex justify-center">
        <div className="w-full max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/30 rounded-full px-6 py-2 mb-6">
              <Shield className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-semibold text-sm uppercase tracking-wide">Exclusive Opportunity</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Become a <span className="text-red-500">Territory Administrator</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-4">
              Own and operate your exclusive 40-mile territory franchise
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Build a profitable business by recruiting vendors, advertisers, and subcontractors in your protected territory
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Investment */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-red-900/30 rounded-2xl p-8 text-center"
            >
              <DollarSign className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Investment</h3>
              <div className="mb-4">
                <p className="text-4xl font-bold text-red-500">$15,000</p>
                <p className="text-sm text-gray-400">One-time license fee</p>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-2xl font-bold text-white">$499<span className="text-lg text-gray-400">/mo</span></p>
                <p className="text-sm text-gray-400">Monthly license fee</p>
              </div>
            </motion.div>

            {/* Territory */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-orange-900/30 rounded-2xl p-8 text-center"
            >
              <MapPin className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Your Territory</h3>
              <div className="mb-4">
                <p className="text-4xl font-bold text-orange-500">40 Miles</p>
                <p className="text-sm text-gray-400">Exclusive radius</p>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-sm text-gray-300">Protected territory</p>
                <p className="text-xs text-gray-500">No competing admins</p>
              </div>
            </motion.div>

            {/* Revenue Potential */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-green-900/30 rounded-2xl p-8 text-center"
            >
              <TrendingUp className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Revenue Share</h3>
              <div className="mb-4">
                <p className="text-4xl font-bold text-green-500">90%</p>
                <p className="text-sm text-gray-400">Of subscription fees</p>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-sm text-gray-300">50 vendors × $149/mo</p>
                <p className="text-xs text-green-400 font-semibold">= $6,705/mo potential</p>
              </div>
            </motion.div>
          </div>

          {/* Benefits Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-8 mb-12"
          >
            <h3 className="text-2xl font-bold text-white mb-8 text-center">What You Get</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Platform Access</p>
                  <p className="text-sm text-gray-400">Full admin dashboard & tools</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Marketing Materials</p>
                  <p className="text-sm text-gray-400">Templates & branding assets</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Training & Support</p>
                  <p className="text-sm text-gray-400">Onboarding & ongoing help</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Revenue Analytics</p>
                  <p className="text-sm text-gray-400">Real-time performance tracking</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Recruitment Tools</p>
                  <p className="text-sm text-gray-400">Vendor & advertiser signup flows</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Payment Processing</p>
                  <p className="text-sm text-gray-400">Automated billing & payouts</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Territory Protection</p>
                  <p className="text-sm text-gray-400">Exclusive geographic rights</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Platform Updates</p>
                  <p className="text-sm text-gray-400">New features included free</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Call to Action */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <button
              onClick={() => handleNavigate('territory-application')}
              className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-xl font-bold rounded-xl transition-all shadow-2xl shadow-red-600/40 hover:shadow-red-600/60 hover:scale-105 border border-red-500/50"
            >
              <Shield className="w-7 h-7" />
              Apply for Territory License
              <ArrowRight className="w-7 h-7" />
            </button>
            <p className="text-gray-400 mt-6 text-sm">
              Limited territories available • First come, first served • 2-3 business day review
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact / CTA Section */}
      <section id="contact" className="py-20 px-4 flex justify-center" style={{ background: `linear-gradient(to bottom right, ${primaryColor}20, #0A0A0A, #0A0A0A)` }}>
        <div className="w-full max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to Start <span style={{ color: primaryColor }}>Your Project?</span>
              </h2>
              <p className="text-xl text-gray-400 mb-8">
                Get in touch today for a free consultation and estimate. We're here to bring your vision to life.
              </p>

              <div className="space-y-6">
                <a 
                  href={`tel:${companyPhone.replace(/\D/g, '')}`}
                  className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 transition-colors group"
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = `${primaryColor}50`}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    <Phone className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Call Us</div>
                    <div className="text-2xl font-bold">{companyPhone}</div>
                  </div>
                </a>

                <a 
                  href={`mailto:${companyEmail}`}
                  className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 transition-colors group"
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = `${primaryColor}50`}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    <Mail className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Email Us</div>
                    <div className="text-xl font-bold">{companyEmail}</div>
                  </div>
                </a>

                <div className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    <MapPin className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Service Areas</div>
                    <div className="text-xl font-bold">{fullAddress}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Business Hours</div>
                    <div className="font-bold">Mon-Fri: 7am-6pm</div>
                    <div className="font-bold">Sat: 8am-4pm</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8"
            >
              <h3 className="text-2xl font-bold mb-6">Request a Free Quote</h3>
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg focus:outline-none transition-colors"
                    placeholder="John Smith"
                    style={{ 
                      ':focus': { borderColor: primaryColor } 
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg focus:outline-none transition-colors"
                      placeholder="(555) 123-4567"
                      onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg focus:outline-none transition-colors"
                      placeholder="john@example.com"
                      onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Service Needed</label>
                  <select 
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg focus:outline-none transition-colors"
                    onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                  >
                    <option>Select a service...</option>
                    <option>Kitchen Remodeling</option>
                    <option>Bathroom Renovation</option>
                    <option>Painting & Finishing</option>
                    <option>Flooring Installation</option>
                    <option>Electrical Services</option>
                    <option>Plumbing Services</option>
                    <option>General Carpentry</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Project Details</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2a2a2a] rounded-lg focus:outline-none transition-colors resize-none"
                    placeholder="Tell us about your project..."
                    onFocus={(e) => e.currentTarget.style.borderColor = primaryColor}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#2a2a2a'}
                  />
                </div>
                <PrimaryButton className="w-full text-lg py-4 h-auto">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Get Free Estimate
                </PrimaryButton>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Advertising Banner - Before Footer */}
      <section className="py-8 px-4 bg-[#0A0A0A] flex justify-center">
        <div className="w-full max-w-7xl">
          <AdvertisingBanner placement="landing-before-footer" variant="horizontal" />
        </div>
      </section>

      {/* Advertising Marquee - Before Footer */}
      <AdvertisingMarquee placement="landing-footer" dismissible />

      {/* Footer */}
      <footer className="bg-[#0A0A0A] border-t border-[#2a2a2a] py-12 px-4 flex justify-center">
        <div className="w-full max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={companyName} className="h-10 w-auto" />
                ) : (
                  <>
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ 
                        background: `linear-gradient(to bottom right, ${primaryColor}, #dc2626)` 
                      }}
                    >
                      <HardHat className="w-6 h-6 text-white" />
                    </div>
                    <span 
                      className="text-lg font-bold bg-clip-text text-transparent"
                      style={{ 
                        backgroundImage: `linear-gradient(to right, ${primaryColor}, #f97316)` 
                      }}
                    >
                      {companyName}
                    </span>
                  </>
                )}
              </div>
              <p className="text-gray-400 text-sm">
                {companyTagline}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#services" className="hover:text-[#ea580c] transition-colors">Kitchen Remodeling</a></li>
                <li><a href="#services" className="hover:text-[#ea580c] transition-colors">Bathroom Renovation</a></li>
                <li><a href="#services" className="hover:text-[#ea580c] transition-colors">Painting Services</a></li>
                <li><a href="#services" className="hover:text-[#ea580c] transition-colors">Flooring Installation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => scrollToSection('services')} className="hover:text-[#ea580c] transition-colors">About Us</button></li>
                <li><button onClick={() => scrollToSection('portfolio')} className="hover:text-[#ea580c] transition-colors">Portfolio</button></li>
                <li><button onClick={() => scrollToSection('testimonials')} className="hover:text-[#ea580c] transition-colors">Reviews</button></li>
                <li><button onClick={() => scrollToSection('careers')} className="hover:text-[#ea580c] transition-colors">Careers</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href={`tel:${companyPhone.replace(/\D/g, '')}`} className="hover:text-[#ea580c] transition-colors">{companyPhone}</a></li>
                <li><a href={`mailto:${companyEmail}`} className="hover:text-[#ea580c] transition-colors">{companyEmail}</a></li>
                <li className="text-gray-400">{companyAddress}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#2a2a2a] pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 {companyName}. All rights reserved. {branding?.license_number && `License #${branding.license_number}`} Licensed & Insured.</p>
          </div>
        </div>
      </footer>

      {/* Demo Modals */}
      <AnimatePresence>
        {showPropertyManagerDemo && (
          <PropertyManagerDemo
            onClose={() => setShowPropertyManagerDemo(false)}
            onAccessPortal={() => handleNavigate('portal-demo-selector')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLandlordDemo && (
          <LandlordPortalDemo
            onClose={() => setShowLandlordDemo(false)}
            onAccessPortal={() => handleNavigate('portal-demo-selector')}
          />
        )}
      </AnimatePresence>

      {/* Sign Up Options Modal */}
      <SignUpOptionsModal 
        isOpen={showSignUpModal} 
        onClose={() => setShowSignUpModal(false)} 
      />
    </div>
  );
}
