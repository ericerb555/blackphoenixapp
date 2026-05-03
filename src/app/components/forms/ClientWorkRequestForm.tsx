import { useState, useRef, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, Building2, Home, Layers, PenTool,
  MapPin, Ruler, Grid3X3, Users, DollarSign, Calendar, Upload,
  Camera, Sparkles, CheckCircle, AlertCircle, Loader, Plus, Trash2,
  Sun, Moon, Image, Palette, Coffee, Car, TreePine, Compass,
  Thermometer, Droplets, Zap, Eye, Box, LayoutGrid, Maximize2,
  Mountain, Square, Circle, Triangle, Sofa, BedDouble, Bath,
  UtensilsCrossed, Briefcase, Baby, Dumbbell, Wine, Shirt,
  Monitor, Gamepad2, Music, BookOpen, Heart, Accessibility,
  Link, ImagePlus, FileText, Clock, Target, Star, Info, Video,
  Minus, Film, Navigation, User, ArrowRight, Brain, Save, Store,
  Megaphone, Wrench, ShoppingBag, Tag, Package
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { InlineVideoCapture } from '../media/InlineVideoCapture';
import AdvancedVideoCapture from '../media/AdvancedVideoCapture';
import { VideoAnalysisResult } from '../../lib/services/aiVideoAnalysisService';
import { toast } from 'sonner@2.0.3';
import { TextInput } from '../ui/input/TextInput';
import { NumberInput } from '../ui/input/NumberInput';
import { IconButton } from '../ui/button/IconButton';
import { WorkRequestAutoSave } from '../../lib/workRequestAutoSave';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { API_BASE_URL } from '../../lib/apiConfig';
import BlueprintUploadWidget from '../BlueprintUploadWidget';

// Use centralized API base URL
const API_BASE = API_BASE_URL;

interface ClientWorkRequestFormProps {
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

type FormStep = 'project-type' | 'ai-guide' | 'project' | 'design' | 'style' | 'kitchen' | 'materials' | 'structural' | 'rendering' | 'media' | 'budget' | 'review';

type ProjectCategory = 
  | 'simple_service' // Painting, Flooring, Basic work
  | 'kitchen_bath' // Kitchen/Bathroom remodels
  | 'full_renovation' // Full home renovation
  | 'new_construction'; // Custom home, additions

interface RoomRequirement {
  id: string;
  type: string;
  name: string;
  floor: number;
  minSqft: number;
  maxSqft: number;
  targetSqft: number;
  naturalLight: 'required' | 'preferred' | 'not_needed';
  adjacentTo: string[];
  features: string[];
  notes: string;
}

interface VideoFile {
  blob: Blob;
  url: string;
  duration: number;
}

interface FormData {
  // Project Category & Service Type - NEW
  projectCategory: ProjectCategory | '';
  serviceType: string; // "Painting", "Kitchen Remodel", "New Home", etc.
  
  // Project Type & Scope - CRITICAL FOR AI
  projectType: 'new_construction' | 'full_renovation' | 'kitchen_renovation' | 'bathroom_renovation' | 'addition' | 'deck_patio' | 'basement_finish' | 'other';
  renovationType: string; // Specific type for renovations
  
  // Basic Info
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  siteAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Property Information
  propertyType: 'single_family' | 'condo' | 'apartment' | 'townhouse' | 'commercial';
  yearBuilt: number;
  lotWidth: number;
  lotDepth: number;
  lotArea: number;
  lotShape: string;
  topography: string;
  orientation: string;
  existingStructures: string;
  zoningRestrictions: string;
  totalFloors: number;
  
  // EXISTING CONDITIONS - Critical for AI Floor Plans
  existingKitchenLength: number; // feet
  existingKitchenWidth: number; // feet
  existingKitchenHeight: number; // feet
  existingLayoutDescription: string;
  existingWallLocations: string; // Detailed description
  loadBearingWallLocations: string;
  windowLocations: string;
  doorLocations: string;
  plumbingLocations: string;
  electricalPanelLocation: string;
  hvacLocations: string;
  
  // RENOVATION GOALS - What AI should change
  layoutChangeGoals: string[]; // open_concept, add_island, expand_space, etc.
  wallsToRemove: string;
  wallsToAdd: string;
  specificRenovationDescription: string; // Detailed description for AI
  
  // Design Requirements
  rooms: RoomRequirement[];
  specialFeatures: string[];
  circulationStyle: string;
  accessibilityNeeds: string[];
  architecturalStyle: string;
  secondaryStyle: string;
  interiorStyle: string;
  colorPalette: string;
  colorPreferences: string[];
  flooringPreferences: string[];
  wallFinishes: string[];
  ceilingFinishes: string[];
  lightingStyle: string;
  naturalLightPriority: string;
  // Kitchen Details (Proposed/New)
  kitchenLayoutType: string;
  kitchenStyle: string;
  countertopMaterial: string;
  backsplashStyle: string;
  cabinetStyle: string;
  cabinetFinish: string;
  appliances: string[];
  applianceBrand: string;
  pantrySize: string;
  islandPreference: string;
  islandDimensions: string; // LxWxH in inches
  applianceSizes: { type: string; width: number; height: number; depth: number }[];
  kitchenNotes: string;
  
  // MEDIA REQUIREMENTS - For AI Analysis
  photoQualityChecklist: {
    allWallsCaptured: boolean;
    allCornersCaptured: boolean;
    ceilingVisible: boolean;
    floorVisible: boolean;
    windowsDoorsVisible: boolean;
    appliancesVisible: boolean;
    measurementToolUsed: boolean;
  };
  videoWalkthroughComplete: boolean;
  measurementPhotosIncluded: boolean;
  ceilingHeight: number;
  structuralSystem: string;
  foundationType: string;
  loadBearingNotes: string;
  structuralConstraints: string;
  renderingTimeOfDay: string[];
  renderingViews: string[];
  renderingStyle: string;
  cameraAngles: string[];
  renderingNotes: string;
  inspirationLinks: string[];
  inspirationNotes: string;
  budgetMin: number;
  budgetMax: number;
  budgetPriority: string;
  timeline: string;
  priorityLevel: string;
  additionalNotes: string;
  videos: VideoFile[];
  photos: File[];
  blueprints: File[]; // AI-analyzable blueprints/floor plans
  blueprintAnalysis?: any; // AI blueprint analysis results
  aiVideoAnalysis?: VideoAnalysisResult; // Professional AI analysis results
  
  // Materials & Products Selection
  selectedProducts: Array<{
    id: string;
    name: string;
    vendorName: string;
    price: number;
    imageUrl?: string;
    category?: string;
    quantity: number;
    sourceType: 'vendor' | 'advertiser' | 'subcontractor'; // Track where it came from
  }>;
}

const ROOM_TYPES = [
  { value: 'living_room', label: 'Living Room', icon: Sofa, defaultSqft: 300 },
  { value: 'family_room', label: 'Family Room', icon: Sofa, defaultSqft: 250 },
  { value: 'bedroom', label: 'Bedroom', icon: BedDouble, defaultSqft: 150 },
  { value: 'master_bedroom', label: 'Master Bedroom', icon: BedDouble, defaultSqft: 250 },
  { value: 'bathroom', label: 'Bathroom', icon: Bath, defaultSqft: 60 },
  { value: 'master_bathroom', label: 'Master Bathroom', icon: Bath, defaultSqft: 120 },
  { value: 'powder_room', label: 'Powder Room', icon: Bath, defaultSqft: 30 },
  { value: 'kitchen', label: 'Kitchen', icon: UtensilsCrossed, defaultSqft: 200 },
  { value: 'dining_room', label: 'Dining Room', icon: UtensilsCrossed, defaultSqft: 180 },
  { value: 'home_office', label: 'Home Office', icon: Briefcase, defaultSqft: 120 },
  { value: 'nursery', label: 'Nursery', icon: Baby, defaultSqft: 120 },
  { value: 'gym', label: 'Home Gym', icon: Dumbbell, defaultSqft: 200 },
  { value: 'wine_cellar', label: 'Wine Cellar', icon: Wine, defaultSqft: 100 },
  { value: 'walk_in_closet', label: 'Walk-in Closet', icon: Shirt, defaultSqft: 80 },
  { value: 'laundry', label: 'Laundry Room', icon: Droplets, defaultSqft: 60 },
  { value: 'mudroom', label: 'Mudroom', icon: Home, defaultSqft: 50 },
  { value: 'media_room', label: 'Media Room', icon: Monitor, defaultSqft: 300 },
  { value: 'game_room', label: 'Game Room', icon: Gamepad2, defaultSqft: 250 },
  { value: 'music_room', label: 'Music Room', icon: Music, defaultSqft: 150 },
  { value: 'library', label: 'Library', icon: BookOpen, defaultSqft: 150 },
  { value: 'garage', label: 'Garage', icon: Car, defaultSqft: 400 },
  { value: 'storage', label: 'Storage Room', icon: Box, defaultSqft: 80 },
  { value: 'utility', label: 'Utility Room', icon: Zap, defaultSqft: 60 },
  { value: 'other', label: 'Other', icon: Square, defaultSqft: 100 },
];

const ARCHITECTURAL_STYLES = [
  { value: 'modern', label: 'Modern', desc: 'Clean lines, large windows, open spaces' },
  { value: 'contemporary', label: 'Contemporary', desc: 'Current trends, mixed materials' },
  { value: 'minimalist', label: 'Minimalist', desc: 'Simplicity, monochromatic, functional' },
  { value: 'mid_century', label: 'Mid-Century Modern', desc: 'Retro aesthetic, organic forms' },
  { value: 'traditional', label: 'Traditional', desc: 'Classic design, symmetry, ornate' },
  { value: 'transitional', label: 'Transitional', desc: 'Blend of traditional and modern' },
  { value: 'farmhouse', label: 'Farmhouse', desc: 'Rustic charm, natural materials' },
  { value: 'industrial', label: 'Industrial', desc: 'Exposed elements, raw materials' },
  { value: 'mediterranean', label: 'Mediterranean', desc: 'Warm colors, arched openings' },
  { value: 'craftsman', label: 'Craftsman', desc: 'Built-ins, natural wood details' },
  { value: 'coastal', label: 'Coastal', desc: 'Light colors, relaxed, natural textures' },
  { value: 'scandinavian', label: 'Scandinavian', desc: 'Hygge, functional, light woods' },
  { value: 'japanese', label: 'Japanese', desc: 'Zen, natural materials, simplicity' },
  { value: 'art_deco', label: 'Art Deco', desc: 'Geometric patterns, bold colors' },
];

const COLOR_PALETTES = [
  { value: 'neutral', label: 'Neutral & Warm', colors: ['#F5F5DC', '#D2B48C', '#8B7355', '#4A3C31'] },
  { value: 'cool_neutral', label: 'Cool Neutral', colors: ['#E8E8E8', '#B0B0B0', '#6B7280', '#374151'] },
  { value: 'earth_tones', label: 'Earth Tones', colors: ['#C4A77D', '#8B6F47', '#5D4E37', '#2C1810'] },
  { value: 'monochrome', label: 'Monochrome', colors: ['#FFFFFF', '#E5E5E5', '#666666', '#1A1A1A'] },
  { value: 'warm_white', label: 'Warm White', colors: ['#FFFAF0', '#FFF5E6', '#FFEFD5', '#FFE4C4'] },
  { value: 'sage_green', label: 'Sage & Green', colors: ['#9CAF88', '#6B8E4E', '#4A5D3C', '#2D3A24'] },
  { value: 'ocean_blue', label: 'Ocean Blue', colors: ['#B4D4E7', '#5C9EAD', '#2D6E7E', '#1A3C40'] },
  { value: 'terracotta', label: 'Terracotta', colors: ['#E07B54', '#C65D3B', '#8B4513', '#5D3A1A'] },
  { value: 'blush_pink', label: 'Blush & Soft', colors: ['#F8E8E8', '#E8C4C4', '#C9A0A0', '#8B6B6B'] },
];

const KITCHEN_LAYOUTS = [
  { value: 'l_shaped', label: 'L-Shaped', desc: 'Corner configuration with two adjacent walls' },
  { value: 'u_shaped', label: 'U-Shaped', desc: 'Three walls of cabinetry, maximum storage' },
  { value: 'galley', label: 'Galley', desc: 'Two parallel walls, efficient for small spaces' },
  { value: 'island', label: 'Island', desc: 'Central island with perimeter cabinets' },
  { value: 'peninsula', label: 'Peninsula', desc: 'Connected island, additional workspace' },
  { value: 'single_wall', label: 'Single Wall', desc: 'All cabinets and appliances on one wall' },
  { value: 'double_island', label: 'Double Island', desc: 'Two islands for large kitchens' },
];

const CABINET_STYLES = [
  { value: 'shaker', label: 'Shaker', desc: 'Clean lines, recessed panel' },
  { value: 'flat_panel', label: 'Flat Panel / Slab', desc: 'Modern, no frame or panel' },
  { value: 'raised_panel', label: 'Raised Panel', desc: 'Traditional, decorative center' },
  { value: 'beadboard', label: 'Beadboard', desc: 'Vertical grooves, cottage feel' },
  { value: 'louvered', label: 'Louvered', desc: 'Horizontal slats, tropical style' },
  { value: 'glass_front', label: 'Glass Front', desc: 'Display cabinets with glass doors' },
  { value: 'open_shelving', label: 'Open Shelving', desc: 'No doors, display-focused' },
];

const COUNTERTOP_MATERIALS = [
  'Quartz', 'Granite', 'Marble', 'Quartzite', 'Soapstone', 'Concrete',
  'Butcher Block', 'Stainless Steel', 'Laminate', 'Porcelain', 'Terrazzo'
];

const APPLIANCES_LIST = [
  'Refrigerator', 'Range/Stove', 'Oven (Wall)', 'Oven (Double)', 'Microwave',
  'Dishwasher', 'Wine Cooler', 'Beverage Center', 'Ice Maker', 'Trash Compactor',
  'Warming Drawer', 'Coffee System', 'Range Hood', 'Pot Filler', 'Disposal'
];

const SPECIAL_FEATURES = [
  'Covered Patio', 'Open Deck', 'Screened Porch', 'Balcony', 'Rooftop Terrace',
  'Swimming Pool', 'Hot Tub/Spa', 'Outdoor Kitchen', 'Fire Pit', 'Pergola',
  'Basement (Finished)', 'Basement (Unfinished)', 'Mezzanine', 'Loft',
  'Attic (Finished)', 'Safe Room', 'Wine Storage', 'Home Theater',
  'Elevator', 'Dumbwaiter', 'Central Vacuum', 'Smart Home System',
  'Solar Panels', 'EV Charging', 'Generator Hookup', 'Water Feature'
];

const ACCESSIBILITY_FEATURES = [
  'Wheelchair Accessible', 'Zero-Step Entry', 'Wide Doorways (36"+)',
  'Accessible Bathroom', 'Roll-in Shower', 'Grab Bars', 'Lower Counters',
  'Lever Door Handles', 'Visual Doorbell', 'Stair Lift Ready',
  'First Floor Master', 'Voice Control Ready'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const initialFormData: FormData = {
  // Project Category & Service Type - NEW
  projectCategory: '',
  serviceType: '',
  
  // Project Type & Scope - CRITICAL FOR AI
  projectType: 'kitchen_renovation',
  renovationType: '',
  
  // Basic Info
  projectName: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  siteAddress: '',
  city: '',
  state: 'CA',
  zipCode: '',
  country: 'USA',
  
  // Property Information
  propertyType: 'single_family',
  yearBuilt: 2000,
  lotWidth: 60,
  lotDepth: 100,
  lotArea: 6000,
  lotShape: 'rectangular',
  topography: 'flat',
  orientation: 'north',
  existingStructures: '',
  zoningRestrictions: '',
  totalFloors: 2,
  
  // EXISTING CONDITIONS - Critical for AI Floor Plans
  existingKitchenLength: 0,
  existingKitchenWidth: 0,
  existingKitchenHeight: 9,
  existingLayoutDescription: '',
  existingWallLocations: '',
  loadBearingWallLocations: '',
  windowLocations: '',
  doorLocations: '',
  plumbingLocations: '',
  electricalPanelLocation: '',
  hvacLocations: '',
  
  // RENOVATION GOALS - What AI should change
  layoutChangeGoals: [],
  wallsToRemove: '',
  wallsToAdd: '',
  specificRenovationDescription: '',
  
  // Design Requirements
  rooms: [],
  specialFeatures: [],
  circulationStyle: 'open',
  accessibilityNeeds: [],
  architecturalStyle: 'modern',
  secondaryStyle: '',
  interiorStyle: 'modern',
  colorPalette: 'neutral',
  colorPreferences: [],
  flooringPreferences: [],
  wallFinishes: [],
  ceilingFinishes: [],
  lightingStyle: 'layered',
  naturalLightPriority: 'high',
  
  // Kitchen Details (Proposed/New)
  kitchenLayoutType: 'island',
  kitchenStyle: 'modern',
  countertopMaterial: 'Quartz',
  backsplashStyle: 'subway_tile',
  cabinetStyle: 'shaker',
  cabinetFinish: 'white',
  appliances: ['Refrigerator', 'Range/Stove', 'Dishwasher', 'Microwave', 'Range Hood'],
  applianceBrand: '',
  pantrySize: 'walk_in',
  islandPreference: 'with_seating',
  islandDimensions: '8ft L × 4ft W × 36in H',
  applianceSizes: [],
  kitchenNotes: '',
  
  // MEDIA REQUIREMENTS - For AI Analysis
  photoQualityChecklist: {
    allWallsCaptured: false,
    allCornersCaptured: false,
    ceilingVisible: false,
    floorVisible: false,
    windowsDoorsVisible: false,
    appliancesVisible: false,
    measurementToolUsed: false
  },
  videoWalkthroughComplete: false,
  measurementPhotosIncluded: false,
  
  // Structural Info
  ceilingHeight: 9,
  structuralSystem: 'wood_frame',
  foundationType: 'slab',
  loadBearingNotes: '',
  structuralConstraints: '',
  renderingTimeOfDay: ['day'],
  renderingViews: ['exterior_front', 'interior_living', 'interior_kitchen'],
  renderingStyle: 'photorealistic',
  cameraAngles: ['eye_level'],
  renderingNotes: '',
  inspirationLinks: [''],
  inspirationNotes: '',
  budgetMin: 200000,
  budgetMax: 500000,
  budgetPriority: 'quality',
  timeline: '6_months',
  priorityLevel: 'standard',
  additionalNotes: '',
  videos: [],
  photos: [],
  blueprints: [],
  selectedProducts: [],
};

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Convert File to base64 for AI analysis
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data:image/...;base64, prefix
    };
    reader.onerror = error => reject(error);
  });
}

export default function ClientWorkRequestForm({ onClose, onProjectCreated }: ClientWorkRequestFormProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<FormStep>('project-type');
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [serviceAreaRadius, setServiceAreaRadius] = useState<number>(50); // Default 50 miles
  const [distanceFromBusiness, setDistanceFromBusiness] = useState<number | null>(null);
  const [isCheckingDistance, setIsCheckingDistance] = useState(false);
  
  // Auto-save system
  const autoSaveRef = useRef<WorkRequestAutoSave | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<string>('Not saved');
  const [isSaving, setIsSaving] = useState(false);
  
  // AI Guide state
  const [aiConversation, setAiConversation] = useState<Array<{role: 'ai' | 'user', message: string}>>([
    {
      role: 'ai',
      message: "Hi! I'm your AI assistant, and I'm here to help you get the perfect quote for your project. Let's start by understanding what kind of work you're looking for. Are you thinking about a kitchen renovation, bathroom update, full home remodel, new construction, or something else?"
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const [showVideoAnalysis, setShowVideoAnalysis] = useState(false);
  const [aiVideoAnalysisResults, setAiVideoAnalysisResults] = useState<any>(null);
  const [showAIVideoStudio, setShowAIVideoStudio] = useState(false);
  const [showKeyboardHint, setShowKeyboardHint] = useState(true);
  
  // Materials & Products state
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [materialSourceTab, setMaterialSourceTab] = useState<'vendors' | 'advertisers' | 'subcontractors'>('vendors');
  const [advertiserOffers, setAdvertiserOffers] = useState<any[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [subcontractorServices, setSubcontractorServices] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Show keyboard hint briefly on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowKeyboardHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Initialize auto-save and restore draft
  useEffect(() => {
    const initializeAutoSave = async () => {
      // Initialize auto-save manager
      autoSaveRef.current = new WorkRequestAutoSave(user?.id || null);
      
      // Try to restore draft
      try {
        const draft = await autoSaveRef.current.restoreDraft();
        if (draft) {
          const shouldRestore = window.confirm(
            `You have an unsaved draft from ${new Date(draft.lastSaved).toLocaleString()}. Would you like to continue where you left off?`
          );
          
          if (shouldRestore) {
            setFormData(draft.formData);
            setCurrentStep(draft.currentStep as FormStep);
            setLastSaveTime(autoSaveRef.current.formatLastSaveTime());
            toast.success('Draft restored successfully!');
          } else {
            // Clear the draft if they don't want to restore
            await autoSaveRef.current.clearAllDrafts();
          }
        }
      } catch (error) {
        console.error('Error restoring draft:', error);
      }
    };

    initializeAutoSave();
  }, [user?.id]);

  // Fetch products from vendor catalog
  useEffect(() => {
    if (currentStep === 'materials') {
      const fetchProducts = async () => {
        setIsLoadingProducts(true);
        try {
          const response = await fetch(
            `${API_BASE}/api/products?limit=50&category=${productCategory}&search=${productSearch}`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
              },
            }
          );
          const data = await response.json();
          if (data.success) {
            setAvailableProducts(data.data.products || []);
          }
        } catch (error) {
          console.error('Error fetching products:', error);
        } finally {
          setIsLoadingProducts(false);
        }
      };
      fetchProducts();
    }
  }, [currentStep, productCategory, productSearch]);

  // Fetch advertiser offers when advertiser tab is active
  useEffect(() => {
    if (currentStep === 'materials' && materialSourceTab === 'advertisers') {
      const fetchAdvertiserOffers = async () => {
        setIsLoadingOffers(true);
        try {
          const response = await fetch(
            `${API_BASE}/product-ads?status=active&limit=50&search=${productSearch}`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
              },
            }
          );
          const data = await response.json();
          if (data.success && data.ads) {
            // Transform product ads into offer format
            const offers = data.ads.map((ad: any) => ({
              id: ad.id,
              name: ad.productName || ad.headline || 'Special Offer',
              description: ad.description || ad.bodyText || '',
              price: ad.pricing?.discountedPrice || ad.pricing?.originalPrice || 0,
              originalPrice: ad.pricing?.originalPrice,
              discount: ad.pricing?.discount,
              imageUrl: ad.imageUrl || ad.visualAssets?.[0],
              vendorName: ad.advertiserId || 'Special Offer',
              category: ad.category || 'offer',
              offerType: ad.templateId,
              validUntil: ad.validUntil,
            }));
            setAdvertiserOffers(offers);
          }
        } catch (error) {
          console.error('Error fetching advertiser offers:', error);
        } finally {
          setIsLoadingOffers(false);
        }
      };
      fetchAdvertiserOffers();
    }
  }, [currentStep, materialSourceTab, productSearch]);

  // Fetch subcontractor services when subcontractors tab is active
  useEffect(() => {
    if (currentStep === 'materials' && materialSourceTab === 'subcontractors') {
      const fetchSubcontractorServices = async () => {
        setIsLoadingServices(true);
        try {
          const response = await fetch(
            `${API_BASE}/subcontractors`,
            {
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
              },
            }
          );
          const subcontractors = await response.json();
          
          if (Array.isArray(subcontractors)) {
            // Transform subcontractors into service offerings
            const services = subcontractors
              .filter((sub: any) => sub.status === 'active' || !sub.status) // Only active subcontractors
              .flatMap((sub: any) => {
                // Each subcontractor can offer multiple services
                const baseService = {
                  subcontractorId: sub.id,
                  subcontractorName: sub.companyName || sub.name || 'Professional Service',
                  specialty: sub.specialty || sub.serviceType || 'General',
                  rating: sub.rating || 4.5,
                  certifications: sub.certifications || [],
                  insurance: sub.insurance || sub.insured || false,
                  licensed: sub.licensed || false,
                  yearsExperience: sub.yearsExperience || 5,
                  imageUrl: sub.logo || sub.profileImage,
                };

                // If they have a service list, create one card per service
                if (sub.services && Array.isArray(sub.services)) {
                  return sub.services.map((service: any) => ({
                    id: `${sub.id}-${service.name || service.type}`,
                    name: service.name || service.type || baseService.specialty,
                    description: service.description || `Professional ${service.name || baseService.specialty} services`,
                    price: service.hourlyRate || service.rate || 85,
                    priceType: service.priceType || 'hourly',
                    category: service.category || baseService.specialty,
                    vendorName: baseService.subcontractorName,
                    ...baseService,
                  }));
                }

                // Otherwise, create a single service card for the subcontractor
                return [{
                  id: sub.id,
                  name: `${baseService.specialty} Services`,
                  description: sub.description || `Professional ${baseService.specialty} services by licensed contractor`,
                  price: sub.hourlyRate || sub.rate || 85,
                  priceType: 'hourly',
                  category: baseService.specialty,
                  vendorName: baseService.subcontractorName,
                  ...baseService,
                }];
              })
              .filter((service: any) => {
                // Apply search filter
                if (!productSearch) return true;
                const searchLower = productSearch.toLowerCase();
                return (
                  service.name?.toLowerCase().includes(searchLower) ||
                  service.description?.toLowerCase().includes(searchLower) ||
                  service.specialty?.toLowerCase().includes(searchLower) ||
                  service.vendorName?.toLowerCase().includes(searchLower)
                );
              });

            setSubcontractorServices(services);
          }
        } catch (error) {
          console.error('Error fetching subcontractor services:', error);
        } finally {
          setIsLoadingServices(false);
        }
      };
      fetchSubcontractorServices();
    }
  }, [currentStep, materialSourceTab, productSearch]);

  // Load service area settings
  useEffect(() => {
    const loadServiceAreaSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('company_settings')
          .select('service_area_radius')
          .single();
        
        if (!error && data?.service_area_radius) {
          setServiceAreaRadius(data.service_area_radius);
        }
      } catch (err) {
        console.error('Error loading service area settings:', err);
      }
    };

    loadServiceAreaSettings();
  }, []);

  // Auto-save when form data or step changes
  useEffect(() => {
    if (autoSaveRef.current && !isSubmitting) {
      setIsSaving(true);
      autoSaveRef.current.autoSave(formData, currentStep);
      
      // Update save time display after a short delay
      setTimeout(() => {
        setLastSaveTime(autoSaveRef.current?.formatLastSaveTime() || 'Not saved');
        setIsSaving(false);
      }, 500);
    }
  }, [formData, currentStep, isSubmitting]);

  // Keyboard navigation (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement) {
        return;
      }

      const steps = getSteps();
      const currentIndex = steps.findIndex(s => s.id === currentStep);

      if (e.key === 'ArrowRight' && currentIndex < steps.length - 1) {
        e.preventDefault();
        if (previewMode || validateStep(currentStep)) {
          setCurrentStep(steps[currentIndex + 1].id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        setCurrentStep(steps[currentIndex - 1].id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, previewMode, formData.projectCategory]);

  // Get conditional steps based on project category
  const getSteps = (): { id: FormStep; title: string; icon: any; description: string }[] => {
    const baseSteps = [
      { id: 'project-type' as FormStep, title: 'Project Type', icon: Target, description: 'What work do you need?' },
    ];

    // Kitchen/Bath category - show AI guide and kitchen-specific step
    if (formData.projectCategory === 'kitchen_bath') {
      return [
        ...baseSteps,
        { id: 'ai-guide' as FormStep, title: 'AI Assistant', icon: Brain, description: 'Get AI-powered guidance' },
        { id: 'project' as FormStep, title: 'Project Details', icon: Building2, description: 'Tell us about your project' },
        { id: 'kitchen' as FormStep, title: 'Kitchen/Bath Details', icon: UtensilsCrossed, description: 'Specific requirements' },
        { id: 'media' as FormStep, title: 'Photos & Videos', icon: Camera, description: 'Upload media (optional)' },
        { id: 'review' as FormStep, title: 'Review & Submit', icon: CheckCircle, description: 'Review and submit' },
      ];
    }

    // All other project categories - show AI guide but no kitchen step
    if (formData.projectCategory) {
      return [
        ...baseSteps,
        { id: 'ai-guide' as FormStep, title: 'AI Assistant', icon: Brain, description: 'Get AI-powered guidance' },
        { id: 'project' as FormStep, title: 'Project Details', icon: Building2, description: 'Tell us about your project' },
        { id: 'media' as FormStep, title: 'Photos & Videos', icon: Camera, description: 'Upload media (optional)' },
        { id: 'review' as FormStep, title: 'Review & Submit', icon: CheckCircle, description: 'Review and submit' },
      ];
    }

    // Default: show project-type only
    return baseSteps;
  };

  const steps = getSteps();
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const updateFormData = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Check service area when address changes
  const checkServiceArea = async () => {
    if (!formData.siteAddress || !formData.city || !formData.state) {
      return;
    }

    setIsCheckingDistance(true);
    try {
      // Get coordinates for the entered address
      const address = `${formData.siteAddress}, ${formData.city}, ${formData.state} ${formData.zipCode}`;
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const geocodeData = await geocodeResponse.json();

      if (geocodeData && geocodeData.length > 0) {
        const siteLat = parseFloat(geocodeData[0].lat);
        const siteLon = parseFloat(geocodeData[0].lon);

        // Get business address coordinates from settings
        const { data: settings } = await supabase
          .from('company_settings')
          .select('business_address, business_city, business_state, business_zip')
          .single();

        if (settings) {
          const businessAddress = `${settings.business_address}, ${settings.business_city}, ${settings.business_state} ${settings.business_zip}`;
          const businessGeocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(businessAddress)}`
          );
          const businessGeocodeData = await businessGeocodeResponse.json();

          if (businessGeocodeData && businessGeocodeData.length > 0) {
            const businessLat = parseFloat(businessGeocodeData[0].lat);
            const businessLon = parseFloat(businessGeocodeData[0].lon);

            const distance = calculateDistance(businessLat, businessLon, siteLat, siteLon);
            setDistanceFromBusiness(distance);

            if (distance > serviceAreaRadius) {
              setErrors(prev => ({
                ...prev,
                serviceArea: `This location is ${distance.toFixed(1)} miles away. We currently serve within ${serviceAreaRadius} miles of our business location.`
              }));
            } else {
              setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.serviceArea;
                return newErrors;
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Error checking service area:', err);
    } finally {
      setIsCheckingDistance(false);
    }
  };

  const addRoom = (type: string) => {
    const roomType = ROOM_TYPES.find(r => r.value === type);
    const newRoom: RoomRequirement = {
      id: Date.now().toString(),
      type,
      name: roomType?.label || 'Room',
      floor: 1,
      minSqft: Math.round((roomType?.defaultSqft || 100) * 0.8),
      maxSqft: Math.round((roomType?.defaultSqft || 100) * 1.5),
      targetSqft: roomType?.defaultSqft || 100,
      naturalLight: 'preferred',
      adjacentTo: [],
      features: [],
      notes: '',
    };
    updateFormData('rooms', [...formData.rooms, newRoom]);
  };

  const updateRoom = (id: string, updates: Partial<RoomRequirement>) => {
    updateFormData('rooms', formData.rooms.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRoom = (id: string) => {
    updateFormData('rooms', formData.rooms.filter(r => r.id !== id));
  };

  const toggleArrayItem = <K extends keyof FormData>(field: K, item: string) => {
    const currentArray = formData[field] as string[];
    if (currentArray.includes(item)) {
      updateFormData(field, currentArray.filter(i => i !== item) as FormData[K]);
    } else {
      updateFormData(field, [...currentArray, item] as FormData[K]);
    }
  };

  const addInspirationLink = () => {
    updateFormData('inspirationLinks', [...formData.inspirationLinks, '']);
  };

  const updateInspirationLink = (index: number, value: string) => {
    const links = [...formData.inspirationLinks];
    links[index] = value;
    updateFormData('inspirationLinks', links);
  };

  const removeInspirationLink = (index: number) => {
    updateFormData('inspirationLinks', formData.inspirationLinks.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    updateFormData('photos', [...formData.photos, ...files]);
  };

  const removePhoto = (index: number) => {
    updateFormData('photos', formData.photos.filter((_, i) => i !== index));
  };

  const handleVideosChanged = (videos: VideoFile[]) => {
    updateFormData('videos', videos);
  };

  const validateStep = (step: FormStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'project-type':
        if (!formData.projectCategory) newErrors.projectCategory = 'Please select a project type';
        break;
      case 'ai-guide':
        // AI guide is optional, always pass validation
        break;
      case 'project':
        if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required';
        if (!formData.clientName.trim()) newErrors.clientName = 'Client name is required';
        if (!formData.clientEmail.trim()) newErrors.clientEmail = 'Email is required';
        if (!formData.siteAddress.trim()) newErrors.siteAddress = 'Project address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.additionalNotes.trim()) newErrors.additionalNotes = 'Project description is required';
        // lotWidth and lotDepth validation removed - not needed for simple services
        if (errors.serviceArea) newErrors.serviceArea = errors.serviceArea;
        break;
      case 'design':
        if (formData.rooms.length === 0) newErrors.rooms = 'Add at least one room';
        break;
      case 'kitchen':
        // Kitchen details are optional but helpful
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    // Skip validation in preview mode
    if (previewMode || validateStep(currentStep)) {
      const stepOrder = steps.map(s => s.id);
      const currentIndex = stepOrder.indexOf(currentStep);
      if (currentIndex < stepOrder.length - 1) {
        setCurrentStep(stepOrder[currentIndex + 1]);
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // Show toast with validation error
      if (currentStep === 'project-type' && !formData.projectCategory) {
        toast.error('Please select a project type to continue');
      } else {
        toast.error('Please complete all required fields before continuing');
      }
    }
  };

  const handleBack = () => {
    const stepOrder = steps.map(s => s.id);
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Test server connectivity first
      console.log('[Work Request] Testing server connectivity...');
      try {
        const testResponse = await fetch(`${API_BASE}/make-server-57095a78/health`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        });
        console.log('[Work Request] Health check response:', testResponse.status, testResponse.statusText);
        if (testResponse.ok) {
          const healthData = await testResponse.json();
          console.log('[Work Request] Server is healthy:', healthData);
        }
      } catch (healthError: any) {
        console.error('[Work Request] Health check failed:', healthError.message);
        toast.error('Cannot connect to server. Please try again later.');
        setIsSubmitting(false);
        return;
      }
      
      const totalProgramSqft = formData.rooms.reduce((acc, r) => acc + r.targetSqft, 0);

      // Upload videos to Supabase Storage
      const uploadedVideoUrls: string[] = [];
      for (const video of formData.videos) {
        const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('project-videos')
          .upload(fileName, video.blob);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('project-videos')
            .getPublicUrl(fileName);
          uploadedVideoUrls.push(publicUrl);
        }
      }

      // Upload photos to Supabase Storage
      const uploadedPhotoUrls: string[] = [];
      for (const photo of formData.photos) {
        const fileName = `${user?.id}/${Date.now()}_${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from('project-photos')
          .upload(fileName, photo);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('project-photos')
            .getPublicUrl(fileName);
          uploadedPhotoUrls.push(publicUrl);
        }
      }

      // Upload blueprints to Supabase Storage and trigger AI analysis
      const uploadedBlueprintUrls: string[] = [];
      let blueprintAnalysis: any = null;
      
      if (formData.blueprints && formData.blueprints.length > 0) {
        console.log(`[Work Request] Uploading ${formData.blueprints.length} blueprints for AI analysis...`);
        toast.info('Uploading blueprints for AI analysis...', {
          description: 'This may take 30-90 seconds'
        });

        // Upload blueprints to storage
        const blueprintData = [];
        for (const blueprint of formData.blueprints) {
          const fileName = `${user?.id}/${Date.now()}_${blueprint.name}`;
          const { error: uploadError } = await supabase.storage
            .from('project-photos')
            .upload(fileName, blueprint);
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('project-photos')
              .getPublicUrl(fileName);
            uploadedBlueprintUrls.push(publicUrl);

            // Convert to base64 for AI analysis
            const base64 = await fileToBase64(blueprint);
            blueprintData.push({
              id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              filename: blueprint.name,
              base64
            });
          }
        }

        // Trigger AI blueprint analysis
        try {
          const analysisResponse = await fetch(
            `${API_BASE}/ai/analyze-blueprints`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                blueprints: blueprintData,
                analysisType: 'comprehensive'
              })
            }
          );

          if (analysisResponse.ok) {
            const analysisResult = await analysisResponse.json();
            blueprintAnalysis = analysisResult.analysis;
            console.log('[Work Request] Blueprint AI analysis complete:', blueprintAnalysis);
            toast.success('Blueprint analysis complete!', {
              description: `${blueprintAnalysis.rooms?.length || 0} rooms, ${blueprintAnalysis.totalSquareFootage || 0} sq ft`
            });
          }
        } catch (error) {
          console.error('[Work Request] Blueprint analysis error:', error);
          toast.warning('Blueprint upload succeeded, but AI analysis failed', {
            description: 'Blueprints saved - admin can analyze manually'
          });
        }
      }

      // Create work request via server endpoint (stores in KV store)
      console.log('[Work Request] Creating work request via server endpoint...');
      const workRequestPayload = {
        user_id: user?.id,
        project_name: formData.projectName,
        project_type: 'residential',
        serviceType: formData.serviceType || formData.projectType,
        description: formData.additionalNotes,
        total_floors: formData.totalFloors,
        total_square_feet: totalProgramSqft,
        measurement_unit: 'imperial',
        site_address: formData.siteAddress,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        lot_size_sqft: formData.lotWidth * formData.lotDepth,
        distance_from_business: distanceFromBusiness,
        style_preferences: {
          primary: formData.architecturalStyle,
          secondary: formData.secondaryStyle,
          interior: formData.interiorStyle,
          colorPalette: formData.colorPalette,
        },
        budget_range: {
          min: formData.budgetMin,
          max: formData.budgetMax,
          priority: formData.budgetPriority,
        },
        client_info: {
          name: formData.clientName,
          email: formData.clientEmail,
          phone: formData.clientPhone,
        },
        design_requirements: {
          specialFeatures: formData.specialFeatures,
          accessibilityNeeds: formData.accessibilityNeeds,
          circulationStyle: formData.circulationStyle,
        },
        kitchen_preferences: {
          layoutType: formData.kitchenLayoutType,
          style: formData.kitchenStyle,
          countertop: formData.countertopMaterial,
          backsplash: formData.backsplashStyle,
          cabinetStyle: formData.cabinetStyle,
          cabinetFinish: formData.cabinetFinish,
          appliances: formData.appliances,
          pantrySize: formData.pantrySize,
          island: formData.islandPreference,
        },
        structural_info: {
          ceilingHeight: formData.ceilingHeight,
          structuralSystem: formData.structuralSystem,
          foundationType: formData.foundationType,
          constraints: formData.structuralConstraints,
        },
        rendering_preferences: {
          timeOfDay: formData.renderingTimeOfDay,
          views: formData.renderingViews,
          style: formData.renderingStyle,
          cameraAngles: formData.cameraAngles,
        },
        inspiration_references: {
          links: formData.inspirationLinks.filter(l => l.trim()),
          notes: formData.inspirationNotes,
        },
        media_attachments: {
          videos: uploadedVideoUrls,
          photos: uploadedPhotoUrls,
          blueprints: uploadedBlueprintUrls,
          blueprintAnalysis: blueprintAnalysis,
          aiVideoAnalysis: formData.aiVideoAnalysis ? {
            analysisId: formData.aiVideoAnalysis.id,
            roomType: formData.aiVideoAnalysis.roomType,
            dimensions: formData.aiVideoAnalysis.dimensions,
            materials: formData.aiVideoAnalysis.materials,
            doors: formData.aiVideoAnalysis.doors,
            windows: formData.aiVideoAnalysis.windows,
            overallCondition: formData.aiVideoAnalysis.overallCondition,
            estimatedCost: formData.aiVideoAnalysis.estimatedRenovationCost,
            analysisConfidence: formData.aiVideoAnalysis.analysisConfidence,
            completeness: formData.aiVideoAnalysis.completeness,
            issues: formData.aiVideoAnalysis.issues,
            recommendations: formData.aiVideoAnalysis.recommendations,
            floorPlan: formData.aiVideoAnalysis.floorPlan, // Include floor plan data
            timestamp: formData.aiVideoAnalysis.timestamp
          } : null
        },
        site_info: {
          lot_width: formData.lotWidth,
          lot_depth: formData.lotDepth,
          lot_area: formData.lotWidth * formData.lotDepth,
          lot_shape: formData.lotShape,
          topography: formData.topography,
          orientation: formData.orientation,
          front_setback: 25,
          rear_setback: 20,
          left_side_setback: 5,
          right_side_setback: 5,
          existing_structures: formData.existingStructures,
          zoning_restrictions: formData.zoningRestrictions,
        },
        building_program: {
          total_program_sqft: totalProgramSqft,
          rooms: formData.rooms.map(r => ({
            id: r.id,
            type: r.type,
            name: r.name,
            floor: r.floor,
            min_sqft: r.minSqft,
            max_sqft: r.maxSqft,
            target_sqft: r.targetSqft,
            natural_light: r.naturalLight,
            adjacent_to: r.adjacentTo,
            features: r.features,
            notes: r.notes,
          })),
        },
        timeline: formData.timeline,
        priority_level: formData.priorityLevel,
        status: 'pending'
      };

      let workRequestResponse;
      try {
        const fullUrl = `${API_BASE}/work-requests`;
        console.log('[Work Request] API_BASE:', API_BASE);
        console.log('[Work Request] projectId:', projectId);
        console.log('[Work Request] Full URL:', fullUrl);
        console.log('[Work Request] Payload size:', JSON.stringify(workRequestPayload).length, 'bytes');
        
        workRequestResponse = await fetch(
          fullUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify(workRequestPayload)
          }
        );
      } catch (fetchError: any) {
        console.error('[Work Request] Fetch failed:', {
          message: fetchError.message,
          name: fetchError.name,
          stack: fetchError.stack,
          endpoint: `${API_BASE}/work-requests`
        });
        throw new Error(`Network error: ${fetchError.message}. Please check your internet connection.`);
      }

      if (!workRequestResponse.ok) {
        let errorData;
        try {
          errorData = await workRequestResponse.json();
        } catch (e) {
          errorData = { error: `Server returned ${workRequestResponse.status}: ${workRequestResponse.statusText}` };
        }
        console.error('[Work Request] Server error:', {
          status: workRequestResponse.status,
          statusText: workRequestResponse.statusText,
          errorData
        });
        throw new Error(errorData.error || `Failed to create work request (${workRequestResponse.status})`);
      }

      const project = await workRequestResponse.json();
      console.log('[Work Request] Work request created successfully:', project.id);

      if (project) {
        // 🚨 NEW: Generate AI Floor Plan and Send Admin Alert
        if (formData.aiVideoAnalysis && formData.aiVideoAnalysis.floorPlan) {
          console.log('🎨 AI Floor Plan detected in work request - Triggering quote workflow...');
          
          // Send admin alert about new work request with AI floor plan
          try {
            const adminAlertResponse = await fetch(
              `${API_BASE}/notifications/admin-alert`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                  category: 'Work Requests',
                  title: `New ${formData.serviceType || 'Project'} - ${formData.clientName}`,
                  description: `${formData.clientName} submitted a work request for ${formData.serviceType}. Budget: $${formData.budgetMin.toLocaleString()}-$${formData.budgetMax.toLocaleString()}. AI Video Analysis complete with floor plan generated. Ready for quote generation in Design Studio Pro.`,
                  priority: 'high',
                  metadata: {
                    workRequestId: project.id,
                    clientName: formData.clientName,
                    clientEmail: formData.clientEmail,
                    clientPhone: formData.clientPhone,
                    serviceType: formData.serviceType,
                    budgetRange: `$${formData.budgetMin.toLocaleString()}-$${formData.budgetMax.toLocaleString()}`,
                    hasAIFloorPlan: true,
                    floorPlanId: formData.aiVideoAnalysis.floorPlan.id,
                    dimensions: formData.aiVideoAnalysis.dimensions,
                    estimatedCost: formData.aiVideoAnalysis.estimatedRenovationCost,
                    analysisConfidence: formData.aiVideoAnalysis.analysisConfidence,
                    actionRequired: 'Review AI-generated floor plan and create quote in Design Studio Pro'
                  }
                })
              }
            );
            
            if (adminAlertResponse.ok) {
              console.log('✅ Admin alert sent successfully');
              toast.success('Admin has been notified about your request!', {
                description: 'We\'ll start working on your quote right away with the AI-generated floor plan'
              });
            }
          } catch (alertError) {
            console.error('Failed to send admin alert:', alertError);
            // Don't fail the whole submission if alert fails
          }

          // 📧 Send Email & SMS Notifications to Admins
          try {
            console.log('📧 Sending email and SMS notifications to admins...');
            const notificationResponse = await fetch(
              `${API_BASE}/notifications/work-request`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                  workRequestId: project.id,
                  clientName: formData.clientName,
                  clientEmail: formData.clientEmail,
                  clientPhone: formData.clientPhone,
                  serviceType: formData.serviceType,
                  budgetRange: `$${formData.budgetMin.toLocaleString()}-$${formData.budgetMax.toLocaleString()}`,
                  hasAIFloorPlan: formData.aiVideoAnalysis?.floorPlan?.id ? true : false,
                  estimatedCost: formData.aiVideoAnalysis?.estimatedRenovationCost,
                  dimensions: formData.aiVideoAnalysis?.dimensions
                })
              }
            );

            if (notificationResponse.ok) {
              const notificationResult = await notificationResponse.json();
              console.log('✅ Notifications sent:', notificationResult);
              
              if (notificationResult.results.emailSent) {
                console.log('📧 Email sent to:', notificationResult.results.emailRecipients);
              }
              if (notificationResult.results.smsSent) {
                console.log('📱 SMS sent to:', notificationResult.results.smsRecipients);
              }
            }
          } catch (notificationError) {
            console.error('Failed to send email/SMS notifications:', notificationError);
            // Don't fail the whole submission if notifications fail
          }
        }

        // 🚨 NEW: Auto-generate quote from blueprint analysis
        if (blueprintAnalysis && blueprintAnalysis.totalSquareFootage > 0) {
          console.log('📐 Blueprint analysis complete - Auto-generating quote...');
          toast.info('Auto-generating quote from blueprints...', {
            description: 'Using AI-extracted measurements and materials'
          });
          
          try {
            const quoteResponse = await fetch(
              `${API_BASE}/quotes/generate-from-blueprint`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                  workRequestId: project.id,
                  blueprintAnalysis: blueprintAnalysis,
                  clientInfo: {
                    name: formData.clientName,
                    email: formData.clientEmail,
                    phone: formData.clientPhone
                  },
                  projectInfo: {
                    name: formData.projectName,
                    type: formData.serviceType,
                    budgetMin: formData.budgetMin,
                    budgetMax: formData.budgetMax
                  }
                })
              }
            );

            if (quoteResponse.ok) {
              const quoteData = await quoteResponse.json();
              console.log('✅ Auto-quote generated:', quoteData.quoteNumber);
              
              // Send admin alert about auto-generated quote
              await fetch(
                `${API_BASE}/notifications/admin-alert`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                  },
                  body: JSON.stringify({
                    category: 'Work Requests',
                    title: `AUTO-QUOTE GENERATED - ${formData.clientName}`,
                    description: `Quote ${quoteData.quoteNumber} auto-generated from blueprint analysis. Total: $${blueprintAnalysis.costEstimates?.total?.toLocaleString() || 'N/A'}. ${blueprintAnalysis.totalSquareFootage} sq ft, ${blueprintAnalysis.materials?.reduce((sum: number, cat: any) => sum + cat.items.length, 0) || 0} materials. Ready for review and approval.`,
                    priority: 'high',
                    metadata: {
                      workRequestId: project.id,
                      quoteNumber: quoteData.quoteNumber,
                      clientName: formData.clientName,
                      totalSquareFootage: blueprintAnalysis.totalSquareFootage,
                      totalLinearFootage: blueprintAnalysis.totalLinearFootage,
                      materialsCount: blueprintAnalysis.materials?.reduce((sum: number, cat: any) => sum + cat.items.length, 0) || 0,
                      estimatedTotal: blueprintAnalysis.costEstimates?.total,
                      hasBlueprintAnalysis: true,
                      actionRequired: 'Review auto-generated quote and send to customer'
                    }
                  })
                }
              );

              toast.success('Quote auto-generated from blueprints!', {
                description: `Quote ${quoteData.quoteNumber} ready for admin review`
              });
            }
          } catch (quoteError) {
            console.error('Failed to auto-generate quote:', quoteError);
            toast.warning('Blueprint analysis succeeded, but quote generation needs manual review', {
              description: 'Admin will create quote manually'
            });
          }
        }

        // 🚀 NEW: Auto-generate quote for ALL work requests (not just blueprints)
        console.log('🤖 Auto-generating comprehensive quote for work request...');
        toast.loading('AI is creating your quote...', { id: 'auto-quote-gen' });
        
        try {
          const workRequestData = {
            id: project.id,
            title: formData.projectName,
            serviceType: formData.serviceType || formData.projectType,
            description: formData.additionalNotes || `${formData.serviceType} project for ${formData.clientName}`,
            location: `${formData.siteAddress}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
            estimatedValue: formData.budgetMax,
            clientInfo: {
              name: formData.clientName,
              email: formData.clientEmail,
              phone: formData.clientPhone
            },
            blueprintAnalysis: blueprintAnalysis || null,
            aiVideoAnalysis: formData.aiVideoAnalysis || null,
            budget: {
              min: formData.budgetMin,
              max: formData.budgetMax
            }
          };

          const autoQuoteResponse = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/auto-generate-quote`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`
              },
              body: JSON.stringify({
                workRequest: workRequestData
              })
            }
          );

          if (autoQuoteResponse.ok) {
            const autoQuoteData = await autoQuoteResponse.json();
            console.log('✅ Auto-quote generated successfully:', autoQuoteData);
            
            toast.success('Quote auto-generated!', {
              id: 'auto-quote-gen',
              description: `${autoQuoteData.laborItems?.length || 0} labor tasks, ${autoQuoteData.materialItems?.length || 0} materials`
            });

            // Store the auto-generated quote in the unified project pipeline
            try {
              const pipelineItem = {
                id: project.id,
                title: formData.projectName,
                customer: formData.clientName,
                stage: 'quote_pending', // Start at quote_pending with quote already generated
                serviceType: formData.serviceType || formData.projectType,
                priority: formData.priorityLevel || 'medium',
                estimatedValue: formData.budgetMax,
                description: formData.additionalNotes || '',
                location: `${formData.siteAddress}, ${formData.city}, ${formData.state}`,
                contact: {
                  email: formData.clientEmail,
                  phone: formData.clientPhone
                },
                media: {
                  videos: uploadedVideoUrls,
                  photos: uploadedPhotoUrls,
                  blueprints: uploadedBlueprintUrls,
                  blueprintAnalysis: blueprintAnalysis,
                  aiVideoAnalysis: formData.aiVideoAnalysis
                },
                quote: {
                  laborItems: autoQuoteData.laborItems || [],
                  materialItems: autoQuoteData.materialItems || [],
                  processSteps: autoQuoteData.processSteps || [],
                  subtotals: autoQuoteData.subtotals || {},
                  total: autoQuoteData.total || 0,
                  generatedAt: new Date().toISOString(),
                  status: 'draft'
                },
                timeline: formData.timeline,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              // Store in KV store for unified pipeline
              await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/kv/set`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                  },
                  body: JSON.stringify({
                    key: `pipeline:${project.id}`,
                    value: pipelineItem
                  })
                }
              );

              console.log('✅ Quote stored in unified project pipeline');
            } catch (storageError) {
              console.error('Failed to store quote in pipeline:', storageError);
            }
          } else {
            const errorData = await autoQuoteResponse.json();
            console.error('Failed to auto-generate quote:', errorData);
            toast.error('Could not auto-generate quote', {
              id: 'auto-quote-gen',
              description: 'Quote can be created manually in the pipeline'
            });
          }
        } catch (autoQuoteError) {
          console.error('Auto-quote generation error:', autoQuoteError);
          toast.warning('Quote will be created manually', {
            id: 'auto-quote-gen',
            description: 'Your work request was submitted successfully'
          });
        }

        // Clear draft after successful submission
        if (autoSaveRef.current) {
          await autoSaveRef.current.clearAllDrafts();
        }
        
        toast.success('Project created successfully!');
        onProjectCreated(project.id);
      }
    } catch (err: any) {
      console.error('Error creating project:', err);
      toast.error(err.message || 'Failed to create project');
      setErrors({ submit: err.message || 'Failed to create project' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render functions for each step will be defined here
  
  const renderProjectTypeStep = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">What Type of Project Do You Need?</h2>
        <p className="text-gray-400">Select the category that best describes your work</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => {
            updateFormData('projectCategory', 'simple_service');
            updateFormData('serviceType', 'Painting, Flooring, or Similar');
          }}
          className={`p-6 rounded-xl border-2 transition-all text-left ${
            formData.projectCategory === 'simple_service'
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
          }`}
        >
          <Wrench className="w-10 h-10 text-orange-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Simple Service</h3>
          <p className="text-sm text-gray-400">Painting, flooring, countertops, backsplash, or basic work</p>
        </button>

        <button
          onClick={() => {
            updateFormData('projectCategory', 'kitchen_bath');
            updateFormData('serviceType', 'Kitchen or Bathroom Remodel');
          }}
          className={`p-6 rounded-xl border-2 transition-all text-left ${
            formData.projectCategory === 'kitchen_bath'
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
          }`}
        >
          <UtensilsCrossed className="w-10 h-10 text-orange-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Kitchen/Bath Remodel</h3>
          <p className="text-sm text-gray-400">Complete kitchen or bathroom renovation</p>
        </button>

        <button
          onClick={() => {
            updateFormData('projectCategory', 'full_renovation');
            updateFormData('serviceType', 'Full Home Renovation');
          }}
          className={`p-6 rounded-xl border-2 transition-all text-left ${
            formData.projectCategory === 'full_renovation'
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
          }`}
        >
          <Home className="w-10 h-10 text-orange-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Full Renovation</h3>
          <p className="text-sm text-gray-400">Whole home remodel or major addition</p>
        </button>

        <button
          onClick={() => {
            updateFormData('projectCategory', 'new_construction');
            updateFormData('serviceType', 'New Construction');
          }}
          className={`p-6 rounded-xl border-2 transition-all text-left ${
            formData.projectCategory === 'new_construction'
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-orange-500/50'
          }`}
        >
          <Building2 className="w-10 h-10 text-orange-400 mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">New Construction</h3>
          <p className="text-sm text-gray-400">Custom home, ADU, or ground-up build</p>
        </button>
      </div>

      {errors.projectCategory && (
        <p className="text-red-400 text-sm">{errors.projectCategory}</p>
      )}
    </div>
  );

  // AI Guide Assistant Step
  const renderAIGuideStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">AI Project Assistant</h2>
        <p className="text-gray-400">Get personalized guidance for your project</p>
      </div>

      {/* AI Conversation */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 max-h-[400px] overflow-y-auto space-y-4">
        {aiConversation.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
          >
            {msg.role === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-orange-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-4 rounded-xl ${
                msg.role === 'ai'
                  ? 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-300'
                  : 'bg-orange-500/20 border border-orange-500/30 text-white'
              }`}
            >
              {msg.message}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-400" />
              </div>
            )}
          </div>
        ))}
        
        {aiIsThinking && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-orange-400 animate-pulse" />
            </div>
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] p-4 rounded-xl">
              <Loader className="w-4 h-4 text-orange-400 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* User Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && userInput.trim()) {
              e.preventDefault();
              const message = userInput.trim();
              setUserInput('');
              setAiConversation(prev => [...prev, { role: 'user', message }]);
              setAiIsThinking(true);
              
              // Simulate AI response (in production, call your AI service)
              setTimeout(() => {
                setAiConversation(prev => [...prev, {
                  role: 'ai',
                  message: `Great! Based on your ${formData.projectCategory?.replace('_', ' ')} project, I recommend getting detailed measurements and photos. Would you like guidance on what specific information to gather?`
                }]);
                setAiIsThinking(false);
              }, 1500);
            }
          }}
          placeholder="Ask the AI assistant anything about your project..."
          className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
        />
        <button
          onClick={() => {
            if (userInput.trim()) {
              const message = userInput.trim();
              setUserInput('');
              setAiConversation(prev => [...prev, { role: 'user', message }]);
              setAiIsThinking(true);
              
              setTimeout(() => {
                setAiConversation(prev => [...prev, {
                  role: 'ai',
                  message: `Great! Based on your ${formData.projectCategory?.replace('_', ' ')} project, I recommend getting detailed measurements and photos. Would you like guidance on what specific information to gather?`
                }]);
                setAiIsThinking(false);
              }, 1500);
            }
          }}
          disabled={!userInput.trim() || aiIsThinking}
          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl transition flex items-center gap-2 text-white font-semibold"
        >
          <ArrowRight className="w-4 h-4" />
          Send
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-semibold mb-1">AI Assistant Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-400">
              <li>Ask about specific requirements for your project type</li>
              <li>Get recommendations on materials and design</li>
              <li>Learn what information contractors need</li>
              <li>Understand the typical process and timeline</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // Kitchen/Bath Details Step
  const renderKitchenStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Kitchen/Bath Specifications</h2>
        <p className="text-gray-400">Provide details to get accurate quotes</p>
      </div>

      {/* Current Space Dimensions */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Ruler className="w-5 h-5 text-orange-400" />
          Current Space Measurements
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberInput
            label="Length (feet)"
            value={formData.existingKitchenLength}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : Number(e.target.value);
              updateFormData('existingKitchenLength', isNaN(val) ? 0 : val);
            }}
            min={0}
            step={1}
          />
          <NumberInput
            label="Width (feet)"
            value={formData.existingKitchenWidth}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : Number(e.target.value);
              updateFormData('existingKitchenWidth', isNaN(val) ? 0 : val);
            }}
            min={0}
            step={1}
          />
          <NumberInput
            label="Ceiling Height (feet)"
            value={formData.existingKitchenHeight}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : Number(e.target.value);
              updateFormData('existingKitchenHeight', isNaN(val) ? 0 : val);
            }}
            min={0}
            step={0.5}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Current Layout Description</label>
          <textarea
            value={formData.existingLayoutDescription}
            onChange={(e) => updateFormData('existingLayoutDescription', e.target.value)}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
            rows={3}
            placeholder="Describe the current layout, appliance locations, etc."
          />
        </div>
      </div>

      {/* Desired Layout */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-orange-400" />
          Desired Layout & Style
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Layout Type</label>
          <select
            value={formData.kitchenLayoutType}
            onChange={(e) => updateFormData('kitchenLayoutType', e.target.value)}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
          >
            {KITCHEN_LAYOUTS.map(layout => (
              <option key={layout.value} value={layout.value}>
                {layout.label} - {layout.desc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Cabinet Style</label>
          <select
            value={formData.cabinetStyle}
            onChange={(e) => updateFormData('cabinetStyle', e.target.value)}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
          >
            {CABINET_STYLES.map(style => (
              <option key={style.value} value={style.value}>
                {style.label} - {style.desc}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Countertop Material</label>
          <select
            value={formData.countertopMaterial}
            onChange={(e) => updateFormData('countertopMaterial', e.target.value)}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
          >
            {COUNTERTOP_MATERIALS.map(material => (
              <option key={material} value={material}>{material}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Cabinet Finish/Color</label>
          <input
            type="text"
            value={formData.cabinetFinish}
            onChange={(e) => updateFormData('cabinetFinish', e.target.value)}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
            placeholder="e.g., White, Navy Blue, Natural Oak"
          />
        </div>
      </div>

      {/* Appliances */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-400" />
          Appliances
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-3">Select appliances to include:</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {APPLIANCES_LIST.map(appliance => (
              <button
                key={appliance}
                onClick={() => toggleArrayItem('appliances', appliance)}
                className={`p-3 rounded-lg border-2 transition-all text-sm ${
                  formData.appliances.includes(appliance)
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-400 hover:border-orange-500/50'
                }`}
              >
                {appliance}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Preferred Appliance Brand (optional)</label>
          <input
            type="text"
            value={formData.applianceBrand}
            onChange={(e) => updateFormData('applianceBrand', e.target.value)}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
            placeholder="e.g., Bosch, KitchenAid, Samsung"
          />
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Additional Kitchen/Bath Notes</label>
        <textarea
          value={formData.kitchenNotes}
          onChange={(e) => updateFormData('kitchenNotes', e.target.value)}
          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
          rows={4}
          placeholder="Any other specific requirements, preferences, or details..."
        />
      </div>
    </div>
  );

  // Simple combined step for customer details and project info
  const renderSimpleProjectDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Project & Contact Details</h2>
        <p className="text-gray-400">Tell us about yourself and your project</p>
      </div>

      <div>
        <TextInput
          label="Project Name"
          value={formData.projectName}
          onChange={(value) => updateFormData('projectName', value)}
          placeholder="e.g., Kitchen Renovation at Main St"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          label="Your Name"
          value={formData.clientName}
          onChange={(value) => updateFormData('clientName', value)}
          placeholder="Full Name"
          required
        />
        <TextInput
          label="Email"
          type="email"
          value={formData.clientEmail}
          onChange={(value) => updateFormData('clientEmail', value)}
          placeholder="your@email.com"
          required
        />
        <TextInput
          label="Phone"
          type="tel"
          value={formData.clientPhone}
          onChange={(value) => updateFormData('clientPhone', value)}
          placeholder="(555) 123-4567"
          required
        />
        <TextInput
          label="Project Address"
          value={formData.siteAddress}
          onChange={(value) => updateFormData('siteAddress', value)}
          placeholder="123 Main Street"
          required
        />
        <TextInput
          label="City"
          value={formData.city}
          onChange={(value) => updateFormData('city', value)}
          placeholder="City"
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">State</label>
          <select
            value={formData.state}
            onChange={(e) => updateFormData('state', e.target.value)}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
          >
            {US_STATES.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Project Description</label>
        <textarea
          value={formData.additionalNotes}
          onChange={(e) => updateFormData('additionalNotes', e.target.value)}
          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
          rows={4}
          placeholder="Please describe what you'd like done..."
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberInput
          label="Minimum Budget ($)"
          value={formData.budgetMin}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : Number(e.target.value);
            updateFormData('budgetMin', isNaN(val) ? 0 : val);
          }}
          min={0}
          step={1000}
        />
        <NumberInput
          label="Maximum Budget ($)"
          value={formData.budgetMax}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : Number(e.target.value);
            updateFormData('budgetMax', isNaN(val) ? 0 : val);
          }}
          min={0}
          step={1000}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Preferred Timeline</label>
        <select
          value={formData.timeline}
          onChange={(e) => updateFormData('timeline', e.target.value)}
          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white focus:border-orange-500 focus:outline-none"
        >
          <option value="asap">ASAP</option>
          <option value="1_month">Within 1 Month</option>
          <option value="3_months">Within 3 Months</option>
          <option value="6_months">Within 6 Months</option>
          <option value="1_year">Within 1 Year</option>
          <option value="flexible">Flexible</option>
        </select>
      </div>
    </div>
  );

  // Media upload step
  const renderMediaUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Photos & Videos</h2>
        <p className="text-gray-400">Upload media to help us understand your space (optional)</p>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h4 className="text-white font-semibold mb-4">Upload Photos</h4>
        <input
          ref={photoInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            updateFormData('photos', [...formData.photos, ...files]);
            toast.success(`${files.length} photo(s) added`);
          }}
          className="hidden"
        />
        <button
          onClick={() => photoInputRef.current?.click()}
          className="w-full px-6 py-4 bg-[#0A0A0A] border-2 border-dashed border-[#2A2A2A] hover:border-orange-500/50 rounded-xl transition flex items-center justify-center gap-2 text-gray-400 hover:text-white"
        >
          <Upload className="w-5 h-5" />
          Click to upload photos
        </button>
        {formData.photos.length > 0 && (
          <p className="text-sm text-green-400 mt-2">{formData.photos.length} photo(s) uploaded</p>
        )}
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h4 className="text-white font-semibold mb-4">Record Video Walkthrough</h4>
        <button
          onClick={() => setShowAIVideoStudio(true)}
          className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-500 rounded-xl transition flex items-center justify-center gap-2 text-white font-semibold"
        >
          <Video className="w-5 h-5" />
          Start Video Recording
        </button>
        {formData.videos.length > 0 && (
          <p className="text-sm text-green-400 mt-2">{formData.videos.length} video(s) recorded</p>
        )}
      </div>

      {/* AI Video Studio Modal */}
      {showAIVideoStudio && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-4xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">AI Video Studio</h3>
              <button
                onClick={() => setShowAIVideoStudio(false)}
                className="p-2 hover:bg-[#1A1A1A] rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <AdvancedVideoCapture
              onVideoRecorded={(videoFile) => {
                updateFormData('videos', [...formData.videos, videoFile]);
                toast.success('Video recorded successfully!');
              }}
              onAIAnalysisComplete={(analysis) => {
                updateFormData('aiVideoAnalysis', analysis);
                toast.success('AI analysis complete!');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  // Review step
  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Review Your Request</h2>
        <p className="text-gray-400">Please review all details before submitting</p>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-1">Project Type</h4>
          <p className="text-white capitalize">{formData.projectCategory ? formData.projectCategory.replace('_', ' ') : 'Not specified'}</p>
          <p className="text-gray-300 text-sm">{formData.serviceType}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-1">Contact Information</h4>
          <p className="text-white">{formData.clientName}</p>
          <p className="text-gray-300">{formData.clientEmail}</p>
          <p className="text-gray-300">{formData.clientPhone}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-1">Project Location</h4>
          <p className="text-white">{formData.siteAddress}</p>
          <p className="text-gray-300">{formData.city}, {formData.state}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-1">Project Description</h4>
          <p className="text-gray-300">{formData.additionalNotes || 'No description provided'}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-1">Budget Range</h4>
          <p className="text-white">${formData.budgetMin.toLocaleString()} - ${formData.budgetMax.toLocaleString()}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-1">Timeline</h4>
          <p className="text-white capitalize">{formData.timeline.replace('_', ' ')}</p>
        </div>

        {formData.projectCategory === 'kitchen_bath' && formData.existingKitchenLength > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-1">Kitchen/Bath Details</h4>
            <p className="text-gray-300">
              Dimensions: {formData.existingKitchenLength}' × {formData.existingKitchenWidth}' × {formData.existingKitchenHeight}'
            </p>
            <p className="text-gray-300">Layout: {formData.kitchenLayoutType?.replace('_', ' ')}</p>
            <p className="text-gray-300">Cabinet Style: {formData.cabinetStyle}</p>
            <p className="text-gray-300">Countertop: {formData.countertopMaterial}</p>
            {formData.appliances.length > 0 && (
              <p className="text-gray-300">Appliances: {formData.appliances.join(', ')}</p>
            )}
          </div>
        )}

        {formData.photos.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-1">Media</h4>
            <p className="text-white">{formData.photos.length} photo(s), {formData.videos.length} video(s)</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'project-type':
        return renderProjectTypeStep();
      case 'ai-guide':
        return renderAIGuideStep();
      case 'project':
        return renderSimpleProjectDetailsStep();
      case 'kitchen':
        return renderKitchenStep();
      case 'design':
      case 'style':
      case 'materials':
      case 'structural':
      case 'rendering':
      case 'budget':
        // These steps are combined into project details for now
        return renderSimpleProjectDetailsStep();
      case 'media':
        return renderMediaUploadStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
          <div>
            <h2 className="text-2xl font-bold text-white">New Work Request</h2>
            <p className="text-gray-400 text-sm mt-1">
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              ) : (
                <span>Auto-saved {lastSaveTime}</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2 overflow-x-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : isCompleted
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-[#1A1A1A] text-gray-400'
                  }`}
                  onClick={() => setCurrentStep(step.id)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderCurrentStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#2A2A2A]">
          <button
            onClick={handleBack}
            disabled={currentStepIndex === 0}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          {currentStepIndex < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
