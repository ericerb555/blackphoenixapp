import { useState, useEffect } from 'react';
import {
  Save,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  Sparkles,
  Copy,
  ArrowUp,
  ArrowDown,
  Settings,
  Image as ImageIcon,
  Type,
  Layout,
  FileJson,
  Download,
  Upload,
  RefreshCw,
  Wand2,
  Code,
  AlertCircle,
  CheckCircle2,
  Zap,
  Building2,
  Palette,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Briefcase,
  X,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { motion, AnimatePresence } from 'motion/react';
import PortfolioProjectManager from '../components/PortfolioProjectManager';
import ApplicationFormEditor from '../components/ApplicationFormEditor';
import MediaLibraryManager from '../components/MediaLibraryManager';
import DirectorySectionsEditor from '../components/DirectorySectionsEditor';
import PartnerLogoManager from '../components/PartnerLogoManager';
import { BrandingService } from '../lib/services/brandingService';

interface Section {
  id: string;
  type: 'hero' | 'services' | 'features' | 'testimonials' | 'cta' | 'custom';
  title: string;
  content: any;
  visible: boolean;
  order: number;
}

interface BrandingInfo {
  companyName: string;
  companyTagline: string;
  logoUrl: string;
  logoPrimary?: string;
  logoSecondary?: string;
  logoIcon?: string;
  logoSquare?: string;
  logoHorizontal?: string;
  logoVertical?: string;
  logoWhite?: string;
  logoBlack?: string;
  primaryColor: string;
  secondaryColor?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface AIAssistRequest {
  action: 'generate_section' | 'improve_content' | 'generate_services' | 'generate_testimonial';
  context?: string;
  sectionType?: string;
}

export default function LandingPageEditor() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [branding, setBranding] = useState<BrandingInfo>({
    companyName: 'Elite Construction',
    companyTagline: 'Professional Handyman Services',
    logoUrl: '',
    primaryColor: '#ea580c',
    phone: '(555) 123-4567',
    email: 'info@eliteconstruction.com',
    address: '123 Main Street',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701'
  });
  const [showBrandingEditor, setShowBrandingEditor] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'sections' | 'portfolio' | 'application' | 'directory' | 'partners'>('sections');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaLibraryCallback, setMediaLibraryCallback] = useState<((url: string) => void) | null>(null);
  const [selectedLandingPage, setSelectedLandingPage] = useState<string>('directory');

  // Available landing pages
  const landingPages = [
    { id: 'directory', name: 'Directory Landing Page', route: '/directory-landing-page' },
    { id: 'marketing-hub', name: 'Marketing Hub Landing', route: '/marketing-hub-landing-page' },
    { id: 'builds', name: 'Builds Landing Page', route: '/builds-landing-page' },
    { id: 'handyman', name: 'Handyman Landing Page', route: '/handyman-landing-page' },
    { id: 'property', name: 'Property Management Landing', route: '/property-management-landing-page' },
    { id: 'contractor', name: 'Contractor Network Landing', route: '/contractor-network-landing-page' },
    { id: 'territory', name: 'Territory Landing Page', route: '/territory-landing-page' },
    { id: 'emergency', name: 'Emergency Services Landing', route: '/emergency-services-landing-page' },
  ];

  // Load existing landing page content and branding
  useEffect(() => {
    loadContent();
    loadBranding();
  }, []);

  // Reload content when selected landing page changes
  useEffect(() => {
    loadContent();
  }, [selectedLandingPage]);

  // Auto-save sections whenever they change (with debounce)
  useEffect(() => {
    if (sections.length === 0) return; // Skip on initial load

    const autoSaveTimer = setTimeout(() => {
      console.log('💾 AUTO-SAVE: Saving sections to localStorage...');

      // Save to page-specific storage keys
      const storageKey = `landingPage_${selectedLandingPage}_sections`;
      const contentKey = `landingPage_${selectedLandingPage}_content`;

      localStorage.setItem(storageKey, JSON.stringify(sections));

      const landingPageContent = {
        hero: sections.find(s => s.type === 'hero')?.content || {},
        sections: sections,
        contact: {
          phone: branding.phone,
          email: branding.email,
          address: `${branding.city}, ${branding.state} ${branding.zipCode}`
        }
      };
      localStorage.setItem(contentKey, JSON.stringify(landingPageContent));

      // Also save to generic keys for backward compatibility
      localStorage.setItem('landingPageSections', JSON.stringify(sections));
      localStorage.setItem('landingPageContent', JSON.stringify(landingPageContent));

      // Also auto-save branding
      saveBranding();

      console.log(`✅ AUTO-SAVE: All changes saved automatically to ${storageKey}!`);
    }, 1500); // Auto-save 1.5 seconds after changes stop

    return () => clearTimeout(autoSaveTimer);
  }, [sections, branding, selectedLandingPage]);

  const loadBranding = async () => {
    console.log('🔄 Loading branding data from BrandingService...');

    const { data: profile } = await BrandingService.getBrandingProfile();

    if (profile) {
      console.log('📦 Loaded branding profile:', profile);

      // Load logo variants from localStorage (where BrandingService caches them)
      const logoVariantsStr = localStorage.getItem('company_logo_variants');
      const logoVariants = logoVariantsStr ? JSON.parse(logoVariantsStr) : {};
      console.log('📦 Loaded logo variants:', logoVariants);

      setBranding({
        companyName: profile.company_name || 'Your Company',
        companyTagline: profile.company_tagline || 'Professional Services',
        logoUrl: profile.logo_url || '',
        logoPrimary: logoVariants.logo_primary || profile.logo_url || '',
        logoSecondary: logoVariants.logo_secondary || '',
        logoIcon: logoVariants.logo_icon || '',
        logoSquare: logoVariants.logo_square || '',
        logoHorizontal: logoVariants.logo_horizontal || '',
        logoVertical: logoVariants.logo_vertical || '',
        logoWhite: logoVariants.logo_white || '',
        logoBlack: logoVariants.logo_black || '',
        primaryColor: profile.primary_color || '#ea580c',
        secondaryColor: profile.secondary_color || '#dc2626',
        phone: profile.phone || '',
        email: profile.email || '',
        address: profile.address_line1 || '',
        city: profile.city || '',
        state: profile.state || '',
        zipCode: profile.zip_code || ''
      });
      console.log('✅ Branding data loaded from unified profile!');
      console.log('✅ Logo variants loaded:', {
        primary: logoVariants.logo_primary ? 'YES' : 'NO',
        secondary: logoVariants.logo_secondary ? 'YES' : 'NO',
        icon: logoVariants.logo_icon ? 'YES' : 'NO',
        horizontal: logoVariants.logo_horizontal ? 'YES' : 'NO',
      });
    } else {
      console.log('⚠️ No branding profile found - using defaults');
      setBranding({
        companyName: 'Your Company',
        companyTagline: 'Professional Services',
        logoUrl: '',
        primaryColor: '#ea580c',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: ''
      });
    }
  };

  const loadContent = () => {
    // Load content specific to the selected landing page
    const storageKey = `landingPage_${selectedLandingPage}_sections`;
    const stored = localStorage.getItem(storageKey);

    console.log(`📥 Loading content for: ${selectedLandingPage} from key: ${storageKey}`);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSections(parsed);
        console.log(`✅ Loaded ${parsed.length} sections for ${selectedLandingPage}`);
      } catch (error) {
        console.error('Error parsing stored sections:', error);
        loadDefaultContentForPage(selectedLandingPage);
      }
    } else {
      console.log(`⚠️ No saved content found for ${selectedLandingPage}, loading defaults`);

      // Load page-specific defaults based on selected page
      loadDefaultContentForPage(selectedLandingPage);
    }
  };

  const loadDefaultContentForPage = (pageId: string) => {
    // Provide page-specific default content
    let heroContent = {
      headline: 'Elite Construction',
      subheadline: 'Professional Services',
      description: 'Expert solutions for all your needs',
      ctaText: 'Get Started',
      backgroundImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd'
    };

    // Customize hero content based on page type
    switch (pageId) {
      case 'directory':
        heroContent = {
          headline: 'Welcome to Our Directory',
          subheadline: 'Find Everything You Need',
          description: 'Browse our comprehensive directory of services and solutions',
          ctaText: 'Explore Directory',
          backgroundImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c'
        };
        break;
      case 'marketing-hub':
        heroContent = {
          headline: 'Marketing Hub',
          subheadline: 'Grow Your Business',
          description: 'Powerful marketing tools and strategies to reach your audience',
          ctaText: 'Start Marketing',
          backgroundImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f'
        };
        break;
      case 'builds':
        heroContent = {
          headline: 'Construction & Builds',
          subheadline: 'Quality Construction Services',
          description: 'Professional construction and building services for your project',
          ctaText: 'Get Free Quote',
          backgroundImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5'
        };
        break;
      case 'handyman':
        heroContent = {
          headline: 'Professional Handyman Services',
          subheadline: 'Expert Repairs & Maintenance',
          description: 'Fast, reliable handyman services for all your home improvement needs',
          ctaText: 'Book Service',
          backgroundImage: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd'
        };
        break;
      case 'property':
        heroContent = {
          headline: 'Property Management',
          subheadline: 'Professional Property Solutions',
          description: 'Complete property management services for landlords and investors',
          ctaText: 'Learn More',
          backgroundImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa'
        };
        break;
      case 'contractor':
        heroContent = {
          headline: 'Contractor Network',
          subheadline: 'Connect with Top Contractors',
          description: 'Join our network of licensed and insured professional contractors',
          ctaText: 'Join Network',
          backgroundImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952'
        };
        break;
      case 'territory':
        heroContent = {
          headline: 'Territory Coverage',
          subheadline: 'Serving Your Area',
          description: 'Comprehensive coverage across all service territories',
          ctaText: 'Find Your Area',
          backgroundImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b'
        };
        break;
      case 'emergency':
        heroContent = {
          headline: '24/7 Emergency Services',
          subheadline: 'Rapid Response Team',
          description: 'Immediate assistance when you need it most - available around the clock',
          ctaText: 'Call Now',
          backgroundImage: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a'
        };
        break;
    }

    // Initialize with ALL landing page sections so every section can be edited
    setSections([
      {
        id: 'hero-1',
        type: 'hero',
        title: 'Hero Section',
        visible: true,
        order: 0,
        content: heroContent
      },
        {
          id: 'services-1',
          type: 'services',
          title: 'Our Services',
          visible: true,
          order: 1,
          content: {
            heading: 'What We Offer',
            description: 'Professional services for all your needs',
            backgroundImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
            services: [
              { 
                title: 'General Carpentry', 
                description: 'Custom woodwork, framing, trim installation',
                icon: 'Hammer',
                image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c'
              },
              { 
                title: 'Kitchen Remodeling', 
                description: 'Complete kitchen renovations and upgrades',
                icon: 'Home',
                image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba'
              },
              { 
                title: 'Bathroom Renovation', 
                description: 'Modern bathroom design and installation',
                icon: 'Droplets',
                image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14'
              },
              { 
                title: 'Electrical Work', 
                description: 'Licensed electrical installations and repairs',
                icon: 'Zap',
                image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a'
              },
              { 
                title: 'Plumbing Services', 
                description: 'Professional plumbing installations and repairs',
                icon: 'Wrench',
                image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39'
              },
              { 
                title: 'Painting & Finishing', 
                description: 'Interior and exterior painting services',
                icon: 'PaintBucket',
                image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f'
              }
            ]
          }
        },
        {
          id: 'features-1',
          type: 'features',
          title: 'Why Choose Us',
          visible: true,
          order: 2,
          content: {
            heading: 'Why Choose Us',
            description: 'What makes us different from the competition',
            backgroundImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa',
            features: [
              {
                title: 'Licensed & Insured',
                description: 'Fully licensed, bonded, and insured for your protection',
                icon: 'Shield',
                image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85'
              },
              {
                title: '24/7 Support',
                description: 'Around-the-clock customer service and emergency response',
                icon: 'Clock',
                image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d'
              },
              {
                title: 'Quality Guaranteed',
                description: 'We stand behind our work with comprehensive warranties',
                icon: 'Award',
                image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7'
              },
              {
                title: 'Expert Team',
                description: 'Skilled professionals with years of experience',
                icon: 'Users',
                image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216'
              }
            ]
          }
        },
        {
          id: 'portfolio-1',
          type: 'custom',
          title: 'Portfolio Gallery',
          visible: true,
          order: 3,
          content: {
            heading: 'Our Recent Work',
            description: 'See what we\'ve built for our satisfied clients',
            backgroundImage: '',
            images: [
              'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
              'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3',
              'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c',
              'https://images.unsplash.com/photo-1600573472550-8090b5e0745e',
              'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0',
              'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099'
            ]
          }
        },
        {
          id: 'testimonials-1',
          type: 'testimonials',
          title: 'Client Testimonials',
          visible: true,
          order: 4,
          content: {
            heading: 'What Our Clients Say',
            description: 'Real reviews from real customers',
            backgroundImage: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf',
            testimonials: [
              {
                name: 'John Smith',
                rating: 5,
                text: 'Outstanding work! They transformed our kitchen beyond our expectations.',
                location: 'Austin, TX',
                image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'
              },
              {
                name: 'Sarah Johnson',
                rating: 5,
                text: 'Professional, timely, and excellent craftsmanship. Highly recommend!',
                location: 'Dallas, TX',
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'
              },
              {
                name: 'Mike Williams',
                rating: 5,
                text: 'The team was fantastic from start to finish. Our bathroom looks amazing!',
                location: 'Houston, TX',
                image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e'
              }
            ]
          }
        },
        {
          id: 'cta-1',
          type: 'cta',
          title: 'Call to Action',
          visible: true,
          order: 5,
          content: {
            heading: 'Ready to Get Started?',
            description: 'Contact us today for a free consultation and quote',
            buttonText: 'Request Free Quote',
            backgroundImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5'
          }
        }
      ]);
  };

  const saveBranding = async () => {
    console.log('💾 Saving branding data to unified profile...', branding);

    try {
      // CRITICAL: Save logo variants to localStorage FIRST
      // BrandingService.convertBrandingProfileToCompany reads from here
      const logoVariants = {
        logo_primary: branding.logoPrimary || branding.logoUrl || '',
        logo_secondary: branding.logoSecondary || '',
        logo_icon: branding.logoIcon || '',
        logo_square: branding.logoSquare || '',
        logo_horizontal: branding.logoHorizontal || '',
        logo_vertical: branding.logoVertical || '',
        logo_white: branding.logoWhite || '',
        logo_black: branding.logoBlack || '',
      };
      localStorage.setItem('company_logo_variants', JSON.stringify(logoVariants));
      console.log('✅ Logo variants saved to localStorage:', logoVariants);

      // Get existing profile or create new one
      const { data: existingProfile } = await BrandingService.getBrandingProfile();

      const updatedProfile = {
        ...(existingProfile || {}),
        company_name: branding.companyName,
        company_legal_name: branding.companyName,
        company_tagline: branding.companyTagline,
        logo_url: branding.logoUrl || branding.logoPrimary,
        primary_color: branding.primaryColor,
        secondary_color: branding.secondaryColor || '#dc2626',
        accent_color: existingProfile?.accent_color || branding.primaryColor,
        phone: branding.phone,
        email: branding.email,
        address_line1: branding.address,
        city: branding.city,
        state: branding.state,
        zip_code: branding.zipCode,
        country: 'United States',
        website: existingProfile?.website || '',
        tax_id: existingProfile?.tax_id || '',
        tax_label: existingProfile?.tax_label || 'Tax ID',
        payment_terms: existingProfile?.payment_terms || 'Net 30',
      };

      await BrandingService.updateBrandingProfile(updatedProfile);
      console.log('✅ Branding saved to unified profile!');
      console.log('✅ All logo variants saved to database!');
      toast.success('Branding and logos saved successfully!');
    } catch (error) {
      console.error('❌ Error saving branding:', error);
      toast.error('Failed to save branding');
    }
  };

  const saveContent = async () => {
    const pageName = landingPages.find(p => p.id === selectedLandingPage)?.name || selectedLandingPage;
    console.log(`🚨🚨🚨 ===== SAVE ${pageName.toUpperCase()} ===== 🚨🚨🚨`);
    console.log('📊 Current sections:', sections);
    console.log('📊 Current branding:', branding);

    setSaving(true);
    try {
      // Save sections to page-specific storage
      const storageKey = `landingPage_${selectedLandingPage}_sections`;
      const contentKey = `landingPage_${selectedLandingPage}_content`;

      localStorage.setItem(storageKey, JSON.stringify(sections));
      console.log(`✅ Sections saved to ${storageKey}`);

      // Also save to the format the landing page expects
      const landingPageContent = {
        hero: sections.find(s => s.type === 'hero')?.content || {},
        sections: sections,
        contact: {
          phone: branding.phone,
          email: branding.email,
          address: `${branding.city}, ${branding.state} ${branding.zipCode}`
        },
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(contentKey, JSON.stringify(landingPageContent));
      console.log(`✅ Landing page content saved to ${contentKey}`);

      // Also save to legacy keys for backward compatibility if it's the directory page
      if (selectedLandingPage === 'directory') {
        localStorage.setItem('landingPageSections', JSON.stringify(sections));
        localStorage.setItem('landingPageContent', JSON.stringify(landingPageContent));
      }

      // Save branding (shared across all pages)
      await saveBranding();

      // Verify the save immediately
      const verifySections = localStorage.getItem(storageKey);
      const verifyContent = localStorage.getItem(contentKey);
      const verifyBranding = localStorage.getItem('company_branding_profile');

      console.log('🔍 VERIFICATION - Data read back from localStorage:', {
        sections: verifySections ? 'Saved!' : 'Missing!',
        content: verifyContent ? 'Saved!' : 'Missing!',
        branding: verifyBranding ? 'Saved!' : 'Missing!',
      });

      if (verifySections && verifyContent && verifyBranding) {
        console.log('✅✅✅ ALL DATA VERIFIED AND SAVED SUCCESSFULLY!');
        toast.success(`${pageName} saved successfully! All changes are persistent.`);
      } else {
        console.error('❌ Verification failed - some data missing');
        toast.warning('Save completed but verification failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type: Section['type']) => {
    const newSection: Section = {
      id: `${type}-${Date.now()}`,
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Section`,
      visible: true,
      order: sections.length,
      content: getDefaultContent(type)
    };
    setSections([...sections, newSection]);
    setShowAddModal(false);
    toast.success('Section added!');
  };

  const getDefaultContent = (type: Section['type']) => {
    switch (type) {
      case 'hero':
        return {
          headline: 'Your Headline Here',
          subheadline: 'Your Subheadline',
          description: 'Description text',
          ctaText: 'Call to Action',
          backgroundImage: ''
        };
      case 'services':
        return {
          heading: 'Our Services',
          description: 'What we offer',
          services: []
        };
      case 'features':
        return {
          heading: 'Key Features',
          description: 'What makes us different',
          features: []
        };
      case 'testimonials':
        return {
          heading: 'What Our Clients Say',
          description: 'Real reviews from real customers',
          testimonials: []
        };
      case 'cta':
        return {
          heading: 'Ready to Get Started?',
          description: 'Contact us today',
          buttonText: 'Get Started',
          backgroundImage: ''
        };
      case 'custom':
        return {
          html: '<div class="py-20 px-4"><h2>Custom Section</h2><p>Add your custom content here</p></div>'
        };
      default:
        return {};
    }
  };

  const deleteSection = (id: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      setSections(sections.filter(s => s.id !== id));
      if (selectedSection?.id === id) {
        setSelectedSection(null);
      }
      toast.success('Section deleted');
    }
  };

  const duplicateSection = (section: Section) => {
    const newSection = {
      ...section,
      id: `${section.type}-${Date.now()}`,
      title: `${section.title} (Copy)`,
      order: sections.length
    };
    setSections([...sections, newSection]);
    toast.success('Section duplicated!');
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    newSections.forEach((section, i) => {
      section.order = i;
    });
    
    setSections(newSections);
  };

  const toggleVisibility = (id: string) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, visible: !s.visible } : s
    ));
  };

  const resetToDefaultSections = () => {
    if (confirm('This will replace all sections with fresh defaults including all section types. Continue?')) {
      // Clear localStorage
      localStorage.removeItem('landingPageSections');
      // Load defaults by calling loadContent which will see no stored data
      loadContent();
      setSelectedSection(null);
      toast.success('Sections reset to defaults with all section types!');
    }
  };

  // AI Assistant Functions
  const handleAIRequest = async (request: AIAssistRequest) => {
    setAiLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (request.action === 'generate_section') {
        addSection(request.sectionType as Section['type']);
        toast.success('AI generated new section!');
      } else if (request.action === 'improve_content' && selectedSection) {
        toast.success('Content improved with AI!');
      } else if (request.action === 'generate_services') {
        if (selectedSection && selectedSection.type === 'services') {
          const services = [
            { title: 'Premium Service', description: 'High-quality professional service', icon: 'Star' },
            { title: 'Expert Consultation', description: 'Professional advice and guidance', icon: 'Award' },
            { title: 'Custom Solutions', description: 'Tailored to your specific needs', icon: 'Zap' }
          ];
          const updated = {
            ...selectedSection.content,
            services: [...(selectedSection.content.services || []), ...services]
          };
          setSections(sections.map(s => 
            s.id === selectedSection.id ? { ...s, content: updated } : s
          ));
          toast.success(`Added ${services.length} AI-generated services!`);
        }
      } else if (request.action === 'generate_testimonial') {
        if (selectedSection && selectedSection.type === 'testimonials') {
          const testimonial = {
            name: 'AI Generated Client',
            rating: 5,
            text: 'Amazing service! Highly professional and exceeded all expectations.',
            location: 'Austin, TX'
          };
          const updated = {
            ...selectedSection.content,
            testimonials: [...(selectedSection.content.testimonials || []), testimonial]
          };
          setSections(sections.map(s => 
            s.id === selectedSection.id ? { ...s, content: updated } : s
          ));
          toast.success('Added AI-generated testimonial!');
        }
      }
      
      setAiPrompt('');
      setShowAI(false);
    } catch (error) {
      console.error('AI Error:', error);
      toast.error('AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const exportContent = () => {
    const data = JSON.stringify({ sections, branding }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'landing-page-content.json';
    a.click();
    toast.success('Content exported!');
  };

  const importContent = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.sections) setSections(imported.sections);
        if (imported.branding) setBranding(imported.branding);
        toast.success('Content imported successfully!');
      } catch (error) {
        toast.error('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Unified Back Button */}
      <div className="px-4 pt-4">
        <button
          onClick={() => window.location.href = '/unified-dashboard'}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] hover:border-[#ea580c] text-gray-300 hover:text-white rounded-lg transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Unified Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Layout className="w-6 h-6 text-orange-600" />
              <h1 className="text-xl font-bold text-white">Landing Page Editor</h1>

              {/* Landing Page Selector */}
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-gray-400">Editing:</span>
                <select
                  value={selectedLandingPage}
                  onChange={(e) => setSelectedLandingPage(e.target.value)}
                  className="px-3 py-1.5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg text-white text-sm focus:outline-none focus:border-orange-500 transition"
                >
                  {landingPages.map(page => (
                    <option key={page.id} value={page.id}>{page.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const page = landingPages.find(p => p.id === selectedLandingPage);
                    if (page) window.open(page.route, '_blank');
                  }}
                  className="p-1.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-gray-400 hover:text-white transition"
                  title="Preview this page"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBrandingEditor(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Building2 className="w-4 h-4" />
                Branding
              </button>

              <button
                onClick={() => setShowAI(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition"
              >
                <Sparkles className="w-4 h-4" />
                AI Assistant
              </button>

              <button
                onClick={exportContent}
                className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#3a3a3a] transition"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              <label className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#3a3a3a] transition cursor-pointer">
                <Upload className="w-4 h-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importContent}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#3a3a3a] transition"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>

              <button
                onClick={saveContent}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Branding Summary Bar */}
      <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Company:</span>
                <span className="text-white font-medium">{branding.companyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-white">{branding.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-white">{branding.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-400" />
                <div 
                  className="w-6 h-6 rounded border border-gray-600"
                  style={{ backgroundColor: branding.primaryColor }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowBrandingEditor(true)}
              className="text-sm text-orange-600 hover:text-orange-500 transition"
            >
              Edit Branding →
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('sections')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'sections'
                  ? 'text-white border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Page Sections
              </div>
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'portfolio'
                  ? 'text-white border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Portfolio Projects
              </div>
            </button>
            <button
              onClick={() => setActiveTab('application')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'application'
                  ? 'text-white border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Application Form
              </div>
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'directory'
                  ? 'text-white border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Directory Sections
              </div>
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'partners'
                  ? 'text-white border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Partner Logos
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'portfolio' ? (
          <PortfolioProjectManager />
        ) : activeTab === 'application' ? (
          <ApplicationFormEditor />
        ) : activeTab === 'directory' ? (
          <DirectorySectionsEditor onSave={() => toast.success('Directory sections updated!')} />
        ) : activeTab === 'partners' ? (
          <PartnerLogoManager />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sections List */}
            <div className="lg:col-span-1">
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
              <div className="p-4 border-b border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Sections</h2>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[#2a2a2a] max-h-[calc(100vh-20rem)] overflow-y-auto">
                {sections.length === 0 ? (
                  <div className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm mb-4">No sections yet</p>
                    <button
                      onClick={() => {
                        console.log('Loading default sections...');
                        loadDefaultContentForPage(selectedLandingPage);
                        toast.success('Default sections loaded!');
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm"
                    >
                      Load Default Sections
                    </button>
                  </div>
                ) : (
                  sections.sort((a, b) => a.order - b.order).map((section, index) => (
                    <div
                      key={section.id}
                      className={`p-4 cursor-pointer transition ${
                        selectedSection?.id === section.id
                          ? 'bg-orange-600/10 border-l-4 border-orange-600'
                          : 'hover:bg-[#2a2a2a]'
                      }`}
                      onClick={() => setSelectedSection(section)}
                    >
                    <div className="flex items-start gap-3">
                      <GripVertical className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-medium truncate">{section.title}</h3>
                          {!section.visible && (
                            <span className="text-sm text-gray-500">(Hidden)</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 capitalize">{section.type} Section</p>
                      </div>

                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(section.id, 'up');
                          }}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-white transition disabled:opacity-30"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveSection(section.id, 'down');
                          }}
                          disabled={index === sections.length - 1}
                          className="p-1 text-gray-400 hover:text-white transition disabled:opacity-30"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 ml-8">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVisibility(section.id);
                        }}
                        className="text-sm px-2 py-1 bg-[#2a2a2a] text-gray-300 rounded hover:bg-[#3a3a3a] transition"
                      >
                        {section.visible ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSection(section);
                        }}
                        className="text-sm px-2 py-1 bg-[#2a2a2a] text-gray-300 rounded hover:bg-[#3a3a3a] transition"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSection(section.id);
                        }}
                        className="text-sm px-2 py-1 bg-red-600/10 text-red-400 rounded hover:bg-red-600/20 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Section Editor */}
          <div className="lg:col-span-2">
            {selectedSection ? (
              <SectionEditor
                section={selectedSection}
                onUpdate={(updated) => {
                  console.log('🔄 Main Editor - Received update for section:', updated.id);
                  console.log('📊 Updating sections array with new data:', updated);
                  const newSections = sections.map(s => 
                    s.id === updated.id ? updated : s
                  );
                  setSections(newSections);
                  console.log('✅ Sections state updated. Remember to click "Save All" to persist!');
                }}
                onAIAssist={() => setShowAI(true)}
                onBrowseMedia={(callback) => {
                  setMediaLibraryCallback(() => callback);
                  setShowMediaLibrary(true);
                }}
              />
            ) : (
              <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-12 text-center">
                <Layout className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Section Selected</h3>
                <p className="text-gray-400 mb-4">Select a section from the list to start editing</p>
                <button
                  onClick={() => setShowBrandingEditor(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Building2 className="w-5 h-5" />
                  Edit Company Branding
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Branding Editor Modal */}
      <AnimatePresence>
        {showBrandingEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] max-w-2xl w-full p-6 my-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-blue-600" />
                  <h2 className="text-2xl font-bold text-white">Company Branding & Contact</h2>
                </div>
                <button
                  onClick={() => {
                    loadBranding();
                    toast.success('Brand data reloaded!');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Brand
                </button>
              </div>

              {/* Show logo previews if they exist */}
              {(branding.logoPrimary || branding.logoSecondary || branding.logoIcon || branding.logoHorizontal) && (
                <div className="bg-orange-600/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-orange-400">Your Logos from Brand Creator</h3>
                    <p className="text-sm text-gray-400">Click a logo to use it on your landing page</p>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {branding.logoPrimary && (
                      <button
                        type="button"
                        onClick={() => {
                          setBranding({ ...branding, logoUrl: branding.logoPrimary || '' });
                          toast.success('✅ Primary logo selected!');
                        }}
                        className={`text-center p-3 rounded-lg border-2 transition hover:scale-105 ${
                          branding.logoUrl === branding.logoPrimary
                            ? 'border-orange-500 bg-orange-500/20'
                            : 'border-gray-700 hover:border-orange-500/50'
                        }`}
                      >
                        <img src={branding.logoPrimary} alt="Primary Logo" className="h-16 w-auto mx-auto mb-2 object-contain" />
                        <p className="text-sm text-gray-300">Primary</p>
                        {branding.logoUrl === branding.logoPrimary && (
                          <CheckCircle2 className="w-4 h-4 text-orange-400 mx-auto mt-1" />
                        )}
                      </button>
                    )}
                    {branding.logoSecondary && (
                      <button
                        type="button"
                        onClick={() => {
                          setBranding({ ...branding, logoUrl: branding.logoSecondary || '' });
                          toast.success('✅ Secondary logo selected!');
                        }}
                        className={`text-center p-3 rounded-lg border-2 transition hover:scale-105 ${
                          branding.logoUrl === branding.logoSecondary
                            ? 'border-orange-500 bg-orange-500/20'
                            : 'border-gray-700 hover:border-orange-500/50'
                        }`}
                      >
                        <img src={branding.logoSecondary} alt="Secondary Logo" className="h-16 w-auto mx-auto mb-2 object-contain" />
                        <p className="text-sm text-gray-300">Secondary</p>
                        {branding.logoUrl === branding.logoSecondary && (
                          <CheckCircle2 className="w-4 h-4 text-orange-400 mx-auto mt-1" />
                        )}
                      </button>
                    )}
                    {branding.logoIcon && (
                      <button
                        type="button"
                        onClick={() => {
                          setBranding({ ...branding, logoUrl: branding.logoIcon || '' });
                          toast.success('✅ Icon logo selected!');
                        }}
                        className={`text-center p-3 rounded-lg border-2 transition hover:scale-105 ${
                          branding.logoUrl === branding.logoIcon
                            ? 'border-orange-500 bg-orange-500/20'
                            : 'border-gray-700 hover:border-orange-500/50'
                        }`}
                      >
                        <img src={branding.logoIcon} alt="Icon" className="h-16 w-auto mx-auto mb-2 object-contain" />
                        <p className="text-sm text-gray-300">Icon</p>
                        {branding.logoUrl === branding.logoIcon && (
                          <CheckCircle2 className="w-4 h-4 text-orange-400 mx-auto mt-1" />
                        )}
                      </button>
                    )}
                    {branding.logoHorizontal && (
                      <button
                        type="button"
                        onClick={() => {
                          setBranding({ ...branding, logoUrl: branding.logoHorizontal || '' });
                          toast.success('✅ Horizontal logo selected!');
                        }}
                        className={`text-center p-3 rounded-lg border-2 transition hover:scale-105 ${
                          branding.logoUrl === branding.logoHorizontal
                            ? 'border-orange-500 bg-orange-500/20'
                            : 'border-gray-700 hover:border-orange-500/50'
                        }`}
                      >
                        <img src={branding.logoHorizontal} alt="Horizontal Logo" className="h-16 w-auto mx-auto mb-2 object-contain" />
                        <p className="text-sm text-gray-300">Horizontal</p>
                        {branding.logoUrl === branding.logoHorizontal && (
                          <CheckCircle2 className="w-4 h-4 text-orange-400 mx-auto mt-1" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Don't see your logos? Click "Reload Brand" above, then check your Brand Creator.</span>
                  </div>
                </div>
              )}

              {/* No logos warning */}
              {!branding.logoPrimary && !branding.logoSecondary && !branding.logoIcon && !branding.logoHorizontal && (
                <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-400 mb-1">No Logos Found</h4>
                      <p className="text-sm text-gray-400 mb-2">
                        Upload your logos in the Brand Creator first, then click "Reload Brand" above.
                      </p>
                      <p className="text-sm text-gray-500">
                        Go to: Company Profile → Brand Creator → Upload logos → Save
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* Company Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={branding.companyName}
                    onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tagline</label>
                  <input
                    type="text"
                    value={branding.companyTagline}
                    onChange={(e) => setBranding({ ...branding, companyTagline: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Logo URL</label>
                  <input
                    type="text"
                    value={branding.logoUrl}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                    placeholder="https://your-logo-url.com/logo.png"
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  {/* 🆕 Logo Preview */}
                  {branding.logoUrl && (
                    <div className="mt-3 p-4 bg-[#2a2a2a] rounded-lg border border-[#3a3a3a]">
                      <p className="text-sm text-gray-400 mb-2">Current Logo Preview:</p>
                      <img 
                        src={branding.logoUrl} 
                        alt="Logo preview" 
                        className="h-20 w-auto object-contain bg-white/5 rounded-lg p-2"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-sm text-red-400 mt-2">
                        ⚠️ Failed to load logo. Check the URL.
                      </div>
                    </div>
                  )}
                  {!branding.logoUrl && (
                    <p className="mt-2 text-sm text-gray-500">
                      No logo URL set. Click a logo above or enter a URL manually.
                    </p>
                  )}
                </div>

                {/* Login Page Logo */}
                <div className="pt-4 border-t border-[#2a2a2a]">
                  <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-blue-400" />
                      <h4 className="text-sm font-semibold text-blue-400">Login Page Logo</h4>
                    </div>
                    <p className="text-sm text-gray-400">
                      This logo will appear on your login page. If not set, the main logo will be used.
                    </p>
                  </div>

                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Login Page Logo URL
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={branding.logoUrl}
                      onChange={(e) => {
                        const newLogoUrl = e.target.value;
                        setBranding({ ...branding, logoUrl: newLogoUrl, logoPrimary: newLogoUrl });
                        // CRITICAL: Save to BOTH company_branding_profile AND company_logo_variants
                        try {
                          // Save to company_branding_profile for login page
                          const brandingProfile = JSON.parse(localStorage.getItem('company_branding_profile') || '{}');
                          brandingProfile.logo_url = newLogoUrl;
                          localStorage.setItem('company_branding_profile', JSON.stringify(brandingProfile));

                          // ALSO save to company_logo_variants for database persistence
                          const logoVariants = JSON.parse(localStorage.getItem('company_logo_variants') || '{}');
                          logoVariants.logo_primary = newLogoUrl;
                          localStorage.setItem('company_logo_variants', JSON.stringify(logoVariants));

                          console.log('✅ Logo URL saved to both localStorage keys:', newLogoUrl);
                          window.dispatchEvent(new Event('brandingUpdated'));
                        } catch (e) {
                          console.error('Failed to update login logo:', e);
                        }
                      }}
                      onBlur={async () => {
                        // Auto-save to database when user finishes typing
                        console.log('🔄 Auto-saving logo to database...');
                        await saveBranding();
                      }}
                      placeholder="Enter logo URL for login page"
                      className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {branding.logoUrl && (
                    <div className="mt-3 p-4 bg-[#2a2a2a] rounded-lg border border-[#3a3a3a]">
                      <p className="text-sm text-gray-400 mb-2">Login Page Logo Preview:</p>
                      <div className="bg-[#0a0a0a] rounded-lg p-4 flex items-center justify-center">
                        <img
                          src={branding.logoUrl}
                          alt="Login logo preview"
                          className="h-32 w-auto object-contain"
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        This is how your logo will appear on the login page
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Primary Brand Color</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="w-20 h-10 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={branding.primaryColor}
                      onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="pt-4 border-t border-[#2a2a2a]">
                  <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={branding.phone}
                    onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={branding.email}
                    onChange={(e) => setBranding({ ...branding, email: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={branding.address}
                    onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                    <input
                      type="text"
                      value={branding.city}
                      onChange={(e) => setBranding({ ...branding, city: e.target.value })}
                      className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                    <input
                      type="text"
                      value={branding.state}
                      onChange={(e) => setBranding({ ...branding, state: e.target.value })}
                      maxLength={2}
                      className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={branding.zipCode}
                    onChange={(e) => setBranding({ ...branding, zipCode: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    saveBranding();
                    setShowBrandingEditor(false);
                  }}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save Branding
                </button>
                <button
                  onClick={() => setShowBrandingEditor(false)}
                  className="px-6 py-2 bg-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#3a3a3a] transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Section Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] max-w-2xl w-full p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Add New Section</h2>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { type: 'hero', icon: Zap, label: 'Hero Section', desc: 'Main landing section with CTA' },
                  { type: 'services', icon: Settings, label: 'Services', desc: 'Showcase your services' },
                  { type: 'features', icon: CheckCircle2, label: 'Features', desc: 'Highlight key features' },
                  { type: 'testimonials', icon: Type, label: 'Testimonials', desc: 'Customer reviews' },
                  { type: 'cta', icon: Sparkles, label: 'Call to Action', desc: 'Drive conversions' },
                  { type: 'custom', icon: Code, label: 'Custom HTML', desc: 'Add custom content' }
                ].map(({ type, icon: Icon, label, desc }) => (
                  <button
                    key={type}
                    onClick={() => addSection(type as Section['type'])}
                    className="p-4 bg-[#2a2a2a] rounded-lg hover:bg-[#3a3a3a] transition text-left border-2 border-transparent hover:border-orange-600"
                  >
                    <Icon className="w-8 h-8 text-orange-600 mb-2" />
                    <h3 className="text-white font-semibold mb-1">{label}</h3>
                    <p className="text-sm text-gray-400">{desc}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="mt-6 w-full py-2 bg-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#3a3a3a] transition"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Assistant Modal - Simplified for space */}
      <AnimatePresence>
        {showAI && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 backdrop-blur-xl rounded-xl border border-purple-500/30 max-w-2xl w-full p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-purple-300" />
                <h2 className="text-2xl font-bold text-white">AI Assistant</h2>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  What would you like to create or improve?
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="E.g., Generate 5 home renovation services with descriptions..."
                  className="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={4}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => handleAIRequest({ action: 'generate_section', sectionType: 'services' })}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-left"
                >
                  <Wand2 className="w-5 h-5 mb-1" />
                  <div className="text-sm font-semibold">Generate Section</div>
                  <div className="text-sm opacity-80">Create new section</div>
                </button>

                <button
                  onClick={() => handleAIRequest({ action: 'improve_content' })}
                  disabled={aiLoading || !selectedSection || !aiPrompt.trim()}
                  className="px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition disabled:opacity-50 text-left"
                >
                  <Sparkles className="w-5 h-5 mb-1" />
                  <div className="text-sm font-semibold">Improve Content</div>
                  <div className="text-sm opacity-80">Enhance selected section</div>
                </button>

                <button
                  onClick={() => handleAIRequest({ action: 'generate_services' })}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 text-left"
                >
                  <Settings className="w-5 h-5 mb-1" />
                  <div className="text-sm font-semibold">Generate Services</div>
                  <div className="text-sm opacity-80">Add service items</div>
                </button>

                <button
                  onClick={() => handleAIRequest({ action: 'generate_testimonial' })}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-left"
                >
                  <Type className="w-5 h-5 mb-1" />
                  <div className="text-sm font-semibold">Generate Testimonial</div>
                  <div className="text-sm opacity-80">Add review</div>
                </button>
              </div>

              {aiLoading && (
                <div className="flex items-center justify-center gap-3 py-4 text-purple-200">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>AI is generating content...</span>
                </div>
              )}

              <button
                onClick={() => setShowAI(false)}
                className="w-full py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-50 bg-black">
            <div className="h-full flex flex-col">
              <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] p-4 flex items-center justify-between">
                <h2 className="text-white font-semibold">Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition"
                >
                  Close Preview
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <iframe
                  src="/"
                  className="w-full h-full"
                  title="Landing Page Preview"
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Media Library Modal */}
      {showMediaLibrary && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-[#0A0A0A] rounded-3xl border border-[#2A2A2A] max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Select Media from Library</h2>
              </div>
              <button
                onClick={() => {
                  setShowMediaLibrary(false);
                  setMediaLibraryCallback(null);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <MediaLibraryManager
                selectionMode={true}
                onSelectMedia={(url: string, type: 'image' | 'video') => {
                  if (mediaLibraryCallback) {
                    mediaLibraryCallback(url);
                    toast.success('Media selected successfully!');
                  }
                  setShowMediaLibrary(false);
                  setMediaLibraryCallback(null);
                }}
                filterType="all"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Section Editor Component - Comprehensive editors for all section types
function SectionEditor({ section, onUpdate, onAIAssist, onBrowseMedia }: any) {
  // Local state for editing - only saves when Save Changes is clicked
  const [localSection, setLocalSection] = useState(section);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync local state when section prop changes (e.g., user selects different section)
  useEffect(() => {
    setLocalSection(section);
    setHasUnsavedChanges(false);
  }, [section.id]);

  const updateContent = (updates: any) => {
    setLocalSection({
      ...localSection,
      content: { ...localSection.content, ...updates }
    });
    setHasUnsavedChanges(true);
  };

  const updateSection = (updates: any) => {
    setLocalSection({ ...localSection, ...updates });
    setHasUnsavedChanges(true);
  };

  const saveChanges = () => {
    console.log('💾 Section Editor - Saving changes for section:', localSection.id);
    console.log('📊 Updated section data:', localSection);
    onUpdate(localSection);
    setHasUnsavedChanges(false);
    toast.success('Section changes saved! Click "Save All" at the top to persist changes.');
  };

  // Save Changes Button Component
  const SaveButton = () => (
    <button
      onClick={saveChanges}
      disabled={!hasUnsavedChanges}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
        hasUnsavedChanges
          ? 'bg-[#ea580c] hover:bg-[#dc2626] text-white shadow-lg'
          : 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed'
      }`}
    >
      <Save className="w-4 h-4" />
      {hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
    </button>
  );

  // Reusable Image URL Input with Browse Library Button
  const ImageURLInput = ({ label, value, onChange, placeholder = "https://images.unsplash.com/photo-..." }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => onBrowseMedia && onBrowseMedia((url: string) => onChange(url))}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 whitespace-nowrap"
        >
          <ImageIcon className="w-4 h-4" />
          Browse Library
        </button>
      </div>
      {value && (
        <div className="mt-3 relative">
          <img
            src={value}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );

  // Hero Section Editor
  if (localSection.type === 'hero') {
    return (
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Hero Section</h3>
          <div className="flex items-center gap-3">
            <SaveButton />
            <button
              onClick={onAIAssist}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Enhance
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section Title</label>
            <input
              type="text"
              value={localSection.title}
              onChange={(e) => updateSection({ title: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Hero Section"
            />
          </div>

          {/* Main Headline */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Main Headline</label>
            <input
              type="text"
              value={localSection.content.headline || ''}
              onChange={(e) => updateContent({ headline: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Your Main Headline"
            />
          </div>

          {/* Subheadline */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Subheadline</label>
            <input
              type="text"
              value={localSection.content.subheadline || ''}
              onChange={(e) => updateContent({ subheadline: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Your Subheadline"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={localSection.content.description || ''}
              onChange={(e) => updateContent({ description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Describe what makes your business special..."
            />
          </div>

          {/* CTA Button Text */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Call-to-Action Button Text</label>
            <input
              type="text"
              value={localSection.content.ctaText || ''}
              onChange={(e) => updateContent({ ctaText: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Get Free Quote"
            />
          </div>

          {/* Background Image URL */}
          <ImageURLInput
            label="Background Image URL"
            value={localSection.content.backgroundImage}
            onChange={(value: string) => updateContent({ backgroundImage: value })}
          />

          {/* Preview */}
          <div className="pt-6 border-t border-[#2a2a2a]">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Preview</h4>
            <div className="bg-[#0a0a0a] rounded-lg p-6 border border-[#2a2a2a]">
              <h2 className="text-3xl font-bold text-white mb-2">{localSection.content.headline || 'Your Headline'}</h2>
              <p className="text-xl text-gray-300 mb-3">{localSection.content.subheadline || 'Your Subheadline'}</p>
              <p className="text-gray-400 mb-4">{localSection.content.description || 'Your description...'}</p>
              <button className="px-6 py-3 bg-[#ea580c] text-white rounded-lg font-medium">
                {localSection.content.ctaText || 'Call to Action'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Services Section Editor
  if (localSection.type === 'services') {
    const services = localSection.content.services || [];
    
    const addService = () => {
      updateContent({
        services: [...services, { title: 'New Service', description: 'Service description', icon: 'Wrench' }]
      });
    };

    const updateService = (index: number, updates: any) => {
      const newServices = [...services];
      newServices[index] = { ...newServices[index], ...updates };
      updateContent({ services: newServices });
    };

    const deleteService = (index: number) => {
      updateContent({ services: services.filter((_: any, i: number) => i !== index) });
    };

    return (
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Services Section</h3>
          <div className="flex items-center gap-3">
            <SaveButton />
            <button
              onClick={onAIAssist}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Enhance
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section Title</label>
            <input
              type="text"
              value={localSection.title}
              onChange={(e) => updateSection({ title: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          {/* Heading */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Heading</label>
            <input
              type="text"
              value={localSection.content.heading || ''}
              onChange={(e) => updateContent({ heading: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Our Services"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={localSection.content.description || ''}
              onChange={(e) => updateContent({ description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="What we offer"
            />
          </div>

          {/* Section Background Image */}
          <ImageURLInput
            label="Section Background Image (Optional)"
            value={localSection.content.backgroundImage}
            onChange={(value: string) => updateContent({ backgroundImage: value })}
          />

          {/* Services List */}
          <div className="pt-4 border-t border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Services</h4>
              <button
                onClick={addService}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            </div>

            <div className="space-y-4">
              {services.map((service: any, index: number) => (
                <div key={index} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="text-white font-medium">Service {index + 1}</h5>
                    <button
                      onClick={() => deleteService(index)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Service Title</label>
                      <input
                        type="text"
                        value={service.title || ''}
                        onChange={(e) => updateService(index, { title: e.target.value })}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                        placeholder="Service Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Description</label>
                      <textarea
                        value={service.description || ''}
                        onChange={(e) => updateService(index, { description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                        placeholder="Service description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Icon Name (Lucide)</label>
                      <input
                        type="text"
                        value={service.icon || ''}
                        onChange={(e) => updateService(index, { icon: e.target.value })}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                        placeholder="Wrench"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Examples: Wrench, Hammer, PaintBucket, Zap, Home
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Service Image URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={service.image || ''}
                          onChange={(e) => updateService(index, { image: e.target.value })}
                          className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                          placeholder="https://images.unsplash.com/photo-..."
                        />
                        <button
                          type="button"
                          onClick={() => onBrowseMedia && onBrowseMedia((url: string) => updateService(index, { image: url }))}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition flex items-center gap-1 whitespace-nowrap"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Browse
                        </button>
                      </div>
                      {service.image && (
                        <div className="mt-2">
                          <img
                            src={service.image}
                            alt="Service preview"
                            className="w-full h-24 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {services.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No services added yet. Click "Add Service" to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Features Section Editor
  if (localSection.type === 'features') {
    const features = localSection.content.features || [];
    
    const addFeature = () => {
      updateContent({
        features: [...features, { title: 'New Feature', description: 'Feature description', icon: 'CheckCircle2' }]
      });
    };

    const updateFeature = (index: number, updates: any) => {
      const newFeatures = [...features];
      newFeatures[index] = { ...newFeatures[index], ...updates };
      updateContent({ features: newFeatures });
    };

    const deleteFeature = (index: number) => {
      updateContent({ features: features.filter((_: any, i: number) => i !== index) });
    };

    return (
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Features Section</h3>
          <div className="flex items-center gap-3">
            <SaveButton />
            <button
              onClick={onAIAssist}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Enhance
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section Title</label>
            <input
              type="text"
              value={localSection.title}
              onChange={(e) => updateSection({ title: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          {/* Heading */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Heading</label>
            <input
              type="text"
              value={localSection.content.heading || ''}
              onChange={(e) => updateContent({ heading: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Why Choose Us"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={localSection.content.description || ''}
              onChange={(e) => updateContent({ description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="What makes us different"
            />
          </div>

          {/* Section Background Image */}
          <ImageURLInput
            label="Section Background Image (Optional)"
            value={localSection.content.backgroundImage}
            onChange={(value: string) => updateContent({ backgroundImage: value })}
          />

          {/* Features List */}
          <div className="pt-4 border-t border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Features</h4>
              <button
                onClick={addFeature}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Feature
              </button>
            </div>

            <div className="space-y-4">
              {features.map((feature: any, index: number) => (
                <div key={index} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="text-white font-medium">Feature {index + 1}</h5>
                    <button
                      onClick={() => deleteFeature(index)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Feature Title</label>
                      <input
                        type="text"
                        value={feature.title || ''}
                        onChange={(e) => updateFeature(index, { title: e.target.value })}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                        placeholder="Feature Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Description</label>
                      <textarea
                        value={feature.description || ''}
                        onChange={(e) => updateFeature(index, { description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                        placeholder="Feature description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Icon Name (Lucide)</label>
                      <input
                        type="text"
                        value={feature.icon || ''}
                        onChange={(e) => updateFeature(index, { icon: e.target.value })}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                        placeholder="CheckCircle2"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Examples: CheckCircle2, Award, Shield, Star, TrendingUp
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Feature Image URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={feature.image || ''}
                          onChange={(e) => updateFeature(index, { image: e.target.value })}
                          className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                          placeholder="https://images.unsplash.com/photo-..."
                        />
                        <button
                          type="button"
                          onClick={() => onBrowseMedia && onBrowseMedia((url: string) => updateFeature(index, { image: url }))}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition flex items-center gap-1 whitespace-nowrap"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Browse
                        </button>
                      </div>
                      {feature.image && (
                        <div className="mt-2">
                          <img
                            src={feature.image}
                            alt="Feature preview"
                            className="w-full h-24 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {features.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No features added yet. Click "Add Feature" to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Testimonials Section Editor
  if (localSection.type === 'testimonials') {
    const testimonials = localSection.content.testimonials || [];
    
    const addTestimonial = () => {
      updateContent({
        testimonials: [...testimonials, { 
          name: 'Client Name', 
          text: 'Testimonial text', 
          rating: 5,
          location: 'City, State',
          project: 'Project Type'
        }]
      });
    };

    const updateTestimonial = (index: number, updates: any) => {
      const newTestimonials = [...testimonials];
      newTestimonials[index] = { ...newTestimonials[index], ...updates };
      updateContent({ testimonials: newTestimonials });
    };

    const deleteTestimonial = (index: number) => {
      updateContent({ testimonials: testimonials.filter((_: any, i: number) => i !== index) });
    };

    return (
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Testimonials Section</h3>
          <div className="flex items-center gap-3">
            <SaveButton />
            <button
              onClick={onAIAssist}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Enhance
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section Title</label>
            <input
              type="text"
              value={localSection.title}
              onChange={(e) => updateSection({ title: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          {/* Heading */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Heading</label>
            <input
              type="text"
              value={localSection.content.heading || ''}
              onChange={(e) => updateContent({ heading: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="What Our Clients Say"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={localSection.content.description || ''}
              onChange={(e) => updateContent({ description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Real reviews from real customers"
            />
          </div>

          {/* Section Background Image */}
          <ImageURLInput
            label="Section Background Image (Optional)"
            value={localSection.content.backgroundImage}
            onChange={(value: string) => updateContent({ backgroundImage: value })}
          />

          {/* Testimonials List */}
          <div className="pt-4 border-t border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Client Testimonials</h4>
              <button
                onClick={addTestimonial}
                className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Testimonial
              </button>
            </div>

            <div className="space-y-4">
              {testimonials.map((testimonial: any, index: number) => (
                <div key={index} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h5 className="text-white font-medium">Testimonial {index + 1}</h5>
                    <button
                      onClick={() => deleteTestimonial(index)}
                      className="text-red-400 hover:text-red-300 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Client Name</label>
                        <input
                          type="text"
                          value={testimonial.name || ''}
                          onChange={(e) => updateTestimonial(index, { name: e.target.value })}
                          className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                          placeholder="John Smith"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Location</label>
                        <input
                          type="text"
                          value={testimonial.location || ''}
                          onChange={(e) => updateTestimonial(index, { location: e.target.value })}
                          className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                          placeholder="Austin, TX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Project Type</label>
                      <input
                        type="text"
                        value={testimonial.project || ''}
                        onChange={(e) => updateTestimonial(index, { project: e.target.value })}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                        placeholder="Kitchen Remodel"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Rating (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={testimonial.rating || 5}
                        onChange={(e) => updateTestimonial(index, { rating: parseInt(e.target.value) || 5 })}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Testimonial Text</label>
                      <textarea
                        value={testimonial.text || ''}
                        onChange={(e) => updateTestimonial(index, { text: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                        placeholder="Write the client's testimonial..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Client Photo URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={testimonial.image || ''}
                          onChange={(e) => updateTestimonial(index, { image: e.target.value })}
                          className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                          placeholder="https://images.unsplash.com/photo-..."
                        />
                        <button
                          type="button"
                          onClick={() => onBrowseMedia && onBrowseMedia((url: string) => updateTestimonial(index, { image: url }))}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition flex items-center gap-1 whitespace-nowrap"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Browse
                        </button>
                      </div>
                      {testimonial.image && (
                        <div className="mt-2">
                          <img
                            src={testimonial.image}
                            alt="Client photo preview"
                            className="w-16 h-16 object-cover rounded-full border-2 border-orange-500"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {testimonials.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No testimonials added yet. Click "Add Testimonial" to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CTA (Call to Action) Section Editor
  if (localSection.type === 'cta') {
    return (
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Call-to-Action Section</h3>
          <div className="flex items-center gap-3">
            <SaveButton />
            <button
              onClick={onAIAssist}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Enhance
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section Title</label>
            <input
              type="text"
              value={localSection.title}
              onChange={(e) => updateSection({ title: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          {/* Heading */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Heading</label>
            <input
              type="text"
              value={localSection.content.heading || ''}
              onChange={(e) => updateContent({ heading: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Ready to Get Started?"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={localSection.content.description || ''}
              onChange={(e) => updateContent({ description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Contact us today for a free consultation and estimate."
            />
          </div>

          {/* Button Text */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Button Text</label>
            <input
              type="text"
              value={localSection.content.buttonText || ''}
              onChange={(e) => updateContent({ buttonText: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Get Free Quote"
            />
          </div>

          {/* Background Image URL */}
          <ImageURLInput
            label="Background Image URL (Optional)"
            value={localSection.content.backgroundImage}
            onChange={(value: string) => updateContent({ backgroundImage: value })}
          />

          {/* Preview */}
          <div className="pt-6 border-t border-[#2a2a2a]">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Preview</h4>
            <div className="bg-gradient-to-br from-orange-600/20 to-[#0a0a0a] rounded-lg p-8 border border-orange-600/30 text-center">
              <h2 className="text-3xl font-bold text-white mb-3">{section.content.heading || 'Ready to Get Started?'}</h2>
              <p className="text-lg text-gray-300 mb-6">{section.content.description || 'Contact us today'}</p>
              <button className="px-8 py-4 bg-[#ea580c] text-white rounded-lg font-semibold text-lg hover:bg-[#dc2626] transition">
                {section.content.buttonText || 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Custom HTML Section Editor (includes Portfolio Gallery support)
  if (localSection.type === 'custom') {
    const images = localSection.content.images || [];
    
    const addImage = () => {
      updateContent({
        images: [...images, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c']
      });
    };
    
    const updateImage = (index: number, url: string) => {
      const newImages = [...images];
      newImages[index] = url;
      updateContent({ images: newImages });
    };
    
    const deleteImage = (index: number) => {
      updateContent({ images: images.filter((_: any, i: number) => i !== index) });
    };

    // Check if this is a portfolio gallery section
    const isPortfolioGallery = localSection.title.toLowerCase().includes('portfolio') || images.length > 0;

    return (
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">{isPortfolioGallery ? 'Portfolio Gallery Section' : 'Custom HTML Section'}</h3>
          <div className="flex items-center gap-3">
            <SaveButton />
            <button
              onClick={onAIAssist}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI Enhance
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Section Title</label>
            <input
              type="text"
              value={localSection.title}
              onChange={(e) => updateSection({ title: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
            />
          </div>

          {/* Heading */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Heading</label>
            <input
              type="text"
              value={localSection.content.heading || ''}
              onChange={(e) => updateContent({ heading: e.target.value })}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="Our Recent Work"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={localSection.content.description || ''}
              onChange={(e) => updateContent({ description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              placeholder="See what we've built for our satisfied clients"
            />
          </div>

          {isPortfolioGallery ? (
            <>
              {/* Portfolio Images */}
              <div className="pt-4 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">Gallery Images</h4>
                  <button
                    onClick={addImage}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add Image
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {images.map((image: string, index: number) => (
                    <div key={index} className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Image {index + 1}</span>
                        <button
                          onClick={() => deleteImage(index)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={image}
                          onChange={(e) => updateImage(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-600"
                          placeholder="https://images.unsplash.com/photo-..."
                        />
                        <button
                          type="button"
                          onClick={() => onBrowseMedia && onBrowseMedia((url: string) => updateImage(index, url))}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition flex items-center gap-1 whitespace-nowrap"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Browse
                        </button>
                      </div>
                      {image && (
                        <img
                          src={image}
                          alt={`Portfolio ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {images.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No images added yet. Click "Add Image" to get started.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* HTML Content for non-portfolio custom sections */}
              <div className="pt-4 border-t border-[#2a2a2a]">
                <label className="block text-sm font-medium text-gray-300 mb-2">Custom HTML Content</label>
                <textarea
                  value={section.content.html || ''}
                  onChange={(e) => updateContent({ html: e.target.value })}
                  rows={15}
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                  placeholder='<div class="py-20 px-4 bg-gradient-to-br from-orange-600/20 to-transparent">\n  <h2 class="text-4xl font-bold text-white mb-4">Custom Section</h2>\n  <p class="text-gray-400">Add your custom HTML here...</p>\n</div>'
                />
                <p className="text-sm text-gray-500 mt-2">
                  Use Tailwind CSS classes for styling. Your custom HTML will be rendered as-is on the landing page.
                </p>

                {/* Preview */}
                {section.content.html && (
                  <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Preview</h4>
                    <div className="bg-[#0a0a0a] rounded-lg border border-[#2a2a2a] overflow-hidden">
                      <div dangerouslySetInnerHTML={{ __html: section.content.html }} />
                    </div>
                    <p className="text-sm text-yellow-500 mt-2">
                      ⚠️ Preview may not show full styling. Check the actual landing page for accurate results.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Default editor for unimplemented section types
  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">{section.title}</h3>
        <button
          onClick={onAIAssist}
          className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          AI Enhance
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-6 capitalize">{section.type} Section Editor</p>
      
      <div className="space-y-4">
        {section.content && typeof section.content === 'object' ? (
          Object.entries(section.content).map(([key, val]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 capitalize">
                {key.replace(/_/g, ' ')}
              </label>
              {typeof val === 'string' && val.length > 80 ? (
                <textarea
                  value={val as string}
                  onChange={e => {
                    const updated = { ...section.content, [key]: e.target.value };
                    onUpdate({ content: updated });
                  }}
                  rows={3}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-purple-500 transition"
                />
              ) : typeof val === 'string' || typeof val === 'number' ? (
                <input
                  type="text"
                  value={String(val)}
                  onChange={e => {
                    const updated = { ...section.content, [key]: e.target.value };
                    onUpdate({ content: updated });
                  }}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition"
                />
              ) : typeof val === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={val as boolean}
                    onChange={e => onUpdate({ content: { ...section.content, [key]: e.target.checked } })}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-gray-300">Enabled</span>
                </label>
              ) : (
                <p className="text-xs text-gray-600 italic">Complex field — use JSON export to edit</p>
              )}
            </div>
          ))
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Content</label>
            <textarea
              value={typeof section.content === 'string' ? section.content : ''}
              onChange={e => onUpdate({ content: e.target.value })}
              rows={4}
              placeholder="Enter section content..."
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-purple-500 transition"
            />
          </div>
        )}
      </div>
    </div>
  );
}